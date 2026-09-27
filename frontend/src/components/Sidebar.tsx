"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  FileText,
  Layers,
  Code2,
  HelpCircle,
  Bot,
  TrendingUp,
  Calendar,
  Settings,
  Crown,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: BookOpen, label: "Courses", href: "/courses" },
  { icon: FileText, label: "Notes", href: "/notes" },
  { icon: Layers, label: "Flashcards", href: "/flashcards" },
  { icon: Code2, label: "Coding", href: "/coding" },
  { icon: HelpCircle, label: "Quizzes", href: "/quizzes" },
  { icon: Bot, label: "AI Copilot", href: "/copilot" },
  { icon: TrendingUp, label: "Progress", href: "/progress" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const RECENT_NOTES = [
  { title: "Activation Functions", time: "Today, 10:21 AM" },
  { title: "Backpropagation", time: "Yesterday, 9:15 PM" },
  { title: "Gradient Descent", time: "Yesterday, 7:48 PM" },
];

interface SidebarProps {
  currentVideo?: { title: string; progress: number } | null;
}

export default function Sidebar({ currentVideo }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar w-[220px] shrink-0 flex flex-col h-full bg-white border-r border-gray-100 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-black text-sm">L</span>
        </div>
        <span className="font-bold text-gray-900 text-[15px] tracking-tight">learnOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-none px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-orange-500" : "text-gray-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Current Course */}
      {currentVideo && (
        <div className="mx-3 mt-2 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1 mb-2">
            Current Course
          </p>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 mb-2.5 flex items-center justify-center overflow-hidden">
              <Layers className="w-8 h-8 text-white/60" />
            </div>
            <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">
              {currentVideo.title}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-orange-400 h-1.5 rounded-full transition-all"
                style={{ width: `${currentVideo.progress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{currentVideo.progress}% complete</p>
          </div>
        </div>
      )}

      {/* Recent Notes */}
      <div className="mx-3 mt-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Recent Notes</p>
          <button className="text-[10px] text-orange-500 font-medium hover:text-orange-600">
            View all →
          </button>
        </div>
        <div className="space-y-1">
          {RECENT_NOTES.map((note) => (
            <button
              key={note.title}
              className="w-full flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 text-left group transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0 group-hover:text-orange-400 transition-colors" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{note.title}</p>
                <p className="text-[10px] text-gray-400">{note.time}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Upgrade CTA */}
      <div className="mx-3 mb-4 mt-3">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold text-gray-800">Upgrade to Pro</p>
          </div>
          <p className="text-[10px] text-gray-500 mb-2.5 leading-relaxed">
            Unlock unlimited AI, storage and premium features.
          </p>
          <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-semibold py-2 rounded-lg transition-all shadow-sm">
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
}
