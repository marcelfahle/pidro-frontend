import type { LegalAction, Position, Suit } from '@pidro/shared';
import { SUIT_SYMBOLS } from '@pidro/shared';
import { useState } from 'react';
import { TrumpIndicator } from '../../components/ds';
import { TrumpSelector } from '../../components/game/TrumpSelector';
import { InspectorSection, TableStage } from '../chrome';
import { makeViewModel, SUITS } from '../mockGame';
import type { SceneContext, SceneSlots } from '../types';

const VIEWER: Position = 'south';
const SUIT_NAMES: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

export function TrumpRevealScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [localNonce, setLocalNonce] = useState(0);
  const mountKey = `${ctx.playKey}:${localNonce}`;
  const replay = () => setLocalNonce((n) => n + 1);

  const [chosen, setChosen] = useState<Suit | null>(null);
  const [prevMountKey, setPrevMountKey] = useState(mountKey);
  if (mountKey !== prevMountKey) {
    setPrevMountKey(mountKey);
    setChosen(null);
  }

  const viewModel = makeViewModel({
    viewer: VIEWER,
    phase: 'declaring',
    currentTurn: VIEWER,
    trump: chosen,
  });
  const legalActions: LegalAction[] = chosen
    ? []
    : SUITS.map((s) => ({ type: 'declare_trump', suit: s }) as const);

  const stage = (
    <TableStage players={viewModel.players}>
      {chosen ? (
        <div
          key={`${mountKey}:${chosen}`}
          className="animate-dealer-card-appear flex flex-col items-center gap-3"
        >
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#fff0b2]/80">
            Trump
          </div>
          <TrumpIndicator suit={chosen} size={92} />
          <div className="text-base font-black uppercase tracking-[0.12em] text-white">
            {SUIT_NAMES[chosen]}
          </div>
        </div>
      ) : (
        <TrumpSelector
          viewModel={viewModel}
          legalActions={legalActions}
          onDeclareTrump={(s) => setChosen(s)}
        />
      )}
    </TableStage>
  );

  const inspector = (
    <>
      <InspectorSection title="Declare trump">
        <p className="text-[12px] leading-relaxed text-cyan-50/55">
          You won the bid and are calling trump. Tap a suit to see the reveal; hit{' '}
          <span className="text-cyan-50/80">Replay</span> or Re-pick to start over.
        </p>
      </InspectorSection>

      <InspectorSection title="Called suit">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-black text-white">
            {chosen ? (
              <span>
                {SUIT_SYMBOLS[chosen]} {SUIT_NAMES[chosen]}
              </span>
            ) : (
              <span className="text-cyan-50/35">— not called yet —</span>
            )}
          </div>
          <button
            type="button"
            onClick={replay}
            className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/40 hover:text-white"
          >
            Re-pick
          </button>
        </div>
      </InspectorSection>
    </>
  );

  return children({ stage, inspector });
}
