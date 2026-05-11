"use client";

import { useState, useCallback, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({ onTranscript, disabled, className }: VoiceInputProps) {
  const [error, setError] = useState("");
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // 每句话识别完成后立即写入输入框
  const handleResult = useCallback((text: string) => {
    onTranscriptRef.current(text);
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  }, []);

  const { isListening, isSupported, start, stop } = useVoiceRecognition({
    lang: "zh-CN",
    onResult: handleResult,
    onError: handleError,
  });

  const handleToggle = () => {
    setError("");
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  if (!isSupported) return null;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={isListening ? "点击停止录音" : "点击开始语音输入"}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all select-none",
          isListening
            ? "bg-danger text-white shadow-lg shadow-danger/30"
            : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {isListening ? (
          <>
            <span className="relative flex h-2.5 w-2.5 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <MicOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">停止</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">语音</span>
          </>
        )}
      </button>

      {error && (
        <span className="text-xs text-danger truncate max-w-[200px]">{error}</span>
      )}
    </div>
  );
}
