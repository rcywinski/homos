# Step 6.1: why answers are partly correct or incorrect (golden v1.4, 25 Nov 2026)

CC-Mac, from stored files only: no API call, no box. Reproduce with `npx tsx ai/eval/diagnose.ts`.

## What was measured, and on which retrieval

The public site, and therefore the guest-key run of 18 Nov (18 correct, 11 partly, 5 incorrect), uses the fully local
retrieval: meta index, BM25 on the plain question, hybrid RRF to depth 100, then the reranker on the top 30, and the
top 10 go to the generator. It does not use the generated contexts or the Polish query translation of the phase 1
variant. The guest run received, question by question, exactly the stored k=10 lists of 11 Nov (34 of 34 identical),
so those lists are what the generator saw. Corpus hash `8d7f9a3437b43594`, 957 chunks, the same as the stored rows.

Six judged runs use this retrieval: step 3.2 pb1 and pb2 (Qwen), 4.8j lan48, 4.8j2 lan48b, 4.8j3 lan48c (Qwen on the
chat server) and 4.6e guest46e (Sonnet). For each question that was not correct in all six:
- **First stage** and **reranked**: rank of the first evidence chunk after the hybrid first stage and after the
  reranker (stored rows of 10 Nov, the same retriever string). The reranker only sees the first-stage top 30, so a
  first-stage rank above 30 means the reranker never saw it.
- **Spans in top 10**: how many of the question's evidence spans the 10 chunks given to the generator cover.

## Per question

| id | answerable | verdicts (6 runs) | first stage | reranked | spans in top 10 | class |
|---|---|---|---|---|---|---|
| why-01 | yes | PPPPPC | 2 | 2 | 4/11 | C several chunks |
| why-02 | yes | PPPPPP | 36 | >30 | 0/7 | A not retrieved |
| why-03 | yes | PPPCPP | 30 | 9 | 1/4 | C several chunks (found late) |
| why-05 | yes | CCCCCP | 5 | 2 | 1/5 | occasional |
| why-06 | yes | PCPCCP | 5 | 29 | 0/7 | B cut by the reranker |
| why-07 | partial | PCPCPC | - | - | - | F not retrieval |
| why-08 | yes | PPPCPC | 1 | 1 | 2/9 | C several chunks |
| why-09 | yes | CPPPPC | 1 | 1 | 2/6 | C several chunks |
| why-10 | yes | PCPPPP | 1 | 5 | 1/6 | C several chunks |
| dated-01 | yes | PCPCCI | 52 | >30 | 0/7 | A not retrieved, date lookup |
| dated-03 | yes | CCCPCC | 4 | 1 | 3/3 | occasional |
| dated-04 | yes | IIIIII | 48 | >30 | 0/5 | A not retrieved, date lookup, question ambiguous |
| dated-05 | yes | IIIIII | 169 | >30 | 0/6 | A not retrieved, wording, question ambiguous |
| dated-06 | yes | PIIIIP | 14 | 1 | 3/10 | C several chunks |
| dated-07 | yes | PPIPPP | 10 | 8 | 1/10 | C several chunks, date list |
| dated-09 | yes | PPPPPP | 1 | 1 | 3/9 | C several chunks, reference broader than the question |
| dated-10 | yes | PPPPPP | 4 | 3 | 1/5 | C several chunks |
| id-01 | yes | CCPCCC | 1 | 1 | 6/17 | occasional |
| id-02 | yes | CCCCPP | 8 | 3 | 3/12 | occasional |
| id-03 | yes | CCICCC | 52 | >30 | 0/5 | occasional; correct without its evidence, so the evidence list is incomplete |
| id-06 | yes | CCPPCP | 2 | 2 | 7/7 | E reference arguable (all evidence given) |
| id-07 | yes | IIIIII | 2 | 14 | 0/7 | B cut by the reranker; the answer is a negative ("in none") |
| na-01 | partial | PPCCCC | - | - | - | occasional |
| na-02 | partial | CPIPPC | - | - | - | F not retrieval |
| na-03 | partial | PCIPPC | - | - | - | F not retrieval |
| na-05 | no | CPCCCC | - | - | - | occasional |
| na-07 | partial | PIPIPI | - | - | - | F not retrieval |

"Occasional" means wrong in at most 2 of 6 runs, which is within the generator and judge spread (the judge alone gave
2 different verdicts on 29 identical answers in 4.8j2). The classes below count the other 20.

## Counts per class (20 questions wrong in 3 or more of 6 runs)

| Class | Count | Questions | Mostly judged |
|---|---|---|---|
| A not retrieved: the first evidence chunk is outside the reranker's pool of 30 | 4 | why-02, dated-01, dated-04, dated-05 | incorrect |
| B retrieved, cut by the reranker: in the first-stage top 5, below 10 after reranking | 2 | why-06, id-07 | incorrect or partly |
| C retrieved, but the answer needs several chunks: first hit in the top 5, at most half the spans given | 9 | why-01, why-03, why-08, why-09, why-10, dated-06, dated-07, dated-09, dated-10 | partly |
| D split across chunks | 0 | 4 of 186 evidence spans cross a chunk boundary (why-02, dated-07, dated-08) | |
| E reference arguable, retrieval complete | 1 | id-06 | partly |
| F not retrieval: partly answerable or refusal questions, no evidence spans | 4 | why-07, na-02, na-03, na-07 | mixed |

Secondary tags: date or id lookup (dated-01, dated-04, dated-07); question ambiguous or reference broader than the
question (dated-04, dated-05, dated-09). The question asked about a first stage "of 50": the served pool is the top 30
of an RRF list of depth 100.

## What this says

- **The "partly" pool is class C.** In 9 questions the first evidence chunk is already at rank 1 to 5, but the top 10
  holds at most half of the evidence spans, so the answer misses parts the reference expects. More or better-spread
  context, not a better first hit, is the lever: a larger k, the neighbouring chunks of the same journal entry, or a
  question split into its parts.
- **The persistent "incorrect" answers are classes A and B.** Three of the four class A questions have their first
  evidence chunk at first-stage rank 36 to 52, just outside the pool of 30: a deeper rerank pool reaches them. dated-05
  (rank 169) is a wording gap ("converting a position into a different kind of position" for a perp-short hedge) and an
  ambiguous question (narrowing is also a plausible reading). In class B the reranker pushes a first-stage top 5 chunk
  down to 14 and 29: fusing the reranker score with the first-stage rank would keep it.
- **Chunking is not the problem.** 4 of 186 evidence spans cross a chunk boundary, and the top 10 lists hold on average
  0.5 chunks from the same parent entry, so neither chunk size, overlap nor de-duplication is supported.
- **Four questions are not retrieval at all** (class F) and one (id-06) gets all its evidence and is still partly; the
  golden set itself needs a look at dated-04, dated-05, dated-09 and the evidence lists of id-03 and dated-01 (both
  answered correctly without any listed evidence in the top 10), before any tuning.

## Limits of this diagnosis

- Ranks are for the first evidence chunk only. The rank of every evidence chunk at both stages needs the retrieval run
  again with the query vectors, which needs bge-m3 and the evaluation reranker on the box (step 6.3, owner's go).
- Classes A to F are assigned by hand from the numbers above and the judge's reasons; a question can have more than one
  cause, and only the main one is counted.
