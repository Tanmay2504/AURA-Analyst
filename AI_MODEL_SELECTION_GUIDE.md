# AI Model Selection & Frontend Setup Guide

## 📋 Table of Contents

1. [AI Model Selection](#ai-model-selection)
2. [Available Models](#available-models)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Arena AI Setup](#arena-ai-setup)
6. [Usage Examples](#usage-examples)

---

## 🤖 AI Model Selection

AURA Analyst now supports **multiple AI models** from AWS Bedrock, allowing you to choose the best model for your specific analysis needs based on:

- **Complexity** of your data
- **Budget** constraints
- **Speed** requirements
- **Quality** expectations

### Quick Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **Claude 3 Opus** | Medium | High | $$$ | Complex analysis, enterprise projects |
| **Claude 3 Sonnet** | Fast | High | $$ | General analysis, best balance |
| **Claude 3 Haiku** | Fast | Medium | $ | Quick insights, high-volume |
| **Titan Text Express** | Fast | Standard | $ | Simple summaries, budget projects |
| **Llama 3 70B** | Medium | Medium | $ | Technical analysis, open-source |
| **Mistral Large** | Medium | High | $$ | Multilingual, European compliance |
| **Mistral 7B** | Fast | Standard | $ | Multilingual, cost-effective |
| **Cohere Command** | Fast | Medium | $ | Business reports, communication |

---

## 📊 Available Models

### Anthropic Claude 3 Models

#### Claude 3 Opus
- **Model ID**: `anthropic.claude-3-opus-20240229-v1:0`
- **Description**: Most powerful Claude model with exceptional reasoning
- **Context Window**: 200,000 tokens
- **Pricing**: $0.015/1K input, $0.075/1K output (~$0.2250/analysis)
- **Best For**:
  - Complex data analysis
  - Multi-dataset comparisons
  - Financial data analysis
  - Research projects
  - Strategic recommendations

#### Claude 3 Sonnet ⭐ **RECOMMENDED**
- **Model ID**: `anthropic.claude-3-sonnet-20240229-v1:0`
- **Description**: Balanced model offering excellent performance
- **Context Window**: 200,000 tokens
- **Pricing**: $0.003/1K input, $0.015/1K output (~$0.0450/analysis)
- **Best For**:
  - General data analysis
  - Business intelligence
  - Daily analysis tasks
  - Dashboard insights
  - Standard reports

#### Claude 3 Haiku
- **Model ID**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Description**: Fastest and most cost-effective
- **Context Window**: 200,000 tokens
- **Pricing**: $0.00025/1K input, $0.00125/1K output (~$0.0038/analysis)
- **Best For**:
  - Quick summaries
  - High-volume analysis
  - Real-time monitoring
  - Batch processing
  - Cost-sensitive applications

### Amazon Titan Models

#### Titan Text Express
- **Model ID**: `amazon.titan-text-express-v1`
- **Description**: Fast and cost-effective from Amazon
- **Context Window**: 8,192 tokens
- **Pricing**: $0.0002/1K input, $0.0006/1K output (~$0.0022/analysis)
- **Best For**:
  - Text summarization
  - Simple descriptions
  - Budget projects
  - Document analysis

### Meta Llama Models

#### Llama 3 70B
- **Model ID**: `meta.llama3-70b-instruct-v1:0`
- **Description**: Open-source with strong reasoning
- **Context Window**: 8,192 tokens
- **Pricing**: $0.00099/1K input, $0.00099/1K output (~$0.0138/analysis)
- **Best For**:
  - Technical analysis
  - Code-related insights
  - Open-source projects
  - Structured data

### Mistral AI Models

#### Mistral Large
- **Model ID**: `mistral.mistral-large-2402-v1:0`
- **Description**: Flagship Mistral with advanced capabilities
- **Context Window**: 32,000 tokens
- **Pricing**: $0.008/1K input, $0.024/1K output (~$0.0880/analysis)
- **Best For**:
  - Multilingual projects
  - European compliance (GDPR)
  - Complex analysis
  - International data

#### Mistral 7B Instruct
- **Model ID**: `mistral.mistral-7b-instruct-v0:2`
- **Description**: Efficient with multilingual support
- **Context Window**: 32,000 tokens
- **Pricing**: $0.00015/1K input, $0.0002/1K output (~$0.0012/analysis)
- **Best For**:
  - Multilingual data
  - Budget projects
  - Quick summaries
  - International reports

### Cohere Models

#### Cohere Command
- **Model ID**: `cohere.command-text-v14`
- **Description**: Specialized in business communication
- **Context Window**: 4,096 tokens
- **Pricing**: $0.0015/1K input, $0.002/1K output (~$0.0115/analysis)
- **Best For**:
  - Business reports
  - Executive summaries
  - Client-facing analysis
  - Marketing analytics

---

## 🔌 API Endpoints

### List All Models
```bash
GET /api/v1/ai/models
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "total_models": 8,
  "models": {
    "claude-3-sonnet": {
      "model_id": "anthropic.claude-3-sonnet-20240229-v1:0",
      "name": "Claude 3 Sonnet",
      "provider": "anthropic",
      "description": "...",
      "pricing": {...},
      "performance": {...}
    }
  }
}
```

### Get Model Details
```bash
GET /api/v1/ai/models/{model_key}
Authorization: Bearer {token}
```

### Get Model Recommendation
```bash
POST /api/v1/ai/models/recommend?complexity=medium&budget=medium&speed_priority=false
Authorization: Bearer {token}
```

### Compare Models
```bash
POST /api/v1/ai/models/compare?model_ids=claude-3-opus&model_ids=claude-3-sonnet
Authorization: Bearer {token}
```

### Analyze with Specific Model
```bash
POST /api/v1/analysis/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "data_id": "data_123",
  "analysis_type": "comprehensive",
  "model_id": "anthropic.claude-3-opus-20240229-v1:0",
  "include_visualizations": true
}
```

---

## 💻 Frontend Integration

### Using the AIModelSelector Component

```typescript
import { AIModelSelector } from '@/components/AIModelSelector';
import { useState } from 'react';

function AnalysisPage() {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const authToken = 'YOUR_JWT_TOKEN';

  const handleAnalysis = async () => {
    const response = await fetch('http://localhost:8000/api/v1/analysis/analyze', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data_id: 'your_data_id',
        analysis_type: 'comprehensive',
        model_id: selectedModel || undefined, // Use selected model or default
        include_visualizations: true
      })
    });

    const result = await response.json();
    console.log('Analysis complete:', result);
    console.log('Model used:', result.model_used);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Data Analysis</h1>
      
      {/* Model Selector */}
      <AIModelSelector
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
        authToken={authToken}
      />

      {/* Analysis Button */}
      <button
        onClick={handleAnalysis}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Run Analysis
      </button>
    </div>
  );
}
```

---

## 🎨 Arena AI Setup for Frontend Development

### What is Arena AI?

Arena AI is an AI-powered development assistant that helps you build and iterate on your frontend faster. It's particularly useful for:
- Component development
- UI/UX improvements
- Code generation
- Bug fixing
- Documentation

### Setup Instructions

#### 1. Install Arena AI Extension

**For VS Code:**
```bash
# Install from VS Code Marketplace
code --install-extension arena-ai.arena-ai
```

**Or manually:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Arena AI"
4. Click Install

#### 2. Configure Arena AI

Create `.arena-ai.json` in your project root:

```json
{
  "project": {
    "name": "AURA Analyst",
    "type": "nextjs",
    "framework": "react",
    "language": "typescript"
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7
  },
  "paths": {
    "components": "frontend/components",
    "pages": "frontend/app",
    "styles": "frontend/app/globals.css"
  },
  "rules": [
    "Use TypeScript for all components",
    "Follow Tailwind CSS for styling",
    "Use 'use client' directive for client components",
    "Implement proper error handling",
    "Add loading states for async operations"
  ]
}
```

#### 3. Set Up API Key

Add to your `.env.local`:
```env
ARENA_AI_API_KEY=your_arena_ai_key_here
```

#### 4. Using Arena AI

**Generate Components:**
```bash
# In VS Code Command Palette (Ctrl+Shift+P)
Arena AI: Generate Component

# Example prompt:
"Create a data visualization component that displays charts using Recharts"
```

**Improve Existing Code:**
1. Select code in editor
2. Right-click → Arena AI → Improve Code
3. Review and accept suggestions

**Debug Issues:**
```bash
Arena AI: Debug Current File
```

### Arena AI Commands

| Command | Description |
|---------|-------------|
| `Arena AI: Generate Component` | Create new React component |
| `Arena AI: Improve Code` | Enhance selected code |
| `Arena AI: Add Tests` | Generate test cases |
| `Arena AI: Fix Bugs` | Identify and fix issues |
| `Arena AI: Optimize Performance` | Improve code performance |
| `Arena AI: Add Documentation` | Generate JSDoc comments |

### Best Practices with Arena AI

1. **Be Specific**: Provide detailed prompts
   ```
   ❌ "Create a button"
   ✅ "Create a primary button component with loading state, disabled state, and icon support using Tailwind CSS"
   ```

2. **Review Generated Code**: Always review and test AI-generated code

3. **Iterate**: Use Arena AI iteratively to refine components

4. **Context Matters**: Provide context about your project structure

### Example: Creating Model Selector with Arena AI

**Prompt:**
```
Create a React component called AIModelSelector that:
- Fetches available AI models from /api/v1/ai/models
- Displays models in a dropdown with pricing info
- Shows detailed model information when selected
- Uses Tailwind CSS for styling
- Includes TypeScript types
- Handles loading and error states
```

Arena AI will generate the component structure, which you can then refine.

---

## 📝 Usage Examples

### Example 1: Quick Analysis with Haiku

```python
import requests

# For quick, cost-effective analysis
response = requests.post(
    "http://localhost:8000/api/v1/analysis/analyze",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "data_id": "sales_data_123",
        "analysis_type": "quick",
        "model_id": "anthropic.claude-3-haiku-20240307-v1:0"
    }
)

print(f"Cost: ~$0.004 per analysis")
print(f"Speed: ~2-3 seconds")
```

### Example 2: Complex Analysis with Opus

```python
# For detailed, enterprise-level analysis
response = requests.post(
    "http://localhost:8000/api/v1/analysis/analyze",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "data_id": "financial_data_456",
        "analysis_type": "comprehensive",
        "model_id": "anthropic.claude-3-opus-20240229-v1:0",
        "include_visualizations": True,
        "include_predictions": True,
        "custom_prompt": "Focus on risk assessment and regulatory compliance"
    }
)

print(f"Cost: ~$0.23 per analysis")
print(f"Quality: Highest available")
```

### Example 3: Balanced Analysis with Sonnet (Recommended)

```python
# Best balance of cost, speed, and quality
response = requests.post(
    "http://localhost:8000/api/v1/analysis/analyze",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "data_id": "customer_data_789",
        "analysis_type": "comprehensive",
        "model_id": "anthropic.claude-3-sonnet-20240229-v1:0",
        "include_visualizations": True
    }
)

print(f"Cost: ~$0.045 per analysis")
print(f"Speed: ~5-7 seconds")
print(f"Quality: High")
```

### Example 4: Get Model Recommendation

```python
# Let the system recommend the best model
response = requests.post(
    "http://localhost:8000/api/v1/ai/models/recommend",
    headers={"Authorization": f"Bearer {token}"},
    params={
        "complexity": "complex",
        "budget": "medium",
        "speed_priority": False
    }
)

recommended = response.json()
print(f"Recommended: {recommended['recommended_model']['name']}")
```

---

## 🔍 Model Selection Decision Tree

```
Start
  │
  ├─ Need multilingual support?
  │   └─ Yes → Mistral Large or Mistral 7B
  │
  ├─ Budget very limited?
  │   └─ Yes → Claude 3 Haiku or Titan Express
  │
  ├─ Need highest quality?
  │   └─ Yes → Claude 3 Opus
  │
  ├─ Need fast results?
  │   └─ Yes → Claude 3 Haiku or Sonnet
  │
  ├─ Complex analysis?
  │   └─ Yes → Claude 3 Opus or Sonnet
  │
  └─ General use?
      └─ Claude 3 Sonnet (RECOMMENDED)
```

---

## 💡 Tips & Best Practices

### Cost Optimization

1. **Use Haiku for batch processing**: Save 98% compared to Opus
2. **Cache results**: Avoid re-analyzing same data
3. **Use appropriate model**: Don't use Opus for simple tasks

### Performance Optimization

1. **Parallel processing**: Analyze multiple datasets simultaneously
2. **Streaming**: Use SSE for real-time progress updates
3. **Model selection**: Choose faster models when speed matters

### Quality Optimization

1. **Custom prompts**: Provide specific requirements
2. **Right model**: Use Opus for complex analysis
3. **Iterative refinement**: Start with Sonnet, upgrade if needed

---

## 🆘 Troubleshooting

### Model Not Available
```
Error: Model not found
Solution: Check AWS Bedrock model access in your region
```

### Rate Limiting
```
Error: ThrottlingException
Solution: Implement exponential backoff or use different model
```

### High Costs
```
Issue: Unexpected AWS bills
Solution: Monitor usage, use cheaper models, implement caching
```

---

## 📚 Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [Model Pricing Calculator](https://aws.amazon.com/bedrock/pricing/)
- [Arena AI Documentation](https://arena-ai.com/docs)

---

**Need Help?** Check `/api/docs` for interactive API documentation or contact support.
