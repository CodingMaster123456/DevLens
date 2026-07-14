'use client';

import { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

interface RawNode {
  id: string;
  label: string;
  functions: string[];
  classes: string[];
  imports: string[];
  stats: { functions: number; classes: number; imports: number };
}

interface Summary {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  totalImports: number;
  totalEdges: number;
  analysisTimeMs: number;
}

interface GraphData {
  nodes: RawNode[];
  edges: { source: string; target: string }[];
  summary: Summary;
}

export default function GraphPage() {
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [repoName, setRepoName] = useState('');
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<RawNode | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('devlens_graph');
    const name = sessionStorage.getItem('devlens_graph_repo');
    if (!raw) return;

    const graph: GraphData = JSON.parse(raw);
    setRepoName(name || '');
    setRawNodes(graph.nodes);
    setSummary(graph.summary);

    const cols = Math.ceil(Math.sqrt(graph.nodes.length));
    const nodes: Node[] = graph.nodes.map((n, i) => ({
      id: n.id,
      data: { label: n.label },
      position: { x: (i % cols) * 220, y: Math.floor(i / cols) * 120 },
      style: {
        fontSize: 12,
        padding: 8,
        borderRadius: 6,
        border: '1px solid #333',
        cursor: 'pointer',
      },
    }));

    const edges: Edge[] = graph.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
    }));

    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, []);

  const handleNodeClick = (_: any, node: Node) => {
    const found = rawNodes.find((n) => n.id === node.id);
    setSelected(found || null);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>{repoName} — Dependency Graph</h2>
        {summary && (
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: 13, color: '#555' }}>
            <span>Files: <strong>{summary.totalFiles}</strong></span>
            <span>Classes: <strong>{summary.totalClasses}</strong></span>
            <span>Functions: <strong>{summary.totalFunctions}</strong></span>
            <span>Imports: <strong>{summary.totalImports}</strong></span>
            <span>Edges: <strong>{summary.totalEdges}</strong></span>
            <span>Analysis time: <strong>{summary.analysisTimeMs}ms</strong></span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <ReactFlow nodes={flowNodes} edges={flowEdges} onNodeClick={handleNodeClick} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        {selected && (
          <div style={{ width: 300, borderLeft: '1px solid #eee', padding: '1.5rem', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{selected.label}</h3>
            <p style={{ color: '#999', fontSize: 12, wordBreak: 'break-all' }}>{selected.id}</p>

            <h4>Classes</h4>
            {selected.classes.length ? (
              <ul>{selected.classes.map((c) => <li key={c}>{c}</li>)}</ul>
            ) : (
              <p style={{ color: '#aaa' }}>None</p>
            )}

            <h4>Functions</h4>
            {selected.functions.length ? (
              <ul>{selected.functions.map((f) => <li key={f}>{f}()</li>)}</ul>
            ) : (
              <p style={{ color: '#aaa' }}>None</p>
            )}

            <h4>Imports</h4>
            {selected.imports.length ? (
              <ul>{selected.imports.map((imp) => <li key={imp} style={{ fontSize: 12 }}>{imp}</li>)}</ul>
            ) : (
              <p style={{ color: '#aaa' }}>None</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
