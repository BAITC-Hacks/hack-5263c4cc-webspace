# Aqsha Lens: visual reference study

Research date: 23 September 2026. Exa returned 36 candidate records across three workstreams: dashboard references, production interfaces, and graph components. Repeated results and template/AI prompt aggregators were discarded. Four public images were downloaded and visually inspected; copies are local in the already-ignored `artifacts/references/` directory. Recommendations below are design judgments, not measured usability findings. Existing library/version research is in [visual-investigation-ux-2026.md](visual-investigation-ux-2026.md); this study avoids repeating its package census.

## Direction

Build a light, warm, precise investigation workspace. Give the graph or records the largest uninterrupted area. Use ink typography, fine dividers, and a muted navigation surface; reserve one warm accent for selection and primary action. Organize around **select an account → inspect observed transfers → review evidence**. The default screen should feel like working software with a particular purpose, not a gallery of interchangeable analytics cards.

## What fails in the current screen

Visual review used `artifacts/aqsha-overview-desktop.png`, not an assumed description of the app.

- The navy sidebar and outer frame draw more attention than the selected evidence. Blue-tinted page, text, border, selection, and badges make the entire interface feel colored rather than ordered.
- Four equal metric cards establish no clear first task. Repeated large rounded boxes, card borders, and nested containers consume space without adding hierarchy.
- The community treemap is the largest, most saturated object. Its unequal rectangles and rainbow colors dominate the page while tiny groups become difficult to read. The adjacent role chart repeats its values again in a long legend.
- Community identity, role, selection, and caution all compete through color. Saturated orange for “Boundary unknown” can read as an alarm even though this is an observation limitation.
- Overview-level totals are visually polished more than the actual investigation workflow. A user still needs a clear account selection, readable relationships, and exact records.

## References actually inspected

| Reference | Concrete observation | Apply to Aqsha Lens |
| --- | --- | --- |
| [Linear: interface redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) — primary design writeup, inspected “After” screenshot | Aligned sidebar, contextual header, main work area and properties panel form one continuous workspace. Selection has a small local fill. Dividers and typography carry hierarchy with very little decoration. | Use one coordinated shell. Align navigation and inspector headings. Keep the work area continuous. Borrow the structure, while using a light palette suited to this redesign. |
| [Mercury: updated Transactions](https://mercury.com/blog/updated-transactions-page) — primary product article and cash-flow screenshot | A clear title and compact filter row sit above modest charts. Numbers and labels are stronger than chart decoration. The article explicitly connects chart filtering to the records underneath. | Make the selected account, cohort and date scope explicit. Pair incoming/outgoing summaries with exact records. Use the same data scope for chart, graph and table. |
| [Ofspace: Finance Management Dashboard](https://dribbble.com/shots/20522013-Finance-Management-Dashboard-SaaS) — Dribbble concept, inspected image | Pale sidebar, ample alignment, dark headings and a calm transaction list are useful. Its promotional card, profile-completion prompt, generic growth metrics and tiny sparkline blocks are distractions for our workflow. | Take the neutral shell and clean row rhythm. Reject the promotional surfaces, invented growth figures, and repeated KPI tiles. This is a visual concept, not evidence of production usability. |
| [Shpetim Ujkani: Discovery Context Visualizer](https://dribbble.com/shots/19901643-Discovery-Context-Visualizer) — Dribbble product presentation, inspected image | A small directed path, selected node, labeled relationships and adjacent details make a discovery story readable. The dark blue colors and decorative presentation gradient are unnecessary here. | Keep a small directed neighborhood and persistent evidence context. Preserve real edge direction and provide labels outside hover. Do not copy the color treatment or floating presentation panels. |
| [Ramp expense management](https://ramp.com/expense-management) — primary product workflow text; screenshot not inspected | The page describes work queues, policy references, exceptions and audit trails attached to decisions. | Prioritize accounts that need review and the evidence behind each priority. Apply the workflow principle only; no claim is made about Ramp's visual details here. |

The requested [Square UI dashboard-4](https://github.com/zerostaticthemes/square-ui/tree/master/templates-baseui/dashboard-4) remains a layout reference. Its source and license were already reviewed in [ui-ecosystem-2026.md](ui-ecosystem-2026.md). General alignment and page composition can inform original application code; wholesale template copying is unnecessary.

Additional Dribbble candidates were discovered but not visually validated, so they do not determine the direction: [Ofspace Fintech Dashboard](https://dribbble.com/shots/17342291-Fintech-Dashboard), [Rares Gall Personal Finance](https://dribbble.com/shots/23229963-Personal-Finance-Dashboard-Concept), and [Banker Dashboard](https://dribbble.com/shots/10746297-Banker-Dashboard). Direct Dribbble HTML downloads returned empty pages; the two inspected shots were downloaded from public image URLs found through image search.

## Concrete visual system

These values are a proposed application palette, not extracted brand tokens from a reference.

| Token | Proposal | Purpose |
| --- | --- | --- |
| Canvas | `#F6F5F2` | Warm, low-contrast page background |
| Main surface | `#FFFFFF` | Records, dialogs and account cards |
| Navigation | `#EEEDE8` | Quiet sidebar, with no dark outer frame |
| Ink | `#252421` | Headings, important numbers and account IDs |
| Secondary ink | `#6E6B65` | Supporting descriptions |
| Divider | `#DFDDD6` | Tables and panel boundaries |
| Accent | `#A4472D` | Selected account and limited primary action |
| Accent wash | `#F7E9E1` | Selected rows and subtle emphasis |
| Boundary | Neutral text + dashed outline | Observation limit, not danger level |

Validate final combinations for contrast in the implementation. Use color as a supplement to labels. Keep community identity in small markers or swatches rather than covering entire tiles with saturated fills. A second muted chart series may distinguish incoming and outgoing amounts; it must have a visible legend and corresponding exact values.

- Typography: one existing well-rendered sans family for the interface; 13–14 px main UI text, 12 px metadata, 24–28 px page titles, 28–32 px key values. Use semibold selectively. Set tabular numerals for financial values. Use mono only where it helps distinguish raw account identifiers.
- Geometry: roughly 220–232 px desktop sidebar, 52–56 px context header, 24 px page gutter, 16 px section gaps. Use 8–10 px radii for ordinary surfaces and 6 px for controls. Prefer dividing lines to nested cards. These are starting values, not fixed accessibility guarantees.
- Overview: concise dataset scope, one useful chart, and a strong “Accounts to review” list. Compact counts can share a single horizontal summary strip. Replace the dominant rainbow treemap with a readable ranked community list or modest neutral size chart.
- Investigation: a main graph with roughly 60–70% of the available width plus a 320–360 px evidence inspector. The panel contains selected account identity, observed totals, role hypothesis, contributing signals and missing evidence. A mobile sheet preserves the same hierarchy.
- Tables: 40–44 px rows, clear column headings, right-aligned amounts and counts, subtle hover, distinct selected row. Keep all account IDs reachable and amounts available without tooltips.
- Icons: retain Phosphor only. Use consistent 16–18 px regular icons, with filled or stronger-weight variants only when they clearly mark selection. Do not add pastel icon tiles to every summary value.

## Graph decisions, checked against current primary documentation

Retain React Flow with Dagre. React Flow supports custom React node contents and focusable graph elements, while Dagre provides simple directed layout; ELK offers more routing control if that becomes necessary. Switching to another renderer would not itself repair hierarchy or legibility. [Custom nodes](https://reactflow.dev/learn/customization/custom-nodes), [accessibility](https://reactflow.dev/learn/advanced-use/accessibility), [layout comparison](https://reactflow.dev/learn/layouting/layouting).

Use compact account cards with one readable ID, one plain-language role label, and a small amount/relationship summary. Start from the existing bounded neighborhood. Give the selected account a warm border and local wash; keep other accounts mostly white. Use 1–1.5 px neutral edges and a stronger selected relationship. Avoid colorful node fill for every role. Show seed and depth-four boundary status in text. An isolated account must remain visible.

Preserve exact directed transfers and cycle evidence. Layout columns indicate graph arrangement, not chronological proof or traced identity of funds. Show the count of hidden/omitted accounts, provide explicit expansion, and retain a transfers table. Do not animate all arrows continuously: motion would imply live movement in static historical evidence.

React Flow's [Base Node](https://reactflow.dev/ui/components/base-node) is a useful shadcn-compatible composition reference. Its examples use Lucide icons, so take the structure and use Phosphor. [Base UI Tabs](https://base-ui.com/react/components/tabs) provides the actual behavior for Graph/Transfers panels and an indicator part that can be animated without replacing keyboard interactions.

## Motion that improves reading

Use one short transition per action: 140–180 ms row and control emphasis, a 180–220 ms evidence-panel entrance, and a modest tab-indicator movement. A graph selection should highlight the related evidence immediately; camera animation should occur only for explicit centering or when selection is off-screen. Preserve graph positions when changing the selected account if the underlying visible neighborhood has not changed.

Respect reduced motion: replace panel translation with opacity or immediate display and skip graph camera tweening. Motion's documented `MotionConfig reducedMotion="user"` and `useReducedMotion` support this behavior. Exact durations above are product choices. [Motion accessibility](https://motion.dev/docs/react-accessibility).

Do not add floating gradients, entrance animations for every data point, animated counters, perpetual edge pulses, or fake assistant token streaming. Motion should explain a user-triggered change in state.

## Local image ledger

Four reference images were visually inspected and retained locally. They are reference material only, not application assets or Git content.

| Local file | Source image |
| --- | --- |
| `artifacts/references/linear-redesign.png` | [Linear actual “After” interface](https://webassets.linear.app/images/ornj730p/production/2ef6f0599f502940b18eae2c37a1fbd9ee09be25-2352x1380.png) |
| `artifacts/references/mercury-transactions.png` | [Mercury cash-flow and filters](https://www.datocms-assets.com/115132/1753304772-2025-07-16_insights-awarenss_cash-flow-graph.png) |
| `artifacts/references/ofspace-finance.jpg` | [Ofspace finance dashboard](https://cdn.dribbble.com/userupload/4449890/file/original-f1f97ed2163ac99d8ce528223abcb388.jpg) |
| `artifacts/references/discovery-context.png` | [Discovery Context Visualizer](https://cdn.dribbble.com/userupload/4010686/file/original-045ac3ed9b3f5db3652c141513fbb2b7.png) |
