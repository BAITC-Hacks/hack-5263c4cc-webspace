import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function Failure({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <WarningCircleIcon />
      <AlertTitle>Evidence could not be loaded</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {retry && (
          <Button variant="outline" onClick={retry}>
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function Pending({ label = "Loading evidence" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-4 p-5" role="status">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
export function NoResults({
  title = "No matching entities",
  description = "Try another entity ID or clear the active filters.",
  reset,
}: {
  title?: string;
  description?: string;
  reset?: () => void;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MagnifyingGlassIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {reset && (
        <EmptyContent>
          <Button variant="outline" onClick={reset}>
            Clear filters
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
