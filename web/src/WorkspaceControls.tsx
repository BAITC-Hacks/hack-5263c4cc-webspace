import { Menu } from '@base-ui/react/menu';
import { Tooltip } from '@base-ui/react/tooltip';
import { ChevronDown, CircleHelp, Download, Fingerprint, ShieldCheck } from 'lucide-react';

export function ExportMenu({ selected }: { selected: number | null }) {
  return <Menu.Root>
    <Menu.Trigger className="export-trigger"><Download size={15}/><span>Export evidence</span><ChevronDown size={13}/></Menu.Trigger>
    <Menu.Portal>
      <Menu.Positioner sideOffset={8} align="end" className="workspace-menu-positioner">
        <Menu.Popup className="workspace-menu" aria-label="Evidence downloads">
          <Menu.Group>
            <Menu.GroupLabel className="workspace-menu-label">Analysis outputs</Menu.GroupLabel>
            {[
              ['nodes_roles.csv', 'All entity roles'],
              ['clusters.csv', 'Community analysis'],
              ['top_nodes.csv', 'Priority review list'],
            ].map(([file, label]) => <Menu.Item key={file} className="workspace-menu-item" render={<a href={`/api/exports/${file}`} download/>}>
              <Download size={14}/><span>{label}<small>{file}</small></span>
            </Menu.Item>)}
          </Menu.Group>
          <Menu.Separator className="workspace-menu-separator"/>
          <Menu.Item className="workspace-menu-item" render={<a href="/api/provenance" download="audit-receipt.json"/>}>
            <ShieldCheck size={14}/><span>Reproducibility receipt<small>Dataset and export fingerprints</small></span>
          </Menu.Item>
          {selected !== null && <Menu.Item className="workspace-menu-item" render={<a href={`/api/dossier/${selected}?format=markdown`} download/>}>
            <Fingerprint size={14}/><span>Entity {selected} dossier<small>Evidence, hypotheses, next requests</small></span>
          </Menu.Item>}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>;
}

export function PriorityHelp() {
  return <Tooltip.Root>
    <Tooltip.Trigger className="priority-help" aria-label="What the priority score means"><CircleHelp size={13}/></Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Positioner sideOffset={8} side="right" className="workspace-tooltip-positioner">
        <Tooltip.Popup className="workspace-tooltip">A relative heuristic for review order, scaled to 100. It is not a probability of crime.</Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  </Tooltip.Root>;
}
