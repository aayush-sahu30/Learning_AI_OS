"use client";

import React, { useState, useCallback, useMemo } from "react";
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
import {
  GitBranch,
  Sparkles,
  Loader2,
  RefreshCw,
  Info,
  X,
  PlusCircle,
  Maximize2,
  BookOpen,
} from "lucide-react";
import { VideoInfo } from "./VideoLecturePlayer";

export interface MindMapData {
  nodes: {
    id: string;
    label: string;
    explanation: string;
    depth: number;
    category?: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
}

interface MindMapTabProps {
  videoInfo: VideoInfo | null;
  youtubeUrl: string;
  mindMapData: MindMapData | null;
  onGenerate: () => Promise<void>;
  isLoading: boolean;
  onInsertIntoNotes: (html: string) => void;
}

const PALETTE = {
  root: {
    bg: "#F6EED9",
    border: "#C29227",
    color: "#2D221C",
  },
  concept: {
    bg: "#E8F2F2",
    border: "#236B6B",
    color: "#1A4F4F",
  },
  detail: {
    bg: "#FFFEFA",
    border: "#D6CEBF",
    color: "#3B2E25",
  },
};

export default function MindMapTab({
  videoInfo,
  youtubeUrl,
  mindMapData,
  onGenerate,
  isLoading,
  onInsertIntoNotes,
}: MindMapTabProps) {
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    explanation: string;
    category: string;
  } | null>(null);

  // Convert raw API mindmap data into React Flow nodes and edges
  const initialGraph = useMemo(() => {
    if (!mindMapData || !mindMapData.nodes || mindMapData.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    // Calculate node coordinates in radial or hierarchical layout
    const rootNode = mindMapData.nodes.find((n) => n.depth === 0) || mindMapData.nodes[0];
    const level1Nodes = mindMapData.nodes.filter((n) => n.depth === 1);
    const level2Nodes = mindMapData.nodes.filter((n) => n.depth >= 2);

    const centerX = 380;
    const centerY = 260;

    // Root node
    rfNodes.push({
      id: rootNode.id,
      position: { x: centerX, y: centerY },
      data: {
        label: rootNode.label,
        explanation: rootNode.explanation,
        category: "Central Topic",
      },
      style: {
        background: PALETTE.root.bg,
        border: `2px solid ${PALETTE.root.border}`,
        color: PALETTE.root.color,
        borderRadius: 14,
        padding: "10px 16px",
        fontWeight: 700,
        fontSize: 13,
        maxWidth: 200,
        boxShadow: "0 4px 12px rgba(194, 146, 39, 0.15)",
        textAlign: "center",
      },
    });

    // Level 1 Nodes (spaced radially around center)
    level1Nodes.forEach((node, i) => {
      const angle = (i / Math.max(1, level1Nodes.length)) * Math.PI * 2;
      const radius = 220;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      rfNodes.push({
        id: node.id,
        position: { x, y },
        data: {
          label: node.label,
          explanation: node.explanation,
          category: "Key Concept",
        },
        style: {
          background: PALETTE.concept.bg,
          border: `2px solid ${PALETTE.concept.border}`,
          color: PALETTE.concept.color,
          borderRadius: 12,
          padding: "8px 14px",
          fontWeight: 600,
          fontSize: 12,
          maxWidth: 160,
          boxShadow: "0 3px 10px rgba(35, 107, 107, 0.12)",
          textAlign: "center",
        },
      });
    });

    // Level 2 Nodes (outward from level 1)
    level2Nodes.forEach((node, i) => {
      const parentIndex = i % Math.max(1, level1Nodes.length);
      const baseAngle = (parentIndex / Math.max(1, level1Nodes.length)) * Math.PI * 2;
      const subOffset = ((i % 2 === 0 ? 0.35 : -0.35) * Math.PI) / 4;
      const angle = baseAngle + subOffset;
      const radius = 340;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      rfNodes.push({
        id: node.id,
        position: { x, y },
        data: {
          label: node.label,
          explanation: node.explanation,
          category: "Supporting Detail",
        },
        style: {
          background: PALETTE.detail.bg,
          border: `1.5px solid ${PALETTE.detail.border}`,
          color: PALETTE.detail.color,
          borderRadius: 10,
          padding: "6px 12px",
          fontWeight: 500,
          fontSize: 11,
          maxWidth: 150,
          boxShadow: "0 2px 8px rgba(45, 34, 28, 0.05)",
          textAlign: "center",
        },
      });
    });

    // Edges
    mindMapData.edges.forEach((edge) => {
      rfEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#236B6B",
        },
        style: {
          stroke: "#236B6B",
          strokeWidth: 1.5,
          opacity: 0.75,
        },
        labelStyle: {
          fill: "#5C4D43",
          fontWeight: 600,
          fontSize: 10,
        },
        labelBgStyle: {
          fill: "#FFFEFA",
          fillOpacity: 0.9,
          rx: 4,
          ry: 4,
        },
      });
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [mindMapData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);

  // Sync state when initialGraph recalculates
  React.useEffect(() => {
    setNodes(initialGraph.nodes);
    setEdges(initialGraph.edges);
    if (initialGraph.nodes.length > 0) {
      const root = initialGraph.nodes[0];
      setSelectedNode({
        id: root.id,
        label: (root.data as any).label,
        explanation: (root.data as any).explanation,
        category: (root.data as any).category,
      });
    }
  }, [initialGraph, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode({
      id: node.id,
      label: (node.data as any).label,
      explanation: (node.data as any).explanation,
      category: (node.data as any).category || "Concept",
    });
  }, []);

  const handleAddConceptToNotes = () => {
    if (!selectedNode) return;
    const html = `
      <blockquote>
        <strong>${selectedNode.label}</strong> (${selectedNode.category}):
        <p>${selectedNode.explanation}</p>
      </blockquote>
    `;
    onInsertIntoNotes(html);
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F6F0] p-4 overflow-hidden relative">
      {/* ─── Top Bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between pb-3 mb-3 border-b border-[#E8E2D5]">
        <div>
          <h2 className="text-sm font-bold text-[#2D221C] flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-[#236B6B]" />
            Interactive Concept Mind Map
          </h2>
          <p className="text-[11px] text-[#726257]">
            Visual concept nodes and relational edges. Click any node to inspect.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {nodes.length > 0 && (
            <span className="text-[11px] font-semibold text-[#1D5E5E] bg-[#E8F2F2] px-2.5 py-1 rounded-lg border border-[#B8D8D8]">
              {nodes.length} Nodes & {edges.length} Edges
            </span>
          )}

          <button
            onClick={onGenerate}
            disabled={!videoInfo || isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : nodes.length > 0 ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {nodes.length > 0 ? "Regenerate" : "Generate Mind Map"}
          </button>
        </div>
      </div>

      {/* ─── Canvas or Empty/Loading State ───────────────────────── */}
      <div className="flex-1 relative rounded-xl border border-[#E8E2D5] bg-[#FFFEFA] overflow-hidden shadow-xs">
        {nodes.length === 0 && !isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F2F2] border border-[#B8D8D8] flex items-center justify-center mb-3">
              <GitBranch className="w-6 h-6 text-[#236B6B]" />
            </div>
            <h3 className="text-sm font-bold text-[#2D221C] mb-1">
              No Mind Map Generated Yet
            </h3>
            <p className="text-xs text-[#726257] max-w-sm mb-4">
              Click "Generate Mind Map" to create a concept map from the lecture content. You can zoom, pan, rearrange nodes, and click concepts to inspect them.
            </p>
            <button
              onClick={onGenerate}
              disabled={!videoInfo}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Mind Map
            </button>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-[#FFFEFA]/90 z-20">
            <Loader2 className="w-8 h-8 text-[#236B6B] animate-spin mb-3" />
            <p className="text-xs font-semibold text-[#2D221C]">
              Constructing concept hierarchy...
            </p>
            <p className="text-[11px] text-[#726257] mt-1">
              Organizing nodes, relationships, and educational explanations
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            className="bg-[#F8F6F0]"
          >
            <Background color="#E8E2D5" gap={18} size={1} />
            <Controls className="!bg-[#FFFEFA] !border-[#E8E2D5] !rounded-xl !shadow-sm text-[#2D221C]" />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.category === "Central Topic") return "#C29227";
                if (n.data?.category === "Key Concept") return "#236B6B";
                return "#D6CEBF";
              }}
              className="!bg-[#FFFEFA] !border-[#E8E2D5] !rounded-xl overflow-hidden !shadow-sm"
            />
          </ReactFlow>
        )}

        {/* ─── Node Inspector Panel (Slide-in card when node clicked) ─── */}
        {selectedNode && nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 bg-[#FFFEFA] border border-[#E8E2D5] rounded-xl p-4 shadow-lg z-30 transition-all">
            <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-[#EFECE5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6615] bg-[#F6EED9] px-2 py-0.5 rounded-full border border-[#EADBBD]">
                  {selectedNode.category}
                </span>
                <h4 className="text-sm font-bold text-[#2D221C] mt-1">
                  {selectedNode.label}
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#9E8F84] hover:text-[#2D221C] p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-[#5C4D43] leading-relaxed mb-3">
              {selectedNode.explanation}
            </p>

            <div className="flex items-center justify-end">
              <button
                onClick={handleAddConceptToNotes}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#1D5E5E] bg-[#E8F2F2] hover:bg-[#D5E8E8] border border-[#B8D8D8] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#236B6B]" />
                Add Concept to Notes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
