import type { Metadata } from "next";
import "@/components/Flipbook/flipbook.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="catalog-layout">
      {children}
    </div>
  );
}
