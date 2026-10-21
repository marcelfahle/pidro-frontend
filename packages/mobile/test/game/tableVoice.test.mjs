import { describe, expect, it } from 'bun:test';
import { catalogs } from '../../../shared/src/i18n/catalogs.ts';
import { botPersonas } from '../../src/components/ui/botPersonas.ts';
import { handHeadlines, tableLine } from '../../src/features/game/tableVoice.ts';

describe('the table’s voice', () => {
  const sets = [
    ...Object.values(handHeadlines),
    ...Object.values(botPersonas).map((bot) => bot.thinking),
  ];

  it('gives the same room and hand the same line, with a spread across hands and rooms', () => {
    for (const lines of sets) {
      const picks = Array.from({ length: 1000 }, (_, hand) => tableLine('7KQ4M2XB', hand, lines));
      expect(picks).toEqual(
        Array.from({ length: 1000 }, (_, hand) => tableLine('7KQ4M2XB', hand, lines))
      );
      expect(new Set(picks)).toEqual(new Set(lines));
      expect(picks).not.toEqual(
        Array.from({ length: 1000 }, (_, hand) => tableLine('OTHER', hand, lines))
      );
    }
    const picks = Array.from({ length: 1000 }, (_, hand) =>
      tableLine('7KQ4M2XB', hand, handHeadlines['we-made'], 'result')
    );
    const familiar = picks.filter((key) => key === 'game.we_made_it').length;
    expect(familiar).toBeGreaterThan(500);
    expect(familiar).toBeLessThan(700);
  });

  it('has every persona and line in both languages, retaining the missed amount', () => {
    for (const locale of ['en', 'sv']) {
      for (const lines of sets)
        for (const key of lines) {
          expect(typeof catalogs[locale][key]).toBe('string');
          expect(catalogs[locale][key].length).toBeGreaterThan(0);
        }
      for (const bot of Object.values(botPersonas)) {
        expect(catalogs[locale][bot.play].length).toBeGreaterThan(0);
        expect(catalogs[locale][bot.saying].length).toBeGreaterThan(0);
        for (const key of bot.thinking)
          expect(catalogs[locale][key].length).toBeLessThanOrEqual(17);
      }
      for (const outcome of ['we-missed', 'they-missed', 'missed']) {
        for (const key of handHeadlines[outcome]) expect(catalogs[locale][key]).toContain('%{n}');
      }
    }
  });
});
