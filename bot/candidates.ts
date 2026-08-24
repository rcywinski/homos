// bot/candidates.ts — werdykty walidacji kandydatów selektora (TASKS-FUNNEL.md)
//
// Architektura (świadoma, 24.08): SEED w kodzie (trackowany git — historia
// werdyktów ręcznych walidacji), RUNTIME w .bot/candidate-verdicts.json
// (nietrackowany — pisze go nocny lejek na Windows). NIE trzymamy tego
// w trackowanym pliku dopisywanym runtime'owo: dokładnie ta klasa problemu
// (brudne drzewo na produkcji) blokowała auto-push raportu przez 3 dni.
//
// Werdykt jest TRWAŁY: raz FAIL = nie retestujemy automatycznie.
// Retest tylko ręcznie (usunięcie wpisu). PASS ≠ auto-dodanie do BOT_POOLS
// — decyzja o graniu puli zawsze u człowieka.

import fs from 'fs';
import path from 'path';

export type CandidateVerdict = {
  llamaPool: string; // uuid DefiLlamy — klucz dopasowania do rankingu
  chain: string;
  symbol: string;
  feeTier: string; // etykieta ludzka ('0.01%' itd.) — do UI, nie do logiki
  verdict: 'PASS' | 'FAIL' | 'QUEUED' | 'UNMAPPED';
  winPct?: number; // % wygranych okien walkforward (bramka: ≥65)
  worst?: number; // najgorsze okno vsHODL (bramka: >−3)
  testedAt?: string; // ISO data walidacji
  note?: string;
};

// Werdykty ręcznych walidacji sprzed lejka (źródła: SELECTOR-LOG.md,
// CONTEXT 17/19/20.08). Seed, żeby lejek nie liczył ich od nowa
// i żeby UI mówiło prawdę od pierwszego dnia.
export const SEED_VERDICTS: CandidateVerdict[] = [
  {
    llamaPool: '3a2f2faf-6423-4569-ad93-821c54cbe702',
    chain: 'Ethereum', symbol: 'WETH-USDT', feeTier: '0.01%',
    verdict: 'FAIL', worst: -12,
    testedAt: '2026-08-17',
    note: 'walkforward 365d/22 okna: wszystkie strategie ujemne vs HODL, worst −10…−12',
  },
  {
    llamaPool: '8b3ed515-5e6f-449a-9b64-25113cda7a29',
    chain: 'Ethereum', symbol: 'USDC-WETH', feeTier: '0.01%',
    verdict: 'FAIL', winPct: 55, worst: -18.0,
    testedAt: '2026-08-19',
    note: 'walkforward 365d/22 okna (135a155): 55% wygr. vs próg ≥65, worst −18 vs próg >−3; warianty z bezpiecznikiem 0% wygr. Wzorzec jak WETH-USDT 0.01%',
  },
  {
    llamaPool: 'ae6e650d-2da1-43ee-b960-2adfdf4dc2b7',
    chain: 'Base', symbol: 'WETH-CBBTC', feeTier: '0.3%',
    verdict: 'QUEUED',
    note: 'propozycja OPEN z 22.08 (wisi); pierwszy kandydat auto-lejka po wdrożeniu',
  },
  {
    llamaPool: 'fc9f488e-8183-416f-a61e-4e5c571d4395',
    chain: 'Ethereum', symbol: 'WETH-USDT', feeTier: '0.3%',
    verdict: 'QUEUED',
    note: 'propozycja OPEN z 20.08 (bez walidacji tick-level); w kolejce lejka',
  },
];

// Runtime + seed, runtime wygrywa przy tym samym llamaPool (lejek może
// domknąć QUEUED → PASS/FAIL). Plik pisze wyłącznie candidate-funnel.
export function readVerdicts(botDir: string): CandidateVerdict[] {
  const byId = new Map<string, CandidateVerdict>();
  for (const v of SEED_VERDICTS) byId.set(v.llamaPool, v);
  try {
    const p = path.join(botDir, 'candidate-verdicts.json');
    if (fs.existsSync(p)) {
      const runtime = JSON.parse(fs.readFileSync(p, 'utf8')) as CandidateVerdict[];
      for (const v of runtime) byId.set(v.llamaPool, v);
    }
  } catch { /* uszkodzony plik runtime nie może położyć endpointu */ }
  return [...byId.values()];
}
