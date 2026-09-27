"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  Edit2,
  Trash2,
  Plus,
  Save,
  X,
  Check,
  Loader2,
  ListFilter,
  Eye,
} from "lucide-react";
import { VideoInfo } from "./VideoLecturePlayer";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty?: string;
}

interface FlashcardsTabProps {
  videoInfo: VideoInfo | null;
  youtubeUrl: string;
  cards: Flashcard[];
  onCardsChange: (cards: Flashcard[]) => void;
  onGenerate: (count: number, difficulty: string) => Promise<void>;
  isLoading: boolean;
}

export default function FlashcardsTab({
  videoInfo,
  youtubeUrl,
  cards,
  onCardsChange,
  onGenerate,
  isLoading,
}: FlashcardsTabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedCount, setSelectedCount] = useState<number>(8);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("intermediate");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [viewMode, setViewMode] = useState<"study" | "list">("study");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  // Keyboard shortcut: Space to flip, Arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCardId || isAddingNew) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, cards.length, editingCardId, isAddingNew]);

  const handleNext = () => {
    if (!cards.length) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    if (!cards.length) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    if (!cards.length) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    onCardsChange(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const startEditing = (card: Flashcard) => {
    setEditingCardId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const saveEditing = () => {
    if (!editingCardId) return;
    const updated = cards.map((c) =>
      c.id === editingCardId ? { ...c, front: editFront.trim(), back: editBack.trim() } : c
    );
    onCardsChange(updated);
    setEditingCardId(null);
  };

  const deleteCard = (id: string) => {
    const updated = cards.filter((c) => c.id !== id);
    onCardsChange(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
    setIsFlipped(false);
  };

  const handleAddNewCard = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      difficulty: selectedDifficulty,
    };
    onCardsChange([...cards, newCard]);
    setNewFront("");
    setNewBack("");
    setIsAddingNew(false);
    setCurrentIndex(cards.length);
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="h-full flex flex-col bg-[#F8F6F0] p-4 overflow-y-auto">
      {/* ─── Controls & Options Bar ──────────────────────────────── */}
      <div className="shrink-0 learnos-card p-3 mb-4 bg-[#FFFEFA]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Settings: Count & Difficulty */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#726257]">Cards:</span>
              <select
                value={selectedCount}
                onChange={(e) => setSelectedCount(Number(e.target.value))}
                className="text-xs bg-[#FAF7F2] border border-[#E8E2D5] rounded-lg px-2 py-1 text-[#2D221C] outline-none cursor-pointer"
              >
                <option value={5}>5 Cards</option>
                <option value={8}>8 Cards</option>
                <option value={10}>10 Cards</option>
                <option value={15}>15 Cards</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#726257]">Difficulty:</span>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="text-xs bg-[#FAF7F2] border border-[#E8E2D5] rounded-lg px-2 py-1 text-[#2D221C] outline-none cursor-pointer capitalize"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "study" ? "list" : "study")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#5C4D43] bg-[#FAF7F2] hover:bg-[#F2EDE2] border border-[#E8E2D5] rounded-xl transition-colors cursor-pointer"
            >
              {viewMode === "study" ? (
                <>
                  <ListFilter className="w-3.5 h-3.5" />
                  List View
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Study View
                </>
              )}
            </button>

            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#236B6B] bg-[#E8F2F2] hover:bg-[#D5E8E8] border border-[#B8D8D8] rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Card
            </button>

            <button
              onClick={() => onGenerate(selectedCount, selectedDifficulty)}
              disabled={!videoInfo || isLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Generate Flashcards
            </button>
          </div>
        </div>

        {/* Inline Add Card Drawer */}
        {isAddingNew && (
          <div className="mt-3 pt-3 border-t border-[#E8E2D5] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2D221C]">Create New Flashcard</span>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-[#9E8F84] hover:text-[#2D221C] p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              placeholder="Question / Front side..."
              className="w-full text-xs p-2 rounded-lg bg-[#FAF7F2] border border-[#E8E2D5] outline-none focus:border-[#236B6B]"
            />
            <textarea
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              placeholder="Answer / Explanation / Back side..."
              rows={2}
              className="w-full text-xs p-2 rounded-lg bg-[#FAF7F2] border border-[#E8E2D5] outline-none focus:border-[#236B6B] resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-2.5 py-1 text-xs text-[#5C4D43] hover:bg-[#FAF7F2] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewCard}
                disabled={!newFront.trim() || !newBack.trim()}
                className="px-3 py-1 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-lg cursor-pointer"
              >
                Save Card
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Main View ───────────────────────────────────────────── */}
      {cards.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FFFEFA] rounded-xl border border-[#E8E2D5]">
          <div className="w-12 h-12 rounded-2xl bg-[#F6EED9] border border-[#EADBBD] flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-[#8C6615]" />
          </div>
          <h3 className="text-sm font-bold text-[#2D221C] mb-1">
            No Flashcards Yet
          </h3>
          <p className="text-xs text-[#726257] max-w-sm mb-4">
            Select your preferred card count and difficulty, then click "Generate Flashcards" to create interactive study cards.
          </p>
          <button
            onClick={() => onGenerate(selectedCount, selectedDifficulty)}
            disabled={!videoInfo}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Flashcards
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#FFFEFA] rounded-xl border border-[#E8E2D5]">
          <Loader2 className="w-8 h-8 text-[#236B6B] animate-spin mb-3" />
          <p className="text-xs font-semibold text-[#2D221C]">
            Crafting flashcards from lecture...
          </p>
          <p className="text-[11px] text-[#726257] mt-1">
            Generating {selectedCount} {selectedDifficulty} question & answer pairs
          </p>
        </div>
      ) : viewMode === "study" && currentCard ? (
        /* ─── Study Flip Card Mode ─── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto w-full">
          {/* Card Counter & Progress */}
          <div className="w-full flex items-center justify-between text-xs text-[#726257]">
            <span className="font-semibold text-[#2D221C]">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-[#8C6615] bg-[#F6EED9] px-2 py-0.5 rounded-full border border-[#EADBBD]">
                {currentCard.difficulty || selectedDifficulty}
              </span>
              <button
                onClick={() => startEditing(currentCard)}
                className="p-1 text-[#726257] hover:text-[#2D221C] hover:bg-[#F2EDE2] rounded"
                title="Edit this card"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteCard(currentCard.id)}
                className="p-1 text-[#726257] hover:text-red-700 hover:bg-red-50 rounded"
                title="Delete this card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-[#E8E2D5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#236B6B] transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>

          {/* Inline Edit Form if active */}
          {editingCardId === currentCard.id ? (
            <div className="w-full learnos-card p-5 bg-[#FFFEFA] space-y-3">
              <h4 className="text-xs font-bold text-[#2D221C]">Edit Flashcard</h4>
              <div>
                <label className="text-[10px] font-bold text-[#726257] block mb-1">
                  Question (Front)
                </label>
                <textarea
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2 rounded-lg bg-[#FAF7F2] border border-[#E8E2D5] outline-none focus:border-[#236B6B]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#726257] block mb-1">
                  Answer (Back)
                </label>
                <textarea
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2 rounded-lg bg-[#FAF7F2] border border-[#E8E2D5] outline-none focus:border-[#236B6B]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingCardId(null)}
                  className="px-3 py-1.5 text-xs text-[#5C4D43] hover:bg-[#FAF7F2] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditing}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] rounded-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            /* 3D Flippable Card */
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="cursor-pointer w-full h-64 select-none"
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative w-full h-full transition-transform duration-500 rounded-2xl shadow-sm border border-[#E8E2D5]"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front (Question) */}
                <div
                  className="absolute inset-0 bg-[#FFFEFA] rounded-2xl p-6 flex flex-col justify-between"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#726257]">
                    <span className="font-bold text-[#236B6B]">QUESTION</span>
                    <span className="text-[#9E8F84]">Click to reveal answer</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-base font-bold text-[#2D221C] leading-snug">
                      {currentCard.front}
                    </p>
                  </div>
                  <div className="text-center text-[11px] text-[#8C6615] font-medium">
                    Flip Card (Space) ↷
                  </div>
                </div>

                {/* Back (Answer) */}
                <div
                  className="absolute inset-0 bg-[#FAF7F2] rounded-2xl p-6 flex flex-col justify-between border-2 border-[#B8D8D8]"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#1D5E5E]">
                    <span className="font-bold">ANSWER & EXPLANATION</span>
                    <span className="text-[#726257]">Click to return</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-center px-4 overflow-y-auto">
                    <p className="text-sm text-[#2D221C] leading-relaxed">
                      {currentCard.back}
                    </p>
                  </div>
                  <div className="text-center text-[11px] text-[#236B6B] font-medium">
                    ↶ Return to Question
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handlePrev}
              title="Previous card (Left Arrow)"
              className="w-10 h-10 rounded-xl bg-[#FFFEFA] border border-[#E8E2D5] text-[#5C4D43] hover:text-[#2D221C] hover:bg-[#F2EDE2] flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-xs font-semibold text-[#2D221C] hover:bg-[#EADBBD]/40 transition-colors cursor-pointer"
            >
              {isFlipped ? "Show Question" : "Show Answer"}
            </button>

            <button
              onClick={handleShuffle}
              title="Shuffle cards"
              className="w-10 h-10 rounded-xl bg-[#FFFEFA] border border-[#E8E2D5] text-[#5C4D43] hover:text-[#2D221C] hover:bg-[#F2EDE2] flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              title="Next card (Right Arrow)"
              className="w-10 h-10 rounded-xl bg-[#236B6B] hover:bg-[#1C5555] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* ─── List / Management View ─── */
        <div className="space-y-3">
          {cards.map((card, idx) => (
            <div
              key={card.id}
              className="learnos-card p-4 bg-[#FFFEFA] flex flex-col gap-2"
            >
              {editingCardId === card.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-[#FAF7F2] border border-[#E8E2D5] outline-none"
                  />
                  <textarea
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg bg-[#FAF7F2] border border-[#E8E2D5] outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingCardId(null)}
                      className="px-2.5 py-1 text-xs text-[#5C4D43]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditing}
                      className="px-3 py-1 text-xs font-semibold text-white bg-[#236B6B] rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#8C6615] bg-[#F6EED9] px-2 py-0.5 rounded border border-[#EADBBD]">
                      Card {idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(card)}
                        className="p-1 text-[#726257] hover:text-[#2D221C] rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCard(card.id)}
                        className="p-1 text-[#726257] hover:text-red-700 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2D221C] mb-1">
                      {card.front}
                    </h4>
                    <p className="text-xs text-[#5C4D43] leading-relaxed">
                      {card.back}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
