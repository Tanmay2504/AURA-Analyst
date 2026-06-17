<div align="center">

# 🤖 AURA Analyst
### AI-Powered Autonomous Data Analysis & Forecasting Platform

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://aura-analyst.vercel.app)
[![Backend API](https://img.shields.io/badge/⚙️_Backend_API-Render-46E3B7?style=for-the-badge&logo=render)](https://aura-analyst-backend.onrender.com)
[![API Docs](https://img.shields.io/badge/📖_API_Docs-Swagger-85EA2D?style=for-the-badge&logo=swagger)](https://aura-analyst-backend.onrender.com/api/docs)
[![GitHub](https://img.shields.io/badge/GitHub-Tanmay2504-181717?style=for-the-badge&logo=github)](https://github.com/Tanmay2504/AURA-Analyst)

**Upload a CSV. Get AI-powered insights, charts, and forecasts in seconds.**

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)
![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-Claude_Sonnet-FF9900?style=flat&logo=amazonaws)

</div>

---

## 🌐 Live Links

| Service | URL | Description |
|---------|-----|-------------|
| 🖥️ **Frontend App** | [aura-analyst.vercel.app](https://aura-analyst.vercel.app) | Main web application (Vercel) |
| ⚙️ **Backend API** | [aura-analyst-backend.onrender.com](https://aura-analyst-backend.onrender.com) | FastAPI backend (Render) |
| 📖 **API Docs** | [/api/docs](https://aura-analyst-backend.onrender.com/api/docs) | Interactive Swagger UI |
| ❤️ **Health Check** | [/health](https://aura-analyst-backend.onrender.com/health) | Backend status |

> ⚠️ **Note:** The backend is hosted on Render's free tier and may take **30–60 seconds to wake up** after inactivity. Open the health check link first to wake it up before your demo.

---

## 🎯 What is AURA Analyst?

**AURA** (Autonomous Unified Reasoning Agent) is a full-stack AI data analysis platform that transforms raw CSV datasets into actionable intelligence — with zero technical expertise required.

Upload any CSV file and within seconds receive:
- 🧠 **AI-written executive summary** (powered by Claude Sonnet 4.6 via AWS Bedrock)
- 💡 **Numbered key insights** extracted from your data
- 📊 **Auto-labeled interactive charts** (bar, trend, forecast)
- 📈 **7-day time-series forecast** (auto-detected)
- 💬 **Natural language Q&A** — ask questions about your data
- 🔬 **Per-column deep-dive statistics** with histograms
- 📁 **Multi-CSV batch analysis** with cross-file AI comparison
- 📤 **Export** results as PDF, CSV, or JSON

---

## ✨ Key Features

### 🤖 AI-Powered Analysis
- Uses **Claude Sonnet 4.6** via AWS Bedrock for narrative intelligence
- Context-aware prompting — adapts to time-series, categorical, or numeric datasets
- Generates structured JSON metadata for reports and documentation

### 📈 Forecasting Engine
- Auto-detects date columns and numeric targets
- Generates **7-day forecasts** using SARIMAX and Exponential Smoothing
- Displays historical + forecast data in a unified chart

### 💬 Natural Language Q&A
- Ask any question about your uploaded dataset in plain English
- AI answers using the actual data profile — not hallucinations

### 🔬 Column-Level Deep Dive
- Per-column statistics: min, max, mean, median, std, quartiles
- Histogram visualization for numeric columns
- Top value frequency for categorical columns
- Outlier detection and missing value analysis

### 📁 Multi-File Batch Analysis
- Upload multiple CSVs simultaneously
- AI generates cross-file comparison: shared patterns, key differences, storyline connections

### 🗂️ Persistent History
- All analyses saved in SQLite database
- Review and compare past results anytime

### 📤 Export System
- Export full analysis as **PDF** (with charts)
- Export data as **CSV** or **JSON**

---

## 🏗️ Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11 | Core language |
| **FastAPI** | 0.109 | REST API framework |
| **Uvicorn** | 0.27 | ASGI server |
| **Pandas** | 2.2.2 | Data processing |
| **NumPy** | 1.26.4 | Numerical computing |
| **statsmodels** | 0.14.1 | SARIMAX forecasting |
| **SQLAlchemy** | 2.0.25 | ORM & SQLite persistence |
| **AWS Bedrock (boto3)** | 1.34 | Claude AI integration |
| **Pydantic** | 2.5.3 | Data validation |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16 | React framework |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Recharts** | 2.12 | Interactive charts |
| **Framer Motion** | 12 | Animations |
| **Lucide React** | 0.378 | Icons |
| **jsPDF + html2canvas** | latest | PDF export |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Vercel** | Frontend hosting (CDN, auto-deploy) |
| **Render** | Backend hosting (Python web service) |
| **AWS Bedrock** | Claude Sonnet 4.6 AI inference |
| **SQLite** | Local database (auto-created) |
| **Docker** | Containerization |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                             │
│         Next.js + TypeScript (Vercel CDN)                   │
│              https://aura-analyst.vercel.app                │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                           │
│         https://aura-analyst-backend.onrender.com           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API ROUTES                                         │   │
│  │  POST /analyze          → Single CSV analysis       │   │
│  │  POST /analyze/batch    → Multi-CSV batch           │   │
│  │  POST /query/{id}       → NL Q&A                    │   │
│  │  GET  /columns/{id}     → Column list               │   │
│  │  GET  /column/{id}/{col}→ Column deep dive          │   │
│  │  GET  /history          → Analysis history          │   │
│  │  GET  /health           → Health check              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI SERVICES                                        │   │
│  │  • AWS Bedrock → Claude Sonnet 4.6                  │   │
│  │  • Dataset profiling & context inference            │   │
│  │  • SARIMAX / Exponential Smoothing forecasting      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  STORAGE                                            │   │
│  │  • SQLite (analysis history + raw CSV bytes)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
AURA-Analyst/
├── backend/
│   ├── main.py                    # FastAPI app, all routes
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # Docker container config
│   ├── api/v1/                    # Versioned API routers
│   ├── config/
│   │   └── settings.py            # Pydantic settings (env-based)
│   ├── core/
│   │   ├── exceptions.py          # Custom exception classes
│   │   ├── logging_config.py      # JSON structured logging
│   │   ├── cache.py               # Redis / memory cache
│   │   └── monitoring.py          # Prometheus metrics
│   ├── database/
│   │   ├── models.py              # SQLAlchemy ORM models
│   │   ├── session.py             # DB session management
│   │   └── migrate.py             # Schema migration utility
│   └── services/
│       ├── ai_service.py          # AI service orchestrator
│       ├── bedrock_service.py     # AWS Bedrock / Claude client
│       ├── gemini_service.py      # Data profiling & forecasting
│       └── data_processor.py     # CSV processing utilities
│
├── frontend/
│   ├── package.json               # Node dependencies
│   ├── next.config.js             # Next.js config
│   ├── vercel.json                # Vercel deployment config
│   ├── tailwind.config.ts         # Tailwind theme
│   ├── app/
│   │   ├── layout.tsx             # App shell & metadata
│   │   ├── page.tsx               # Main page (landing + analyzer)
│   │   └── globals.css            # Global styles
│   └── components/
│       ├── FileUpload.tsx         # CSV drag-and-drop upload
│       ├── AnalysisDashboard.tsx  # Results, charts, insights
│       ├── NLQueryChat.tsx        # Natural language Q&A
│       ├── ColumnAnalysisPanel.tsx# Per-column deep dive
│       ├── AIModelSelector.tsx    # Model selection UI
│       ├── ExportButton.tsx       # PDF/CSV/JSON export
│       └── ui/hero.tsx            # Landing page hero
│
├── docs/
│   ├── PROJECT_REPORT.md          # Full project report
│   ├── PROJECT_SYNOPSIS.md        # Academic synopsis
│   └── RESEARCH_PAPER.md          # Research paper
│
├── render.yaml                    # Render deployment config
├── docker-compose.yml             # Docker Compose setup
├── requirements.txt               # Root-level Python deps (Render)
├── build.sh                       # Render build script
├── start-dev.bat                  # One-click local start (Windows)
├── start-backend.bat              # Backend only
└── start-frontend.bat             # Frontend only
```

---

## 🚀 Running Locally

### Prerequisites
- Python **3.11.x** — [Download](https://www.python.org/downloads/release/python-3119/)
- Node.js **18+** — [Download](https://nodejs.org/)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Tanmay2504/AURA-Analyst.git
cd AURA-Analyst
```

### 2. Setup Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment
Create `backend/.env` (this file is gitignored for security):
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
BEDROCK_MODEL_ID=arn:aws:bedrock:us-east-1:your_account:inference-profile/us.anthropic.claude-sonnet-4-6
SECRET_KEY=your_secret_key
DATABASE_URL=sqlite:///./sql_app.db
ADMIN_PASSWORD=your_admin_password
```

### 4. Setup Frontend
```bash
cd frontend
npm install
```

### 5. Start Everything
```bash
# Windows — one click
start-dev.bat

# Or manually in two terminals:
# Terminal 1 (backend):
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 (frontend):
cd frontend && npm run dev
```

### 6. Open in Browser
| Service | URL |
|---------|-----|
| Frontend App | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| Health Check | http://localhost:8000/health |

---

## ☁️ Deployment

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → Import `Tanmay2504/AURA-Analyst`
2. Set **Root Directory** = `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL` = your Render backend URL
4. Deploy → Live at `https://aura-analyst.vercel.app`

### Backend → Render
1. Go to [render.com](https://render.com) → New Web Service → Connect repo
2. Render auto-detects `render.yaml` configuration
3. Add secret environment variables in the Render dashboard:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `ADMIN_PASSWORD`
   - `CORS_ORIGINS` = `["https://aura-analyst.vercel.app"]`
4. Deploy → Live at `https://aura-analyst-backend.onrender.com`

---

## 📊 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Analyze a single CSV file |
| `POST` | `/analyze/batch` | Analyze multiple CSV files |
| `GET` | `/history` | Get analysis history |
| `GET` | `/analysis/{id}` | Get a specific analysis |
| `GET` | `/columns/{id}` | Get column names for an analysis |
| `GET` | `/column/{id}/{col}` | Deep-dive stats for a column |
| `POST` | `/query/{id}` | Ask a natural language question |
| `GET` | `/health` | Basic health check |
| `GET` | `/health/detailed` | Detailed service status |
| `GET` | `/api/docs` | Interactive Swagger UI |

---

## 📚 Documentation

| Document | Link |
|----------|------|
| Project Report | [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md) |
| Project Synopsis | [docs/PROJECT_SYNOPSIS.md](docs/PROJECT_SYNOPSIS.md) |
| Research Paper | [docs/RESEARCH_PAPER.md](docs/RESEARCH_PAPER.md) |
| Project Overview | [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) |
| AI Model Guide | [AI_MODEL_SELECTION_GUIDE.md](AI_MODEL_SELECTION_GUIDE.md) |
| Deployment Guide | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |

---

## 👨‍💻 Author

**Tanmay Patel**
- GitHub: [@Tanmay2504](https://github.com/Tanmay2504)
- Project: [AURA-Analyst](https://github.com/Tanmay2504/AURA-Analyst)

---

<div align="center">

**⭐ Star this repo if you found it useful!**

Made with ❤️ using FastAPI, Next.js, and AWS Bedrock

</div>
