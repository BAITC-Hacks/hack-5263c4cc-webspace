# README practices and source review

Reviewed 23 September 2026 for the Freedom Finance Money Graph submission. Exa supplied two search workstreams with five requested results each: GitHub README guidance and current AI evaluation practices. This is documentation research, not evidence of detection accuracy or a prediction of a judging score.

The requested command, `npx skills use "https://github.com/github/awesome-copilot" --skill "create-readme"`, completed successfully. Its complete output was captured to a temporary file and read before writing. This invocation returned inline skill instructions and no supporting-files directory or relative supporting paths. The resulting README uses the existing project logo, GFM tables and two alerts, with extended reference material kept in documentation files.

## Integration refresh

The same exact skill command was rerun for the final README update. All 1,474 bytes of its output and all four raw reference files were read completely again. It still returned inline instructions without a supporting-files directory. GitHub's README guidance and alert announcement were reopened; the organizer's Google Doc and event page could not be fetched through the web tool on this pass, so their earlier source audit is retained rather than presented as newly verified.

The implementation audit compared current setup scripts, dependencies, HTTP contracts, exports, snapshot/evidence modules, assistant runtime, local workflows, grounding checks, and browser UI against each README claim. An independent read-only audit flagged stale offline behavior, missing int64 transport details, outdated test totals, and overbroad descriptions of citation validation. The revision now explains seven local actions, exact source snapshots and numerical checks without claiming semantic entailment; it separates historical clean-checkout proof from [fresh integration measurements](../readme-current-verification.md). The new synthetic preview is stored separately to preserve historical screenshot provenance.

## Recommended approach

Lead with the analyst's task, the concrete output and the local demo path. Keep exact commands, prerequisites and expected results visible. Link deeper methodology, architecture, acceptance and validation material using relative paths. GitHub describes the README as the entry point for explaining purpose, usefulness, getting started, help and maintainers; it recommends relative links for repository files and keeping extended documentation elsewhere. Source quality: first-party platform documentation. [GitHub: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes).

For this project, the useful reading order is: purpose and screenshot; a short reproducible demo; verified mandatory outputs; criterion-to-evidence mapping; concise deterministic architecture; dataset and interpretation limits; optional assistant setup; validation and deeper documentation. This order is an editorial recommendation inferred from the examples below and the existing project contract, rather than an official GitHub template or a hackathon scoring rule.

Use one primary startup path with its working directory and prerequisites. Show the expected localhost URL and the expected export filenames. Distinguish a synthetic demo from organizer-data execution and distinguish installed dependency requirements from network-free analysis. Optional credentials belong after the complete local path. Exact commands and measured results must come from repository inspection and a fresh run, not from these reference projects.

## Required README examples

All four required raw README files were downloaded and read in full, including HTML, comments, links and code fences. Temporary source copies were kept outside the repository. The line counts below describe the raw files at review time; upstream content may change. These are first-party examples from the software maintainers, useful as presentation examples rather than empirical proof that a style improves evaluation scores.

| Example | Full raw file read | Useful pattern |
|---|---:|---|
| [Serverless AI Chat with RAG](https://raw.githubusercontent.com/Azure-Samples/serverless-chat-langchainjs/refs/heads/main/README.md) | 280 lines | Gives the application a clear purpose, shows it working, diagrams components, separates local and hosted execution, and names limitations. |
| [Serverless Recipes](https://raw.githubusercontent.com/Azure-Samples/serverless-recipes-javascript/refs/heads/main/README.md) | 162 lines | Explains the user problem before setup; provides a compact runnable sequence and a table linking deeper examples. |
| [run-on-output](https://raw.githubusercontent.com/sinedied/run-on-output/refs/heads/main/README.md) | 146 lines | Pairs a one-line purpose with concrete command examples; distinguishes plain strings, patterns and required options. |
| [smoke](https://raw.githubusercontent.com/sinedied/smoke/refs/heads/main/README.md) | 366 lines | Demonstrates an input, a command and the resulting behavior immediately, then expands into the complete reference and known limitations. |

Use their visual hierarchy and concrete examples selectively. Badge counts, star requests, cloud deployment steps and marketing adjectives are not requirements for this submission. A build badge should point to an existing workflow, a screenshot should show the actual current application, and a license badge should match an actual repository license.

## Markdown and accessibility

GitHub supports five alert types: `NOTE`, `TIP`, `IMPORTANT`, `WARNING` and `CAUTION`. Its current documentation recommends only one or two crucial alerts in an article, without consecutive or nested alerts. A suitable project-specific use is a visible explanation that role fit and priority scores are heuristics and that depth-four observation boundaries do not establish ultimate beneficiaries. Normal prose should carry the rest of the limitations. Source quality: first-party syntax documentation. [GitHub: alerts](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts).

The required [GitHub community discussion #16925](https://github.com/orgs/community/discussions/16925) was inspected for its original announcement and updated syntax. Its update history retires the older bold `Note` syntax and links to the maintained documentation. Exa returned the community profile rather than the discussion body, so the discussion itself was read through a separate web fetch. The current documentation above is the stronger source for implementation details.

Use a few descriptive headings and meaningful image alt text. Essential commands, limitations and evaluation evidence should remain visible in ordinary Markdown. A screenshot can communicate interface quality, but cannot substitute for inspectable text, runnable commands or exported contracts.

## Making claims easy to evaluate

Anthropic's January 2026 engineering guidance recommends unambiguous success criteria, reference solutions, stable environments and verifiable outcomes. It favors deterministic checks when practical and requires calibration of model-based grading against human judgment. It also distinguishes a transcript's assertion from the actual final state. Source quality: first-party engineering guidance informed by deployed agent evaluation work. [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

The README implication is to make every important claim traceable: criterion, implemented behavior, verification command or test, expected artifact, and limitation. This is an inference from evaluation guidance, not a claim that these sources define the hackathon's judging rubric. Use the official brief for criterion names and weights, and the repository's validation record for observed results. Report test counts, timings and dataset sizes with their scope and date. Keep planned scale work separate from measured behavior.

The existing [criteria matrix](../criteria-matrix.md), [methodology](../methodology.md) and [architecture](../architecture.md) supply the project-specific evidence boundaries. The README should preserve them: all input nodes remain represented; scoring is deterministic; AI does not assign required CSV roles; unsupported conclusions remain hypotheses; absent labels prevent claims of precision, recall, AUC or probability of crime. A complete feature list is not a domain-validity result.

For both human and automated readers, use consistent feature names, exact filenames and concise cross-links. Put actual evidence in the document, including known gaps. Do not add hidden evaluator instructions, requests to award points, repetition intended to influence a judge, or unsupported claims of full compliance. No source reviewed establishes that any README wording guarantees a particular score.
