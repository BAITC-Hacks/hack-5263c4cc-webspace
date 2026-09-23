# Freedom Finance interface reference

Inspected on 23 September 2026. Source: [Renua's Freedom Finance case study](https://renua.one/work/freedom-finance). Read with Exa; downloaded and visually inspected the original gallery assets. Existing `DESIGN.md` was read before these recommendations. Local reference files are under the Git-ignored `artifacts/references/` directory.

## What the reference actually shows

The strongest product reference is [gallery1-1poster.jpg](https://renua.one/img/works/freedom-finance/gallery1-1poster.jpg): three mobile banking screens showing a balance/activity view, card details, and a profile/rewards view. The case study does not demonstrate a desktop investigation workspace or a sidebar. Sidebar and graph guidance below is an adaptation of this observed visual language, not a reproduction of a demonstrated desktop layout.

Most other gallery items show brand campaigns, payment hardware, card materials, motion or merchandise. In particular, gallery1-2 is a cap, gallery1-3 is a payment confirmation, and gallery3-1 is a poster installation. These inform identity, not dashboard information architecture.

## Observed visual decisions

| Element | Evidence from the product screens | Application to Aqsha Lens |
| --- | --- | --- |
| Surfaces | White application surfaces on very pale cool gray/green staging. The poster background samples to `#f1f3f0`. Internal containers are near-white gray. | Remove the warm copper/cream cast. Keep white graph/cards and a clean, slightly cool canvas. |
| Type | Near-black sans serif; prominent balance figures; quiet gray descriptive labels. Section titles are compact and bold. | Large readable quantities, concise labels, fewer explanatory sentences. Use self-hosted Inter for the user's requested typography refresh; this is an application choice, not an identification of the reference's font. |
| Primary action | Small, bright green “Pay” pill; near-black navigation bar and primary onboarding button elsewhere. | A charcoal main navigation selection and green brand/focus accent are grounded adaptations. Avoid making all actions green. |
| Secondary actions | Small pale-gray pills with black labels. | Compact controls, restrained pill treatments, minimal borders. |
| Data hierarchy | A small label over a large amount; supporting details below. Transactions have left-aligned identity and right-aligned amount with muted metadata. | Prefer simple metric groups and clean rows over nested boxes or decorative icon tiles. |
| Containers | Soft rounded corners, barely visible boundaries, little apparent elevation. | Approximately 18–22px card radii, fine borders or tonal separation, no heavy shadows. |
| Navigation | Compact charcoal mobile bar; white active symbol, subdued inactive symbols. | White desktop sidebar with a compact charcoal selected row, consistent icons and generous empty space. |
| Color | Green appears in selected actions, positive values and small indicators; most working UI remains white, black and gray. | Use green deliberately. Keep graph/evidence roles explicitly labeled so green never implies innocence, guilt or certainty. |

The [vector typography specimen](https://renua.one/img/works/freedom-finance/gallery2-3.svg) contains exact colors `#8CE85F`, `#098830`, `#1F6226`, `#235824` and `#264E21`. Its green is stronger than the application surfaces. `#8CE85F` is suitable for a small brand accent or selected marker; dark green provides readable text and graph strokes. The typeface name cannot be established from this vector asset because the lettering is outlined.

## Sidebar refinement

The earlier sidebar repeated context through the wordmark subtitle, Workspace heading, Exports heading, dataset footer, badge, and collapse label. It also gave the assistant a filled row competing with the active destination.

The final implementation uses one compact brand row, one coherent destination list and a quieter outlined assistant entry. The user explicitly requested removal of the dataset and collapse footer rows; the sidebar now has no footer. The main content still identifies synthetic versus official data, and exports remain in the header. The active destination stays visually strongest. The standard Base UI sidebar retains its header trigger, rail, tooltips and accessible labels, using the official 16rem expanded and 3rem collapsed widths.

All navigation should remain reachable, including communities, signals and resilience. Simplification should remove duplicated framing, not available investigative capabilities.

## Metrics, graph and evidence

The balance screen gives its amount priority without surrounding it with an explanatory card. Adopt that hierarchy: metric label, large figure, concise unit/context. Avoid preambles, badges inside every metric, invented trends or extra status lines.

The case study contains no money-flow graph. A compatible adaptation uses a white canvas, charcoal selected node, fine neutral related edges and restrained dark-green incoming strokes. Keep outgoing flows distinguishable by label and/or direction. Preserve selected-node emphasis, legible account IDs, directional arrows, self-transfers and observation-boundary line styles. A green stroke is a visual distinction, never an evidentiary claim.

Use the evidence inspector for full explanations. Keep essential methodological distinctions—observed facts, hypotheses, missing evidence and depth-four observation boundaries—available and explicit. They should not become decorative copy across every card.

## Local references

- `artifacts/references/freedom-gallery1-1poster.jpg`: primary product UI reference.
- `artifacts/references/freedom-gallery2-3.svg`: exact green palette and outlined typography specimen.
- `artifacts/references/freedom-gallery1-3.webp`: payment confirmation, white canvas and dark card.
- `artifacts/references/freedom-gallery5-1poster.jpg`: restrained black primary action on white onboarding.
- `artifacts/references/freedom-contact.jpg`: contact sheet of the case-study posters for comparison.

Downloaded gallery assets are research references only. They are not application assets and should remain ignored by Git.
