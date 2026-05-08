import { auth } from "@/lib/auth";
import { getWeeklyById } from "@/lib/weekly";
import { notFound } from "next/navigation";
import { EditWeeklyForm } from "./EditWeeklyForm";
import { toLocalDateStr } from "@/lib/utils";

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
      initialStartDate={toLocalDateStr(weekly.startDate)}
      initialEndDate={toLocalDateStr(weekly.endDate)}
    />
  );
}
