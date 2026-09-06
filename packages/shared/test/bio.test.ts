import { expect, it } from 'bun:test';
import { bioError, bioLength, normalizeBio, createProfileApi } from '../src/api/profile';
import type { ApiClient } from '../src/api/client';

it('normalizes only the shared whitespace and newline contract', () => {
  expect(normalizeBio('\ufeff \t Hello\r\n世界\r🙂 \u3000')).toBe('Hello\n世界\n🙂');
  expect(normalizeBio('\u0085text\u200b')).toBe('\u0085text\u200b');
  expect(normalizeBio('e\u0301')).toBe('e\u0301');
  expect(normalizeBio(' \r\n\ufeff')).toBe('');
});

it('counts scalars consistently, including astral, combining, and ZWJ emoji', () => {
  for (const unit of ['a', '界', '🙂']) {
    expect(bioError(unit.repeat(280))).toBeNull();
    expect(bioError(unit.repeat(281))).not.toBeNull();
  }
  expect(bioLength('👩🏽‍💻')).toBe(4);
  expect(bioLength('e\u0301')).toBe(2);
  expect(bioError('\ud800')).not.toBeNull();
  expect(bioError('\udc00')).not.toBeNull();
  expect(bioError('before\0after')).not.toBeNull();
});

it('clears normalized empty input and validates before the request', async () => {
  const calls: unknown[] = [];
  const api = {
    patch: async (url: string, body: unknown) => {
      calls.push([url, body]);
      return { data: { data: { bio: null } } };
    },
  } as unknown as ApiClient;
  await createProfileApi(api).updateBio(' \r\n ');
  expect(calls).toEqual([['/api/v1/profile', { bio: null }]]);
  await expect(createProfileApi(api).updateBio('界'.repeat(281))).rejects.toThrow('280');
  expect(calls).toHaveLength(1);
});
