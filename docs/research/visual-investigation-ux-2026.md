# Human-readable financial investigation: graph and dashboard research

Research date: **23 September 2026**. Live package and repository metadata checked at **11:00 UTC**. This decision supersedes the earlier recommendation to retain the default Cytoscape force layout. The user has repeatedly reported that the existing graph and dashboard are unreadable.

## Decision

Use **React Flow 12.11.6 + Dagre 3.1.1** for the default investigation view: a small, directed, left-to-right neighborhood made of readable account cards. Use the existing **shadcn Base UI Chart / Recharts 3** system for supporting analytics. Keep the complete Base Nova dashboard shell, assistant-ui, and Phosphor icons. Do not add a second general chart runtime merely to increase the number of libraries.

This is a task-fit decision, not a claim that React Flow renders the most nodes. Its DOM account cards can carry actual IDs, role hypotheses, boundary labels, keyboard focus, and ordinary shadcn components. The library offers keyboard selection and automatic panning to focused nodes; the application must still supply meaningful labels and verify its interactions. [React Flow accessibility](https://reactflow.dev/learn/advanced-use/accessibility), [custom nodes](https://reactflow.dev/examples/nodes/custom-node).

**Dagre first; ELK when needed.** Dagre gives us a simple layered layout with a small integration surface and an MIT license. ELK adds more sophisticated port and edge-routing control and compound layouts, but requires more configuration and asynchronous layout handling. Its actual package license is **EPL-2.0 OR GPL-3.0-or-later**, not MIT; GitHub's NOASSERTION value is not a usable license conclusion. [Layout comparison](https://reactflow.dev/learn/layouting/layouting), [ELK package manifest](https://github.com/kieler/elkjs/blob/0.12.0/package.json).

## What the research changes

The main issue is information density and lack of a reading order. A faster renderer cannot by itself make hundreds of tiny IDs, crossing arrows, and hidden amounts understandable. Practitioner examples recommend beginning with an investigation target, allowing explicit expansion, and keeping search results separate from the graph. These are vendor design recommendations, not controlled usability-study results. [Investigation workflow](https://cambridge-intelligence.com/blog/due-diligence-investigations/).

The default scene should answer: **Which account is selected, who paid it, who received its transfers, and what do the recorded amounts actually show?** Begin with up to three incoming and three outgoing counterparties, ranked by observed relationship amount. Show a precise count of omitted nodes in the loaded neighborhood. Provide an explicit expansion control, then a transfer-table alternative. The 3+3 and 25-node caps are our product starting points to validate, not universal human-memory limits.

Grouped views and filtering can reduce clutter, but grouping must be reversible and visibly aggregated. Do not silently merge account identities, hide cycles, or label a cluster as one owner. Keep boundary status visible because depth-four observation endings are not established beneficiaries. [Graph density and progressive exploration](https://cambridge-intelligence.com/blog/visualize-large-networks/).

## Current ecosystem: verified versions, adoption, maintenance

Stars are an adoption signal, not a security or usability rating. HEAD is the actual default-branch commit date; it differs from repository `pushed_at`. No comparative FPS benchmark was run. “Recent” here means since **24 August 2026**, calculated as the research date minus 30 days.

| Library / repository | Latest npm | Stars | Default HEAD | License | Fit for this product |
|---|---|---:|---|---|---|
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | `@xyflow/react@12.11.6` | 38,477 | [2026-09-01](https://github.com/xyflow/xyflow/commit/0a1f9575b25679f2880175de8d3eae21aedde921) | MIT | Selected: semantic account cards and accessible interaction |
| [ELK](https://github.com/kieler/elkjs) | `elkjs@0.12.0` | 2,777 | [2026-09-17](https://github.com/kieler/elkjs/commit/722f1a3f63016e64f534a8b445283d4d31a88d0e) | EPL-2.0 OR GPL-3.0-or-later | Upgrade path: ports, compound layout and routing |
| [Dagre](https://github.com/dagrejs/dagre) | `@dagrejs/dagre@3.1.1` | 5,801 | [2026-08-08](https://github.com/dagrejs/dagre/commit/32e7f30f97f029fbfc89ce50e072d4fc16145838) | MIT | Selected layered layout; smallest all-MIT integration |
| [AntV G6](https://github.com/antvis/G6) | `@antv/g6@5.1.1` | 12,304 | [2026-09-23](https://github.com/antvis/G6/commit/54ece372b40aa8ecbf09add9e09544979a4be10f) | MIT | Best alternate full network engine; excellent grouping/behaviors |
| [Graphin](https://github.com/antvis/Graphin) | `@antv/graphin@3.0.5` | 1,099 | [2025-11-18](https://github.com/antvis/Graphin/commit/ae679a8c578bee2315f0222837e0db5be5165b38) | MIT | Wrapper adds little here; default HEAD is older than G6 |
| [Reagraph](https://github.com/reaviz/reagraph) | `reagraph@4.32.0` | 1,092 | [2026-06-25](https://github.com/reaviz/reagraph/commit/d2f4f0822e54c8cb0866d51ccb26f08e9fe0a3fe) | Apache-2.0 | Attractive GPU 2D/3D network; weaker fit for dense evidence cards |
| [Sigma.js](https://github.com/jacomyal/sigma.js) | `sigma@3.0.3` | 12,170 | [2026-04-30](https://github.com/jacomyal/sigma.js/commit/d32c4e5bfd4c5f49724ebc21bd786b01be555dac) | MIT | Strong large-network overview; custom canvas details required |
| [React Sigma](https://github.com/sim51/react-sigma) | `@react-sigma/core@5.0.6` | 238 | [2025-12-05](https://github.com/sim51/react-sigma/commit/2de61da77a5ed4458ee7f30fd726f53037aa790d) | MIT | Convenient Sigma React bindings, older maintenance snapshot |
| [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) | `cytoscape@3.34.3` | 11,221 | [2026-09-07](https://github.com/cytoscape/cytoscape.js/commit/7ba634095d8954089ee5dc09ada0030f2dca134c) | MIT | Mature analysis engine; layout change alone is viable fallback |
| [Cytoscape Dagre](https://github.com/cytoscape/cytoscape.js-dagre) | `cytoscape-dagre@4.0.1` | 288 | [2026-07-27](https://github.com/cytoscape/cytoscape.js-dagre/commit/6e8d4373d3b6c6034182ae32cd4a5ce633b04a7e) | MIT | Lowest-risk fallback if renderer migration fails |
| [Cytoscape ELK](https://github.com/cytoscape/cytoscape.js-elk) | `cytoscape-elk@2.3.0` | 57 | [2026-04-10](https://github.com/cytoscape/cytoscape.js-elk/commit/8cf116841e241626752b6be79053217f9b9e9101) | MIT | ELK integration fallback; underlying ELK license still applies |
| [Apache ECharts](https://github.com/apache/echarts) | `echarts@6.1.0` | 67,379 | [2026-09-12](https://github.com/apache/echarts/commit/984bf46b2f905dd0ad909a2d5e6e9d66a1b6568c) | Apache-2.0 | Excellent broad chart engine; would duplicate Recharts here |
| [Nivo Sankey](https://github.com/plouc/nivo) | `@nivo/sankey@0.99.0` | 14,102 | [2026-07-21](https://github.com/plouc/nivo/commit/0dae2c32052a573f9f1d66ec1b453b572119b265) | MIT | Attractive specialized charts; Sankey rejects cycles |
| [Recharts](https://github.com/recharts/recharts) | `recharts@3.10.1` | 27,583 | [2026-09-22](https://github.com/recharts/recharts/commit/89f2648a98665630cfc378f4bc8fb4eafd860788) | MIT | Selected supporting charts; native shadcn integration |

Exact repository SHA, package release timestamps, peer constraints and metadata are preserved in [visualization-library-metrics.json](visualization-library-metrics.json). All fourteen inspected repositories were unarchived at capture. Package metadata comes directly from the npm registry; repository values come directly from GitHub REST, rather than potentially stale search snippets.

The integration review at **11:10 UTC** matched all fourteen table rows against the saved repository counts, SHAs and HEAD dates. The current lockfile contains React Flow **12.11.6**, Dagre **3.1.1**, and Recharts **3.8.0**. Recharts **3.10.1** above is the researched latest release, not the installed version. Keeping the existing compatible Recharts 3 installation avoids an unrelated upgrade during the graph migration. React Flow accessibility/layout guidance, ELK's package license and ECharts' cycle rejection were rechecked against the linked primary sources through Exa.

## Alternatives and tradeoffs

**G6 5.1.1** is the strongest alternative if large compound network exploration becomes the dominant requirement. It has explicit collapse/expand behaviors for nodes and combos, focus interactions, structured layouts, and edge bundling. For this short implementation window, React account-card composition and keyboard support are more valuable. Bundling can aid an overview but makes individual transfer paths harder to trace; disable it for exact evidence inspection. [G6 collapse/expand](https://g6.antv.antgroup.com/en/manual/behavior/collapse-expand), [edge bundling](https://g6.antv.antgroup.com/en/manual/plugin/edge-bundling), [Dagre layout](https://g6.antv.antgroup.com/en/manual/layout/dagre-layout).

**Sigma + React Sigma** is a strong overview candidate for thousands of nodes. Sigma uses WebGL and Graphology; reducers can fade unrelated entities and emphasize neighborhoods. Custom labels and shapes still require canvas/WebGL-specific implementation. It should not be selected just to redraw the same hairball faster. [Sigma introduction](https://www.sigmajs.org/docs/), [appearance APIs](https://www.sigmajs.org/docs/advanced/customization/), [React Sigma layouts](https://sim51.github.io/react-sigma/docs/example/layouts/).

**Reagraph** offers convenient React-oriented WebGL 2D/3D visuals. 3D adds perspective, occlusion and camera manipulation to a task whose essential data are directed account relationships and exact amounts. There is no demonstrated task benefit here, so omit 3D. This is our product judgment, not a claim that 3D is universally inferior. [Reagraph](https://reagraph.dev/).

**Cytoscape + Dagre/ELK** remains a credible fallback: keep the existing data bindings while changing scope, labels and layout. The current library is not intrinsically ugly. The replacement is justified by accessible DOM content and a reusable component system, not by the prestige of a new dependency.

## Ready-to-use components

React Flow itself publishes a **shadcn-compatible component registry**. Its BaseNode is a small source-owned wrapper with Header, HeaderTitle, Content and Footer pieces, and only `@xyflow/react` as a runtime dependency. This is a useful structural reference for account cards. The registry's zoom-slider currently imports **Lucide**; replacing these with **Phosphor** is mandatory for this project. Do not blindly vendor its demo icon imports. [Base Node](https://reactflow.dev/ui/components/base-node), [actual registry item](https://ui.reactflow.dev/base-node), [zoom-slider source registry](https://ui.reactflow.dev/zoom-slider).

Use standard Base UI/shadcn components where they improve the work: Tabs for Flow/Transfers; ToggleGroup for graph scope; Tooltip for icon controls; Badge for seed/boundary/role; Sheet for mobile evidence; Collapsible for methodology; Table for exact transfer values. Keep essential evidence visible rather than inside hover-only tooltips. React Flow NodeToolbar and EdgeToolbar remain at readable screen size when the canvas zooms; they are suitable for selected evidence actions. [Built-in graph components](https://reactflow.dev/api-reference/components).

The existing shadcn Chart component is designed to compose Recharts, not conceal it. Use its real ChartContainer, ChartTooltipContent, ChartLegendContent, chart color tokens, and a defined chart height. Enable `accessibilityLayer` on eligible chart types; confirm keyboard and screen-reader behavior in the application. [Official Base UI chart](https://ui.shadcn.com/docs/components/base/chart).

## Visualizations that answer useful questions

| View | Human question | Real data already available | Recommended form | Accuracy constraint |
|---|---|---|---|---|
| Account flow | Who transfers to/from this account? | GraphData nodes and directed aggregated edges | Small layered account-card diagram + exact transfer table | Only recorded edges; visible omission and server truncation counts |
| Daily activity | When did activity concentrate? | NodeDetail.timeline | Paired incoming/outgoing bars or lines, KZT/count toggle | Preserve calendar gaps; values are observed daily aggregates |
| Largest counterparties | Which relationships dominate recorded flow? | NodeDetail.counterparties | Two horizontal ranked bar lists | Backend returns top 25 per direction; state this and show remainder only if correctly derived |
| Role distribution | What roles does the heuristic assign? | Summary.role_counts | Horizontal bars with counts; colors consistent with graph | Role fit is a hypothesis, not a crime probability |
| Communities | Which clusters merit closer examination? | Cluster count/internal KZT/seed count | Ranked bars + sortable table | Internal flow and account totals are different measures |
| Removal simulation | How sensitive is observed connectivity? | Resilience baseline/after | Paired bars and direct deltas | Graph sensitivity only; no claim that removal stops crime |
| Priority explanation | Why was this account ranked? | score_factors contributions | Horizontal contribution bars | Keep contribution versus normalized priority distinct |
| Signal trail | What dates and edges support a pattern? | routes/cycles chronological evidence | Explicit step cards with dates and amounts | Aggregated totals do not establish traced identity of funds |

Avoid filling the page with decorative donut charts. A supporting chart earns its space when it answers a different question and has clear units, counts, dates and selection behavior.

### Sankey caveat

Raw financial graphs may contain cycles. **Nivo Sankey explicitly rejects cyclic dependencies**, and the actual **ECharts 6.1.0** Sankey source still throws when it detects a cycle. Do not silently remove cycle edges to make a pretty diagram. [Nivo warning](https://nivo.rocks/sankey/), [pinned ECharts Sankey source](https://github.com/apache/echarts/blob/6.1.0/src/chart/sankey/sankeyLayout.ts).

An optional staged incoming → selected account → outgoing diagram can be valid with separate stage-qualified IDs and visible aggregation labels. It must not imply that particular incoming funds were traced into particular outgoing transfers, or that incomplete observed inflow must equal observed outflow. Until that modeling and explanation are complete, use paired bars instead. ECharts also requires explicit accessibility configuration/imports; its automatic description is not an accessible transfer-table substitute. [ECharts accessibility](https://echarts.apache.org/handbook/en/best-practices/aria/).

## Concrete implementation contract

1. Preserve the existing `GraphData`/`onSelect` interface and backend authorization boundaries. No scoring or role assignment changes.
2. Select the root plus up to three largest incoming and three largest outgoing counterparties, with stable amount/GID ordering. Always retain the root, including an isolated seed. Expansion is explicit and capped at 25 visible accounts.
3. Render only observed edges whose endpoints are visible. Sorting/layout may change position; they must not create a path, reverse an arrow or omit cycle evidence without visible scope disclosure.
4. Use roughly 152×88 px account cards, readable GIDs, plain-language role badges, and boundary/seed labels. Pin minimum zoom to preserve at least roughly 12 px text. When a whole neighborhood cannot fit readably, allow panning and explicit recentering instead of shrinking every label.
5. Use a strong cobalt selected-state, consistent role/community colors, neutral secondary edges and restrained arrow widths. Do not encode guilt as red/green. Selection changes should not continuously animate the entire scene.
6. Provide Flow and Transfers tabs; exact KZT and transaction counts remain accessible without hover. Disable connection editing and destructive keyboard shortcuts because this is an evidence viewer.
7. Keep graph controls outside the scaled viewport. Use Phosphor icons and accessible button names. On narrow screens, retain a usable transfer table and pan controls rather than compressing a desktop diagram into illegible pixels.
8. Memoize custom nodes, callbacks and data transformations. Recompute layout only when visible topology changes; avoid permanent force simulations. Cancel or ignore stale async layout results if ELK is later introduced. [React Flow performance](https://reactflow.dev/learn/advanced-use/performance).
9. Validate a cycle, bidirectional pair, self-loop if present, isolated seed, depth-four boundary, dense root, long GID and empty response. Verify mobile, keyboard selection, no hidden-label dependency, exact transfer details and export.

## Research coverage

Seven Exa search queries requested **41 result slots** across library capability, graph usability, accessibility, chart modeling, and ready-to-use component workstreams. Thirteen direct pages were fetched after search; live GitHub/npm metadata covered fourteen repositories and fourteen packages. Search hits were filtered to primary maintainer documentation, source repositories and practitioner product material. Repeated URLs and alternate-base shadcn chart copies were not treated as independent confirmation. This is a design/implementation recommendation; implementation and browser validation are reported separately.
