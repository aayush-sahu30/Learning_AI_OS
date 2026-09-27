"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Flame, Sun, Moon, Bell, ChevronRight } from "lucide-react";

interface TopBarProps {
  focusMode: boolean;
  onToggleFocusMode: () => void;
}

function GoalRing({ current, total }: { current: number; total: number }) {
  const pct = Math.min(current / total, 1);
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3.5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-green-600">
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-[10px] text-gray-400 font-medium leading-none">Today's Goal</p>
        <p className="text-xs font-bold text-gray-700 leading-tight">
          {current} / {total} hrs
        </p>
      </div>
    </div>
  );
}

export default function TopBar({ focusMode, onToggleFocusMode }: TopBarProps) {
  const [dark, setDark] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 bg-white border-b border-gray-100 z-20">
      {/* Search */}
      <div
        className={`flex items-center gap-2 flex-1 max-w-md px-3 py-2 rounded-xl border transition-all ${
          searchFocused
            ? "border-orange-400 bg-orange-50/50 shadow-sm shadow-orange-100"
            : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
      >
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
          placeholder="Search anything... (notes, flashcards, lectures, code)"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono shadow-sm">
          Ctrl K
        </kbd>
      </div>

      <div className="flex-1" />

      {/* Streak */}
      <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5">
        <Flame className="w-4 h-4 text-orange-500" />
        <div>
          <p className="text-xs font-black text-orange-600 leading-none">14</p>
          <p className="text-[9px] text-orange-400 leading-none">day streak</p>
        </div>
      </div>

      {/* Goal */}
      <GoalRing current={1.5} total={2} />

      {/* Theme toggle */}
      <button
        onClick={() => setDark((d) => !d)}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
      >
        {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      {/* Bell */}
      <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
      </button>

      {/* Avatar */}
      <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm hover:shadow-md transition-shadow">
        U
      </button>
    </header>
  );
}
