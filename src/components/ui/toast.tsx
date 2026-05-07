"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  type: "success" | "error";
  message: string;
  leaving: boolean;
}

let toastId = 0;
let addToastFn: ((type: "success" | "error", message: string) => void) | null = null;

export function toast(type: "success" | "error", message: string) {
  addToastFn?.(type, message);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message, leaving: false }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 2000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border shadow-lg text-sm animate-in slide-in-from-top-4 fade-in duration-300",
            t.leaving && "animate-out slide-out-to-top-4 fade-out duration-300"
          )}
        >
          {t.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-danger shrink-0" />
          )}
          <span className="text-foreground">{t.message}</span>
          <button
            onClick={() => {
              setToasts((prev) => prev.filter((item) => item.id !== t.id));
            }}
            className="ml-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
