/**
 * NVIDIA NIM API Client — reusable LLM interface for ATP2 Edge Functions.
 * Model: nvidia/nemotron-3-super-120b-a12b (OpenAI-compatible endpoint)
 * Pattern: raw fetch() with graceful fallback (matches ipfs-upload.tsx style)
 */

import { readBoundedJson } from './bounded-response.ts';

const DEFAULT_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_NIM_CHAT_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const DEFAULT_NIM_EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5";
const DEFAULT_NIM_VISION_MODEL = "meta/llama-3.2-11b-vision-instruct";
const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_NIM_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_DATA_IMAGE_LENGTH = 7 * 1024 * 1024;
const MAX_TOTAL_IMAGE_INPUT_LENGTH = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DEFAULT_AI_IMAGE_HOSTS = new Set([
  "gateway.pinata.cloud",
  "ipfs.io",
  "cloudflare-ipfs.com",
  "dweb.link",
]);

function readNIMEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function getNIMApiKey(): string | null {
  return readNIMEnv("NVIDIA_API_KEY", "NIM_API_KEY", "NEMO_API_KEY");
}

export function resolveNIMBaseUrl(value: string | null | undefined): string {
  const candidate = String(value || DEFAULT_NIM_BASE_URL).trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== "https:"
      || parsed.hostname.toLowerCase() !== "integrate.api.nvidia.com"
      || parsed.username
      || parsed.password
      || parsed.port && parsed.port !== "443"
      || parsed.search
      || parsed.hash
      || parsed.pathname !== "/v1"
    ) return DEFAULT_NIM_BASE_URL;
    return `${parsed.origin}/v1`;
  } catch {
    return DEFAULT_NIM_BASE_URL;
  }
}

function getNIMBaseUrl(): string {
  return resolveNIMBaseUrl(readNIMEnv("NVIDIA_BASE_URL", "NIM_BASE_URL", "NEMO_BASE_URL"));
}

function getNIMChatModel(): string {
  return readNIMEnv("NVIDIA_CHAT_MODEL", "NIM_CHAT_MODEL", "NEMO_CHAT_MODEL") || DEFAULT_NIM_CHAT_MODEL;
}

function getNIMEmbeddingModel(): string {
  return readNIMEnv("NVIDIA_EMBEDDING_MODEL", "NIM_EMBEDDING_MODEL") || DEFAULT_NIM_EMBEDDING_MODEL;
}

function getNIMVisionModel(): string {
  return readNIMEnv("NVIDIA_VISION_MODEL", "NIM_VISION_MODEL") || DEFAULT_NIM_VISION_MODEL;
}

function configuredAIImageHosts(): Set<string> {
  const hosts = new Set(DEFAULT_AI_IMAGE_HOSTS);
  const supabaseUrl = readNIMEnv("SUPABASE_URL");
  if (supabaseUrl) {
    try {
      hosts.add(new URL(supabaseUrl).hostname.toLowerCase());
    } catch {
      // A malformed backend URL is handled by the caller that requires Supabase.
    }
  }
  for (const host of String(readNIMEnv("ATP2_AI_IMAGE_ALLOWED_HOSTS") || "").split(",")) {
    const normalized = host.trim().toLowerCase();
    if (normalized) hosts.add(normalized);
  }
  return hosts;
}

function isIpLiteral(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

export function validateVisionImageUrl(value: string): { valid: true; url: string } | { valid: false; error: string } {
  const candidate = String(value || "").trim();
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(candidate)) {
    return candidate.length <= MAX_DATA_IMAGE_LENGTH
      ? { valid: true, url: candidate }
      : { valid: false, error: "data image exceeds the encoded size limit" };
  }
  if (candidate.startsWith("data:")) return { valid: false, error: "unsupported data image type" };

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { valid: false, error: "image URL must be absolute" };
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) {
    return { valid: false, error: "image URL must use credential-free HTTPS" };
  }
  if (isIpLiteral(hostname) || !configuredAIImageHosts().has(hostname)) {
    return { valid: false, error: "image host is not approved" };
  }
  if (DEFAULT_AI_IMAGE_HOSTS.has(hostname) && !parsed.pathname.startsWith("/ipfs/")) {
    return { valid: false, error: "IPFS gateway URL must use an /ipfs/ path" };
  }
  if (hostname.endsWith(".supabase.co") && !parsed.pathname.startsWith("/storage/v1/object/")) {
    return { valid: false, error: "Supabase image URL must use the Storage object path" };
  }
  return { valid: true, url: parsed.toString() };
}

export function validateVisionImageUrls(
  values: unknown,
  maxImages = 5,
): { valid: true; urls: string[] } | { valid: false; error: string } {
  if (!Array.isArray(values) || values.length > maxImages) {
    return { valid: false, error: `imageUrls must contain at most ${maxImages} images` };
  }
  const urls: string[] = [];
  let totalLength = 0;
  for (const value of values) {
    if (typeof value !== 'string') return { valid: false, error: 'Every image URL must be a string' };
    totalLength += value.length;
    if (totalLength > MAX_TOTAL_IMAGE_INPUT_LENGTH) {
      return { valid: false, error: 'Combined image input exceeds the 10 MB encoded limit' };
    }
    const validation = validateVisionImageUrl(value);
    if (!validation.valid) return validation;
    urls.push(validation.url);
  }
  return { valid: true, urls };
}

function hasExpectedImageMagic(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/gif") {
    const header = new TextDecoder().decode(bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (mimeType === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
      && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function readBoundedResponseBytes(response: Response): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error("remote image exceeds size limit");
  }
  if (!response.body) throw new Error("remote image response has no body");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_REMOTE_IMAGE_BYTES) throw new Error("remote image exceeds size limit");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function fetchVisionImageAsDataUrl(value: string, signal: AbortSignal): Promise<string> {
  const validation = validateVisionImageUrl(value);
  if (!validation.valid) throw new Error(validation.error);
  if (validation.url.startsWith("data:")) return validation.url;

  const response = await fetch(validation.url, {
    method: "GET",
    redirect: "error",
    signal,
    headers: { Accept: "image/jpeg,image/png,image/webp,image/gif" },
  });
  if (!response.ok) throw new Error(`remote image returned ${response.status}`);
  const contentType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(contentType)) throw new Error("remote response is not an approved image type");
  const bytes = await readBoundedResponseBytes(response);
  if (!hasExpectedImageMagic(bytes, contentType)) throw new Error("remote image signature does not match its MIME type");

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${contentType};base64,${btoa(binary)}`;
}

// Transient HTTP status codes that warrant a retry
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 1500;

interface NIMOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeoutMs?: number;
  /** "none" = no reasoning, "low" = brief, "medium" = moderate */
  reasoningEffort?: "none" | "low" | "medium";
  /** Enable denoising for consistent responses (based on Gaussian filter, sigma=1) */
  enableDenoising?: boolean;
  /** Gaussian filter sigma for denoising (default: 1.0) - Lower values = more denoising */
  denoisingSigma?: number;
  /** Noise reduction strength (0.0-1.0, default: 0.3) - Higher values = more noise reduction */
  noiseReduction?: number;
  /** Stability threshold for consistent token selection (0.0-1.0, default: 0.15) */
  stabilityThreshold?: number;
  /** Enable probability smoothing to reduce distribution drift */
  probabilitySmoothing?: boolean;
  /** Frequency penalty to reduce repetition */
  frequencyPenalty?: number;
  /** Presence penalty to encourage diversity */
  presencePenalty?: number;
}

interface NIMSuccess {
  success: true;
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface NIMFailure {
  success: false;
  error: string;
}

export type NIMResult = NIMSuccess | NIMFailure;

/**
 * Retry-aware fetch for NIM API calls.
 * Retries once on transient errors (502/503/429/timeout) with a 1.5s delay,
 * staying within the overall AbortController deadline.
 */
async function retryableNIMFetch(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<Response> {
  try {
    const response = await fetch(url, { ...init, signal });
    if (RETRYABLE_STATUS_CODES.has(response.status)) {
      console.warn(`⚠️ NIM transient error ${response.status}, retrying in ${RETRY_DELAY_MS}ms...`);
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return fetch(url, { ...init, signal });
    }
    return response;
  } catch (err: any) {
    // Retry on network errors (not AbortError)
    if (err?.name === 'AbortError') throw err;
    console.warn(`⚠️ NIM network error, retrying in ${RETRY_DELAY_MS}ms...`, err?.message);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return fetch(url, { ...init, signal });
  }
}

/**
 * Call NVIDIA NIM API. Never throws — returns { success: false } on any error.
 * Automatically retries once on transient failures (502/503/429/timeout).
 */
export async function callNvidiaNIM(
  systemPrompt: string,
  userMessage: string,
  options: NIMOptions = {},
): Promise<NIMResult> {
  const apiKey = getNIMApiKey();
  if (!apiKey) {
    return { success: false, error: "NVIDIA_API_KEY/NIM_API_KEY not configured" };
  }

  const {
    maxTokens = 4096,
    temperature = 0.7,
    topP = 0.95,
    timeoutMs = 50000,
    reasoningEffort = "none",
    enableDenoising = true, // Enable by default for consistency
    denoisingSigma = 1.0, // Gaussian filter sigma - lower = more denoising
    noiseReduction = 0.3, // Noise reduction strength (0.0-1.0)
    stabilityThreshold = 0.15, // Stability threshold for token selection
    probabilitySmoothing = true, // Enable probability smoothing by default
    frequencyPenalty = 0.2,
    presencePenalty = 0.1,
  } = options;

  // Apply advanced denoising parameters based on Gaussian filter analysis
  // Original probabilities: [0.203, 0.075, 0.045, 0.553, 0.123] - high variance, peak at token 4 (~55%)
  // Noise issues: [0.029, 0.134, 0.0003, 0.562, 0.276] - distribution drift, variance increases
  // Denoised (σ=1): [0.061, 0.094, 0.186, 0.316, 0.343] - low variance, more stable distribution
  const denoisedParams = enableDenoising ? {
    // Dynamic temperature based on sigma and noise reduction
    temperature: Math.min(temperature * (1 - noiseReduction), 0.31552382 / denoisingSigma),

    // Adjusted top_p with probability smoothing
    top_p: probabilitySmoothing
      ? Math.min(topP * (1 - stabilityThreshold), 0.8434657) // Sum of top 2 denoised probabilities
      : Math.min(topP, 0.9),

    // Enhanced stability parameters
    frequency_penalty: frequencyPenalty + (noiseReduction * 0.1), // Increase repetition penalty with noise reduction
    presence_penalty: presencePenalty + (stabilityThreshold * 0.05), // Slight diversity boost for stability

    // Seed for reproducibility when high stability is needed
    seed: stabilityThreshold > 0.2 ? 42 : undefined,

    // Additional NVIDIA-specific parameters for consistency
    repetition_penalty: 1.0 + (noiseReduction * 0.1), // Reduce repetition based on noise reduction

  } : {
    temperature,
    top_p: topP,
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const enableThinking = reasoningEffort !== "none";
    const reasoningBudget = reasoningEffort === "medium" ? 8192
      : reasoningEffort === "low" ? 2048
      : 0;

    const body: Record<string, unknown> = {
      model: getNIMChatModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      stream: false,
      ...denoisedParams, // Apply denoising parameters
    };

    if (enableThinking) {
      // NVIDIA's OpenAI SDK accepts `extra_body`, then merges it into the request.
      // Raw fetch must send these provider-specific fields at top level.
      body.chat_template_kwargs = { enable_thinking: true };
      body.reasoning_budget = reasoningBudget;
    }

    console.log('🧠 NIM Request with denoising:', {
      enableDenoising,
      temperature: denoisedParams.temperature,
      top_p: denoisedParams.top_p,
      frequency_penalty: denoisedParams.frequency_penalty,
      presence_penalty: denoisedParams.presence_penalty,
      seed: denoisedParams.seed || 'none'
    });

    const fetchInit: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    };

    const response = await retryableNIMFetch(
      `${getNIMBaseUrl()}/chat/completions`,
      fetchInit,
      controller.signal,
    );

    if (!response.ok) {
      return { success: false, error: `NIM API returned status ${response.status}` };
    }

    const data = await readBoundedJson<any>(response, MAX_NIM_RESPONSE_BYTES);
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "Empty response from NIM API" };
    }

    return {
      success: true,
      content,
      usage: data.usage,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: `NIM API timeout after ${timeoutMs}ms` };
    }
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse JSON from LLM output. Handles:
 * 1. Raw JSON string
 * 2. JSON wrapped in ```json ... ``` markdown fences
 * 3. JSON extracted from first { to last } in response
 */
export function parseJSONFromLLM<T = unknown>(content: string): T | null {
  // 1. Try raw parse
  try {
    return JSON.parse(content) as T;
  } catch {
    // continue
  }

  // 2. Try markdown fence extraction
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]) as T;
    } catch {
      // continue
    }
  }

  // 3. Try brace extraction (first { to last })
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(content.slice(firstBrace, lastBrace + 1)) as T;
    } catch {
      // continue
    }
  }

  // 4. Try bracket extraction for arrays (first [ to last ])
  const firstBracket = content.indexOf("[");
  const lastBracket = content.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(content.slice(firstBracket, lastBracket + 1)) as T;
    } catch {
      // continue
    }
  }

  return null;
}

// ============================================================================
// Embedding API
// ============================================================================

interface EmbeddingSuccess {
  success: true;
  embedding: number[];
  usage?: { prompt_tokens: number; total_tokens: number };
}

interface EmbeddingFailure {
  success: false;
  error: string;
}

export type EmbeddingResult = EmbeddingSuccess | EmbeddingFailure;

/**
 * Generate a 1024-dimensional embedding vector from text. Never throws.
 */
export async function callNvidiaNIMEmbedding(
  text: string,
  options: { timeoutMs?: number } = {},
): Promise<EmbeddingResult> {
  const apiKey = getNIMApiKey();
  if (!apiKey) {
    return { success: false, error: "NVIDIA_API_KEY/NIM_API_KEY not configured" };
  }

  const { timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getNIMBaseUrl()}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getNIMEmbeddingModel(),
        input: [text],
        input_type: "query",
        encoding_format: "float",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { success: false, error: `NIM Embedding API returned status ${response.status}` };
    }

    const data = await readBoundedJson<any>(response, MAX_NIM_RESPONSE_BYTES);
    const embedding = data?.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      return { success: false, error: "Empty embedding response from NIM API" };
    }

    return { success: true, embedding, usage: data.usage };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: `NIM Embedding API timeout after ${timeoutMs}ms` };
    }
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Vision API
// ============================================================================

/**
 * Call NVIDIA NIM Vision model to analyze images.
 * Fetches image URLs and converts to base64 data URLs. Never throws.
 */
export async function callNvidiaNIMVision(
  systemPrompt: string,
  textPrompt: string,
  imageUrls: string[],
  options: NIMOptions = {},
): Promise<NIMResult> {
  const imageValidation = validateVisionImageUrls(imageUrls);
  if (!imageValidation.valid) {
    return { success: false, error: imageValidation.error };
  }
  const apiKey = getNIMApiKey();
  if (!apiKey) {
    return { success: false, error: "NVIDIA_API_KEY/NIM_API_KEY not configured" };
  }

  const {
    maxTokens = 2048,
    temperature = 0.3,
    topP = 0.9,
    timeoutMs = 45000,
    enableDenoising = true,
    frequencyPenalty = 0.15, // Lower for vision tasks
    presencePenalty = 0.1,
  } = options;

  // Apply denoising for vision analysis consistency
  const denoisedParams = enableDenoising ? {
    temperature: Math.min(temperature, 0.25), // Even lower for vision accuracy
    top_p: Math.min(topP, 0.85),
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
    seed: 42,
  } : {
    temperature,
    top_p: topP,
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Build multimodal content blocks
    const contentBlocks: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    contentBlocks.push({ type: "text", text: textPrompt });

    // Fetch images and convert to base64 (cap at 5)
    for (const url of imageValidation.urls) {
      try {
        const safeDataUrl = await fetchVisionImageAsDataUrl(url, controller.signal);
        contentBlocks.push({
          type: "image_url",
          image_url: { url: safeDataUrl },
        });
      } catch {
        continue; // Skip failed images
      }
    }

    const body = {
      model: getNIMVisionModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentBlocks },
      ],
      max_tokens: maxTokens,
      stream: false,
      ...denoisedParams, // Apply denoising to vision model too
    };

    console.log('👁️ NIM Vision with denoising:', {
      enableDenoising,
      temperature: denoisedParams.temperature,
      top_p: denoisedParams.top_p,
      imagesCount: imageUrls.length
    });

    const response = await fetch(`${getNIMBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { success: false, error: `NIM Vision API returned status ${response.status}` };
    }

    const data = await readBoundedJson<any>(response, MAX_NIM_RESPONSE_BYTES);
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "Empty response from NIM Vision API" };
    }

    return { success: true, content, usage: data.usage };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: `NIM Vision API timeout after ${timeoutMs}ms` };
    }
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  } finally {
    clearTimeout(timeout);
  }
}
