import "./globals.css";
import React from "react";
import CustomCursor from "@/components/CustomCursor";

export const metadata = {
  title: "AURA Analyst — AI-Powered Data Analysis",
  description: "Transform your CSV data into actionable insights with AWS Bedrock and Claude AI. Instant analysis, beautiful visualizations, and smart forecasting.",
  keywords: "data analysis, AI, CSV, machine learning, business intelligence, AWS Bedrock, Claude",
  openGraph: {
    title: "AURA Analyst — AI-Powered Data Analysis",
    description: "Transform your CSV data into actionable insights with AWS Bedrock and Claude AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#020817] text-slate-100">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
