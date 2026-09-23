import {
  ActivityIcon,
  ChartPieSliceIcon,
  DatabaseIcon,
  FileTextIcon,
  GitBranchIcon,
  GraphIcon,
  ShieldCheckIcon,
  SidebarSimpleIcon,
  SquaresFourIcon,
  TableIcon,
} from "@phosphor-icons/react";
import type { Summary } from "@/api";
import { number } from "@/api";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export type WorkspaceView =
  | "overview"
  | "network"
  | "entities"
  | "communities"
  | "signals"
  | "resilience";
export const workspaceViews = [
  { id: "overview", label: "Overview", icon: ChartPieSliceIcon },
  { id: "network", label: "Investigation", icon: GraphIcon },
  { id: "entities", label: "Entities", icon: TableIcon },
  { id: "communities", label: "Communities", icon: SquaresFourIcon },
  { id: "signals", label: "Signals", icon: ActivityIcon },
  { id: "resilience", label: "Resilience", icon: GitBranchIcon },
] as const;

export function AppSidebar({
  view,
  onView,
  summary,
}: {
  view: WorkspaceView;
  onView: (view: WorkspaceView) => void;
  summary: Summary | null;
}) {
  const { isMobile, setOpenMobile, toggleSidebar, open } = useSidebar();
  function navigate(next: WorkspaceView) {
    onView(next);
    if (isMobile) setOpenMobile(false);
  }
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("overview")}
              tooltip="Aqsha Lens"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card">
                <img
                  src="/brand/aqsha-lens-mark.png"
                  alt=""
                  className="size-8 object-contain"
                />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-semibold tracking-tight">
                  Aqsha Lens
                </span>
                <span className="text-xs text-sidebar-foreground/60">
                  Investigation workspace
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceViews.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={view === item.id}
                    tooltip={item.label}
                    onClick={() => navigate(item.id)}
                    aria-current={view === item.id ? "page" : undefined}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.id === "entities" && summary && (
                    <SidebarMenuBadge>
                      {number(summary.counts.nodes)}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Exports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/api/exports/nodes_roles.csv" download />}
                  tooltip="Download role assignments"
                >
                  <FileTextIcon />
                  <span>Role assignments</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <a href="/api/provenance" download="audit-receipt.json" />
                  }
                  tooltip="Download audit receipt"
                >
                  <ShieldCheckIcon />
                  <span>Audit receipt</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={summary?.dataset.name ?? "Loading dataset"}
              onClick={() => navigate("entities")}
            >
              <DatabaseIcon />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate">Freedom Finance</span>
                <Badge variant="secondary">
                  {summary?.dataset.kind === "official"
                    ? "Official dataset"
                    : summary
                      ? "Synthetic demo"
                      : "Connecting"}
                </Badge>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={open ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            >
              <SidebarSimpleIcon />
              <span>Collapse sidebar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
