"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Play,
  RotateCcw,
  Loader2,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
} from "lucide-react";

interface CodeRunResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  execution_time_ms: number;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function CodeWorkspaceTab() {
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [output, setOutput] = useState<CodeRunResult | null>(null);

  // Load default starter template when language changes
  useEffect(() => {
    async function loadDefault() {
      try {
        const res = await fetch(`${API_BASE}/code/default/${language}`);
        if (res.ok) {
          const data = await res.json();
          setCode(data.code);
        }
      } catch {
        // Fallback default templates
        if (language === "python") {
          setCode(
            '# Python 3 Workspace\ndef solve():\n    nums = [3, 1, 4, 1, 5, 9, 2, 6]\n    print("Sorted:", sorted(nums))\n    print("Sum:   ", sum(nums))\n\nsolve()\n'
          );
        } else if (language === "javascript") {
          setCode(
            '// JavaScript Workspace\nconsole.log("Hello from LearnOS!");\nconst nums = [10, 20, 30];\nconsole.log("Sum:", nums.reduce((a, b) => a + b, 0));\n'
          );
        } else if (language === "cpp") {
          setCode(
            '// C++ Workspace\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "Hello from LearnOS C++ Workspace!" << std::endl;\n    return 0;\n}\n'
          );
        }
      }
    }
    loadDefault();
  }, [language]);

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`${API_BASE}/code/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      if (res.ok) {
        const result: CodeRunResult = await res.json();
        setOutput(result);
      } else {
        const err = await res.json();
        setOutput({
          stdout: "",
          stderr: err.detail || "Error running code",
          exit_code: 1,
          timed_out: false,
          execution_time_ms: 0,
        });
      }
    } catch (e: any) {
      setOutput({
        stdout: "",
        stderr: e.message || "Network error. Make sure the backend server is running.",
        exit_code: 1,
        timed_out: false,
        execution_time_ms: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetCode = async () => {
    try {
      const res = await fetch(`${API_BASE}/code/default/${language}`);
      if (res.ok) {
        const data = await res.json();
        setCode(data.code);
      }
    } catch {}
    setOutput(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F6F0] p-4 overflow-hidden">
      {/* ─── Code Toolbar ────────────────────────────────────────── */}
      <div className="shrink-0 learnos-card p-3 mb-3 bg-[#FFFEFA] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#726257]">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs font-semibold bg-[#FAF7F2] border border-[#E8E2D5] rounded-lg px-2.5 py-1.5 text-[#2D221C] outline-none cursor-pointer"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="cpp">C++ (MinGW/GCC)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCode}
            title="Reset to starter template"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#5C4D43] bg-[#FAF7F2] hover:bg-[#F2EDE2] border border-[#E8E2D5] rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning || !code.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#236B6B] hover:bg-[#1C5555] disabled:opacity-40 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Run Code
          </button>
        </div>
      </div>

      {/* ─── Editor & Output Split ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-[#E8E2D5] overflow-hidden bg-[#1E1E1E] shadow-sm">
        {/* Monaco Editor Container */}
        <div className="flex-1 relative overflow-hidden">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              tabSize: 4,
            }}
          />
        </div>

        {/* Output Console Container */}
        <div className="shrink-0 h-44 bg-[#141210] border-t border-[#332A24] flex flex-col text-xs font-mono">
          {/* Output Header */}
          <div className="shrink-0 px-3 py-1.5 bg-[#1F1B18] border-b border-[#332A24] flex items-center justify-between text-[#A8988D]">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#236B6B]" />
              <span className="font-semibold text-white">Console Output</span>
              {output && (
                <div className="flex items-center gap-1.5 ml-2">
                  {output.exit_code === 0 && !output.timed_out ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Exit Code 0
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                      <AlertTriangle className="w-3 h-3" /> Exit Code {output.exit_code}
                    </span>
                  )}
                  {output.execution_time_ms > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[#A8988D]">
                      <Clock className="w-3 h-3" /> {output.execution_time_ms}ms
                    </span>
                  )}
                </div>
              )}
            </div>

            {output && (
              <button
                onClick={() => setOutput(null)}
                className="text-[#A8988D] hover:text-white p-1 rounded"
                title="Clear output"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Output Body */}
          <div className="flex-1 p-3 overflow-y-auto leading-relaxed select-text">
            {isRunning ? (
              <div className="flex items-center gap-2 text-[#A8988D]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#236B6B]" />
                <span>Executing code in isolated backend sandbox...</span>
              </div>
            ) : !output ? (
              <span className="text-[#6E5F55] italic">
                Click "Run Code" above to execute your solution.
              </span>
            ) : (
              <>
                {output.stdout && (
                  <pre className="text-[#E6E1DC] whitespace-pre-wrap">
                    {output.stdout}
                  </pre>
                )}
                {output.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap mt-1">
                    {output.stderr}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
