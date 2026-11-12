/**
 * dsh-project-console host 半边入口（thin loader）。
 *
 * 真正的 host 逻辑在 lib/engine.mjs：由 build-host.mjs 把 src/core.js、git.js、
 * service.js、http.js、tools.js、mount.js 打成一个「没有相对 import」的单文件包。
 *
 * 原因（实测）：dsh-hmr 重新组合 profile 时能可靠替换被 loader 直接 import 的入口模块，
 * 但入口静态 import 的兄弟模块改动不一定被逐出（改 service.js 后 tick 仍跑旧代码）。
 * 用 ?v=<mtime> 动态 import 整个 bundle，就能在「touch profile patch 触发重组」之后
 * 让全部 host 逻辑换新，而不需要重启 Host。
 */
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HOST_REV = "rev-1794472600";
export const name = "project-console";
void HOST_REV; // 本地开发时改这个值可触发 dsh-hmr 替换插件（含动态 import 的 engine 重新加载）
export const ROUTE_PREFIX = "/project-console-api";

let cachedModule = null;
let cachedVersion = null;

async function loadEngine() {
  const file = fileURLToPath(new URL("../lib/engine.mjs", import.meta.url));
  let version = 0;
  try {
    version = statSync(file).mtimeMs;
  } catch (error) {
    console.error("[project-console] lib/engine.mjs 不存在，先跑 node build-host.mjs", error?.message ?? error);
  }
  if (cachedModule !== null && cachedVersion === version) return cachedModule;
  const namespace = await import(new URL(`../lib/engine.mjs?v=${version}`, import.meta.url).href);
  cachedModule = namespace;
  cachedVersion = version;
  return namespace;
}

export async function apply(ctx) {
  try {
    const engine = await loadEngine();
    await engine.mount(ctx);
  } catch (error) {
    console.error("[project-console] host engine 加载/装配失败", error?.stack ?? error);
  }
}
