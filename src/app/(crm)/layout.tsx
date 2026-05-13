import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f6f8fa" }}>
      <Sidebar role={session.user.role} />
      <main
        className="crm-bg"
        style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", position: "relative" }}
      >
        {children}
      </main>
    </div>
  );
}
