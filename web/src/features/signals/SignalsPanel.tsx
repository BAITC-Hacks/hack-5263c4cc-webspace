
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { PulseIcon } from '@phosphor-icons/react/dist/csr/Pulse';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';

import {dateLabel, exactMoney, score} from "../../api";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button, buttonVariants} from "@/components/ui/button";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";

import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";

import {Separator} from "@/components/ui/separator";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

import type {Gid} from "../../shared/api/types";
import {useSignals} from "./queries";
import {useDossier} from "../evidence/queries";
import {downloads} from "../../shared/api/client";
import {CohortPanel} from "./CohortPanel";
import {State, Path, EvidenceEmpty, EvidenceDisclosure, MeasuredValues} from "./SignalEvidence";

export function SignalsPanel({
  analysisId,
  gid,
  cohort,
  setCohort,
  onSelect,
}: {
  analysisId: string;
  gid: Gid | null;
  cohort: Gid[];
  setCohort: (gids: Gid[]) => void;
  onSelect: (gid: Gid) => void;
}) {
  const signals = useSignals(analysisId, gid);
  const dossierQuery = useDossier(analysisId, gid);
  const data = signals.data;
  const dossier = dossierQuery.data;
  const error = signals.error?.message ?? "";
  const dossierError = dossierQuery.error?.message ?? "";
  const refresh = () => { void signals.refetch(); void dossierQuery.refetch(); };
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
              href={downloads.dossier(gid, "markdown")}
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
          retry={() => refresh()}
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
        analysisId={analysisId}
        selected={gid}
        gids={cohort}
        setGids={setCohort}
        onSelect={onSelect}
      />
      {dossierError && (
        <State
          error={dossierError}
          retry={() => refresh()}
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
                href={downloads.dossier(gid!)}
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
