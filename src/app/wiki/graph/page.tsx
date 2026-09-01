"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseApiError } from "@/lib/api";
import styles from "./WikiGraph.module.css";

type GraphNode = { id: string; title: string; page_type: string; tags: string[] };
type GraphEdge = { id: string; source: string; target: string; label: string };
type Point = { x: number; y: number };
const WIDTH = 1400, HEIGHT = 820;

function layout(nodes: GraphNode[]): Record<string, Point> {
  const positions: Record<string, Point> = {};
  const centerX = WIDTH / 2, centerY = HEIGHT / 2;
  nodes.forEach((node, index) => {
    const ring = Math.floor(index / 16) + 1;
    const inRing = index % 16;
    const count = Math.min(16, nodes.length - (ring - 1) * 16);
    const angle = (Math.PI * 2 * inRing) / Math.max(1, count) - Math.PI / 2;
    const radius = Math.min(340, 120 + ring * 105);
    positions[node.id] = { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });
  return positions;
}

function nodeColor(type: string) {
  if (type === "post_notes") return "#7c3aed";
  if (type === "manual") return "#2563eb";
  if (type.startsWith("html")) return "#ea580c";
  if (type === "video") return "#dc2626";
  return "#0f766e";
}

export default function WikiGraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("Related");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/wiki/graph?limit=500");
    if (!response.ok) throw new Error(parseApiError(await response.text()));
    const data = await response.json();
    const nextNodes = Array.isArray(data.nodes) ? data.nodes : [];
    setNodes(nextNodes); setEdges(Array.isArray(data.edges) ? data.edges : []);
    setPositions(layout(nextNodes));
    if (data.warning) setError(data.warning);
  }, []);

  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load graph.")); }, [load]);

  const degree = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((edge) => { counts[edge.source] = (counts[edge.source] || 0) + 1; counts[edge.target] = (counts[edge.target] || 0) + 1; });
    return counts;
  }, [edges]);
  const matches = useMemo(() => new Set(nodes.filter((node) => !query.trim() || node.title.toLowerCase().includes(query.trim().toLowerCase()) || node.tags.some((tag) => tag.toLowerCase().includes(query.trim().toLowerCase()))).map((node) => node.id)), [nodes, query]);

  const svgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint(); point.x = clientX; point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  };

  const connect = async () => {
    if (!source || !target || source === target) return;
    setStatus("Connecting pages…"); setError("");
    try {
      const response = await fetch("/api/wiki/graph/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_page_id: source, target_page_id: target, label }) });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      setStatus("Pages connected"); setTarget(""); await load();
    } catch (reason) { setStatus(""); setError(reason instanceof Error ? reason.message : "Could not connect pages."); }
  };

  return <main className={styles.page}>
    <header className={styles.header}><div><p><Link href="/wiki">← Wiki</Link></p><h1>Knowledge graph</h1><span>{nodes.length} pages · {edges.length} connections</span></div>
      <div className={styles.controls}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a page or tag…" /><button onClick={() => setZoom((value) => Math.max(.55, value - .15))}>−</button><strong>{Math.round(zoom * 100)}%</strong><button onClick={() => setZoom((value) => Math.min(1.8, value + .15))}>＋</button><button onClick={() => { setPositions(layout(nodes)); setZoom(1); }}>Reset</button></div>
    </header>
    <section className={styles.connect}><strong>Connect pages</strong><select value={source} onChange={(event) => setSource(event.target.value)}><option value="">From page…</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select><span>→</span><select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">To page…</option>{nodes.filter((node) => node.id !== source).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Relationship" maxLength={200} /><button onClick={() => void connect()} disabled={!source || !target || source === target}>Connect</button>{status ? <span>{status}</span> : null}</section>
    {error ? <p className={styles.error}>{error}</p> : null}
    <section className={styles.graphWrap}>
      {!nodes.length && !error ? <p className={styles.loading}>Loading graph…</p> : null}
      <svg ref={svgRef} className={styles.graph} viewBox={`${(WIDTH - WIDTH / zoom) / 2} ${(HEIGHT - HEIGHT / zoom) / 2} ${WIDTH / zoom} ${HEIGHT / zoom}`} onPointerMove={(event) => { const drag = dragRef.current; if (!drag) return; const point = svgPoint(event.clientX, event.clientY); setPositions((current) => ({ ...current, [drag.id]: { x: point.x - drag.dx, y: point.y - drag.dy } })); }} onPointerUp={() => { dragRef.current = null; }} onPointerLeave={() => { dragRef.current = null; }}>
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" /></marker></defs>
        <g className={styles.edges}>{edges.map((edge) => { const from = positions[edge.source], to = positions[edge.target]; if (!from || !to) return null; return <g key={edge.id}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd="url(#arrow)" /><title>{edge.label}</title></g>; })}</g>
        <g>{nodes.map((node) => { const point = positions[node.id]; if (!point) return null; const visible = matches.has(node.id); const radius = Math.min(34, 19 + (degree[node.id] || 0) * 1.8); return <g key={node.id} className={`${styles.node} ${visible ? "" : styles.dimmed}`} transform={`translate(${point.x} ${point.y})`} onPointerDown={(event) => { const pointAtClick = svgPoint(event.clientX, event.clientY); dragRef.current = { id: node.id, dx: pointAtClick.x - point.x, dy: pointAtClick.y - point.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onDoubleClick={() => { window.location.href = `/wiki/${node.id}`; }}><circle r={radius} fill={nodeColor(node.page_type)} /><text y={radius + 17}>{node.title.length > 28 ? `${node.title.slice(0, 27)}…` : node.title}</text><text className={styles.degree} y="4">{degree[node.id] || 0}</text><title>{node.title} — double-click to open; drag to move</title></g>; })}</g>
      </svg>
      <div className={styles.legend}><span><i style={{ background: "#7c3aed" }} />Post notes</span><span><i style={{ background: "#2563eb" }} />Paste notes</span><span><i style={{ background: "#ea580c" }} />HTML</span><span><i style={{ background: "#dc2626" }} />Video</span><small>Drag nodes · Double-click to open · Hover a line for its relationship</small></div>
    </section>
  </main>;
}
