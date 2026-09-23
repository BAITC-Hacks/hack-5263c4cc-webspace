import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, CircleHelp, Fingerprint, GitBranch, Layers, LoaderCircle, MessageSquare, Network, RefreshCw, Search, ShieldCheck, SlidersHorizontal, X, AlertTriangle, Database } from 'lucide-react';
import type { Cluster, NodeDetail, NodeSummary, Summary, GraphData } from './api';
import { compact, dateLabel, exactMoney, fetchApi, money, number, roleColor, roleLabel, score } from './api';
import { ResiliencePanel, SignalsPanel } from './SignalPanels';
import { Tabs } from '@base-ui/react/tabs';
import { Tooltip } from '@base-ui/react/tooltip';
import { ExportMenu, PriorityHelp } from './WorkspaceControls';
const NetworkGraph = lazy(() => import('./NetworkGraph'));
const AssistantPanel = lazy(() => import('./AssistantPanel').then(module => ({default: module.AssistantPanel})));

function ErrorNotice({message, retry}: {message: string; retry?: () => void}) {
  return <div className="error-notice" role="alert"><AlertTriangle size={19} /><div><strong>Unable to load evidence</strong><p>{message}</p>{retry && <button className="text-button" onClick={retry}><RefreshCw size={13} /> Try again</button>}</div></div>;
}

function Loading({label = 'Loading evidence…'}: {label?: string}) {return <div className="loading-state" role="status"><LoaderCircle size={20} className="spin" /><span>{label}</span></div>;}

function RoleTag({role}: {role: string}) {return <span className="role-tag"><span className="role-dot" style={{background: roleColor(role)}} />{roleLabel(role)}</span>;}

function QueueRow({node, selected, onSelect}: {node: NodeSummary; selected: boolean; onSelect: () => void}) {
  return <button className={`queue-row ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
    <span className="rank-number mono">{String(node.rank).padStart(2, '0')}</span>
    <span className="queue-entity"><span className="entity-id mono">{node.gid}{node.is_seed && <span className="seed-mini" title="Seed entity">◆</span>}</span><span className="queue-role">{roleLabel(node.role)}</span></span>
    <span className="queue-priority"><strong className="mono">{score(node.priority_score)}</strong><span className="priority-track"><span style={{width: `${score(node.priority_score)}%`, background: selected ? '#215742' : roleColor(node.role)}} /></span></span>
  </button>;
}

function Timeline({node}: {node: NodeDetail}) {
  const first = node.timeline[0]?.date;
  const last = node.timeline[node.timeline.length - 1]?.date;
  const span = first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 86_400_000) + 1 : 0;
  // Preserve true calendar spacing within a bounded year; longer windows disclose omitted gaps.
  const calendar = span > 0 && span <= 366;
  const observed = new Map(node.timeline.map(day => [day.date, day]));
  const days = calendar ? Array.from({length: span}, (_, index) => {
    const date = new Date(Date.parse(first!) + index * 86_400_000).toISOString().slice(0, 10);
    return observed.get(date) ?? {date, in_kzt: 0, out_kzt: 0};
  }) : node.timeline;
  const max = Math.max(1, ...node.timeline.flatMap(day => [day.in_kzt, day.out_kzt]));
  return <section className="timeline-panel" aria-labelledby="activity-title">
    <div className="section-heading"><div><h2 id="activity-title">Daily transfer activity</h2><p>Observed flows for entity <span className="mono">{node.gid}</span></p></div><div className="chart-key"><span><i className="in-key" /> Incoming</span><span><i className="out-key" /> Outgoing</span></div></div>
    {node.timeline.length ? <><div className="timeline-chart" aria-label="Daily incoming and outgoing transfer amounts">
      <div className="chart-guide"><span>{money(max)}</span><span>0</span></div>
      <div className="chart-columns">{days.map(day => <div className="day-column" key={day.date} tabIndex={0} aria-label={`${dateLabel(day.date)}: incoming ${exactMoney(day.in_kzt)}, outgoing ${exactMoney(day.out_kzt)}`}>
        <div className="day-bars"><span className="in-bar" style={{height: `${Math.max(day.in_kzt > 0 ? 2 : 0, day.in_kzt / max * 100)}%`}} /><span className="out-bar" style={{height: `${Math.max(day.out_kzt > 0 ? 2 : 0, day.out_kzt / max * 100)}%`}} /></div>
        <span className="day-tooltip"><strong>{dateLabel(day.date)}</strong><span>In {money(day.in_kzt)}</span><span>Out {money(day.out_kzt)}</span></span>
      </div>)}</div>
    </div><div className="chart-dates mono"><span>{dateLabel(node.timeline[0].date)}</span><span>{dateLabel(node.timeline[node.timeline.length - 1].date)}</span></div></> : <div className="empty-inline">No dated transfers in this observation window.</div>}
    <div className="timeline-footer"><span><strong>{number(node.metrics.active_days)}</strong> active days</span><span>{calendar ? 'Calendar days; gaps show no observed transfers.' : 'Active dates only; calendar gaps omitted.'} No intraday timing.</span></div>
  </section>;
}


function Evidence({node, onSelect}: {node: NodeDetail; onCluster: (id: number) => void; onSelect: (gid: number) => void}) {
  return <div className="evidence-content">
    <div className="role-hypothesis"><div><span className="field-label">Role hypothesis</span><RoleTag role={node.role} /></div><div className="rule-strength"><span className="mono">{score(node.role_score)}<small>/100</small></span><span>Rule strength</span></div></div>
    <p className="evidence-summary">{node.evidence}</p>
    <div className="metric-grid"><div><span><ArrowDownLeft size={13} /> Inflow</span><strong title={exactMoney(node.metrics.in_kzt)}>{money(node.metrics.in_kzt)}</strong><small>{number(node.metrics.in_degree)} payers / {number(node.metrics.in_tx)} transfers</small></div><div><span><ArrowUpRight size={13} /> Outflow</span><strong title={exactMoney(node.metrics.out_kzt)}>{money(node.metrics.out_kzt)}</strong><small>{number(node.metrics.out_degree)} recipients / {number(node.metrics.out_tx)} transfers</small></div></div>
    {(node.truncated_by_depth || node.limitations.length > 0) && <div className="observation-note"><CircleHelp size={16} /><div><strong>{node.truncated_by_depth ? 'The trail continues beyond this view' : node.observability.label || 'Observation limits'}</strong><p>{node.truncated_by_depth ? 'Depth 4 is the collection boundary. Missing outgoing transfers do not prove this is a final beneficiary.' : node.limitations[0]}</p></div></div>}
    <section className="evidence-section"><h3>Why review this entity</h3>{node.reasons.length ? node.reasons.map((reason, index) => <div className="reason-row" key={index}><span className="reason-marker" /><div><strong>{reason.label}<span>{reason.value}</span></strong><p>{reason.detail}</p></div></div>) : <p className="quiet-text">No strong role indicators in the visible network.</p>}</section>
    <details className="scoring-details"><summary>Priority score breakdown <span className="mono">{score(node.priority_score)}/100</span></summary><p>Relative review priority, not a probability of wrongdoing.</p>{node.score_factors.map((factor, index) => <div className="score-factor" key={index}><span>{factor.label}</span><span className="factor-bar"><i style={{width: `${Math.min(100, Math.max(0, factor.value * 100))}%`}} /></span><strong className="mono">{(factor.contribution * 100).toFixed(1)}</strong></div>)}</details>
    <section className="evidence-section counterparties"><h3>Largest observed counterparties</h3>{(['incoming', 'outgoing'] as const).map(direction => <div key={direction}><h4>{direction === 'incoming' ? 'Incoming from' : 'Outgoing to'}</h4>{node.counterparties[direction].slice(0, 4).map(party => <button key={party.gid} onClick={() => onSelect(party.gid)}><span className="mono">{party.gid}</span><span>{money(party.sum_kzt)}</span><ChevronRight size={13} /></button>)}{node.counterparties[direction].length === 0 && <p className="quiet-text">No observed {direction} transfers.</p>}</div>)}</section>
    <details className="all-limitations"><summary>Coverage and limitations</summary>{[...new Set([...node.limitations, ...(node.observability.notes ?? [])])].map((note, index) => <p key={index}>{note}</p>)}</details>
  </div>;
}

function Communities({clusters, error, loading, retry, onSelect}: {clusters: Cluster[]; error: string; loading: boolean; retry: () => void; onSelect: (cluster: Cluster) => void}) {
  return <section className="communities-panel"><div className="section-heading"><div><h2>Network communities</h2><p>Connected patterns to inspect, not established organizations.</p></div><span className="count-badge mono">{number(clusters.length)}</span></div><div className="community-list">{error ? <ErrorNotice message={error} retry={retry}/> : loading ? <Loading label="Loading communities…"/> : clusters.map(cluster => <button key={cluster.cluster_id} className="community-row" onClick={() => onSelect(cluster)}><span className="community-symbol"><Layers size={18} /></span><div><h3>Community {cluster.cluster_id}<ChevronRight size={14} /></h3><p>{cluster.hypothesis}</p><div className="community-meta"><span>{number(cluster.n_nodes)} entities</span><span>{number(cluster.n_seed)} seeds</span><strong>{money(cluster.sum_kzt_internal)} internal</strong></div></div></button>)}</div>{!error && !loading && clusters.length === 0 && <div className="empty-inline">No communities available for this dataset.</div>}</section>;
}

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [reload, setReload] = useState(0);
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [nodeTotal, setNodeTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [clusterFilter, setClusterFilter] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [detailError, setDetailError] = useState('');
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [graphError, setGraphError] = useState('');
  const [hops, setHops] = useState(1);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clustersError, setClustersError] = useState('');
  const [clustersLoading, setClustersLoading] = useState(true);
  const [view, setView] = useState<'network' | 'communities' | 'signals' | 'resilience'>('network');
  const [tab, setTab] = useState<'evidence' | 'copilot'>('evidence');
  const [assistantOpened, setAssistantOpened] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [colorBy, setColorBy] = useState<'role' | 'cluster'>('role');
  const [cohort, setCohort] = useState<number[]>([]);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.key === '/' && !(event.target instanceof HTMLElement && (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName) || event.target.isContentEditable))) {event.preventDefault(); searchInput.current?.focus();}
    }
    document.addEventListener('keydown', shortcut); return () => document.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {const timer = window.setTimeout(() => setSearch(query), 180); return () => window.clearTimeout(timer);}, [query]);
  useEffect(() => {
    const controller = new AbortController(); setSummaryError('');
    fetchApi<Summary>('/summary', {signal: controller.signal}).then(data => {setSummary(data); setSelected(current => current ?? data.top_nodes[0]?.gid ?? null);}).catch(error => {if (!controller.signal.aborted) setSummaryError(error.message);});
    setClustersLoading(true); setClustersError('');
    fetchApi<{items: Cluster[]}>('/clusters', {signal: controller.signal}).then(data => setClusters(data.items)).catch(error => {if (!controller.signal.aborted) setClustersError(error.message);}).finally(() => {if (!controller.signal.aborted) setClustersLoading(false);});
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController(); setQueueLoading(true); setQueueError('');
    const parameters = new URLSearchParams({limit: '120'}); if (search) parameters.set('query', search); if (role) parameters.set('role', role); if (clusterFilter !== null) parameters.set('cluster_id', String(clusterFilter));
    fetchApi<{items: NodeSummary[]; total: number}>(`/nodes?${parameters}`, {signal: controller.signal}).then(data => {setNodes(data.items); setNodeTotal(data.total); setSelected(current => current ?? data.items[0]?.gid ?? null);}).catch(error => {if (!controller.signal.aborted) setQueueError(error.message);}).finally(() => {if (!controller.signal.aborted) setQueueLoading(false);});
    return () => controller.abort();
  }, [search, role, clusterFilter, reload]);
  useEffect(() => {
    if (selected === null) return;
    const controller = new AbortController(); setDetail(null); setDetailError('');
    fetchApi<NodeDetail>(`/nodes/${selected}`, {signal: controller.signal}).then(setDetail).catch(error => {if (!controller.signal.aborted) setDetailError(error.message);});
    return () => controller.abort();
  }, [selected, reload]);
  useEffect(() => {
    if (selected === null) return;
    const controller = new AbortController(); setGraph(null); setGraphError('');
    fetchApi<GraphData>(`/graph?gid=${selected}&hops=${hops}&limit=180`, {signal: controller.signal}).then(setGraph).catch(error => {if (!controller.signal.aborted) setGraphError(error.message);});
    return () => controller.abort();
  }, [selected, hops, reload]);

  function selectNode(gid: number) {setSelected(gid); if (view === 'communities' || view === 'resilience') setView('network');}
  function selectCluster(cluster: Cluster) {setClusterFilter(cluster.cluster_id); setRole(''); setQuery(''); setView('network'); if (cluster.top_gids[0] !== undefined) setSelected(cluster.top_gids[0]);}

  return <Tooltip.Provider delay={450}><div className="app-shell">
    <a className="skip-link" href="#review-queue">Skip to review queue</a>
    <header className="app-header"><a className="brand" href="/" aria-label="EvidenceGraph home"><span className="brand-mark"><svg width="25" height="26" viewBox="0 0 32 32" aria-hidden="true"><path d="m7 8 18 8-18 8V8Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="7" cy="8" r="3.5" fill="currentColor"/><circle cx="25" cy="16" r="3.5" fill="#b8d99c"/><circle cx="7" cy="24" r="3.5" fill="currentColor"/></svg></span><span>Evidence<span className="brand-light">Graph</span><small>Financial investigation workspace</small></span></a>
      <nav className="main-nav" aria-label="Workspace"><button className={view === 'network' ? 'active' : ''} onClick={() => setView('network')}><Network size={16} />Investigation</button><button className={view === 'communities' ? 'active' : ''} onClick={() => setView('communities')}><Layers size={16} />Communities</button><button className={view === 'signals' ? 'active' : ''} onClick={() => setView('signals')}><Activity size={16}/>Signals</button><button className={view === 'resilience' ? 'active' : ''} onClick={() => setView('resilience')}><GitBranch size={16}/>Resilience</button></nav>
      <div className="header-actions">{summary && <span className="dataset-badge"><span />{summary.dataset.kind === 'synthetic' ? 'Synthetic demo' : 'Official dataset'}</span>}<ExportMenu selected={selected}/></div>
    </header>

    <div className="case-bar"><div className="case-title"><span className="case-symbol"><GitBranch size={19} /></span><div><h1>Transaction investigation</h1><p>{summary ? `${dateLabel(summary.period.start)} – ${dateLabel(summary.period.end, true)} / ${summary.dataset.name}` : 'Connecting to the investigation dataset…'}</p></div></div><div className="case-stats">{[{label: 'Entities', value: summary && number(summary.counts.nodes)}, {label: 'Transfers', value: summary && number(summary.counts.transactions)}, {label: 'Visible turnover', value: summary && money(summary.total_kzt)}, {label: 'Boundary entities', value: summary && number(summary.counts.boundary_nodes)}].map(item => <div key={item.label}><strong className="mono">{item.value ?? '—'}</strong><span>{item.label}</span></div>)}</div></div>
    {summaryError && <div className="global-error"><ErrorNotice message={summaryError} retry={() => setReload(value => value + 1)} /><p>Start the API server, then retry. No generated evidence is substituted for missing data.</p></div>}

    <main className="workspace">
      <aside className="review-queue" id="review-queue" aria-labelledby="queue-title"><div className="queue-heading"><div><h2 id="queue-title">Review queue</h2><span className="count-badge mono">{number(nodeTotal)}</span></div><p>Ranked by relative investigation priority</p></div><div className="queue-filters"><div className="search-box"><Search size={16} /><input ref={searchInput} aria-label="Search entity identifier" placeholder="Search entity ID…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={13} /></button>}<kbd>/</kbd></div><div className="role-filter"><SlidersHorizontal size={13} /><select aria-label="Filter by role hypothesis" value={role} onChange={event => setRole(event.target.value)}><option value="">All role hypotheses</option>{Object.keys(summary?.role_counts ?? {}).map(item => <option key={item} value={item}>{roleLabel(item)}</option>)}</select><ChevronDown size={12} /></div>{clusterFilter !== null && <button className="filter-chip" onClick={() => setClusterFilter(null)}>Community {clusterFilter}<X size={12} /></button>}</div><div className="queue-column-head"><span>Rank / Entity</span><span title="Heuristic score; not a probability">Priority <PriorityHelp/></span></div>
        <div className="queue-list" aria-busy={queueLoading}>{queueError ? <ErrorNotice message={queueError} retry={() => setReload(value => value + 1)} /> : queueLoading && nodes.length === 0 ? <Loading label="Loading queue…" /> : nodes.length ? nodes.map(node => <QueueRow key={node.gid} node={node} selected={selected === node.gid} onSelect={() => selectNode(node.gid)} />) : <div className="empty-queue"><Search size={22} /><strong>No matching entities</strong><p>Try another identifier or clear the active filters.</p><button className="text-button" onClick={() => {setQuery(''); setRole(''); setClusterFilter(null);}}>Clear filters</button></div>}</div><div className="queue-footer"><ShieldCheck size={13} /><span>Scores guide review. They do not establish guilt.</span>{nodeTotal > nodes.length && <small>Showing first {nodes.length}. Search or filter to narrow.</small>}</div></aside>

      <div className="analysis-main">{view === 'communities' ? <Communities clusters={clusters} error={clustersError} loading={clustersLoading} retry={() => setReload(value => value + 1)} onSelect={selectCluster} /> : view === 'signals' ? <SignalsPanel gid={selected} cohort={cohort} setCohort={setCohort} onSelect={selectNode}/> : view === 'resilience' ? <ResiliencePanel onSelect={selectNode}/> : <><section className="graph-panel" aria-labelledby="graph-title"><div className="graph-heading"><div><h2 id="graph-title">The visible money trail</h2><p>{graph ? `${number(graph.nodes.length)} entities / ${number(graph.edges.length)} directed relationships` : 'Exploring the selected entity’s neighbourhood'}</p></div><div className="graph-controls"><div className="graph-scope"><label htmlFor="graph-colors">Color</label><select id="graph-colors" value={colorBy} onChange={event => setColorBy(event.target.value as 'role' | 'cluster')}><option value="role">Role</option><option value="cluster">Community</option></select></div><div className="graph-scope"><label htmlFor="graph-hops">Scope</label><select id="graph-hops" value={hops} onChange={event => setHops(Number(event.target.value))}><option value={1}>1 hop</option><option value={2}>2 hops</option></select></div></div></div>
        <div className="graph-content">{graphError ? <ErrorNotice message={graphError} retry={() => setReload(value => value + 1)} /> : graph ? <Suspense fallback={<Loading label="Opening network view…"/>}><NetworkGraph data={graph} onSelect={selectNode} colorBy={colorBy}/></Suspense> : <Loading label={selected === null ? 'Waiting for an entity…' : 'Mapping observed transfers…'} />}</div>
        <div className="graph-legend"><span><i className="legend-seed" />Seed entity</span><span><i className="legend-boundary" />Depth 4 boundary</span><span><i className="legend-line" />Transfer direction</span><span className="graph-limit-label">{graph?.truncated ? 'Display limited to 180 entities' : 'Neighbourhood view'}</span></div>
        <div className="coverage-strip"><CircleHelp size={16} /><span>Observed up to four hops. Unseen transfers can change the interpretation.</span><button onClick={() => setShowLimits(value => !value)} aria-expanded={showLimits} aria-label="Show dataset observation limits"><ChevronDown size={15} className={showLimits ? 'rotated' : ''} /></button></div>{showLimits && <div className="dataset-limits">{summary?.limitations.map((limit, index) => <p key={index}>{limit}</p>)}</div>}
      </section>{detail && <Timeline node={detail} />}</>}
      <footer className="workspace-footer"><span><Database size={12} />{summary?.dataset.kind === 'synthetic' ? 'Synthetic demonstration data' : 'Local dataset'}<span className="footer-divider" />KZT / date-level records</span><span>{summary ? `Analysis ${compact(summary.runtime_ms)} ms` : 'Analysis loading'}</span></footer></div>

      <aside className="detail-panel" aria-label="Selected entity evidence"><div className="detail-heading"><span className="field-label">Selected entity</span><div><h2 className="mono">{selected ?? '—'}</h2>{detail && <span className="depth-label">Depth {detail.depth}{detail.is_seed && ' / Seed'}</span>}</div>{detail && <button className="community-link" onClick={() => {setView('communities');}}><Layers size={12} />Community {detail.cluster_id}<ChevronRight size={12} /></button>}</div><Tabs.Root className="detail-tabs-root" value={tab} onValueChange={value => {if (value === 'evidence' || value === 'copilot') {setTab(value); if (value === 'copilot') setAssistantOpened(true);}}}>
        <Tabs.List className="detail-tabs" aria-label="Entity analysis">
          <Tabs.Tab value="evidence"><Fingerprint size={14}/>Evidence</Tabs.Tab>
          <Tabs.Tab value="copilot"><MessageSquare size={14}/>Ask assistant</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="evidence" className="detail-body" keepMounted>
          {detailError ? <ErrorNotice message={detailError} retry={() => setReload(value => value + 1)}/> : detail ? <Evidence node={detail} onSelect={selectNode} onCluster={id => setClusterFilter(id)}/> : <Loading label={selected ? 'Loading entity evidence…' : 'Select an entity to inspect'}/>}
        </Tabs.Panel>
        <Tabs.Panel value="copilot" className="detail-body assistant-tab-body" keepMounted>
          {detailError ? <ErrorNotice message={detailError} retry={() => setReload(value => value + 1)}/> : detail && assistantOpened ? <Suspense fallback={<Loading label="Opening evidence assistant…"/>}><AssistantPanel gid={detail.gid} gids={cohort} onSelect={selectNode}/></Suspense> : null}
        </Tabs.Panel>
      </Tabs.Root></aside>
    </main>
  </div></Tooltip.Provider>;
}
