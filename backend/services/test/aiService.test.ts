import OpenAI from 'openai';
import { afterEach, describe, expect, it, vi } from 'vitest';

const completionCreate = vi.hoisted(() => vi.fn());

vi.mock('../../libs/aiClient.js', () => ({
  getAiClient: () => ({
    chat: { completions: { create: completionCreate } },
  }),
}));

vi.mock('../../config/env.js', () => ({
  getAiModel: () => 'test-model',
}));

import { AI_ERROR } from '../../error/definitions/aiErrors.js';
import { categoryRepository } from '../../repositories/categoryRepository.js';
import { aiService } from '../aiService.js';

describe('AI service error mapping', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    completionCreate.mockReset();
  });

  it('maps provider timeouts and preserves the cause', async () => {
    const cause = new OpenAI.APIConnectionTimeoutError();
    completionCreate.mockRejectedValue(cause);

    await expect(aiService.chatResponse('hello')).rejects.toMatchObject({
      code: AI_ERROR.PROVIDER_TIMEOUT.code,
      statusCode: 504,
      cause,
    });
  });

  it('maps other provider failures without exposing them as the client message', async () => {
    const cause = new Error('private provider response');
    completionCreate.mockRejectedValue(cause);

    await expect(aiService.chatResponse('hello')).rejects.toMatchObject({
      code: AI_ERROR.PROVIDER_ERROR.code,
      message: AI_ERROR.PROVIDER_ERROR.message,
      cause,
    });
  });

  it('maps an empty provider response', async () => {
    completionCreate.mockResolvedValue({ choices: [] });

    await expect(aiService.chatResponse('hello')).rejects.toMatchObject({
      code: AI_ERROR.EMPTY_RESPONSE.code,
      statusCode: 502,
    });
  });

  it('maps malformed generated JSON without exposing the content', async () => {
    vi.spyOn(categoryRepository, 'findByUser').mockResolvedValue([]);
    completionCreate.mockResolvedValue({
      choices: [{ message: { content: 'private invalid generated content' } }],
    });

    await expect(
      aiService.generateTasks('make tasks', '507f1f77bcf86cd799439011')
    ).rejects.toMatchObject({
      code: AI_ERROR.RESPONSE_INVALID.code,
      message: AI_ERROR.RESPONSE_INVALID.message,
      statusCode: 502,
    });
  });
});
