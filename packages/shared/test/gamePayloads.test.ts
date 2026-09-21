import { expect, test } from 'bun:test';
import { extractGamePresentation } from '../src/channels/gamePayloads';

const publicRob = {
  dealer: 'south',
  automatic: true,
  started_at_ms: 10,
  ends_at_ms: 20,
};

test('accepts public and private dealer rob presentations', () => {
  expect(extractGamePresentation({ presentation: { dealer_rob: publicRob } })).toEqual({
    dealer_rob: publicRob,
  });

  const privateRob = {
    ...publicRob,
    pool: [{ rank: 14, suit: 'diamonds' }],
    kept: [{ rank: 14, suit: 'diamonds' }],
    discarded: [],
  };
  expect(extractGamePresentation({ presentation: { dealer_rob: privateRob } })).toEqual({
    dealer_rob: privateRob,
  });
});

test('rejects malformed dealer rob card arrays and metadata', () => {
  expect(
    extractGamePresentation({ presentation: { dealer_rob: { ...publicRob, pool: {} } } }),
  ).toBeNull();
  expect(
    extractGamePresentation({
      presentation: {
        dealer_rob: { ...publicRob, pool: [{ rank: 15, suit: 'diamonds' }] },
      },
    }),
  ).toBeNull();
  expect(
    extractGamePresentation({
      presentation: { dealer_rob: { ...publicRob, automatic: 'yes' } },
    }),
  ).toBeNull();
});
