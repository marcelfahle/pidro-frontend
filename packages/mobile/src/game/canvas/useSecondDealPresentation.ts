/**
 * The second deal, played out on the table so every count can be read off
 * the cards, as at a real table: everyone throws their non-trumps face down
 * in front of them, card by card; the dealer gives each seat its cards one
 * at a time from the pack; then takes the rest and throws down to six. The
 * thrown piles stay until the first card is played. Built only from the
 * server's counts (kept, drawn) and the hands it already sent: a
 * presentation, never game logic.
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { TableCard, TableModel } from './tableModel';
import { SECOND_DEAL_START_MS } from './animationTiming';
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
  // The dealer's last throw, once the pick is in: frames past the plan.
  const [trim, setTrim] = useState(0);

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
      // The first card of the hand is down: the thrown piles make way.
      setPlan(null);
    } else if (armed && !plan && !reducedMotion) {
      const next = makePlan(model, held);
      if (next) {
        setPlan(next);
        setStep(0);
        setTrim(0);
        setArmed(false);
      }
    }
  }

  const dealer = model.dealerRelative;
  const last = plan ? plan.frames.length - 1 : 0;
  const atEnd = !!plan && step >= last;
  const frame = plan ? plan.frames[Math.min(step, last)] : null;
  const dealerHolds = frame && dealer ? (frame.hand[dealer] ?? 0) : 0;
  const dealerKeeps = dealer ? model.seats[dealer]?.cardCount : null;
  const toTrim =
    atEnd && model.phase !== 'second_deal' && dealerKeeps != null
      ? Math.max(0, dealerHolds - dealerKeeps)
      : 0;
  const trimmed = trim >= toTrim;
  // Played out: the piles stay until the first card of the hand is played.
  const resting = atEnd && trimmed && model.phase === 'playing';

  useEffect(() => {
    if (!plan || !frame) return;
    if (atEnd) {
      if (resting) return;
      if (model.phase === 'second_deal' || dealerKeeps == null) return;
      if (trimmed) return;
      // The dealer throws the extras down in one swoop.
      const timer = setTimeout(() => setTrim(toTrim), SECOND_DEAL_START_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setStep(step + 1), frame.ms);
    return () => clearTimeout(timer);
  }, [plan, frame, atEnd, resting, trimmed, toTrim, step, model.phase, dealerKeeps]);

  if (!plan || !frame || reducedMotion || !AFTER.has(model.phase) || hasPlay(model)) return model;

  const thrown = { ...frame.thrown };
  if (dealer && atEnd) thrown[dealer] = (thrown[dealer] ?? 0) + Math.min(trim, toTrim);
  const show: SecondDealShow = { pack: frame.pack, thrown };
  if (resting) return { ...model, secondDealShow: show };

  const seats = { ...model.seats };
  for (const rel of CLOCKWISE) {
    const seat = seats[rel];
    if (!seat) continue;
    const count =
      rel === dealer && atEnd
        ? dealerHolds - Math.min(trim, toTrim)
        : (frame.hand[rel] ?? seat.cardCount);
    seats[rel] = { ...seat, cardCount: count, isCurrentTurn: false };
  }
  // Your hand follows the same beats: the cards you throw leave one by one,
  // the ones you are given arrive one by one.
  let yourHand = model.yourHand;
  if (plan.yourThrown && plan.yourDrawn && !atEnd) {
    const gone = new Set(
      plan.yourThrown.slice(0, frame.thrown.south ?? 0).map((card) => card.textureKey)
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
