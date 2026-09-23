# Integrations and local credentials

Verified 23 September 2026. Credential values are intentionally absent from this repository.

## OpenAI

The supplied project key is stored only in ignored `.env`, with file mode 0600. Authentication against `/v1/models` succeeded, and `gpt-6-sol` was present. A live synthetic evidence smoke test completed through the Responses API, invoked the node and neighborhood tools, and returned validated evidence references. This establishes connectivity and schema compatibility, not factual accuracy on the organizer data.

The optional runtime integration uses the official Python SDK. Both AI flags must be enabled. The application never needs an API key to load data, compute roles, search accounts, display graphs, or export the required CSVs. Keep credentials on the Python server; never use browser-prefixed environment variables for them. Rotate credentials shared in chat after the event.

## NVIDIA Brev

Brev CLI v0.6.335 was installed in `~/.local/bin/brev` from the official `brevdev/brev-cli` release. The supplied `bak-` credential authenticated successfully. A read-only `brev ls` check succeeded and showed no instances in the organization. No instance was created and no GPU spending was initiated.

The current command accepts `brev login --api-key "$BREV_API_KEY" --org-id "$BREV_ORG_ID"`, even though these flags were absent from `login --help`. The command reports that `--org-id` is deprecated because organization selection is now resolved from the API key. Do not substitute `--token`: that legacy authentication mechanism uses a different token type. Credentials are managed by Brev under `~/.brev`; the local source credential file is ignored and permission-restricted.

This is an infrastructure key, not an NVIDIA hosted-inference key. A GPU-backed local model is a future deployment option if the privacy policy or workload requires one. The current graph is small and the core already runs locally without cloud inference.

Sources: [Brev CLI installation](https://docs.nvidia.com/brev/cli/getting-started), [official CLI repository](https://github.com/brevdev/brev-cli), [NVIDIA CI example distinguishing Brev and inference credentials](https://github.com/NVIDIA/NemoClaw/commit/0776ea063547cca80908dcacac5d07562de0ad82). Live command behavior takes precedence over incomplete help text and indexed examples.

## Research integrations

Exa supplied primary-source discovery and page retrieval. GitHub supplied live repository metadata and default-branch commit evidence. Counts, license checks and commit timestamps are preserved in `docs/research/github-metrics.json`. Exa's cached repository descriptions and star counts were cross-checked against GitHub; discrepancies are noted in the research report.

Neither Exa nor GitHub is a runtime dependency. The copilot has no search, shell, GitHub, Brev or general MCP tool. Development credentials do not grant the application unrestricted tool access.
