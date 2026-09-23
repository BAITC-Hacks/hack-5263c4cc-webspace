---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/styles.css"]
---

# Dashboard replacement

Mode: Operate. Source of authority: the user explicitly rejected the previous interface and requested a complete Base UI dashboard, with mandatory Phosphor icons and assistant-ui. This pinned component system overrides the alternative concepts from seed 99debb29. Implementation uses the actual official Base Nova dashboard block, not an image approximation.

## Direction contract

THESIS: Make recorded money flows and the evidence behind a hypothesis easy to inspect using a familiar complete dashboard.

OWN-WORLD: Aqsha Lens warm white and graphite surfaces, muted copper accent, quiet light sidebar, self-hosted Geist, Phosphor icons, standard Sidebar, Card, Table, Tabs, Sheet, Select, Badge, Alert and Button components. Readable 14–16px primary text.

STORY: Choose an account, inspect its graph and evidence, compare patterns, ask a bounded question, and download reproducible outputs.

FIRST VIEWPORT: Collapsible branded navigation on the left; compact factual cards, restrained community/role visualizations and an actionable review queue; a compact case header and real dataset summary; a readable account network using circular role glyphs in the main region and a readable evidence inspector on wide screens. The account table is a dedicated complete view and a shortlist below the graph. On smaller screens the inspector becomes a Sheet. Exports stay in the header.

FORM: User-pinned Square UI Dashboard 4 composition built with official shadcn/Base UI components; seed 99debb29 alternatives do not replace the explicit user direction. Warm neutral surfaces with color confined to evidence charts and selected states support prolonged review in a normal indoor judging/work environment. No invented trend KPIs, avatars, company records or model-selector behavior.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance


REDESIGN AUTHORITY: User rejected the cobalt/navy implementation on 23 September and explicitly said “Select best suitable.” Seed 99debb29 was run for the replacement world; the user-pinned standard component dashboard overrides its alternative visual metaphors. The selected category reference is Mercury/Linear, applied code-first using the real Base UI system rather than a speculative comp. The first viewport must show useful records, not a giant rainbow visualization.

MOTION: Fast sidebar collapse, Base UI overlay transitions and chart tooltips; a single 180 ms workspace entrance. Graph navigation interpolates over 200 ms and disables movement for reduced motion. No looping decorative motion or particles suggesting live money transfers.
