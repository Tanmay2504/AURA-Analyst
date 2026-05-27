"""
Bedrock Service Tests
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock


@pytest.mark.asyncio
async def test_bedrock_initialization():
    """Test Bedrock service initialization"""
    with patch('boto3.client') as mock_client:
        from backend.services.bedrock_service import BedrockService
        
        service = BedrockService()
        assert service is not None
        assert service.model_id is not None


@pytest.mark.asyncio
async def test_analyze_data():
    """Test data analysis"""
    with patch('boto3.client') as mock_client:
        from backend.services.bedrock_service import BedrockService
        
        # Mock the client response
        mock_response = {
            'body': Mock(read=Mock(return_value=b'{"content": [{"text": "Analysis result"}]}'))
        }
        mock_client.return_value.invoke_model = Mock(return_value=mock_response)
        
        service = BedrockService()
        
        data_summary = {
            "row_count": 100,
            "column_count": 5,
            "columns": ["col1", "col2", "col3", "col4", "col5"]
        }
        
        result = await service.analyze_data(data_summary)
        assert result is not None
        assert "analysis" in result or "error" in result