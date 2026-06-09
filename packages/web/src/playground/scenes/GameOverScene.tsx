import type { Position } from '@pidro/shared';
import { useState } from 'react';
import { GameOverOverlay } from '../../components/game/GameOverOverlay';
import type { ProgressionSummary } from '../../components/profile/postgame';
import { InspectorSection, Segmented } from '../chrome';
import { makeServerState, makeViewModel } from '../mockGame';
import type { SceneContext, SceneSlots } from '../types';

const VIEWER: Position = 'south';

type Result = 'win' | 'lose' | 'tie';

// Viewer sits south (north_south team), so "us" = north_south.
const RESULT_SCORES: Record<Result, { north_south: number; east_west: number }> = {
  win: { north_south: 62, east_west: 47 },
  lose: { north_south: 44, east_west: 62 },
  tie: { north_south: 55, east_west: 55 },
};

const MOCK_PROGRESSION: ProgressionSummary = {
  rated: true,
  xp_earned: 180,
  veteran_xp: 1240,
  veteran_level_before: 22,
  veteran_level: 23,
  leveled_up: true,
  veteran_title_before: 'Regular',
  veteran_title: 'Fixture',
  title_changed: true,
  veteran_progress: { into: 1200, span: 3200, max: false },
  achievements_unlocked: [{ key: 'win_streak', name: 'Win Streak', tier: 1 }],
  rating: {
    tier_before: 'silver',
    tier_after: 'gold',
    provisional_before: false,
    provisional_after: false,
    direction: 'up',
  },
};

export function GameOverScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [result, setResult] = useState<Result>('win');
  const [showProgression, setShowProgression] = useState(true);

  const mountKey = `${ctx.playKey}:${result}:${showProgression}`;

  const scores = RESULT_SCORES[result];
  const viewModel = makeViewModel({ viewer: VIEWER, phase: 'game_over' });
  const serverState = makeServerState({ phase: 'game_over', scores });

  const stage = (
    <div
      key={mountKey}
      className="pidro-window relative w-full max-w-[820px] overflow-hidden"
      style={{ height: showProgression ? 740 : 560 }}
    >
      <GameOverOverlay
        viewModel={viewModel}
        serverState={serverState}
        progressionSummary={showProgression ? MOCK_PROGRESSION : null}
        onBackToLobby={() => {}}
        onPlayAgain={() => {}}
      />
    </div>
  );

  const inspector = (
    <>
      <InspectorSection title="Result">
        <Segmented
          options={[
            { label: 'Win', value: 'win' },
            { label: 'Lose', value: 'lose' },
            { label: 'Tie', value: 'tie' },
          ]}
          value={result}
          onChange={setResult}
          columns={3}
        />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          Swaps the final score so the overlay shows the win / lose / tie state.
        </p>
      </InspectorSection>

      <InspectorSection title="Progression strip">
        <Segmented
          options={[
            { label: 'Shown', value: 'on' },
            { label: 'Hidden', value: 'off' },
          ]}
          value={showProgression ? 'on' : 'off'}
          onChange={(v) => setShowProgression(v === 'on')}
          columns={2}
        />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          The post-game XP / rating strip (ranked games only). Uses mock progression data.
        </p>
      </InspectorSection>
    </>
  );

  return children({ stage, inspector });
}
