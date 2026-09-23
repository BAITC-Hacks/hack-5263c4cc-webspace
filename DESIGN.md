---
name: "Aqsha Lens"
description: "A warm, factual workspace for inspecting recorded money flows."
colors:
  background: "#f7f7f5"
  foreground: "#272724"
  card: "#ffffff"
  card-foreground: "#272724"
  popover: "#ffffff"
  popover-foreground: "#272724"
  primary: "#30332f"
  primary-foreground: "#ffffff"
  secondary: "#efeee9"
  secondary-foreground: "#44443f"
  muted: "#f2f2ee"
  muted-foreground: "#6b6d65"
  accent: "#ecece7"
  accent-foreground: "#292b26"
  destructive: "#a63f39"
  border: "#e5e5de"
  input: "#ddded7"
  ring: "#a86542"
  chart-1: "#596d62"
  chart-2: "#b87d59"
  chart-3: "#788396"
  chart-4: "#9b8ca5"
  chart-5: "#b4a478"
  sidebar: "#f2f2ee"
  sidebar-foreground: "#5b5d56"
  sidebar-primary: "#30332f"
  sidebar-primary-foreground: "#ffffff"
  sidebar-accent: "#e5e5de"
  sidebar-accent-foreground: "#272724"
  sidebar-border: "#e0e1d9"
  sidebar-ring: "#a86542"
  brand: "#a86542"
  graph-ink: "#302d29"
  graph-incoming: "#61766d"
  graph-outgoing: "#a66b46"
  graph-related: "#b8b4ad"
  graph-surface: "#fbfaf8"
typography:
  headline:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.428571
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333333
  response:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.7
rounded:
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  4xl: "1.95rem"
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
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  input:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  navigation-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-accent-foreground}"
    rounded: "{rounded.md}"
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
    textColor: "{colors.primary-foreground}"
    width: "68px"
    height: "68px"
---

# Design System: Aqsha Lens

## Overview

**Creative North Star: "The Quiet Investigation Desk"**

Aqsha Lens uses warm white surfaces, graphite controls and restrained copper emphasis to make recorded transfers and supporting evidence easy to inspect. The interface is compact and factual, with familiar dashboard controls and enough separation for prolonged review.

The world is code-led: the user selected a complete Base UI/shadcn dashboard, Phosphor icons and assistant-ui, with Square UI Dashboard 4 as the composition reference. Mercury and Linear informed the neutral restraint. The user delegated this final direction after rejecting earlier green, monochrome and navy/cobalt versions; no approved image comp supersedes the implemented interface.

**Key Characteristics:**

- Quiet light navigation and white work surfaces.
- Compact factual cards, readable records and tabular numbers.
- Copper focus and selection accents; muted analytical color.
- Circular account glyphs and a collapsible evidence workspace.

This record is extracted from `web/src/styles.css`, the Base UI components, `App.tsx`, `Overview.tsx`, `NetworkGraph.tsx` and `assistant-panel.css`. The reviewed light-theme outputs are `artifacts/redesign-overview-desktop.png`, `artifacts/redesign-investigation-desktop.png`, `artifacts/redesign-overview-mobile.png` and `artifacts/redesign-investigation-mobile.png`.

## Colors

Warm neutral surfaces carry most of the interface. The YAML frontmatter is the normative color inventory and preserves the source CSS values.

### Primary

Graphite (`primary`) carries primary actions and selected controls. Muted copper (`brand` and `ring`) supplies the brand accent and keyboard focus; it is not a full-screen surface color.

### Neutral

Warm paper (`background`) sits behind white cards and popovers. Limestone (`muted` and `sidebar`) keeps navigation quiet; soft stone (`border` and `input`) separates controls. Graphite text (`foreground`) establishes hierarchy above the softer explanatory text (`muted-foreground`). Sidebar-specific foreground and border tokens preserve the quieter navigation treatment.

### Analytical and status colors

The five chart tokens provide muted sage, copper, slate, mauve and ochre series. They communicate categories, not decoration. Graph incoming, outgoing and related edges have their own subdued semantic colors. Destructive red is reserved for errors and destructive state.

**The Evidence Color Rule.** Color supports a labeled category or interaction state; it never carries a finding alone.

## Typography

**Display and body:** self-hosted Geist Variable, loaded through `@fontsource-variable/geist`, with the CSS sans-serif fallback. There is no separate display family. Monospaced account IDs in the graph use the existing utility mono stack; numerical quantities use tabular figures.

Page headings use the headline role. Card titles use the title role; compact cards reduce that to body size. Body text and standard controls use the body role; explanatory labels and table headings use the label role. Metric numerals use the metric role at wider widths and reduce to 1.65rem below the small breakpoint. Assistant prose keeps the same body size with the response line height. Graph account IDs are 16px semibold, role labels 13px/18px and supplemental boundary/seed text 11px/16px.

**The Record First Rule.** Account IDs, amounts and evidence remain readable before decorative or summary content receives more space.

## Layout

The viewport contains a persistent application shell, a compact wrapping header, and an independently scrolling workspace. The desktop sidebar is 14rem wide and can collapse; its state is restored from the `sidebar_state` cookie. At widths below 768px navigation uses a Sheet. Workspace padding is 16px, increasing to 28px at 1024px. Repeated content uses a 4px spacing rhythm, with 20px and 24px section gaps.

Overview metrics form two columns and expand to four at 1280px. At the same breakpoint the analytical overview uses a 1.45fr/1fr composition with a 340px minimum secondary column. Tables retain meaningful column widths and scroll within their containers. The header search wraps to a full row below 640px.

On wide investigation screens the evidence inspector occupies a 320px column. Hiding it keeps the component mounted so local working state survives. Narrow screens use a full-width Sheet capped at 440px. The graph uses 124px by 136px account cells and a 520px canvas from 640px upward; its narrow canvas is 410px high. Below 640px the default graph mode is the transfer table. The flow canvas remains available on demand.

## Elevation & Depth

Depth is primarily tonal and structural: white cards, warm background, fine boundaries and lightly tinted active states. Cards use a one-pixel foreground ring at 10% opacity. Active segmented tabs have the small library shadow; Sheets use the larger library shadow and a 10% black backdrop. These are supporting control layers, not decorative floating cards. Focus uses the copper ring, generally 3px at 50% opacity on form controls.

**The Quiet Surface Rule.** Use restrained surface separation; reserve lifted overlays for actual temporary interaction layers.

A single workspace entrance uses 180ms with the source ease-out curve and a 6px upward settling motion. Sidebar movement uses 200ms linear transitions; navigation and tab state color transitions use 160ms, table rows 140ms, Sheets 200ms and their backdrop 150ms. User-triggered graph camera changes interpolate over 200ms. Reduced motion suppresses these movements and transitions. There is no looping decorative animation.

## Shapes

Controls use gently rounded corners from the radius scale above. The source base radius is 0.75rem; medium corners are 0.6rem and card corners 1.05rem. Badges use the large 1.95rem radius to form compact pills. Cards and graph containers have continuous rounded boundaries; account nodes alone use full circles. Selected account glyphs are 68px in diameter and neighboring glyphs 54px, each with a two-pixel boundary. Observation-boundary accounts use dashed circles as well as text.

## Components

### Buttons and fields

Base UI buttons have compact 32px default height, medium weight and a 12px corner radius. Graphite fills identify primary actions; outline and ghost variants support contextual actions. Default hover reduces the graphite fill to 80%; outline and ghost hover use the muted surface. Keyboard focus uses the copper border and ring. Disabled controls lower opacity and stop pointer interaction. Pointer press uses a subtle scale treatment only for fine pointers; the library also supplies a one-pixel press translation where appropriate.

Inputs are 32px high, transparent, softly bordered and rounded like buttons. Their text is 16px on narrow screens and 14px from 768px; placeholders use the muted foreground. Focus uses the same copper ring, and invalid state uses destructive red. Labels stay programmatically associated even where the compact layout visually hides them.

### Navigation and tabs

The light sidebar combines regular Phosphor icons with readable text. Navigation rows have a minimum 38px height; the active row uses the deeper sidebar accent and medium weight. The brand appears as a small white-backed generated A mark with a product wordmark. Segmented tabs sit on a muted track; the active tab takes the background surface and small shadow. The line variant uses an underline instead.

### Cards, records and badges

Cards are white and ringed, with 16px default internal spacing and a 12px compact variant. Several overview cards explicitly use 20px horizontal padding. Card footers stay transparent. Tables use muted 12px medium headers and tabular, right-aligned quantities. Badges are compact 20px pills; secondary badges use the warm secondary surface and its foreground rather than bright fills.

### Transfer neighborhoods

Circular glyphs encode role hypotheses with Phosphor symbols. The selected account has a dark filled circle, other accounts white interiors and subdued role or community strokes. Account IDs, roles and boundary/seed status sit below each glyph. Curved directed paths retain return transfers and self-transfers. Incoming, outgoing and related paths have distinct subdued strokes; labels show recorded amounts. Controls expose fit, center, zoom, flow/table mode and export using the same button system.

### Evidence and assistant

The evidence inspector separates observed facts, role hypotheses and missing evidence. Its collapsible desktop panel and mobile Sheet preserve working context. The copilot uses assistant-ui within the same neutral surfaces; Markdown inherits dashboard colors, uses restrained code backgrounds and thin quotation/table borders, and wraps long content. It does not introduce a separate visual brand.

### Identity asset

`web/public/brand/aqsha-lens-mark.png` is the generated, text-free abstract A mark. Its exact generation prompt is embedded in PNG metadata; tool, date, original image path and usage are recorded in the adjacent `aqsha-lens-mark.provenance.json`. Preserve both. The asset is an identity accent, not a template for decorative illustrations.

## Do's and Don'ts

### Do

- Do use the semantic colors and self-hosted Geist defined above.
- Do preserve readable account IDs, amounts and explicit evidence labels.
- Do pair chart and graph colors with text, icons or boundary line styles.
- Do keep sidebar and evidence panels collapsible and preserve their working state.
- Do respect reduced motion and keep movement tied to navigation or control state.
- Do retain the generated mark’s embedded prompt and provenance file when shipping it.

### Don't

- Don't reintroduce navy/cobalt chrome, bright multicolor surfaces or decorative icon tiles.
- Don't invent trend indicators, live-transfer animation, people, institutions or avatars to decorate the data.
- Don't use color or a score to imply probability of crime or an established final beneficiary at the observation boundary.
- Don't promote the dormant dark-theme scaffold into a supported visual world without a separate review.
