#!/usr/bin/env node
/**
 * 把 host 半边源码打成一个单文件 ESM：lib/engine.mjs。
 *
 * 规则（源码约定）：
 *   - 每个模块只允许 `import ... from "node:xxx"`（内置模块）与相对 import；
 *   - 相对 import 会被去掉，被导入的符号由拼接后的同一作用域提供；
 *   - `export` 关键字会被去掉，最后统一导出 mount。
 * 这样做的目的见 src/index.js 顶部注释：让 host 逻辑能整包热替换。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const order = ["core.js", "git.js", "service.js", "report.js", "http.js", "tools.js", "mount.js"];

const builtinImports = new Map(); // spec -> Set(names)
const chunks = [];

for (const file of order) {
  let text = readFileSync(join(root, "src", file), "utf8");
  // 收集 node: 内置 import（named 形式），按 spec 合并去重
  text = text.replace(/^import\s*\{([^}]*)\}\s*from\s*["'](node:[^"']+)["'];?\s*$/gm, (_m, names, spec) => {
    const set = builtinImports.get(spec) ?? new Set();
    for (const raw of String(names).split(",")) {
      const name = raw.trim();
      if (name !== "") set.add(name);
    }
    builtinImports.set(spec, set);
    return "";
  });
  // 兜底：其它 node: import（default / namespace）直接提到顶部
  text = text.replace(/^import\s+([^{][\s\S]*?)\s+from\s+["'](node:[^"']+)["'];?\s*$/gm, (_m, clause, spec) => {
    const set = builtinImports.get(spec) ?? new Set();
    set.add("__default__" + clause.trim());
    builtinImports.set(spec, set);
    return "";
  });
  // 去掉相对 import
  text = text.replace(/^import\s+[\s\S]*?from\s+["']\.\/[^"']+["'];?\s*$/gm, "");
  // 去掉 export 关键字（保留声明本身）
  text = text.replace(/^export\s+(?=(async\s+)?(function|class|const|let|var)\b)/gm, "");
  text = text.replace(/^export\s*\{[^}]*\};?\s*$/gm, "");
  text = text.replace(/^export\s+const\s+([A-Za-z_$][\w$]*)\s*=/gm, "const $1 =");
  chunks.push(`// ───────────────────────────── ${file} ─────────────────────────────\n${text.trim()}`);
}

const header = [
  "/**",
  " * dsh-project-console host engine（自动生成，请改 src/*.js 后重新运行 node build-host.mjs）。",
  " * 由 node build-host.mjs 生成，请勿手改。",
  " * 说明：单文件、无相对 import —— 便于 thin entry 用 ?v=<mtime> 整包热替换。",
  " */",
  ...[...builtinImports.entries()].map(([spec, names]) => {
    const plain = [...names].filter((n) => !n.startsWith("__default__"));
    const defaults = [...names].filter((n) => n.startsWith("__default__")).map((n) => n.slice("__default__".length));
    const parts = [];
    if (defaults.length > 0) parts.push(defaults[0]);
    if (plain.length > 0) parts.push(`{ ${plain.join(", ")} }`);
    return `import ${parts.join(", ")} from "${spec}";`;
  }),
].join("\n");

const footer = `\nexport { mount };\n`;
mkdirSync(join(root, "lib"), { recursive: true });
const out = [header, "", ...chunks, footer].join("\n");
writeFileSync(join(root, "lib", "engine.mjs"), out, "utf8");
console.log(`dsh-project-console: lib/engine.mjs assembled from ${order.length} sources (${out.split("\n").length} lines)`);
