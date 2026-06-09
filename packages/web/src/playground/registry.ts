import { BiddingScene } from './scenes/BiddingScene';
import { DealerSelectionScene } from './scenes/DealerSelectionScene';
import { DealingScene } from './scenes/DealingScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ScoringScene } from './scenes/ScoringScene';
import { TrickPlayScene } from './scenes/TrickPlayScene';
import { TrickWinScene } from './scenes/TrickWinScene';
import { TrumpRevealScene } from './scenes/TrumpRevealScene';
import type { PlaygroundScene } from './types';

/**
 * Every animation/state the lab can show. Add a scene here and (for `ready`
 * ones) point it at a render-prop component that hands back stage + inspector.
 */
export const SCENES: PlaygroundScene[] = [
  {
    id: 'dealer-selection',
    label: 'Dealer Selection',
    group: 'Round start',
    blurb: 'Four cards cut to the table to decide who deals.',
    status: 'ready',
    Scene: DealerSelectionScene,
  },
  {
    id: 'dealing',
    label: 'Dealing',
    group: 'Round start',
    blurb: 'Cards flung from the deck out to each hand.',
    status: 'ready',
    Scene: DealingScene,
  },
  {
    id: 'bidding',
    label: 'Bidding',
    group: 'Bidding',
    blurb: 'The bidding panel — live bid buttons or the waiting state.',
    status: 'ready',
    Scene: BiddingScene,
  },
  {
    id: 'trump-reveal',
    label: 'Trump Reveal',
    group: 'Bidding',
    blurb: 'The winning bidder names trump, then it reveals.',
    status: 'ready',
    Scene: TrumpRevealScene,
  },
  {
    id: 'trick-play',
    label: 'Trick Play',
    group: 'Trick play',
    blurb: 'Cards played into the centre one by one.',
    status: 'ready',
    Scene: TrickPlayScene,
  },
  {
    id: 'trick-win',
    label: 'Trick Win',
    group: 'Trick play',
    blurb: 'The winning play flashes and sweeps the trick.',
    status: 'ready',
    Scene: TrickWinScene,
  },
  {
    id: 'scoring',
    label: 'Scoring',
    group: 'Round end',
    blurb: 'Points tally and the score total bumps.',
    status: 'ready',
    Scene: ScoringScene,
  },
  {
    id: 'game-over',
    label: 'Game Over',
    group: 'Round end',
    blurb: 'Final overlay, scores and progression summary.',
    status: 'ready',
    Scene: GameOverScene,
  },
];

export const DEFAULT_SCENE_ID = 'dealer-selection';
