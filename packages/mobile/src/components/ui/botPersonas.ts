import type { BotPersona, TranslationKey } from '@pidro/shared';

// The copy lives together in shared/src/i18n/sections/bots.ts (English and Swedish).
export const botPersonas = {
  marcel: {
    name: 'Marcel',
    play: 'bots.marcel.play',
    saying: 'bots.marcel.saying',
    thinking: [
      'bots.marcel.thinking_1',
      'bots.marcel.thinking_2',
      'bots.marcel.thinking_3',
      'bots.marcel.thinking_4',
    ],
  },
  antti: {
    name: 'Antti',
    play: 'bots.antti.play',
    saying: 'bots.antti.saying',
    thinking: [
      'bots.antti.thinking_1',
      'bots.antti.thinking_2',
      'bots.antti.thinking_3',
      'bots.antti.thinking_4',
    ],
  },
  jocke: {
    name: 'Jocke',
    play: 'bots.jocke.play',
    saying: 'bots.jocke.saying',
    thinking: [
      'bots.jocke.thinking_1',
      'bots.jocke.thinking_2',
      'bots.jocke.thinking_3',
      'bots.jocke.thinking_4',
    ],
  },
} as const satisfies Record<
  BotPersona,
  {
    name: string;
    play: TranslationKey;
    saying: TranslationKey;
    thinking: readonly TranslationKey[];
  }
>;
