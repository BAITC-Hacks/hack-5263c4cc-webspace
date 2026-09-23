import { useMemo } from "react";
import {
  ArrowRightIcon,
  CaretDownIcon,
  CaretRightIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { Cluster, Summary } from "@/api";
import {
  compact,
  communityColor,
  exactMoney,
  money,
  number,
  roleColor,
  roleLabel,
  score,
} from "@/api";
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Failure, Pending } from "@/components/AsyncState";
import { AskEvidenceAction } from "@/AssistantWorkspace";
import { OverviewMetrics } from "@/components/OverviewMetrics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  summary: Summary | null;
  clusters: Cluster[];
  clustersLoading: boolean;
  clustersError: string;
  retry: () => void;
  onSelect: (gid: number) => void;
  onCommunity: (id: number) => void;
  onInvestigate: () => void;
}

const communityConfig = {
  n_nodes: { label: "Entities", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface CommunityBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Cluster;
}

function CommunityBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  onSelect,
}: CommunityBarProps & { onSelect: (id: number) => void }) {
  if (!payload) return null;
  const label = `Explore community ${payload.cluster_id}: ${number(payload.n_nodes)} entities, ${number(payload.n_seed)} seeds, ${exactMoney(payload.sum_kzt_internal)} internal turnover`;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer outline-none focus-visible:[&_rect]:stroke-foreground focus-visible:[&_rect]:stroke-2"
      onClick={() => onSelect(payload.cluster_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(payload.cluster_id);
        }
      }}
    >
      <title>{label}</title>
      <rect
        x={x}
        y={y}
        width={Math.max(0, width)}
        height={height}
        rx={3}
        fill={communityColor(payload.cluster_id)}
      />
    </g>
  );
}

export default function Overview({
  summary,
  clusters,
  clustersLoading,
  clustersError,
  retry,
  onSelect,
  onCommunity,
  onInvestigate,
}: Props) {
  const communities = useMemo(
    () =>
      [...clusters].sort(
        (a, b) => b.n_nodes - a.n_nodes || a.cluster_id - b.cluster_id,
      ),
    [clusters],
  );
  const largestCommunities = useMemo(
    () =>
      communities.slice(0, 6).map((cluster) => ({
        ...cluster,
        label: `Community ${cluster.cluster_id}`,
      })),
    [communities],
  );
  const roles = useMemo(
    () =>
      Object.entries(summary?.role_counts ?? {})
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([role, count]) => ({
          role,
          label: roleLabel(role),
          count,
          fill: roleColor(role),
        })),
    [summary?.role_counts],
  );
  const roleConfig = useMemo<ChartConfig>(
    () => ({
      count: { label: "Entities" },
      ...Object.fromEntries(
        roles.map((role) => [
          role.role,
          { label: role.label, color: role.fill },
        ]),
      ),
    }),
    [roles],
  );
  const roleTotal = roles.reduce((total, role) => total + role.count, 0);

  if (!summary) return <OverviewSkeleton />;

  const coverage = [
    {
      label: "Seed accounts",
      count: summary.counts.seeds,
      note: "Supplied starting points",
    },
    {
      label: "Depth-four boundaries",
      count: summary.counts.boundary_nodes,
      note: "Unseen outflow remains unknown",
    },
    {
      label: "Isolated entities",
      count: summary.counts.isolated_nodes,
      note: "Retained without recorded transfers",
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <OverviewMetrics
        summary={summary}
        communities={communities}
        communitiesLoading={clustersLoading}
        communitiesError={clustersError}
      />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <Card className="min-w-0 gap-2">
          <CardHeader className="px-5">
            <CardTitle>Community distribution</CardTitle>
            <CardDescription>Entities per community</CardDescription>
            <CardAction>
              <Badge variant="outline">
                {number(summary.counts.clusters)} groups
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="px-4">
            {clustersError ? (
              <div className="flex min-h-[260px] items-center">
                <Failure message={clustersError} retry={retry} />
              </div>
            ) : clustersLoading ? (
              <Pending label="Loading community distribution" />
            ) : communities.length ? (
              <ChartContainer
                config={communityConfig}
                className="h-[260px] w-full"
                aria-label={`The ${largestCommunities.length} largest communities by entity count. Select a bar to inspect its accounts; the complete table is below.`}
              >
                <BarChart
                  data={largestCommunities}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ top: 16, right: 36, bottom: 0, left: 0 }}
                  barSize={20}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickCount={4}
                    tickFormatter={(value) => compact(Number(value))}
                    fontSize={13}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    interval={0}
                    fontSize={13}
                  />
                  <ChartTooltip
                    isAnimationActive={false}
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(_value, _name, item) => {
                          const cluster = item.payload as Cluster;
                          return (
                            <div className="space-y-2 py-1 text-xs">
                              <strong className="font-medium">
                                Community {cluster.cluster_id}
                              </strong>
                              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
                                <dt className="text-muted-foreground">
                                  Entities
                                </dt>
                                <dd className="text-right tabular-nums">
                                  {number(cluster.n_nodes)}
                                </dd>
                                <dt className="text-muted-foreground">Seeds</dt>
                                <dd className="text-right tabular-nums">
                                  {number(cluster.n_seed)}
                                </dd>
                                <dt className="text-muted-foreground">
                                  Internal turnover
                                </dt>
                                <dd className="text-right tabular-nums">
                                  {exactMoney(cluster.sum_kzt_internal)}
                                </dd>
                              </dl>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="n_nodes"
                    name="Entities"
                    isAnimationActive={false}
                    shape={(props: unknown) => (
                      <CommunityBar
                        {...(props as CommunityBarProps)}
                        onSelect={onCommunity}
                      />
                    )}
                  >
                    <LabelList
                      dataKey="n_nodes"
                      position="right"
                      offset={8}
                      className="fill-foreground"
                      fontSize={13}
                      formatter={(value) => number(Number(value))}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <Empty className="min-h-[260px]">
                <EmptyHeader>
                  <EmptyTitle>No community data</EmptyTitle>
                  <EmptyDescription>
                    Reload the dataset to inspect its structural groups.
                  </EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" onClick={retry}>
                  Reload data
                </Button>
              </Empty>
            )}
          </CardContent>
          {!clustersLoading && !clustersError && communities.length > 0 && (
            <Collapsible className="border-t">
              <div className="flex flex-wrap items-center justify-between gap-1 px-5 pt-3">
                <p className="text-xs text-muted-foreground">
                  Showing {largestCommunities.length} of{" "}
                  {number(communities.length)} communities
                </p>
                <CollapsibleTrigger
                  render={
                    <Button variant="ghost" size="sm" className="group" />
                  }
                >
                  View all values
                  <CaretDownIcon
                    className="transition-transform group-aria-expanded:rotate-180"
                    data-icon="inline-end"
                  />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="px-5 pt-3">
                <div
                  className="max-h-72 overflow-auto rounded-md focus-visible:outline-2 focus-visible:outline-ring"
                  role="region"
                  aria-label="All community counts and turnover"
                  tabIndex={0}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Community</TableHead>
                        <TableHead className="text-right">Entities</TableHead>
                        <TableHead className="text-right">Seeds</TableHead>
                        <TableHead className="text-right">
                          Internal turnover
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communities.map((cluster) => (
                        <TableRow key={cluster.cluster_id}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCommunity(cluster.cluster_id)}
                            >
                              <span
                                className="size-2 rounded-sm"
                                style={{
                                  backgroundColor: communityColor(
                                    cluster.cluster_id,
                                  ),
                                }}
                                aria-hidden="true"
                              />
                              Community {cluster.cluster_id}
                              <CaretRightIcon data-icon="inline-end" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {number(cluster.n_nodes)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {number(cluster.n_seed)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {exactMoney(cluster.sum_kzt_internal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="pt-3 text-xs leading-5 text-muted-foreground">
                  Structural groups are not established organizations.
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>

        <Card className="min-w-0 gap-2">
          <CardHeader className="px-5">
            <CardTitle>Role composition</CardTitle>
            <CardDescription>
              Deterministic hypotheses across the network
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center px-5 py-3">
            {roleTotal > 0 ? (
              <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[140px_minmax(0,1fr)] xl:grid-cols-[124px_minmax(0,1fr)]">
                <div className="relative">
                  <ChartContainer
                    config={roleConfig}
                    className="aspect-square h-auto w-full"
                    aria-label={`Role distribution for ${number(roleTotal)} entities; exact counts are listed alongside.`}
                  >
                    <PieChart accessibilityLayer>
                      <Pie
                        data={roles.filter((role) => role.count > 0)}
                        dataKey="count"
                        nameKey="role"
                        innerRadius="72%"
                        outerRadius="98%"
                        stroke="var(--card)"
                        strokeWidth={3}
                        isAnimationActive={false}
                      >
                        {roles
                          .filter((role) => role.count > 0)
                          .map((role) => (
                            <Cell key={role.role} fill={role.fill} />
                          ))}
                      </Pie>
                      <ChartTooltip
                        isAnimationActive={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, _name, item) => (
                              <div className="flex items-center gap-4 py-1">
                                <span>{item.payload.label}</span>
                                <strong className="font-medium tabular-nums">
                                  {number(Number(value))}
                                </strong>
                              </div>
                            )}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                  <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                      {compact(roleTotal)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      entities
                    </span>
                  </div>
                </div>
                <dl
                  className="min-w-0 space-y-3 text-xs"
                  aria-label="Exact role counts"
                >
                  {roles.map((role) => (
                    <div
                      key={role.role}
                      className="flex items-center justify-between gap-2"
                    >
                      <dt className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: role.fill }}
                          aria-hidden="true"
                        />
                        <span className="leading-4 text-muted-foreground">
                          {role.label}
                        </span>
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {number(role.count)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <Empty className="min-h-[210px]">
                <EmptyHeader>
                  <EmptyTitle>No role assignments</EmptyTitle>
                  <EmptyDescription>
                    Role counts will appear when the dataset has observed
                    entities.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
          <CardFooter className="bg-transparent px-5 py-3">
            <p className="text-xs leading-5 text-muted-foreground">
              Role fit describes observed behavior, not a finding of wrongdoing.
            </p>
          </CardFooter>
        </Card>
      </div>

      <Card className="min-w-0 gap-3">
        <CardHeader className="px-5">
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            {summary.top_nodes.length
              ? `${Math.min(5, summary.top_nodes.length)} highest-priority entities in the observed network`
              : "Entities ordered by heuristic review priority"}
          </CardDescription>
          <CardAction className="flex flex-wrap gap-2 max-sm:col-start-1 max-sm:row-start-3 max-sm:justify-self-start">
            <AskEvidenceAction
              gid={summary.top_nodes[0]?.gid}
              prompt="Explain why this account leads the review queue and which evidence should be checked next."
              disabled={!summary.top_nodes.length}
            >
              Explain priority
            </AskEvidenceAction>
            <Button variant="outline" onClick={onInvestigate}>
              Investigate
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {summary.top_nodes.length ? (
            <div
              role="region"
              aria-label="Priority review queue; scroll horizontally for all columns"
              tabIndex={0}
              className="overflow-auto focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Table className="min-w-[660px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-5 text-xs text-muted-foreground">
                      Entity
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Role hypothesis
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Priority
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Inflow
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Outflow
                    </TableHead>
                    <TableHead className="pr-5">
                      <span className="sr-only">Inspect entity</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.top_nodes.slice(0, 5).map((node) => (
                    <TableRow key={node.gid}>
                      <TableCell className="py-2 pl-5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2.5 font-medium tabular-nums"
                          onClick={() => onSelect(node.gid)}
                          aria-label={`Inspect entity ${node.gid}`}
                        >
                          {node.gid}
                        </Button>
                        {node.is_seed && (
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            Seed
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: roleColor(node.role) }}
                            aria-hidden="true"
                          />
                          {roleLabel(node.role)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="font-medium">
                          {score(node.priority_score)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          / 100
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right tabular-nums"
                        title={exactMoney(node.in_kzt)}
                      >
                        <span aria-hidden="true">{money(node.in_kzt)}</span>
                        <span className="sr-only">
                          {exactMoney(node.in_kzt)}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right tabular-nums"
                        title={exactMoney(node.out_kzt)}
                      >
                        <span aria-hidden="true">{money(node.out_kzt)}</span>
                        <span className="sr-only">
                          {exactMoney(node.out_kzt)}
                        </span>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Open evidence for entity ${node.gid}`}
                          onClick={() => onSelect(node.gid)}
                        >
                          <CaretRightIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No entities to review</EmptyTitle>
                <EmptyDescription>
                  Load a dataset with observed entities to build a review queue.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
        <CardFooter className="bg-transparent px-5 py-3">
          <InfoIcon
            className="mr-2 size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Priority is a heuristic for review, never a probability of financial
            crime.
          </p>
        </CardFooter>
      </Card>

      <Card className="gap-3">
        <CardHeader className="px-5">
          <CardTitle>Observation coverage</CardTitle>
          <CardDescription>What the available data can show</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-3 sm:gap-6">
          {coverage.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 sm:block"
            >
              <div>
                <p className="text-sm">{row.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {row.note}
                </p>
              </div>
              <p className="shrink-0 text-lg font-medium tabular-nums sm:mt-3">
                {number(row.count)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {number(summary.counts.nodes)}
                </span>
              </p>
            </div>
          ))}
        </CardContent>
        <CardFooter className="bg-transparent px-5 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Coverage groups can overlap. Depth-four accounts are observation
            boundaries, not established final beneficiaries.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div
      className="flex flex-col gap-5"
      role="status"
      aria-label="Loading dataset overview"
    >
      <span className="sr-only">Loading dataset overview</span>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Card key={key}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-2 h-[76px] w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        {[0, 1].map((key) => (
          <Card key={key}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
