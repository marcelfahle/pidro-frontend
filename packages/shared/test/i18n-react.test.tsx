import { expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { setLocale, t, useLocale } from "../src/i18n";

it("updates a mounted locale consumer without discarding component state", async () => {
  // jsdom/react-dom are already provided by the workspace web test toolchain.
  const dom = new JSDOM('<!doctype html><div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  setLocale("en");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  let mounts = 0;
  function Consumer() {
    const locale = useLocale();
    const [count, setCount] = useState(0);
    useEffect(() => {
      mounts++;
    }, []);
    return (
      <button onClick={() => setCount(count + 1)}>
        {locale}:{t("common.cancel")}:{count}
      </button>
    );
  }
  try {
    await act(async () => root.render(<Consumer />));
    await act(async () => container.querySelector("button")!.click());
    expect(container.textContent).toBe("en:Cancel:1");
    await act(async () => setLocale("sv"));
    expect(container.textContent).toBe("sv:Avbryt:1");
    expect(mounts).toBe(1);
  } finally {
    await act(async () => root.unmount());
    setLocale("en");
    dom.window.close();
    Object.assign(globalThis, {
      window: previous.window,
      document: previous.document,
      IS_REACT_ACT_ENVIRONMENT: previous.act,
    });
  }
});
