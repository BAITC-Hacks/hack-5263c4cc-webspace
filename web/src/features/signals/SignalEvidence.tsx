import {type ReactNode} from "react";
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';

import {number} from "../../api";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";

import {Button} from "@/components/ui/button";

import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";

import {Skeleton} from "@/components/ui/skeleton";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

import type {Gid} from "../../shared/api/types";
export function State({
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

export function Path({
  gids,
  onSelect,
}: {
  gids: Gid[];
  onSelect: (gid: Gid) => void;
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

export function Caveat({ children }: { children: ReactNode }) {
  return (
    <Alert role="note">
      <InfoIcon />
      <AlertTitle>Interpretation limit</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function EvidenceEmpty({ children }: { children: ReactNode }) {
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

export function EvidenceDisclosure({
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

export function MeasuredValues({ values }: { values: Record<string, unknown> }) {
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
