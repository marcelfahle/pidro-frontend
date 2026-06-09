import type { ReactNode } from 'react';

/** Playback state shared by every scene, owned by the playground shell. */
export interface SceneContext {
  /** Bump this to replay — scenes use it as a React `key` to force a fresh mount. */
  playKey: number;
  /** Global playback speed multiplier (e.g. 0.25 = quarter speed, 2 = double). */
  speed: number;
}

/** A scene renders into two regions of the lab: the centre stage and the right inspector. */
export interface SceneSlots {
  stage: ReactNode;
  inspector: ReactNode;
}

/**
 * A scene is a render-prop component: it owns its own params/timing state and hands
 * back the stage + inspector nodes so the shell can place them in the right columns.
 */
export type SceneComponent = (props: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => ReactNode;
}) => ReactNode;

export interface PlaygroundScene {
  id: string;
  label: string;
  /** Sidebar grouping, e.g. "Round start". */
  group: string;
  /** One-line description shown under the title. */
  blurb: string;
  status: 'ready' | 'soon';
  /** Present for `ready` scenes. */
  Scene?: SceneComponent;
}
