"use client";

import { usePathname } from "next/navigation";
import { AdminLayoutProvider } from "@/components/admin/AdminLayoutProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/fk-admin/login") {
    return <>{children}</>;
  }

  return <AdminLayoutProvider>{children}</AdminLayoutProvider>;
}