import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eyebrow,
  InspectorSection,
  ReplayButton,
  SoonStage,
  SpeedDial,
} from '../playground/chrome';
import { DEFAULT_SCENE_ID, SCENES } from '../playground/registry';
import type { PlaygroundScene, SceneContext, SceneSlots } from '../playground/types';

export function PlaygroundPage() {
  const [activeId, setActiveId] = useState(DEFAULT_SCENE_ID);
  const [playKey, setPlayKey] = useState(0);
  const [speed, setSpeed] = useState(1);

  const active = SCENES.find((s) => s.id === activeId) ?? SCENES[0];
  const ctx: SceneContext = { playKey, speed };

  const groups = useMemo(() => {
    const result: { group: string; scenes: PlaygroundScene[] }[] = [];
    for (const scene of SCENES) {
      let bucket = result.find((g) => g.group === scene.group);
      if (!bucket) {
        bucket = { group: scene.group, scenes: [] };
        result.push(bucket);
      }
      bucket.scenes.push(scene);
    }
    return result;
  }, []);

  function pickScene(id: string) {
    setActiveId(id);
    setPlayKey((k) => k + 1);
  }

  const sidebar = (
    <aside className="flex flex-col gap-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
      {groups.map(({ group, scenes }) => (
        <div key={group}>
          <div className="mb-2 px-1">
            <Eyebrow>{group}</Eyebrow>
          </div>
          <div className="flex flex-col gap-1.5">
            {scenes.map((scene) => {
              const isActive = scene.id === activeId;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => pickScene(scene.id)}
                  className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'border-cyan-300/55 bg-cyan-400/12 shadow-[inset_0_0_0_1px_rgba(94,237,255,0.2)]'
                      : 'border-white/8 bg-black/20 hover:border-cyan-300/25 hover:bg-black/30'
                  }`}
                >
                  <span
                    className={`text-[13px] font-black uppercase tracking-[0.06em] ${
                      isActive ? 'text-white' : 'text-cyan-50/70 group-hover:text-cyan-50/90'
                    }`}
                  >
                    {scene.label}
                  </span>
                  {scene.status === 'soon' && (
                    <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50/40">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );

  const transport = (
    <div className="pidro-glass-box flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="w-[160px] shrink-0">
        <ReplayButton onClick={() => setPlayKey((k) => k + 1)} />
      </div>
      <div className="flex flex-1 items-center justify-end gap-2.5">
        <Eyebrow>Speed</Eyebrow>
        <div className="w-[240px]">
          <SpeedDial value={speed} onChange={setSpeed} />
        </div>
      </div>
    </div>
  );

  // The 3-pane lab layout. Defined here so it closes over the sidebar/transport
  // and can be reused for both ready scenes and the "soon" placeholders.
  const layout = (slots: SceneSlots): ReactNode => (
    <div className="grid flex-1 gap-4 lg:grid-cols-[210px_minmax(0,1fr)_340px]">
      {sidebar}
      <main className="flex min-w-0 flex-col gap-4">
        {transport}
        <div className="flex flex-1 items-center justify-center">{slots.stage}</div>
      </main>
      <aside className="flex flex-col gap-3 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
        <div className="mb-1">
          <Eyebrow>{active.group}</Eyebrow>
          <h2 className="mt-1 text-xl font-black uppercase tracking-[0.05em] text-white">
            {active.label}
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-cyan-50/50">{active.blurb}</p>
        </div>
        {slots.inspector}
      </aside>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0c2c3d,#06141d_60%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-4 lg:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Pidro · Lab</Eyebrow>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em] text-white">
              Animation Playground
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/design-system"
              className="rounded-lg border border-white/12 bg-black/20 px-3 py-2 text-[12px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/35 hover:text-white"
            >
              Design System
            </Link>
            <Link
              to="/lobby"
              className="rounded-lg border border-white/12 bg-black/20 px-3 py-2 text-[12px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/35 hover:text-white"
            >
              Lobby
            </Link>
          </nav>
        </header>

        {active.Scene ? (
          <active.Scene ctx={ctx}>{(slots) => layout(slots)}</active.Scene>
        ) : (
          layout({
            stage: <SoonStage label={active.label} />,
            inspector: (
              <InspectorSection title="Coming soon">
                <p className="text-[12px] leading-relaxed text-cyan-50/55">
                  This scene isn't wired up yet. The harness — replay, speed, timing sliders and the
                  timeline — is ready; it just needs this state's components hooked into a scene
                  module like Dealer Selection.
                </p>
              </InspectorSection>
            ),
          })
        )}
      </div>
    </div>
  );
}
