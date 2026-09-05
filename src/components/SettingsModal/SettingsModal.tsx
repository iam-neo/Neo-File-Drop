import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Wifi, WifiOff, Shield } from 'lucide-react';
import { getAppsScriptUrl, saveAppsScriptUrl, apiService } from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured: (configured: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigured
}) => {
  const [url, setUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(getAppsScriptUrl());
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = url.trim();
    saveAppsScriptUrl(trimmed);
    onConfigured(!!trimmed);
    onClose();
  };

  const handleTest = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setTestStatus('error');
      setTestMessage('Please enter a URL first.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Checking connection...');

    try {
      // Temporarily save for testing
      saveAppsScriptUrl(trimmed);
      const res = await apiService.healthCheck();

      if (res.success) {
        setTestStatus('success');
        setTestMessage(
          `Connected! Version: ${res.version || 'unknown'}${
            res.configuredFolder ? ` • Root Folder: ${res.configuredFolder}` : ''
          }`
        );
        onConfigured(true);
      } else {
        setTestStatus('error');
        setTestMessage(res.error || 'Server returned an error.');
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage(
        err instanceof Error ? err.message : 'Failed to reach the server.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 transition-all">
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Drive Connection</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Google Apps Script Web App URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Status Feedback */}
          {testStatus !== 'idle' && (
            <div
              className={`rounded-xl p-3 text-xs font-medium flex items-start gap-2 ${
                testStatus === 'testing'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : testStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
              {testStatus === 'success' && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
              {testStatus === 'error' && <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{testMessage}</span>
            </div>
          )}

          {/* Help text */}
          <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">
            <p className="font-semibold text-slate-600 mb-1">How to get this URL:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Deploy the Neo File Drop Apps Script as a Web App</li>
              <li>Set "Execute as" to <strong>Me</strong> and "Access" to <strong>Anyone</strong></li>
              <li>Copy the generated deployment URL and paste above</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {testStatus === 'testing' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}
            <span>Test Connection</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
