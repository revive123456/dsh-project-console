/**
 * client 半边隔离冒烟测试：用假的 window.__ModuleLoader__ / React / ctx.slots
 * 执行 lib/client.js 的 factory，确认注册的槽位形态正确
 * （panellist 的 id === main 的 key，这是点开页面的硬条件）。
 *
 * 跑：node probe/client-smoke.mjs（先 node build.mjs）
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "lib", "client.js"), "utf8");

const registrations = [];
const injectedSlots = [];
const fakeCtx = {
  slots: {
    inject(name, fn) {
      injectedSlots.push(name);
      return fn();
    },
    register(options, component) {
      registrations.push({ options, component });
      return () => {};
    },
  },
};
const fakeReact = {
  createElement: () => null,
  useState: () => [undefined, () => {}],
  useCallback: (f) => f,
  useEffect: () => {},
};
const seeds = { react: fakeReact, "react/jsx-runtime": { jsx: () => null } };
const loaded = [];
const window = {
  __ModuleLoader__: {
    load({ id, factory }) {
      loaded.push({ id, factory });
    },
  },
};

new Function("window", source)(window);
console.log("registered module id:", loaded[0].id);
const mod = loaded[0].factory((spec) => {
  if (!(spec in seeds)) throw new Error(`missing seed module: ${spec}`);
  return seeds[spec];
});
console.log("plugin exports:", Object.keys(mod), "inject:", mod.inject);
mod.apply(fakeCtx);
console.log("slots.inject names:", injectedSlots);
for (const r of registrations) {
  const { name, id, key, order, label } = r.options;
  console.log(
    `register: name=${name} id=${id} key=${key} order=${order} label=${
      typeof label === "function" ? label() : label
    } component=${r.component.name}`,
  );
}
const panel = registrations.find((r) => r.options.name === "sidebar.panellist");
const main = registrations.find((r) => r.options.name === "main");
console.log("panellist.id === main.key :", panel.options.id === main.options.key);
