import type { ComponentType, ReactNode } from "react";
import {
  ArrowsLeftRightIcon,
  CurrencyKztIcon,
  GraphIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import type { Cluster, Summary, SummaryActivity } from "@/api";
import { communityColor, dateLabel, exactMoney, money, number } from "@/api";
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
import { Skeleton } from "@/components/ui/skeleton";

const activityConfig = {
  n_tx: { label: "Transfers", color: "var(--chart-2)" },
  sum_kzt: { label: "Turnover", color: "var(--chart-1)" },
} satisfies ChartConfig;
const seedConfig = {
  seeds: { label: "Seed accounts", color: "var(--chart-1)" },
  other: { label: "Other entities", color: "var(--border)" },
} satisfies ChartConfig;
const communityConfig = {
  n_nodes: { label: "Entities", color: "var(--chart-1)" },
} satisfies ChartConfig;

function MetricCard({
  label,
  value,
  exact,
  note,
  icon: Icon,
  children,
  footer,
}: {
  label: string;
  value: string;
  exact?: string;
  note: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Card className="metric-card min-w-0 gap-3" aria-label={`${label}: ${exact ?? value}`}>
      <CardHeader className="px-4">
        <CardTitle>{label}</CardTitle>
        <CardAction>
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-4">
        <p
          className="text-[1.65rem] font-semibold leading-tight tracking-tight tabular-nums sm:text-[2rem]"
          title={exact}
          aria-label={exact}
        >
          {value}
        </p>
        <CardDescription className="metric-scope min-h-10 text-xs leading-5 sm:min-h-5">
          {note}
        </CardDescription>
        <div className="mt-2 h-14 min-w-0 sm:h-[76px]">{children}</div>
      </CardContent>
      <CardFooter className="mt-auto min-h-10 justify-between gap-2 px-4 py-2 text-[13px] text-muted-foreground">
        {footer}
      </CardFooter>
    </Card>
  );
}

function ActivityChart({
  activity,
  amount = false,
}: {
  activity: SummaryActivity[];
  amount?: boolean;
}) {
  if (!activity.length) {
    return (
      <p className="flex h-full items-center text-xs text-muted-foreground">
        No recorded transfers
      </p>
    );
  }
  const tooltip = (
    <ChartTooltip
      isAnimationActive={false}
      cursor={amount ? { stroke: "var(--border)" } : false}
      content={
        <ChartTooltipContent
          labelFormatter={(_label, payload) => {
            const bucket = payload[0]?.payload as SummaryActivity | undefined;
            if (!bucket) return "";
            return bucket.start === bucket.end
              ? dateLabel(bucket.start, true)
              : `${dateLabel(bucket.start)} – ${dateLabel(bucket.end, true)}`;
          }}
          formatter={(value) => (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                {amount ? "Turnover" : "Transfers"}
              </span>
              <span className="font-medium tabular-nums">
                {amount ? exactMoney(Number(value)) : number(Number(value))}
              </span>
            </div>
          )}
        />
      }
    />
  );
  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 4" />
      <XAxis dataKey="start" hide />
      <YAxis hide domain={[0, "auto"]} tickCount={3} />
    </>
  );
  return (
    <ChartContainer
      config={activityConfig}
      role="group"
      className="h-full w-full aspect-auto"
      aria-label={
        amount ? "Recorded turnover over time" : "Recorded transfers over time"
      }
    >
      {amount ? (
        <AreaChart
          data={activity}
          accessibilityLayer
          margin={{ top: 5, right: 2, bottom: 1, left: 2 }}
        >
          {axes}
          {tooltip}
          <Area
            dataKey="sum_kzt"
            type="linear"
            fill="var(--color-sum_kzt)"
            fillOpacity={0.1}
            stroke="var(--color-sum_kzt)"
            strokeWidth={2}
            dot={activity.length === 1 ? { r: 3 } : false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <BarChart
          data={activity}
          accessibilityLayer
          margin={{ top: 5, right: 0, bottom: 1, left: 0 }}
          barCategoryGap="24%"
        >
          {axes}
          {tooltip}
          <Bar
            dataKey="n_tx"
            fill="var(--color-n_tx)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      )}
    </ChartContainer>
  );
}

function ActivityPeriod({ activity }: { activity: SummaryActivity[] }) {
  if (!activity.length) return <span>No activity period</span>;
  const daily = activity.every((bucket) => bucket.start === bucket.end);
  return (
    <>
      <span>{daily ? "Daily" : "Grouped"}</span>
      <span className="text-right tabular-nums">
        {dateLabel(activity[0].start)} – {dateLabel(activity.at(-1)!.end)}
      </span>
    </>
  );
}

export function OverviewMetrics({
  summary,
  communities,
  communitiesLoading,
  communitiesError,
}: {
  summary: Summary;
  communities: Cluster[];
  communitiesLoading: boolean;
  communitiesError: string;
}) {
  const activity = summary.activity ?? [];
  const { nodes, seeds } = summary.counts;
  const seedShare = nodes ? (seeds / nodes) * 100 : 0;
  const largest = communities.slice(0, 12);

  return (
    <section
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      aria-label="Dataset metrics"
    >
      <MetricCard
        label="Entities"
        value={number(nodes)}
        note="Across the observed network"
        icon={UsersThreeIcon}
        footer={
          <>
            <span>Seeds</span>
            <strong className="shrink-0 whitespace-nowrap font-medium text-foreground tabular-nums">
              {number(seeds)} / {number(nodes)}
            </strong>
          </>
        }
      >
        <div className="flex h-full flex-col justify-center gap-1">
          <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
            <span>Seed share</span>
            <span className="font-medium text-foreground tabular-nums">
              {seedShare.toFixed(1)}%
            </span>
          </div>
          {nodes ? (
            <ChartContainer
              config={seedConfig}
              role="group"
              className="h-7 w-full aspect-auto"
              aria-label={`${number(seeds)} seed accounts and ${number(nodes - seeds)} other entities`}
            >
              <BarChart
                data={[{ label: "Entities", seeds, other: nodes - seeds }]}
                layout="vertical"
                accessibilityLayer
                margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
              >
                <XAxis type="number" hide domain={[0, nodes]} />
                <YAxis type="category" dataKey="label" hide />
                <ChartTooltip
                  cursor={false}
                  isAnimationActive={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="seeds"
                  stackId="entities"
                  fill="var(--color-seeds)"
                  radius={seeds === nodes ? 4 : [4, 0, 0, 4]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="other"
                  stackId="entities"
                  fill="var(--color-other)"
                  radius={seeds === 0 ? 4 : [0, 4, 4, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-1 text-xs text-muted-foreground">
              No entities loaded
            </p>
          )}
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span>Seeds</span>
            <span>Other entities</span>
          </div>
        </div>
      </MetricCard>

      <MetricCard
        label="Transfers"
        value={number(summary.counts.transactions)}
        note={`${number(summary.counts.edges)} directed relationships`}
        icon={ArrowsLeftRightIcon}
        footer={<ActivityPeriod activity={activity} />}
      >
        <ActivityChart activity={activity} />
      </MetricCard>

      <MetricCard
        label="Turnover"
        value={money(summary.total_kzt)}
        exact={exactMoney(summary.total_kzt)}
        note="Recorded amount · KZT"
        icon={CurrencyKztIcon}
        footer={<ActivityPeriod activity={activity} />}
      >
        <ActivityChart activity={activity} amount />
      </MetricCard>

      <MetricCard
        label="Communities"
        value={number(summary.counts.clusters)}
        note={`${number(summary.counts.components)} connected components`}
        icon={GraphIcon}
        footer={
          <>
            <span>Entities per group</span>
            <span className="shrink-0 whitespace-nowrap tabular-nums">
              {!communitiesLoading && !communitiesError && largest.length
                ? `${largest.length} / ${number(summary.counts.clusters)}`
                : "—"}
            </span>
          </>
        }
      >
        {communitiesLoading ? (
          <Skeleton
            className="h-full w-full"
            aria-label="Loading community sizes"
          />
        ) : communitiesError ? (
          <p className="flex h-full items-center text-xs text-muted-foreground">
            Community sizes unavailable
          </p>
        ) : largest.length ? (
          <ChartContainer
            config={communityConfig}
            role="group"
            className="h-full w-full aspect-auto"
            aria-label={`Sizes of the ${largest.length} largest communities, largest first`}
          >
            <BarChart
              data={largest}
              accessibilityLayer
              margin={{ top: 5, right: 0, bottom: 1, left: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis dataKey="cluster_id" hide />
              <YAxis hide domain={[0, "auto"]} tickCount={3} />
              <ChartTooltip
                cursor={false}
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_value, payload) =>
                      `Community ${payload[0]?.payload.cluster_id ?? ""}`
                    }
                    formatter={(value) => (
                      <span className="tabular-nums">
                        {number(Number(value))} entities
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="n_nodes"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {largest.map((community) => (
                  <Cell
                    key={community.cluster_id}
                    fill={communityColor(community.cluster_id)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="flex h-full items-center text-xs text-muted-foreground">
            No communities detected
          </p>
        )}
      </MetricCard>
    </section>
  );
}
