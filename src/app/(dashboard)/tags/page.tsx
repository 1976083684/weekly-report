"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X, Plus, Square, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Tag {
  id: string;
  name: string;
  _count: { diaries: number };
}

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  // Create new tag
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);

  // Batch delete
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const fetchTags = async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data.tags || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setCreating(true);
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    setNewTagName("");
    setCreating(false);
    fetchTags();
  };

  const renameTag = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchTags();
  };

  const deleteTag = async (id: string, name: string) => {
    if (!confirm(`确定删除标签「${name}」？将从所有日记中移除该标签。`)) return;
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    fetchTags();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === tags.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tags.map((t) => t.id)));
    }
  };

  const batchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 个标签？将从所有日记中移除这些标签。`)) return;
    setBatchDeleting(true);
    await fetch("/api/tags/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setSelected(new Set());
    setBatchDeleting(false);
    fetchTags();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-6">标签管理</h1>

      {/* Create new tag */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createTag()}
          placeholder="输入新标签名称"
          className="h-9 text-sm"
        />
        <Button size="sm" onClick={createTag} disabled={creating || !newTagName.trim()}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          添加
        </Button>
      </div>

      {tags.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          暂无标签
        </p>
      ) : (
        <>
          {/* Batch actions */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={toggleAll}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {selected.size === tags.length ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selected.size > 0 ? `已选 ${selected.size} 项` : "全选"}
            </button>
            {selected.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={batchDelete}
                disabled={batchDeleting}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                删除选中
              </Button>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(tag.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {selected.has(tag.id) ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {editingId === tag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && renameTag(tag.id)}
                        className="h-8 w-40"
                        autoFocus
                      />
                      <button
                        onClick={() => renameTag(tag.id)}
                        className="p-1 rounded text-success hover:bg-success/10"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">
                        {tag.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tag._count.diaries} 篇日记
                      </span>
                    </>
                  )}
                </div>
                {editingId !== tag.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditName(tag.name);
                      }}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTag(tag.id, tag.name)}
                      className="h-8 px-2 text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
