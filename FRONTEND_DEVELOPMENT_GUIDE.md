# Frontend Development Guide for AURA Analyst

## 🎯 Which AI Tool Should I Use for Frontend Development?

**Important**: The AWS Bedrock models in this project are **only for backend data analysis**. For frontend development (coding React/Next.js components), you should use different AI coding assistants.

---

## 🏆 Recommended Tools for Frontend Development

### Option 1: **Cursor AI** ⭐ HIGHLY RECOMMENDED

**What it is**: AI-powered code editor built on VS Code, specifically optimized for modern web development.

**Why use it for AURA Analyst:**
- ✅ Best for React/Next.js projects
- ✅ Understands your entire codebase
- ✅ Real-time code suggestions
- ✅ Chat with your project
- ✅ Multi-file editing
- ✅ Free tier available

**Download**: https://cursor.sh

**Setup**:
```bash
# 1. Download Cursor from https://cursor.sh
# 2. Open your project
cursor "C:\Users\Tanmay Patel\Desktop\Minor"
# 3. Start coding with AI assistance!
```

**Key Features**:
- **Ctrl+K**: Edit code with AI
- **Ctrl+L**: Chat with AI about your code
- **Tab**: Accept AI suggestions
- **Ctrl+Shift+L**: Reference specific files in chat

---

### Option 2: **GitHub Copilot**

**What it is**: AI pair programmer by GitHub/Microsoft.

**Cost**: $10/month (free for students/teachers)

**Setup**:
```bash
# Install in VS Code
code --install-extension GitHub.copilot
```

**Best for**:
- General coding assistance
- Auto-completion
- Function generation
- Documentation

---

### Option 3: **Continue.dev** (Free & Open Source)

**What it is**: Free, open-source AI code assistant for VS Code.

**Cost**: FREE (uses your own API keys)

**Setup**:
```bash
# Install in VS Code
code --install-extension Continue.continue
```

**Configure** (`.continue/config.json`):
```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-anthropic-api-key"
    }
  ]
}
```

---

## 🚀 Quick Start with Cursor (Recommended)

### Step 1: Install Cursor
1. Go to https://cursor.sh
2. Download for Windows
3. Install and open your project

### Step 2: Open Your Project
```bash
# In Cursor, open your AURA Analyst project
File → Open Folder → C:\Users\Tanmay Patel\Desktop\Minor
```

### Step 3: Start Using AI Features

#### **Inline Completion** (Automatic)
Just start typing - AI suggests code automatically:
```typescript
// Start typing...
const handleAnalysis = async () => {
  // AI will suggest the complete function!
```

#### **Chat with AI** (Ctrl+L)
Ask questions about your code:
```
You: "How do I integrate the AIModelSelector component into my analysis page?"
AI: [Provides step-by-step instructions with code]
```

#### **Edit Code with AI** (Ctrl+K)
Select code and ask AI to modify it:
```
1. Select your component code
2. Press Ctrl+K
3. Type: "Add error handling and loading states"
4. AI modifies the code
```

---

## 💡 Example Prompts for Your AURA Analyst Frontend

### Creating the Analysis Dashboard

**Prompt** (Press Ctrl+L):
```
Create a complete analysis dashboard page at frontend/app/analysis/page.tsx that:

1. Imports and uses the AIModelSelector component from @/components/AIModelSelector
2. Allows users to upload CSV files
3. Shows real-time analysis progress using WebSocket connection
4. Displays analysis results with charts (using Recharts)
5. Shows which AI model was used and the cost
6. Includes proper error handling and loading states
7. Uses TypeScript with proper type definitions
8. Styled with Tailwind CSS matching the existing design
9. Responsive for mobile devices

The component should call these API endpoints:
- POST /api/v1/data/upload (for file upload)
- POST /api/v1/analysis/analyze (for analysis with selected model)
- WebSocket /api/v1/ws/analysis (for real-time updates)
```

### Integrating Model Selector

**Prompt**:
```
Update the analysis page to:
1. Add the AIModelSelector component at the top
2. Store selected model in state
3. Pass the selected model_id to the analysis API call
4. Display the model used in the results
5. Show estimated cost before running analysis
6. Add a comparison view showing different models
```

### Adding Real-time Progress

**Prompt**:
```
Add WebSocket integration to show:
1. Real-time analysis progress (0-100%)
2. Current step being processed
3. Estimated time remaining
4. Live status messages
5. Progress bar with animation
6. Cancel analysis button
```

### Creating Data Visualization

**Prompt**:
```
Create a DataVisualization component that:
1. Takes analysis results as props
2. Displays multiple chart types (bar, line, pie)
3. Uses Recharts library
4. Shows insights and recommendations
5. Allows switching between chart types
6. Exports charts as images
7. Responsive design
```

---

## 🎨 Cursor AI Workflow for Your Project

### 1. **Create New Component**

```bash
# In Cursor, create new file
frontend/components/AnalysisDashboard.tsx

# Press Ctrl+L and describe what you want
"Create a dashboard component that displays analysis results with charts"

# Cursor generates the complete component!
```

### 2. **Refine the Component**

```bash
# Select the generated code
# Press Ctrl+K
"Add loading skeleton and error boundaries"

# Cursor updates the code
```

### 3. **Add Features Incrementally**

```bash
# Press Ctrl+L
"Add export to PDF functionality"
"Add dark mode support"
"Make it responsive for tablets"
```

### 4. **Fix Issues**

```bash
# If you encounter an error
# Press Ctrl+L
"I'm getting this error: [paste error]
How do I fix it?"

# Cursor provides solution
```

---

## 📋 Complete Example: Building Analysis Page

### Step 1: Create the Page File

Create `frontend/app/analysis/page.tsx`

### Step 2: Use Cursor to Generate

**Press Ctrl+L** and paste this prompt:

```
Create a complete Next.js page component for data analysis with these requirements:

IMPORTS:
- AIModelSelector from '@/components/AIModelSelector'
- useState, useEffect from 'react'
- Recharts for charts
- lucide-react for icons

FEATURES:
1. File Upload Section
   - Drag & drop CSV upload
   - File validation
   - Upload progress bar

2. Model Selection Section
   - Use AIModelSelector component
   - Show selected model details
   - Display estimated cost

3. Analysis Controls
   - Analysis type selector (quick/comprehensive/deep)
   - Custom prompt textarea
   - Run Analysis button
   - Cancel button

4. Real-time Progress
   - WebSocket connection to /api/v1/ws/analysis
   - Progress bar (0-100%)
   - Status messages
   - Current step indicator

5. Results Display
   - Analysis insights
   - Visualizations (bar, line, pie charts)
   - Model used and actual cost
   - Export options (PDF, CSV)

6. Error Handling
   - Try-catch blocks
   - Error messages
   - Retry functionality

STYLING:
- Tailwind CSS
- Dark theme (bg-gray-900)
- Responsive grid layout
- Smooth animations

TYPESCRIPT:
- Proper type definitions
- Interface for API responses
- Type-safe props

API ENDPOINTS:
- POST /api/v1/data/upload
- POST /api/v1/analysis/analyze
- WebSocket /api/v1/ws/analysis
- GET /api/v1/ai/models
```

### Step 3: Test and Refine

```bash
# Run the dev server
npm run dev

# If issues arise, ask Cursor:
"The WebSocket connection is failing, how do I fix it?"
"The charts are not displaying, what's wrong?"
```

---

## 🔧 Cursor Settings for Best Results

### Cursor Settings (Settings → Cursor)

```json
{
  "cursor.ai.model": "gpt-4",
  "cursor.ai.temperature": 0.7,
  "cursor.ai.maxTokens": 4000,
  "cursor.ai.contextWindow": "large",
  "cursor.ai.codebaseIndexing": true
}
```

### Project-Specific Rules

Create `.cursorrules` in project root:

```
# AURA Analyst Project Rules

## Framework
- Next.js 14 with App Router
- React 18
- TypeScript

## Styling
- Use Tailwind CSS exclusively
- Follow existing color scheme (gray-900 background)
- Use lucide-react for icons

## Components
- All client components must have "use client" directive
- Use TypeScript interfaces for props
- Include JSDoc comments
- Implement error boundaries

## API Calls
- Use fetch with proper error handling
- Include Authorization header with JWT token
- Handle loading and error states
- Show user-friendly error messages

## State Management
- Use React hooks (useState, useEffect)
- Keep state close to where it's used
- Use context for global state

## Code Style
- Use arrow functions
- Destructure props
- Use optional chaining (?.)
- Prefer const over let

## Testing
- Write tests for critical components
- Use React Testing Library
- Mock API calls
```

---

## 💰 Cost Comparison

| Tool | Cost | Best For | Setup Time |
|------|------|----------|------------|
| **Cursor** | Free tier + $20/month Pro | React/Next.js | 5 minutes |
| **GitHub Copilot** | $10/month | General coding | 2 minutes |
| **Continue.dev** | Free (your API keys) | Budget-conscious | 10 minutes |
| **AWS Bedrock** | Pay per use | Backend analysis ONLY | N/A |

---

## ⚡ Quick Decision Guide

### Use **Cursor** if:
- ✅ You want the best React/Next.js experience
- ✅ You need context-aware suggestions
- ✅ You want to chat with your codebase
- ✅ You're building complex components

### Use **GitHub Copilot** if:
- ✅ You prefer staying in VS Code
- ✅ You want simple auto-completion
- ✅ You're already familiar with it
- ✅ You have a student account (free)

### Use **Continue.dev** if:
- ✅ You want a free solution
- ✅ You have your own API keys
- ✅ You prefer open-source tools
- ✅ You want full control

---

## 🎯 Summary

### For AURA Analyst Frontend Development:

1. **Download Cursor** (https://cursor.sh) ← Start here!
2. **Open your project** in Cursor
3. **Use the prompts** provided above
4. **Build components** with AI assistance
5. **Iterate quickly** with Ctrl+K and Ctrl+L

### Remember:
- ❌ **Don't use AWS Bedrock** for frontend coding
- ✅ **Use Cursor/Copilot/Continue** for coding assistance
- ✅ **AWS Bedrock is only** for backend data analysis API

---

## 📚 Additional Resources

- **Cursor Documentation**: https://cursor.sh/docs
- **GitHub Copilot Docs**: https://docs.github.com/copilot
- **Continue.dev Docs**: https://continue.dev/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## 🆘 Need Help?

If you're stuck:

1. **Press Ctrl+L in Cursor** and describe your issue
2. **Check the console** for error messages
3. **Ask Cursor**: "I'm getting this error: [paste error]. How do I fix it?"
4. **Reference existing code**: "Look at RealtimeClient.tsx and create something similar"

---

**Ready to start?** Download Cursor and begin building your frontend! 🚀
