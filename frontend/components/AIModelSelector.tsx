"use client";

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
  performance: { speed: string; quality: string };
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
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('');

  useEffect(() => { fetchModels(); }, []);

  const fetchModels = async () => {
    try {
      const endpoint = authToken
        ? `${apiUrl}/api/v1/ai/models`
        : `${apiUrl}/api/v1/ai/models/public`;
      const res = await fetch(endpoint, authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined);
      const data = await res.json();
      if (data.success) setModels(data.models);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleSelect = (key: string, modelId: string) => {
    setSelectedKey(key);
    onModelSelect(modelId);
    setOpen(false);
  };

  const current = selectedKey ? models[selectedKey] : null;

  // Short display name
  const shortName = (name: string) => name.replace('(Recommended)', '★').replace('(Stable)', '').replace('(Strongest Reasoning)', '').replace('(Fastest Fallback)', '').trim();

  if (loading) {
    return (
      <div className="font-mono text-xs text-[#3d3a2e] flex items-center gap-2 py-2">
        <span className="blink">█</span> loading_models...
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between border border-[#2a2a1e] px-3 py-2.5 text-left hover:border-[#f97316]/40 transition-all"
        >
          <div>
            <div className="font-mono text-[10px] text-[#3d3a2e] mb-0.5">// active_model</div>
            <div className="font-mono text-xs text-[#e8e0cc]">
              {current ? shortName(current.name) : 'default (sonnet-4-6)'}
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-[#f97316] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown list */}
        {open && (
          <div className="absolute top-full left-0 right-0 z-50 border border-[#f97316]/30 bg-[#0f0f0b] shadow-xl">
            {/* Default option */}
            <button
              onClick={() => { setSelectedKey(''); onModelSelect(''); setOpen(false); }}
              className={`w-full px-3 py-2.5 text-left border-b border-[#2a2a1e] hover:bg-[#f97316]/5 transition-all
                ${!selectedKey ? 'bg-[#f97316]/5 border-l-2 border-l-[#f97316]' : ''}`}
            >
              <div className="font-mono text-xs text-[#f97316]">default</div>
              <div className="font-mono text-[10px] text-[#7a7060]">claude-sonnet-4-6 · recommended</div>
            </button>

            {Object.entries(models).map(([key, model]) => (
              <button
                key={key}
                onClick={() => handleSelect(key, model.model_id)}
                className={`w-full px-3 py-2.5 text-left border-b border-[#2a2a1e] last:border-0 hover:bg-[#f97316]/5 transition-all
                  ${selectedKey === key ? 'bg-[#f97316]/5 border-l-2 border-l-[#f97316]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-[#e8e0cc]">{shortName(model.name)}</div>
                  <div className="font-mono text-[10px] text-[#3d3a2e]">{model.pricing.estimated_cost_per_analysis}</div>
                </div>
                <div className="font-mono text-[10px] text-[#7a7060] mt-0.5 truncate">{model.description.slice(0, 60)}...</div>
                <div className="flex gap-2 mt-1">
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 border
                    ${model.performance.speed === 'fast' ? 'border-[#4ade80]/30 text-[#4ade80]' : 'border-[#fbbf24]/30 text-[#fbbf24]'}`}>
                    {model.performance.speed}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 border border-purple-500/30 text-purple-400">
                    {model.performance.quality}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected model details */}
      {current && (
        <div className="border border-[#2a2a1e] p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center border border-[#2a2a1e] p-1.5">
              <div className="font-mono text-[9px] text-[#3d3a2e]">speed</div>
              <div className={`font-mono text-[10px] font-bold ${current.performance.speed === 'fast' ? 'text-[#4ade80]' : 'text-[#fbbf24]'}`}>
                {current.performance.speed}
              </div>
            </div>
            <div className="text-center border border-[#2a2a1e] p-1.5">
              <div className="font-mono text-[9px] text-[#3d3a2e]">quality</div>
              <div className="font-mono text-[10px] font-bold text-purple-400">{current.performance.quality}</div>
            </div>
            <div className="text-center border border-[#2a2a1e] p-1.5">
              <div className="font-mono text-[9px] text-[#3d3a2e]">est. cost</div>
              <div className="font-mono text-[10px] font-bold text-[#f97316]">{current.pricing.estimated_cost_per_analysis}</div>
            </div>
          </div>
          <div className="font-mono text-[10px] text-[#7a7060] leading-relaxed">{current.description}</div>
        </div>
      )}

      {/* Quick comparison (when no model selected) */}
      {!current && !loading && (
        <div className="border border-[#2a2a1e] p-3">
          <div className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mb-2">// quick comparison</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center border border-[#2a2a1e] p-2">
              <div className="font-mono text-[9px] text-[#3d3a2e] mb-1">fastest</div>
              <div className="font-mono text-[10px] text-[#4ade80] font-bold">Haiku 4.5</div>
            </div>
            <div className="text-center border border-[#f97316]/30 p-2 bg-[#f97316]/5">
              <div className="font-mono text-[9px] text-[#3d3a2e] mb-1">recommended</div>
              <div className="font-mono text-[10px] text-[#f97316] font-bold">Sonnet 4.6</div>
            </div>
            <div className="text-center border border-[#2a2a1e] p-2">
              <div className="font-mono text-[9px] text-[#3d3a2e] mb-1">most powerful</div>
              <div className="font-mono text-[10px] text-purple-400 font-bold">Opus 4.6</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIModelSelector;
