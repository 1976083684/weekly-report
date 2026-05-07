"use client";

import { cn } from "@/lib/utils";

const moods = [
  { value: "happy", label: "开心", emoji: "😊" },
  { value: "calm", label: "平静", emoji: "😌" },
  { value: "normal", label: "一般", emoji: "😐" },
  { value: "sad", label: "低落", emoji: "😢" },
  { value: "awful", label: "难过", emoji: "😞" },
] as const;

interface MoodSelectorProps {
  value?: string | null;
  onChange: (value: string | null) => void;
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground shrink-0">心情：</span>
      <div className="flex gap-1">
        {moods.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(value === mood.value ? null : mood.value)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-sm transition-colors border",
              value === mood.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={mood.label}
          >
            {mood.emoji} {mood.label}
          </button>
        ))}
      </div>
    </div>
  );
}
