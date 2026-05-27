#!/usr/bin/env bash

echo "=== Python version: $(python --version) ==="
echo "=== Pip version: $(pip --version) ==="

# Step 1: Install all core packages (no data science)
pip install --prefer-binary \
  "fastapi==0.109.0" \
  "uvicorn[standard]==0.27.0" \
  "pydantic==2.5.3" \
  "pydantic-settings==2.1.0" \
  "boto3==1.34.34" \
  "botocore==1.34.34" \
  "sqlalchemy==2.0.25" \
  "python-jose[cryptography]==3.3.0" \
  "passlib[bcrypt]==1.7.4" \
  "python-multipart==0.0.6" \
  "email-validator==2.1.0" \
  "google-generativeai==0.3.2" \
  "anthropic==0.8.1" \
  "prometheus-client==0.19.0" \
  "python-json-logger==2.0.7" \
  "python-dotenv==1.0.0" \
  "tenacity==8.2.3" \
  "httpx==0.26.0" \
  "aiofiles==23.2.1"

if [ $? -ne 0 ]; then
  echo "ERROR: Core package installation failed"
  exit 1
fi

# Step 2: Try to install data science packages (binary wheels only, non-fatal)
echo "=== Installing data science packages (binary only) ==="
pip install --prefer-binary --only-binary=:all: \
  "pandas==2.2.2" \
  "numpy==1.26.4" \
  "openpyxl==3.1.2" \
  "statsmodels==0.14.1"

if [ $? -ne 0 ]; then
  echo "WARNING: Binary wheels not available for this Python version."
  echo "Trying latest available versions..."
  pip install --prefer-binary --only-binary=:all: pandas numpy openpyxl statsmodels
  if [ $? -ne 0 ]; then
    echo "WARNING: Data science packages unavailable. CSV analysis will be disabled."
  fi
fi

echo "=== Build complete! ==="
