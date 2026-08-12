import OpenAI from 'openai';
import { getAiApiKey, getAiBaseUrl } from '../config/env.js';
import { AppError } from '../error/AppError.js';
import { AI_ERROR } from '../error/definitions/aiErrors.js';

let client: OpenAI | undefined;

export const getAiClient = (): OpenAI => {
  if (!client) {
    const apiKey = getAiApiKey();
    const baseURL = getAiBaseUrl();

    if (!apiKey) {
      throw new AppError(AI_ERROR.CONFIG_MISSING);
    }

    if (!baseURL) {
      throw new AppError(AI_ERROR.CONFIG_MISSING);
    }

    client = new OpenAI({ apiKey, baseURL, timeout: 60000 });
  }

  return client;
};
