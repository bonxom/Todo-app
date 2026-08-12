import { describe, expect, it } from 'vitest';
import { AppError } from '../AppError.js';
import { ERROR_DEFINITION_GROUPS } from '../errorCodes.js';
import { COMMON_ERROR } from '../definitions/commonErrors.js';

describe('AppError', () => {
  it('copies the stable fields from an error definition', () => {
    const error = new AppError(COMMON_ERROR.INVALID_PAYLOAD);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('COMMON_0005');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid request payload');
  });

  it('formats placeholders without changing unresolved placeholders', () => {
    const error = new AppError(COMMON_ERROR.ROUTE_NOT_FOUND, {
      params: { method: 'GET', path: '/missing' },
    });

    expect(error.message).toBe('Route GET /missing not found');
  });

  it('supports an explicit message override', () => {
    const error = new AppError(COMMON_ERROR.INVALID_PAYLOAD, {
      message: 'Custom safe message',
    });

    expect(error.message).toBe('Custom safe message');
  });

  it('preserves cause and details without making them enumerable response fields', () => {
    const cause = new Error('root cause');
    const details = [{ fieldName: 'email', message: 'Invalid email' }];
    const error = new AppError(COMMON_ERROR.INVALID_PAYLOAD, { cause, details });

    expect(error.cause).toBe(cause);
    expect(error.details).toBe(details);
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      code: 'COMMON_0005',
      statusCode: 400,
      details,
      name: 'AppError',
    });
  });
});

describe('error definitions', () => {
  it('uses a globally unique code for every definition', () => {
    const codes = Object.values(ERROR_DEFINITION_GROUPS).flatMap((group) =>
      Object.values(group).map((definition) => definition.code)
    );

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('uses the domain namespace declared by each group', () => {
    for (const [groupName, group] of Object.entries(ERROR_DEFINITION_GROUPS)) {
      const namespace = groupName.replace('_ERROR', '');
      for (const definition of Object.values(group)) {
        expect(definition.code.startsWith(`${namespace}_`)).toBe(true);
      }
    }
  });
});
