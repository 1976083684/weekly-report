"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  lang?: string;
  onResult?: (text: string) => void;
  onError?: (msg: string) => void;
}

interface Result {
  isListening: boolean;
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useVoiceRecognition({
  lang = "zh-CN",
  onResult,
  onError,
}: Options = {}): Result {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const keepAliveRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) return null;

    const rec = new API();
    rec.lang = lang;
    // continuous: false — 每句话结束后自动触发 onend，然后手动重启，比 continuous:true 更稳定
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    return rec;
  }, [lang]);

  const stop = useCallback(() => {
    keepAliveRef.current = false;
    recognitionRef.current?.abort();
    setIsListening(false);
  }, []);

  const runRecognition = useCallback(
    (rec: SpeechRecognitionInstance) => {
      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: SpeechRecognitionEvent) => {
        // 逐条处理结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript.trim();
          if (text && event.results[i].isFinal) {
            onResult?.(text);
          }
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          onError?.("麦克风权限被拒绝，请在浏览器设置中允许");
          keepAliveRef.current = false;
          setIsListening(false);
          return;
        }
        if (event.error === "audio-capture") {
          onError?.("未找到麦克风设备");
          keepAliveRef.current = false;
          setIsListening(false);
          return;
        }
        if (event.error === "network") {
          onError?.("语音识别需要网络连接");
          keepAliveRef.current = false;
          setIsListening(false);
          return;
        }
        // aborted / no-speech → 如果是用户主动停止就不重启，否则重启
        if (!keepAliveRef.current) {
          setIsListening(false);
        }
      };

      rec.onend = () => {
        if (keepAliveRef.current) {
          // 自动重启：用新的 recognition 实例避免状态残留
          const newRec = startRecognition();
          if (newRec) {
            recognitionRef.current = newRec;
            try {
              newRec.start();
              runRecognition(newRec);
            } catch {
              keepAliveRef.current = false;
              setIsListening(false);
            }
          }
        } else {
          setIsListening(false);
        }
      };

      try {
        rec.start();
        recognitionRef.current = rec;
      } catch {
        onError?.("启动语音识别失败，请刷新页面重试");
        setIsListening(false);
      }
    },
    [onResult, onError, startRecognition],
  );

  const start = useCallback(async () => {
    if (!isSupported) {
      onError?.("您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器");
      return;
    }

    // 先请求麦克风权限（确保权限弹窗在语音识别前弹出）
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      onError?.("无法访问麦克风，请在浏览器设置中允许");
      return;
    }

    keepAliveRef.current = true;
    const rec = startRecognition();
    if (!rec) return;
    runRecognition(rec);
  }, [isSupported, startRecognition, runRecognition, onError]);

  useEffect(() => {
    return () => {
      keepAliveRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { isListening, isSupported, start, stop };
}
