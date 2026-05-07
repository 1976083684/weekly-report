import { auth } from "@/lib/auth";
import { getDiaryById } from "@/lib/diary";
import { notFound } from "next/navigation";
import { DiaryForm } from "@/components/diary/DiaryForm";

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
        date: diary.date.toISOString().slice(0, 10),
        mood: diary.mood,
        tags: diary.tags.map((dt) => ({ tag: dt.tag })),
      }}
    />
  );
}
