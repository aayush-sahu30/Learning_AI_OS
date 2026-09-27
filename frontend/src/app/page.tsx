"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import LearnOSHeader from "@/components/LearnOSHeader";
import VideoLecturePlayer, {
  VideoInfo,
} from "@/components/VideoLecturePlayer";
import RichNotesEditor, {
  RichNotesEditorHandle,
} from "@/components/RichNotesEditor";
import AISummaryTab, { SummaryData } from "@/components/AISummaryTab";
import FlashcardsTab, { Flashcard } from "@/components/FlashcardsTab";
import MindMapTab, { MindMapData } from "@/components/MindMapTab";
import CodeWorkspaceTab from "@/components/CodeWorkspaceTab";
import {
  PenLine,
  Sparkles,
  Layers,
  GitBranch,
  Code2,
} from "lucide-react";

type WorkspaceTab = "notes" | "summary" | "flashcards" | "mindmap" | "code";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState<string>(
    "https://www.youtube.com/watch?v=aircAruvnKk"
  );
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("notes");

  // AI Content State
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState<boolean>(false);

  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const notesEditorRef = useRef<RichNotesEditorHandle>(null);

  // ─── Listen for YouTube player time updates ────────────────── #
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const data = JSON.parse(event.data);
        if (
          data.event === "infoDelivery" &&
          data.info?.currentTime !== undefined
        ) {
          setCurrentTime(data.info.currentTime);
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ─── Load Lecture ──────────────────────────────────────────── #
  const loadLecture = useCallback(
    async (urlOverride?: string) => {
      const targetUrl = (urlOverride || youtubeUrl).trim();
      if (!targetUrl) return;

      setIsLoadingVideo(true);
      setVideoError(null);
      setCurrentTime(0);

      try {
        const res = await fetch(`${API_BASE}/video/info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to load video");
        }

        const data: VideoInfo = await res.json();
        setVideoInfo(data);

        // Reset previous video's AI data
        setSummaryData(null);
        setFlashcards([]);
        setMindMapData(null);
      } catch (err: any) {
        setVideoError(
          err.message || "Could not load video. Please verify the URL."
        );
      } finally {
        setIsLoadingVideo(false);
      }
    },
    [youtubeUrl]
  );

  // Auto-load starter lecture on first mount for instant usability
  useEffect(() => {
    loadLecture("https://www.youtube.com/watch?v=aircAruvnKk");
  }, []);

  // ─── Seek in YouTube iframe ────────────────────────────────── #
  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
    }
  };

  // ─── AI Generation Handlers ────────────────────────────────── #
  const handleGenerateSummary = async () => {
    if (!videoInfo) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch(`${API_BASE}/video/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl,
          title: videoInfo.title,
          author: videoInfo.author,
          transcript: videoInfo.transcript,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data.summary);
      }
    } catch (e) {
      console.error("Summary generation error", e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateFlashcards = async (count: number, difficulty: string) => {
    if (!videoInfo) return;
    setIsGeneratingCards(true);
    try {
      const res = await fetch(`${API_BASE}/video/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl,
          title: videoInfo.title,
          transcript: videoInfo.transcript,
          count,
          difficulty,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.flashcards || []);
      }
    } catch (e) {
      console.error("Flashcards generation error", e);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleGenerateMindMap = async () => {
    if (!videoInfo) return;
    setIsGeneratingMindMap(true);
    try {
      const res = await fetch(`${API_BASE}/video/mindmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl,
          title: videoInfo.title,
          transcript: videoInfo.transcript,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMindMapData(data.mindmap || null);
      }
    } catch (e) {
      console.error("Mind map generation error", e);
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  const handleInsertIntoNotes = (html: string) => {
    if (notesEditorRef.current) {
      notesEditorRef.current.appendContent(html);
      setActiveTab("notes");
    }
  };

  const TABS: { id: WorkspaceTab; label: string; icon: React.FC<any> }[] = [
    { id: "notes", label: "Notes", icon: PenLine },
    { id: "summary", label: "AI Summary", icon: Sparkles },
    { id: "flashcards", label: "Flashcards", icon: Layers },
    { id: "mindmap", label: "Mind Map", icon: GitBranch },
    { id: "code", label: "Code", icon: Code2 },
  ];

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#F8F6F0] text-[#2D221C]">
      {/* ─── Top Brand & Workflow Header ───────────────────────── */}
      <LearnOSHeader
        currentVideoTitle={videoInfo?.title}
        isLectureLoaded={!!videoInfo}
      />

      {/* ─── Main Split-Screen Workspace ───────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ─── LEFT SIDE: YouTube Lecture Player ───────────────── */}
        <div className="w-full lg:w-[46%] xl:w-[44%] h-full border-r border-[#E8E2D5] overflow-hidden flex flex-col">
          <VideoLecturePlayer
            videoInfo={videoInfo}
            isLoading={isLoadingVideo}
            error={videoError}
            youtubeUrl={youtubeUrl}
            onUrlChange={setYoutubeUrl}
            onLoadLecture={loadLecture}
            currentTime={currentTime}
            onSeek={handleSeek}
            iframeRef={iframeRef}
          />
        </div>

        {/* ─── RIGHT SIDE: Workspace Tabs ──────────────────────── */}
        <div className="w-full lg:w-[54%] xl:w-[56%] h-full flex flex-col overflow-hidden bg-[#FFFEFA]">
          {/* Tab Navigation Header */}
          <div className="shrink-0 flex items-center justify-between px-3 border-b border-[#E8E2D5] bg-[#FFFEFA]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                    activeTab === id
                      ? "border-[#236B6B] text-[#236B6B]"
                      : "border-transparent text-[#726257] hover:text-[#2D221C] hover:border-[#D6CEBF]"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      activeTab === id ? "text-[#236B6B]" : "text-[#9E8F84]"
                    }`}
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="hidden sm:block text-[11px] font-medium text-[#8C6615] bg-[#F6EED9] px-2.5 py-0.5 rounded-full border border-[#EADBBD]">
              {activeTab === "notes" && "TipTap Editor"}
              {activeTab === "summary" && "Lecture Summary"}
              {activeTab === "flashcards" && "Active Recall"}
              {activeTab === "mindmap" && "React Flow"}
              {activeTab === "code" && "Monaco Workspace"}
            </div>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "notes" && (
              <div className="h-full p-4">
                <RichNotesEditor
                  ref={notesEditorRef}
                  videoId={videoInfo?.video_id}
                  videoTitle={videoInfo?.title}
                  placeholder={
                    videoInfo
                      ? `Take notes on "${videoInfo.title}"...`
                      : "Start typing your study notes..."
                  }
                  onOpenSummaryTab={() => setActiveTab("summary")}
                />
              </div>
            )}

            {activeTab === "summary" && (
              <AISummaryTab
                videoInfo={videoInfo}
                youtubeUrl={youtubeUrl}
                summaryData={summaryData}
                onGenerateSummary={handleGenerateSummary}
                isLoading={isGeneratingSummary}
                onInsertIntoNotes={handleInsertIntoNotes}
              />
            )}

            {activeTab === "flashcards" && (
              <FlashcardsTab
                videoInfo={videoInfo}
                youtubeUrl={youtubeUrl}
                cards={flashcards}
                onCardsChange={setFlashcards}
                onGenerate={handleGenerateFlashcards}
                isLoading={isGeneratingCards}
              />
            )}

            {activeTab === "mindmap" && (
              <MindMapTab
                videoInfo={videoInfo}
                youtubeUrl={youtubeUrl}
                mindMapData={mindMapData}
                onGenerate={handleGenerateMindMap}
                isLoading={isGeneratingMindMap}
                onInsertIntoNotes={handleInsertIntoNotes}
              />
            )}

            {activeTab === "code" && <CodeWorkspaceTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
