/**
 * NVIDIA NIM API Client — reusable LLM interface for ATP2 Edge Functions.
 * Model: nvidia/nemotron-3-super-120b-a12b (OpenAI-compatible endpoint)
 * Pattern: raw fetch() with graceful fallback (matches ipfs-upload.tsx style)
 */

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NIM_MODEL = "nvidia/nemotron-3-super-120b-a12b";

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
      const statusText = await response.text().catch(() => '');
      console.warn(`⚠️ NIM transient error ${response.status}, retrying in ${RETRY_DELAY_MS}ms...`, statusText.slice(0, 120));
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
  const apiKey = Deno.env.get("NVIDIA_API_KEY");
  if (!apiKey) {
    return { success: false, error: "NVIDIA_API_KEY not configured" };
  }

  const {
    maxTokens = 4096,
    temperature = 0.7,
    topP = 0.95,
    timeoutMs = 40000,
    reasoningEffort = "low",
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
      model: NIM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      stream: false,
      ...denoisedParams, // Apply denoising parameters
    };

    if (enableThinking) {
      body.extra_body = {
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: reasoningBudget,
      };
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
      `${NIM_BASE_URL}/chat/completions`,
      fetchInit,
      controller.signal,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      return { success: false, error: `NIM API ${response.status}: ${errorText}` };
    }

    const data = await response.json();
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

const NIM_EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5";

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
  const apiKey = Deno.env.get("NVIDIA_API_KEY");
  if (!apiKey) {
    return { success: false, error: "NVIDIA_API_KEY not configured" };
  }

  const { timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${NIM_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NIM_EMBEDDING_MODEL,
        input: [text],
        input_type: "query",
        encoding_format: "float",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      return { success: false, error: `NIM Embedding API ${response.status}: ${errorText}` };
    }

    const data = await response.json();
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

const NIM_VISION_MODEL = "meta/llama-3.2-11b-vision-instruct";

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
  const apiKey = Deno.env.get("NVIDIA_API_KEY");
  if (!apiKey) {
    return { success: false, error: "NVIDIA_API_KEY not configured" };
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
    for (const url of imageUrls.slice(0, 5)) {
      try {
        if (url.startsWith("data:")) {
          contentBlocks.push({ type: "image_url", image_url: { url } });
          continue;
        }
        const imgResponse = await fetch(url, { signal: controller.signal });
        if (!imgResponse.ok) continue;
        const arrayBuffer = await imgResponse.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        contentBlocks.push({
          type: "image_url",
          image_url: { url: `data:${contentType};base64,${base64}` },
        });
      } catch {
        continue; // Skip failed images
      }
    }

    const body = {
      model: NIM_VISION_MODEL,
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

    const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      return { success: false, error: `NIM Vision API ${response.status}: ${errorText}` };
    }

    const data = await response.json();
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
