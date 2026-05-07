import "./globals.css";
import React from 'react';

export const metadata = {
  title: "AI Data Analyst Agent",
  description: "Analyze your data with Gemini AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
