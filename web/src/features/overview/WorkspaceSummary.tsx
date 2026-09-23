

import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import type {NodeDetail, Summary} from "@/api";
import {exactMoney, money, number, score} from "@/api";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";

export function DatasetCoverage({ summary }: { summary: Summary | null }) {
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

export function EntityMetrics({ node }: { node: NodeDetail }) {
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
