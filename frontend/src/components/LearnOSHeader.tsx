"use client";

import React from "react";
import { BookOpen, Sparkles, CheckCircle2, Video } from "lucide-react";

interface LearnOSHeaderProps {
  currentVideoTitle?: string;
  isLectureLoaded: boolean;
}

export default function LearnOSHeader({
  currentVideoTitle,
  isLectureLoaded,
}: LearnOSHeaderProps) {
  return (
    <header className="shrink-0 h-14 bg-[#FFFEFA] border-b border-[#E8E2D5] px-5 flex items-center justify-between shadow-[0_1px_6px_rgba(45,34,28,0.03)] z-20">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#236B6B] flex items-center justify-center text-white shadow-sm">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold tracking-tight text-[#2D221C]">
            Learn<span className="text-[#236B6B]">OS</span>
          </h1>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-[#8C6615] bg-[#F6EED9] px-2 py-0.5 rounded-full border border-[#EADBBD]">
            AI Learning OS
          </span>
        </div>
      </div>

      {/* Workflow Breadcrumb Indicator */}
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#F8F6F0] rounded-full border border-[#E8E2D5] text-xs font-semibold text-[#726257]">
        <span className="text-[#236B6B] flex items-center gap-1">
          <Video className="w-3 h-3" /> WATCH
        </span>
        <span className="text-[#B3A69A]">→</span>
        <span className="hover:text-[#236B6B] transition-colors">WRITE</span>
        <span className="text-[#B3A69A]">→</span>
        <span className="hover:text-[#236B6B] transition-colors">CODE</span>
        <span className="text-[#B3A69A]">→</span>
        <span className="text-[#8C6615] flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> REVISE
        </span>
      </div>

      {/* Lecture Status */}
      <div className="flex items-center gap-2">
        {isLectureLoaded ? (
          <div className="flex items-center gap-2 max-w-[280px] bg-[#E8F2F2] border border-[#B8D8D8] text-[#1D5E5E] px-3 py-1 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#236B6B] shrink-0" />
            <span className="truncate">{currentVideoTitle || "Lecture Loaded"}</span>
          </div>
        ) : (
          <div className="text-xs text-[#9E8F84] bg-[#F8F6F0] border border-[#E8E2D5] px-3 py-1 rounded-full">
            Paste a YouTube URL to begin
          </div>
        )}
      </div>
    </header>
  );
}
