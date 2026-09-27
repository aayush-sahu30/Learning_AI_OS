"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  Video,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export interface VideoInfo {
  video_id: string;
  title: string;
  author: string;
  thumbnail: string;
  embed_url: string;
  transcript: TranscriptEntry[];
}

interface VideoLecturePlayerProps {
  videoInfo: VideoInfo | null;
  isLoading: boolean;
  error: string | null;
  youtubeUrl: string;
  onUrlChange: (url: string) => void;
  onLoadLecture: (urlOverride?: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

const SAMPLE_LECTURES = [
  {
    name: "Neural Networks (3B1B)",
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
  },
  {
    name: "Python in 100s",
    url: "https://www.youtube.com/watch?v=x7X9w_GIm1s",
  },
  {
    name: "C++ in 100s",
    url: "https://www.youtube.com/watch?v=MNeX4EGtR5Y",
  },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function VideoLecturePlayer({
  videoInfo,
  isLoading,
  error,
  youtubeUrl,
  onUrlChange,
  onLoadLecture,
  currentTime,
  onSeek,
  iframeRef,
}: VideoLecturePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Send command to YouTube iframe via postMessage
  const sendIframeCommand = useCallback(
    (func: string, args: any[] = []) => {
      if (!iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    },
    [iframeRef]
  );

  const togglePlay = () => {
    if (isPlaying) {
      sendIframeCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendIframeCommand("playVideo");
      setIsPlaying(true);
    }
  };

  const seekRelative = (deltaSeconds: number) => {
    const nextTime = Math.max(0, currentTime + deltaSeconds);
    onSeek(nextTime);
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    sendIframeCommand("setPlaybackRate", [rate]);
    setShowSpeedMenu(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      sendIframeCommand("unMute");
      setIsMuted(false);
    } else {
      sendIframeCommand("mute");
      setIsMuted(true);
    }
  };

  // Estimate total duration from last transcript item
  const totalDuration = videoInfo?.transcript?.length
    ? Math.max(
        ...videoInfo.transcript.map((t) => t.start + t.duration),
        currentTime
      )
    : 0;

  return (
    <div className="h-full flex flex-col bg-[#F8F6F0] p-4 overflow-y-auto">
      {/* ─── 1. YouTube URL Input & Load Lecture ─────────────────── */}
      <div className="learnos-card p-3 mb-3 bg-[#FFFEFA]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-[#F8F6F0] border border-[#E8E2D5] rounded-xl px-3 py-2 focus-within:border-[#236B6B] focus-within:ring-1 focus-within:ring-[#236B6B] transition-all">
            <Video className="w-4 h-4 text-red-600 shrink-0 mr-2" />
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onLoadLecture()}
              placeholder="Paste YouTube lecture URL..."
              className="w-full bg-transparent text-xs text-[#2D221C] placeholder-[#9E8F84] outline-none"
            />
          </div>
          <button
            onClick={() => onLoadLecture()}
            disabled={isLoading || !youtubeUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Load Lecture
          </button>
        </div>

        {/* Quick sample chips */}
        <div className="mt-2.5 pt-2 border-t border-[#EFECE5] flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-[#726257] mr-1">
            Samples:
          </span>
          {SAMPLE_LECTURES.map((sample) => (
            <button
              key={sample.name}
              onClick={() => {
                onUrlChange(sample.url);
                onLoadLecture(sample.url);
              }}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F2EDE2] text-[#5C4D43] hover:bg-[#EADBBD] hover:text-[#2D221C] transition-colors border border-[#E8E2D5]"
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── 2. Embedded YouTube Player & Video Controls ──────────── */}
      <div className="learnos-card overflow-hidden flex flex-col mb-3 bg-[#FFFEFA]">
        {/* Video Player Container (16:9) */}
        <div className="relative w-full aspect-video bg-[#1F1915] overflow-hidden flex items-center justify-center">
          {videoInfo ? (
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${videoInfo.video_id}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&rel=0`}
              title={videoInfo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-[#B3A69A]">
              <div className="w-12 h-12 rounded-2xl bg-[#2D241E] flex items-center justify-center mb-2">
                <Video className="w-6 h-6 text-[#8C6615]" />
              </div>
              <p className="text-xs font-medium text-[#DCD4CB]">
                No lecture loaded yet
              </p>
              <p className="text-[11px] text-[#8E7E73] mt-0.5">
                Load a video above to begin watching and studying
              </p>
            </div>
          )}
        </div>

        {/* Lecture Title & Author */}
        <div className="p-3 border-b border-[#E8E2D5] bg-[#FFFEFA]">
          <h2 className="text-sm font-bold text-[#2D221C] leading-snug line-clamp-2">
            {videoInfo?.title || "Welcome to LearnOS"}
          </h2>
          <div className="flex items-center justify-between mt-1 text-[11px] text-[#726257]">
            <span>{videoInfo?.author || "Choose a lecture to start"}</span>
            {videoInfo && (
              <a
                href={`https://www.youtube.com/watch?v=${videoInfo.video_id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#236B6B] hover:underline"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Basic Video Controls Bar */}
        <div className="p-2.5 bg-[#FAF7F2] flex items-center justify-between gap-2 border-t border-[#E8E2D5]">
          {/* Left: Play/Pause & Seeks */}
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlay}
              disabled={!videoInfo}
              title={isPlaying ? "Pause" : "Play"}
              className="w-8 h-8 rounded-lg bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-xs"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => seekRelative(-10)}
              disabled={!videoInfo}
              title="Rewind 10 seconds"
              className="p-1.5 rounded-lg text-[#5C4D43] hover:text-[#2D221C] hover:bg-[#EADBBD]/40 disabled:opacity-40 transition-colors flex items-center gap-0.5 text-[11px] font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>-10s</span>
            </button>

            <button
              onClick={() => seekRelative(10)}
              disabled={!videoInfo}
              title="Forward 10 seconds"
              className="p-1.5 rounded-lg text-[#5C4D43] hover:text-[#2D221C] hover:bg-[#EADBBD]/40 disabled:opacity-40 transition-colors flex items-center gap-0.5 text-[11px] font-semibold"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>+10s</span>
            </button>
          </div>

          {/* Center: Timestamp counter */}
          <div className="flex items-center gap-1 text-xs font-mono text-[#5C4D43] px-2 py-1 rounded-md bg-[#FFFEFA] border border-[#E8E2D5]">
            <Clock className="w-3 h-3 text-[#236B6B]" />
            <span>{formatTime(currentTime)}</span>
            {totalDuration > 0 && (
              <>
                <span className="text-[#B3A69A]">/</span>
                <span className="text-[#8E7E73]">{formatTime(totalDuration)}</span>
              </>
            )}
          </div>

          {/* Right: Speed & Mute */}
          <div className="flex items-center gap-1.5 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                disabled={!videoInfo}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E8E2D5] bg-[#FFFEFA] text-[#5C4D43] hover:text-[#2D221C] text-[11px] font-semibold disabled:opacity-40"
              >
                <Gauge className="w-3 h-3 text-[#8C6615]" />
                <span>{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-1 bg-[#FFFEFA] border border-[#E8E2D5] rounded-xl shadow-lg p-1 z-30 flex flex-col gap-0.5 min-w-[70px]">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-2 py-1 text-[11px] rounded-lg text-left transition-colors ${
                        playbackRate === rate
                          ? "bg-[#236B6B] text-white font-bold"
                          : "text-[#5C4D43] hover:bg-[#F2EDE2]"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              disabled={!videoInfo}
              title={isMuted ? "Unmute" : "Mute"}
              className="p-1.5 rounded-lg border border-[#E8E2D5] bg-[#FFFEFA] text-[#5C4D43] hover:text-[#2D221C] disabled:opacity-40"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-600" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#236B6B]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. Interactive Lecture Transcript & Timestamps ────────── */}
      <div className="learnos-card overflow-hidden flex flex-col flex-1 bg-[#FFFEFA]">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between p-3 text-xs font-semibold text-[#2D221C] border-b border-[#E8E2D5] hover:bg-[#FAF7F2] transition-colors text-left"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#236B6B]" />
            <span>Interactive Lecture Transcript ({videoInfo?.transcript?.length || 0} segments)</span>
          </div>
          {showTranscript ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#726257]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#726257]" />
          )}
        </button>

        {showTranscript && (
          <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
            {videoInfo?.transcript && videoInfo.transcript.length > 0 ? (
              videoInfo.transcript.map((entry, idx) => {
                const isCurrent =
                  currentTime >= entry.start &&
                  currentTime < entry.start + entry.duration;
                return (
                  <button
                    key={idx}
                    onClick={() => onSeek(entry.start)}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-start gap-2.5 transition-colors ${
                      isCurrent
                        ? "bg-[#E8F2F2] border border-[#B8D8D8] text-[#1D5E5E]"
                        : "hover:bg-[#FAF7F2] text-[#473B33]"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-[#8C6615] bg-[#F6EED9] px-1.5 py-0.5 rounded border border-[#EADBBD] shrink-0">
                      {formatTime(entry.start)}
                    </span>
                    <span className="leading-relaxed">{entry.text}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-[#9E8F84] p-3 text-center">
                Load a video to browse interactive lecture timestamps.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
