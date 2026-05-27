"use client";

import { useState, useEffect } from 'react';
import { ChevronDown, Zap, DollarSign, Clock, CheckCircle, Info } from 'lucide-react';

interface AIModel {
  model_id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  max_tokens: number;
  context_window: number;
  pricing: {
    input_per_1k_tokens: string;
    output_per_1k_tokens: string;
    estimated_cost_per_analysis: string;
  };
  performance: {
    speed: string;
    quality: string;
  };
  best_for: string[];
  limitations: string[];
  recommended_use_cases: string[];
}

interface AIModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (modelId: string) => void;
  authToken?: string;
  apiUrl?: string;
}

export function AIModelSelector({
  selectedModel,
  onModelSelect,
  authToken,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}: AIModelSelectorProps) {
  const [models, setModels] = useState<Record<string, AIModel>>({});
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedModelDetails, setSelectedModelDetails] = useState<AIModel | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    if (selectedModel && models[selectedModel]) {
      setSelectedModelDetails(models[selectedModel]);
    }
  }, [selectedModel, models]);

  const fetchModels = async () => {
    try {
      const endpoint = authToken
        ? `${apiUrl}/api/v1/ai/models`
        : `${apiUrl}/api/v1/ai/models/public`;

      const response = await fetch(endpoint, authToken ? {
        headers: { 'Authorization': `Bearer ${authToken}` }
      } : undefined);

      const data = await response.json();
      if (data.success) {
        setModels(data.models);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'slow': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-purple-500';
      case 'medium': return 'text-blue-500';
      case 'standard': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Model Selector Dropdown */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select AI Model
        </label>
        <select
          value={selectedModel || ''}
          onChange={(e) => onModelSelect(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
        >
          <option value="">Use Default Model</option>
          {Object.entries(models).map(([key, model]) => (
            <option key={key} value={model.model_id}>
              {model.name} - {model.pricing.estimated_cost_per_analysis}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-11 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {/* Show Details Button */}
      {selectedModelDetails && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Info className="w-4 h-4" />
          {showDetails ? 'Hide' : 'Show'} Model Details
        </button>
      )}

      {/* Model Details Panel */}
      {showDetails && selectedModelDetails && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-700">
          {/* Header */}
          <div className="border-b border-gray-700 pb-4">
            <h3 className="text-xl font-bold text-white">{selectedModelDetails.name}</h3>
            <p className="text-sm text-gray-400 mt-1">
              Provider: <span className="text-blue-400">{selectedModelDetails.provider}</span>
            </p>
            <p className="text-sm text-gray-300 mt-2">{selectedModelDetails.description}</p>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Speed</span>
              </div>
              <p className={`text-lg font-semibold ${getSpeedColor(selectedModelDetails.performance.speed)}`}>
                {selectedModelDetails.performance.speed.charAt(0).toUpperCase() + selectedModelDetails.performance.speed.slice(1)}
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">Quality</span>
              </div>
              <p className={`text-lg font-semibold ${getQualityColor(selectedModelDetails.performance.quality)}`}>
                {selectedModelDetails.performance.quality.charAt(0).toUpperCase() + selectedModelDetails.performance.quality.slice(1)}
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Est. Cost</span>
              </div>
              <p className="text-lg font-semibold text-green-400">
                {selectedModelDetails.pricing.estimated_cost_per_analysis}
              </p>
            </div>
          </div>

          {/* Pricing Details */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Pricing Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Input:</span>
                <span className="text-white ml-2">{selectedModelDetails.pricing.input_per_1k_tokens}/1K tokens</span>
              </div>
              <div>
                <span className="text-gray-400">Output:</span>
                <span className="text-white ml-2">{selectedModelDetails.pricing.output_per_1k_tokens}/1K tokens</span>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {selectedModelDetails.capabilities.map((cap, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs"
                >
                  {cap.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Best For */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Best For</h4>
            <ul className="space-y-1">
              {selectedModelDetails.best_for.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Use Cases */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Recommended Use Cases</h4>
            <div className="grid grid-cols-2 gap-2">
              {selectedModelDetails.recommended_use_cases.map((useCase, idx) => (
                <div key={idx} className="bg-gray-900 rounded px-3 py-2 text-sm text-gray-300">
                  {useCase}
                </div>
              ))}
            </div>
          </div>

          {/* Limitations */}
          {selectedModelDetails.limitations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Limitations</h4>
              <ul className="space-y-1">
                {selectedModelDetails.limitations.map((limitation, idx) => (
                  <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Specs */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Technical Specifications</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Max Tokens:</span>
                <span className="text-white ml-2">{selectedModelDetails.max_tokens.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Context Window:</span>
                <span className="text-white ml-2">{selectedModelDetails.context_window.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Comparison */}
      {!showDetails && Object.keys(models).length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Quick Comparison</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-gray-400 mb-1">Fastest</p>
              <p className="text-green-400 font-semibold">Claude 3 Haiku</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 mb-1">Best Balance</p>
              <p className="text-blue-400 font-semibold">Claude 3 Sonnet</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 mb-1">Most Powerful</p>
              <p className="text-purple-400 font-semibold">Claude 3 Opus</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIModelSelector;
