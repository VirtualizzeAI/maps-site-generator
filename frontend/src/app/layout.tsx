import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Virtualizze Prospector",
  description: "Painel de operações de prospecção automatizada da Virtualizze.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
