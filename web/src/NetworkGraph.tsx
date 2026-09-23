import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { ArrowsOutSimpleIcon, ArrowRightIcon, DownloadSimpleIcon, MinusIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GraphData, GraphEdge } from './api';
import { exactMoney, number, roleColor, roleLabel } from './api';

interface Props {data: GraphData; onSelect: (gid: number) => void; colorBy?: 'role' | 'cluster'}
const communityColors = ['#2563eb','#0891b2','#d97706','#7c3aed','#059669','#dc2626','#475569','#c026d3','#4f46e5','#0f766e'];

export default function NetworkGraph({data, onSelect, colorBy = 'role'}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<cytoscape.Core | null>(null);
  const selection = useRef(onSelect);
  const [edge, setEdge] = useState<GraphEdge | null>(null);
  selection.current = onSelect;

  useEffect(() => {
    if (!container.current) return;
    setEdge(null);
    const cy = cytoscape({
      container: container.current,
      elements: [
        ...data.nodes.map(node => ({data: {
          ...node,
          id: String(node.id),
          label: String(node.gid),
          color: colorBy === 'cluster' ? communityColors[Math.abs(node.cluster_id) % communityColors.length] : roleColor(node.role),
          size: node.is_root ? 40 : node.is_seed ? 29 : 18 + Math.min(11, Math.log2(1 + node.in_degree + node.out_degree) * 2),
        }, classes: [node.is_root ? 'root' : '', node.is_seed ? 'seed' : '', node.truncated_by_depth ? 'boundary' : ''].join(' ')})),
        ...data.edges.map(item => ({data: {...item, id: `edge-${item.id}`, source: String(item.source), target: String(item.target), width: Math.max(.8, Math.min(4, Math.log10(1 + item.sum_kzt) / 2))}})),
      ],
      style: [
        {selector: 'node', style: {
          'background-color': 'data(color)', width: 'data(size)', height: 'data(size)',
          label: 'data(label)', color: '#404040', 'font-family': 'Geist Variable, sans-serif',
          'font-size': 11, 'text-valign': 'bottom', 'text-margin-y': 6,
          'border-width': 2, 'border-color': '#fff', 'text-background-color': '#ffffff',
          'text-background-opacity': .85, 'text-background-padding': '2px',
        }},
        {selector: '.seed', style: {shape: 'diamond', 'border-width': 2}},
        {selector: '.boundary', style: {shape: 'octagon', 'border-style': 'dashed', 'border-width': 2, 'border-color': '#c2410c', 'background-opacity': .65}},
        {selector: '.root', style: {'border-width': 4, 'border-color': '#a3a3a3', 'font-weight': 'bold', 'font-size': 11, 'text-margin-y': 9}},
        {selector: 'edge', style: {'curve-style': 'bezier', width: 'data(width)', 'line-color': '#a3a3a3', 'target-arrow-color': '#737373', 'target-arrow-shape': 'triangle', 'arrow-scale': .9, opacity: .72}},
        {selector: 'edge:selected', style: {'line-color': '#171717', 'target-arrow-color': '#171717', width: 3, opacity: 1}},
        {selector: 'node:selected', style: {'border-color': '#171717', 'border-width': 3}},
        {selector: '.faded', style: {opacity: .17}},
      ],
      layout: {name: 'cose', animate: false, fit: true, padding: 52, nodeRepulsion: () => 10000, idealEdgeLength: () => 95, edgeElasticity: () => 90, numIter: 350, gravity: .45, componentSpacing: 100},
      minZoom: .15, maxZoom: 4, wheelSensitivity: .2,
      boxSelectionEnabled: false,
    });
    instance.current = cy;
    cy.on('tap', 'node', event => selection.current(Number(event.target.data('gid'))));
    cy.on('tap', 'edge', event => {
      const clicked = event.target.data();
      setEdge({id: clicked.id, source: clicked.source, target: clicked.target, src: clicked.src, dst: clicked.dst, sum_kzt: clicked.sum_kzt, n_tx: clicked.n_tx, depth: clicked.depth});
    });
    cy.on('mouseover', 'node', event => {if (container.current) container.current.style.cursor = 'pointer'; const related = event.target.closedNeighborhood(); cy.elements().difference(related).addClass('faded');});
    cy.on('mouseout', 'node', () => {if (container.current) container.current.style.cursor = 'default'; cy.elements().removeClass('faded');});
    let frame = requestAnimationFrame(() => {cy.resize(); cy.fit(undefined, 52);});
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {if (!cy.destroyed()) {cy.resize(); cy.fit(undefined, 52);}});
    });
    observer.observe(container.current);
    return () => {cancelAnimationFrame(frame); observer.disconnect(); cy.destroy(); instance.current = null;};
  }, [data, colorBy]);

  const exportGraph = () => {
    const cy = instance.current;
    if (!cy) return;
    const link = document.createElement('a');
    link.href = cy.png({full: true, scale: 2, bg: '#ffffff', maxWidth: 1800, maxHeight: 1400});
    link.download = `observed-network-${data.root_gid ?? 'overview'}.png`;
    link.click();
  };

  return <div className="flex flex-col gap-3">
    <div className="relative h-[360px] overflow-hidden rounded-lg border bg-background sm:h-[440px]">
      <div ref={container} className="network-canvas h-full w-full" role="img" aria-label={`Directed network of ${data.nodes.length} entities and ${data.edges.length} transfer relationships. Use the account table for keyboard selection.`}/>
      <div className="absolute left-3 top-3 flex gap-1 rounded-lg border bg-background p-1" role="toolbar" aria-label="Graph controls">
        <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => instance.current?.zoom({level: (instance.current?.zoom() ?? 1) * 1.25, renderedPosition: {x: (container.current?.clientWidth ?? 0) / 2, y: (container.current?.clientHeight ?? 0) / 2}})}><PlusIcon/></Button>}/><TooltipContent>Zoom in</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => instance.current?.zoom((instance.current?.zoom() ?? 1) / 1.25)}><MinusIcon/></Button>}/><TooltipContent>Zoom out</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Fit graph to view" onClick={() => instance.current?.fit(undefined, 52)}><ArrowsOutSimpleIcon/></Button>}/><TooltipContent>Fit network</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Download network image" onClick={exportGraph}><DownloadSimpleIcon/></Button>}/><TooltipContent>Download PNG</TooltipContent></Tooltip>
      </div>
      {data.nodes.length === 1 && data.edges.length === 0 && <div className="absolute inset-x-4 bottom-4 text-center text-sm text-muted-foreground">No recorded transfers for this account.</div>}
    </div>
    {edge && <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm" role="status">
      <Badge variant="outline">Transfer evidence</Badge><strong className="tabular-nums">{edge.src}</strong><ArrowRightIcon className="size-4 text-muted-foreground"/><strong className="tabular-nums">{edge.dst}</strong><span className="ml-auto font-medium tabular-nums">{exactMoney(edge.sum_kzt)}</span><span className="text-muted-foreground">{number(edge.n_tx)} transfers</span>
      <Button variant="ghost" size="icon-sm" aria-label="Close transfer details" onClick={() => setEdge(null)}><XIcon/></Button>
    </div>}
    {colorBy === 'role' && <ul aria-label="Role color legend" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">{[...new Set(data.nodes.map(node => node.role))].sort().map(role => <li key={role} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{backgroundColor: roleColor(role)}}/>{roleLabel(role)}</li>)}</ul>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{colorBy === 'cluster' ? 'Colors identify communities' : 'Colors identify role hypotheses'}. Arrows show observed direction.</span><span>Drag to pan · scroll to zoom</span></div>
  </div>;
}
