import type { Gid } from "@/api";
import {
  CaretLeftIcon,
  CaretRightIcon,
  FingerprintIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { NodeSummary } from "@/api";
import { money, number, roleLabel, score } from "@/api";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  items: NodeSummary[];
  total: number;
  selected: Gid | null;
  loading: boolean;
  error: string;
  query: string;
  setQuery: (query: string) => void;
  role: string;
  setRole: (role: string) => void;
  roles: string[];
  cluster: number | null;
  clearCluster: () => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  onSelect: (gid: Gid) => void;
  retry: () => void;
}

export function EntityRows({
  items,
  selected,
  onSelect,
  extended = true,
}: {
  items: NodeSummary[];
  selected: Gid | null;
  onSelect: (gid: Gid) => void;
  extended?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Role hypothesis</TableHead>
          <TableHead className="text-right">Priority</TableHead>
          {extended && (
            <>
              <TableHead className="text-right">Inflow</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead>Community</TableHead>
            </>
          )}
          <TableHead className="w-16">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((node) => (
          <TableRow
            key={node.gid}
            data-state={node.gid === selected ? "selected" : undefined}
          >
            <TableCell className="tabular-nums text-muted-foreground">
              {node.rank}
            </TableCell>
            <TableCell>
              <Button
                variant="link"
                onClick={() => onSelect(node.gid)}
                aria-label={`Inspect entity ${node.gid}`}
              >
                <span className="tabular-nums">{node.gid}</span>
              </Button>
              {node.is_seed && <Badge variant="outline">Seed</Badge>}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{roleLabel(node.role)}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {score(node.priority_score)}
              <span className="text-muted-foreground">/100</span>
            </TableCell>
            {extended && (
              <>
                <TableCell className="text-right tabular-nums">
                  {money(node.in_kzt)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(node.out_kzt)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {node.cluster_id}
                </TableCell>
              </>
            )}
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSelect(node.gid)}
                aria-label={`Open entity ${node.gid}`}
              >
                <CaretRightIcon />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function EntityTable(props: Props) {
  const {
    items,
    total,
    selected,
    loading,
    error,
    query,
    setQuery,
    role,
    setRole,
    roles,
    cluster,
    clearCluster,
    page,
    setPage,
    pageSize,
    setPageSize,
    onSelect,
    retry,
  } = props;
  const roleItems = [
    { value: "all", label: "All role hypotheses" },
    ...roles.map((value) => ({ value, label: roleLabel(value) })),
  ];
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function reset() {
    setQuery("");
    setRole("");
    clearCluster();
    setPage(0);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entity review queue</CardTitle>
        <CardDescription>
          {number(total)} entities ranked by heuristic investigation priority.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">
            <FingerprintIcon />
            {number(total)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <FieldGroup className="flex-row flex-wrap items-end gap-4">
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor="entity-query">Entity ID</FieldLabel>
            <Input
              id="entity-query"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search an identifier…"
              maxLength={100}
            />
          </Field>
          <Field className="w-60">
            <FieldLabel htmlFor="entity-role">Role hypothesis</FieldLabel>
            <Select
              items={roleItems}
              value={role || "all"}
              onValueChange={(value) => {
                setRole(value === "all" ? "" : String(value ?? ""));
                setPage(0);
              }}
            >
              <SelectTrigger id="entity-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {(query || role || cluster !== null) && (
            <Button variant="outline" onClick={reset}>
              <XIcon data-icon="inline-start" />
              Clear filters
            </Button>
          )}
        </FieldGroup>
        {cluster !== null && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Community {cluster}</Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                clearCluster();
                setPage(0);
              }}
              aria-label="Clear community filter"
            >
              <XIcon />
            </Button>
          </div>
        )}
        <div aria-busy={loading}>
          {error ? (
            <Failure message={error} retry={retry} />
          ) : loading ? (
            <Pending label="Loading entity page" />
          ) : items.length ? (
            <EntityRows items={items} selected={selected} onSelect={onSelect} />
          ) : (
            <NoResults reset={reset} />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total
            ? `${number(page * pageSize + 1)}–${number(Math.min((page + 1) * pageSize, total))} of ${number(total)}`
            : "No results"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            items={[25, 50, 100].map((value) => ({
              value: String(value),
              label: `${value} per page`,
            }))}
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Entities per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {[25, 50, 100].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} per page
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={loading || page === 0}
            onClick={() => setPage(page - 1)}
            aria-label="Previous entity page"
          >
            <CaretLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={loading || page + 1 >= pages}
            onClick={() => setPage(page + 1)}
            aria-label="Next entity page"
          >
            <CaretRightIcon />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
