"use client";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2 shrink-0 text-sm text-muted-foreground">
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary"
      />
      <span>至</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );
}
