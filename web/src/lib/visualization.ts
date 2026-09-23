/** Semantic colors live in styles.css; labels remain the source of category identity. */
export const roleColors: Record<string, string> = {
  consolidator: "var(--role-consolidator)",
  transit: "var(--role-transit)",
  distributor: "var(--role-distributor)",
  terminal: "var(--role-terminal)",
  coordinator: "var(--role-coordinator)",
  peripheral: "var(--role-peripheral)",
  boundary_unknown: "var(--role-boundary)",
};

export const roleColor = (role: string) =>
  roleColors[role] ?? "var(--role-peripheral)";

export const communityColors = Array.from(
  { length: 8 },
  (_, index) => `var(--community-${index + 1})`,
);
export const communityColor = (id: number) =>
  communityColors[Math.abs(id) % communityColors.length];

export const graphColors = {
  ink: "var(--graph-ink)",
  incoming: "var(--flow-incoming)",
  outgoing: "var(--flow-outgoing)",
  related: "var(--flow-related)",
  surface: "var(--graph-surface)",
};

/** SVG marker IDs and Canvas exports need a resolved color, not a CSS var expression. */
export function resolveColor(color: string): string {
  if (!color.startsWith("var(--")) return color;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(color.slice(4, -1))
    .trim();
}
