import { afterEach, expect, it } from 'bun:test';
import { setLocale } from '@pidro/shared';
import { apiErrorInfo, localizedError } from '../../src/utils/apiErrors';

afterEach(() => setLocale('en'));
it('keeps stable control-flow codes and legacy seat requirements independent of locale', () => {
  const action = { type: 'claim', method: 'POST', endpoint: '/claim' };
  for (const locale of ['en', 'sv']) {
    setLocale(locale);
    const error = {
      response: {
        data: {
          error_code: 'classic_name_reserved',
          errors: [{ code: 'CLASSIC_NAME_RESERVED', detail: 'legacy detail', action }],
        },
      },
    };
    expect(apiErrorInfo(error)).toEqual({
      code: 'CLASSIC_NAME_RESERVED',
      detail: 'legacy detail',
      action,
      requirement: undefined,
    });
    expect(localizedError(error)).not.toBe('CLASSIC_NAME_RESERVED');
    const requirement = { error: 'SEAT_REQUIRES_GAMES', min_games: 10, games_played: 2 };
    expect(apiErrorInfo({ response: { data: requirement } }).requirement).toEqual(requirement);
    expect(apiErrorInfo({ code: 'ROOM_FULL' }).code).toBe('ROOM_FULL');
    expect(apiErrorInfo({ error_code: 'room_full' }).code).toBe('room_full');
    expect(
      apiErrorInfo({ response: { data: { errors: { detail: 'old shape' } } } }).code
    ).toBeUndefined();
  }
});
