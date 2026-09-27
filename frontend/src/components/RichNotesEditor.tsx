"use client";

import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Code2,
  Highlighter,
  Quote,
  Minus,
  Undo,
  Redo,
  CheckCircle2,
  Copy,
  Trash2,
  Sparkles,
} from "lucide-react";

export interface RichNotesEditorHandle {
  appendContent: (html: string) => void;
  getContent: () => string;
}

interface RichNotesEditorProps {
  videoId?: string;
  videoTitle?: string;
  placeholder?: string;
  onOpenSummaryTab?: () => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
        active
          ? "bg-[#236B6B] text-white font-semibold"
          : "text-[#5C4D43] hover:bg-[#F2EDE2] hover:text-[#2D221C]"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-[#E8E2D5] mx-1 self-center" />;
}

const RichNotesEditor = forwardRef<RichNotesEditorHandle, RichNotesEditorProps>(
  ({ videoId, videoTitle, placeholder = "Type lecture notes, ideas, code snippets...", onOpenSummaryTab }, ref) => {
    const [savedStatus, setSavedStatus] = useState<string>("Saved");
    const [copied, setCopied] = useState<boolean>(false);
    const storageKey = `learnos_notes_${videoId || "general"}`;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: { HTMLAttributes: { class: "rounded-lg" } },
        }),
        Underline,
        Highlight.configure({ multicolor: false }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-[#236B6B] underline font-medium hover:text-[#184D4D]",
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
      ],
      content: "",
      editorProps: {
        attributes: {
          class:
            "focus:outline-none min-h-full px-6 py-4 text-[#2D221C] text-sm leading-relaxed",
        },
      },
      onUpdate: () => {
        setSavedStatus("Autosaving...");
      },
    });

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      appendContent: (html: string) => {
        if (!editor) return;
        const current = editor.getHTML();
        editor.commands.setContent(`${current}<hr/>${html}`);
        setSavedStatus("Autosaving...");
      },
      getContent: () => (editor ? editor.getHTML() : ""),
    }));

    // Load initial note content from localStorage when videoId changes
    useEffect(() => {
      if (!editor) return;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          editor.commands.setContent(saved);
        } else {
          editor.commands.setContent(
            videoTitle
              ? `<h2>Notes: ${videoTitle}</h2><p>Start recording your observations, key takeaways, and questions here.</p>`
              : ""
          );
        }
        setSavedStatus("Saved to browser");
      } catch {}
    }, [editor, storageKey, videoTitle]);

    // Autosave debouncer
    useEffect(() => {
      if (!editor) return;
      const timer = setTimeout(() => {
        try {
          const html = editor.getHTML();
          localStorage.setItem(storageKey, html);
          setSavedStatus("Saved to browser");
        } catch {}
      }, 1200);

      return () => clearTimeout(timer);
    }, [editor?.state.doc, storageKey]);

    const handleSetLink = useCallback(() => {
      if (!editor) return;
      const previousUrl = editor.getAttributes("link").href;
      const url = window.prompt("Enter URL:", previousUrl);
      if (url === null) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }, [editor]);

    const handleCopyNotes = () => {
      if (!editor) return;
      const text = editor.getText();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleClearNotes = () => {
      if (!editor) return;
      if (window.confirm("Are you sure you want to clear these notes?")) {
        editor.commands.clearContent();
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      }
    };

    if (!editor) return null;

    return (
      <div className="h-full flex flex-col bg-[#FFFEFA] rounded-xl overflow-hidden border border-[#E8E2D5] shadow-xs">
        {/* Top Note Info & Autosave Indicator */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[#FAF7F2] border-b border-[#E8E2D5]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2D221C]">
              {videoTitle ? `Notes: ${videoTitle}` : "Student Notebook"}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#236B6B] font-medium bg-[#E8F2F2] px-2 py-0.5 rounded-full border border-[#B8D8D8]">
              <CheckCircle2 className="w-3 h-3" />
              {savedStatus}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onOpenSummaryTab && (
              <button
                onClick={onOpenSummaryTab}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#8C6615] bg-[#F6EED9] hover:bg-[#EADBBD] border border-[#EADBBD] rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#8C6615]" />
                View AI Summary
              </button>
            )}
            <button
              onClick={handleCopyNotes}
              className="p-1.5 text-[11px] text-[#5C4D43] hover:text-[#2D221C] hover:bg-[#F2EDE2] rounded-lg transition-colors cursor-pointer"
              title="Copy notes as text"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClearNotes}
              className="p-1.5 text-[11px] text-[#5C4D43] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Clear notes"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rich Text Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center gap-0.5 px-3 py-1.5 bg-[#FAF7F2]/80 border-b border-[#E8E2D5]">
          {/* Undo / Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter className="w-3.5 h-3.5 text-[#8C6615]" />
          </ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Link */}
          <ToolbarButton
            onClick={handleSetLink}
            active={editor.isActive("link")}
            title="Add Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          {editor.isActive("link") && (
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              title="Remove Link"
            >
              <Unlink className="w-3.5 h-3.5 text-red-600" />
            </ToolbarButton>
          )}

          <Divider />

          {/* Code Block & Quote */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            title="Code block"
          >
            <Code2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        {/* TipTap Editor Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-[#FFFEFA]">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    );
  }
);

RichNotesEditor.displayName = "RichNotesEditor";

export default RichNotesEditor;
