"use client";

import { useState, useEffect } from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { TagInput } from "@/components/editor/TagInput";
import { AiOptimizeButton } from "@/components/ai/AiOptimizeButton";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { cn, toLocalDateStr, todayStr } from "@/lib/utils";

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));

  const days: { label: string; date: string }[] = [];
  const weekLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      label: weekLabels[i],
      date: toLocalDateStr(d),
    });
  }
  return days;
}

interface DiaryData {
  id?: string;
  content: string;
  date: string;
  tags: { id: string; name: string }[];
}

export function WeeklyForm() {
  const weekDays = getWeekDates();
  const today = todayStr();

  const defaultDay = weekDays.find((d) => d.date === today)?.label || weekDays[0].label;
  const [selectedDay, setSelectedDay] = useState<string | null>(defaultDay);
  const [diaries, setDiaries] = useState<Map<string, DiaryData>>(new Map());
  interface EntrySummary { title: string; content: string; date: string; type: string; }
  const [allEntries, setAllEntries] = useState<EntrySummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    open: boolean;
    type: "success" | "error";
    message: string;
    onConfirm?: () => void;
  }>({ open: false, type: "success", message: "" });

  // Weekly report
  const [weeklyContent, setWeeklyContent] = useState("");
  const [existingWeeklyId, setExistingWeeklyId] = useState<string | null>(null);
  const [weeklyLoaded, setWeeklyLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);

  // Load all diaries + existing weekly for this week
  useEffect(() => {
    const startDate = weekDays[0].date;
    const endDate = weekDays[6].date;

    // Fetch daily reports for editor (type=daily_report)
    const diaryParams = new URLSearchParams();
    diaryParams.set("dateFrom", startDate);
    diaryParams.set("dateTo", endDate);
    diaryParams.set("type", "daily_report");
    diaryParams.set("pageSize", "50");
    fetch(`/api/diary?${diaryParams}`)
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, DiaryData>();
        for (const d of data.diaries || []) {
          const date = d.date.slice(0, 10);
          map.set(date, {
            id: d.id,
            content: d.content,
            date,
            tags: (d.tags || []).map((t: { tag: { id: string; name: string } }) => t.tag),
          });
        }
        setDiaries(map);
      })
      .catch(() => {});

    // Fetch all entries (diary + daily_report) for weekly summary
    const allParams = new URLSearchParams();
    allParams.set("dateFrom", startDate);
    allParams.set("dateTo", endDate);
    allParams.set("pageSize", "100");
    fetch(`/api/diary?${allParams}`)
      .then((r) => r.json())
      .then((data) => {
        const allList = data.diaries || [];
        setAllEntries(allList);
      })
      .catch(() => {});

    // Fetch existing weekly for this week
    const weeklyParams = new URLSearchParams();
    weeklyParams.set("startDate", startDate);
    weeklyParams.set("endDate", endDate);
    fetch(`/api/weekly?${weeklyParams}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.weeklies || [];
        if (list.length > 0) {
          setExistingWeeklyId(list[0].id);
          setWeeklyContent(list[0].content);
        }
        setWeeklyLoaded(true);
      })
      .catch(() => setWeeklyLoaded(true));
  }, []);

  const currentDay = weekDays.find((d) => d.label === selectedDay);
  const currentDiary = currentDay
    ? (diaries.get(currentDay.date) || { content: "", date: currentDay.date, tags: [] })
    : { content: "", date: today, tags: [] };

  const updateCurrentDiary = (field: string, value: unknown) => {
    if (!selectedDay) return;
    const date = weekDays.find((d) => d.label === selectedDay)!.date;
    const next = new Map(diaries);
    const existing = next.get(date) || { content: "", date, tags: [] };
    next.set(date, { ...existing, [field]: value });
    setDiaries(next);
  };

  const handleSave = async () => {
    if (!selectedDay || !currentDiary.content.trim()) {
      setAlert({ open: true, type: "error", message: "请选择日期并输入内容" });
      return;
    }
    setSaving(true);

    const date = weekDays.find((d) => d.label === selectedDay)!.date;
    const diary = diaries.get(date);
    const content = diary?.content || currentDiary.content;
    const tags = diary?.tags || currentDiary.tags;
    const title = `${selectedDay} ${date} 日报`;
    const body = {
      title,
      content,
      date,
      type: "daily_report",
      tagIds: tags.map((t) => t.id),
    };

    try {
      const url = diary?.id ? `/api/diary/${diary.id}` : "/api/diary";
      const method = diary?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const saved = await res.json();
        const next = new Map(diaries);
        const current = next.get(date) || { content: "", date, tags: [] as { id: string; name: string }[] };
        next.set(date, {
          ...current,
          content,
          id: saved.id || diary?.id,
        });
        setDiaries(next);
        toast("success", "保存成功");
      } else {
        const data = await res.json();
        setAlert({ open: true, type: "error", message: data.error || "保存失败" });
      }
    } catch {
      setAlert({ open: true, type: "error", message: "保存失败" });
    }
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/weekly/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: weekDays[0].date,
          endDate: weekDays[6].date,
          diaryIds: Array.from(diaries.values())
            .filter((d) => d.id)
            .map((d) => d.id!),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWeeklyContent(data.content);
        setShowWeekly(true);
      }
    } catch {
      // ignore
    }
    setGenerating(false);
  };

  const handleSaveWeekly = async () => {
    setSaving(true);
    try {
      const url = existingWeeklyId
        ? `/api/weekly/${existingWeeklyId}`
        : "/api/weekly";
      const method = existingWeeklyId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `周报 ${weekDays[0].date} ~ ${weekDays[6].date}`,
          content: weeklyContent,
          startDate: weekDays[0].date,
          endDate: weekDays[6].date,
        }),
      });
      if (res.ok) {
        toast("success", "保存成功");
      }
    } catch {
      setAlert({ open: true, type: "error", message: "周报保存失败" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Day selector bar */}
      <div className="flex items-center gap-1 bg-card rounded-xl border border-border p-1 overflow-x-auto">
        {weekDays.map((day) => {
          const active = selectedDay === day.label;
          const hasDiary = diaries.has(day.date) && diaries.get(day.date)!.content;
          const isToday = day.date === today;
          return (
            <button
              key={day.label}
              type="button"
              onClick={() => {
                setSelectedDay(day.label);
                setShowWeekly(false);
              }}
              className={cn(
                "flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 min-w-[52px]",
                active
                  ? "bg-primary text-white"
                  : isToday
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span className={cn("text-[10px] opacity-75", active && "opacity-100")}>
                {day.date.slice(5)}
              </span>
              <span className="font-medium text-sm">
                {day.label.slice(0, 2)}
              </span>
              {hasDiary && (
                <span className={cn("w-1 h-1 rounded-full mt-0.5", active ? "bg-white" : "bg-primary")} />
              )}
            </button>
          );
        })}
        <div className="w-px h-8 bg-border mx-1 shrink-0" />
        <button
          type="button"
          onClick={() => {
            setShowWeekly(true);
          }}
          className={cn(
            "flex flex-col items-center px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0",
            showWeekly
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] mt-0.5">周报</span>
        </button>
      </div>

      <AlertDialog
        open={alert.open}
        onOpenChange={(open) => setAlert((prev) => ({ ...prev, open }))}
        type={alert.type}
        message={alert.message}
        onConfirm={alert.onConfirm}
      />

      {showWeekly ? (
        /* Weekly Report View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">周报</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {generating ? "聚合中..." : "重新聚合"}
              </Button>
              <Button size="sm" onClick={handleSaveWeekly} disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                保存周报
              </Button>
            </div>
          </div>
          <MarkdownEditor
            value={weeklyContent}
            onChange={setWeeklyContent}
            placeholder="点击「聚合」生成周报..."
            minHeight="500px"
          />

          <AiOptimizeButton
            content={weeklyContent}
            type="weekly"
            onAccept={(optimized) => setWeeklyContent(optimized)}
            placeholder="请先生成或输入周报内容"
          />

          {/* Preview of all week entries */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground">本周汇总</h3>
            {allEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">本周还没有记录</p>
            ) : (
              <div className="space-y-2">
                {allEntries.map((entry) => {
                  const entryDate = entry.date.slice(0, 10);
                  const dayInfo = weekDays.find((d) => d.date === entryDate);
                  const label = dayInfo ? dayInfo.label : entryDate;
                  const excerpt = entry.content.replace(/[#*`\->]/g, "").slice(0, 60);
                  const typeTag = entry.type === "daily_report" ? "日报" : "日记";
                  return (
                    <div key={`${entry.date}-${entry.title}`} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-medium shrink-0">{label}：</span>
                      <span className="text-muted-foreground text-xs shrink-0 bg-muted px-1 rounded">{typeTag}</span>
                      <span className="text-foreground">
                        {excerpt}{entry.content.length > 60 ? "..." : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Daily Diary Editor */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {selectedDay}
              <span className="text-sm text-muted-foreground font-normal ml-2">
                {weekDays.find((d) => d.label === selectedDay)!.date}
              </span>
            </h2>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>

          <MarkdownEditor
            value={currentDiary.content}
            onChange={(v) => updateCurrentDiary("content", v)}
            placeholder={`${selectedDay}发生了什么...`}
            minHeight="400px"
          />

          <AiOptimizeButton
            content={currentDiary.content}
            type="daily_report"
            onAccept={(optimized) => updateCurrentDiary("content", optimized)}
            placeholder={`${selectedDay}发生了什么...`}
          />

          <TagInput
            selected={currentDiary.tags}
            onChange={(tags) => updateCurrentDiary("tags", tags)}
          />
        </div>
      )}
    </div>
  );
}
