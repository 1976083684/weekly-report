import { auth } from "@/lib/auth";
import { getWeeklyById } from "@/lib/weekly";
import { notFound } from "next/navigation";
import { EditWeeklyForm } from "./EditWeeklyForm";

export default async function EditWeeklyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const { id } = await params;
  const weekly = await getWeeklyById(id, session.user.id);
  if (!weekly) return notFound();

  return (
    <EditWeeklyForm
      id={weekly.id}
      initialTitle={weekly.title}
      initialContent={weekly.content}
      initialStartDate={weekly.startDate.toISOString().slice(0, 10)}
      initialEndDate={weekly.endDate.toISOString().slice(0, 10)}
    />
  );
}
