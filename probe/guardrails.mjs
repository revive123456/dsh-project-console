#!/usr/bin/env node
/**
 * 边界防护回归：
 *   - normalizeLoadedState：坏结构拒绝、可选字段修复、数组过滤
 *   - 路径守卫：lead 读项目/state，worker 只读自己的 worktree，拒绝宿主文件
 *   - diffText：未跟踪符号链接不展开目标内容
 *   - collectImageFiles：跳过符号链接图片
 *   - touches 冲突域：前缀重叠/非 active/无 touches
 *   - validateTaskInput：brief/DoD/title 上限
 *
 * 跑：node build-host.mjs && node probe/guardrails.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "lib", "engine.mjs"), "utf8");
const names = [
  "normalizeLoadedState", "resolveReadablePath", "diffText", "collectImageFiles",
  "findTouchConflict", "validateTaskInput", "TASK_LIMITS", "reportNewCollector", "reworkTask", "promptTask", "acceptTask", "abandonTask", "dispatchTask", "answerQuestion", "isSelfTestCommand", "exitCodeOf", "computeSelfTest", "squashTaskCommit", "fastForwardBase", "revertBase", "ffBatch", "revertBatch", "maybeRetryStuckReviews", "applyReviewVerdict", "createHandler", "reclaimOrphanDispatches", "updateProject", "integrate",
];
for (const name of names) {
  if (!new RegExp(`^(?:const|(?:async\\s+)?function)\\s+${name}\\b`, "m").test(source)
    && !new RegExp(`^const ${name}\\b`, "m").test(source)) {
    throw new Error(`lib/engine.mjs 里找不到 ${name}（先跑 node build-host.mjs）`);
  }
}
const tmp = mkdtempSync(join(tmpdir(), "pc-guard-"));
const engineFile = join(tmp, "engine-test.mjs");
writeFileSync(engineFile, `${source}\nexport { ${names.join(", ")} };\n`, "utf8");
process.on("exit", () => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } });
const engine = await import(`file://${engineFile}`);

let checks = 0, failures = 0;
function check(label, ok, detail = "") {
  checks += 1;
  if (!ok) { failures += 1; console.error(`  ✗ ${label}${detail ? `：${detail}` : ""}`); }
  else console.log(`  ✓ ${label}`);
}

/* ───────────── normalizeLoadedState ───────────── */
console.log("[normalizeLoadedState]");
const full = { version: 1, settings: {}, projects: [], tasks: [], runs: [] };
const n1 = engine.normalizeLoadedState(full);
check("最小合法结构可加载", n1.ok === true && Array.isArray(n1.state.projects) && n1.state.settings.globalSlotBudget === 8);
const n2 = engine.normalizeLoadedState({ version: 1 });
check("缺 settings/projects/tasks/runs 拒绝", n2.ok === false && /settings|projects/.test(n2.reason));
const n3 = engine.normalizeLoadedState(null);
check("非对象拒绝", n3.ok === false);
const n4 = engine.normalizeLoadedState({ version: 1, settings: {}, projects: [null, { id: "p1" }], tasks: [null], runs: [], batches: "bad" });
check("可选数组/条目修复", n4.ok === true && n4.state.projects.length === 1 && n4.state.tasks.length === 0 && Array.isArray(n4.state.batches));
check("修复标记为 repaired", n4.repaired === true);
const n5 = engine.normalizeLoadedState({ version: 1, settings: { leadCtxLimitTokens: "bad" }, projects: [], tasks: [], runs: [], reviewLog: new Array(101).fill({ taskId: 1 }) });
check("reviewLog 截到 100", n5.ok === true && n5.state.reviewLog.length === 100);
check("数字字段坏值回默认", n5.state.stats.review.runs === 0);
const n6 = engine.normalizeLoadedState({ version: 1, settings: { globalSlotBudget: "abc" }, projects: [], tasks: [], runs: [] });
check("NaN 槽位预算回到默认 8", n6.ok === true && n6.state.settings.globalSlotBudget === 8, String(n6.state?.settings?.globalSlotBudget));
const n7 = engine.normalizeLoadedState({ version: 1, settings: { globalSlotBudget: 99 }, projects: [], tasks: [], runs: [] });
check("槽位预算上限收敛到 16", n7.state.settings.globalSlotBudget === 16, String(n7.state.settings.globalSlotBudget));

/* ───────────── 路径守卫 ───────────── */
console.log("[路径守卫]");
const stateDir = join(tmp, "state");
const repo = join(tmp, "repo");
const wtRoot = join(tmp, "wt");
const wt1 = join(wtRoot, "t1");
const wt2 = join(wtRoot, "t2");
for (const d of [stateDir, repo, wt1, wt2]) mkdirSync(d, { recursive: true });
writeFileSync(join(stateDir, "state.json"), "{}");
writeFileSync(join(repo, "README.md"), "repo\n");
writeFileSync(join(wt1, "a.txt"), "a\n");
writeFileSync(join(wt2, "b.txt"), "b\n");
symlinkSync("/etc/hostname", join(wt1, "leak.txt"));
const fakeCore = {
  stateDir,
  state: {
    lead: { sessionId: "lead" },
    projects: [{ id: "p1", repoPath: repo, worktreeRoot: wtRoot }],
    tasks: [
      { id: 1, sessionId: "worker1", worktreePath: wt1 },
      { id: 2, sessionId: "worker2", worktreePath: wt2 },
    ],
  },
};
const leadExec = { agent: { session: { id: "lead" } } };
const worker1 = { agent: { session: { id: "worker1" } } };
const worker2 = { agent: { session: { id: "worker2" } } };
check("lead 可读项目仓库", engine.resolveReadablePath(fakeCore, join(repo, "README.md"), leadExec).ok === true);
check("lead 可读 stateDir", engine.resolveReadablePath(fakeCore, join(stateDir, "state.json"), leadExec).ok === true);
check("lead 不能读 /etc/hostname", engine.resolveReadablePath(fakeCore, "/etc/hostname", leadExec).ok === false);
check("worker 可读自己的 worktree", engine.resolveReadablePath(fakeCore, join(wt1, "a.txt"), worker1).ok === true);
check("worker 不能读别的 worktree", engine.resolveReadablePath(fakeCore, join(wt2, "b.txt"), worker1).ok === false);
check("worker 不能读宿主文件", engine.resolveReadablePath(fakeCore, "/etc/hostname", worker1).ok === false);
check("符号链接指向外部被拒绝", engine.resolveReadablePath(fakeCore, join(wt1, "leak.txt"), worker1).ok === false);

/* ───────────── diffText / 图片符号链接 ───────────── */
console.log("[符号链接]");
const gitRepo = join(tmp, "gitrepo");
mkdirSync(gitRepo);
const secret = join(tmp, "secret.txt");
writeFileSync(secret, "TOPSECRET=sk-live-123\n");
execFileSync("bash", ["-c", `cd ${gitRepo} && git init -q -b main && git config user.email t@e && git config user.name t && echo base > a.txt && git add . && git commit -qm base`]);
symlinkSync(secret, join(gitRepo, "leak.txt"));
const diff = await engine.diffText(gitRepo, "main", 12288);
check("diffText 不展开符号链接目标", diff.includes("符号链接") && !diff.includes("TOPSECRET"));
const imgDir = join(tmp, "imgs");
mkdirSync(imgDir);
writeFileSync(join(imgDir, "real.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
symlinkSync(join(imgDir, "real.png"), join(imgDir, "link.png"));
const imgs = [];
engine.collectImageFiles(imgDir, imgs, 10);
check("图片收集跳过符号链接", imgs.length === 1 && imgs[0].endsWith("real.png"), JSON.stringify(imgs));
const collector = engine.reportNewCollector(1);
collector.addFile(join(imgDir, "real.png"), "test");
collector.addFile(join(imgDir, "link.png"), "test");
check("报告收集跳过符号链接", collector.list.length === 1 && collector.list[0].path.endsWith("real.png"), JSON.stringify(collector.list));

/* ───────────── touches 冲突 ───────────── */
console.log("[touches 冲突]");
const mkTask = (id, status, touches) => ({ id, projectId: "p1", status, touches, title: `t${id}` });
const conflictCore = { state: { tasks: [
  mkTask(1, "running", ["src/"]),
  mkTask(2, "accepted", ["lib/"]),
  mkTask(3, "queued", ["src/a.js"]),
  mkTask(4, "verifying", ["README.md"]),
] } };
check("前缀重叠算冲突", engine.findTouchConflict(conflictCore, mkTask(3, "queued", ["src/a.js"]), "p1")?.task.id === 1);
check("verifying 也算占用", engine.findTouchConflict(conflictCore, mkTask(3, "queued", ["README.md"]), "p1")?.task.id === 4);
check("accepted 未合并也算占用", engine.findTouchConflict(conflictCore, mkTask(3, "queued", ["lib/x.js"]), "p1")?.task.id === 2);
const noTouchCore = { state: { tasks: [mkTask(1, "running", []), mkTask(2, "running", [])] } };
check("无 touches 不拦", engine.findTouchConflict(noTouchCore, mkTask(3, "queued", []), "p1") === null);

/* ───────────── 输入上限 ───────────── */
console.log("[输入上限]");
check("1MB brief 拒绝", engine.validateTaskInput({ title: "t", brief: "A".repeat(1024 * 1024), dod: [] }).code === "brief-too-large");
check("32KB 内 brief 通过", engine.validateTaskInput({ title: "t", brief: "A".repeat(32 * 1024), dod: [] }).ok === true);
check("DoD 31 条拒绝", engine.validateTaskInput({ title: "t", brief: "b", dod: new Array(31).fill("x") }).code === "dod-too-large");
check("空标题拒绝", engine.validateTaskInput({ title: "  ", brief: "b" }).code === "bad-title");

/* ───────────── 已结束任务不可重开 ───────────── */
console.log("[状态机]");
const endedTask = { id: 1, projectId: "p1", status: "accepted", sessionId: "s", slots: 1, size: "xs", touches: [], title: "t" };
const endedCore = { state: { tasks: [endedTask], projects: [{ id: "p1", slotBudget: 4 }], settings: { globalSlotBudget: 8 } }, log() {} };
check("accepted 不能 rework", (await engine.reworkTask(endedCore, 1, "x")).code === "state");
check("accepted 不能 prompt", (await engine.promptTask(endedCore, 1, "x")).code === "state");
endedTask.status = "merged";
check("merged 不能 rework", (await engine.reworkTask(endedCore, 1, "x")).code === "state");
const runningTask = { id: 3, projectId: "p1", status: "running", sessionId: "s3", slots: 1, size: "xs", worktreePath: "/nonexistent", title: "r" };
const runningCore = { state: { tasks: [runningTask], projects: [{ id: "p1", slotBudget: 4 }], settings: { globalSlotBudget: 8 } }, log() {} };
check("running 不能人工验收", (await engine.acceptTask(runningCore, 3, { by: "operator" })).code === "state");

const endedDispatchCore = { state: { tasks: [{ id: 5, projectId: "p1", status: "accepted", slots: 1, size: "xs", touches: [], title: "t" }], projects: [{ id: "p1", slotBudget: 4 }], settings: { globalSlotBudget: 8 } }, log() {} };
check("accepted 不能重新派发", (await engine.dispatchTask(endedDispatchCore, 5)).code === "state");
check("accepted 不能放弃", (await engine.abandonTask(endedDispatchCore, 5, "x")).code === "state");
endedDispatchCore.state.tasks[0].status = "merged";
check("merged 不能重新派发", (await engine.dispatchTask(endedDispatchCore, 5)).code === "state");
check("merged 不能放弃", (await engine.abandonTask(endedDispatchCore, 5, "x")).code === "state");

const reviewingCore = {
  state: {
    tasks: [
      { id: 6, projectId: "p1", status: "running", slots: 1, size: "xs", title: "占槽" },
      { id: 7, projectId: "p1", status: "verifying", sessionId: "s7", slots: 1, size: "xs", title: "验收中" },
    ],
    projects: [{ id: "p1", slotBudget: 2 }],
    settings: { globalSlotBudget: 2 },
  },
  reviewing: new Set([7]),
  log() {},
};
check("判定进行中不能打回", (await engine.reworkTask(reviewingCore, 7, "x")).code === "busy");
check("判定进行中不能补指令", (await engine.promptTask(reviewingCore, 7, "x")).code === "busy");

const verdictCore = {
  stateDir: tmp,
  stateFile: join(tmp, "verdict-state.json"),
  log() {},
  reviewing: new Set([8]),
  ctx: { get: (name) => ({
    agents: { get: () => ({ followup() {}, session: {} }) },
    sessions: { flush: async () => {} },
  })[name] },
  state: {
    version: 1,
    counters: { task: 8, run: 1, batch: 0, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", slotBudget: 4 }],
    tasks: [{ id: 8, projectId: "p1", status: "verifying", sessionId: "s8", slots: 1, size: "xs", title: "t", runCount: 1, reworkRounds: 0 }],
    runs: [{ id: "r1", taskId: 8, sessionId: "s8", endedAt: new Date().toISOString() }],
    batches: [], questions: [], lead: { sessionId: null },
    reviewLog: [], stats: { review: { runs: 0, accepted: 0, reworked: 0, needInfo: 0, failed: 0, tokens: 0 } },
  },
};
const reviewRework = await engine.applyReviewVerdict(verdictCore, 8, "r1", { verdict: "rework", feedback: "补一条失败用例", confidence: "high" });
check("判定器自己的 rework 结论能执行", reviewRework.ok === true && verdictCore.state.tasks[0].status === "running" && verdictCore.state.tasks[0].reworkRounds === 1, JSON.stringify(reviewRework).slice(0, 120));

/* ───────────── 待澄清恢复要过槽位 ───────────── */
console.log("[澄清恢复]");
const answerCore = {
  stateDir: tmp,
  stateFile: join(tmp, "answer-state.json"),
  log() {},
  ctx: { get: (name) => ({
    agents: { get: () => ({ followup() {}, session: {} }) },
    sessions: { flush: async () => {} },
  })[name] },
  state: {
    counters: { run: 0 },
    tasks: [
      { id: 8, projectId: "p1", status: "running", slots: 1, size: "xs", title: "占槽" },
      { id: 9, projectId: "p1", status: "needs_input", sessionId: "s9", slots: 1, size: "xs", title: "待澄清" },
    ],
    projects: [{ id: "p1", slotBudget: 1 }],
    settings: { globalSlotBudget: 1 },
    questions: [{ id: "q9", taskId: 9, projectId: "p1", status: "open", text: "怎么做？" }],
    runs: [],
    lead: { sessionId: null },
  },
  log() {},
};
const answered = await engine.answerQuestion(answerCore, "q9", "这样做");
check("槽位满时回答不把任务恢复成 running", answered.ok === false && answered.code === "slots" && answerCore.state.tasks[1].status === "needs_input", JSON.stringify(answered).slice(0, 120));
check("槽位满时问题保持待澄清，可重试", answerCore.state.questions[0].status === "open");
answerCore.state.tasks[0].status = "accepted";
const answered2 = await engine.answerQuestion(answerCore, "q9", "这样做");
check("槽位空出后回答能恢复任务", answered2.ok === true && answerCore.state.tasks[1].status === "running", JSON.stringify(answered2).slice(0, 160));

/* ───────────── 自测/退出码/ squash 基线 ───────────── */
console.log("[自测与退出码]");
check("node check.mjs 算自测", engine.isSelfTestCommand("node check.mjs") === true);
check("pnpm test 算自测", engine.isSelfTestCommand("pnpm test") === true);
check("make check 算自测", engine.isSelfTestCommand("make check") === true);
check("pytest 算自测", engine.isSelfTestCommand("python -m pytest") === true);
check("promoted 命令不算成功", engine.exitCodeOf("partial\n[still running after 120000ms; moved to background job j1]", "bash") === null);
check("timeout 命令不算成功", engine.exitCodeOf("partial\n[timed out after 120000ms]", "bash") === null);
check("killed 命令不算成功", engine.exitCodeOf("partial\n[killed by signal: SIGKILL]", "bash") === null);
const corrected = engine.computeSelfTest([
  { command: "node check.mjs", ok: true, kind: undefined },
  { command: "echo noise", ok: true, kind: undefined },
], ["node check.mjs"]);
check("项目 verify 命令计入自测", corrected.total === 1 && corrected.passed === 1, JSON.stringify(corrected));

console.log("[squash 基线]");
const sqRepo = join(tmp, "sq-repo");
mkdirSync(sqRepo);
execFileSync("bash", ["-c", `cd ${sqRepo} && git init -q -b main && git config user.email t@e && git config user.name t && echo base > a.txt && git add . && git commit -qm base && git worktree add -q ${join(tmp, "sq-wt")} -b feature`]);
const sqWt = join(tmp, "sq-wt");
writeFileSync(join(sqWt, "a.txt"), "base\nfeature1\n");
execFileSync("bash", ["-c", "git add -A && git commit -qm feat1 && echo two >> a.txt && git add -A && git commit -qm feat2"], { cwd: sqWt });
writeFileSync(join(sqRepo, "base-only.txt"), "keep\n");
execFileSync("bash", ["-c", "git add -A && git commit -qm base-advance"], { cwd: sqRepo });
const sq = await engine.squashTaskCommit(sqWt, "main", "task");
const sqStat = execFileSync("git", ["-C", sqRepo, "show", "--stat", "--oneline", sq.head], { encoding: "utf8" });
check("squash 不把新 base 文件算成删除", !sqStat.includes("base-only.txt") && sqStat.includes("a.txt"), sqStat);

/* ───────────── 批次合并/回滚 ───────────── */
console.log("[批次回滚]");
const rvRepo = join(tmp, "rv-repo");
mkdirSync(rvRepo);
execFileSync("bash", ["-c", `cd ${rvRepo} && git init -q -b main && git config user.email t@e && git config user.name t && echo base > a.txt && git add . && git commit -qm base && git checkout -qb feature/1-x && echo task > rv.txt && git add . && git commit -qm task && git checkout -q main && git branch dsh/integration-test/rv1 && git worktree add -q ${join(tmp, "rv-wt")} dsh/integration-test/rv1`]);
const rvWt = join(tmp, "rv-wt");
execFileSync("bash", ["-c", "git merge --squash --no-edit feature/1-x && git commit --no-verify -qm task"], { cwd: rvWt });
const rvBase = execFileSync("git", ["-C", rvRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const rvBackup = "refs/dsh/base-backup/rv1";
execFileSync("git", ["-C", rvRepo, "update-ref", rvBackup, rvBase]);
const rvCore = {
  home: tmp,
  stateDir: tmp,
  evidenceDir: join(tmp, "rv-evidence"),
  stateFile: join(tmp, "rv-state.json"),
  log() {},
  ctx: { get: () => undefined },
  state: {
    version: 1,
    counters: { task: 1, run: 0, batch: 1, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", name: "rv", repoPath: rvRepo, baseBranch: "main", worktreeRoot: join(tmp, "rv-wts"), slotBudget: 4, setup: {}, verify: { commands: [] } }],
    tasks: [{ id: 1, projectId: "p1", status: "accepted", size: "xs", slots: 1, branch: "feature/1-x", worktreePath: null, title: "t" }],
    runs: [],
    batches: [{ id: "b1", projectId: "p1", taskIds: [1], status: "awaiting_confirmation", testBranch: "dsh/integration-test/rv1", testWorktree: rvWt, baseShaBefore: rvBase, backupRef: rvBackup, perTask: [], commands: [], failures: [], verdict: "all-green" }],
    questions: [], lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
  },
};
const ffRv = await engine.ffBatch(rvCore, "b1", "fast-forward");
check("批次可推送到 main", ffRv.ok === true && ffRv.batch.status === "merged", JSON.stringify(ffRv).slice(0, 120));
const branchKept = execFileSync("git", ["-C", rvRepo, "branch", "--list", "feature/1-x"], { encoding: "utf8" }).trim();
check("推送后保留任务分支（供回滚后重新集成）", branchKept !== "");
const backupAfterFf = execFileSync("git", ["-C", rvRepo, "rev-parse", rvBackup], { encoding: "utf8" }).trim();
check("备份 ref 仍指向合并前", backupAfterFf === rvBase);
// 模拟旧版本留下的数据：backupRef 已被改成合并后提交；回滚应退到 baseShaBefore。
execFileSync("git", ["-C", rvRepo, "update-ref", rvBackup, ffRv.mergedSha]);
const revRv = await engine.revertBatch(rvCore, "b1");
const headAfterRev = execFileSync("git", ["-C", rvRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
check("回滚把 base 恢复到合并前", revRv.ok === true && headAfterRev === rvBase && !existsSync(join(rvRepo, "rv.txt")), `${headAfterRev.slice(0, 8)} vs ${rvBase.slice(0, 8)}`);
check("回滚后任务回到 accepted", rvCore.state.tasks[0].status === "accepted", rvCore.state.tasks[0].status);
const nonMerged = await engine.revertBatch(rvCore, "b1");
check("非 merged 批次不能回滚", nonMerged.ok === false && nonMerged.code === "state", JSON.stringify(nonMerged).slice(0, 120));

/* ───────────── 派发途中取消 ───────────── */
console.log("[派发取消]");
const raceRepo = join(tmp, "race-repo");
mkdirSync(raceRepo);
execFileSync("bash", ["-c", `cd ${raceRepo} && git init -q -b main && git config user.email t@e && git config user.name t && echo base > a.txt && git add . && git commit -qm base`]);
const raceRoot = join(tmp, "race-wts");
mkdirSync(raceRoot);
const raceTask = { id: 1, projectId: "p1", title: "race", type: "feature", status: "queued", size: "xs", slots: 1, branch: null, worktreePath: null, sessionId: null, runCount: 0, touches: [], dependsOn: [] };
const raceCore = {
  home: tmp,
  stateDir: tmp,
  evidenceDir: join(tmp, "race-evidence"),
  stateFile: join(tmp, "race-state.json"),
  log() {},
  hiddenSessions: new Set(),
  cancelled: false,
  ctx: { get: (name) => ({
    agents: {
      async create({ sessionId }) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        raceCore.state.tasks[0].status = "abandoned"; // 模拟用户在派发途中点了取消
        return { agent: { id: sessionId, session: { id: sessionId }, followup() {}, cancel() { raceCore.cancelled = true; } } };
      },
      get: (id) => ({ id, session: { id }, followup() {}, cancel() { raceCore.cancelled = true; } }),
    },
    sessions: { flush: async () => {} },
  })[name] },
  state: {
    version: 1,
    counters: { task: 1, run: 0, batch: 0, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", name: "race", repoPath: raceRepo, baseBranch: "main", worktreeRoot: raceRoot, slotBudget: 4, setup: {}, verify: { commands: [] }, workerFilePolicy: "danger-full-access" }],
    tasks: [raceTask], runs: [], batches: [], questions: [], lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
  },
};
const raceDispatch = await engine.dispatchTask(raceCore, 1);
check("派发中被取消时不把任务改回 running", raceDispatch.ok === false && raceCore.state.tasks[0].status === "abandoned" && raceCore.state.runs.length === 0, JSON.stringify(raceDispatch).slice(0, 120));
check("派发中被取消时清理 worktree/分支", !existsSync(join(raceRoot, "t1")) && !execFileSync("git", ["-C", raceRepo, "branch", "--list", "feature/1-race"], { encoding: "utf8" }).trim());
check("派发中被取消时取消已建会话", raceCore.cancelled === true);

/* ───────────── 迟到的验收/打回结果 ───────────── */
console.log("[取消与迟到结果]");
const accRepo = join(tmp, "acc-repo");
mkdirSync(accRepo);
execFileSync("bash", ["-c", `cd ${accRepo} && git init -q -b main && git config user.email t@e && git config user.name t && echo base > a.txt && git add . && git commit -qm base && git worktree add -q -b feature/1-acc ${join(tmp, "acc-wt")}`]);
const accWt = join(tmp, "acc-wt");
writeFileSync(join(accWt, "f.txt"), "task\n");
execFileSync("git", ["add", "-A"], { cwd: accWt });
const accCore = {
  home: tmp, stateDir: tmp, evidenceDir: join(tmp, "acc-evidence"), stateFile: join(tmp, "acc-state.json"),
  log() {}, hiddenSessions: new Set(), ctx: { get: () => undefined },
  state: {
    version: 1, counters: { task: 1, run: 1, batch: 0, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", name: "acc", repoPath: accRepo, baseBranch: "main", worktreeRoot: join(tmp, "acc-wts"), slotBudget: 4, verify: { commands: [] } }],
    tasks: [{ id: 1, projectId: "p1", title: "t", type: "feature", status: "verifying", size: "xs", slots: 1, branch: "feature/1-acc", worktreePath: accWt, sessionId: "s1", runCount: 1 }],
    runs: [{ id: "r1", taskId: 1, sessionId: "s1", endedAt: new Date().toISOString() }],
    batches: [], questions: [], lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
  },
};
const accP = engine.acceptTask(accCore, 1, { by: "operator" });
setTimeout(() => { accCore.state.tasks[0].status = "abandoned"; }, 0);
const accRes = await accP;
check("squash 期间被取消时 accept 不生效", accRes.ok === false && accCore.state.tasks[0].status === "abandoned" && !accCore.state.tasks[0].acceptance, JSON.stringify(accRes).slice(0, 120));

const rwCore = {
  home: tmp, stateDir: tmp, evidenceDir: join(tmp, "rw-evidence"), stateFile: join(tmp, "rw-state.json"),
  log() {}, hiddenSessions: new Set(), reviewing: new Set(),
  ctx: { get: (name) => ({
    agents: { get: () => ({ followup() {}, session: {} }) },
    sessions: { flush: async () => { await new Promise((resolve) => setTimeout(resolve, 20)); } },
  })[name] },
  state: {
    version: 1, counters: { task: 1, run: 1, batch: 0, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", slotBudget: 4 }],
    tasks: [{ id: 1, projectId: "p1", title: "t", status: "needs_review", size: "xs", slots: 1, sessionId: "s1", runCount: 1 }],
    runs: [{ id: "r1", taskId: 1, sessionId: "s1", endedAt: new Date().toISOString() }],
    batches: [], questions: [], lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
  },
};
const rwP = engine.reworkTask(rwCore, 1, "改一下");
setTimeout(() => { rwCore.state.tasks[0].status = "abandoned"; }, 0);
const rwRes = await rwP;
check("打回过程中被取消时不再改回 running", rwRes.ok === false && rwCore.state.tasks[0].status === "abandoned" && rwCore.state.runs.length === 1, JSON.stringify(rwRes).slice(0, 120));

const ignCore = {
  log() {},
  state: {
    tasks: [{ id: 1, status: "abandoned" }],
    runs: [{ id: "r1", taskId: 1 }], reviewLog: [], stats: { review: { runs: 0, accepted: 0, reworked: 0, needInfo: 0, failed: 0, tokens: 0 } },
  },
};
const ignored = await engine.applyReviewVerdict(ignCore, 1, "r1", { verdict: "accept", confidence: "high" });
check("已取消任务的迟到判定被忽略、不记 error", ignored.ok === true && ignored.ignored === true && ignCore.state.reviewLog.length === 0 && ignCore.state.tasks[0].status === "abandoned", JSON.stringify(ignored).slice(0, 120));

/* ───────────── 项目配置校验 ───────────── */
console.log("[项目配置]");
const updCore = {
  home: tmp,
  stateDir: tmp,
  evidenceDir: join(tmp, "upd-evidence"),
  stateFile: join(tmp, "upd-state.json"),
  log() {},
  ctx: { get: () => undefined },
  state: {
    version: 1,
    counters: { task: 0, run: 0, batch: 0, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", name: "upd", repoPath: raceRepo, baseBranch: "main", worktreeRoot: join(tmp, "upd-wts"), slotBudget: 4 }],
    tasks: [], runs: [], batches: [], questions: [], lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
  },
};
const badBase = await engine.updateProject(updCore, "p1", { baseBranch: "no-such-branch" });
check("base 分支不存在时拒绝更新", badBase.ok === false && badBase.code === "no-base" && updCore.state.projects[0].baseBranch === "main", JSON.stringify(badBase).slice(0, 100));
const goodBase = await engine.updateProject(updCore, "p1", { baseBranch: "main", slotBudget: 3 });
check("合法 base 分支可以更新", goodBase.ok === true && updCore.state.projects[0].slotBudget === 3);

/* ───────────── 集成并发 ───────────── */
console.log("[集成并发]");
const busyCore = {
  log() {},
  state: {
    version: 1,
    counters: { task: 1, run: 0, batch: 2, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", repoPath: raceRepo, baseBranch: "main", slotBudget: 4 }],
    tasks: [{ id: 1, projectId: "p1", status: "accepted", size: "xs", slots: 1, title: "t" }],
    runs: [], batches: [{ id: "b1", projectId: "p1", status: "running", taskIds: [1] }],
    questions: [], lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
  },
};
const busyIntegrate = await engine.integrate(busyCore, "p1", [1]);
check("同项目 running 批次未结束时拒绝新集成", busyIntegrate.ok === false && busyIntegrate.code === "busy" && busyCore.state.counters.batch === 2, JSON.stringify(busyIntegrate).slice(0, 100));

/* ───────────── 插件重载中断的集成批次 ───────────── */
console.log("[集成中断恢复]");
const recRepo = join(tmp, "rec-repo");
mkdirSync(recRepo);
mkdirSync(join(tmp, "rec-wts"), { recursive: true });
execFileSync("bash", ["-c", `cd ${recRepo} && git init -q -b main && git config user.email t@e && git config user.name t && echo base > a.txt && git add . && git commit -qm base && git branch dsh/integration-test/rb1 && git worktree add -q ${join(tmp, "rec-wts", "integration-rb1")} dsh/integration-test/rb1`]);
const recCore = {
  instanceId: "test-instance",
  home: tmp,
  stateDir: tmp,
  evidenceDir: join(tmp, "rec-evidence"),
  stateFile: join(tmp, "rec-state.json"),
  log() {},
  state: {
    version: 1,
    counters: { task: 0, run: 0, batch: 1, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [{ id: "p1", name: "rec", repoPath: recRepo, baseBranch: "main", worktreeRoot: join(tmp, "rec-wts"), slotBudget: 4 }],
    tasks: [], runs: [], questions: [], lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
    batches: [{ id: "rb1", projectId: "p1", taskIds: [], status: "running", testBranch: "dsh/integration-test/rb1", testWorktree: null }],
  },
};
await engine.reclaimOrphanDispatches(recCore);
check("重载后 running 批次转 failed", recCore.state.batches[0].status === "failed" && recCore.state.batches[0].verdict === "plugin-reload", recCore.state.batches[0].status);
check("中断批次 worktree 已清", !existsSync(join(tmp, "rec-wts", "integration-rb1")));
const recBranches = execFileSync("git", ["-C", recRepo, "branch", "--list", "dsh/integration-test/rb1"], { encoding: "utf8" }).trim();
check("中断批次分支已清", recBranches === "");

/* ───────────── 卡住的 verifying 看门狗 ───────────── */
console.log("[验收看门狗]");
const stuckCore = {
  stateDir: tmp,
  stateFile: join(tmp, "stuck-state.json"),
  log() {},
  reviewing: new Set(),
  ctx: { get: () => undefined },
  state: {
    version: 1,
    settings: { reviewMode: "reviewer" },
    projects: [{ id: "p1", slotBudget: 4 }],
    tasks: [{ id: 11, projectId: "p1", status: "verifying", size: "xs", slots: 1, sessionId: "s11", title: "stuck" }],
    runs: [{ id: "r11", taskId: 11, sessionId: "s11", endedAt: new Date().toISOString(), reviewRequestedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(), reviewAttempts: 2 }],
    reviewLog: [],
    stats: { review: {} },
  },
};
await engine.maybeRetryStuckReviews(stuckCore);
check("重试 2 次仍卡 10 分钟的 verifying 转人工", stuckCore.state.tasks[0].status === "needs_review", stuckCore.state.tasks[0].status);

/* ───────────── HTTP 请求体形状 ───────────── */
console.log("[HTTP 请求体]");
const httpCore = {
  stateDir: tmp,
  stateFile: join(tmp, "http-state.json"),
  log() {},
  state: {
    version: 1,
    counters: { task: 0, run: 0, batch: 0, question: 0 },
    settings: { globalSlotBudget: 8 },
    projects: [], tasks: [], runs: [], batches: [], questions: [],
    lead: { sessionId: null }, reviewLog: [], stats: { review: {} },
  },
};
const handler = engine.createHandler(httpCore);
const invoke = async (bodyText) => {
  const req = {
    url: "/project-console-api/task/add",
    method: "POST",
    headers: { "x-project-console": "1" },
    on(event, cb) {
      if (event === "data") cb(Buffer.from(bodyText));
      else if (event === "end") cb();
    },
    destroy() {},
  };
  const res = {
    status: null,
    body: "",
    writeHead(status) { this.status = status; },
    end(text) { this.body = text; },
  };
  await handler(req, res);
  return { status: res.status, json: JSON.parse(res.body) };
};
const nullBody = await invoke("null");
check("null 请求体返回 400，不是 500", nullBody.status === 400 && nullBody.json.code === "bad-body", `${nullBody.status} ${JSON.stringify(nullBody.json).slice(0, 100)}`);
const arrayBody = await invoke("[]");
check("数组请求体返回 400", arrayBody.status === 400 && arrayBody.json.code === "bad-body");
const objectBody = await invoke(JSON.stringify({ projectId: "missing" }));
check("对象请求体正常走到路由", objectBody.status === 404 && objectBody.json.code === "no-project", `${objectBody.status} ${JSON.stringify(objectBody.json).slice(0, 100)}`);
const hugeBody = await invoke("A".repeat(13 * 1024 * 1024));
check("超过 12MB 的请求体返回 413（不是断连）", hugeBody.status === 413 && /过大/.test(hugeBody.json.error ?? ""), `${hugeBody.status} ${JSON.stringify(hugeBody.json).slice(0, 100)}`);

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
