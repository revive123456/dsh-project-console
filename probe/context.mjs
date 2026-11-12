#!/usr/bin/env node
/**
 * 上下文管理单元测试（P0/P1 纯逻辑）：
 *   - capBytes：按 UTF-8 字节封顶、保留头尾、不产生替换字符
 *   - parseReviewVerdict：合法/非法 JSON 判定
 *   - buildLeadBrief：简报包含待处理项、字节受控
 *   - buildContinuationText：过滤系统注入、只留最近 N 条
 *   - buildReviewEvidenceCard：证据卡包含 diff / 未跟踪文件 / DoD，体积受控
 *   - diffText：含工作区改动与未跟踪文件
 *
 * 跑：node build-host.mjs && node probe/context.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "lib", "engine.mjs"), "utf8");
const exportNames = [
  "capBytes", "parseReviewVerdict", "buildLeadBrief", "buildContinuationText",
  "buildReviewEvidenceCard", "diffText", "REVIEWER_PERSONA",
];
for (const name of exportNames) {
  if (!new RegExp(`^(?:const|(?:async\\s+)?function)\\s+${name}\\b`, "m").test(source)) {
    throw new Error(`lib/engine.mjs 里找不到 ${name}（先跑 node build-host.mjs）`);
  }
}
const tmpRoot = mkdtempSync(join(tmpdir(), "pc-context-"));
const engineCopy = join(tmpRoot, "engine-test.mjs");
writeFileSync(engineCopy, `${source}\nexport { ${exportNames.join(", ")} };\n`, "utf8");
process.on("exit", () => { try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ } });
const engine = await import(`file://${engineCopy}`);

let checks = 0;
let failures = 0;
function check(label, ok, detail) {
  checks += 1;
  if (!ok) { failures += 1; console.error(`  ✗ ${label}${detail ? `：${detail}` : ""}`); }
  else console.log(`  ✓ ${label}`);
}

/* ───────────── capBytes ───────────── */
console.log("[capBytes]");
const cjk = "汉".repeat(5000);
const capped = engine.capBytes(cjk, 1200);
check("中文按字节封顶", Buffer.byteLength(capped, "utf8") <= 1400, `bytes=${Buffer.byteLength(capped, "utf8")}`);
check("含省略提示", capped.includes("省略"), capped.slice(0, 40));
check("无替换字符", !capped.includes("\uFFFD"));
const ascii = "a".repeat(10000);
const asciiCapped = engine.capBytes(ascii, 800);
check("ASCII 保留头尾", asciiCapped.startsWith("a") && asciiCapped.endsWith("a") && Buffer.byteLength(asciiCapped) <= 900);
check("短文本原样", engine.capBytes("hello", 800) === "hello");

/* ───────────── parseReviewVerdict ───────────── */
console.log("[parseReviewVerdict]");
const v1 = engine.parseReviewVerdict('{"verdict":"accept","confidence":"high","reason":"DoD 已实现"}');
check("accept 可解析", v1?.verdict === "accept" && v1?.confidence === "high");
const v2 = engine.parseReviewVerdict('```json\n{"verdict":"rework","reason":"缺测试","feedback":"补 typecheck"}\n```');
check("带代码围栏的 rework 可解析", v2?.verdict === "rework" && v2?.feedback === "补 typecheck");
check("rework 缺 feedback 拒绝", engine.parseReviewVerdict('{"verdict":"rework","reason":"x"}') === null);
check("未知 verdict 拒绝", engine.parseReviewVerdict('{"verdict":"pass"}') === null);
check("空文本拒绝", engine.parseReviewVerdict("") === null);

/* ───────────── buildLeadBrief / continuation ───────────── */
console.log("[buildLeadBrief]");
const now = new Date().toISOString();
const fakeCore = {
  state: {
    settings: { leadBriefBytes: 1600, leadCtxLimitTokens: 100000 },
    lead: { sessionId: null, lastPromptAt: new Date(Date.now() - 3600_000).toISOString() },
    projects: [
      { id: "p1", name: "demo-repo" },
      { id: "p2", name: "demo-app" },
    ],
    tasks: [
      { id: 3, projectId: "p1", status: "verifying", title: "a", size: "s", branch: "feature/3-a", updatedAt: now },
      { id: 4, projectId: "p1", status: "needs_review", title: "b", size: "s", review: { verdict: "need_info" }, updatedAt: now },
      { id: 5, projectId: "p2", status: "failed", title: "c", size: "s", updatedAt: now },
      { id: 9, projectId: "p2", status: "running", title: "d", size: "s", updatedAt: now },
    ],
    questions: [{ id: "q1", status: "open", text: "这个需求到底要什么" }],
    batches: [{ id: "b9", status: "awaiting_confirmation", taskIds: [3] }],
    reviewLog: [{ taskId: 2, verdict: "accept", reason: "ok", at: new Date().toISOString() }],
    stats: { review: { runs: 1 } },
  },
  log() {},
  ctx: { get() { return undefined; } },
};
const brief = engine.buildLeadBrief(fakeCore);
check("含项目行", brief.includes("p1") && brief.includes("p2"));
check("含待验收", brief.includes("待验收") && brief.includes("#3"));
check("含需人工", brief.includes("需人工") && brief.includes("#4"));
check("含待澄清", brief.includes("q1"));
check("含批次待确认", brief.includes("b9"));
check("含最近判定", brief.includes("最近判定") && brief.includes("#2"));
check("字节受控", Buffer.byteLength(brief, "utf8") <= 1600, `bytes=${Buffer.byteLength(brief, "utf8")}`);

console.log("[buildContinuationText]");
const cont = engine.buildContinuationText(fakeCore, {
  ok: true,
  messages: [
    { role: "user", type: "user/message", text: "<system-reminder> 注入" },
    { role: "user", type: "user/message", text: "第一句人话" },
    { role: "assistant", type: "assistant/message", text: "第一句回复" },
    { role: "tool", type: "tool/result", text: "工具结果" },
    { role: "user", type: "user/message", text: "【工程台简报】x" },
    { role: "user", type: "user/message", text: "第二句人话" },
    { role: "assistant", type: "assistant/message", text: "第二句回复" },
  ],
}, 2);
check("过滤系统注入", !cont.includes("注入") && !cont.includes("工具结果"));
check("只留最近 2 条", cont.includes("第二句人话") && cont.includes("第二句回复") && !cont.includes("第一句人话"));
check("带简报", cont.includes("【工程台简报"));
check("带续接说明", cont.includes("【会话续接】"));

/* ───────────── diffText / evidence card ───────────── */
console.log("[diffText]");
const repo = join(tmpRoot, "repo");
mkdirSync(repo, { recursive: true });
const run = (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" });
run(["init", "-q", "-b", "main"]);
run(["config", "user.email", "test@example.com"]);
run(["config", "user.name", "Test"]);
writeFileSync(join(repo, "a.txt"), "one\n", "utf8");
run(["add", "."]);
run(["commit", "-qm", "base"]);
writeFileSync(join(repo, "a.txt"), "one\ntwo\n", "utf8");
writeFileSync(join(repo, "new.txt"), "brand new\n", "utf8");
const diff = await engine.diffText(repo, "main", 12288);
check("包含修改", diff.includes("+two"));
check("包含未跟踪文件内容", diff.includes("brand new"));
check("不含内部附件路径", !diff.includes(".project-console"));

fakeCore.state.projects[0].repoPath = repo;
fakeCore.state.projects[0].baseBranch = "main";
const task = {
  id: 7, projectId: "p1", title: "测试任务", type: "fix", size: "s",
  brief: "把 two 加进 a.txt", dod: ["a.txt 含 two", "npm test 通过"],
  worktreePath: repo,
};
const evidenceRun = {
  id: "r1", selfTest: { passed: 2, total: 2, commands: [{ command: "npm test", exitCode: 0, ok: true, tail: "ok" }] },
  files: [{ path: "a.txt", additions: 1, deletions: 0 }], filesChanged: 1, diffStat: "+1/-0",
  finalText: "已完成", drift: { mainRepoChanged: false },
};
const card = await engine.buildReviewEvidenceCard(fakeCore, task, evidenceRun);
check("证据卡含 DoD", card.prompt.includes("a.txt 含 two"));
check("证据卡含 diff", card.prompt.includes("+two"));
check("证据卡含自测", card.prompt.includes("npm test"));
check("证据卡体积受控", Buffer.byteLength(card.prompt, "utf8") < 20000, `bytes=${Buffer.byteLength(card.prompt, "utf8")}`);
check("diffEmpty=false", card.diffEmpty === false);

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
