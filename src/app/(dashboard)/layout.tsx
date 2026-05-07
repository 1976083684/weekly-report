import { AuthProvider } from "@/components/layout/AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastContainer } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppLayout>{children}</AppLayout>
      <ToastContainer />
    </AuthProvider>
  );
}
