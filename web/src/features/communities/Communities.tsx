import {useState} from "react";

import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { SquaresFourIcon } from '@phosphor-icons/react/dist/csr/SquaresFour';
import type {Cluster} from "@/api";
import {money, number} from "@/api";

import {Failure, NoResults, Pending} from "@/components/AsyncState";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

export function Communities({
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
