import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  CaretDownIcon,
  DownloadSimpleIcon,
  GraphIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  PulseIcon,
  ShieldCheckIcon,
  UsersIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import type {
  CollectorReport,
  Dossier,
  ResilienceMetrics,
  ResilienceReport,
  SignalReport,
} from "./api";
import {
  dateLabel,
  exactMoney,
  fetchApi,
  number,
  roleLabel,
  score,
} from "./api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AskEvidenceAction } from "@/AssistantWorkspace";

function State({
  error,
  loading,
  retry,
}: {
  error?: string;
  loading?: boolean;
  retry?: () => void;
}) {
  if (error)
    return (
      <Alert variant="destructive">
        <WarningCircleIcon />
        <AlertTitle>Evidence unavailable</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          {retry && (
            <Button variant="outline" onClick={retry}>
              <ArrowsClockwiseIcon data-icon="inline-start" />
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  if (loading)
    return (
      <div className="flex flex-col gap-4" role="status">
        <span className="sr-only">Loading bounded evidence</span>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  return null;
}

function Path({
  gids,
  onSelect,
}: {
  gids: number[];
  onSelect: (gid: number) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Directed transfer path"
    >
      {gids.map((gid, index) => (
        <span key={`${gid}-${index}`} className="flex items-center gap-2">
          {index > 0 && (
            <ArrowRightIcon
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <Button variant="outline" onClick={() => onSelect(gid)}>
            {gid}
          </Button>
        </span>
      ))}
    </div>
  );
}

function Caveat({ children }: { children: ReactNode }) {
  return (
    <Alert role="note">
      <InfoIcon />
      <AlertTitle>Interpretation limit</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function EvidenceEmpty({ children }: { children: ReactNode }) {
  return (
    <Empty className="py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MagnifyingGlassIcon />
        </EmptyMedia>
        <EmptyTitle>No matching evidence returned</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function EvidenceDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger render={<Button variant="ghost" />}>
        <span>{title}</span>
        <CaretDownIcon data-icon="inline-end" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function MeasuredValues({ values }: { values: Record<string, unknown> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Measure</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(values).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell>{key.replaceAll("_", " ")}</TableCell>
            <TableCell className="max-w-72 whitespace-normal text-right tabular-nums">
              {typeof value === "number"
                ? number(value)
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CohortPanel({
  selected,
  gids,
  setGids,
  onSelect,
}: {
  selected: number | null;
  gids: number[];
  setGids: (gids: number[]) => void;
  onSelect: (gid: number) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CollectorReport | null>(null);
  const [error, setError] = useState("");
  const [inputError, setInputError] = useState("");
  const [validating, setValidating] = useState(false);
  const validationRequest = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const inputId = useId();
  useEffect(() => {
    setValidating(false);
    return () => validationRequest.current?.abort();
  }, [gids]);
  useEffect(() => {
    setResult(null);
    setError("");
    if (!gids.length) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchApi<CollectorReport>(`/collectors?gids=${gids.join(",")}`, {
      signal: controller.signal,
    })
      .then(setResult)
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [gids, revision]);
  async function add(selectedGid?: number) {
    const tokens =
      selectedGid === undefined
        ? text
            .trim()
            .split(/[\s,;]+/)
            .filter(Boolean)
        : [String(selectedGid)];
    if (!tokens.length) return;
    if (
      tokens.some(
        (token) => !/^\d+$/.test(token) || !Number.isSafeInteger(Number(token)),
      )
    ) {
      setInputError("Enter whole-number entity IDs, separated by commas.");
      return;
    }
    const next = [...new Set([...gids, ...tokens.map(Number)])];
    if (next.length > 5) {
      setInputError("Choose up to five entities for this bounded comparison.");
      return;
    }
    validationRequest.current?.abort();
    const controller = new AbortController();
    validationRequest.current = controller;
    setValidating(true);
    setInputError("");
    try {
      await Promise.all(
        next
          .filter((gid) => !gids.includes(gid))
          .map((gid) =>
            fetchApi(`/nodes/${gid}`, { signal: controller.signal }),
          ),
      );
      if (!controller.signal.aborted) {
        setGids(next);
        setText("");
      }
    } catch (failure) {
      if (!controller.signal.aborted)
        setInputError(
          failure instanceof Error
            ? failure.message
            : "The selected accounts could not be verified. Try again.",
        );
    } finally {
      if (!controller.signal.aborted) setValidating(false);
    }
  }
  return (
    <Card id="compare-entities">
      <CardHeader>
        <CardTitle>Common collectors</CardTitle>
        <CardDescription>
          Find shared downstream recipients from up to five entities.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{gids.length} / 5</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!validating) void add();
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!inputError}>
              <FieldLabel htmlFor={inputId}>Entity IDs</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Input
                  id={inputId}
                  className="min-w-40 flex-1"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setInputError("");
                  }}
                  placeholder="IDs separated by commas"
                  inputMode="numeric"
                  maxLength={110}
                  disabled={validating}
                  aria-invalid={!!inputError}
                  aria-describedby={
                    inputError ? `${inputId}-error` : `${inputId}-help`
                  }
                />
                <Button
                  type="submit"
                  disabled={validating || !text.trim() || gids.length >= 5}
                >
                  {validating ? "Checking IDs…" : "Add IDs"}
                </Button>
              </div>
              <FieldDescription id={`${inputId}-help`}>
                Only existing accounts are accepted. Paths follow at most three
                directed steps.
              </FieldDescription>
              {inputError && (
                <FieldError id={`${inputId}-error`}>{inputError}</FieldError>
              )}
            </Field>
          </FieldGroup>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {gids.map((gid) => (
            <div className="flex items-center gap-1" key={gid}>
              <Button variant="secondary" onClick={() => onSelect(gid)}>
                {gid}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove entity ${gid} from comparison`}
                onClick={() => setGids(gids.filter((value) => value !== gid))}
              >
                <XIcon />
              </Button>
            </div>
          ))}
          {selected !== null && !gids.includes(selected) && gids.length < 5 && (
            <Button
              variant="outline"
              disabled={validating}
              onClick={() => void add(selected)}
            >
              Add selected {selected}
            </Button>
          )}
          {!!gids.length && (
            <Button
              variant="ghost"
              onClick={() => {
                setGids([]);
                setInputError("");
              }}
            >
              Clear selection
            </Button>
          )}
          {gids.length > 1 && (
            <AskEvidenceAction
              gid={selected ?? gids[0]}
              gids={gids}
              prompt="Find shared downstream collectors for the comparison accounts. Explain observed paths and missing evidence."
            >
              Explain shared collectors
            </AskEvidenceAction>
          )}
        </div>
        <State
          error={error}
          loading={loading}
          retry={() => setRevision((value) => value + 1)}
        />
        {!loading && !error && result && (
          <div className="flex flex-col gap-5">
            {result.items.map((item, index) => (
              <article className="flex flex-col gap-3" key={item.gid}>
                {index > 0 && <Separator />}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="link" onClick={() => onSelect(item.gid)}>
                    Entity {item.gid}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                  <Badge variant="outline">{roleLabel(item.role)}</Badge>
                  <Badge variant="secondary">
                    {item.matched_sources} / {gids.length} sources
                  </Badge>
                </div>
                {item.paths.map((path) => (
                  <Path
                    key={path.source_gid}
                    gids={path.path}
                    onSelect={onSelect}
                  />
                ))}
              </article>
            ))}
            {!result.items.length && (
              <EvidenceEmpty>
                No shared downstream recipient was found within three hops.
                Longer or unobserved routes remain unknown.
              </EvidenceEmpty>
            )}
          </div>
        )}
        {!gids.length && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>Choose accounts to compare</EmptyTitle>
              <EmptyDescription>
                Add known entity IDs to inspect converging paths. The assistant
                can use the same comparison.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
      {result && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {result.caveat}
            {result.truncated
              ? ` Showing ${result.items.length} of ${number(result.total)} matches.`
              : ""}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export function SignalsPanel({
  gid,
  cohort,
  setCohort,
  onSelect,
}: {
  gid: number | null;
  cohort: number[];
  setCohort: (gids: number[]) => void;
  onSelect: (gid: number) => void;
}) {
  const [data, setData] = useState<SignalReport | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState("");
  const [dossierError, setDossierError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setData(null);
    setDossier(null);
    setError("");
    setDossierError("");
    if (gid === null) return;
    const controller = new AbortController();
    fetchApi<SignalReport>(`/signals/${gid}`, { signal: controller.signal })
      .then(setData)
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    fetchApi<Dossier>(`/dossier/${gid}`, { signal: controller.signal })
      .then(setDossier)
      .catch((failure) => {
        if (!controller.signal.aborted) setDossierError(failure.message);
      });
    return () => controller.abort();
  }, [gid, revision]);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Investigation signals
          </h2>
          <p className="text-sm text-muted-foreground">
            Observed patterns for entity{" "}
            <strong className="font-medium text-foreground">
              {gid ?? "—"}
            </strong>
            . Each is a lead to verify.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className={buttonVariants({ variant: "outline" })}
            href="#compare-entities"
          >
            <UsersIcon data-icon="inline-start" />
            Compare entities
          </a>
          {gid !== null && (
            <a
              className={buttonVariants({ variant: "outline" })}
              href={`/api/dossier/${gid}?format=markdown`}
              download
            >
              <DownloadSimpleIcon data-icon="inline-start" />
              Case dossier
            </a>
          )}
        </div>
      </header>
      {gid === null ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PulseIcon />
            </EmptyMedia>
            <EmptyTitle>Select an entity</EmptyTitle>
            <EmptyDescription>
              Choose an account from the review queue to inspect its computed
              signals.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <State
          error={error}
          loading={!data && !error}
          retry={() => setRevision((value) => value + 1)}
        />
      )}
      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Timing and coordinated activity</CardTitle>
              <CardDescription>
                Daily records, bounded to the observation window.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">
                  {score(data.temporal.overlap_2d_ratio)}% two-day overlap
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Daily volume spikes</h3>
                  <Badge variant="outline">{data.temporal.spikes.length}</Badge>
                </div>
                {data.temporal.spikes.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">
                          Daily baseline
                        </TableHead>
                        <TableHead className="text-right">Ratio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.temporal.spikes.map((spike) => (
                        <TableRow key={spike.date}>
                          <TableCell>{dateLabel(spike.date)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {exactMoney(spike.total_kzt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {exactMoney(spike.baseline_median_kzt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {spike.ratio.toFixed(1)}×
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EvidenceEmpty>
                    No daily volume spikes crossed the configured threshold.
                  </EvidenceEmpty>
                )}
              </section>
              <Separator />
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Same-day incoming groups</h3>
                  <Badge variant="outline">
                    {data.temporal.synchronized_inflows.length}
                  </Badge>
                </div>
                {data.temporal.synchronized_inflows.map((group, index) => (
                  <div className="flex flex-col gap-3" key={group.date}>
                    {index > 0 && <Separator />}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium">
                        {dateLabel(group.date)}
                      </span>
                      <Badge variant="secondary">
                        {group.payer_count} payers
                      </Badge>
                      <span className="text-sm tabular-nums">
                        {exactMoney(group.sum_kzt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.payers.map((payer) => (
                        <Button
                          variant="outline"
                          key={payer}
                          onClick={() => onSelect(payer)}
                        >
                          {payer}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {!data.temporal.synchronized_inflows.length && (
                  <EvidenceEmpty>
                    No same-day payer group crossed the configured threshold.
                  </EvidenceEmpty>
                )}
              </section>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                {data.temporal.caveat}
              </p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recurring two-step routes</CardTitle>
              <CardDescription>
                Observed A → B → C transfers repeated across distinct dates.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">{data.routes.length} routes</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {data.routes.map((route, index) => (
                <article
                  className="flex flex-col gap-3"
                  key={route.path.join("-")}
                >
                  {index > 0 && <Separator />}
                  <Path gids={route.path} onSelect={onSelect} />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {route.occurrence_count} matched occurrences
                    </Badge>
                    <Badge variant="outline">
                      {route.distinct_start_dates} starting dates
                    </Badge>
                  </div>
                  <EvidenceDisclosure title="Inspect dated evidence">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Incoming date</TableHead>
                          <TableHead>Outgoing date</TableHead>
                          <TableHead className="text-right">Incoming</TableHead>
                          <TableHead className="text-right">Outgoing</TableHead>
                          <TableHead className="text-right">Lag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {route.occurrences.map((item, itemIndex) => (
                          <TableRow key={itemIndex}>
                            <TableCell>{dateLabel(item.in_date)}</TableCell>
                            <TableCell>{dateLabel(item.out_date)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {exactMoney(item.in_kzt)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {exactMoney(item.out_kzt)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.lag_days} days
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </EvidenceDisclosure>
                </article>
              ))}
              {!data.routes.length && (
                <EvidenceEmpty>
                  No recurring two-step route was found within the bounded
                  search.
                </EvidenceEmpty>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Timing and similar amounts cannot establish that the same funds
                moved along a route.
              </p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cycles and return paths</CardTitle>
              <CardDescription>
                Structural loops and compatible date sequences.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">{data.cycles.length} cycles</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {data.cycles.map((cycle, index) => (
                <article
                  className="flex flex-col gap-3"
                  key={cycle.path.join("-")}
                >
                  {index > 0 && <Separator />}
                  <Path gids={cycle.path} onSelect={onSelect} />
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        cycle.chronological_example ? "secondary" : "outline"
                      }
                    >
                      {cycle.kind === "date_consistent_cycle"
                        ? "Strictly ordered dates"
                        : "Structural loop only"}
                    </Badge>
                    <Badge variant="outline">
                      {cycle.edges.length} directed steps
                    </Badge>
                  </div>
                  <EvidenceDisclosure title="Inspect cycle evidence">
                    <div className="flex flex-col gap-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Directed edge</TableHead>
                            <TableHead className="text-right">
                              Observed amount
                            </TableHead>
                            <TableHead>Recorded dates</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cycle.edges.map((edge, edgeIndex) => (
                            <TableRow key={edgeIndex}>
                              <TableCell>
                                {edge.src} → {edge.dst}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {exactMoney(edge.sum_kzt)}
                              </TableCell>
                              <TableCell className="max-w-80 whitespace-normal">
                                {edge.dates
                                  .map((day) => dateLabel(day))
                                  .join(", ")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {cycle.chronological_example && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          Compatible sequence:{" "}
                          {cycle.chronological_example
                            .map(
                              (edge) =>
                                `${edge.src} → ${edge.dst} on ${dateLabel(edge.date)}`,
                            )
                            .join("; ")}
                          .
                        </p>
                      )}
                    </div>
                  </EvidenceDisclosure>
                </article>
              ))}
              {!data.cycles.length && (
                <EvidenceEmpty>
                  No short directed cycle was found within the bounded search.
                </EvidenceEmpty>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Same-day transfers cannot be ordered. A cycle does not prove a
                return of the same funds.
              </p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Depth-peer and payment anomalies</CardTitle>
              <CardDescription>
                Transparent numerical checks for further review.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">
                  {data.anomalies.length} signals
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {data.anomalies.map((anomaly, index) => (
                <article className="flex flex-col gap-3" key={anomaly.id}>
                  {index > 0 && <Separator />}
                  <h3 className="font-medium">{anomaly.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {anomaly.evidence}
                  </p>
                  <EvidenceDisclosure title="Measured values">
                    <MeasuredValues values={anomaly.metrics} />
                  </EvidenceDisclosure>
                </article>
              ))}
              {!data.anomalies.length && (
                <EvidenceEmpty>
                  No additional configured anomaly was returned.
                </EvidenceEmpty>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Repeated payments alone do not establish deliberate splitting.
                Transfers below the collection threshold are not visible.
              </p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Search bounds and interpretation</CardTitle>
              <CardDescription>
                What this view searched, returned and cannot establish.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EvidenceDisclosure title="View bounds and caveats">
                <div className="flex flex-col gap-4">
                  {data.caveats.map((caveat, index) => (
                    <p
                      className="text-sm leading-relaxed text-muted-foreground"
                      key={index}
                    >
                      {caveat}
                    </p>
                  ))}
                  <MeasuredValues values={data.limits} />
                </div>
              </EvidenceDisclosure>
            </CardContent>
          </Card>
        </>
      )}
      <CohortPanel
        selected={gid}
        gids={cohort}
        setGids={setCohort}
        onSelect={onSelect}
      />
      {dossierError && (
        <State
          error={dossierError}
          retry={() => setRevision((value) => value + 1)}
        />
      )}
      {dossier && (
        <Card>
          <CardHeader>
            <CardTitle>Resolve the missing evidence</CardTitle>
            <CardDescription>
              Specific requests to test the account's role hypothesis.
            </CardDescription>
            <CardAction>
              <a
                href={`/api/dossier/${gid}`}
                download={`dossier-${gid}.json`}
                className={buttonVariants({ variant: "outline" })}
              >
                <DownloadSimpleIcon data-icon="inline-start" />
                JSON
              </a>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Alert role="note">
              <ShieldCheckIcon />
              <AlertTitle>Known blind spots</AlertTitle>
              <AlertDescription>
                <ul className="flex list-disc flex-col gap-2 pl-4">
                  {dossier.missing_evidence.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
            <ol className="flex list-decimal flex-col gap-5 pl-5">
              {dossier.next_requests.map((item, index) => (
                <li key={index} className="pl-1">
                  <p className="text-sm font-medium">{item.request}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.reason}
                  </p>
                </li>
              ))}
            </ol>
            <Separator />
            <EvidenceDisclosure title="Evidence and hypotheses">
              <div className="flex flex-col gap-4">
                <h3 className="font-medium">Observed evidence</h3>
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-muted-foreground">
                  {dossier.evidence.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                <Separator />
                <h3 className="font-medium">Hypotheses for review</h3>
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-muted-foreground">
                  {dossier.hypotheses.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </EvidenceDisclosure>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Dossiers separate observations from hypotheses. They are not
              findings of wrongdoing.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export function ResiliencePanel({
  onSelect,
}: {
  onSelect: (gid: number) => void;
}) {
  const [topN, setTopN] = useState(5);
  const [data, setData] = useState<ResilienceReport | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetchApi<ResilienceReport>(`/resilience?top_n=${topN}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [topN, revision]);
  const metrics: {
    key: keyof ResilienceMetrics;
    label: string;
    explanation: string;
  }[] = [
    {
      key: "nodes",
      label: "Visible entities",
      explanation: "Entities in the observed graph.",
    },
    {
      key: "edges",
      label: "Transfer relationships",
      explanation: "Directed relationships between visible entities.",
    },
    {
      key: "weak_components",
      label: "Disconnected groups",
      explanation: "Components when edge direction is ignored.",
    },
    {
      key: "largest_component_nodes",
      label: "Largest connected group",
      explanation: "Entities in the largest weakly connected component.",
    },
    {
      key: "reachable_seed_pairs",
      label: "Seed-to-entity reach",
      explanation: "Ordered seed/entity pairs within four directed hops.",
    },
  ];
  const remaining = data?.baseline.largest_component_nodes
    ? (data.after.largest_component_nodes /
        data.baseline.largest_component_nodes) *
      100
    : 0;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Network resilience
        </h2>
        <p className="text-sm text-muted-foreground">
          Remove priority entities from a copy of the graph and compare
          connectivity.
        </p>
        <div>
          <AskEvidenceAction prompt="Explain the structural effect of removing the top five priority accounts. What can this simulation establish, and what remains unknown?">
            Explain the top-five scenario
          </AskEvidenceAction>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Counterfactual removal</CardTitle>
          <CardDescription>
            The original graph, roles and priority scores remain unchanged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Number of priority entities to remove</FieldLabel>
              <ToggleGroup
                variant="outline"
                value={[String(topN)]}
                onValueChange={(values) => {
                  if (values[0]) setTopN(Number(values[0]));
                }}
                aria-label="Number of priority entities to remove"
              >
                {[1, 3, 5, 10, 20].map((value) => (
                  <ToggleGroupItem key={value} value={String(value)}>
                    {value}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>
                Choose the top 1–20 accounts ranked by heuristic review
                priority.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <State
        error={error}
        loading={!data && !error}
        retry={() => setRevision((value) => value + 1)}
      />
      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Connectivity comparison</CardTitle>
              <CardDescription>
                Observed graph versus simulated removal of{" "}
                {data.removed_gids.length} entities.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Measure</TableHead>
                    <TableHead className="text-right">Observed</TableHead>
                    <TableHead className="text-right">After removal</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const before = data.baseline[metric.key];
                    const after = data.after[metric.key];
                    const change = after - before;
                    return (
                      <TableRow key={metric.key}>
                        <TableCell className="min-w-48 whitespace-normal">
                          <p className="font-medium">{metric.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {metric.explanation}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {number(before)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {number(after)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {change > 0 ? "+" : ""}
                          {number(change)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Separator />
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">
                    Largest connected group retained
                  </h3>
                  <span className="text-sm tabular-nums">
                    {number(data.after.largest_component_nodes)} /{" "}
                    {number(data.baseline.largest_component_nodes)} entities
                  </span>
                </div>
                <Progress
                  value={remaining}
                  aria-label="Share of the largest connected group remaining"
                />
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                This structural experiment is not a forecast of real-world
                disruption or a recommendation to block accounts.
              </p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Removed in this scenario</CardTitle>
              <CardDescription>
                Accounts selected by deterministic priority rank.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.removed_gids.map((gid, index) => (
                  <Button
                    variant="outline"
                    key={gid}
                    onClick={() => onSelect(gid)}
                  >
                    <GraphIcon data-icon="inline-start" />
                    <span className="text-muted-foreground">{index + 1}.</span>
                    {gid}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Caveat>{data.caveat}</Caveat>
        </>
      )}
    </div>
  );
}
