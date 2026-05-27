import "./globals.css";
import React from "react";
import CustomCursor from "@/components/CustomCursor";

export const metadata = {
  title: "AURA // Neural Analyst",
  description: "AI-powered data analysis terminal. Upload CSV. Get intelligence.",
  keywords: "data analysis, AI, CSV, AWS Bedrock, Claude, terminal",
  openGraph: {
    title: "AURA // Neural Analyst",
    description: "AI-powered data analysis terminal. Upload CSV. Get intelligence.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0a0a08] text-[#e8e0cc]">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
