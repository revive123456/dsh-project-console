/**
 * 零依赖构建：
 *   - host 半边直接用 src/index.js（ESM，无需打包）；
 *   - client 半边把 src/client/*.js 按固定顺序拼进
 *     window.__ModuleLoader__.load 的 factory 闭包，产出 lib/client.js。
 *
 * 约束（API.md §3.1）：
 *   - module id 必须等于 package.json 的 name（本包名）。
 *   - factory 里只能 require「shell 种子模块」（react / react-dom / react/jsx-runtime）。
 *   - 没有编译步骤：所有 src/client/*.js 都是普通 JS（React.createElement），
 *     文件之间靠「同一个函数作用域」共享顶层声明，故拼接顺序固定、名字不得重复。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** 拼接顺序（后者可用前者的顶层声明）。 */
const CLIENT_FILES = [
  "util.js",
  "api.js",
  "css.js",
  "components.js",
  "board.js",
  "detail.js",
  "integration.js",
  "sessions.js",
  "app.js",
  "entry.js",
];

mkdirSync(join(root, "lib"), { recursive: true });

const pieces = [];
for (const file of CLIENT_FILES) {
  const source = readFileSync(join(root, "src", "client", file), "utf8").replace(/\s+$/, "");
  pieces.push(`\t\t// ===== src/client/${file} =====\n${source.split("\n").map((line) => (line === "" ? "" : `\t\t${line}`)).join("\n")}`);
}

const lines = [
  `window.__ModuleLoader__.load({`,
  `\tid: ${JSON.stringify(manifest.name)},`,
  `\tfactory: (require) => {`,
  `\t\tvar module = { exports: {} };`,
  `\t\tvar exports = module.exports;`,
  `\t\tconst React = require("react");`,
  `\t\tvoid require("react/jsx-runtime");`,
  ``,
  ...pieces,
  ``,
  `\t\treturn module.exports;`,
  `\t}`, `});`, ``,
];

writeFileSync(join(root, "lib", "client.js"), lines.join("\n"), "utf8");
console.log(
  `dsh-project-console: lib/client.js assembled from ${CLIENT_FILES.length} sources (id=${manifest.name}; host entry = src/index.js)`,
);
