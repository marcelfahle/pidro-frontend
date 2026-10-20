import { expect, test } from 'bun:test';
import { PLACES, WORDS, updateName } from '../../src/features/updateName.mjs';

const sha = '5cca7d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708';

test('a commit always gets the same place-and-word name', () => {
  const name = updateName(sha);
  expect(name).toMatch(/^[^\s-]+-[^\s-]+$/);
  const [place, word] = name.split('-');
  expect(PLACES).toContain(place);
  expect(WORDS).toContain(word);
  expect(updateName(sha)).toBe(name);
  // Case and stray whitespace from a shell do not change the commit, so not the name.
  expect(updateName(` ${sha.toUpperCase()}\n`)).toBe(name);
});

test('the name is spread over both lists, not stuck on a few', () => {
  const places = new Set();
  const words = new Set();
  for (let i = 0; i < 4000; i++) {
    const [place, word] = updateName(i.toString(16).padStart(40, '0')).split('-');
    places.add(place);
    words.add(word);
  }
  expect(places.size).toBe(PLACES.length);
  expect(words.size).toBe(WORDS.length);
  // Neighbouring commits read differently.
  expect(updateName('a'.repeat(39) + '0')).not.toBe(updateName('a'.repeat(39) + '1'));
});

test('anything that is not a sha has no name', () => {
  for (const value of ['', '   ', 'abc12', 'not-a-sha-at-all', 'g'.repeat(40), 'a'.repeat(41)])
    expect(updateName(value)).toBeNull();
  expect(updateName(undefined)).toBeNull();
  expect(updateName(null)).toBeNull();
});

test('every entry is one word and appears once across both lists', () => {
  const all = [...PLACES, ...WORDS];
  expect(new Set(all).size).toBe(all.length);
  for (const entry of all) expect(entry).toMatch(/^\p{Lu}\p{Ll}+$/u);
  expect(PLACES.length).toBeGreaterThanOrEqual(40);
  expect(WORDS.length).toBeGreaterThanOrEqual(40);
});
