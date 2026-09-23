import type { Gid } from "@/api";
import {
  DownloadSimpleIcon,
  FileCsvIcon,
  FileTextIcon,
  FingerprintIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportMenu({ selected }: { selected: Gid | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <DownloadSimpleIcon data-icon="inline-start" />
        <span>Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Required analysis outputs</DropdownMenuLabel>
          {[
            ["nodes_roles.csv", "All entity roles"],
            ["clusters.csv", "Community analysis"],
            ["top_nodes.csv", "Priority review list"],
          ].map(([file, label]) => (
            <DropdownMenuItem
              key={file}
              render={<a href={`/api/exports/${file}`} download />}
            >
              <FileCsvIcon />
              <span className="flex flex-col gap-0.5">
                <span>{label}</span>
                <span className="text-sm text-muted-foreground">{file}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Review and reproducibility</DropdownMenuLabel>
          <DropdownMenuItem
            render={<a href="/api/provenance" download="audit-receipt.json" />}
          >
            <ShieldCheckIcon />
            Audit receipt
          </DropdownMenuItem>
          {selected !== null && (
            <>
              <DropdownMenuItem
                render={
                  <a
                    href={`/api/dossier/${selected}?format=markdown`}
                    download
                  />
                }
              >
                <FileTextIcon />
                Entity {selected} dossier
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <a
                    href={`/api/dossier/${selected}`}
                    download={`entity-${selected}.json`}
                  />
                }
              >
                <FingerprintIcon />
                Entity {selected} evidence JSON
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
