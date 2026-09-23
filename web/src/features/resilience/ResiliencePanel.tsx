import {useState} from "react";
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { GraphIcon } from '@phosphor-icons/react/dist/csr/Graph';
import type {ResilienceMetrics} from "../../api";
import {number} from "../../api";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";

import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";

import {Progress} from "@/components/ui/progress";
import {Separator} from "@/components/ui/separator";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";

import type {Gid} from "../../shared/api/types";
import {useResilience} from "./queries";
import {State, Caveat} from "../signals/SignalEvidence";

export function ResiliencePanel({
  analysisId,
  onSelect,
}: {
  analysisId: string;
  onSelect: (gid: Gid) => void;
}) {
  const [topN, setTopN] = useState(5);
  const result = useResilience(analysisId, topN);
  const data = result.data;
  const error = result.error?.message ?? "";
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
        retry={() => void result.refetch()}
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
