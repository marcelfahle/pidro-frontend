import type { LegalAction, Position } from '@pidro/shared';
import { useState } from 'react';
import { BiddingPanel } from '../../components/game/BiddingPanel';
import { InspectorSection, Segmented, Slider, TableStage } from '../chrome';
import { makeServerState, makeViewModel, POSITIONS, seatName } from '../mockGame';
import type { SceneContext, SceneSlots } from '../types';

const VIEWER: Position = 'south';
const ALL_BIDS = [6, 7, 8, 9, 10, 11, 12, 13, 14];

const SEAT_OPTIONS = POSITIONS.map((pos) => ({
  label: pos.charAt(0).toUpperCase(),
  value: pos,
  title: seatName(pos, VIEWER),
}));

export function BiddingScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [activeBidder, setActiveBidder] = useState<Position>(VIEWER);
  const [currentBid, setCurrentBid] = useState(8);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // ctx.playKey forces a clean re-mount of the panel.
  const mountKey = `${ctx.playKey}:${activeBidder}:${currentBid}`;

  const isYourTurn = activeBidder === VIEWER;
  const legalActions: LegalAction[] = isYourTurn
    ? [
        ...ALL_BIDS.filter((a) => a > currentBid).map((a) => ({ type: 'bid', amount: a }) as const),
        { type: 'pass' } as const,
      ]
    : [];

  const viewModel = makeViewModel({ viewer: VIEWER, phase: 'bidding', currentTurn: activeBidder });
  const serverState = makeServerState({
    phase: 'bidding',
    current_player: activeBidder,
    current_bid: currentBid,
  });

  const statusFor = (p: { isCurrentTurn: boolean }) => (p.isCurrentTurn ? 'Bidding…' : undefined);

  const stage = (
    <TableStage players={viewModel.players} statusFor={statusFor}>
      <div key={mountKey}>
        <BiddingPanel
          viewModel={viewModel}
          serverState={serverState}
          legalActions={legalActions}
          onBid={(amount) => setLastAction(`You bid ${amount}`)}
          onPass={() => setLastAction('You passed')}
        />
      </div>
    </TableStage>
  );

  const inspector = (
    <>
      <InspectorSection title="Active bidder">
        <Segmented
          options={SEAT_OPTIONS}
          value={activeBidder}
          onChange={(p) => {
            setActiveBidder(p);
            setLastAction(null);
          }}
          columns={4}
        />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          Pick <span className="text-cyan-50/75">You</span> to see the live bid buttons; any other
          seat shows the waiting state.
        </p>
      </InspectorSection>

      <InspectorSection title="Bid to beat">
        <Slider
          label="Current bid"
          value={currentBid}
          min={0}
          max={13}
          step={1}
          unit=""
          isDefault={currentBid === 8}
          onChange={setCurrentBid}
        />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          Only higher bids stay enabled; the rest strike through.
        </p>
      </InspectorSection>

      <InspectorSection title="Last action">
        <div className="text-[12px] font-bold text-white">
          {lastAction ?? <span className="text-cyan-50/35">— tap a bid or Pass —</span>}
        </div>
      </InspectorSection>
    </>
  );

  return children({ stage, inspector });
}
