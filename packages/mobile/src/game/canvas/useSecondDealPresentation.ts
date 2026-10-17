/**
 * The second deal, played out on the table at Classic's pace so the counts
 * can be read off the cards: each player in turn throws their non-trumps
 * face down in front of them, the piles hold to be counted and clear, the
 * dealer gives each player their cards one at a time and takes the rest
 * unseen. The dealer's discard never shows, the dealer's edge at a real
 * table. Built only from the server's counts and the hands it already sent:
 * a presentation, never game logic. The server holds play for as long
 * (second_deal_transition_delay_ms).
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { TableCard, TableModel } from './tableModel';
import {
  AFTER,
  BEFORE,
  CLOCKWISE,
  makePlan,
  type Plan,
  type SecondDealShow,
} from './secondDealPlan';

export type { SecondDealShow } from './secondDealPlan';

const hasPlay = (model: TableModel) =>
  Object.values(model.currentTrick).some(Boolean) || model.lastTrick != null;

export function useSecondDealPresentation(model: TableModel): TableModel {
  const reducedMotion = useReducedMotion();
  // What this hook reacts to. The model is a new object on every render
  // while the first deal plays, so it is compared by what it says, not by
  // identity, or each render would set state and render again.
  const signature = [
    model.phase,
    model.yourHand.map((card) => card.key).join(','),
    CLOCKWISE.map((rel) => {
      const seat = model.seats[rel];
      return `${seat?.cardCount}/${seat?.secondDeal?.kept}/${seat?.secondDeal?.drawn}`;
    }).join(' '),
    hasPlay(model),
  ].join('|');
  const [previous, setPrevious] = useState(signature);
  // Your nine, remembered until the discard so the cards you kept can stay put.
  const [held, setHeld] = useState<TableCard[] | null>(null);
  const [armed, setArmed] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState(0);

  if (previous !== signature) {
    setPrevious(signature);
    if (BEFORE.has(model.phase)) {
      if (plan) setPlan(null);
      if (!armed) setArmed(true);
      if (model.yourHand.length > 0) setHeld(model.yourHand);
    } else if (!AFTER.has(model.phase)) {
      if (plan) setPlan(null);
      if (armed) setArmed(false);
    } else if (plan && hasPlay(model)) {
      setPlan(null);
    } else if (armed && !plan && !reducedMotion) {
      const next = makePlan(model, held);
      if (next) {
        setPlan(next);
        setStep(0);
        setArmed(false);
      }
    }
  }

  const frame = plan ? plan.frames[Math.min(step, plan.frames.length - 1)] : null;
  const atEnd = !!plan && step >= plan.frames.length - 1;

  useEffect(() => {
    if (!plan || !frame) return;
    const timer = setTimeout(() => (atEnd ? setPlan(null) : setStep(step + 1)), frame.ms);
    return () => clearTimeout(timer);
  }, [plan, frame, atEnd, step]);

  if (!plan || !frame || reducedMotion || !AFTER.has(model.phase) || hasPlay(model)) return model;

  const dealer = model.dealerRelative;
  const show: SecondDealShow = { pack: frame.pack, thrown: frame.thrown };
  const seats = { ...model.seats };
  for (const rel of CLOCKWISE) {
    const seat = seats[rel];
    if (!seat) continue;
    seats[rel] = { ...seat, cardCount: frame.hand[rel] ?? seat.cardCount, isCurrentTurn: false };
  }
  // Your hand follows the same beats: what you throw leaves in your turn to
  // throw, what you are given arrives one card at a time. Dealing yourself,
  // you hold your nine until you take the pack.
  let yourHand = model.yourHand;
  if (dealer === 'south') {
    if (held && !atEnd) yourHand = held;
  } else if (plan.yourThrown && plan.yourDrawn) {
    const gone = new Set(
      plan.yourThrown.slice(0, frame.out.south ?? 0).map((card) => card.textureKey)
    );
    const stillHeld = (held ?? []).filter((card) => !gone.has(card.textureKey));
    const keptKeys = new Set(stillHeld.map((card) => card.textureKey));
    const arrived = new Set(
      plan.yourDrawn.slice(0, frame.drawn.south ?? 0).map((card) => card.textureKey)
    );
    yourHand = [
      ...stillHeld.filter((card) => !model.yourHand.some((c) => c.textureKey === card.textureKey)),
      ...model.yourHand.filter(
        (card) => keptKeys.has(card.textureKey) || arrived.has(card.textureKey)
      ),
    ];
  }
  return {
    ...model,
    seats,
    yourHand,
    canPlay: false,
    dealStage: 'dealing',
    secondDealShow: show,
  };
}
