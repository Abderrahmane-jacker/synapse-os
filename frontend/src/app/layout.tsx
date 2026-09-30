import type { Metadata } from "next";
import "./globals.css";
import SetupGuard from "@/components/setup/SetupGuard";

export const metadata: Metadata = {
  title: "SynapseOS — Local-First Cognitive Operating System",
  description: "Container-native cognitive operating system connecting Obsidian markdown vaults with PostgreSQL pgvector and local LLMs. Zero telemetry, sub-second HNSW semantic search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <SetupGuard>
          {children}
        </SetupGuard>
      </body>
    </html>
  );
}
