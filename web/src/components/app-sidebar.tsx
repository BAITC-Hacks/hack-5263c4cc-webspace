import {
  ActivityIcon,
  ChartPieSliceIcon,
  ChatCircleTextIcon,
  GitBranchIcon,
  GraphIcon,
  SquaresFourIcon,
  TableIcon,
} from "@phosphor-icons/react";
import { useAssistantWorkspace } from "@/AssistantWorkspace";
import type { Summary } from "@/api";
import { number } from "@/api";
import {
  Sidebar,
  SidebarContent,
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
  const { isMobile, setOpenMobile } = useSidebar();
  const assistant = useAssistantWorkspace();
  function navigate(next: WorkspaceView) {
    onView(next);
    if (isMobile) setOpenMobile(false);
  }
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("overview")}
              tooltip="Aqsha Lens"
              aria-label="Aqsha Lens overview"
            >
              <span className="flex size-8 shrink-0 items-center justify-center">
                <img
                  src="/brand/aqsha-freedom-mark.png"
                  alt=""
                  className="size-8 object-contain"
                />
              </span>
              <span className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                Aqsha Lens
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  variant="outline"
                  tooltip="Aqsha assistant"
                  aria-label="Open assistant workspace"
                  aria-expanded={assistant.open}
                  aria-keyshortcuts="Control+j Meta+j"
                  onClick={() => {
                    assistant.openAssistant({ expanded: true });
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <ChatCircleTextIcon weight="fill" aria-hidden="true" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Aqsha assistant
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent role="navigation" aria-label="Main navigation">
            <SidebarMenu>
              {workspaceViews.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={view === item.id}
                    tooltip={item.label}
                    onClick={() => navigate(item.id)}
                    aria-label={item.label}
                    aria-current={view === item.id ? "page" : undefined}
                  >
                    <item.icon
                      weight={view === item.id ? "fill" : "regular"}
                      aria-hidden="true"
                    />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.label}
                    </span>
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
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
