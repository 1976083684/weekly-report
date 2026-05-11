"use client";

import { useState, useCallback, useRef } from "react";
import { Eye, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceInput } from "./VoiceInput";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "开始书写...",
  minHeight = "300px",
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTranscript = useCallback(
    (text: string) => {
      const separator = value && !value.endsWith("\n") ? "\n" : "";
      onChange(value + separator + text);
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.scrollTop = ta.scrollHeight;
        }
      });
    },
    [value, onChange],
  );

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    html = html
      .replace(/^### (.+)$/gm, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2 class='text-xl font-semibold mt-4 mb-2'>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1 class='text-2xl font-bold mt-4 mb-2'>$1</h1>")
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code class='bg-muted px-1 py-0.5 rounded text-sm font-mono'>$1</code>")
      .replace(
        /```(\w*)\n([\s\S]*?)```/g,
        "<pre class='bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto my-2'><code>$2</code></pre>"
      )
      .replace(
        /^\- (.+)$/gm,
        "<li class='ml-4 list-disc'>$1</li>"
      )
      .replace(
        /^(\d+)\. (.+)$/gm,
        "<li class='ml-4 list-decimal'>$2</li>"
      )
      .replace(/\n\n/g, "</p><p class='mb-2'>")
      .replace(/\n/g, "<br>");

    return "<p class='mb-2'>" + html + "</p>";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className={cn(
            "px-3 py-1 text-xs rounded-md transition-colors",
            !preview
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Edit3 className="w-3.5 h-3.5 inline mr-1" />
          编辑
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className={cn(
            "px-3 py-1 text-xs rounded-md transition-colors",
            preview
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="w-3.5 h-3.5 inline mr-1" />
          预览
        </button>
        {!preview && (
          <VoiceInput onTranscript={handleTranscript} />
        )}
      </div>
      {preview ? (
        <div
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none overflow-auto"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground/60"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
