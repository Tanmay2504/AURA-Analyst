# Appendix A: Project Synopsis

**Title:** AURA Analyst — AI-Powered Autonomous Data Analysis and Forecasting Platform

---

## 1. INTRODUCTION

In the modern data-driven economy, organizations and researchers generate vast quantities of structured data in the form of CSV files, spreadsheets, and tabular records. However, the ability to extract meaningful insights from this data remains a bottleneck — requiring specialized knowledge of statistics, data science tools, and visualization libraries. Most users lack the technical expertise to perform even basic exploratory data analysis (EDA), let alone time-series forecasting or cross-dataset comparison.

This project proposes **AURA Analyst** (Autonomous Unified Reasoning Agent), a full-stack AI-powered data analysis platform that transforms raw CSV datasets into actionable intelligence. The system leverages **Google Gemini (Claude Sonnet 4.6 via AWS Bedrock)** as its AI backbone, combined with a **FastAPI** backend and a **Next.js** frontend, to deliver automated executive summaries, key insights, interactive visualizations, and 7-day time-series forecasts — all through a clean, terminal-themed web interface.

---

## 2. MOTIVATION & PROBLEM STATEMENT

### The Problem:
- **Data literacy gap:** Non-technical users cannot interpret raw CSV data without tools.
- **Manual analysis bottleneck:** Traditional EDA requires Python/R expertise and hours of work.
- **Fragmented tooling:** Existing tools (Excel, Tableau, Jupyter) require separate setup, licensing, and expertise.
- **No narrative intelligence:** Charts and tables do not explain *why* a trend exists or *what* action to take.
- **No forecasting for general users:** Time-series forecasting is inaccessible without statistical knowledge.

### The Solution:
AURA Analyst provides a **one-click, zero-expertise** data analysis experience. A user uploads a CSV file and within seconds receives:
- An AI-written executive summary
- Numbered key insights
- An auto-labeled bar chart or trend chart
- A 7-day forecast (for time-series data)
- A natural language Q&A interface to ask follow-up questions
- Per-column deep-dive statistics

---

## 3. OBJECTIVES

The primary objectives of this project are:

- **Automated EDA:** To automatically profile any CSV dataset — detecting data types, missing values, outliers, correlations, and statistical distributions.
- **Context-Aware AI Analysis:** To classify datasets as time-series, categorical, or numeric and generate context-specific summaries using Google Gemini / AWS Bedrock Claude.
- **Time-Series Forecasting:** To detect date columns and generate 7-day forecasts using SARIMAX and Exponential Smoothing models.
- **Multi-File Comparison:** To support batch upload of multiple CSVs and generate cross-file AI comparison narratives.
- **Natural Language Q&A:** To allow users to ask free-form questions about their data and receive AI-generated answers.
- **Column-Level Deep Dive:** To provide per-column statistics including histograms, top values, outlier counts, and distribution metrics.
- **Persistent History:** To store all past analyses in a local SQLite database for review and comparison.
- **Export Capability:** To export analysis results as PDF, CSV, or JSON for reporting and documentation.

---

## 4. METHODOLOGY

The system follows a **3-Tier Architecture** (Presentation, Application, Intelligence):

### 4.1 Data Ingestion & Profiling
- User uploads one or more CSV files via drag-and-drop interface
- Backend computes: row/column counts, missing value percentages, duplicate detection, data type inference, outlier detection (IQR method), and Pearson correlation matrix

### 4.2 Context Inference Engine
- Dataset is classified into one of three types:
  - `time_series` — contains a parseable date column with a numeric target
  - `categorical_summary` — contains a dominant categorical column
  - `numeric_summary` — general numeric dataset
- Friendly series labels, chart titles, and axis labels are inferred from column names and filenames

### 4.3 AI Analysis (Gemini / Claude)
- The dataset profile is sent to the AI model with a structured prompt
- The model returns: executive summary, numbered insights, chart data (labels + values), and structured JSON metadata
- For multi-file uploads, a second AI call generates cross-file comparison narratives

### 4.4 Forecasting Pipeline
- If a time series is detected, the backend attempts:
  1. **SARIMAX** (Seasonal ARIMA with exogenous variables)
  2. **Exponential Smoothing** (fallback)
- Generates 7 future data points with dates
- Historical and forecast data are combined for unified chart rendering

### 4.5 Frontend Rendering
- Results are rendered in a terminal-themed dark UI
- Charts use Recharts with amber/dark color scheme
- All labels, titles, and tooltips adapt to the detected dataset context

---

## 5. HARDWARE & SOFTWARE REQUIREMENTS

### Hardware:
- **Processor:** Intel Core i5/i7 or AMD Ryzen 5 (minimum 4 cores)
- **RAM:** Minimum 8 GB (16 GB recommended)
- **Storage:** 256 GB SSD
- **Network:** Internet connection required for AI API calls

### Software:
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion
- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pandas, NumPy, statsmodels, SQLAlchemy
- **Database:** SQLite (local), PostgreSQL (production roadmap)
- **AI/ML:** Google Gemini API / AWS Bedrock (Claude Sonnet 4.6)
- **Deployment:** Render (backend), Vercel (frontend), Docker

---

## 6. EXPECTED OUTCOMES

- A fully functional web application capable of analyzing any CSV dataset and generating AI-written insights within 5–10 seconds.
- A 7-day forecasting engine that automatically detects time-series data and produces accurate short-term predictions.
- A natural language Q&A interface allowing non-technical users to interrogate their data conversationally.
- A column-level deep-dive panel providing statistical distributions, histograms, and outlier analysis.
- A persistent analysis history enabling users to compare results across multiple sessions.
- An export system supporting PDF, CSV, and JSON output for academic and professional reporting.

---

## 7. REFERENCES

1. Google DeepMind (2024). "Gemini: A Family of Highly Capable Multimodal Models." *arXiv:2312.11805*.
2. Anthropic (2024). "Claude Sonnet 4.6 Model Card." AWS Bedrock Documentation.
3. Seabold, S., & Perktold, J. (2010). "Statsmodels: Econometric and Statistical Modeling with Python." *Proceedings of the 9th Python in Science Conference*.
4. Ramírez, S. (2018). "FastAPI Framework." https://fastapi.tiangolo.com/
5. Vercel, Inc. (2016). "Next.js: The React Framework." https://nextjs.org/docs
6. McKinney, W. (2010). "Data Structures for Statistical Computing in Python." *Proceedings of the 9th Python in Science Conference*.
7. Hyndman, R.J., & Athanasopoulos, G. (2021). *Forecasting: Principles and Practice* (3rd ed). OTexts.
