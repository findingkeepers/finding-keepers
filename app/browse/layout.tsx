import { BrowseNav } from "@/components/layout/BrowseNav";

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen fk-paper-bg">
      <BrowseNav />
      <main>{children}</main>
    </div>
  );
}