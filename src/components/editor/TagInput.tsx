"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
}

interface TagInputProps {
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagInput({ selected, onChange }: TagInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setAllTags(data.tags || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.trim()) {
      const filtered = allTags.filter(
        (t) =>
          t.name.includes(value.trim()) &&
          !selected.some((s) => s.id === t.id)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addTag = (tag: Tag) => {
    if (!selected.some((s) => s.id === tag.id)) {
      onChange([...selected, tag]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const createAndAddTag = () => {
    const name = input.trim();
    if (!name || name.length > 20) return;
    if (selected.some((s) => s.name === name)) {
      setInput("");
      setShowSuggestions(false);
      return;
    }
    const existing = allTags.find((t) => t.name === name);
    if (existing) {
      addTag(existing);
      return;
    }
    // Create tag via API then add
    fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((r) => r.json())
      .then((tag) => {
        setAllTags((prev) => [...prev, tag]);
        addTag(tag);
      })
      .catch(() => {});
  };

  const removeTag = (tagId: string) => {
    onChange(selected.filter((t) => t.id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) createAndAddTag();
    }
    if (e.key === "Backspace" && !input && selected.length > 0) {
      removeTag(selected[selected.length - 1].id);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm text-muted-foreground">标签：</span>
      <div ref={ref} className="relative">
        <div className="flex flex-wrap gap-1.5 items-center min-h-[38px] px-3 py-2 rounded-lg border border-border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
          {selected.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="hover:text-danger transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => input.trim() && setShowSuggestions(true)}
            placeholder={selected.length === 0 ? "输入标签..." : ""}
            className="flex-1 min-w-[80px] outline-none text-sm bg-transparent placeholder:text-muted-foreground/60"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => addTag(tag)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
