/**
 * Gemini Client - Supabase Edge Function gemini-proxy 호출
 *
 * GitHub Pages 배포 시 Express 서버 없이 직접 Gemini API를 호출한다.
 * Supabase Edge Function이 API 키를 관리하므로 프론트엔드에 키 노출이 없다.
 */

const SUPABASE_URL = 'https://pkwbqbxuujpcvndpacsc.supabase.co';
const GEMINI_PROXY_URL = `${SUPABASE_URL}/functions/v1/gemini-proxy`;

/**
 * Supabase gemini-proxy를 통한 Gemini API 호출 (재시도 포함)
 */
export async function callGeminiProxy({ contents, systemInstruction, generationConfig, model = 'gemini-2.5-flash' }) {
  const body = { model, contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (generationConfig) body.generationConfig = generationConfig;

  const maxRetries = 3;
  const delays = [1000, 2000, 4000];

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(GEMINI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error?.message || data.error || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }
      return data;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
}

/**
 * 서버 사용 가능 여부 확인
 */
export async function isServerAvailable() {
  try {
    const res = await fetch('/api/models', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * API 호출 - 서버가 있으면 서버 사용, 없으면 Supabase 프록시 직접 호출
 */
export async function smartAnalyze({ provider, apiKey, modelId, top3, profile, hasFiles, hasPortfolioFile, fileParts, systemPrompt, geminiResponseSchema }) {
  // 1) 서버가 살아있으면 기존 방식 사용
  const serverAlive = await isServerAvailable();
  if (serverAlive) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, modelId, top3, profile, hasFiles, hasPortfolioFile, fileParts }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `서버 오류 (${res.status})`);
    return data;
  }

  // 2) 서버 없음 (GitHub Pages 모드) → Supabase gemini-proxy 직접 호출
  const { buildUserPromptClient } = await import('./prompt-builder.js');
  const userPrompt = buildUserPromptClient({ top3, profile, hasFiles: !!hasFiles, hasPortfolioFile: !!hasPortfolioFile });

  // 시스템 프롬프트 & JSON 스키마를 public/ 에서 로드
  const [sysPromptText, schemaJson] = await Promise.all([
    fetch('./prompts/system-prompt.md').then((r) => r.ok ? r.text() : '').catch(() => ''),
    fetch('./prompts/analysis-schema.json').then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);

  const parts = [{ text: userPrompt }];
  if (fileParts && fileParts.length > 0) {
    parts.push(...fileParts);
  }

  const data = await callGeminiProxy({
    model: modelId || 'gemini-2.5-flash',
    contents: [{ parts }],
    systemInstruction: sysPromptText ? { parts: [{ text: sysPromptText }] } : undefined,
    generationConfig: {
      responseMimeType: 'application/json',
      ...(schemaJson ? { responseSchema: schemaJson } : {}),
      temperature: 0.7,
    },
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답을 파싱할 수 없습니다.');
  return JSON.parse(text);
}

/**
 * API 키 검증 - Supabase 프록시 경유
 */
export async function validateKeyViaProxy() {
  try {
    const data = await callGeminiProxy({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: 'Hello' }] }],
    });
    return { valid: !!data.candidates, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
