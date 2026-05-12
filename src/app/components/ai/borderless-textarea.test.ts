import { describe, expect, it } from 'vitest';
import { getBorderlessTextareaOverrideCss } from './borderless-textarea';

describe('getBorderlessTextareaOverrideCss', () => {
  it('does not depend on interpolated element ids', () => {
    const css = getBorderlessTextareaOverrideCss();

    expect(css).toContain('textarea.ai-borderless-textarea-core');
    expect(css).not.toContain('textarea#');
  });

  it('does not contain markup breakouts', () => {
    const css = getBorderlessTextareaOverrideCss();

    expect(css.toLowerCase()).not.toContain('</style');
    expect(css.toLowerCase()).not.toContain('<script');
  });
});
