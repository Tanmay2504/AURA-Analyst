from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, LargeBinary
from sqlalchemy.sql import func
from .session import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    summary = Column(Text)
    # Store structured insights & chart data natively when supported by DB
    insights = Column(JSON, nullable=True)
    chart_data = Column(JSON, nullable=True)
    forecast_data = Column(JSON, nullable=True)
    agent_status = Column(JSON, nullable=True)
    # Optionally store the raw CSV bytes for full reproducibility
    raw_csv = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
