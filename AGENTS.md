# Money Graph engineering

Build only the Freedom Finance track. Read docs/methodology.md and docs/architecture.md before changing scoring or agent behavior.

- Keep graph analysis deterministic and usable without network access or API credentials.
- Add every input node, including isolated seeds. Depth-four nodes are observation boundaries, not established final beneficiaries.
- Scores express heuristic priority and role fit, never probability of crime. Separate evidence, hypothesis, and missing evidence.
- Keep API keys, organizer datasets, generated exports, and account credentials out of Git and logs.
- AI tools may read validated, bounded evidence only. No arbitrary SQL, shell, network, or file execution. No model-written role assignments in required CSVs.
- Preserve data provenance and exact CSV contracts. Include meaningful edge-case tests when changing the engine or tool authorization.
- Keep changes small and use atomic Conventional Commits. Run backend tests and the frontend production build before completion.
