import React from 'react';
import { Key, Loader2, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

/**
 * AI 모델 선택 사이드바 위젯.
 * 서버에서 받아온 모델 목록을 기반으로 렌더링한다.
 *
 * Props:
 * - enabledProviders: 활성화된 프로바이더 목록
 * - disabledProviders: 비활성화된 프로바이더 목록
 * - selectedProvider: 현재 선택된 프로바이더 ID
 * - selectedModelId: 현재 선택된 모델 ID
 * - apiKey: 현재 프로바이더의 API 키
 * - keyStatus: 키 검증 상태 ('none' | 'valid' | 'invalid')
 * - isKeyValidating: 키 검증 중 여부
 * - onProviderChange: 프로바이더 변경 콜백
 * - onModelChange: 모델 변경 콜백
 * - onApiKeyChange: API 키 입력 콜백
 * - onVerifyKey: 키 검증 버튼 콜백
 * - modelsLoading: 모델 목록 로딩 중 여부
 */
export default function ModelSelector({
  enabledProviders,
  disabledProviders,
  selectedProvider,
  selectedModelId,
  apiKey,
  keyStatus,
  isKeyValidating,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onVerifyKey,
  modelsLoading,
}) {
  const currentProvider = enabledProviders.find((p) => p.id === selectedProvider);
  const currentModels = currentProvider?.models || [];
  const currentModel = currentModels.find((m) => m.id === selectedModelId) || currentModels[0];

  if (modelsLoading) {
    return (
      <div className="p-4 border-t border-slate-800 text-center">
        <Loader2 size={16} className="animate-spin text-slate-400 mx-auto" />
        <p className="text-[10px] text-slate-500 mt-1">모델 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
        <Key size={15} /> AI 모델 선택
      </div>

      {/* 프로바이더 버튼 (활성화된 것) */}
      <div className="flex gap-1.5">
        {enabledProviders.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderChange(p.id)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border
              ${selectedProvider === p.id
                ? `${p.color} text-white border-transparent`
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
          >
            {p.label}
          </button>
        ))}
        {disabledProviders.map((p) => (
          <button
            key={p.id}
            disabled
            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-slate-800/50 text-slate-600 border border-slate-700/50 cursor-not-allowed"
            title="준비 중"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 모델 드롭다운 */}
      {currentModels.length > 1 && (
        <div className="relative">
          <select
            value={selectedModelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
          >
            {currentModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.description}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      )}

      {/* API 키 입력 */}
      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onVerifyKey()}
          placeholder={`${currentProvider?.label || ''} API Key`}
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
        />
        <button
          onClick={onVerifyKey}
          disabled={isKeyValidating || !apiKey}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
        >
          {isKeyValidating ? <Loader2 size={14} className="animate-spin" /> : '확인'}
        </button>
      </div>

      {/* 키 상태 */}
      {keyStatus === 'valid' && (
        <p className="text-emerald-400 text-[10px] flex items-center gap-1">
          <CheckCircle size={10} /> 키 검증 완료
        </p>
      )}
      {keyStatus === 'invalid' && (
        <p className="text-red-400 text-[10px] flex items-center gap-1">
          <XCircle size={10} /> 유효하지 않은 키
        </p>
      )}

      {/* 파일 지원 안내 */}
      {currentProvider && !currentProvider.supportsFiles && (
        <p className="text-amber-400 text-[10px] leading-tight">※ PDF 업로드는 Gemini만 지원</p>
      )}

      {/* 현재 선택된 모델 정보 */}
      <p className="text-[10px] text-slate-500 text-center">
        {currentProvider?.label} · {currentModel?.id || ''}
      </p>
    </div>
  );
}
