import { useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CaretDownIcon, ChartBarIcon, InfoIcon } from "@phosphor-icons/react";
import {
  compact,
  dateLabel,
  number,
  type NodeDetail,
  type TimelineDay,
} from "./api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const chartConfig = {
  incoming: { label: "Incoming", color: "var(--flow-incoming)" },
  outgoing: { label: "Outgoing", color: "var(--flow-outgoing)" },
} satisfies ChartConfig;

const DAY_MS = 86_400_000;
const MAX_CALENDAR_DAYS = 3660;
type Metric = "amount" | "count";
type WindowDays = "full" | 14 | 7;
type Period = { start: string | null; end: string | null };
type ChartDay = TimelineDay & {
  timestamp: number;
  recorded: boolean;
  incoming: number;
  outgoing: number;
};
const exactKzt = (value: number) =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} KZT`;

function dayTimestamp(value: string | null | undefined): number | undefined {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))
  )
    return undefined;
  const parsed = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Calendar bins use UTC date arithmetic, independent of local DST or today's date. */
export function DailyTimeline({
  node,
  period,
}: {
  node: NodeDetail;
  period?: Period;
}) {
  const [metric, setMetric] = useState<Metric>("amount");
  const [windowDays, setWindowDays] = useState<WindowDays>("full");
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const helpId = `${instanceId}-help`;
  const caveatId = `${instanceId}-caveat`;
  const timeline = useMemo(
    () => [...node.timeline].sort((a, b) => a.date.localeCompare(b.date)),
    [node.timeline],
  );
  const suppliedStart = dayTimestamp(period?.start);
  const suppliedEnd = dayTimestamp(period?.end);
  const hasDatasetPeriod =
    suppliedStart !== undefined &&
    suppliedEnd !== undefined &&
    suppliedStart <= suppliedEnd;
  const start = hasDatasetPeriod
    ? suppliedStart
    : dayTimestamp(timeline[0]?.date);
  const end = hasDatasetPeriod
    ? suppliedEnd
    : dayTimestamp(timeline.at(-1)?.date);
  const windowStart =
    start !== undefined && end !== undefined
      ? windowDays === "full"
        ? start
        : Math.max(start, end - (windowDays - 1) * DAY_MS)
      : undefined;
  const spanDays =
    windowStart !== undefined && end !== undefined
      ? Math.floor((end - windowStart) / DAY_MS) + 1
      : 0;
  const overLimit = spanDays > MAX_CALENDAR_DAYS;
  const days = useMemo<ChartDay[]>(() => {
    if (
      windowStart === undefined ||
      end === undefined ||
      spanDays < 1 ||
      overLimit
    )
      return [];
    const recorded = new Map(
      timeline.map((day) => [day.date.slice(0, 10), day]),
    );
    return Array.from({ length: spanDays }, (_, index) => {
      const timestamp = windowStart + index * DAY_MS;
      const date = new Date(timestamp).toISOString().slice(0, 10);
      const source = recorded.get(date);
      const day: TimelineDay = source ?? {
        date,
        in_kzt: 0,
        out_kzt: 0,
        in_tx: 0,
        out_tx: 0,
      };
      return {
        ...day,
        date,
        timestamp,
        recorded: !!source,
        incoming: metric === "amount" ? day.in_kzt : day.in_tx,
        outgoing: metric === "amount" ? day.out_kzt : day.out_tx,
      };
    });
  }, [timeline, windowStart, end, spanDays, overLimit, metric]);
  const activeDays = days.filter((day) => day.in_tx + day.out_tx > 0).length;
  const incoming = days.reduce((total, day) => total + day.incoming, 0);
  const outgoing = days.reduce((total, day) => total + day.outgoing, 0);
  const extentLabel = days.length
    ? `${dateLabel(days[0].date)} – ${dateLabel(days.at(-1)!.date, true)}`
    : "";
  const displayTotal = (value: number) =>
    metric === "amount"
      ? `${compact(value)} KZT`
      : `${number(value)} transfers`;

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId}>Daily transfer activity</CardTitle>
        <CardDescription>
          Entity {node.gid}
          {extentLabel && <> · {extentLabel}</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <FieldGroup className="sm:flex-row sm:items-end sm:justify-between">
          <Field className="sm:w-auto">
            <FieldLabel>Measure</FieldLabel>
            <ToggleGroup
              variant="outline"
              value={[metric]}
              onValueChange={(values) => {
                if (values[0] === "amount" || values[0] === "count")
                  setMetric(values[0]);
              }}
              aria-label="Chart measure"
            >
              <ToggleGroupItem value="amount">Amount</ToggleGroupItem>
              <ToggleGroupItem value="count">Transfers</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field className="sm:w-auto">
            <FieldLabel>Observation window</FieldLabel>
            <ToggleGroup
              variant="outline"
              value={[String(windowDays)]}
              onValueChange={(values) => {
                const next = values[0];
                if (next === "full") setWindowDays("full");
                else if (next === "7" || next === "14")
                  setWindowDays(Number(next) as 7 | 14);
              }}
              aria-label="Observation window"
            >
              <ToggleGroupItem
                value="full"
                title={
                  hasDatasetPeriod
                    ? "Entire dataset observation period"
                    : "All recorded account dates"
                }
              >
                Full window
              </ToggleGroupItem>
              <ToggleGroupItem
                value="14"
                disabled={!hasDatasetPeriod}
                title="Fourteen days ending at the dataset's final date"
              >
                14 days
              </ToggleGroupItem>
              <ToggleGroupItem
                value="7"
                disabled={!hasDatasetPeriod}
                title="Seven days ending at the dataset's final date"
              >
                7 days
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </FieldGroup>
        {days.length > 0 ? (
          <>
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-muted-foreground">
                Incoming{" "}
                <strong className="ml-1 font-medium text-foreground tabular-nums">
                  {displayTotal(incoming)}
                </strong>
              </span>
              <span className="text-muted-foreground">
                Outgoing{" "}
                <strong className="ml-1 font-medium text-foreground tabular-nums">
                  {displayTotal(outgoing)}
                </strong>
              </span>
              {activeDays === 0 && (
                <Badge variant="secondary">No recorded transfers</Badge>
              )}
            </div>
            <p className="sr-only" id={helpId}>
              Daily grouped bars show{" "}
              {metric === "amount" ? "amounts in KZT" : "transfer counts"}.
              Focus the chart and use left and right arrow keys to inspect
              dates. The daily values table provides the same evidence.
            </p>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart
                data={days}
                accessibilityLayer
                margin={{ top: 8, right: 8, left: 0, bottom: 2 }}
                barCategoryGap="26%"
                barGap={2}
                maxBarSize={24}
                aria-label={`Daily ${metric === "amount" ? "KZT amounts" : "transfer counts"} for entity ${node.gid}`}
                aria-describedby={`${helpId} ${caveatId}`}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => dateLabel(String(date))}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                  interval="preserveStartEnd"
                  tickMargin={10}
                  height={34}
                />
                <YAxis
                  width={metric === "amount" ? 56 : 38}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compact(Number(value))}
                  tickCount={4}
                  allowDecimals={metric === "amount"}
                  domain={[0, (maximum: number) => Math.max(1, maximum)]}
                />
                <ChartTooltip
                  isAnimationActive={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => dateLabel(String(label), true)}
                      formatter={(_value, name, item) => {
                        const day = item.payload as ChartDay;
                        const incomingSeries = item.dataKey === "incoming";
                        const amount = incomingSeries
                          ? day.in_kzt
                          : day.out_kzt;
                        const count = incomingSeries ? day.in_tx : day.out_tx;
                        return (
                          <div className="flex w-full flex-col gap-1 py-1 text-sm">
                            <div className="flex justify-between gap-6">
                              <span className="text-muted-foreground">
                                {String(name)}
                              </span>
                              <strong className="font-medium tabular-nums">
                                {exactKzt(amount)}
                              </strong>
                            </div>
                            <span className="text-muted-foreground">
                              {number(count)} recorded{" "}
                              {count === 1 ? "transfer" : "transfers"}
                            </span>
                            {!day.recorded && incomingSeries && (
                              <span className="text-muted-foreground">
                                No recorded transfers on this date.
                              </span>
                            )}
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="incoming"
                  name="Incoming"
                  fill="var(--color-incoming)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="outgoing"
                  name="Outgoing"
                  fill="var(--color-outgoing)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
            <Collapsible>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="font-medium text-foreground">
                    {number(activeDays)}
                  </strong>{" "}
                  active / {number(days.length)} calendar days
                </p>
                <CollapsibleTrigger render={<Button variant="outline" />}>
                  Daily values
                  <CaretDownIcon data-icon="inline-end" />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pt-4">
                <div
                  className="max-h-72 overflow-auto"
                  role="region"
                  aria-label="Daily transfer evidence"
                  tabIndex={0}
                >
                  <Table>
                    <TableCaption>
                      {extentLabel} · observed account transfers
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Incoming</TableHead>
                        <TableHead className="text-right">Outgoing</TableHead>
                        <TableHead className="text-right">In count</TableHead>
                        <TableHead className="text-right">Out count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {days.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>
                            {dateLabel(day.date)}
                            {!day.recorded && (
                              <span className="sr-only">
                                : no recorded transfers
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {exactKzt(day.in_kzt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {exactKzt(day.out_kzt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {number(day.in_tx)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {number(day.out_tx)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartBarIcon />
              </EmptyMedia>
              <EmptyTitle>
                {overLimit
                  ? "The full period exceeds the chart limit"
                  : "No dated transfers available"}
              </EmptyTitle>
              <EmptyDescription>
                {overLimit
                  ? "Choose the 7-day or 14-day window to inspect recent recorded activity."
                  : "An empty sample does not establish that this account was inactive."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
      <CardFooter>
        <Alert role="note">
          <InfoIcon />
          <AlertTitle>Daily observations only</AlertTitle>
          <AlertDescription id={caveatId}>
            {!hasDatasetPeriod && "Account observed span only. "}Calendar gaps
            mean no recorded transfers; omitted transfers remain unknown. Dates
            cannot establish intraday order.
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}
