# Freedom Finance README and submission requirements

Source audit, 23 September 2026. Two authoritative public sources were reviewed:

1. [Official Money Graph case brief](https://docs.google.com/document/d/1JPLU-G6R25Ge2hVaY2J9cqvrx7FGExj87XKwJPaMz3o/edit), including its English sections 5–10 and scoring table. The full document was read through its [public text export](https://docs.google.com/document/d/1JPLU-G6R25Ge2hVaY2J9cqvrx7FGExj87XKwJPaMz3o/export?format=txt).
2. [Official HackAlem AI event page and regulations](https://edu.astanahub.com/hackathons/df4743f5-c492-415c-b45a-1f13adb78e06?tab=tracks). The public page supplies the regulations alongside the track content; section numbers below refer to those regulations.

This audit records requirements, not a score prediction or proof of implementation. Current measured results belong in [validation](../validation.md); implementation coverage belongs in the [criteria matrix](../criteria-matrix.md).

## Scoring and README acceptance

The case brief assigns these weights:

| Criterion | Points |
|---|---:|
| Task fit and functionality | 25 |
| Technical implementation | 25 |
| README and reproducibility | 25 |
| Practical value and applicability | 15 |
| Development potential and originality | 10 |
| Total | 100 |

Regulations §§5.4.15 and 5.6.4 require an up-to-date README covering purpose, architecture, technologies, installation, launch, system requirements, dependencies, environment parameters and verification of the main scenario. Brief §10 additionally requires role criteria and thresholds, output descriptions, approach limitations and a scaling section.

Regulations §§5.4.16 and 5.6.5 make independent launch consequential: if the submitted version cannot run from repository instructions, it cannot proceed to further selection; later explanatory fixes are not accepted. Section 5.6.6 requires key functionality to be verifiable without participants’ personal accounts or subscriptions. Sections 5.4.4–5.4.6 require disclosure of third-party components and prohibit presenting an existing finished solution as original hackathon work.

A strict README minimum is therefore: prerequisites; clone/directory instructions; dependency installation; one-command startup; explicit synthetic and official-data paths; one-command CSV generation; environment defaults and optional AI configuration; expected outputs; and a short verification sequence. Separate initial installation requirements from offline analysis. The required solution diagram should make the data → metrics → roles → interface flow visible. A scale plan must describe changes at approximately one million nodes; implementation at that scale is not required. These points follow brief §§9–10 and regulations §§5.4.15–5.6.6.

## Five required capabilities

The brief’s §7 defines completeness and its checks:

| Required capability | Acceptance evidence |
|---|---|
| Reproducible pipeline | One run from raw Parquet creates all three CSVs without manual processing; the jury can run the README command on a clean machine in under five minutes. |
| Every node classified | All 2,248 input nodes receive a role, role score and nonempty evidence; required fields are populated. |
| Explainable role rules | Each role has a formal rule or threshold; the team explains three arbitrary jury-selected accounts from computed metrics within one minute. |
| Network clustering | Every node has membership; each cluster reports size, seed count, turnover and a hypothesis. |
| Ranking and visualization | At least 20 ranked accounts have reasons; a directed network view shows roles and supports finding a jury-selected account and its links. |

Brief §10 requires a five-minute live demonstration with substantive examination of two or three accounts. The minimum demonstration should execute the pipeline, locate an arbitrary account, explain its role and priority, inspect directed relationships, show an observation boundary and verify the three exports. This sequence is an implementation-oriented interpretation of the stated checks, not an additional organizer rule.

## Input and output contract

Brief §§5–6 specify 2,248 nodes, 3,119 aggregated edges, 4,840 transactions and 81 seeds. The period is 1–31 July 2026. Collection follows outgoing intra-bank transfers for four hops and excludes amounts below 5,000 KZT. There are 444 depth-four observation boundaries and 19 isolated seeds. These are aggregate public facts; no organizer records are reproduced here.

| File | Required fields |
|---|---|
| `nodes.parquet` | `gid, depth, is_seed` |
| `edges.parquet` | `src, dst, sum_kzt, n_tx, depth` |
| `transactions.parquet` | `src, dst, date, sum_kzt` |
| `nodes_roles.csv` | `gid, role, role_score, cluster_id, priority_score, evidence` |
| `clusters.csv` | `cluster_id, n_nodes, n_seed, sum_kzt_internal, top_gids, hypothesis` |
| `top_nodes.csv` | `rank, gid, role, priority_score, why` |

Scores must be within 0–1; role evidence is human-readable and at most 200 characters. The required vocabulary is `consolidator`, `transit`, `distributor`, `terminal`, `coordinator`, `peripheral`; documented extensions are allowed. No ground-truth labels are supplied. Criteria must be defensible, and findings must remain hypotheses rather than allegations. Missing outgoing edges at depth four cannot establish a final beneficiary.

## Optional features and AI judging

Brief §8 lists eight optional categories: cutoff handling; temporal patterns; recurring routes and return flows; anomalies; network resilience; an analyst AI assistant with node references; generated account summaries; and completeness assessment with missing-data requests. They add value but do not replace the five required capabilities.

Regulations §§1.17 and 4.2–4.4 allow AI-assisted preliminary analysis, ranking and comparison. Organizers determine how those results are used, and human experts remain part of evaluation. The reviewed sources do not identify an evaluator model, prompt, hidden test suite or automatic passing threshold. They do not support a claim that judging is exclusively automated. Clear, reproducible evidence is the appropriate documentation strategy.
