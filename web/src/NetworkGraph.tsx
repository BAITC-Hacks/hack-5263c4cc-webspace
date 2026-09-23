import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Focus, Minus, Plus, X } from 'lucide-react';
import type { GraphData, GraphEdge } from './api';
import { exactMoney, number, roleColor } from './api';

interface Props {data: GraphData; onSelect: (gid: number) => void; colorBy?: 'role' | 'cluster'}
const communityColors = ['#327157','#527e9b','#a67842','#846497','#467f85','#9e6760','#758550','#617398','#966b85','#5d8273'];

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
          label: 'data(label)', color: '#4c5e53', 'font-family': 'ui-monospace, monospace',
          'font-size': 9, 'text-valign': 'bottom', 'text-margin-y': 6,
          'border-width': 2, 'border-color': '#fff', 'text-background-color': '#fbfcf8',
          'text-background-opacity': .85, 'text-background-padding': '2px',
        }},
        {selector: '.seed', style: {shape: 'diamond', 'border-width': 2}},
        {selector: '.boundary', style: {shape: 'octagon', 'border-style': 'dashed', 'border-width': 2, 'border-color': '#9b6e3c', 'background-opacity': .65}},
        {selector: '.root', style: {'border-width': 4, 'border-color': '#b3cdae', 'font-weight': 'bold', 'font-size': 11, 'text-margin-y': 9}},
        {selector: 'edge', style: {'curve-style': 'bezier', width: 'data(width)', 'line-color': '#bccbc0', 'target-arrow-color': '#8d9f92', 'target-arrow-shape': 'triangle', 'arrow-scale': .9, opacity: .72}},
        {selector: 'edge:selected', style: {'line-color': '#215742', 'target-arrow-color': '#215742', width: 3, opacity: 1}},
        {selector: 'node:selected', style: {'border-color': '#102f23', 'border-width': 3}},
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

  return <div className="network-stage">
    <div ref={container} className="network-canvas" role="img" aria-label={`Directed network of ${data.nodes.length} entities and ${data.edges.length} transfer relationships. Select entities in the review queue for keyboard access.`} />
    <div className="graph-tools" aria-label="Graph controls">
      <button aria-label="Zoom in" onClick={() => instance.current?.zoom({level: (instance.current?.zoom() ?? 1) * 1.25, renderedPosition: {x: (container.current?.clientWidth ?? 0) / 2, y: (container.current?.clientHeight ?? 0) / 2}})}><Plus size={16} /></button>
      <button aria-label="Zoom out" onClick={() => instance.current?.zoom((instance.current?.zoom() ?? 1) / 1.25)}><Minus size={16} /></button>
      <button aria-label="Fit graph to view" onClick={() => instance.current?.fit(undefined, 52)}><Focus size={16} /></button>
    </div>
    <div className="graph-scale">{colorBy === 'cluster' ? 'Colors show network communities' : 'Colors show role hypotheses'} / Select an entity</div>
    {edge && <div className="edge-preview" role="status">
      <div><span className="mono">{edge.src}</span><span className="transfer-direction" aria-label="to">→</span><span className="mono">{edge.dst}</span><strong>{exactMoney(edge.sum_kzt)}</strong><small>{number(edge.n_tx)} transfers</small></div>
      <button className="icon-button" aria-label="Close transfer details" onClick={() => setEdge(null)}><X size={15} /></button>
    </div>}
    {data.nodes.length === 1 && data.edges.length === 0 && <div className="isolated-label">No observed transfers for this entity.</div>}
  </div>;
}
