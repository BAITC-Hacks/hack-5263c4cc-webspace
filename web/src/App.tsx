import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowsClockwiseIcon,
  ArrowElbowDownLeftIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  DatabaseIcon,
  FingerprintIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import type {
  Cluster,
  GraphData,
  NodeDetail,
  NodeSummary,
  Summary,
} from "@/api";
import {
  dateLabel,
  exactMoney,
  fetchApi,
  money,
  number,
  roleLabel,
  score,
} from "@/api";
import { AppSidebar, workspaceViews } from "@/components/app-sidebar";
import type { WorkspaceView } from "@/components/app-sidebar";
import { EntityRows, EntityTable } from "@/components/EntityTable";
import { EvidenceInspector } from "@/components/EvidenceInspector";
import { ExportMenu } from "@/components/ExportMenu";
import { Failure, NoResults, Pending } from "@/components/AsyncState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  AssistantTrigger,
  AssistantWorkspaceProvider,
} from "@/AssistantWorkspace";

const Overview = lazy(() => import("@/Overview"));
const NetworkGraph = lazy(() => import("@/NetworkGraph"));
const DailyTimeline = lazy(() =>
  import("@/DailyTimeline").then((module) => ({
    default: module.DailyTimeline,
  })),
);
const SignalsPanel = lazy(() =>
  import("@/SignalPanels").then((module) => ({ default: module.SignalsPanel })),
);
const ResiliencePanel = lazy(() =>
  import("@/SignalPanels").then((module) => ({
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

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<WorkspaceView>("overview");
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [clusterFilter, setClusterFilter] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [graphError, setGraphError] = useState("");
  const [hops, setHops] = useState(1);
  const [colorBy, setColorBy] = useState<"role" | "cluster">("role");
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clustersLoading, setClustersLoading] = useState(true);
  const [clustersError, setClustersError] = useState("");
  const [cohort, setCohort] = useState<number[]>([]);
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
  const refresh = () => setRevision((value) => value + 1);

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
  useEffect(() => {
    const controller = new AbortController();
    setSummaryError("");
    setClustersLoading(true);
    setClustersError("");
    fetchApi<Summary>("/summary", { signal: controller.signal })
      .then((value) => {
        setSummary(value);
        setSelected((current) => current ?? value.top_nodes[0]?.gid ?? null);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setSummaryError(error.message);
      });
    fetchApi<{ items: Cluster[] }>("/clusters", { signal: controller.signal })
      .then((value) => setClusters(value.items))
      .catch((error) => {
        if (!controller.signal.aborted) setClustersError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setClustersLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    setQueueLoading(true);
    setQueueError("");
    const parameters = new URLSearchParams({
      limit: String(pageSize),
      offset: String(page * pageSize),
    });
    if (search) parameters.set("query", search);
    if (role) parameters.set("role", role);
    if (clusterFilter !== null)
      parameters.set("cluster_id", String(clusterFilter));
    fetchApi<{ items: NodeSummary[]; total: number }>(`/nodes?${parameters}`, {
      signal: controller.signal,
    })
      .then((value) => {
        setNodes(value.items);
        setTotal(value.total);
        if (page > 0 && page * pageSize >= value.total) setPage(0);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setQueueError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQueueLoading(false);
      });
    return () => controller.abort();
  }, [search, role, clusterFilter, page, pageSize, revision]);
  useEffect(() => {
    if (selected === null) return;
    const controller = new AbortController();
    setDetail(null);
    setDetailError("");
    fetchApi<NodeDetail>(`/nodes/${selected}`, { signal: controller.signal })
      .then(setDetail)
      .catch((error) => {
        if (!controller.signal.aborted) setDetailError(error.message);
      });
    return () => controller.abort();
  }, [selected, revision]);
  useEffect(() => {
    if (selected === null) return;
    const controller = new AbortController();
    setGraph(null);
    setGraphError("");
    fetchApi<GraphData>(`/graph?gid=${selected}&hops=${hops}&limit=180`, {
      signal: controller.signal,
    })
      .then(setGraph)
      .catch((error) => {
        if (!controller.signal.aborted) setGraphError(error.message);
      });
    return () => controller.abort();
  }, [selected, hops, revision]);

  function selectNode(gid: number) {
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
    if (/^\d+$/.test(value) && Number.isSafeInteger(Number(value))) {
      setView("network");
      setSelected(Number(value));
      if (!wide) setSheetOpen(true);
    } else {
      setQuery(value);
      setPage(0);
      setView("entities");
    }
    setJump("");
  }
  const inspector = (
    <EvidenceInspector
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
  );
  const pageTitle =
    workspaceViews.find((item) => item.id === view)?.label ?? "Investigation";

  return (
    <AssistantWorkspaceProvider
      selected={selected}
      cohort={cohort}
      onOpen={() => setSheetOpen(false)}
      onSelect={(gid) => {
        selectNode(gid);
        setSheetOpen(false);
      }}
    >
      <SidebarProvider
        className="h-svh overflow-hidden"
        defaultOpen={
          !document.cookie.split("; ").includes("sidebar_state=false")
        }
      >
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to workspace
        </a>
        <AppSidebar view={view} onView={changeView} summary={summary} />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <header className="workspace-header flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2.5 lg:px-7">
            <SidebarTrigger title="Toggle sidebar" />
            <Separator orientation="vertical" className="h-5" />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Freedom Finance
            </span>
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
              <AssistantTrigger />
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
                  <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em]">
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
                      {wide && inspectorOpen
                        ? "Hide evidence"
                        : "Show evidence"}
                    </Button>
                  )}
                </div>
              </div>
              {summaryError && (
                <Failure message={summaryError} retry={refresh} />
              )}
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
                              ? "Display capped at 180 entities"
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
                          <DailyTimeline
                            node={detail}
                            period={summary?.period}
                          />
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
                      <ResiliencePanel onSelect={selectNode} />
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
    </AssistantWorkspaceProvider>
  );
}

function DatasetCoverage({ summary }: { summary: Summary | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <InfoIcon />
          <AlertTitle>Observation is incomplete</AlertTitle>
          <AlertDescription>
            Depth-four entities are collection boundaries. Unseen activity can
            change role and flow interpretations.
          </AlertDescription>
        </Alert>
        <Collapsible className="mt-4">
          <CollapsibleTrigger render={<Button variant="ghost" />}>
            Dataset limitations
            <CaretDownIcon data-icon="inline-end" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ul className="flex list-disc flex-col gap-3 pl-5 text-sm leading-relaxed text-muted-foreground">
              {summary?.limitations.map((limit, index) => (
                <li key={index}>{limit}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
      <CardFooter>
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline">{number(summary?.counts.seeds)} seeds</Badge>
          <Badge variant="outline">
            {number(summary?.counts.boundary_nodes)} boundary entities
          </Badge>
          <Badge variant="outline">
            {number(summary?.counts.isolated_nodes)} isolated entities retained
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}

function Communities({
  items,
  loading,
  error,
  onSelect,
  retry,
}: {
  items: Cluster[];
  loading: boolean;
  error: string;
  onSelect: (id: number) => void;
  retry: () => void;
}) {
  const [page, setPage] = useState(0);
  const perPage = 20;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(items.length / perPage) - 1),
  );
  const shown = items.slice(currentPage * perPage, (currentPage + 1) * perPage);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Network communities</CardTitle>
        <CardDescription>
          Structural groups in the observed network, not established
          organizations.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">
            <SquaresFourIcon />
            {number(items.length)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error ? (
          <Failure message={error} retry={retry} />
        ) : loading ? (
          <Pending label="Loading communities" />
        ) : shown.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Community</TableHead>
                <TableHead className="text-right">Entities</TableHead>
                <TableHead className="text-right">Seeds</TableHead>
                <TableHead className="text-right">Internal turnover</TableHead>
                <TableHead>Working hypothesis</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((cluster) => (
                <TableRow key={cluster.cluster_id}>
                  <TableCell>
                    <Button
                      variant="link"
                      onClick={() => onSelect(cluster.cluster_id)}
                    >
                      Community {cluster.cluster_id}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(cluster.n_nodes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(cluster.n_seed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(cluster.sum_kzt_internal)}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal leading-relaxed">
                    {cluster.hypothesis}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={() => onSelect(cluster.cluster_id)}
                    >
                      Explore
                      <CaretRightIcon data-icon="inline-end" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <NoResults
            title="No communities available"
            description="Load a validated dataset to inspect its structural groups."
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {items.length
            ? `${currentPage * perPage + 1}–${Math.min((currentPage + 1) * perPage, items.length)} of ${items.length} communities`
            : "No results"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={loading || currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            aria-label="Previous community page"
          >
            <CaretLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={loading || (currentPage + 1) * perPage >= items.length}
            onClick={() => setPage(currentPage + 1)}
            aria-label="Next community page"
          >
            <CaretRightIcon />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function EntityMetrics({ node }: { node: NodeDetail }) {
  const items = [
    {
      label: "Inflow",
      value: money(node.metrics.in_kzt),
      detail: `${number(node.metrics.in_tx)} transfers`,
      title: exactMoney(node.metrics.in_kzt),
    },
    {
      label: "Outflow",
      value: money(node.metrics.out_kzt),
      detail: `${number(node.metrics.out_tx)} transfers`,
      title: exactMoney(node.metrics.out_kzt),
    },
    {
      label: "Counterparties",
      value: `${node.metrics.in_degree} / ${node.metrics.out_degree}`,
      detail: "Incoming / outgoing",
      title: "Distinct counterparties by direction",
    },
    {
      label: "Review priority",
      value: `${score(node.priority_score)}`,
      detail: "of 100 · heuristic score",
      title: "Review priority, not probability of crime",
    },
  ];
  return (
    <Card className="shrink-0 py-0">
      <CardContent className="entity-metrics grid grid-cols-2 p-0 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 px-4 py-3.5 sm:px-5"
          >
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span
              className="text-2xl font-semibold tracking-tight tabular-nums"
              title={item.title}
            >
              {item.value}
            </span>
            <span className="text-xs text-muted-foreground">{item.detail}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
