export const roleColors: Record<string, string> = {
  consolidator: "#597466",
  transit: "#718797",
  distributor: "#a87a55",
  terminal: "#8c7e96",
  coordinator: "#42473f",
  peripheral: "#9b9f93",
  boundary_unknown: "#a86a48",
};
export const roleLabel = (role: string) =>
  role === "boundary_unknown"
    ? "Boundary unknown"
    : role.charAt(0).toUpperCase() + role.slice(1).replaceAll("_", " ");
export const roleColor = (role: string) => roleColors[role] ?? "#94a3b8";
export const number = (value: number | undefined) =>
  new Intl.NumberFormat("en-US").format(value ?? 0);
export const compact = (value: number | undefined) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
export const money = (value: number | undefined) => `${compact(value)} ₸`;
export const exactMoney = (value: number | undefined) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value ?? 0)} KZT`;
export const score = (value: number | undefined) =>
  Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
export const dateLabel = (date: string | null | undefined, year = false) =>
  date ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
  }) : "—";

// Shared categorical identity across overview and investigation views.
export const communityColors = [
  "#597466",
  "#7f8f80",
  "#b38763",
  "#8c7e96",
  "#718797",
  "#ac8483",
  "#8f9068",
  "#646b62",
];
export const communityColor = (id: number) =>
  communityColors[Math.abs(id) % communityColors.length];
