"use client";

import React, { useState } from "react";
import {
  Sparkles,
  BookOpen,
  CheckCircle,
  FileText,
  Copy,
  PlusCircle,
  Loader2,
  RefreshCw,
  Lightbulb,
  Tag,
} from "lucide-react";
import { VideoInfo } from "./VideoLecturePlayer";

export interface SummaryData {
  overview: string;
  key_concepts: { concept: string; description: string }[];
  important_points: string[];
  definitions: { term: string; definition: string }[];
}

interface AISummaryTabProps {
  videoInfo: VideoInfo | null;
  youtubeUrl: string;
  summaryData: SummaryData | null;
  onGenerateSummary: () => Promise<void>;
  isLoading: boolean;
  onInsertIntoNotes: (html: string) => void;
}

export default function AISummaryTab({
  videoInfo,
  youtubeUrl,
  summaryData,
  onGenerateSummary,
  isLoading,
  onInsertIntoNotes,
}: AISummaryTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    if (!summaryData) return;
    const markdown = `# Summary: ${videoInfo?.title || "Lecture"}\n\n## Overview\n${summaryData.overview}\n\n## Key Concepts\n${summaryData.key_concepts.map((c) => `- **${c.concept}**: ${c.description}`).join("\n")}\n\n## Important Points\n${summaryData.important_points.map((p) => `- ${p}`).join("\n")}\n\n## Definitions\n${summaryData.definitions.map((d) => `- **${d.term}**: ${d.definition}`).join("\n")}`;
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToNotes = () => {
    if (!summaryData) return;
    const html = `
      <h2>AI Summary: ${videoInfo?.title || "Lecture"}</h2>
      <p><strong>Overview:</strong> ${summaryData.overview}</p>
      <h3>Key Concepts</h3>
      <ul>
        ${summaryData.key_concepts.map((c) => `<li><strong>${c.concept}:</strong> ${c.description}</li>`).join("")}
      </ul>
      <h3>Important Points</h3>
      <ul>
        ${summaryData.important_points.map((p) => `<li>${p}</li>`).join("")}
      </ul>
      <h3>Definitions</h3>
      <ul>
        ${summaryData.definitions.map((d) => `<li><strong>${d.term}:</strong> ${d.definition}</li>`).join("")}
      </ul>
    `;
    onInsertIntoNotes(html);
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F6F0] p-4 overflow-y-auto">
      {/* Action Header */}
      <div className="shrink-0 flex items-center justify-between pb-3 mb-3 border-b border-[#E8E2D5]">
        <div>
          <h2 className="text-sm font-bold text-[#2D221C] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#8C6615]" />
            AI Lecture Summary
          </h2>
          <p className="text-[11px] text-[#726257]">
            Concise overview, key concepts, high-yield points, and definitions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {summaryData && (
            <>
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#5C4D43] bg-[#FFFEFA] hover:bg-[#F2EDE2] border border-[#E8E2D5] rounded-xl transition-colors cursor-pointer"
                title="Copy as markdown"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleSendToNotes}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1D5E5E] bg-[#E8F2F2] hover:bg-[#D5E8E8] border border-[#B8D8D8] rounded-xl transition-colors cursor-pointer"
                title="Insert full summary into TipTap notes"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#236B6B]" />
                Add to Notes
              </button>
            </>
          )}

          <button
            onClick={onGenerateSummary}
            disabled={!videoInfo || isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : summaryData ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {summaryData ? "Regenerate" : "Generate Summary"}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!summaryData && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FFFEFA] rounded-xl border border-[#E8E2D5]">
          <div className="w-12 h-12 rounded-2xl bg-[#F6EED9] border border-[#EADBBD] flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6 text-[#8C6615]" />
          </div>
          <h3 className="text-sm font-bold text-[#2D221C] mb-1">
            No Summary Generated Yet
          </h3>
          <p className="text-xs text-[#726257] max-w-sm mb-4">
            Load a YouTube lecture on the left, then click "Generate Summary" to extract an overview, key concepts, points, and definitions.
          </p>
          <button
            onClick={onGenerateSummary}
            disabled={!videoInfo}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Lecture Summary
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#FFFEFA] rounded-xl border border-[#E8E2D5]">
          <Loader2 className="w-8 h-8 text-[#236B6B] animate-spin mb-3" />
          <p className="text-xs font-semibold text-[#2D221C]">
            Analyzing lecture transcript...
          </p>
          <p className="text-[11px] text-[#726257] mt-1">
            Synthesizing core overview, concepts, points, and definitions
          </p>
        </div>
      ) : summaryData ? (
        <div className="space-y-4">
          {/* 1. Overview */}
          <div className="learnos-card p-4 bg-[#FFFEFA]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#EFECE5]">
              <FileText className="w-4 h-4 text-[#236B6B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D221C]">
                1. Lecture Overview
              </h3>
            </div>
            <p className="text-xs text-[#382C24] leading-relaxed">
              {summaryData.overview}
            </p>
          </div>

          {/* 2. Key Concepts */}
          <div className="learnos-card p-4 bg-[#FFFEFA]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#EFECE5]">
              <Lightbulb className="w-4 h-4 text-[#8C6615]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D221C]">
                2. Key Concepts
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {summaryData.key_concepts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5]"
                >
                  <h4 className="text-xs font-bold text-[#236B6B] mb-1">
                    {item.concept}
                  </h4>
                  <p className="text-[11px] text-[#5C4D43] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Important Points */}
          <div className="learnos-card p-4 bg-[#FFFEFA]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#EFECE5]">
              <CheckCircle className="w-4 h-4 text-[#236B6B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D221C]">
                3. Important Points & Takeaways
              </h3>
            </div>
            <ul className="space-y-2">
              {summaryData.important_points.map((pt, idx) => (
                <li
                  key={idx}
                  className="text-xs text-[#382C24] flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="w-4 h-4 rounded-full bg-[#F6EED9] text-[#8C6615] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-[#EADBBD]">
                    {idx + 1}
                  </span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Definitions */}
          <div className="learnos-card p-4 bg-[#FFFEFA]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#EFECE5]">
              <Tag className="w-4 h-4 text-[#8C6615]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D221C]">
                4. Key Terminology & Definitions
              </h3>
            </div>
            <div className="space-y-2">
              {summaryData.definitions.map((def, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E8E2D5] flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#2D221C]">
                      {def.term}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-[#1D5E5E] bg-[#E8F2F2] px-1.5 py-0.5 rounded border border-[#B8D8D8]">
                      Definition
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C4D43] leading-relaxed">
                    {def.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
