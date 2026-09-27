import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, RefreshCw } from "lucide-react";

interface CodeWorkspaceProps {
  initialLanguage?: string;
}

export default function CodeWorkspace({ initialLanguage = "python" }: CodeWorkspaceProps) {
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<{ stdout: string; stderr: string; exit_code: number; timed_out: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load default code when language changes
  useEffect(() => {
    async function fetchDefault() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/code/default/${language}`);
        const data = await res.json();
        setCode(data.code);
      } catch (e) {
        console.error("Failed to fetch default code", e);
        setCode("# Unable to load default code");
      }
    }
    fetchDefault();
  }, [language]);

  const runCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/code/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      setOutput(data);
    } catch (e) {
      console.error("Run error", e);
      setOutput({ stdout: "", stderr: "Network error", exit_code: 1, timed_out: false });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
        <select
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="cpp">C++</option>
        </select>
        <button
          onClick={runCode}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
        >
          <Play className="w-4 h-4" /> Run
        </button>
        <button
          onClick={() => setCode("")}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className="w-4 h-4" /> Reset
        </button>
      </div>
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          theme={"vs-dark"}
          value={code}
          onChange={(value: string | undefined) => setCode(value ?? "")}
          options={{ automaticLayout: true, minimap: { enabled: false } }}
        />
      </div>
      {/* Output */}
      {output && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-2 bg-slate-50/80 dark:bg-slate-800/50">
          <h4 className="font-medium mb-1">Output (exit {output.exit_code}{output.timed_out ? ", timed out" : ""})</h4>
          <pre className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto bg-slate-100 dark:bg-slate-800 p-2 rounded">
            {output.stdout || ""}
            {output.stderr && ("\n--- STDERR ---\n" + output.stderr)}
          </pre>
        </div>
      )}
    </div>
  );
}
