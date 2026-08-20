/**
 * hedgeBuilder.ts — plan transakcji hedge'a SHORT ETH-perp na GMX v2 (Arbitrum).
 * Krok 2 planu automatyzacji hedge (RESEARCH-QUEUE H, zaakceptowany kierunkowo
 * 17.08; zlecenie Rafała 20.08): [Zatwierdź hedge] w kokpicie = JEDEN podpis
 * w Rabby (multicall ExchangeRoutera), rozmiar z propozycji HEDGE bota, 1×,
 * limity poślizgu. Zamknięcie shorta analogicznym multicallem (MarketDecrease).
 *
 * MECHANIKA GMX v2 (synthetics): zlecenia są DWUFAZOWE — my tworzymy order
 * (createOrder) i wpłacamy collateral + execution fee do OrderVault, a keeper
 * GMX wykonuje go w następnym bloku po cenie oracle. Stąd:
 *  - acceptablePrice = nasz limit poślizgu (keeper nie wykona gorzej),
 *  - executionFee = ETH dla keepera (nadpłata wraca na wallet),
 *  - JEDEN multicall: [sendWnt(fee), sendTokens(collateral), createOrder] —
 *    transfer i createOrder MUSZĄ być w jednej tx (inaczej środki w vaultcie
 *    może przejąć kto inny — ostrzeżenie wprost z docs GMX).
 *
 * ŹRÓDŁA (zweryfikowane 2026-08-20 przez Fable):
 *  - adresy: gmx-synthetics/docs/contracts.json (sekcja "arbitrum") — commit
 *    bieżący na 20.08; OrderVault i Router zgodne z wcześniejszą wiedzą,
 *    ExchangeRouter to NAJNOWSZY deploy (adres zmienia się między wersjami!),
 *  - rynek ETH/USD: żywe API https://arbitrum-api.gmxinfra.io/markets
 *    (indexToken=WETH, shortToken=USDC natywne),
 *  - struct CreateOrderParams: contracts/order/IBaseOrderUtils.sol @ main
 *    (wersja z cancellationReceiver/validFromTime/autoCancel/dataList).
 *
 * KONWENCJE JEDNOSTEK GMX v2 (łatwo się wyłożyć):
 *  - sizeDeltaUsd: USD × 1e30,
 *  - ceny (triggerPrice/acceptablePrice): USD za 1 jednostkę index tokena
 *    × 10^(30 − decimals_indexu) → dla ETH (18 dec) = USD × 1e12,
 *  - collateral (USDC): raw 6 dec,
 *  - executionFee: wei (natywny ETH przez sendWnt).
 *
 * BEZPIECZEŃSTWO (zasady projektu): moduł TYLKO buduje tx — wysyłka przez
 * Rabby po JAWNYM kliknięciu człowieka; przed wysłaniem hook MUSI zrobić
 * symulację eth_call (jak w rebalanceBuilder) — ABI structa weryfikuje się
 * wtedy o żywy kontrakt; pierwszy realny test na MINIMALNEJ kwocie (~$15,
 * min size GMX ~$11 collateral przy 1×).
 */
import { Address, Hex, encodeFunctionData, erc20Abi } from 'viem';

// --- adresy (Arbitrum One, chainId 42161) ---
export const GMX_ARBITRUM = {
  chainId: 42161,
  /** NAJNOWSZY ExchangeRouter (contracts.json 20.08) — po aktualizacji GMX
   *  trzeba podmienić TYLKO ten adres (vault/router/market są stabilne) */
  exchangeRouter: '0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41' as Address,
  orderVault: '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5' as Address,
  /** spender dla approve USDC (Router, NIE ExchangeRouter!) */
  router: '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6' as Address,
  /** rynek ETH/USD [ETH-USDC] — marketToken */
  ethUsdMarket: '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336' as Address,
  usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address, // natywne USDC
  weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
  // odczyt pozycji (bot/observer śledzi realny hedge — dodane 20.08 po
  // teście E2E, gdy wyszło że short nie jest widoczny nigdzie poza GMX):
  reader: '0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789' as Address,
  dataStore: '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8' as Address,
} as const;

/** domyślna opłata keepera; nadpłata wraca — lepiej dać zapas niż utknąć.
 *  UI może nadpisać (odczyt estymaty z DataStore to przyszłe ulepszenie). */
export const DEFAULT_EXECUTION_FEE_WEI = 700_000_000_000_000n; // 0.0007 ETH

// Order.OrderType (gmx-synthetics Order.sol)
export const ORDER_TYPE = { MarketIncrease: 2, MarketDecrease: 4 } as const;
// DecreasePositionSwapType: 1 = wypłać PnL w tokenie collateralu (USDC)
const SWAP_PNL_TO_COLLATERAL = 1;

// UWAGA: NIE używać `**` na BigIntach — babel (transform-exponentiation-operator)
// transpiluje `**` na `Math.pow()` bez rozróżniania typu operandów, a
// `Math.pow(10n, 30n)` rzuca "Cannot convert a BigInt value to a number" w
// runtime (build/tsc tego nie łapie — pada dopiero w przeglądarce). Ten sam
// bug był już raz naprawiony gdzie indziej (build CC-Win, P7) — literały
// zamiast `**` są tu odporne na powrót problemu.
const USD_1E30 = 1_000_000_000_000_000_000_000_000_000_000n; // 10n ** 30n
const PRICE_1E12 = 1_000_000_000_000n; // 10n ** 12n, dla indexu 18 dec: 30-18

// --- ABI (tylko używane funkcje ExchangeRoutera) ---
const EXCHANGE_ROUTER_ABI = [
  {
    name: 'multicall', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
  {
    name: 'sendWnt', type: 'function', stateMutability: 'payable',
    inputs: [{ name: 'receiver', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'sendTokens', type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' }, { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'createOrder', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        {
          name: 'addresses', type: 'tuple', components: [
            { name: 'receiver', type: 'address' },
            { name: 'cancellationReceiver', type: 'address' },
            { name: 'callbackContract', type: 'address' },
            { name: 'uiFeeReceiver', type: 'address' },
            { name: 'market', type: 'address' },
            { name: 'initialCollateralToken', type: 'address' },
            { name: 'swapPath', type: 'address[]' },
          ],
        },
        {
          name: 'numbers', type: 'tuple', components: [
            { name: 'sizeDeltaUsd', type: 'uint256' },
            { name: 'initialCollateralDeltaAmount', type: 'uint256' },
            { name: 'triggerPrice', type: 'uint256' },
            { name: 'acceptablePrice', type: 'uint256' },
            { name: 'executionFee', type: 'uint256' },
            { name: 'callbackGasLimit', type: 'uint256' },
            { name: 'minOutputAmount', type: 'uint256' },
            { name: 'validFromTime', type: 'uint256' },
          ],
        },
        { name: 'orderType', type: 'uint8' },
        { name: 'decreasePositionSwapType', type: 'uint8' },
        { name: 'isLong', type: 'bool' },
        { name: 'shouldUnwrapNativeToken', type: 'bool' },
        { name: 'autoCancel', type: 'bool' },
        { name: 'referralCode', type: 'bytes32' },
        { name: 'dataList', type: 'bytes32[]' },
      ],
    }],
    outputs: [{ name: 'key', type: 'bytes32' }],
  },
] as const;

const ZERO = '0x0000000000000000000000000000000000000000' as Address;
const ZERO32 = `0x${'0'.repeat(64)}` as Hex;

export interface HedgeTx { to: Address; data: Hex; value: bigint }
export interface HedgePlan {
  chainId: number;
  /** multicall do podpisania (value = executionFee w ETH) */
  tx: HedgeTx;
  /** approve USDC→Router, jeśli allowance nie starcza (UI porównuje) */
  approval: { token: Address; spender: Address; amount: bigint; tx: HedgeTx } | null;
  summary: string;
  preview: {
    direction: 'open-short' | 'close-short';
    sizeEth: number; sizeUsd: number;
    collateralUsdc: number; leverage: number;
    acceptablePriceUsd: number; executionFeeEth: number;
  };
}

const raw6 = (usd: number): bigint => BigInt(Math.round(usd * 1e6));

function buildCreateOrderCall(p: {
  recipient: Address;
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  acceptablePrice: bigint;
  executionFee: bigint;
  orderType: number;
  decreaseSwapType: number;
}): Hex {
  return encodeFunctionData({
    abi: EXCHANGE_ROUTER_ABI, functionName: 'createOrder',
    args: [{
      addresses: {
        receiver: p.recipient, cancellationReceiver: p.recipient,
        callbackContract: ZERO, uiFeeReceiver: ZERO,
        market: GMX_ARBITRUM.ethUsdMarket,
        initialCollateralToken: GMX_ARBITRUM.usdc,
        swapPath: [],
      },
      numbers: {
        sizeDeltaUsd: p.sizeDeltaUsd,
        initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
        triggerPrice: 0n, // market order
        acceptablePrice: p.acceptablePrice,
        executionFee: p.executionFee,
        callbackGasLimit: 0n,
        minOutputAmount: 0n,
        validFromTime: 0n,
      },
      orderType: p.orderType,
      decreasePositionSwapType: p.decreaseSwapType,
      isLong: false, // zawsze short — to hedge nadwyżki ETH
      shouldUnwrapNativeToken: false,
      autoCancel: false,
      referralCode: ZERO32,
      dataList: [],
    }],
  });
}

/**
 * OTWARCIE shorta 1× (hedge-excess z propozycji bota).
 * `sizeEth` — z propozycji HEDGE (nadwyżka ETH >50% wartości pozycji);
 * `ethPriceUsd` — bieżąca cena (z puli/observera); collateral USDC ≈ notional
 * (1×; GMX policzy leverage z size/collateral).
 */
export function planHedgeOpen(params: {
  sizeEth: number;
  ethPriceUsd: number;
  recipient: Address;
  slippageBps?: number;       // domyślnie 30 bps
  executionFeeWei?: bigint;   // domyślnie DEFAULT_EXECUTION_FEE_WEI
  /** collateral w USD; domyślnie = notional (dźwignia 1×) */
  collateralUsd?: number;
}): HedgePlan {
  const { sizeEth, ethPriceUsd, recipient } = params;
  if (!(sizeEth > 0) || !(ethPriceUsd > 0)) throw new Error('planHedgeOpen: sizeEth i ethPriceUsd muszą być > 0');
  const bips = Math.min(Math.max(Math.round(params.slippageBps ?? 30), 5), 300);
  const fee = params.executionFeeWei ?? DEFAULT_EXECUTION_FEE_WEI;
  const sizeUsd = sizeEth * ethPriceUsd;
  const collateralUsd = params.collateralUsd ?? sizeUsd; // 1×
  if (sizeUsd < 11) throw new Error(`planHedgeOpen: notional $${sizeUsd.toFixed(2)} poniżej min. GMX (~$11)`);
  const collateralRaw = raw6(collateralUsd);
  const sizeDeltaUsd = BigInt(Math.round(sizeUsd * 1e6)) * (USD_1E30 / 1_000_000n);
  // short increase: wykonanie po cenie NIŻSZEJ niż acceptable jest OK,
  // acceptable = dolny limit ceny wejścia
  const acceptable = BigInt(Math.round(ethPriceUsd * (1 - bips / 10_000) * 1e6)) * (PRICE_1E12 / 1_000_000n);

  const calls: Hex[] = [
    encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendWnt', args: [GMX_ARBITRUM.orderVault, fee] }),
    encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendTokens', args: [GMX_ARBITRUM.usdc, GMX_ARBITRUM.orderVault, collateralRaw] }),
    buildCreateOrderCall({
      recipient, sizeDeltaUsd, initialCollateralDeltaAmount: collateralRaw,
      acceptablePrice: acceptable, executionFee: fee,
      orderType: ORDER_TYPE.MarketIncrease, decreaseSwapType: 0,
    }),
  ];
  return {
    chainId: GMX_ARBITRUM.chainId,
    tx: {
      to: GMX_ARBITRUM.exchangeRouter,
      data: encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'multicall', args: [calls] }),
      value: fee,
    },
    approval: {
      token: GMX_ARBITRUM.usdc, spender: GMX_ARBITRUM.router, amount: collateralRaw,
      tx: {
        to: GMX_ARBITRUM.usdc,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [GMX_ARBITRUM.router, collateralRaw] }),
        value: 0n,
      },
    },
    summary: `SHORT ${sizeEth.toFixed(4)} ETH (~$${sizeUsd.toFixed(0)}) @ 1× na GMX ETH/USD; collateral ${collateralUsd.toFixed(0)} USDC; acceptable ≥ $${(ethPriceUsd * (1 - bips / 10_000)).toFixed(2)}`,
    preview: {
      direction: 'open-short', sizeEth, sizeUsd,
      collateralUsdc: collateralUsd, leverage: sizeUsd / collateralUsd,
      acceptablePriceUsd: ethPriceUsd * (1 - bips / 10_000),
      executionFeeEth: Number(fee) / 1e18,
    },
  };
}

/**
 * ZAMKNIĘCIE shorta (po zgaśnięciu sygnału trendu). `sizeUsd`/`collateralUsd`
 * — z otwartej pozycji (UI: odczyt z Readera GMX to przyszłe ulepszenie;
 * do tego czasu wartości z propozycji zamknięcia / zapisanego stanu).
 * PnL wypłacany w USDC (decreasePositionSwapType=1).
 */
export function planHedgeClose(params: {
  sizeUsd: number;
  collateralUsd: number;
  ethPriceUsd: number;
  recipient: Address;
  slippageBps?: number;
  executionFeeWei?: bigint;
}): HedgePlan {
  const { sizeUsd, collateralUsd, ethPriceUsd, recipient } = params;
  if (!(sizeUsd > 0) || !(ethPriceUsd > 0)) throw new Error('planHedgeClose: sizeUsd i ethPriceUsd muszą być > 0');
  const bips = Math.min(Math.max(Math.round(params.slippageBps ?? 30), 5), 300);
  const fee = params.executionFeeWei ?? DEFAULT_EXECUTION_FEE_WEI;
  const sizeDeltaUsd = BigInt(Math.round(sizeUsd * 1e6)) * (USD_1E30 / 1_000_000n);
  const collateralRaw = raw6(collateralUsd);
  // short decrease (odkup): wykonanie po cenie WYŻSZEJ niż acceptable = strata
  // ponad limit — acceptable to górny limit ceny odkupu
  const acceptable = BigInt(Math.round(ethPriceUsd * (1 + bips / 10_000) * 1e6)) * (PRICE_1E12 / 1_000_000n);

  const calls: Hex[] = [
    encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendWnt', args: [GMX_ARBITRUM.orderVault, fee] }),
    buildCreateOrderCall({
      recipient, sizeDeltaUsd, initialCollateralDeltaAmount: collateralRaw,
      acceptablePrice: acceptable, executionFee: fee,
      orderType: ORDER_TYPE.MarketDecrease, decreaseSwapType: SWAP_PNL_TO_COLLATERAL,
    }),
  ];
  return {
    chainId: GMX_ARBITRUM.chainId,
    tx: {
      to: GMX_ARBITRUM.exchangeRouter,
      data: encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'multicall', args: [calls] }),
      value: fee,
    },
    approval: null, // zamknięcie nie wpłaca collateralu
    summary: `CLOSE short ~$${sizeUsd.toFixed(0)} na GMX ETH/USD; acceptable ≤ $${(ethPriceUsd * (1 + bips / 10_000)).toFixed(2)}; PnL w USDC`,
    preview: {
      direction: 'close-short', sizeEth: sizeUsd / ethPriceUsd, sizeUsd,
      collateralUsdc: collateralUsd, leverage: sizeUsd / Math.max(collateralUsd, 1e-9),
      acceptablePriceUsd: ethPriceUsd * (1 + bips / 10_000),
      executionFeeEth: Number(fee) / 1e18,
    },
  };
}
