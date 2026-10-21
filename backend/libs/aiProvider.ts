import OpenAI from "openai";
import type { ZodType } from "zod";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

export const parseAiResponse = <T>(schema: ZodType<T>, content: string): T => {
  try {
    return schema.parse(JSON.parse(content));
  } catch (error: unknown) {
    throw new AppError(AI_ERROR.RESPONSE_INVALID, { cause: error });
  }
};

export const callAiProvider = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new AppError(AI_ERROR.PROVIDER_TIMEOUT, { cause: error });
    }
    throw new AppError(AI_ERROR.PROVIDER_ERROR, { cause: error });
  }
};
