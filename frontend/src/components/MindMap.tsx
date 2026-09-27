"use client";

import { useCallback, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, GitBranch, RefreshCw, Download } from "lucide-react";

interface TranscriptEntry { text: string; start: number; duration: number; }
interface VideoInfo {
  video_id: string;
  title: string;
  author: string;
  transcript: TranscriptEntry[];
}

interface MindMapProps {
  videoInfo: VideoInfo | null;
  youtubeUrl: string;
}

// ─── Node colours by depth ──────────────────────────────────── //
const NODE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: "#f97316", border: "#ea580c", text: "#fff" },
  1: { bg: "#6366f1", border: "#4f46e5", text: "#fff" },
  2: { bg: "#22c55e", border: "#16a34a", text: "#fff" },
  3: { bg: "#f59e0b", border: "#d97706", text: "#fff" },
};

// ─── Build nodes + edges from topic list ───────────────────── //
function buildGraph(
  topics: { label: string; parent: number | null; depth: number }[],
  centerTitle: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Root
  nodes.push({
    id: "root",
    position: { x: 400, y: 300 },
    data: { label: centerTitle },
    style: {
      background: NODE_COLORS[0].bg,
      border: `2px solid ${NODE_COLORS[0].border}`,
      color: NODE_COLORS[0].text,
      borderRadius: 12,
      padding: "10px 18px",
      fontWeight: 700,
      fontSize: 13,
      maxWidth: 180,
    },
  });

  const childCountByParent: Record<string, number> = {};

  topics.forEach((topic, i) => {
    const parentId = topic.parent === null ? "root" : `node-${topic.parent}`;
    const key = parentId;
    childCountByParent[key] = (childCountByParent[key] || 0) + 1;
  });

  const angleByParent: Record<string, number> = {};
  const countByParent: Record<string, number> = {};

  topics.forEach((topic, i) => {
    const nodeId = `node-${i}`;
    const parentId = topic.parent === null ? "root" : `node-${topic.parent}`;
    const color = NODE_COLORS[Math.min(topic.depth, 3)];

    // Distribute children around parent
    const siblings = childCountByParent[parentId] || 1;
    const idx = countByParent[parentId] || 0;
    countByParent[parentId] = idx + 1;

    const baseAngle = angleByParent[parentId] ?? (Math.PI * 0.1);
    const spread = Math.PI * 1.6;
    const angle = baseAngle + (idx / siblings) * spread - spread / 2;
    const radius = 200 - topic.depth * 30;

    const parentNode = nodes.find((n) => n.id === parentId);
    const px = parentNode ? (parentNode.position.x as number) : 400;
    const py = parentNode ? (parentNode.position.y as number) : 300;

    nodes.push({
      id: nodeId,
      position: {
        x: px + Math.cos(angle) * radius,
        y: py + Math.sin(angle) * radius,
      },
      data: { label: topic.label },
      style: {
        background: color.bg,
        border: `2px solid ${color.border}`,
        color: color.text,
        borderRadius: 10,
        padding: "6px 12px",
        fontWeight: 600,
        fontSize: 11,
        maxWidth: 140,
      },
    });

    edges.push({
      id: `e-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: color.border },
      style: { stroke: color.border, strokeWidth: 1.5, opacity: 0.7 },
      animated: topic.depth === 1,
    });
  });

  return { nodes, edges };
}

// ─── Extract topics from transcript ────────────────────────── //
function extractTopicsLocally(transcript: TranscriptEntry[], title: string) {
  const text = transcript.map((e) => e.text).join(" ");
  // Pull capitalized noun phrases (simple heuristic)
  const phrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  const freq: Record<string, number> = {};
  for (const p of phrases) {
    if (p.length < 4 || p.length > 40) continue;
    freq[p] = (freq[p] || 0) + 1;
  }
  const sorted = Object.entries(freq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([label]) => label);

  // Build hierarchy: first 4 are level-1, rest are level-2
  const topics: { label: string; parent: number | null; depth: number }[] = [];
  sorted.slice(0, 4).forEach((label) => topics.push({ label, parent: null, depth: 1 }));
  sorted.slice(4).forEach((label, i) => {
    topics.push({ label, parent: i % 4, depth: 2 });
  });
  return topics;
}

export default function MindMap({ videoInfo, youtubeUrl }: MindMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const generate = async () => {
    if (!videoInfo) return;
    setLoading(true);
    try {
      // Try backend first
      const res = await fetch("http://localhost:8000/video/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const { nodes: n, edges: e } = buildGraph(data.topics, videoInfo.title);
        setNodes(n);
        setEdges(e);
      } else {
        throw new Error("fallback");
      }
    } catch {
      // Local fallback
      const topics = extractTopicsLocally(videoInfo.transcript, videoInfo.title);
      const { nodes: n, edges: e } = buildGraph(topics, videoInfo.title);
      setNodes(n);
      setEdges(e);
    }
    setLoading(false);
    setGenerated(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500">
          {generated ? `${nodes.length} concepts` : "Mind map not generated yet"}
        </span>
        <div className="flex items-center gap-2">
          {generated && (
            <button
              onClick={generate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
          )}
          <button
            onClick={generate}
            disabled={!videoInfo || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
            Generate Mind Map
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {!generated ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
              <GitBranch className="w-8 h-8 text-violet-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">No mind map yet</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Load a video and click "Generate Mind Map" to visualize the key concepts.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="bg-gray-50"
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls className="shadow-sm" />
            <MiniMap
              nodeColor={(n) => (n.style?.background as string) ?? "#6366f1"}
              className="shadow-sm rounded-xl overflow-hidden border border-gray-200"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
