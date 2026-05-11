from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from .session import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    summary = Column(Text)
    insights = Column(Text)  # JSON string representation
    chart_data = Column(Text)  # JSON string representation
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
