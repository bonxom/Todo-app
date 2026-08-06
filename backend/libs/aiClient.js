import OpenAI from 'openai';
import { getAiApiKey, getAiBaseUrl } from '../config/env.js';

let client;

export const getAiClient = () => {
  if (!client) {
    const apiKey = getAiApiKey();
    const baseURL = getAiBaseUrl();

    if (!apiKey) {
      throw new Error('Missing required environment variable: AI_API_KEY');
    }

    if (!baseURL) {
      throw new Error('Missing required environment variable: AI_BASE_URL');
    }

    client = new OpenAI({ apiKey, baseURL, timeout: 60000 });
  }

  return client;
};
