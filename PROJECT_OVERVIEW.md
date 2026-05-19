# AURA Analyst - Complete Project Overview

## 🎯 Project Summary

A **full-stack AI data analysis platform** that turns CSV datasets into actionable insights, visualizations, and short-term forecasts. The application combines a FastAPI backend, a modern Next.js frontend, and Gemini-powered analysis to generate summaries, chart data, forecast data, and structured metadata for reports and presentations.

**Built by:** Tanmay Patel  
**Date:** May 2026  
**Status:** ✅ Demo Ready / Active Development  
**Purpose:** Academic and presentation-ready data analysis project

---

## 🚀 What Does It Do?

### **Data Analysis:**
- Uploads CSV files and analyzes them automatically
- Supports multiple CSV uploads in a single batch
- Uses a sampled fast local pass for each file in batch mode to reduce runtime and Gemini usage
- Detects dataset structure, including likely date, target, and categorical columns
- Generates AI-written executive summaries and insights
- Produces chart-ready data for visual dashboards
- Builds 7-day forecasts when a valid time series is detected
- Stores past analyses locally for history and review
- Creates cross-file AI connections when multiple datasets are uploaded together

### **Visualization:**
- Displays bar charts for dataset summaries
- Displays trend and forecast charts for time-series data
- Adjusts chart titles and labels to match the actual dataset type
- Highlights historical vs forecast values
- Supports data exploration through a clean dashboard UI
- Shows an explicit executive summary for both single-file and multi-file analysis results

### **Project Output Support:**
- Creates structured analysis metadata for report generation
- Supports project report, synopsis, poster, presentation, and research-paper drafting
- Provides a reusable data manifest for Gemini-based content generation
- Keeps the workflow quota-aware by avoiding unnecessary test runs against Gemini
- Helps build industry-style multi-dataset comparison narratives
- Surfaces a visible executive summary card for batch comparisons

---

## 🧠 Core Capabilities

- ✅ CSV ingestion and validation
- ✅ Automated dataset profiling
- ✅ Date and numeric target detection
- ✅ Time-series forecasting for suitable datasets
- ✅ Gemini-generated summaries and insights
- ✅ Persistent analysis history
- ✅ Clean dark-themed dashboard UI
- ✅ Home navigation and analyzer routing
- ✅ Report-ready structured metadata
- ✅ Multi-CSV batch upload and comparison support

---

## 🏗️ Technology Stack

### **Backend:**
- **Framework:** FastAPI
- **Language:** Python
- **Server:** Uvicorn
- **Data Processing:** Pandas, NumPy
- **Database:** SQLAlchemy with SQLite
- **Forecasting:** statsmodels (`SARIMAX`, `ExponentialSmoothing`)
- **AI Integration:** Google Gemini API
- **Validation / Serialization:** Pydantic

### **Frontend:**
- **Framework:** Next.js
- **Language:** TypeScript
- **UI Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Animations:** Framer Motion

### **Development Environment:**
- **OS:** Windows
- **Package Management:** `requirements.txt` + `package.json`
- **Local Services:** Backend API on port `8000`, frontend on port `3000`

---

## 📋 Tech Stack Snapshot

| Layer | Tools | Purpose |
|------|-------|---------|
| Backend | FastAPI, Uvicorn, SQLAlchemy | API, persistence, and service orchestration |
| Data | Pandas, NumPy | CSV loading, profiling, and transformation |
| Forecasting | `statsmodels` | Time-series prediction and fallback forecasting |
| AI | Google Gemini API | Narrative summaries and insight generation |
| Frontend | Next.js, TypeScript | Landing page and analyzer UI |
| Visualization | Recharts | Bar charts and forecast charts |
| Styling | Tailwind CSS, Framer Motion | Modern responsive presentation |

---

## 📊 System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                        │
│                   Next.js + TypeScript UI                    │
│                     http://localhost:3000                     │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                │ HTTP REST API
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                         FASTAPI BACKEND                       │
│                     http://127.0.0.1:8000                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │               API LAYER                                 │  │
│  │  • POST /analyze                                        │  │
│  │  • GET  /history                                        │  │
│  │  • GET  /analysis/{id}                                  │  │
│  │  • GET  /health                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            ANALYSIS / AI SERVICES                       │  │
│  │  • Dataset profiling                                    │  │
│  │  • Time-series detection                                │  │
│  │  • Forecast generation                                  │  │
│  │  • Gemini text synthesis                                │  │
│  │  • Structured metadata generation                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │               STORAGE LAYER                              │  │
│  │  • SQLite persistence                                  │  │
│  │  • Analysis history                                     │  │
│  │  • Forecast and metadata records                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔬 Core Modules

| Module | File | Role |
|--------|------|------|
| API entry point | `backend/main.py` | Handles upload, history, and analysis routes |
| Dataset intelligence | `backend/services/gemini_service.py` | Profiles data, infers context, builds forecast inputs |
| Persistence | `backend/database/models.py` | Stores results, metadata, and raw CSV bytes |
| Dashboard | `frontend/components/AnalysisDashboard.tsx` | Renders summary, insights, and charts |
| Landing page | `frontend/components/ui/hero.tsx` | Hero CTA and feature navigation |
| Main route | `frontend/app/page.tsx` | Coordinates analyzer visibility and result flow |

---

## 🎨 User Interface

### **Landing Page**
- Hero section with clear CTA buttons
- Feature highlights and visual preview
- Start Analyzing navigation
- Learn More scrolling to feature cards

### **Analyzer Page**
- CSV upload area
- Loading/agent progress display
- AI-generated executive summary
- Key insights list
- Data visualization section
- 7-day forecast section for time-series datasets
- History panel for previous analyses
- Home button to return to the landing page

### **Result Experience**
- Automatically adapts labels and titles to the detected data type
- Avoids hardcoded labels like "Sales" for unrelated datasets
- Displays the inferred series label from the dataset metadata
- Keeps output usable for real-world datasets such as public health or COVID-19 data

---

## 📁 Project Structure

```
Minor/
├── backend/
│   ├── main.py                 # FastAPI app and routes
│   ├── requirements.txt        # Python dependencies
│   ├── database/
│   │   ├── models.py           # SQLAlchemy models
│   │   └── session.py          # Database session setup
│   └── services/
│       ├── ai_service.py       # Service wrapper
│       └── gemini_service.py   # Profiling, analysis, forecasting
│
├── frontend/
│   ├── package.json            # Frontend dependencies
│   ├── app/
│   │   ├── layout.tsx          # App shell
│   │   ├── page.tsx            # Main landing/analyzer page
│   │   └── globals.css         # Global styles
│   └── components/
│       ├── AnalysisDashboard.tsx  # Results and charts
│       └── FileUpload.tsx         # CSV upload UI
│
├── reports/
│   └── data_manifest_for_gemini.md  # Report + paper + poster manifest
│
└── PROJECT_OVERVIEW.md         # This document
```

---

## 🔬 Analysis Pipeline

### **1. CSV Upload**
- User uploads a CSV file through the frontend
- File is sent to the FastAPI `/analyze` endpoint

### **2. Dataset Profiling**
- Backend computes row and column counts
- Missing values, duplicates, correlations, and outlier patterns are profiled
- Candidate date and numeric target columns are detected

### **3. Context Inference**
- Dataset is classified as one of:
  - `time_series`
  - `categorical_summary`
  - `numeric_summary`
- The system identifies likely target and date columns
- Friendly series labels are created from column names and filenames

### **4. AI Analysis**
- Gemini is prompted with the dataset profile and detected analysis context
- The service returns summaries and insights
- Structured metadata is generated for reporting

### **5. Multi-File Comparison**
- If more than one CSV is uploaded, each file is analyzed individually
- Each file is first analyzed using a sampled fast local pass, then Gemini synthesizes cross-file similarities, differences, and storyline connections
- The app returns both per-file dashboards and a combined comparison summary

### **6. Forecasting**
- If a usable time series is found, the backend generates a 7-day forecast
- Forecast model attempts:
  - `SARIMAX`
  - `ExponentialSmoothing`

### **7. Frontend Rendering**
- Dashboard renders chart(s), summary, insights, and forecast
- Titles and tooltips follow the actual dataset context
- Results are saved in history for later review

---

## 📈 Output Types

### **Generated by the App:**
- Executive summary
- Key insights
- Dataset chart data
- Forecast data
- Cross-file AI comparison summary
- Shared patterns and key differences
- Analysis metadata
- Processing status log
- History records

### **Useful for Gemini Reports:**
- Complete report narrative
- Synopsis and abstract
- Research paper sections
- Poster text and layout guidance
- Presentation outline and speaker notes
- Figure and table suggestions

---

## 📊 Performance Snapshot

| Area | Current State |
|------|---------------|
| CSV upload and parsing | Working |
| Dataset profiling | Working |
| Context inference | Working |
| Gemini summaries | Working |
| Forecast generation | Working for time-series data |
| History persistence | Working |
| Adaptive chart labels | Working |
| Report manifest support | Working |

---

## ✨ Key Features

### **1. Context-Aware Analysis**
- Detects whether the file is a time-series dataset or a categorical summary
- Uses dataset-specific chart titles and labels
- Avoids hardcoded labels that do not match the data

### **2. Forecasting**
- Produces 7-day forecasts when possible
- Uses time-series aware preprocessing
- Fallback forecasting methods improve robustness

### **3. Explainable Output**
- Provides concise AI-written insights
- Structures results so they can be reused in formal documents
- Supports report generation without manual rewriting

### **4. History and Persistence**
- Saves prior analyses in SQLite
- Supports review of earlier results
- Allows repeated comparison of analysis outputs

### **5. Clean UI**
- Modern dark theme
- Responsive layout
- Simple navigation between landing and analyzer sections
- Clear empty/loading/error states

---

## 🎯 Current Status

### ✅ **COMPLETE:**
- [x] FastAPI backend
- [x] Next.js frontend
- [x] CSV analysis workflow
- [x] Multi-CSV upload and cross-file comparison
- [x] Fast local analysis path for batch mode
- [x] Gemini-based insight generation
- [x] Dataset profiling and metadata inference
- [x] 7-day forecasting for detected time series
- [x] Chart rendering and adaptive titles
- [x] Analysis history
- [x] Report manifest template

### ⚠️ **PARTIAL / OPTIONAL:**
- [~] More advanced model explainability
- [~] Richer report auto-generation pipeline
- [~] Additional dataset-type classifiers
- [~] More robust error recovery for quota-limited Gemini calls

### ❌ **NOT IMPLEMENTED:**
- [ ] User authentication
- [ ] Cloud deployment
- [ ] Mobile app
- [ ] Batch file processing
- [ ] Real-time social media monitoring
- [ ] Multi-language support

---

## 🧾 Notes for Report Writing

This project is especially suitable for:
- Final-year academic project reports
- Research posters
- Seminar presentations
- Synopsis submissions
- Research paper drafting

### Recommended framing:
- Focus on **AI-assisted data understanding**
- Emphasize **context-aware charting and forecasting**
- Highlight **structured metadata for automated documentation**
- Mention that the app is designed to support real datasets, not just demo data

---

## 📌 Recommended Next Steps

- Finalize the dataset-specific report wording for your real CSV
- Use `reports/data_manifest_for_gemini.md` to feed Gemini all required context
- Add sample dataset statistics once your CSV is fixed
- Export poster, synopsis, slides, and paper from the structured metadata

---

If you want, I can also turn this into a **more polished exhibition-style version** with icons, tables, and a stronger visual layout, or make it **match your sample file even more closely** section by section.
