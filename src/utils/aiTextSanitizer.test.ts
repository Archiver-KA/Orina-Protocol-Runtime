import { describe, expect, it } from 'vitest';
import { looksLikeAIInternalReasoning, sanitizeAIVisibleText } from '@/utils/aiTextSanitizer';

describe('aiTextSanitizer', () => {
  it('extracts the user-facing answer from leaked reasoning text', () => {
    const leaked = `Okay, the user is asking about coffee and provided a list of 12 products from a marketplace search. I need to summarize this in 1-2 short sentences in English, as per the rules. Time to condense:"You've got a varied coffee selection here, from mushroom-infused instant coffee and Italian blends to bulk Ethiopian beans and coffee-based wellness supplements." That's two sentences?`;

    expect(looksLikeAIInternalReasoning(leaked)).toBe(true);
    expect(sanitizeAIVisibleText(leaked)).toBe(
      "You've got a varied coffee selection here, from mushroom-infused instant coffee and Italian blends to bulk Ethiopian beans and coffee-based wellness supplements.",
    );
  });

  it('keeps normal marketplace copy untouched', () => {
    const copy = 'Found several coffee listings, including green beans, espresso blends, and packaged coffee products.';

    expect(sanitizeAIVisibleText(copy)).toBe(copy);
  });
});
