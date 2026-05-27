"""
Data Processing Service
Handles file processing, data validation, and metadata extraction
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
import json
from datetime import datetime

from backend.core.exceptions import FileProcessingError, ValidationError
from backend.config.settings import settings

logger = logging.getLogger(__name__)


class DataProcessor:
    """
    Data processor for handling various file formats and extracting metadata
    """
    
    def __init__(self):
        self.supported_formats = {
            '.csv': self._read_csv,
            '.xlsx': self._read_excel,
            '.xls': self._read_excel,
            '.json': self._read_json,
            '.parquet': self._read_parquet
        }
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def process_file(self, file_path: str, data_id: str) -> Dict[str, Any]:
        """
        Process uploaded file and extract metadata
        
        Args:
            file_path: Path to the uploaded file
            data_id: Unique identifier for the data
            
        Returns:
            Dictionary containing file metadata and statistics
        """
        try:
            path = Path(file_path)
            
            if not path.exists():
                raise FileProcessingError(f"File not found: {file_path}")
            
            # Read file based on extension
            file_ext = path.suffix.lower()
            if file_ext not in self.supported_formats:
                raise ValidationError(f"Unsupported file format: {file_ext}")
            
            df = self.supported_formats[file_ext](file_path)
            
            # Extract metadata
            metadata = self._extract_metadata(df, path)
            metadata['data_id'] = data_id
            metadata['file_path'] = str(path)
            metadata['processed_at'] = datetime.utcnow().isoformat()
            
            # Cache the dataframe and metadata
            self._cache[data_id] = {
                'dataframe': df,
                'metadata': metadata
            }
            
            logger.info(f"Processed file: {path.name} (ID: {data_id})")
            return metadata
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}", exc_info=True)
            raise FileProcessingError(f"Failed to process file: {str(e)}")
    
    async def get_data_summary(self, data_id: str) -> Optional[Dict[str, Any]]:
        """
        Get summary statistics for processed data
        
        Args:
            data_id: Unique identifier for the data
            
        Returns:
            Dictionary containing summary statistics
        """
        try:
            if data_id not in self._cache:
                logger.warning(f"Data not found in cache: {data_id}")
                return None
            
            cached_data = self._cache[data_id]
            df = cached_data['dataframe']
            metadata = cached_data['metadata']
            
            # Generate summary
            summary = {
                'data_id': data_id,
                'basic_info': metadata,
                'statistics': self._get_statistics(df),
                'column_info': self._get_column_info(df),
                'missing_data': self._get_missing_data_info(df),
                'data_types': self._get_data_types(df)
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting data summary for {data_id}: {e}", exc_info=True)
            return None
    
    def get_dataframe(self, data_id: str) -> Optional[pd.DataFrame]:
        """
        Retrieve cached dataframe
        
        Args:
            data_id: Unique identifier for the data
            
        Returns:
            Pandas DataFrame or None if not found
        """
        if data_id in self._cache:
            return self._cache[data_id]['dataframe']
        return None
    
    def _read_csv(self, file_path: str) -> pd.DataFrame:
        """Read CSV file"""
        try:
            return pd.read_csv(file_path)
        except Exception as e:
            raise FileProcessingError(f"Error reading CSV: {str(e)}")
    
    def _read_excel(self, file_path: str) -> pd.DataFrame:
        """Read Excel file"""
        try:
            return pd.read_excel(file_path)
        except Exception as e:
            raise FileProcessingError(f"Error reading Excel: {str(e)}")
    
    def _read_json(self, file_path: str) -> pd.DataFrame:
        """Read JSON file"""
        try:
            return pd.read_json(file_path)
        except Exception as e:
            raise FileProcessingError(f"Error reading JSON: {str(e)}")
    
    def _read_parquet(self, file_path: str) -> pd.DataFrame:
        """Read Parquet file"""
        try:
            return pd.read_parquet(file_path)
        except Exception as e:
            raise FileProcessingError(f"Error reading Parquet: {str(e)}")
    
    def _extract_metadata(self, df: pd.DataFrame, path: Path) -> Dict[str, Any]:
        """Extract basic metadata from dataframe"""
        return {
            'filename': path.name,
            'file_size': path.stat().st_size,
            'row_count': len(df),
            'column_count': len(df.columns),
            'columns': df.columns.tolist(),
            'memory_usage': df.memory_usage(deep=True).sum(),
            'has_missing_values': df.isnull().any().any(),
            'dataset_type': self._detect_dataset_type(df)
        }
    
    def _detect_dataset_type(self, df: pd.DataFrame) -> str:
        """
        Detect the type of dataset (timeseries, categorical, numerical, etc.)
        """
        # Check for datetime columns
        datetime_cols = df.select_dtypes(include=['datetime64']).columns
        if len(datetime_cols) > 0:
            return 'timeseries'
        
        # Check for mostly numerical data
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) / len(df.columns) > 0.7:
            return 'numerical'
        
        # Check for mostly categorical data
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        if len(categorical_cols) / len(df.columns) > 0.7:
            return 'categorical'
        
        return 'mixed'
    
    def _get_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get statistical summary of numerical columns"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return {}
        
        stats = numeric_df.describe().to_dict()
        
        # Convert numpy types to Python types for JSON serialization
        return {
            col: {k: float(v) if isinstance(v, (np.integer, np.floating)) else v 
                  for k, v in stats[col].items()}
            for col in stats
        }
    
    def _get_column_info(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Get detailed information about each column"""
        column_info = []
        
        for col in df.columns:
            info = {
                'name': col,
                'dtype': str(df[col].dtype),
                'non_null_count': int(df[col].count()),
                'null_count': int(df[col].isnull().sum()),
                'unique_count': int(df[col].nunique()),
                'sample_values': df[col].dropna().head(5).tolist()
            }
            
            # Add statistics for numerical columns
            if pd.api.types.is_numeric_dtype(df[col]):
                info['min'] = float(df[col].min()) if not pd.isna(df[col].min()) else None
                info['max'] = float(df[col].max()) if not pd.isna(df[col].max()) else None
                info['mean'] = float(df[col].mean()) if not pd.isna(df[col].mean()) else None
                info['median'] = float(df[col].median()) if not pd.isna(df[col].median()) else None
            
            column_info.append(info)
        
        return column_info
    
    def _get_missing_data_info(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get information about missing data"""
        missing_counts = df.isnull().sum()
        total_rows = len(df)
        
        return {
            'total_missing': int(missing_counts.sum()),
            'missing_by_column': {
                col: {
                    'count': int(count),
                    'percentage': float(count / total_rows * 100)
                }
                for col, count in missing_counts.items() if count > 0
            }
        }
    
    def _get_data_types(self, df: pd.DataFrame) -> Dict[str, int]:
        """Get count of different data types"""
        dtype_counts = df.dtypes.value_counts().to_dict()
        return {str(k): int(v) for k, v in dtype_counts.items()}
    
    def clear_cache(self, data_id: Optional[str] = None):
        """
        Clear cached data
        
        Args:
            data_id: Specific data ID to clear, or None to clear all
        """
        if data_id:
            if data_id in self._cache:
                del self._cache[data_id]
                logger.info(f"Cleared cache for data: {data_id}")
        else:
            self._cache.clear()
            logger.info("Cleared all cached data")


# Singleton instance
_data_processor_instance: Optional[DataProcessor] = None


def get_data_processor() -> DataProcessor:
    """Get or create DataProcessor singleton instance"""
    global _data_processor_instance
    if _data_processor_instance is None:
        _data_processor_instance = DataProcessor()
    return _data_processor_instance
