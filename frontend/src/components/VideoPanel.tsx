"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Play, Loader2, AlertCircle, Video, Clock, User,
  ExternalLink, ChevronRight, ChevronLeft, Sparkles, Maximize2,
} from "lucide-react";

interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

interface VideoInfo {
  video_id: string;
  title: string;
  author: string;
  thumbnail: string;
  embed_url: string;
  transcript: TranscriptEntry[];
}

interface VideoPanelProps {
  videoInfo: VideoInfo | null;
  isLoading: boolean;
  error: string | null;
  youtubeUrl: string;
  onUrlChange: (url: string) => void;
  onLoad: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
  activeTranscriptIndex: number;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Generate AI chapters from the transcript — groups into ~5 min segments */
function generateChapters(transcript: TranscriptEntry[]) {
  if (!transcript.length) return [];
  const chapters: { label: string; start: number; end: number }[] = [];
  const chunkSize = Math.max(1, Math.floor(transcript.length / 6));
  for (let i = 0; i < transcript.length; i += chunkSize) {
    const slice = transcript.slice(i, i + chunkSize);
    const words = slice
      .map((e) => e.text)
      .join(" ")
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 4)
      .map((w) => w.replace(/[^a-zA-Z0-9 ]/g, ""))
      .join(" ");
    chapters.push({
      label: words || `Part ${chapters.length + 1}`,
      start: slice[0].start,
      end: slice[slice.length - 1].start + slice[slice.length - 1].duration,
    });
  }
  return chapters;
}

type TranscriptTab = "transcript" | "summary" | "keyconcepts" | "questions";

export default function VideoPanel({
  videoInfo,
  isLoading,
  error,
  youtubeUrl,
  onUrlChange,
  onLoad,
  onSeek,
  currentTime,
  activeTranscriptIndex,
  iframeRef,
}: VideoPanelProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<HTMLDivElement>(null);
  const [transcriptTab, setTranscriptTab] = useState<TranscriptTab>("transcript");
  const [activeChapter, setActiveChapter] = useState(0);
  const [aiContent, setAiContent] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);

  const chapters = videoInfo ? generateChapters(videoInfo.transcript) : [];

  // Scroll active transcript line into view
  useEffect(() => {
    if (activeTranscriptIndex >= 0 && transcriptRef.current) {
      const el = transcriptRef.current.querySelector(`[data-idx="${activeTranscriptIndex}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeTranscriptIndex]);

  // Update active chapter
  useEffect(() => {
    if (!chapters.length) return;
    const idx = chapters.findIndex((c, i) => {
      const next = chapters[i + 1];
      return currentTime >= c.start && (!next || currentTime < next.start);
    });
    if (idx >= 0) setActiveChapter(idx);
  }, [currentTime, chapters.length]);

  const fetchAIContent = useCallback(async (tab: TranscriptTab) => {
    if (!videoInfo || tab === "transcript" || aiContent[tab]) return;
    setAiLoading(true);
    try {
      const endpoint = tab === "summary" ? "/video/notes" :
        tab === "keyconcepts" ? "/video/keyconcepts" : "/video/questions";
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiContent((prev) => ({ ...prev, [tab]: data.notes_html || data.content || "" }));
      }
    } catch {
      // stub fallback
      setAiContent((prev) => ({
        ...prev,
        [tab]: `<p class="text-gray-400 italic text-sm">AI content will appear here...</p>`,
      }));
    }
    setAiLoading(false);
  }, [videoInfo, aiContent, youtubeUrl]);

  const handleTabChange = (tab: TranscriptTab) => {
    setTranscriptTab(tab);
    fetchAIContent(tab);
  };

  const TABS: { id: TranscriptTab; label: string }[] = [
    { id: "transcript", label: "Transcript" },
    { id: "summary", label: "Summary" },
    { id: "keyconcepts", label: "Key Concepts" },
    { id: "questions", label: "Questions" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* URL Bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
        <button className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-orange-400 focus-within:bg-orange-50/30 transition-all">
          <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLoad()}
            placeholder="https://www.youtube.com/watch?v=aircAruvnKk"
            className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
        <button
          onClick={onLoad}
          disabled={isLoading || !youtubeUrl.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Load
        </button>
        <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Video embed */}
      <div className="shrink-0 relative bg-black" style={{ aspectRatio: "16/9" }}>
        {videoInfo ? (
          <iframe
            ref={iframeRef}
            src={`${videoInfo.embed_url}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={videoInfo.title}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-gray-900 to-gray-800">
            {error ? (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-red-400 text-sm max-w-xs">{error}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Video className="w-8 h-8 text-white/50" />
                </div>
                <p className="text-white/50 text-sm">Paste a YouTube URL above to start</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Chapters */}
      {videoInfo && chapters.length > 0 && (
        <div className="shrink-0 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2 px-4 pt-2 pb-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-orange-400" />
              AI Chapters
              <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[9px] font-bold">
                Generated
              </span>
            </div>
          </div>
          <div ref={chaptersRef} className="flex gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
            {chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => { onSeek(ch.start); setActiveChapter(i); }}
                className={`shrink-0 flex flex-col items-start px-3 py-1.5 rounded-xl text-left transition-all ${
                  i === activeChapter
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                <span className="text-[10px] font-mono opacity-70">{formatTime(ch.start)}</span>
                <span className="text-xs font-medium leading-tight max-w-[120px] line-clamp-1">{ch.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transcript tabs */}
      <div className="shrink-0 flex items-center gap-0 border-b border-gray-100 px-4 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              transcriptTab === tab.id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transcript / AI content */}
      <div ref={transcriptRef} className="flex-1 overflow-y-auto">
        {transcriptTab === "transcript" ? (
          <div className="p-2 space-y-0.5">
            {!videoInfo ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm italic">
                Transcript will appear once a video is loaded...
              </div>
            ) : videoInfo.transcript.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm italic">
                No transcript available for this video.
              </div>
            ) : (
              videoInfo.transcript.map((entry, i) => (
                <button
                  key={i}
                  data-idx={i}
                  onClick={() => onSeek(entry.start)}
                  className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-xl transition-all group ${
                    i === activeTranscriptIndex
                      ? "bg-orange-50 text-orange-800"
                      : "hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <span className={`shrink-0 text-[10px] font-mono mt-0.5 font-semibold ${
                    i === activeTranscriptIndex ? "text-orange-500" : "text-gray-300 group-hover:text-gray-400"
                  }`}>
                    {formatTime(entry.start)}
                  </span>
                  <span className="text-xs leading-relaxed">{entry.text}</span>
                  {i === activeTranscriptIndex && (
                    <ChevronRight className="shrink-0 w-3.5 h-3.5 text-orange-400 mt-0.5 ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="p-4">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                Generating with AI...
              </div>
            ) : aiContent[transcriptTab] ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: aiContent[transcriptTab] }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center text-gray-400">
                <Sparkles className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm">Load a video first to generate AI content</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
