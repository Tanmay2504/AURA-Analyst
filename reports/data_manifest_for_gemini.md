# Data Manifest & Project Package — For Gemini

Purpose
- A single comprehensive manifest the AI (Gemini) can consume to produce: posters, synopsis, presentations, research paper, tables, figures, executive summary, and reproducible code instructions.
- Fill each section accurately and attach the listed files when you send this to the model.

How to use
1. Populate the metadata fields below exactly as your dataset and project require.
2. Attach raw data files (CSV), a cleaned CSV (if available), any code/notebooks, and a small sample of rows (5–20 rows) in a separate file `sample.csv`.
3. Include this manifest as `data_manifest_for_gemini.md` along with attachments.

---

## 1. Project Metadata
- Project Title: 
- Short Description (one sentence):
- Full Description (1–3 paragraphs):
- Principal Investigator / Author(s):
- Institution / Organization:
- Contact Email:
- License (e.g., CC-BY, MIT, custom):
- Keywords: (comma-separated)
- Date Prepared: (YYYY-MM-DD)
- Geographic Scope: (e.g., United States, global)

## 2. Files Included
- `raw/` — Original raw data files (list filenames):
  - 
- `cleaned/` — Cleaned / preprocessed data files (filenames):
  - 
- `multi/` — Optional multiple CSV files for cross-file comparison:
  - 
- `sample.csv` — sample rows (required)
- `notebooks/` — Jupyter or script files used (list filenames):
  - 
- `figures/` — any pre-generated images (filenames):
  - 
- `code/` — helper scripts (filenames):
  - 
- `README.md` — short readme with run instructions

## 3. Required High-level Deliverables
- Executive summary (1 page)
- Short synopsis (250–500 words)
- Academic research paper (IMRAD + references) — length: 6–12 pages
- Slide deck (PowerPoint/Google Slides) — 10–16 slides
- Poster (A0 or A1 printable PDF)
- Figures as PNGs/SVGs with captions (300–600 DPI for print)
- Tables (CSV/CSV per table) including summary stats and model comparison
- Presentation speaker notes / script
- Reproducible code snippet to re-run analysis (requirements + commands)
- Cross-dataset comparison narrative when multiple CSV files are supplied

## 4. Dataset Description (fill precisely)
- Primary CSV filename: 
- Number of rows: 
- Number of columns: 
- Row-level unique id column: (name or none)
- Date/time column (if any): (name) — format example: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
- Target/measure column (if forecasting/analysis target): (name) — units:
- Additional important columns and brief description (table):

| Column Name | Type (string/number/date/boolean) | Description | Example value | Unit |
|-------------|-----------------------------------|-------------|---------------|------|
|             |                                   |             |               |      |

## 5. Data Quality & Preprocessing Notes (required)
- Missing value policy (e.g., drop rows, forward-fill, interpolate):
- Duplicate handling (e.g., drop duplicates based on id + date):
- Outlier detection/handling approach:
- Aggregation applied (e.g., daily -> weekly):
- Timezone handling (if applicable):
- Any manual edits performed (describe):

## 6. Time-series specifics (if applicable)
- Frequency (e.g., daily, weekly, monthly):
- Expected seasonality (daily/weekly/annual):
- Known calendar events or anomalies to annotate (list dates and descriptions):
- If irregular intervals, provide explanation and preferred resampling strategy.

## 7. Analysis Objectives & Questions
- Primary objective (e.g., forecast 7 days ahead of new cases):
- Secondary objectives (e.g., identify top-5 states with rising trends):
- Hypotheses to test (if academic):
- Required statistical tests (e.g., ADF stationarity, t-test, Mann-Whitney):
- If multiple CSV files are included, describe the relationships, differences, and shared patterns that the AI should surface.

## 8. Modeling & Forecast Requirements
- Forecast horizon: (e.g., 7 days)
- Preferred models (if any): ARIMA/SARIMA, Prophet, ETS, Exponential Smoothing, XGBoost, LSTM
- Required evaluation metrics: RMSE, MAE, MAPE, MAE (%), 95% CI for forecasts
- Cross-validation approach: rolling origin / time-series CV with k folds (specify)
- Random seed (for reproducibility):
- If model ensemble desired, specify weighting or stacking approach.

## 9. Visualization Requirements
For each figure, provide: title, chart type, x-axis, y-axis, aggregation, color palette, annotation needs.

Example set to request from Gemini:
1. Time-series line chart — x: date, y: target, show historical vs forecast, shaded 95% CI band, annotate top 3 peaks.
2. Bar chart — total counts by state (or grouping column) — sorted descending — show top 10 only.
3. Heatmap — correlation matrix across numeric variables.
4. Small multiples — per-region time-series with same y-scale.
5. Boxplot — distribution of target grouped by categorical column (e.g., phase).
6. Comparison view — side-by-side or stacked view across multiple datasets with an AI-generated narrative on how the datasets connect.

Display / export:
- PNG/SVG for each figure, resolution: 2000×1200 px (or vector SVG for poster)
- Captions (one-sentence) and a short explanation (3–4 sentences) for each figure.

## 10. Tables to produce
- Table A: Summary statistics (mean, median, std, min, max, N) for numeric columns.
- Table B: Model comparison table with columns: Model, RMSE, MAE, MAPE, Notes.
- Table C: Forecast table (date, point_forecast, lower_95, upper_95).
- Table D: Top 10 regions by average rate (with confidence intervals).

## 11. Report structure & required sections
- Title page (title, authors, date, affiliation)
- Abstract (150–250 words)
- Introduction (background, motivation, data source)
- Data (detailed dataset description and preprocessing steps)
- Methods (modeling choices, evaluation metrics, hyperparameters)
- Results (figures, tables, main findings)
- Discussion (limitations, implications)
- Conclusion (summary & recommended actions)
- References (APA or IEEE style — include sources for data)
- Appendix (data dictionary, code snippets, additional figures)

## 12. Prompt templates (example) — replace placeholders before sending to Gemini
- Executive summary (short):
```
Write a one-page executive summary for the dataset "{{Project Title}}". Use these key findings: {{top_insights}}. Include a one-sentence recommendation for policy or action.
```

- Research paper abstract:
```
Draft a 200–250 word academic abstract for a paper titled "{{Project Title}}". Summarize the dataset, methods (mention forecasting horizon: {{horizon}}), primary results (e.g., RMSE, top trend), and key implications.
```

- Slide deck request:
```
Create a 12-slide presentation outline with slide titles and speaker notes for a presentation on "{{Project Title}}" focusing on methodology, results, and recommendations. Attach slide-level figure and table references from the manifest.
```

- Poster layout:
```
Design a conference poster (A0) layout listing Title: "{{Project Title}}", Authors: {{authors}}, and sections: Background, Data, Methods, Key Results, Conclusion, References. Specify which figures and tables to place in each panel.
```

## 13. Reproducibility & environment
- Python packages (suggested): pandas, numpy, scipy, statsmodels, prophet, scikit-learn, xgboost, matplotlib, seaborn, plotly, jupyter
- R alternatives (suggested): tidyverse, forecast, fable, prophet, ggplot2
- Docker / environment notes: provide a `requirements.txt` or `environment.yml`.
- Steps to re-run (shell):
```bash
pip install -r requirements.txt
python scripts/run_analysis.py --input cleaned/data.csv --output results/
```

## 14. Ethical & privacy notes
- Does the data contain personal or identifiable information? (yes/no)
- If yes — describe anonymization performed and legal basis for processing.
- Any restrictions on sharing or publication?

## 15. References & Data Sources
- List all primary data sources with URLs, access dates, and citation format.

## 16. Contact & Acknowledgments
- Contact person and email:
- Funding or acknowledgment text to include:

---

### Appendix A — Example JSON manifest (machine readable)
```
{
  "project_title": "{{Project Title}}",
  "description": "Short description",
  "authors": ["Name One", "Name Two"],
  "contact_email": "you@example.com",
  "files": {
    "raw": ["raw/us_covid_by_state.csv"],
    "cleaned": ["cleaned/us_covid_clean.csv"],
    "sample": "sample.csv"
  },
  "data": {
    "primary_file": "cleaned/us_covid_clean.csv",
    "rows": 12345,
    "columns": 12,
    "date_column": "date",
    "target_column": "new_cases"
  },
  "analysis": {
    "forecast_horizon_days": 7,
    "models": ["Prophet","SARIMA"],
    "metrics": ["RMSE","MAE","MAPE"]
  }
}
```

---

End of manifest. Fill the fields and attach your CSV(s), cleaned data, and sample rows. When you're ready, upload them here or tell me to implement backend detection that will auto-populate `date_column` and `target_column` from the CSV (I can implement that so Gemini receives structured fields and we avoid guessing).
