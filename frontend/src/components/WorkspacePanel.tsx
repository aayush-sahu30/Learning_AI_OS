"use client";

import { useState, useCallback } from "react";
import {
  PenTool, Layers, Bot, Code2, HelpCircle, GitBranch,
  BrainCircuit, Loader2, RotateCcw, ChevronLeft, ChevronRight,
  Maximize2, Save,
} from "lucide-react";
import RichEditor from "@/components/RichEditor";
import CodeWorkspace from "@/components/CodeWorkspace";
import MindMap from "@/components/MindMap";

interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

interface VideoInfo {
  video_id: string;
  title: string;
  author: string;
  transcript: TranscriptEntry[];
}

interface WorkspacePanelProps {
  videoInfo: VideoInfo | null;
  youtubeUrl: string;
}

// ─── Flashcard types ───────────────────────────────────────── //
interface Flashcard {
  front: string;
  back: string;
}

const DEMO_FLASHCARDS: Flashcard[] = [
  { front: "What is a Neuron?", back: "A neuron takes inputs, applies weights and bias, then passes the result through an activation function to produce an output." },
  { front: "What is Backpropagation?", back: "An algorithm to train neural networks by computing the gradient of the loss function and updating weights via gradient descent." },
  { front: "Why do we need activation functions?", back: "Without activation functions, the network would be linear and unable to learn complex patterns." },
];

function FlashcardsTab({ videoInfo, youtubeUrl }: { videoInfo: VideoInfo | null; youtubeUrl: string }) {
  const [cards, setCards] = useState<Flashcard[]>(DEMO_FLASHCARDS);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!videoInfo) return;
    setGenerating(true);
    try {
      const res = await fetch("http://localhost:8000/video/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.flashcards?.length) { setCards(data.flashcards); setIdx(0); setFlipped(false); }
      }
    } catch {}
    setGenerating(false);
  };

  const card = cards[idx];

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500">{idx + 1} / {cards.length} cards</span>
        <button
          onClick={generate}
          disabled={!videoInfo || generating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
          Generate with AI
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        {/* Card */}
        <div
          onClick={() => setFlipped((f) => !f)}
          className="cursor-pointer w-full max-w-md"
          style={{ perspective: "1000px" }}
        >
          <div
            className="relative w-full h-48 transition-transform duration-500"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center p-6 shadow-lg"
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="text-white text-center font-bold text-lg leading-snug">{card.front}</p>
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 bg-white border-2 border-indigo-100 rounded-2xl flex items-center justify-center p-6 shadow-lg"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <p className="text-gray-700 text-center text-sm leading-relaxed">{card.back}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">Click the card to flip it</p>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}
            disabled={idx === 0}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:border-gray-300 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setFlipped(false)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={() => { setIdx((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
            disabled={idx === cards.length - 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:border-gray-300 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AICopilotTab({ videoInfo }: { videoInfo: VideoInfo | null }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your AI study companion. Ask me anything about the video or your notes." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, video_id: videoInfo?.video_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that right now." }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-orange-500 text-white rounded-tr-sm"
                : "bg-gray-100 text-gray-800 rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <span className="text-xs">Thinking...</span>
          </div>
        )}
      </div>
      <div className="shrink-0 flex gap-2 p-3 border-t border-gray-100">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about the video..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 transition-colors"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Quiz stub ──────────────────────────────────────────────── //
function QuizTab({ videoInfo, youtubeUrl }: { videoInfo: VideoInfo | null; youtubeUrl: string }) {
  const [quiz, setQuiz] = useState<{ q: string; options: string[]; answer: number }[] | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const DEMO_QUIZ = [
    {
      q: "What does a neuron in a neural network do?",
      options: ["Stores data", "Takes inputs, applies weights, and passes through activation", "Normalizes data", "None of the above"],
      answer: 1,
    },
    {
      q: "Why are activation functions important?",
      options: ["They store weights", "They remove bias", "They enable non-linear learning", "They reduce parameters"],
      answer: 2,
    },
  ];

  const generate = async () => {
    if (!videoInfo) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1200)); // simulate
    setQuiz(DEMO_QUIZ);
    setSelected({});
    setRevealed(false);
    setGenerating(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500">
          {quiz ? `${quiz.length} questions` : "No quiz generated yet"}
        </span>
        <button
          onClick={generate}
          disabled={!videoInfo || generating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
          Generate Quiz
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!quiz ? (
          <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400">
            <HelpCircle className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-sm">Load a video and generate a quiz to test your knowledge</p>
          </div>
        ) : (
          <>
            {quiz.map((q, qi) => (
              <div key={qi} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  {qi + 1}. {q.q}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const isSel = selected[qi] === oi;
                    const isCorrect = oi === q.answer;
                    const showResult = revealed;
                    return (
                      <button
                        key={oi}
                        onClick={() => !revealed && setSelected((s) => ({ ...s, [qi]: oi }))}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                          showResult && isCorrect
                            ? "bg-green-50 border-green-300 text-green-800"
                            : showResult && isSel && !isCorrect
                            ? "bg-red-50 border-red-300 text-red-800"
                            : isSel
                            ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                            : "bg-white border-gray-200 text-gray-700 hover:border-indigo-200"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center shrink-0 text-xs font-bold">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Reveal Answers
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main WorkspacePanel ────────────────────────────────────── //
type Tab = "notes" | "flashcards" | "copilot" | "code" | "quiz" | "mindmap";

const TABS: { id: Tab; icon: typeof PenTool; label: string }[] = [
  { id: "notes", icon: PenTool, label: "Notes" },
  { id: "flashcards", icon: Layers, label: "Flashcards" },
  { id: "copilot", icon: Bot, label: "AI Copilot" },
  { id: "code", icon: Code2, label: "Code" },
  { id: "quiz", icon: HelpCircle, label: "Quiz" },
  { id: "mindmap", icon: GitBranch, label: "Mind Map" },
];

export default function WorkspacePanel({ videoInfo, youtubeUrl }: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Tab Bar */}
      <div className="shrink-0 flex items-center border-b border-gray-100 bg-white px-2 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${activeTab === id ? "text-orange-500" : "text-gray-400"}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "notes" && (
          <div className="h-full flex flex-col">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3
                className="font-bold text-base text-gray-800 outline-none focus:border-b border-orange-400 cursor-text"
                contentEditable
                suppressContentEditableWarning
              >
                {videoInfo?.title ?? "My Notes"}
              </h3>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-100 transition-colors">
                  <BrainCircuit className="w-3.5 h-3.5" /> AI Summarize
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <RichEditor
                placeholder={
                  videoInfo ? `Take notes on "${videoInfo.title}"...` : "Start writing your notes..."
                }
              />
            </div>
          </div>
        )}

        {activeTab === "flashcards" && (
          <FlashcardsTab videoInfo={videoInfo} youtubeUrl={youtubeUrl} />
        )}

        {activeTab === "copilot" && (
          <AICopilotTab videoInfo={videoInfo} />
        )}

        {activeTab === "code" && (
          <CodeWorkspace />
        )}

        {activeTab === "quiz" && (
          <QuizTab videoInfo={videoInfo} youtubeUrl={youtubeUrl} />
        )}

        {activeTab === "mindmap" && (
          <MindMap videoInfo={videoInfo} youtubeUrl={youtubeUrl} />
        )}
      </div>
    </div>
  );
}
