"use client";

import {
  PenSquare,
  Bookmark,
  Layers,
  MessageSquare,
  Maximize2,
} from "lucide-react";

interface BottomBarProps {
  onQuickNote?: () => void;
  onBookmark?: () => void;
  onCreateFlashcard?: () => void;
  onAskAI?: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
}

const ACTIONS = [
  { icon: PenSquare, label: "Quick Note", shortcut: "N", key: "onQuickNote" },
  { icon: Bookmark, label: "Bookmark", shortcut: "B", key: "onBookmark" },
  { icon: Layers, label: "Create Flashcard", shortcut: "F", key: "onCreateFlashcard" },
  { icon: MessageSquare, label: "Ask AI", shortcut: "/", key: "onAskAI" },
] as const;

export default function BottomBar({
  onQuickNote,
  onBookmark,
  onCreateFlashcard,
  onAskAI,
  focusMode,
  onToggleFocusMode,
}: BottomBarProps) {
  const handlers: Record<string, (() => void) | undefined> = {
    onQuickNote,
    onBookmark,
    onCreateFlashcard,
    onAskAI,
  };

  return (
    <footer className="h-11 shrink-0 flex items-center gap-1.5 px-4 bg-white border-t border-gray-100 z-20">
      {ACTIONS.map(({ icon: Icon, label, shortcut, key }) => (
        <button
          key={key}
          onClick={handlers[key]}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800 text-xs font-medium transition-colors group"
        >
          <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
          <span className="hidden sm:inline">{label}</span>
          <kbd className="hidden sm:inline text-[10px] text-gray-300 font-mono ml-0.5">{shortcut}</kbd>
        </button>
      ))}

      <div className="flex-1" />

      {/* Focus Mode */}
      <button
        onClick={onToggleFocusMode}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          focusMode
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
        }`}
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Focus Mode</span>
        <kbd className="hidden sm:inline text-[10px] opacity-60 font-mono">Ctrl \</kbd>
      </button>
    </footer>
  );
}
