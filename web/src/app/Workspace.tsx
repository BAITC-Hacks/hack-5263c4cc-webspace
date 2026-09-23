import {lazy, Suspense, useEffect, useRef, useState} from "react";
import type {CSSProperties, FormEvent} from "react";
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { ArrowElbowDownLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowElbowDownLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { DatabaseIcon } from '@phosphor-icons/react/dist/csr/Database';
import { FingerprintIcon } from '@phosphor-icons/react/dist/csr/Fingerprint';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import type {Summary} from "@/api";
import {dateLabel, number, roleLabel} from "@/api";
import {AppSidebar, workspaceViews} from "@/components/app-sidebar";
import type {WorkspaceView} from "@/components/app-sidebar";
import {EntityRows, EntityTable} from "@/features/investigation/EntityTable";
import {ExportMenu} from "@/shared/ui/ExportMenu";
import {Failure, NoResults, Pending} from "@/components/AsyncState";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";

import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {Separator} from "@/components/ui/separator";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";

import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {cn} from "@/lib/utils";

import type {Gid} from '@/shared/api/types';
import {isGid} from '@/shared/api/types';
import {useQueryClient} from '@tanstack/react-query';
import {useNodes} from '@/features/investigation/queries';
import {useNodeDetail} from '@/features/evidence/queries';
import {useGraph} from '@/features/graph/queries';
import {useClusters} from '@/features/communities/queries';
import {DatasetCoverage, EntityMetrics} from '@/features/overview/WorkspaceSummary';
import {Communities} from '@/features/communities/Communities';
const Overview = lazy(() => import("@/features/overview/Overview"));
const EvidenceInspector = lazy(() => import("@/features/evidence/EvidenceInspector").then(module => ({default: module.EvidenceInspector})));
const NetworkGraph = lazy(() => import("@/features/graph/NetworkGraph"));
const DailyTimeline = lazy(() =>
  import("@/features/evidence/DailyTimeline").then((module) => ({
    default: module.DailyTimeline,
  })),
);
const SignalsPanel = lazy(() =>
  import("@/features/signals/SignalsPanel").then((module) => ({ default: module.SignalsPanel })),
);
const ResiliencePanel = lazy(() =>
  import("@/features/resilience/ResiliencePanel").then((module) => ({
    default: module.ResiliencePanel,
  })),
);

function useWideInspector() {
  const [wide, setWide] = useState(
    () => window.matchMedia("(min-width: 1280px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setWide(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return wide;
}

export function Workspace({summary, summaryError = ""}: {summary: Summary; summaryError?: string}) {
  const client = useQueryClient();
  const analysisId = summary.analysis_id;
  const [view, setView] = useState<WorkspaceView>("overview");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [clusterFilter, setClusterFilter] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Gid | null>(summary.top_nodes[0]?.gid ?? null);
  const [hops, setHops] = useState(1);
  const [colorBy, setColorBy] = useState<"role" | "cluster">("role");
  const [cohort, setCohort] = useState<Gid[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [jump, setJump] = useState("");
  const jumpInput = useRef<HTMLInputElement>(null);
  const mainContent = useRef<HTMLElement>(null);
  useEffect(() => {
    mainContent.current?.scrollTo(0, 0);
  }, [view]);
  const wide = useWideInspector();
  const inspectorVisible = view === "network" || view === "signals";
  const refresh = () => { void client.invalidateQueries(); };
  const queue = useNodes(analysisId, {query: search, role: role || undefined, cluster_id: clusterFilter, limit: pageSize, offset: page * pageSize});
  const detailQuery = useNodeDetail(analysisId, selected);
  const graphQuery = useGraph(analysisId, selected, hops);
  const communityQuery = useClusters(analysisId);
  const nodes = queue.data?.items ?? [], total = queue.data?.total ?? 0;
  const queueLoading = queue.isPending, queueError = queue.error?.message ?? "";
  const detail = detailQuery.data ?? null, detailError = detailQuery.error?.message ?? "";
  const graph = graphQuery.data, graphError = graphQuery.error?.message ?? "";
  const clusters = communityQuery.data?.items ?? [];
  const clustersLoading = communityQuery.isPending, clustersError = communityQuery.error?.message ?? "";
  useEffect(() => { setPage(0); }, [search, role, clusterFilter, pageSize]);
  useEffect(() => { if (queue.data && page > 0 && page * pageSize >= total) setPage(0); }, [queue.data, page, pageSize, total]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query), 180);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(
          event.target instanceof HTMLElement &&
          (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
            event.target.isContentEditable)
        )
      ) {
        event.preventDefault();
        jumpInput.current?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, []);
  function selectNode(gid: Gid) {
    setSelected(gid);
    if (view !== "signals") setView("network");
    if (!wide) setSheetOpen(true);
  }
  function changeView(next: WorkspaceView) {
    setView(next);
    setSheetOpen(false);
  }
  function showCommunity(id: number) {
    setClusterFilter(id);
    setRole("");
    setQuery("");
    setPage(0);
    setView("entities");
    setSheetOpen(false);
  }
  function jumpToEntity(event: FormEvent) {
    event.preventDefault();
    const value = jump.trim();
    if (!value) return;
    if (isGid(value)) {
      setView("network");
      setSelected(value);
      if (!wide) setSheetOpen(true);
    } else {
      setQuery(value);
      setPage(0);
      setView("entities");
    }
    setJump("");
  }
  const inspector = (
    <Suspense fallback={<Pending label="Opening entity evidence" />}>
    <EvidenceInspector
      analysisId={analysisId}
      selected={selected}
      node={detail}
      error={detailError}
      cohort={cohort}
      onSelect={selectNode}
      onCommunity={showCommunity}
      onSignals={() => {
        setView("signals");
        setSheetOpen(false);
      }}
      retry={refresh}
    />
    </Suspense>
  );
  const pageTitle =
    workspaceViews.find((item) => item.id === view)?.label ?? "Investigation";

  return (
    <SidebarProvider
      className="h-svh overflow-hidden"
      defaultOpen={!document.cookie.split("; ").includes("sidebar_state=false")}
      style={{ "--sidebar-width": "14rem" } as CSSProperties}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to workspace
      </a>
      <AppSidebar view={view} onView={changeView} summary={summary} />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header className="workspace-header flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2.5 lg:px-7">
          <SidebarTrigger title="Toggle sidebar" />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-muted-foreground">Freedom Finance</span>
          <form
            onSubmit={jumpToEntity}
            className="order-last w-full sm:order-none sm:ml-auto sm:w-64"
          >
            <Field>
              <FieldLabel htmlFor="jump-entity" className="sr-only">
                Find entity by ID
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  ref={jumpInput}
                  id="jump-entity"
                  value={jump}
                  onChange={(event) => setJump(event.target.value)}
                  placeholder="Find an entity…"
                  inputMode="numeric"
                  maxLength={100}
                  aria-keyshortcuts="/"
                />
                <InputGroupAddon>
                  <MagnifyingGlassIcon />
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  <InputGroupButton type="submit" aria-label="Find entity">
                    <ArrowElbowDownLeftIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </form>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              aria-label="Reload dataset evidence"
            >
              <ArrowsClockwiseIcon />
            </Button>
            <ExportMenu selected={selected} />
          </div>
        </header>
        <section
          ref={mainContent}
          aria-label="Workspace content"
          id="main-content"
          className="workspace-enter min-h-0 min-w-0 flex-1 overflow-y-auto bg-background p-4 lg:p-7"
        >
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-[26px] font-semibold tracking-[-0.025em]">
                  {view === "network"
                    ? `Entity ${selected ?? "—"}`
                    : view === "overview"
                      ? "Overview"
                      : pageTitle}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {summary
                    ? `${dateLabel(summary.period.start)} – ${dateLabel(summary.period.end, true)} · ${number(summary.counts.nodes)} entities`
                    : "Loading the observation window…"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  <DatabaseIcon />
                  {summary?.dataset.kind === "official"
                    ? "Official dataset"
                    : summary
                      ? "Synthetic demo"
                      : "Connecting"}
                </Badge>
                {view === "network" && detail && (
                  <Badge variant="outline">{roleLabel(detail.role)}</Badge>
                )}
                {inspectorVisible && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      wide
                        ? setInspectorOpen((value) => !value)
                        : setSheetOpen(true)
                    }
                    disabled={selected === null}
                  >
                    <FingerprintIcon data-icon="inline-start" />
                    {wide && inspectorOpen ? "Hide evidence" : "Show evidence"}
                  </Button>
                )}
              </div>
            </div>
            {summaryError && <Failure message={summaryError} retry={refresh} />}
            {view === "network" && detail && <EntityMetrics node={detail} />}
            <div
              className={cn(
                "grid min-w-0 gap-6",
                inspectorVisible &&
                  inspectorOpen &&
                  "xl:grid-cols-[minmax(0,1fr)_320px]",
              )}
            >
              <div className="flex min-w-0 flex-col gap-6">
                {view === "overview" && (summary || !summaryError) && (
                  <Suspense fallback={<Pending label="Opening overview" />}>
                    <Overview
                      summary={summary}
                      clusters={clusters}
                      clustersLoading={clustersLoading}
                      clustersError={clustersError}
                      retry={refresh}
                      onSelect={selectNode}
                      onCommunity={showCommunity}
                      onInvestigate={() => changeView("network")}
                    />
                  </Suspense>
                )}
                {view === "network" && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Transaction network</CardTitle>
                        <CardDescription>
                          {selected !== null
                            ? `Entity ${selected} / ${graph ? `${number(graph.nodes.length)} entities and ${number(graph.edges.length)} relationships` : "Loading neighborhood"}`
                            : "Select an entity to start an investigation."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <FieldGroup className="flex-row flex-wrap gap-3">
                          <Field className="w-auto">
                            <FieldLabel className="sr-only">
                              Graph colors
                            </FieldLabel>
                            <ToggleGroup
                              variant="outline"
                              spacing={0}
                              value={[colorBy]}
                              onValueChange={(values) => {
                                if (
                                  values[0] === "role" ||
                                  values[0] === "cluster"
                                )
                                  setColorBy(values[0]);
                              }}
                              aria-label="Graph colors"
                            >
                              <ToggleGroupItem value="role">
                                Roles
                              </ToggleGroupItem>
                              <ToggleGroupItem value="cluster">
                                Communities
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </Field>
                          <Field className="w-auto">
                            <FieldLabel className="sr-only">
                              Neighborhood
                            </FieldLabel>
                            <ToggleGroup
                              variant="outline"
                              spacing={0}
                              value={[String(hops)]}
                              onValueChange={(values) => {
                                if (values[0]) setHops(Number(values[0]));
                              }}
                              aria-label="Graph hop distance"
                            >
                              {[1, 2, 3].map((value) => (
                                <ToggleGroupItem
                                  key={value}
                                  value={String(value)}
                                >
                                  {value} {value === 1 ? "hop" : "hops"}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </Field>
                        </FieldGroup>
                        <div className="min-w-0">
                          {selected === null && summary ? (
                            <NoResults
                              title="No entity selected"
                              description="Open an entity from the review queue to inspect its observed transfers."
                            />
                          ) : graphError ? (
                            <Failure message={graphError} retry={refresh} />
                          ) : graph ? (
                            <Suspense
                              fallback={
                                <Pending label="Opening directed graph" />
                              }
                            >
                              <NetworkGraph
                                data={graph}
                                onSelect={selectNode}
                                colorBy={colorBy}
                              />
                            </Suspense>
                          ) : (
                            <Pending label="Mapping observed transfers" />
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-wrap justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                          Recorded transfers only. Select a connection for
                          amounts.
                        </p>
                        <Badge variant="outline">
                          {graph?.truncated
                            ? `Showing ${graph.returned_nodes}/${graph.total_nodes} entities · ${graph.returned_edges}/${graph.total_edges} links`
                            : "Bounded neighborhood"}
                        </Badge>
                      </CardFooter>
                    </Card>
                    {detail && (
                      <Suspense
                        fallback={
                          <Card>
                            <CardContent>
                              <Pending label="Opening daily activity" />
                            </CardContent>
                          </Card>
                        }
                      >
                        <DailyTimeline node={detail} period={summary?.period} />
                      </Suspense>
                    )}
                    <Card>
                      <CardHeader>
                        <CardTitle>Priority review queue</CardTitle>
                        <CardDescription>
                          The twenty highest-priority entities in the observed
                          network.
                        </CardDescription>
                        <CardAction>
                          <Button
                            variant="outline"
                            onClick={() => setView("entities")}
                          >
                            View all
                            <CaretRightIcon data-icon="inline-end" />
                          </Button>
                        </CardAction>
                      </CardHeader>
                      <CardContent>
                        {summary ? (
                          <EntityRows
                            items={summary.top_nodes}
                            selected={selected}
                            onSelect={selectNode}
                            extended={false}
                          />
                        ) : (
                          <Pending label="Loading priorities" />
                        )}
                      </CardContent>
                      <CardFooter>
                        <p className="text-sm text-muted-foreground">
                          Priority supports human review. It is not a
                          probability of wrongdoing.
                        </p>
                      </CardFooter>
                    </Card>
                    <DatasetCoverage summary={summary} />
                  </>
                )}
                {view === "entities" && (
                  <EntityTable
                    items={nodes}
                    total={total}
                    selected={selected}
                    loading={queueLoading}
                    error={queueError}
                    query={query}
                    setQuery={setQuery}
                    role={role}
                    setRole={setRole}
                    roles={Object.keys(summary?.role_counts ?? {})}
                    cluster={clusterFilter}
                    clearCluster={() => setClusterFilter(null)}
                    page={page}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    onSelect={selectNode}
                    retry={refresh}
                  />
                )}
                {view === "communities" && (
                  <Communities
                    items={clusters}
                    loading={clustersLoading}
                    error={clustersError}
                    onSelect={showCommunity}
                    retry={refresh}
                  />
                )}
                {view === "signals" && (
                  <Suspense
                    fallback={<Pending label="Opening signal analysis" />}
                  >
                    <SignalsPanel
                      analysisId={analysisId}
                      gid={selected}
                      cohort={cohort}
                      setCohort={setCohort}
                      onSelect={selectNode}
                    />
                  </Suspense>
                )}
                {view === "resilience" && (
                  <Suspense
                    fallback={<Pending label="Opening resilience analysis" />}
                  >
                    <ResiliencePanel analysisId={analysisId} onSelect={selectNode} />
                  </Suspense>
                )}
              </div>
              {inspectorVisible && wide && (
                <aside
                  className={cn(
                    "sticky top-0 h-[calc(100svh-7rem)] min-h-[540px] max-h-[1000px] min-w-0 self-start",
                    !inspectorOpen && "hidden",
                  )}
                  aria-label="Selected entity evidence"
                >
                  {inspector}
                </aside>
              )}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Aqsha Lens · Freedom Finance · KZT</span>
              <span>
                {summary
                  ? `Analysis completed in ${number(Math.round(summary.runtime_ms))} ms`
                  : ""}
              </span>
            </footer>
          </div>
        </section>
      </SidebarInset>
      {!wide && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent keepMounted className="w-full! max-w-[440px]! gap-0">
            <SheetHeader>
              <SheetTitle>Entity investigation</SheetTitle>
              <SheetDescription>
                Observed evidence and scoped assistant
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 px-3 pb-3">{inspector}</div>
          </SheetContent>
        </Sheet>
      )}
    </SidebarProvider>
  );
}
