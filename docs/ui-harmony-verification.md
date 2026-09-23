# UI harmony verification

Verified on 23 September 2026 during the integrated account-ID transport and interface refinement. [Research and primary sources](research/ui-harmony-2026.md) explain the choices. This is a bounded browser and contrast review, not a complete accessibility certification or measured usability study.

## Changes

| Before | After | Why |
|---|---|---|
| Graph, timeline and categorical palettes used separate literals | CSS owns semantic flow, role and community colors; shared helpers connect the views | A color retains its meaning while switching views |
| Related edges had 1.71:1 contrast on white | Supporting edges now have 3.67:1; peripheral glyphs have 3.97:1 | Meaningful marks remain visible without taking priority from the selected account |
| Hover and selected navigation used the same charcoal style | Soft hover and charcoal active styles are separate; current-page semantics remain | Pointer feedback does not impersonate the current destination |
| A disabled Send button dimmed the whole enabled composer | Only a disabled input control dims its group | An empty conversation still looks ready for a question |
| Keyboard charts suppressed focus outlines | Focused charts show a solid 2px dark-green outline | Keyboard position stays visible |
| Composition charts preceded the review queue | Review queue follows the four real metric charts | Investigation actions appear before secondary analysis |
| Fit was constrained to 0.9 zoom | Explicit Fit can use 0.25; Center restores zoom 1 | Larger expanded neighborhoods can fit inside the canvas |
| Role alternatives required consulting separate documentation | A collapsed comparison exposes engine scores and exact eligibility criteria | Reviewers can inspect the hypothesis without obscuring the main evidence |

## Browser checks

Synthetic data was served on a separate loopback process with dotenv loading disabled, an empty API key and both external-AI flags false. Desktop captures used 1440 × 1000; mobile captures used 390 × 844. A further 320px-width check found no document or workspace horizontal overflow. The four metric charts remained present.

The investigation, role-comparison disclosure and global assistant were inspected. The enabled composer retained opacity `1` on desktop and mobile, and its mobile footer remained inside the viewport. Mobile navigation provided eight rows with a minimum height of 44px. The skip link moved focus to `main-content`; chart focus computed to a solid 2px outline. Reduced-motion emulation reduced the workspace animation to `0.00001s`. Browser error checks returned no JavaScript errors in the exercised synthetic flows.

Expanding the selected synthetic account to nine visible nodes and choosing Fit placed every node within the graph viewport, at approximately 0.47 zoom. Directed arrowheads remained rendered. The default focused neighborhood keeps a readable account context; Center remains available after fitting a larger scene.

The separate official-data backend was checked without writing account identifiers to the verification output. The selected heading matched its exact string ID, the graph loaded, every visible ID label fit its element, and desktop/mobile document and workspace widths remained bounded. The longest label in that inspected scene contained 18 digits. This verifies that scene; it is not an exhaustive layout review of all possible datasets.

## Measured color pairs

Computed from the actual resolved browser tokens against white, using WCAG relative luminance:

| Token | Contrast |
|---|---:|
| Muted text | 5.62:1 |
| Incoming flows | 5.82:1 |
| Outgoing flows | 5.16:1 |
| Related graph edges | 3.67:1 |
| Peripheral role marks | 3.97:1 |
| Focus color | 5.82:1 |
| Input boundary | 3.17:1 |

The palette retains explicit labels, directions and boundary styles. These measurements cover solid named pairs, not every overlay, state, visual impairment or assistive technology.

The TypeScript/Vite production build passed after the final visual corrections. Backend and assistant integration results are recorded separately in [validation.md](validation.md). Current local synthetic captures are named `artifacts/harmony-*`; generated artifacts and official data remain excluded from Git.
