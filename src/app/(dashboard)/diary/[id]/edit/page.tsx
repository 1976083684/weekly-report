import { auth } from "@/lib/auth";
import { getDiaryById } from "@/lib/diary";
import { notFound } from "next/navigation";
import { DiaryForm } from "@/components/diary/DiaryForm";
import { toLocalDateStr } from "@/lib/utils";

export default async function EditDiaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const { id } = await params;
  const diary = await getDiaryById(id, session.user.id);
  if (!diary) return notFound();

  return (
    <DiaryForm
      initialData={{
        id: diary.id,
        title: diary.title,
        content: diary.content,
        date: toLocalDateStr(diary.date),
        mood: diary.mood,
        tags: diary.tags.map((dt) => ({ tag: dt.tag })),
      }}
    />
  );
}
