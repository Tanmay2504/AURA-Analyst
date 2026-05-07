import os
import json
from pathlib import Path
import google.generativeai as genai
import pandas as pd

def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()

# We'll expect the API key to be set in the environment or passed directly here
GENAI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

def analyze_data_with_gemini(df: pd.DataFrame) -> dict:
    """
    Sends the DataFrame summary to Gemini and asks for structured insights.
    """
    if not GENAI_API_KEY:
        raise ValueError("Gemini API key is not set. Please set the GEMINI_API_KEY environment variable.")

    # Get a glimpse of the data
    data_head = df.head(5).to_string()
    data_describe = df.describe().to_string()
    data_info = f"Columns: {list(df.columns)}, Shape: {df.shape}"

    prompt = f"""
    You are a Statistical Consultant. Analyze this dataset.
    
    Data Info: {data_info}
    Data Describe:
    {data_describe}
    Data Sample (First 5 rows):
    {data_head}
    
    Return a strictly formatted JSON response with the following keys:
    - "summary": A brief 1-2 sentence overview of what this data is.
    - "insights": A list of strings, providing 3-5 interesting bullet-point insights.
    - "chart_data": A dictionary representing chart data. Should have "labels" (list of strings for the x-axis) and "values" (list of numbers for the y-axis), suitable for charting the most interesting categorical/numerical variable.

    Do not include any Markdown blocks (like ```json), just output the raw JSON.
    """

    # Using the standard gemini model
    model = genai.GenerativeModel(
        model_name='gemini-flash-latest',
        system_instruction='You are a Statistical Consultant. Your only output format is valid JSON. Do not deviate.'
    )
    
    response = model.generate_content(prompt)
    
    # Try to parse response
    text_content = response.text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text_content)
    except json.JSONDecodeError:
        return {"error": "Failed to parse JSON", "raw": response.text}
