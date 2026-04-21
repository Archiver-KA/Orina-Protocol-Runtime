const AI_INTERNAL_REASONING_MARKERS = [
  'okay, the user',
  'the user is asking',
  'user is asking',
  'i need to summarize',
  'we need to summarize',
  'i should avoid',
  'we should output',
  'as per the rules',
  'per the rules',
  'the instructions',
  'the key points',
  'key points from the results',
  'provided a list',
  'they didn\'t specify',
  'double-check',
  'self-check',
  'time to condense',
  'the overview should',
  'avoid listing every item',
  'keep it natural',
  'feels warm',
  'that\'s two sentences',
  'that\'s one sentence',
  'i\'ll stick',
  'hmm,',
] as const;

function normalizeAIWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function looksLikeAIInternalReasoning(value: string): boolean {
  const lowered = normalizeAIWhitespace(value).toLowerCase();
  if (!lowered) return false;

  return (
    AI_INTERNAL_REASONING_MARKERS.some((marker) => lowered.includes(marker)) ||
    /^okay[, ]+\b/.test(lowered) ||
    /\bi need to\b/.test(lowered) ||
    /\bi should\b/.test(lowered) ||
    /\bwe need to\b/.test(lowered)
  );
}

function cleanCandidate(value: string): string {
  return normalizeAIWhitespace(
    value
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/^\s*(?:final answer|answer|summary|response)\s*:\s*/i, ''),
  );
}

function isUsableCandidate(value: string): boolean {
  const cleaned = cleanCandidate(value);
  return cleaned.split(/\s+/).length >= 5 && !looksLikeAIInternalReasoning(cleaned);
}

export function sanitizeAIVisibleText(value: string, fallback = ''): string {
  const normalized = normalizeAIWhitespace(
    String(value || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
      .replace(/```[\s\S]*?```/g, ' '),
  );

  if (!normalized) return fallback;
  if (!looksLikeAIInternalReasoning(normalized)) return normalized;

  const quotedCandidates = Array.from(normalized.matchAll(/["“]([^"”\r\n]{24,360})["”]/g))
    .map((match) => cleanCandidate(match[1]))
    .filter(isUsableCandidate);

  if (quotedCandidates.length > 0) {
    return quotedCandidates[quotedCandidates.length - 1];
  }

  const labeledCandidate = normalized.match(
    /(?:time to condense|final answer|answer|summary|response|let(?:'|’)?s craft)\s*:?\s*["“]?(.+)$/i,
  )?.[1];

  if (labeledCandidate) {
    const cleaned = cleanCandidate(
      labeledCandidate.replace(/\s+(?:That's|That is|Self-check|Double-check)\b[\s\S]*$/i, ''),
    );
    if (isUsableCandidate(cleaned)) return cleaned;
  }

  const sentenceCandidates = normalized
    .split(/(?<=[.!?])\s+/)
    .map(cleanCandidate)
    .filter(isUsableCandidate);

  if (sentenceCandidates.length > 0) {
    return sentenceCandidates.slice(-2).join(' ');
  }

  return fallback;
}
