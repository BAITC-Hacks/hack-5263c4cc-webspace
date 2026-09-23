import {useEffect, useId, useRef, useState} from "react";
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';

import {number, roleLabel} from "../../api";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";

import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";

import {Separator} from "@/components/ui/separator";

import type {Gid} from "../../shared/api/types";
import {useCollectors, useValidateCohort} from "./queries";
import {parseCohort} from "./cohort";
import {State, Path, EvidenceEmpty} from "./SignalEvidence";

export function CohortPanel({
  analysisId,
  selected,
  gids,
  setGids,
  onSelect,
}: {
  analysisId: string;
  selected: Gid | null;
  gids: Gid[];
  setGids: (gids: Gid[]) => void;
  onSelect: (gid: Gid) => void;
}) {
  const [text, setText] = useState("");
  const [inputError, setInputError] = useState("");
  const [validating, setValidating] = useState(false);
  const validationRequest = useRef<AbortController | null>(null);
  const inputId = useId();
  const collectors = useCollectors(analysisId, gids);
  const validation = useValidateCohort(analysisId);
  const result = collectors.data;
  const error = collectors.error?.message ?? "";
  const loading = gids.length > 0 && collectors.isPending;
  useEffect(() => {
    setValidating(false);
    return () => validationRequest.current?.abort();
  }, [gids]);
  async function add(selectedGid?: Gid) {
    const input = selectedGid ?? text;
    if (!input.trim()) return;
    let next: Gid[];
    try { next = parseCohort(input, gids); }
    catch (failure) { setInputError((failure as Error).message); return; }
    validationRequest.current?.abort();
    const controller = new AbortController();
    validationRequest.current = controller;
    setValidating(true);
    setInputError("");
    try {
      await validation.mutateAsync({gids: next, signal: controller.signal});
      if (!controller.signal.aborted) { setGids(next); setText(""); }
    } catch (failure) {
      if (!controller.signal.aborted) setInputError(failure instanceof Error ? failure.message : "The selected accounts could not be verified.");
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
        </div>
        <State
          error={error}
          loading={loading}
          retry={() => void collectors.refetch()}
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
