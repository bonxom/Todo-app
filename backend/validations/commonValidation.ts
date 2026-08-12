import { z } from 'zod';
import { COMMON_ERROR } from '../error/definitions/commonErrors.js';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = (fieldName: string) =>
  z.string().refine((value) => OBJECT_ID_PATTERN.test(value), {
    message: `${fieldName} must be a valid ObjectId`,
    params: { errorCode: COMMON_ERROR.INVALID_OBJECT_ID.code, fieldName },
  });

export const idParamSchema = z.object({ id: objectIdSchema('id') });
