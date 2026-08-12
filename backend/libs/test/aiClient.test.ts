import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_ERROR } from '../../error/definitions/aiErrors.js';

describe('AI client configuration', () => {
  const originalApiKey = process.env.AI_API_KEY;
  const originalBaseUrl = process.env.AI_BASE_URL;

  afterEach(() => {
    process.env.AI_API_KEY = originalApiKey;
    process.env.AI_BASE_URL = originalBaseUrl;
    vi.resetModules();
  });

  it('uses AI_CONFIG_MISSING when required provider configuration is absent', async () => {
    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    vi.resetModules();
    const { getAiClient } = await import('../aiClient.js');

    expect(() => getAiClient()).toThrow(expect.objectContaining({
      code: AI_ERROR.CONFIG_MISSING.code,
      statusCode: 503,
      message: AI_ERROR.CONFIG_MISSING.message,
    }));
  });
});
