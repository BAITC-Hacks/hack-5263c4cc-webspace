import {useEffect, useState} from 'react';
import {Activity, AlertTriangle, ArrowRight, Check, ChevronRight, CircleHelp, Download, GitBranch, LoaderCircle, RefreshCw, Search, ShieldCheck, Users, X} from 'lucide-react';
import type {CollectorReport, Dossier, ResilienceMetrics, ResilienceReport, SignalReport} from './api';
import {dateLabel, fetchApi, money, number, roleLabel, score} from './api';

function State({error, loading, retry}: {error?: string; loading?: boolean; retry?: () => void}) {
  if (error) return <div className="error-notice" role="alert"><AlertTriangle size={18}/><div><strong>Evidence check unavailable</strong><p>{error}</p>{retry && <button className="text-button" onClick={retry}><RefreshCw size={13}/>Try again</button>}</div></div>;
  if (loading) return <div className="loading-state" role="status"><LoaderCircle className="spin" size={20}/><span>Checking bounded evidence…</span></div>;
  return null;
}
function Path({gids, onSelect}: {gids: number[]; onSelect: (gid: number) => void}) {
  return <div className="entity-path" aria-label="Directed transfer path">{gids.map((gid, index) => <span key={`${gid}-${index}`}>{index > 0 && <ArrowRight size={11}/>}<button onClick={() => onSelect(gid)} className="mono">{gid}</button></span>)}</div>;
}
function Caveat({children}: {children: React.ReactNode}) {return <div className="signal-caveat"><CircleHelp size={15}/><p>{children}</p></div>;}
function Empty({children}: {children: React.ReactNode}) {return <p className="signal-empty"><Check size={14}/>{children}</p>;}

export function CohortPanel({selected, gids, setGids, onSelect}: {selected: number | null; gids: number[]; setGids: (gids: number[]) => void; onSelect: (gid: number) => void}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<CollectorReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setResult(null); setError('');
    if (!gids.length) {setLoading(false); return;}
    const controller = new AbortController(); setLoading(true);
    fetchApi<CollectorReport>(`/collectors?gids=${gids.join(',')}`, {signal: controller.signal}).then(setResult).catch(failure => {if (!controller.signal.aborted) setError(failure.message);}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [gids, revision]);
  function add() {
    const tokens = text.trim().split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) return;
    if (tokens.some(token => !/^\d+$/.test(token) || !Number.isSafeInteger(Number(token)))) {setError('Enter whole-number entity IDs, separated by commas.'); return;}
    const next = [...new Set([...gids, ...tokens.map(Number)])];
    if (next.length > 5) {setError('Choose up to five entities for this bounded comparison.'); return;}
    setGids(next); setText(''); setError('');
  }
  return <section className="cohort-panel" id="compare-entities">
    <div className="section-heading"><div><h2><Users size={16}/>Common collectors</h2><p>Trace converging paths from up to five entities.</p></div><span className="count-badge">{gids.length}/5</span></div>
    <form className="cohort-form" onSubmit={event => {event.preventDefault(); add();}}><label htmlFor="cohort-ids" className="sr-only">Entity IDs to compare</label><div className="search-box"><Search size={15}/><input id="cohort-ids" value={text} onChange={event => setText(event.target.value)} placeholder="Entity IDs, separated by commas" inputMode="numeric" maxLength={110}/></div><button className="primary-button" type="submit" disabled={!text.trim() || gids.length >= 5}>Add IDs</button></form>
    <div className="cohort-chips">{gids.map(gid => <span className="cohort-chip" key={gid}><button className="mono" onClick={() => onSelect(gid)}>{gid}</button><button aria-label={`Remove entity ${gid} from comparison`} onClick={() => setGids(gids.filter(value => value !== gid))}><X size={11}/></button></span>)}{selected !== null && !gids.includes(selected) && gids.length < 5 && <button className="text-button add-selected" onClick={() => setGids([...gids, selected])}>+ Add selected entity {selected}</button>}{!!gids.length && <button className="text-button clear-cohort" onClick={() => setGids([])}>Clear</button>}</div>
    <State error={error} loading={loading} retry={() => setRevision(value => value + 1)}/>
    {!loading && !error && result && <><div className="collector-results">{result.items.map(item => <article key={item.gid} className="collector-item"><div className="signal-row-heading"><button onClick={() => onSelect(item.gid)} className="text-button"><strong className="mono">{item.gid}</strong><ChevronRight size={13}/></button><span>{roleLabel(item.role)}</span><strong>{item.matched_sources}/{gids.length} sources</strong></div>{item.paths.map(path => <Path key={path.source_gid} gids={path.path} onSelect={onSelect}/>)}</article>)}</div>{!result.items.length && <Empty>No common downstream collector found within three hops.</Empty>}<Caveat>{result.caveat}{result.truncated ? ` Showing ${result.items.length} of ${number(result.total)} matches.` : ''}</Caveat></>}
    {!gids.length && <p className="signal-empty">Add known entity IDs to find shared downstream recipients. The assistant can use this same comparison.</p>}
  </section>;
}

export function SignalsPanel({gid, cohort, setCohort, onSelect}: {gid: number | null; cohort: number[]; setCohort: (gids: number[]) => void; onSelect: (gid: number) => void}) {
  const [data, setData] = useState<SignalReport | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState('');
  const [dossierError, setDossierError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setData(null); setDossier(null); setError(''); setDossierError('');
    if (gid === null) return;
    const controller = new AbortController();
    fetchApi<SignalReport>(`/signals/${gid}`, {signal: controller.signal}).then(setData).catch(failure => {if (!controller.signal.aborted) setError(failure.message);});
    fetchApi<Dossier>(`/dossier/${gid}`, {signal: controller.signal}).then(setDossier).catch(failure => {if (!controller.signal.aborted) setDossierError(failure.message);});
    return () => controller.abort();
  }, [gid, revision]);
  return <div className="signals-view">
    <div className="view-heading"><div><h2><Activity size={19}/>Signals worth a closer look</h2><p>Observed patterns for entity <strong className="mono">{gid ?? '—'}</strong>. Each signal is a lead to verify.</p></div><a className="text-button compare-shortcut" href="#compare-entities"><Users size={14}/>Compare entities</a>{gid !== null && <a className="secondary-button" href={`/api/dossier/${gid}?format=markdown`} download><Download size={14}/><span>Case dossier</span></a>}</div>
    {gid === null ? <div className="empty-inline">Select an entity in the review queue.</div> : <State error={error} loading={!data && !error} retry={() => setRevision(value => value + 1)}/>}
    {data && <>
      <section className="signal-section"><div className="section-heading"><div><h3>Timing and coordination</h3><p>Daily records, bounded to the observation window.</p></div><span className="signal-indicator"><strong>{score(data.temporal.overlap_2d_ratio)}%</strong> two-day overlap</span></div>
        <div className="signal-subsection"><h4>Unusual daily volume <span className="count-badge">{data.temporal.spikes.length}</span></h4>{data.temporal.spikes.length ? <div className="signal-table-wrap"><table className="signal-table"><thead><tr><th>Date</th><th>Volume</th><th>Daily baseline</th><th>Ratio</th></tr></thead><tbody>{data.temporal.spikes.map(spike => <tr key={spike.date}><td>{dateLabel(spike.date)}</td><td>{money(spike.total_kzt)}</td><td>{money(spike.baseline_median_kzt)}</td><td>{spike.ratio.toFixed(1)}×</td></tr>)}</tbody></table></div> : <Empty>No volume spikes above the configured threshold.</Empty>}</div>
        <div className="signal-subsection"><h4>Same-day incoming groups <span className="count-badge">{data.temporal.synchronized_inflows.length}</span></h4>{data.temporal.synchronized_inflows.map(group => <div className="sync-group" key={group.date}><div><strong>{dateLabel(group.date)}</strong><span>{group.payer_count} payers</span><strong>{money(group.sum_kzt)}</strong></div><div className="inline-entities">{group.payers.map(payer => <button key={payer} onClick={() => onSelect(payer)} className="mono">{payer}</button>)}</div></div>)}{!data.temporal.synchronized_inflows.length && <Empty>No same-day payer groups above the configured threshold.</Empty>}</div>
        <Caveat>{data.temporal.caveat}</Caveat>
      </section>
      <section className="signal-section"><div className="section-heading"><div><h3>Repeated two-step routes</h3><p>Visible A → B → C transfers repeated across distinct dates.</p></div><span className="count-badge">{data.routes.length}</span></div>{data.routes.map((route, index) => <article className="pattern-item" key={index}><Path gids={route.path} onSelect={onSelect}/><div className="pattern-meta"><span>{route.occurrence_count} matched occurrences</span><span>{route.distinct_start_dates} starting dates</span></div><details><summary>Inspect dated evidence</summary><div className="signal-table-wrap"><table className="signal-table"><thead><tr><th>Incoming date</th><th>Outgoing date</th><th>In / out</th><th>Lag</th></tr></thead><tbody>{route.occurrences.map((item, itemIndex) => <tr key={itemIndex}><td>{dateLabel(item.in_date)}</td><td>{dateLabel(item.out_date)}</td><td>{money(item.in_kzt)} / {money(item.out_kzt)}</td><td>{item.lag_days}d</td></tr>)}</tbody></table></div></details></article>)}{!data.routes.length && <Empty>No repeated two-step routes found within the bounded search.</Empty>}</section>
      <section className="signal-section"><div className="section-heading"><div><h3>Cycles and return paths</h3><p>Structural loops and any compatible dated sequence.</p></div><span className="count-badge">{data.cycles.length}</span></div>{data.cycles.map((cycle, index) => <article className="pattern-item" key={index}><Path gids={cycle.path} onSelect={onSelect}/><div className="pattern-meta"><span className={cycle.chronological_example ? 'status-positive' : ''}>{cycle.kind === 'date_consistent_cycle' ? 'Compatible dates, strictly ordered' : 'Structural loop only'}</span><span>{cycle.edges.length} directed steps</span></div><details><summary>Inspect cycle evidence</summary><div className="cycle-evidence">{cycle.edges.map((edge, edgeIndex) => <div key={edgeIndex}><span className="mono">{edge.src} → {edge.dst}</span><strong>{money(edge.sum_kzt)}</strong><span>{edge.dates.slice(0,5).map(day => dateLabel(day)).join(', ')}{edge.dates.length > 5 ? '…' : ''}</span></div>)}</div>{cycle.chronological_example && <p className="chronology-note">Compatible sequence: {cycle.chronological_example.map(edge => `${edge.src} → ${edge.dst} on ${dateLabel(edge.date)}`).join('; ')}.</p>}</details></article>)}{!data.cycles.length && <Empty>No short cycles found within the bounded search.</Empty>}</section>
      <section className="signal-section"><div className="section-heading"><div><h3>Additional anomalies</h3><p>Deterministic checks that make the review auditable.</p></div><span className="count-badge">{data.anomalies.length}</span></div>{data.anomalies.map(anomaly => <article className="anomaly-item" key={anomaly.id}><AlertTriangle size={14}/><div><h4>{anomaly.title}</h4><p>{anomaly.evidence}</p><details><summary>Measured values</summary><dl className="measured-values">{Object.entries(anomaly.metrics).map(([key,value]) => <div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{typeof value === 'number' ? number(value) : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details></div></article>)}{!data.anomalies.length && <Empty>No additional configured anomalies found.</Empty>}</section>
      <details className="signal-limits"><summary>Search bounds and interpretation limits</summary>{data.caveats.map((caveat,index) => <p key={index}>{caveat}</p>)}<dl className="measured-values">{Object.entries(data.limits).map(([key,value]) => <div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{String(value)}</dd></div>)}</dl></details>
    </>}
    <CohortPanel selected={gid} gids={cohort} setGids={setCohort} onSelect={onSelect}/>
    {dossierError && <State error={dossierError} retry={() => setRevision(value => value + 1)}/>}
    {dossier && <section className="signal-section dossier-section"><div className="section-heading"><div><h3><ShieldCheck size={16}/>What would resolve the uncertainty?</h3><p>Missing evidence and specific next requests.</p></div><a href={`/api/dossier/${gid}`} download={`dossier-${gid}.json`} className="text-button"><Download size={13}/>JSON</a></div><div className="missing-list">{dossier.missing_evidence.map((item,index) => <p key={index}><CircleHelp size={13}/>{item}</p>)}</div><ol className="next-requests">{dossier.next_requests.map((item,index) => <li key={index}><strong>{item.request}</strong><p>{item.reason}</p></li>)}</ol><details><summary>Evidence and hypotheses</summary><h4>Evidence</h4><ul>{dossier.evidence.map((item,index) => <li key={index}>{item}</li>)}</ul><h4>Hypotheses</h4><ul>{dossier.hypotheses.map((item,index) => <li key={index}>{item}</li>)}</ul></details></section>}
  </div>;
}

export function ResiliencePanel({onSelect}: {onSelect: (gid: number) => void}) {
  const [topN, setTopN] = useState(5);
  const [data, setData] = useState<ResilienceReport | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {const controller = new AbortController(); setData(null); setError(''); fetchApi<ResilienceReport>(`/resilience?top_n=${topN}`, {signal: controller.signal}).then(setData).catch(failure => {if (!controller.signal.aborted) setError(failure.message);}); return () => controller.abort();}, [topN,revision]);
  const metrics: {key: keyof ResilienceMetrics; label: string; explanation: string}[] = [
    {key:'nodes',label:'Visible entities',explanation:'Entities remaining in the observed graph.'},
    {key:'edges',label:'Transfer relationships',explanation:'Directed relationships remaining after removal.'},
    {key:'weak_components',label:'Disconnected groups',explanation:'Components when edge direction is ignored.'},
    {key:'largest_component_nodes',label:'Largest connected group',explanation:'Entities in the largest weakly connected component.'},
    {key:'reachable_seed_pairs',label:'Seed-to-entity reach',explanation:'Seed/entity pairs connected within four directed hops.'},
  ];
  return <div className="resilience-view"><div className="view-heading"><div><h2><GitBranch size={20}/>Test the network’s resilience</h2><p>Remove priority entities from a copy of the graph and compare connectivity.</p></div></div><section className="resilience-controls"><div><h3>Counterfactual removal</h3><p>This scenario preserves the original data and role assignments.</p></div><label htmlFor="remove-count">Remove top <select id="remove-count" value={topN} onChange={event => setTopN(Number(event.target.value))}>{[1,3,5,10,20].map(value => <option key={value} value={value}>{value}</option>)}</select> entities</label></section><State error={error} loading={!data && !error} retry={() => setRevision(value => value + 1)}/>{data && <><section className="resilience-results"><div className="resilience-table-heading"><span>Connectivity measure</span><span>Observed</span><span>After removal</span><span>Change</span></div>{metrics.map(metric => {const before = data.baseline[metric.key]; const after = data.after[metric.key]; const change = after-before; return <div className="resilience-metric" key={metric.key}><div><h3>{metric.label}</h3><p>{metric.explanation}</p></div><strong className="mono">{number(before)}</strong><strong className="mono">{number(after)}</strong><span className={`metric-change ${change ? 'has-change' : ''}`}>{change > 0 ? '+' : ''}{number(change)}</span></div>;})}<div className="resilience-visual"><div><span>Largest connected group</span><strong>{number(data.after.largest_component_nodes)} / {number(data.baseline.largest_component_nodes)} entities remain</strong></div><div className="resilience-bar"><span style={{width:`${data.baseline.largest_component_nodes ? data.after.largest_component_nodes/data.baseline.largest_component_nodes*100 : 0}%`}}/></div><p>Observed graph, before and after removal. This is not a forecast of real-world disruption.</p></div></section><section className="removed-entities"><h3>Entities removed in this scenario</h3><div className="inline-entities">{data.removed_gids.map((gid,index) => <button key={gid} onClick={() => onSelect(gid)}><span>{index+1}</span><strong className="mono">{gid}</strong><ChevronRight size={12}/></button>)}</div></section><Caveat>{data.caveat}</Caveat></>}</div>;
}
