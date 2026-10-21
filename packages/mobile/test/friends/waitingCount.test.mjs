import { expect, test } from 'bun:test';
import { waitingCount } from '../../src/features/friends/waitingCount.ts';

test('waiting is incoming requests plus live seats, not sent requests or friends', () => {
  const lists = {
    requests_waiting: 2,
    added_you: [{}, {}, {}, {}],
    friends: [{}],
    requested: [{}],
  };
  expect(waitingCount(lists, [{}, {}, {}])).toBe(5);
  expect(waitingCount({ ...lists, requests_waiting: 1 }, [{}, {}, {}])).toBe(4);
  expect(waitingCount({ ...lists, requests_waiting: 1 }, [{}])).toBe(2);
  expect(waitingCount({ added_you: [], requests_waiting: 0 }, [])).toBe(0);
});

test('older lists fall back to incoming requests; guests can have only seats', () => {
  expect(waitingCount({ added_you: [{}, {}] }, [{}])).toBe(3);
  expect(waitingCount({ added_you: [], requests_waiting: 0 }, [{}, {}])).toBe(2);
});

test('the server total wins when a refused join or stale cache disagrees', () => {
  expect(waitingCount({ added_you: [], requests_waiting: 0, waiting_for_you: 1 }, [])).toBe(1);
  expect(waitingCount({ added_you: [{}], requests_waiting: 1, waiting_for_you: 0 }, [{}])).toBe(0);
  expect(waitingCount({ added_you: [{}], requests_waiting: 1, waiting_for_you: 3 }, [{}, {}])).toBe(3);
});
