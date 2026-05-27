"use client";

import { useState, useEffect, useCallback } from "react";

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

interface ModelInfo {
  key: string;
  name: string;
  model_id: string;
  provider: string;
  description: string;
  enabled: boolean;
  performance: { speed: string; quality: string };
  pricing: { input_per_1k_tokens: string; output_per_1k_tokens: string };
}

interface AdminStatus {
  authenticated: boolean;
  aws_region: string;
  aws_access_key_id: string;
  aws_secret_configured: boolean;
  bedrock_model_id: string;
  disabled_models: string[];
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [inputPw, setInputPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  // Credentials form state
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [region, setRegion] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [credSaving, setCredSaving] = useState(false);

  const fetchAdminData = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const [statusRes, modelsRes] = await Promise.all([
        fetch(`${API}/admin/status`, { headers: { "x-admin-password": pw } }),
        fetch(`${API}/admin/models`, { headers: { "x-admin-password": pw } }),
      ]);

      if (statusRes.status === 403) {
        setAuthError("Wrong password. Try again.");
        setAuthed(false);
        setLoading(false);
        return;
      }

      const statusData = await statusRes.json();
      const modelsData = await modelsRes.json();

      setStatus(statusData);
      setModels(modelsData.models || []);
      setRegion(statusData.aws_region || "us-east-1");
      setDefaultModel(statusData.bedrock_model_id || "");
      setAuthed(true);
      setAuthError("");
    } catch (e) {
      setAuthError("Could not connect to backend.");
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setPassword(inputPw);
    await fetchAdminData(inputPw);
  };

  const handleToggleModel = async (modelKey: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    // Optimistic update
    setModels((prev) =>
      prev.map((m) => (m.key === modelKey ? { ...m, enabled: newEnabled } : m))
    );
    try {
      const res = await fetch(`${API}/admin/models/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ model_key: modelKey, enabled: newEnabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      setSaveMsg(`Model ${newEnabled ? "enabled" : "disabled"} successfully`);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      // Revert on error
      setModels((prev) =>
        prev.map((m) => (m.key === modelKey ? { ...m, enabled: currentEnabled } : m))
      );
      setSaveError("Failed to toggle model");
      setTimeout(() => setSaveError(""), 3000);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim() || !secretKey.trim()) {
      setSaveError("Access Key ID and Secret Access Key are required.");
      return;
    }
    setCredSaving(true);
    setSaveMsg("");
    setSaveError("");
    try {
      const res = await fetch(`${API}/admin/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          aws_access_key_id: accessKey,
          aws_secret_access_key: secretKey,
          aws_region: region || undefined,
          bedrock_model_id: defaultModel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Save failed");
      setSaveMsg("✅ Credentials saved and applied! Bedrock service restarted.");
      setAccessKey("");
      setSecretKey("");
      // Refresh status
      await fetchAdminData(password);
    } catch (err: any) {
      setSaveError(`❌ ${err.message}`);
    }
    setCredSaving(false);
    setTimeout(() => { setSaveMsg(""); setSaveError(""); }, 5000);
  };

  const speedColor = (speed: string) =>
    speed === "fast" ? "text-green-400" : speed === "medium" ? "text-yellow-400" : "text-red-400";

  const qualityColor = (quality: string) =>
    quality === "high" ? "text-purple-400" : quality === "medium" ? "text-blue-400" : "text-gray-400";

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 mt-2">AURA Analyst — Owner Access Only</p>
          </div>
          <form
            onSubmit={handleLogin}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl"
          >
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={inputPw}
              onChange={(e) => setInputPw(e.target.value)}
              placeholder="Enter admin password"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
              autoFocus
            />
            {authError && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-2 mb-4 text-sm">
                {authError}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !inputPw}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? "Verifying..." : "Enter Admin Panel"}
            </button>
          </form>
          <p className="text-center text-gray-600 text-xs mt-4">
            This page is restricted to the system owner only.
          </p>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Settings</h1>
            <p className="text-xs text-gray-400">AURA Analyst — Owner Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-green-900/40 border border-green-700 text-green-400 text-xs px-3 py-1 rounded-full">
            ● Authenticated
          </span>
          <a
            href="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to App
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Status Banner */}
        {saveMsg && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 rounded-xl px-5 py-3 text-sm font-medium">
            {saveMsg}
          </div>
        )}
        {saveError && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-5 py-3 text-sm font-medium">
            {saveError}
          </div>
        )}

        {/* Current AWS Status */}
        {status && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>☁️</span> Current AWS Configuration
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Region</p>
                <p className="text-white font-mono text-sm">{status.aws_region}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Access Key</p>
                <p className="text-white font-mono text-sm">{status.aws_access_key_id}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Secret Key</p>
                <p className={`font-mono text-sm ${status.aws_secret_configured ? "text-green-400" : "text-red-400"}`}>
                  {status.aws_secret_configured ? "✓ Configured" : "✗ Missing"}
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 col-span-2 md:col-span-1">
                <p className="text-xs text-gray-400 mb-1">Default Model</p>
                <p className="text-white font-mono text-xs truncate" title={status.bedrock_model_id}>
                  {status.bedrock_model_id.split("/").pop() || status.bedrock_model_id}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Update AWS Credentials */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <span>🔑</span> Update AWS Credentials
          </h2>
          <p className="text-gray-400 text-sm mb-5">
            Changes are saved to <code className="text-blue-400 bg-gray-800 px-1 rounded">backend/.env</code> and applied immediately — no restart needed.
          </p>
          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  AWS Access Key ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="AKIA..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  AWS Secret Access Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Your secret key..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    {showSecret ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  AWS Region <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="us-east-1"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Default Bedrock Model ID <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="arn:aws:bedrock:..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={credSaving || !accessKey || !secretKey}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {credSaving ? "Saving..." : "Save & Apply Credentials"}
              </button>
              <p className="text-xs text-gray-500">
                Leave Access Key / Secret blank to keep existing values.
              </p>
            </div>
          </form>
        </div>

        {/* Model Management */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <span>🤖</span> Model Management
          </h2>
          <p className="text-gray-400 text-sm mb-5">
            Toggle models on/off. Disabled models are hidden from the analysis page dropdown immediately.
          </p>
          <div className="space-y-3">
            {models.map((model) => (
              <div
                key={model.key}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  model.enabled
                    ? "bg-gray-800 border-gray-600"
                    : "bg-gray-900 border-gray-700 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{model.name}</span>
                    {!model.enabled && (
                      <span className="bg-red-900/50 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-800">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs truncate mb-2">{model.description}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={speedColor(model.performance?.speed)}>
                      ⚡ {model.performance?.speed}
                    </span>
                    <span className={qualityColor(model.performance?.quality)}>
                      ✦ {model.performance?.quality} quality
                    </span>
                    <span className="text-gray-500">
                      {model.pricing?.input_per_1k_tokens}/1k in
                    </span>
                  </div>
                </div>
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggleModel(model.key, model.enabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                    model.enabled ? "bg-blue-600" : "bg-gray-600"
                  }`}
                  title={model.enabled ? "Click to disable" : "Click to enable"}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      model.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-4">
            {models.filter((m) => m.enabled).length} of {models.length} models enabled
          </p>
        </div>

        {/* Danger Zone */}
        <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
            <span>⚠️</span> Notes
          </h2>
          <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
            <li>Credential changes are written to <code className="text-blue-400">backend/.env</code> and applied live.</li>
            <li>The Bedrock client is re-initialized automatically after saving credentials.</li>
            <li>Disabling all models will break the analysis page — keep at least one enabled.</li>
            <li>To change the admin password, edit <code className="text-blue-400">ADMIN_PASSWORD</code> in <code className="text-blue-400">backend/.env</code>.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
