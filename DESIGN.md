---
name: "Aqsha Lens"
description: "A clear, factual workspace for inspecting recorded money flows."
colors:
  background: "#f1f3f0"
  foreground: "#20231f"
  card: "#ffffff"
  card-foreground: "#20231f"
  popover: "#ffffff"
  popover-foreground: "#20231f"
  primary: "#8ce85f"
  primary-foreground: "#14320d"
  secondary: "#f0f3ee"
  secondary-foreground: "#363e32"
  muted: "#f2f4f1"
  muted-foreground: "#626b5e"
  accent: "#edf4e8"
  accent-foreground: "#24321e"
  destructive: "#b13d37"
  border: "#e2e7df"
  input: "#d9e0d5"
  ring: "#238832"
  chart-1: "#098830"
  chart-2: "#1f6226"
  chart-3: "#718d66"
  chart-4: "#667787"
  chart-5: "#b28b4d"
  sidebar: "#ffffff"
  sidebar-foreground: "#535c4f"
  sidebar-primary: "#1d1f20"
  sidebar-primary-foreground: "#ffffff"
  sidebar-accent: "#20231f"
  sidebar-accent-foreground: "#ffffff"
  sidebar-border: "#e2e7df"
  sidebar-ring: "#238832"
  brand: "#098830"
  graph-ink: "#20251f"
  graph-incoming: "#098830"
  graph-outgoing: "#677b92"
  graph-related: "#c0c9bb"
  graph-surface: "#ffffff"
typography:
  headline:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
  compact:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.428571
  control:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
  label:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333333
  response:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.7
rounded:
  sm: "0.6rem"
  md: "0.8rem"
  lg: "1rem"
  xl: "1.4rem"
  2xl: "1.8rem"
  4xl: "2.6rem"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  7: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  input:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  navigation-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-accent-foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "8px"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.4xl}"
    height: "20px"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  graph-account:
    backgroundColor: "{colors.graph-ink}"
    textColor: "{colors.card}"
    width: "68px"
    height: "68px"
---

# Design System: Aqsha Lens

## Overview

**Creative North Star: "The Quiet Investigation Desk"**

Aqsha Lens uses white surfaces, a pale cool gray-green canvas, near-black text and a bright green action accent to make recorded transfers and supporting evidence easy to inspect. The interface is compact and factual, with familiar dashboard controls and enough separation for prolonged review.

The latest visual authority is the user-selected [Renua Freedom Finance case study](https://renua.one/work/freedom-finance), documented in the [reference review](docs/research/freedom-ui-reference.md). Its observed banking screens inform color, rounded containers, concise labels and amount hierarchy. The desktop sidebar, money-flow graph and global assistant are application-specific adaptations. The existing Base UI/shadcn components, Phosphor icons, assistant-ui runtime and self-hosted Inter remain the implementation system.

**Key Characteristics:**

- White navigation with a charcoal selected destination and quiet assistant entry.
- Compact factual cards, readable records and tabular numbers.
- Bright green primary actions, dark-green focus and restrained analytical color.
- Circular account glyphs, a collapsible evidence inspector and a global conversation workspace.

This record is extracted from `web/src/styles.css`, the Base UI components, `App.tsx`, `Overview.tsx`, `NetworkGraph.tsx`, `AssistantWorkspace.tsx`, `AssistantRuntime.tsx` and `assistant-panel.css`. Earlier `artifacts/redesign-*.png` captures represent the superseded copper theme; they are not verification evidence for this version.

## Colors

White and pale cool gray-green surfaces carry most of the interface. The YAML frontmatter is the normative color inventory and preserves the source CSS values.

### Primary

Bright lime (`primary`) carries principal actions and the header's assistant entry, with dark-green foreground text. Dark green (`brand` and `ring`) supports analytical emphasis and keyboard focus. The charcoal sidebar accent supplies selected and hovered rows, keeping navigation distinct from actions.

### Neutral

The cool canvas (`background`) sits behind white cards, popovers and sidebar. Pale gray-green secondary and muted surfaces separate supporting controls; fine gray-green boundaries separate fields and records. Near-black text (`foreground`) establishes hierarchy above the softer explanatory text (`muted-foreground`). The active navigation row uses charcoal and white.

### Analytical and status colors

The five chart tokens provide dark green, forest green, sage, slate and ochre series. They communicate categories, not decoration. Graph incoming edges use dark green, outgoing edges slate-blue, and related edges pale gray-green. Direction, labels and legend remain essential. Destructive red is reserved for errors and destructive state.

**The Evidence Color Rule.** Color supports a labeled category or interaction state; it never carries a finding alone.

## Typography

**Display and body:** self-hosted Inter Variable, loaded through `@fontsource-variable/inter`, with Inter and sans-serif fallbacks. Optical sizing and the `cv02`, `cv03`, `cv04` and `cv11` character variants are enabled. There is no separate display family. Monospaced account IDs in the graph use the existing utility mono stack; numerical quantities use tabular figures.

Page headings use the headline role. All card titles use the title role. The body and assistant response roles are 16px; compact explanatory text remains 14px. Buttons use the 15px control role, and table records are also 15px. Table headings use 13px text, while compact metadata and badges use the 12px label role. Metric numerals use the metric role at wider widths and reduce to 1.65rem below the small breakpoint. Assistant prose uses 1.7 line height, increasing to 1.75 in containers at least 540px wide. Graph account IDs are 16px semibold, role labels 13px/18px and supplemental boundary/seed text 11px/16px.

**The Record First Rule.** Account IDs, amounts and evidence remain readable before decorative or summary content receives more space.

## Layout

The viewport contains a persistent application shell, a wrapping header at least 64px high, and an independently scrolling workspace. The standard desktop sidebar is 16rem wide and collapses to a 3rem icon rail; its state is restored from the `sidebar_state` cookie. At widths below 768px navigation uses an 18rem Sheet. Workspace padding is 16px, increasing to 28px at 1024px. Repeated content uses a 4px spacing rhythm, with 20px and 24px section gaps.

Overview metrics form two columns and expand to four at 1280px. At the same breakpoint the analytical overview uses a 1.45fr/1fr composition with a 340px minimum secondary column. Tables retain meaningful column widths and scroll within their containers. The header search wraps to a full row below 640px.

On wide investigation screens the evidence inspector occupies a 320px column. Hiding it keeps the component mounted so local working state survives. Narrow screens use a full-width Sheet capped at 440px. The graph uses 124px by 136px account cells and a 520px canvas from 640px upward; its narrow canvas is 410px high. Below 640px the default graph mode is the transfer table. The flow canvas remains available on demand.

The global assistant docks on the right at 460px wide from 768px upward. Expanded mode uses a Sheet up to 1,100px wide with 16px viewport insets; below 768px it fills the available viewport. Conversation history occupies a 240px side column in expanded desktop mode and replaces the message view in the dock or on mobile. The thread owns vertical scrolling; its composer stays in the footer with safe-area padding. Message content is capped at 46rem, with denser spacing in narrow containers.

## Elevation & Depth

Depth is primarily tonal and structural: white cards, a cool canvas, fine boundaries and lightly tinted supporting states. Cards use a one-pixel border-colored ring. Active segmented tabs have the small library shadow; Sheets use the larger library shadow and a 10% black backdrop. The assistant dock has a diffuse shadow (`0 16px 64px -16px #27272440`) to distinguish it from the workspace beneath. Focus uses the dark-green ring, generally 3px at 50% opacity on form controls.

**The Quiet Surface Rule.** Use restrained surface separation; reserve lifted overlays for actual temporary interaction layers.

A single workspace entrance uses 180ms with the source ease-out curve and a 6px upward settling motion. Sidebar movement uses 200ms linear transitions; tab state color transitions use 160ms, standard button state changes 150ms, assistant button and table row feedback 140ms, Sheets 200ms and their backdrop 150ms. User-triggered graph camera changes interpolate over 200ms. Reduced motion suppresses these movements and transitions. There is no looping decorative animation.

## Shapes

Controls use rounded corners from the radius scale above. The source base radius is 1rem; medium corners are 0.8rem and card corners 1.4rem. Header buttons use fully rounded pills; small button variants cap their radius at 10px or 12px. Badges use the large 2.6rem radius to form compact pills. Cards and graph containers have continuous rounded boundaries. Selected account glyphs are 68px in diameter and neighboring glyphs 54px, each with a two-pixel boundary. Observation-boundary accounts use dashed circles as well as text.

## Components

### Buttons and fields

Base UI action buttons have 40px default height, 15px medium-weight text, 16px horizontal padding and a 16px corner radius. Small buttons are 36px and large buttons 44px high. Coarse pointers receive a minimum 44px action-button target. Bright green fills identify primary actions; outline and ghost variants support contextual actions. Default hover reduces the green fill to 80%; outline and ghost hover use the muted surface. Keyboard focus uses the dark-green border and ring. Disabled controls lower opacity and stop pointer interaction. Pointer press uses a subtle scale treatment only for fine pointers; the library also supplies a one-pixel press translation where appropriate.

Inputs are 32px high, transparent, softly bordered and rounded like buttons. Their text is 16px on narrow screens and 14px from 768px; placeholders use the muted foreground. Focus uses the same dark-green ring, and invalid state uses destructive red. Labels stay programmatically associated even where the compact layout visually hides them.

### Navigation and tabs

The white sidebar retains the standard Base UI geometry: 32px navigation rows, 8px padding and 14px labels. Active and hovered rows use charcoal and white; the active destination also has a filled icon. The dedicated assistant row uses an outline treatment; the header's assistant action uses green. The brand row is 48px high and pairs the generated A mark with a product wordmark. The sidebar contains the assistant and workspace destinations without a footer; collapse remains available through the header trigger and sidebar rail. Segmented tabs sit on a muted track; the active tab takes the background surface and small shadow. The line variant uses an underline instead.

### Cards, records and badges

Cards are white and ringed, with 16px default internal spacing and a 12px compact variant. Several overview cards explicitly use 20px horizontal padding. Card footers stay transparent. Tables use muted 13px medium headers, 15px records, 12px vertical cell padding and tabular, right-aligned quantities. Badges are compact 20px pills; secondary badges use the pale secondary surface and its foreground. Metric hierarchy is label, large figure and concise supporting context.

### Transfer neighborhoods

Circular glyphs encode role hypotheses with Phosphor symbols. The selected account has a dark filled circle, other accounts white interiors and subdued role or community strokes. Account IDs, roles and boundary/seed status sit below each glyph. Curved directed paths retain return transfers and self-transfers. Incoming, outgoing and related paths have distinct subdued strokes; labels show recorded amounts. Controls expose fit, center, zoom, flow/table mode and export using the same button system.

### Evidence and assistant

The evidence inspector separates observed facts, role hypotheses and missing evidence. Its collapsible desktop panel and mobile Sheet preserve working context. Contextual ask actions open the global assistant with the account and comparison scope; they do not embed a separate conversation in the inspector.

The header's “Ask Aqsha” action, sidebar entry and Cmd/Ctrl+J shortcut open the same assistant workspace. Its persistent runtime owns conversations, drafts and branches while presentation changes between closed, docked and expanded. The visible scope identifies the conversation's account even after the workspace selection changes. History supports search, new conversation, rename and confirmed deletion; the conversation menu exports JSON. Questions support edit and resend; answers support copy, retry and branch navigation.

The assistant uses a white message canvas and muted composer. Markdown inherits dashboard colors, uses restrained code backgrounds and thin quotation/table borders, and wraps long content. Completed replies expose collapsible evidence references, evidence checks, limitations and execution details. Account references navigate back to the workspace. Request-level working and stop controls reflect the actual request; completed tool traces are not presented as live execution. Mode labels distinguish AI, local summaries and fallback. Visible chats last until refresh; bounded server context has its own expiry and deletion behavior, documented in [architecture.md](docs/architecture.md).

### Identity asset

`web/public/brand/aqsha-freedom-mark.png` is the generated abstract A mark with a charcoal structure and lime/deep-green flow band on transparency. Its exact generation prompt is embedded in PNG metadata; tool, date, original image path and usage are recorded in the adjacent `aqsha-freedom-mark.provenance.json`. Preserve both. It is an original Aqsha Lens identity, not the Freedom Finance logo. The asset appears in the sidebar and assistant and is an identity accent, not a template for decorative illustrations.

## Do's and Don'ts

### Do

- Do use the semantic colors and self-hosted Inter defined above.
- Do preserve readable account IDs, amounts and explicit evidence labels.
- Do pair chart and graph colors with text, icons or boundary line styles.
- Do keep sidebar and evidence panels collapsible and preserve their working state.
- Do keep assistant access global, conversation scope visible and response modes explicit.
- Do respect reduced motion and keep movement tied to navigation or control state.
- Do retain the generated mark’s embedded prompt and provenance file when shipping it.

### Don't

- Don't reintroduce navy/cobalt chrome, bright multicolor surfaces or decorative icon tiles.
- Don't invent trend indicators, live-transfer animation, people, institutions or avatars to decorate the data.
- Don't use color or a score to imply probability of crime or an established final beneficiary at the observation boundary.
- Don't promote the dormant dark-theme scaffold into a supported visual world without a separate review.
