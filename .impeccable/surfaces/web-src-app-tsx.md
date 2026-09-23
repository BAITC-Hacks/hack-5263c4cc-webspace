---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/styles.css", "web/src/Overview.tsx", "web/src/components/OverviewMetrics.tsx", "web/src/AssistantWorkspace.tsx", "web/src/AssistantRuntime.tsx", "web/src/AssistantPanel.tsx", "web/src/assistant-panel.css"]
---

# Freedom Finance investigation workspace

Mode: Operate. Source of authority: the user selected Renua's Freedom Finance case study as the latest visual reference and requires a complete Base UI dashboard, Phosphor icons and assistant-ui. The reference research is recorded in `docs/research/freedom-ui-reference.md`. Implementation retains the official Base Nova dashboard foundation and adapts the observed mobile banking language to a desktop investigation workspace.

## Direction contract

THESIS: Make recorded money flows and the evidence behind a hypothesis easy to inspect using a familiar complete dashboard.

OWN-WORLD: Aqsha Lens white surfaces, pale cool gray-green canvas, near-black text, selective lime actions, dark-green focus, charcoal active sidebar destination, self-hosted Inter, Phosphor icons, standard Sidebar, Card, Table, Tabs, Sheet, Select, Badge, Alert and Button components. Readable 14–16px primary text. Use the original generated charcoal A and green flow-band mark in `web/public/brand/aqsha-freedom-mark.png`; preserve its embedded metadata and provenance sidecar.

STORY: Choose an account, inspect its graph and evidence, compare patterns, open a scoped assistant conversation, follow evidence references back to the workspace, and download reproducible outputs.

FIRST VIEWPORT: Collapsible branded navigation on the left; compact factual cards, restrained community/role visualizations and an actionable review queue; a compact case header and real dataset summary; a readable account network using circular role glyphs in the main region and a readable evidence inspector on wide screens. The account table is a dedicated complete view and a shortlist below the graph. On smaller screens the inspector becomes a Sheet. Exports and a visible assistant action stay in the header; the sidebar and Cmd/Ctrl+J provide additional assistant entry points.

FORM: Standard shadcn/Base UI dashboard components apply the reference's white containers, prominent quantities, concise labels and restrained elevation. The reference demonstrates mobile banking screens, not this sidebar or graph. A 460px assistant dock expands to an inset desktop Sheet; mobile uses a full-viewport Sheet. The runtime survives closing, expanding and navigation. History, editing, retry, branches and exports share the same conversation model. No invented trend KPIs, avatars, company records or model-selector behavior.

FINISH: Keep DESIGN.md and its sidecar aligned with source, inspect desktop and mobile outputs, and preserve every shipping raster's provenance. Earlier `redesign-*` captures show a superseded palette; current verification uses `freedom-*` captures.


REDESIGN AUTHORITY: The latest user-selected Freedom Finance reference supersedes the previous copper/Mercury/Linear palette direction. The required Base UI, Phosphor and assistant-ui component choices remain. Keep the first viewport focused on useful records and actual dataset values.

MOTION: Fast sidebar collapse, Base UI overlay transitions and chart tooltips; a single 180 ms workspace entrance. Graph navigation interpolates over 200 ms and disables movement for reduced motion. No looping decorative motion or particles suggesting live money transfers.

METRIC CARDS: Show real seed share, transfer activity, turnover history and community sizes using shadcn Card/Chart with Recharts. Retain the two/four-column layout, exact-value tooltips and explicit empty/loading states. The global activity series uses at most 32 date buckets; no synthetic trend deltas. Current card verification captures use `artifacts/metric-cards-*.png`.
