import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import type { AIAssistContext, AIStructuredResponse } from './types.ts';

const DEFAULT_ASSIST_MODEL_ID = 'orina-ai-engine-v2';
const DEFAULT_ASSIST_OPERATION = 'assist';
const MAX_THREAD_TITLE_LENGTH = 80;
const MAX_SUMMARY_PREVIEW_LENGTH = 240;
const TOKEN_ESTIMATE_DIVISOR = 4;

type JsonRecord = Record<string, unknown>;

type MemoryEventType = 'extract' | 'confirm' | 'update';
type MemoryScope = 'global' | 'buyer' | 'seller' | 'arbiter' | 'conversation';
type MemoryType = 'preference' | 'constraint' | 'fact' | 'goal' | 'profile' | 'summary';

interface MemoryUpsertInput {
  scope: MemoryScope;
  memoryType: MemoryType;
  memoryKey: string;
  memoryValue: JsonRecord;
  confidence: number;
  salience: number;
  sourceThreadId: string;
  sourceMessageId: number | null;
  metadata?: JsonRecord;
  lastConfirmedAt?: string | null;
  expiresAt?: string | null;
}

export interface RelationalUserTurnResult {
  threadId: string;
  messageId: number | null;
  inputTokens: number;
  languageCode: string;
}

export interface RelationalAssistantTurnInput {
  walletAddress: string;
  conversationId: string;
  agentContext: AIAssistContext;
  requestMessage: string;
  response: AIStructuredResponse;
  languageCode: string;
  inputTokens: number;
  userMessageId: number | null;
  startedAtMs: number;
  activePage?: string;
  clarificationSelections?: string[];
}

interface EvaluationShape {
  intent: string | null;
  groundingScore: number;
  completionScore: number;
  safetyScore: number;
  responseQualityScore: number;
  fallbackUsed: boolean;
  clarificationUsed: boolean;
  issues: string[];
  metadata: JsonRecord;
}

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey);
}

function normalizeWalletAddress(walletAddress: string): string {
  return String(walletAddress || '').trim().toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function clampUnitScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function safeJson<T>(value: T): T {
  const serialized = JSON.stringify(value);
  if (typeof serialized === 'undefined') {
    return value;
  }
  return JSON.parse(serialized) as T;
}

function buildThreadTitle(message: string): string {
  const normalized = String(message || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return 'AI Conversation';
  return normalized.length > MAX_THREAD_TITLE_LENGTH
    ? `${normalized.slice(0, MAX_THREAD_TITLE_LENGTH - 3)}...`
    : normalized;
}

export function estimateAgentTokenCount(text: string): number {
  const normalized = String(text || '').trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / TOKEN_ESTIMATE_DIVISOR));
}

export function buildAgentThreadId(walletAddress: string, conversationId: string): string {
  return `ai_thread:${normalizeWalletAddress(walletAddress)}:${String(conversationId || '').trim()}`;
}

function memoryScopeFromContext(agentContext: AIAssistContext): MemoryScope {
  if (agentContext === 'seller') return 'seller';
  if (agentContext === 'buyer') return 'buyer';
  if (agentContext === 'arbiter') return 'arbiter';
  return 'global';
}

function parseNumericFragment(rawValue: string): number | null {
  const normalized = String(rawValue || '').replace(/,/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBudgetPreference(message: string): JsonRecord | null {
  const normalized = String(message || '').trim();
  if (!normalized) return null;

  const rangeMatch = normalized.match(/(?:\$|usd|usdt|usdc)?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:-|to|~|\u2013)\s*(?:\$|usd|usdt|usdc)?\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (rangeMatch) {
    const minValue = parseNumericFragment(rangeMatch[1]);
    const maxValue = parseNumericFragment(rangeMatch[2]);
    if (minValue !== null && maxValue !== null) {
      return {
        currency: 'USD',
        min: Math.min(minValue, maxValue),
        max: Math.max(minValue, maxValue),
        raw: rangeMatch[0],
      };
    }
  }

  const maxMatch = normalized.match(/\b(?:under|below|less than|max(?:imum)?|up to)\s*(?:\$|usd|usdt|usdc)?\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (maxMatch) {
    const maxValue = parseNumericFragment(maxMatch[1]);
    if (maxValue !== null) {
      return {
        currency: 'USD',
        max: maxValue,
        raw: maxMatch[0],
      };
    }
  }

  const minMatch = normalized.match(/\b(?:above|over|at least|min(?:imum)?)\s*(?:\$|usd|usdt|usdc)?\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (minMatch) {
    const minValue = parseNumericFragment(minMatch[1]);
    if (minValue !== null) {
      return {
        currency: 'USD',
        min: minValue,
        raw: minMatch[0],
      };
    }
  }

  return null;
}

function extractPreferredCategories(response: AIStructuredResponse): string[] {
  const categories = new Set<string>();

  for (const product of Array.isArray(response.products) ? response.products : []) {
    const category = String(product?.category || '').trim();
    if (category && category.toLowerCase() !== 'general') {
      categories.add(category);
    }
  }

  const marketCategory = String(response.marketAnalysis?.category || '').trim();
  if (marketCategory) {
    categories.add(marketCategory);
  }

  const draft = response['draft'];
  if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
    const category = String((draft as JsonRecord).category || '').trim();
    if (category) {
      categories.add(category);
    }
  }

  return Array.from(categories).slice(0, 8);
}

function mergeMemoryValue(memoryKey: string, existingValue: unknown, nextValue: JsonRecord): JsonRecord {
  const existing = (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue))
    ? (existingValue as JsonRecord)
    : {};

  if (memoryKey === 'preferred_categories') {
    const previous = Array.isArray(existing.values)
      ? existing.values.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const next = Array.isArray(nextValue.values)
      ? nextValue.values.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    return {
      values: Array.from(new Set([...previous, ...next])).slice(0, 10),
    };
  }

  return safeJson({
    ...existing,
    ...nextValue,
  });
}

function valuesEqual(left: unknown, right: unknown): boolean {
  const normalizedLeft = safeJson(left);
  const normalizedRight = safeJson(right);
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

async function ensureThread(
  supabase: ReturnType<typeof getSupabaseClient>,
  threadId: string,
  walletAddress: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from('agent_threads')
    .upsert({
      id: threadId,
      wallet_address: walletAddress,
      title: buildThreadTitle(message),
      model_id: DEFAULT_ASSIST_MODEL_ID,
      updated_at: nowIso(),
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`agent_threads upsert failed: ${error.message}`);
  }
}

async function syncThreadStats(
  supabase: ReturnType<typeof getSupabaseClient>,
  threadId: string,
): Promise<void> {
  const { error } = await supabase.rpc('agent_thread_sync_stats', { tid: threadId });
  if (error) {
    throw new Error(`agent_thread_sync_stats failed: ${error.message}`);
  }
}

async function insertAgentMessage(
  supabase: ReturnType<typeof getSupabaseClient>,
  input: {
    threadId: string;
    role: 'user' | 'assistant';
    content: string;
    modelId?: string | null;
    tokenCount?: number | null;
    latencyMs?: number | null;
    metadata?: JsonRecord;
  },
): Promise<number | null> {
  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      thread_id: input.threadId,
      role: input.role,
      content: input.content,
      model_id: input.modelId || null,
      token_count: input.tokenCount ?? null,
      latency_ms: input.latencyMs ?? null,
      metadata: safeJson(input.metadata || {}),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`agent_messages insert failed: ${error.message}`);
  }

  const insertedId = Number((data as { id?: number | string } | null)?.id);
  return Number.isFinite(insertedId) ? insertedId : null;
}

function buildEvaluation(
  response: AIStructuredResponse,
  metrics: {
    languageCode: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    activePage?: string;
    clarificationSelections?: string[];
    userMessageId: number | null;
  },
): EvaluationShape {
  const issues: string[] = [];
  const intent = typeof response.action === 'string' ? response.action : 'general';
  const productsCount = Array.isArray(response.products) ? response.products.length : 0;
  const ordersCount = Array.isArray(response.orders) ? response.orders.length : 0;
  const hasDraft = Boolean(response['draft']);
  const hasMarketAnalysis = Boolean(response.marketAnalysis);
  const fallbackUsed = intent === 'error_fallback';
  const clarificationUsed = intent === 'clarification' || Boolean(metrics.clarificationSelections?.length);

  let groundingScore = 0.65;
  let completionScore = 0.74;
  let safetyScore = 0.9;
  let responseQualityScore = 0.76;

  if (!String(response.text || '').trim()) {
    issues.push('empty_response');
    groundingScore = 0.2;
    completionScore = 0.15;
    responseQualityScore = 0.1;
  }

  if (fallbackUsed) {
    issues.push('fallback_response');
    groundingScore = 0.35;
    completionScore = 0.4;
    responseQualityScore = 0.35;
  }

  if (clarificationUsed) {
    groundingScore = Math.max(groundingScore, 0.88);
    completionScore = Math.max(completionScore, 0.8);
    responseQualityScore = Math.max(responseQualityScore, 0.8);
  }

  if (intent === 'show_products') {
    if (productsCount > 0) {
      groundingScore = Math.max(groundingScore, 0.82);
      completionScore = Math.max(completionScore, 0.9);
      responseQualityScore = Math.max(responseQualityScore, 0.87);
    } else {
      issues.push('empty_product_payload');
      completionScore = Math.min(completionScore, 0.45);
    }
  }

  if (intent === 'show_orders') {
    if (ordersCount > 0) {
      groundingScore = Math.max(groundingScore, 0.84);
      completionScore = Math.max(completionScore, 0.9);
      responseQualityScore = Math.max(responseQualityScore, 0.85);
    } else {
      issues.push('empty_order_payload');
      completionScore = Math.min(completionScore, 0.5);
    }
  }

  if (hasDraft) {
    groundingScore = Math.max(groundingScore, 0.8);
    completionScore = Math.max(completionScore, 0.88);
    responseQualityScore = Math.max(responseQualityScore, 0.85);
  }

  if (hasMarketAnalysis) {
    groundingScore = Math.max(groundingScore, 0.78);
    completionScore = Math.max(completionScore, 0.86);
    responseQualityScore = Math.max(responseQualityScore, 0.84);
  }

  if (String(response.text || '').trim().length < 24) {
    issues.push('short_response');
    completionScore -= 0.05;
    responseQualityScore -= 0.1;
  }

  if (metrics.latencyMs > 30000) {
    issues.push('slow_response');
    responseQualityScore -= 0.08;
  }

  return {
    intent,
    groundingScore: clampUnitScore(groundingScore),
    completionScore: clampUnitScore(completionScore),
    safetyScore: clampUnitScore(safetyScore),
    responseQualityScore: clampUnitScore(responseQualityScore),
    fallbackUsed,
    clarificationUsed,
    issues,
    metadata: safeJson({
      language_code: metrics.languageCode,
      latency_ms: metrics.latencyMs,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      active_page: metrics.activePage || null,
      products_count: productsCount,
      orders_count: ordersCount,
      has_market_analysis: hasMarketAnalysis,
      has_draft: hasDraft,
      user_message_id: metrics.userMessageId,
    }),
  };
}

async function upsertMemoryRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  walletAddress: string,
  input: MemoryUpsertInput,
): Promise<void> {
  const existingQuery = await supabase
    .from('agent_memory_records')
    .select('id,memory_value,confidence,salience,metadata')
    .eq('wallet_address', walletAddress)
    .eq('scope', input.scope)
    .eq('memory_type', input.memoryType)
    .eq('memory_key', input.memoryKey)
    .maybeSingle();

  if (existingQuery.error) {
    throw new Error(`agent_memory_records lookup failed: ${existingQuery.error.message}`);
  }

  const existing = existingQuery.data as {
    id?: string;
    memory_value?: unknown;
    confidence?: number;
    salience?: number;
    metadata?: unknown;
  } | null;

  const mergedValue = mergeMemoryValue(input.memoryKey, existing?.memory_value, input.memoryValue);
  const unchanged = valuesEqual(existing?.memory_value, mergedValue);
  const eventType: MemoryEventType = existing
    ? (unchanged ? 'confirm' : 'update')
    : 'extract';

  let memoryId = typeof existing?.id === 'string' ? existing.id : null;
  if (memoryId) {
    const { data, error } = await supabase
      .from('agent_memory_records')
      .update({
        memory_value: mergedValue,
        confidence: clampUnitScore(Math.max(Number(existing?.confidence || 0), input.confidence)),
        salience: Math.max(Number(existing?.salience || 0), input.salience),
        source_thread_id: input.sourceThreadId,
        source_message_id: input.sourceMessageId,
        last_confirmed_at: input.lastConfirmedAt || nowIso(),
        expires_at: input.expiresAt || null,
        metadata: safeJson({
          ...((existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata))
            ? existing.metadata as JsonRecord
            : {}),
          ...(input.metadata || {}),
        }),
      })
      .eq('id', memoryId)
      .select('id')
      .single();

    if (error) {
      throw new Error(`agent_memory_records update failed: ${error.message}`);
    }
    memoryId = String((data as { id?: string } | null)?.id || memoryId);
  } else {
    const { data, error } = await supabase
      .from('agent_memory_records')
      .insert({
        wallet_address: walletAddress,
        scope: input.scope,
        memory_type: input.memoryType,
        memory_key: input.memoryKey,
        memory_value: mergedValue,
        confidence: clampUnitScore(input.confidence),
        salience: input.salience,
        source_thread_id: input.sourceThreadId,
        source_message_id: input.sourceMessageId,
        last_confirmed_at: input.lastConfirmedAt || nowIso(),
        expires_at: input.expiresAt || null,
        metadata: safeJson(input.metadata || {}),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`agent_memory_records insert failed: ${error.message}`);
    }
    memoryId = String((data as { id?: string } | null)?.id || '');
  }

  if (!memoryId) return;

  const { error: eventError } = await supabase
    .from('agent_memory_events')
    .insert({
      memory_id: memoryId,
      wallet_address: walletAddress,
      event_type: eventType,
      actor_type: 'ai',
      source_thread_id: input.sourceThreadId,
      source_message_id: input.sourceMessageId,
      payload: safeJson({
        memory_key: input.memoryKey,
        next_value: mergedValue,
        event_type: eventType,
        confidence: clampUnitScore(input.confidence),
        salience: input.salience,
      }),
    });

  if (eventError) {
    throw new Error(`agent_memory_events insert failed: ${eventError.message}`);
  }
}

async function upsertMemoryRecords(
  supabase: ReturnType<typeof getSupabaseClient>,
  walletAddress: string,
  inputs: MemoryUpsertInput[],
): Promise<void> {
  for (const input of inputs) {
    await upsertMemoryRecord(supabase, walletAddress, input);
  }
}

export async function persistRelationalUserTurn(input: {
  walletAddress: string;
  conversationId: string;
  agentContext: AIAssistContext;
  message: string;
  languageCode: string;
  activePage?: string;
  originalMessage?: string;
  clarificationSelections?: string[];
}): Promise<RelationalUserTurnResult> {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const threadId = buildAgentThreadId(walletAddress, input.conversationId);
  const inputTokens = estimateAgentTokenCount(input.message);
  const supabase = getSupabaseClient();

  await ensureThread(supabase, threadId, walletAddress, input.message);

  const messageId = await insertAgentMessage(supabase, {
    threadId,
    role: 'user',
    content: input.message,
    tokenCount: inputTokens,
    metadata: {
      source: 'orina-ai-engine-v2',
      sender_type: 'customer',
      conversation_id: input.conversationId,
      agent_context: input.agentContext,
      active_page: input.activePage || null,
      original_message: input.originalMessage || null,
      clarification_selections: input.clarificationSelections || [],
      persistence_version: 'relational-000084',
    },
  });

  await syncThreadStats(supabase, threadId);

  const memoryInputs: MemoryUpsertInput[] = [
    {
      scope: 'global',
      memoryType: 'profile',
      memoryKey: 'preferred_language',
      memoryValue: { code: input.languageCode },
      confidence: 0.92,
      salience: 55,
      sourceThreadId: threadId,
      sourceMessageId: messageId,
      metadata: { source: 'message_auto_detect' },
      lastConfirmedAt: nowIso(),
    },
  ];

  const budgetPreference = extractBudgetPreference(input.message);
  if (budgetPreference) {
    memoryInputs.push({
      scope: memoryScopeFromContext(input.agentContext),
      memoryType: 'constraint',
      memoryKey: 'budget_preference',
      memoryValue: budgetPreference,
      confidence: 0.74,
      salience: 78,
      sourceThreadId: threadId,
      sourceMessageId: messageId,
      metadata: { source: 'regex_budget_extractor' },
      lastConfirmedAt: nowIso(),
    });
  }

  await upsertMemoryRecords(supabase, walletAddress, memoryInputs);

  return {
    threadId,
    messageId,
    inputTokens,
    languageCode: input.languageCode,
  };
}

export async function persistRelationalAssistantTurn(input: RelationalAssistantTurnInput): Promise<void> {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const threadId = buildAgentThreadId(walletAddress, input.conversationId);
  const supabase = getSupabaseClient();
  const completedAtMs = Date.now();
  const latencyMs = Math.max(0, completedAtMs - input.startedAtMs);
  const outputTokens = estimateAgentTokenCount(input.response.text || '');

  await ensureThread(supabase, threadId, walletAddress, input.requestMessage);

  const assistantMessageId = await insertAgentMessage(supabase, {
    threadId,
    role: 'assistant',
    content: input.response.text || '',
    modelId: DEFAULT_ASSIST_MODEL_ID,
    tokenCount: outputTokens,
    latencyMs,
    metadata: {
      source: 'orina-ai-engine-v2',
      sender_type: 'ai_agent',
      conversation_id: input.conversationId,
      agent_context: input.agentContext,
      action: input.response.action || 'general',
      confidence: input.response.disputeSuggestion?.confidence || 0.85,
      persistence_version: 'relational-000084',
      active_page: input.activePage || null,
      clarification_selections: input.clarificationSelections || [],
      products_count: Array.isArray(input.response.products) ? input.response.products.length : 0,
      orders_count: Array.isArray(input.response.orders) ? input.response.orders.length : 0,
      has_market_analysis: Boolean(input.response.marketAnalysis),
      has_dispute_suggestion: Boolean(input.response.disputeSuggestion),
      preview: typeof input.response.preview === 'string' ? input.response.preview : null,
    },
  });

  await syncThreadStats(supabase, threadId);

  const { error: usageError } = await supabase
    .from('agent_usage')
    .insert({
      wallet_address: walletAddress,
      model_id: DEFAULT_ASSIST_MODEL_ID,
      operation: DEFAULT_ASSIST_OPERATION,
      input_tokens: input.inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
      cost_usd: null,
    });

  if (usageError) {
    throw new Error(`agent_usage insert failed: ${usageError.message}`);
  }

  if (assistantMessageId === null) {
    return;
  }

  const evaluation = buildEvaluation(input.response, {
    languageCode: input.languageCode,
    latencyMs,
    inputTokens: input.inputTokens,
    outputTokens,
    activePage: input.activePage,
    clarificationSelections: input.clarificationSelections,
    userMessageId: input.userMessageId,
  });

  const { error: evaluationError } = await supabase
    .from('agent_turn_evaluations')
    .upsert({
      thread_id: threadId,
      assistant_message_id: assistantMessageId,
      wallet_address: walletAddress,
      agent_context: input.agentContext,
      evaluator_version: 'v1',
      intent: evaluation.intent,
      grounding_score: evaluation.groundingScore,
      completion_score: evaluation.completionScore,
      safety_score: evaluation.safetyScore,
      response_quality_score: evaluation.responseQualityScore,
      fallback_used: evaluation.fallbackUsed,
      clarification_used: evaluation.clarificationUsed,
      issues: evaluation.issues,
      metadata: evaluation.metadata,
    }, { onConflict: 'assistant_message_id' });

  if (evaluationError) {
    throw new Error(`agent_turn_evaluations upsert failed: ${evaluationError.message}`);
  }

  const categoryValues = extractPreferredCategories(input.response);
  const memoryInputs: MemoryUpsertInput[] = [
    {
      scope: 'global',
      memoryType: 'profile',
      memoryKey: 'preferred_language',
      memoryValue: { code: input.languageCode },
      confidence: 0.93,
      salience: 55,
      sourceThreadId: threadId,
      sourceMessageId: assistantMessageId,
      metadata: { source: 'assistant_turn_confirm' },
      lastConfirmedAt: nowIso(),
    },
    {
      scope: 'conversation',
      memoryType: 'summary',
      memoryKey: input.conversationId,
      memoryValue: {
        last_user_message_preview: String(input.requestMessage || '').slice(0, MAX_SUMMARY_PREVIEW_LENGTH),
        last_ai_response_preview: String(input.response.text || '').slice(0, MAX_SUMMARY_PREVIEW_LENGTH),
        last_action: input.response.action || 'general',
      },
      confidence: 0.62,
      salience: 42,
      sourceThreadId: threadId,
      sourceMessageId: assistantMessageId,
      metadata: { source: 'conversation_turn_summary' },
      lastConfirmedAt: nowIso(),
    },
  ];

  if (categoryValues.length > 0) {
    memoryInputs.push({
      scope: memoryScopeFromContext(input.agentContext),
      memoryType: 'preference',
      memoryKey: 'preferred_categories',
      memoryValue: { values: categoryValues },
      confidence: 0.68,
      salience: 72,
      sourceThreadId: threadId,
      sourceMessageId: assistantMessageId,
      metadata: { source: 'assistant_response_categories' },
      lastConfirmedAt: nowIso(),
    });
  }

  await upsertMemoryRecords(supabase, walletAddress, memoryInputs);
}
