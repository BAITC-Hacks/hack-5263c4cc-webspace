import type { Gid } from "@/api";
import { useAssistantWorkspace } from "@/AssistantWorkspace";
import {
  CaretDownIcon,
  CaretRightIcon,
  ChatCircleDotsIcon,
  DownloadSimpleIcon,
  InfoIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import type { NodeDetail } from "@/api";
import { exactMoney, money, roleLabel, score } from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Failure, NoResults, Pending } from "./AsyncState";

interface Props {
  selected: Gid | null;
  node: NodeDetail | null;
  error: string;
  cohort: Gid[];
  onSelect: (gid: Gid) => void;
  onCommunity: (id: number) => void;
  onSignals: () => void;
  retry: () => void;
}

export function EvidenceInspector({
  selected,
  node,
  error,
  cohort,
  onSelect,
  onCommunity,
  onSignals,
  retry,
}: Props) {
  const { openAssistant } = useAssistantWorkspace();
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>Entity {selected ?? "—"}</CardTitle>
        <CardDescription>
          {node
            ? `Priority ${score(node.priority_score)}/100 · Depth ${node.depth}${node.is_seed ? " · Seed" : ""}`
            : "Select an entity to review its evidence."}
        </CardDescription>
        {node && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Show community ${node.cluster_id}`}
              onClick={() => onCommunity(node.cluster_id)}
            >
              <SquaresFourIcon />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-0">
        {node && (
          <div className="px-4 pb-4">
            <Button
              className="w-full"
              variant="outline"
              onClick={() =>
                openAssistant({
                  gid: node.gid,
                  gids: cohort,
                  prompt:
                    "Explain this account’s role hypothesis and strongest evidence. Separate facts from missing evidence.",
                })
              }
            >
              <ChatCircleDotsIcon />
              Ask about this entity
            </Button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {selected === null ? (
            <NoResults
              title="Choose an entity"
              description="Choose an account from the graph or review queue."
            />
          ) : error ? (
            <Failure message={error} retry={retry} />
          ) : node ? (
            <Evidence
              node={node}
              onSelect={onSelect}
              onCommunity={onCommunity}
              onSignals={onSignals}
            />
          ) : (
            <Pending label="Loading selected entity" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Evidence({
  node,
  onSelect,
  onCommunity,
  onSignals,
}: {
  node: NodeDetail;
  onSelect: (gid: Gid) => void;
  onCommunity: (id: number) => void;
  onSignals: () => void;
}) {
  // The engine's first reason repeats the role evidence verbatim; show it once.
  const signals = node.reasons
    .filter((reason) => reason.label !== "Observed flow")
    .map((reason) => ({
      ...reason,
      value:
        reason.label === "Temporal overlap" && typeof reason.value === "number"
          ? `${Math.round(reason.value * 100)}%`
          : reason.value,
    }));
  signals.push({
    label: "Connected communities",
    value: node.metrics.neighbor_clusters,
    detail:
      "Distinct communities among direct incoming and outgoing counterparties.",
  });
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-label="Role hypothesis">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">{roleLabel(node.role)}</Badge>
          <span className="text-xs text-muted-foreground">
            Rule fit{" "}
            <strong className="font-medium text-foreground tabular-nums">
              {score(node.role_score)}/100
            </strong>
          </span>
        </div>
        <p className="text-sm leading-relaxed">{node.evidence}</p>
        <RoleCandidates node={node} />
      </section>
      <Alert>
        <InfoIcon />
        <AlertTitle>
          {node.truncated_by_depth
            ? "Collection boundary"
            : node.observability.label || "Partial observation"}
        </AlertTitle>
        <AlertDescription>
          {node.truncated_by_depth
            ? "This depth-four account is where collection stops. No visible outflow does not establish a final beneficiary."
            : node.limitations[0] ||
              "Only transfers in the observation window are visible."}
        </AlertDescription>
      </Alert>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Observed signals</h3>
        <dl className="flex flex-col gap-2.5">
          {signals.map((reason) => (
            <div
              key={reason.label}
              className="flex items-center justify-between gap-3"
            >
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {reason.label}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`About ${reason.label.toLowerCase()}`}
                      />
                    }
                  >
                    <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    {reason.detail}
                  </TooltipContent>
                </Tooltip>
              </dt>
              <dd className="text-sm font-medium tabular-nums">
                {reason.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <Collapsible>
        <CollapsibleTrigger
          render={
            <Button
              variant="outline"
              className="group w-full justify-between"
            />
          }
        >
          Priority factors
          <CaretDownIcon
            data-icon="inline-end"
            className="group-data-panel-open:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Contributions to {score(node.priority_score)} priority points. A
            review heuristic, never a probability of wrongdoing.
          </p>
          <div className="flex flex-col gap-4">
            {node.score_factors.map((factor, index) =>
              factor.contribution >= 0 && factor.weight > 0 ? (
                <Progress
                  key={index}
                  value={factor.contribution * 100}
                  max={factor.weight * 100}
                  getAriaValueText={() =>
                    `${(factor.contribution * 100).toFixed(1)} of ${(factor.weight * 100).toFixed(0)} possible priority points`
                  }
                >
                  <ProgressLabel>{factor.label}</ProgressLabel>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {(factor.contribution * 100).toFixed(1)} /{" "}
                    {(factor.weight * 100).toFixed(0)} pts
                  </span>
                </Progress>
              ) : (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span>{factor.label}</span>
                  <Badge variant="outline">
                    {(factor.contribution * 100).toFixed(1)} pts
                  </Badge>
                </div>
              ),
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Separator />
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Largest counterparties</h3>
        {(["incoming", "outgoing"] as const).map((direction) => (
          <div key={direction} className="flex flex-col gap-1">
            <h4 className="text-xs text-muted-foreground">
              {direction === "incoming" ? "Incoming from" : "Outgoing to"}
            </h4>
            {node.counterparties[direction].length ? (
              <Table
                aria-label={
                  direction === "incoming"
                    ? "Largest incoming counterparties"
                    : "Largest outgoing counterparties"
                }
              >
                <TableBody>
                  {node.counterparties[direction].slice(0, 4).map((party) => (
                    <TableRow key={party.gid}>
                      <TableCell>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onSelect(party.gid)}
                        >
                          {party.gid}
                        </Button>
                      </TableCell>
                      <TableCell
                        className="text-right tabular-nums"
                        title={exactMoney(party.sum_kzt)}
                      >
                        {money(party.sum_kzt)}
                      </TableCell>
                      <TableCell className="w-8">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Inspect counterparty ${party.gid}`}
                          onClick={() => onSelect(party.gid)}
                        >
                          <CaretRightIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-2 text-xs text-muted-foreground">
                No observed {direction} transfers.
              </p>
            )}
          </div>
        ))}
      </section>
      <Collapsible>
        <CollapsibleTrigger
          render={
            <Button variant="ghost" className="group w-full justify-between" />
          }
        >
          Missing evidence & limits
          <CaretDownIcon
            data-icon="inline-end"
            className="group-data-panel-open:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-xs leading-relaxed text-muted-foreground">
            {[
              ...new Set([...node.limitations, ...node.observability.notes]),
            ].map((limit, index) => (
              <li key={index}>{limit}</li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
      <Separator />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onSignals}>
          Inspect signals
          <CaretRightIcon data-icon="inline-end" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCommunity(node.cluster_id)}
        >
          <SquaresFourIcon data-icon="inline-start" />
          Community {node.cluster_id}
        </Button>
      </div>
      <a
        className={buttonVariants({ variant: "default" })}
        href={`/api/dossier/${node.gid}?format=markdown`}
        download
      >
        <DownloadSimpleIcon data-icon="inline-start" />
        Download entity dossier
      </a>
    </div>
  );
}

// Eligibility copy follows docs/methodology.md; scores remain engine-owned.
// Keep this order aligned with the engine's documented tie-breaking order.
const ROLE_RULES = [
  {
    role: "consolidator",
    criteria: "At least 3 distinct incoming payers.",
  },
  {
    role: "transit",
    criteria:
      "Not a seed; visible outflow; outgoing / incoming amount between 0.65 and 1.35, inclusive.",
  },
  {
    role: "distributor",
    criteria: "At least 8 distinct outgoing recipients.",
  },
  {
    role: "terminal",
    criteria:
      "Not a seed or collection boundary; visible inflow and no visible outflow. An observed sink only.",
  },
  {
    role: "coordinator",
    criteria:
      "Not a seed; at least 2 payers, 2 recipients, 2 neighboring communities and 2 reachable upstream seeds; positive betweenness at or above its 90th percentile.",
  },
  {
    role: "peripheral",
    criteria: "Baseline score of 20; selected when no stronger rule wins.",
  },
  {
    role: "boundary_unknown",
    criteria:
      "Depth 4 or greater with no visible outflow. Overrides other role rules; financial purpose remains unknown.",
  },
] as const;

function RoleCandidates({ node }: { node: NodeDetail }) {
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="group w-full justify-between"
          />
        }
      >
        Compare role rules
        <CaretDownIcon
          data-icon="inline-end"
          className="group-data-panel-open:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Rule fit describes observed structure, never the probability of
          wrongdoing. Scores come from the deterministic engine.
        </p>
        <Table aria-label={`Role candidates for entity ${node.gid}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-0">Candidate & eligibility</TableHead>
              <TableHead className="pr-0 text-right">Fit / 100</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLE_RULES.map(({ role, criteria }) => {
              const candidateScore = node.role_scores[role];
              const available = Number.isFinite(candidateScore);
              const selected = node.role === role;
              const status = !available
                ? "Score unavailable"
                : selected
                  ? role === "boundary_unknown"
                    ? "Boundary override"
                    : "Selected"
                  : role === "peripheral"
                    ? "Baseline"
                    : node.truncated_by_depth
                      ? "Skipped at boundary"
                      : candidateScore > 0
                        ? "Eligible"
                        : "Not eligible";
              return (
                <TableRow key={role} data-state={selected ? "selected" : undefined}>
                  <TableCell className="max-w-0 py-3 pl-0 align-top whitespace-normal">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-medium">{roleLabel(role)}</span>
                      <span className="text-xs text-muted-foreground">{status}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {criteria}
                    </p>
                  </TableCell>
                  <TableCell
                    className="w-16 py-3 pr-0 text-right align-top tabular-nums"
                    title={available ? `Raw rule-fit score: ${candidateScore}` : undefined}
                  >
                    {available ? (candidateScore * 100).toFixed(1) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Highest score wins. Exact ties use the order shown; displayed scores
          are rounded. Seeds cannot receive transit, terminal or coordinator
          roles because their incoming coverage is incomplete.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
