/**
 * dsh-project-console host engine（自动生成，请改 src/*.js 后重新运行 node build-host.mjs）。
 * 由 node build-host.mjs 生成，请勿手改。
 * 说明：单文件、无相对 import —— 便于 thin entry 用 ?v=<mtime> 整包热替换。
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, realpathSync, cpSync, statSync, lstatSync, readdirSync, rmSync, rmdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, basename, dirname, extname, sep } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// ───────────────────────────── core.js ─────────────────────────────
/**
 * 工程台 host 半边 · 核心：路径、状态存储、通用工具。
 *
 * 为什么不用 ctx.storageDomain：第三方 host 代码不能用裸包名 import
 * @deepseek-ai/*（实机 /selftest 已验证：link: 安装的插件不在运行时解析图的
 * 双锚搜索路径里）。权威状态因此落在 $DSH_HOME/project-console/state.json，
 * 由本模块原子写（临时文件 + rename），单 writer（host 进程）顺序化。
 *
 * 事实依据：research/plugin/API.md §2.8（storageDomain 落盘位置与写语义反面
 * 印证）与 S0 探针 /selftest 结论（R1 不成立 → 走纯文件持久化）。
 */





const PLUGIN_ROOT_ROUTE = "/project-console-api";

/* ────────────────────────────── 路径 ────────────────────────────── */

function dshHome() {
  return process.env.DSH_HOME && process.env.DSH_HOME.length > 0
    ? process.env.DSH_HOME
    : join(homedir(), ".dsh");
}

function makeCore(ctx) {
  const home = dshHome();
  const stateDir = join(home, "project-console");
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(join(stateDir, "logs"), { recursive: true });
  const core = {
    ctx,
    instanceId: randomUUID(),
    home,
    stateDir,
    stateFile: join(stateDir, "state.json"),
    evidenceDir: join(stateDir, "evidence"),
    state: null,
    loading: null,
    saveTail: Promise.resolve(),
    saveTimer: null,
    lastDiskSample: 0,
    diskSample: null,
    logFile: join(stateDir, "logs", "host.log"),
    log: (...args) => {
      const line = `[${new Date().toISOString()}] ${args.map((a) => (typeof a === "string" ? a : safeJson(a))).join(" ")}`;
      try {
        writeFileSync(core.logFile, line + "\n", { flag: "a" });
      } catch { /* ignore */ }
      // eslint-disable-next-line no-console
      console.log("[project-console]", ...args);
    },
  };
  return core;
}

function safeJson(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

function nowIso() { return new Date().toISOString(); }

function hashOf(s) {
  return createHash("sha1").update(String(s)).digest("hex").slice(0, 12);
}

/* ────────────────────────────── 状态 ────────────────────────────── */

function defaultState() {
  return {
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    counters: { task: 0, run: 0, batch: 0, question: 0 },
    settings: {
      globalSlotBudget: 8,
      globalDiskBudgetGB: 60,
      autoDispatch: true,
      leadSessionId: null,
      leadStatus: null,
      // 「需求体检 + 反问」策略：lead 在派发前若发现需求含糊/疑似伪需求，
      // 先走 project_question 而不是硬干（见 tools 里 project_challenge）。
      clarifyFirst: true,
      // 低/中/高工作量各自用哪个模型（null = 跟随项目 workerModel / 部署默认）。
      // 工作量由 AI 判定，人员只在设置里配置档位对应模型。
      workloadModels: defaultWorkloadModels(),
      // 工作台自己的模型（工程台会话 + 工作量判定）：null = 部署默认。
      workbenchModel: null,
      // 上下文管理（plan-context v0.1）：自动验收由一次性判定器执行，不再进常驻 lead；
      // lead 会话超限轮换；工具输出按字节封顶。
      reviewMode: "reviewer", // reviewer | lead | off
      reviewerModel: null, // {provider,model,reasoningEffort}；null = 工作台模型 + high
      leadCtxLimitTokens: 100000,
      leadKeepMessages: 10,
      leadBriefBytes: 1600,
      toolOutputLimitBytes: 6144,
      estimatorRotateEvery: 20,
      reviewTimeoutMs: 120000,
      // 自动返工上限：连续多次 rework 仍失败时转人工，避免死循环烧 token。
      maxReworkRounds: 5,
      // need_info 时宿主复跑项目验证命令，把「没跑测试」这类缺证据补成硬证据。
      hostVerifyOnAccept: true,
      hostVerifyOnNeedInfo: true,
      hostVerifyTimeoutMs: 120000,
      // 复跑后仍 need_info 时，起一次性只读深审；再不行才转人工。
      deepReview: true,
      deepReviewTimeoutMs: 150000,
      // 验收截图内联：视觉类任务给判定器最多 N 张图。
      reviewImages: true,
      reviewImageMax: 3,
    },
    projects: [],
    tasks: [],
    runs: [],
    batches: [],
    questions: [],
    lead: { sessionId: null, createdAt: null, lastPromptAt: null, presetId: null, epoch: 1, pendingContinuation: null, previousSessionId: null },
    // 自动验收判定记录（最近 100 条）+ 计数，供简报/看板/状态接口用。
    reviewLog: [],
    stats: { review: { runs: 0, accepted: 0, reworked: 0, needInfo: 0, failed: 0, tokens: 0 } },
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * 校验并归一化从磁盘读到的状态结构。
 * 只做「不丢数据」的修复：缺 settings/projects/tasks/runs 属于坏结构，拒绝加载；
 * 缺可选数组/字段、数组里混了 null 之类的，补默认值并过滤。
 * 返回 { ok, state?, repaired?, reason? }。
 */
function normalizeLoadedState(raw) {
  if (!isPlainObject(raw)) return { ok: false, reason: "state 不是对象" };
  const bad = [];
  if (!isPlainObject(raw.settings)) bad.push("settings");
  for (const key of ["projects", "tasks", "runs"]) {
    if (!Array.isArray(raw[key])) bad.push(key);
  }
  if (bad.length > 0) return { ok: false, reason: `缺少或类型不对：${bad.join(", ")}` };

  const defaults = defaultState();
  const state = raw;
  let repaired = false;
  if (state.version !== 1) { state.version = 1; repaired = true; }
  if (!state.createdAt) { state.createdAt = defaults.createdAt; repaired = true; }
  if (!state.updatedAt) { state.updatedAt = defaults.updatedAt; repaired = true; }

  // 可选数组：缺失就补，条目里的非对象直接过滤，避免 taskView/stateView 读 null 崩。
  for (const key of ["batches", "questions", "reviewLog"]) {
    if (!Array.isArray(state[key])) { state[key] = []; repaired = true; }
  }
  for (const key of ["projects", "tasks", "runs", "batches", "questions", "reviewLog"]) {
    const before = state[key].length;
    state[key] = state[key].filter(isPlainObject);
    if (state[key].length !== before) repaired = true;
  }
  // 旧项目没有 workerFilePolicy：按 autonomy 兼容推导；新项目由 addProject 显式写入。
  for (const project of state.projects) {
    if (project.workerFilePolicy !== "workspace-write" && project.workerFilePolicy !== "danger-full-access") {
      project.workerFilePolicy = project.autonomy === "unleashed" ? "danger-full-access" : "workspace-write";
      repaired = true;
    }
  }

  if (!isPlainObject(state.counters)) { state.counters = { ...defaults.counters }; repaired = true; }
  for (const key of Object.keys(defaults.counters)) {
    if (!Number.isFinite(Number(state.counters[key]))) { state.counters[key] = defaults.counters[key]; repaired = true; }
  }

  if (!isPlainObject(state.settings)) { state.settings = {}; repaired = true; }
  for (const key of Object.keys(defaults.settings)) {
    if (state.settings[key] === undefined) { state.settings[key] = defaults.settings[key]; repaired = true; }
  }
  // 全局槽位必须始终是 1–16 的整数：手改/坏接口写成 NaN 会让槽位比较恒为 false，调度等于不限并发。
  const slotBudget = Math.max(1, Math.min(16, Math.round(Number(state.settings.globalSlotBudget) || defaults.settings.globalSlotBudget)));
  if (state.settings.globalSlotBudget !== slotBudget) { state.settings.globalSlotBudget = slotBudget; repaired = true; }
  // 档位模型配置：旧状态没有该字段 / 手改坏了都收敛成合法结构。
  state.settings.workloadModels = normalizeWorkloadModels(state.settings.workloadModels);
  state.settings.workbenchModel = normalizeModelSelection(state.settings.workbenchModel);
  // 这四项是验收链路的固定行为，不再暴露成开关；旧状态里被关掉的也强制打开。
  state.settings.hostVerifyOnAccept = true;
  state.settings.hostVerifyOnNeedInfo = true;
  state.settings.deepReview = true;
  state.settings.reviewImages = true;
  state.settings.reviewImageMax = Math.max(1, Math.min(8, Number(state.settings.reviewImageMax) || 3));
  state.settings.maxReworkRounds = Math.max(1, Math.min(20, Number(state.settings.maxReworkRounds) || 5));

  if (state.reviewLog.length > 100) { state.reviewLog = state.reviewLog.slice(-100); repaired = true; }
  if (!isPlainObject(state.stats)) { state.stats = {}; repaired = true; }
  if (!isPlainObject(state.stats.review)) { state.stats.review = { ...defaults.stats.review }; repaired = true; }
  for (const key of Object.keys(defaults.stats.review)) {
    if (!Number.isFinite(Number(state.stats.review[key]))) { state.stats.review[key] = defaults.stats.review[key]; repaired = true; }
  }
  if (!isPlainObject(state.lead)) { state.lead = { ...defaults.lead }; repaired = true; }
  else { state.lead = { ...defaults.lead, ...state.lead }; }
  if (!Number.isFinite(Number(state.lead.epoch))) { state.lead.epoch = 1; repaired = true; }
  return { ok: true, state, repaired };
}

/** 读取磁盘状态（同步、幂等）；不存在则创建默认状态。坏状态先备份，不让插件起不来。 */
async function ensureState(core) {
  if (core.state !== null) return core.state;
  if (core.loading !== null) return core.loading;
  core.loading = (async () => {
    let state = defaultState();
    let backupReason = null;
    let repaired = false;
    if (existsSync(core.stateFile)) {
      try {
        const raw = JSON.parse(readFileSync(core.stateFile, "utf8"));
        const normalized = normalizeLoadedState(raw);
        if (normalized.ok) { state = normalized.state; repaired = normalized.repaired === true; }
        else backupReason = normalized.reason ?? "结构不完整";
      } catch (error) {
        backupReason = String(error?.message ?? error);
      }
      if (backupReason !== null) {
        const broken = `${core.stateFile}.broken-${Date.now()}`;
        try { renameSync(core.stateFile, broken); } catch { /* ignore */ }
        core.log("state.json 无效，已备份为", broken, backupReason);
        state = defaultState();
      }
    }
    core.state = state;
    // 坏结构恢复成默认状态 / 修过可选字段时落一次盘，避免每次启动重复修。
    if (backupReason !== null || repaired) {
      try { saveNow(core); } catch (error) { core.log("状态修复落盘失败（继续用内存状态）", String(error)); }
    }
    return state;
  })().catch((error) => {
    // 兜底：连默认状态都修不出来也不能让所有路由永远 500。
    core.log("state 加载异常，回退默认状态", String(error));
    core.state = defaultState();
    return core.state;
  });
  return core.loading;
}

/** 同步保存（用于关键路径：派发/验收/合并前确保落盘）。 */
function saveNow(core) {
  const state = core.state;
  if (state === null) return;
  state.updatedAt = nowIso();
  const tmp = core.stateFile + ".tmp-" + randomUUID().slice(0, 8);
  writeFileSync(tmp, JSON.stringify(state, null, 1), "utf8");
  renameSync(tmp, core.stateFile);
}

/** 去抖保存（UI 操作/状态投影用）。 */
function scheduleSave(core, delay = 250) {
  if (core.saveTimer !== null) return;
  core.saveTimer = setTimeout(() => {
    core.saveTimer = null;
    try { saveNow(core); } catch (error) { core.log("保存失败", String(error)); }
  }, delay);
  if (typeof core.saveTimer.unref === "function") core.saveTimer.unref();
}

/** 修改状态并递增版本号。 */
function mutate(core, fn) {
  const state = core.state;
  const before = safeJson(state);
  fn(state);
  if (safeJson(state) !== before) {
    state.version += 1;
    state.updatedAt = nowIso();
    scheduleSave(core);
  }
  return state;
}

/* ────────────────────────────── 通用工具 ────────────────────────────── */

function uuid() { return randomUUID(); }

function slugify(text, maxLen = 40) {
  const base = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const ascii = base.replace(/[\u4e00-\u9fa5]/g, "");
  const cleaned = (ascii.length >= 4 ? ascii : base).replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (cleaned || "task").slice(0, maxLen);
}

const SIZE_SLOTS = { xs: 1, s: 1, m: 2, l: 4, xl: 6 };

/* ────────────────────── 工作量档位（AI 判定 → 档位 → 模型） ────────────────────── */

/**
 * 工作量三档：低 / 中 / 高。任务 size（xs/s/m/l/xl）只影响槽位，
 * 档位决定派发时用哪个模型（settings.workloadModels）。
 */
const WORKLOAD_TIERS = ["low", "medium", "high"];
const WORKLOAD_TIER_LABELS = { low: "低", medium: "中", high: "高" };
/** size → 工作量档位；未知 size 按「中」处理（与 slotsOf 的兜底一致）。 */
const SIZE_TIER = { xs: "low", s: "low", m: "medium", l: "high", xl: "high" };

function workloadTierOfSize(size) {
  return SIZE_TIER[size] ?? "medium";
}

function workloadTierLabel(size) {
  return WORKLOAD_TIER_LABELS[workloadTierOfSize(size)] ?? "中";
}

/** 工作量档位模型配置：{low:null|{provider,model,reasoningEffort}, medium:..., high:...}。 */
function defaultWorkloadModels() {
  return { low: null, medium: null, high: null };
}

/** 单个模型选择：{provider, model, reasoningEffort?}；非法/缺省一律 null（= 部署默认）。 */
function normalizeModelSelection(raw) {
  if (raw === null || raw === undefined || typeof raw !== "object") return null;
  const provider = typeof raw.provider === "string" ? raw.provider.trim() : "";
  const model = typeof raw.model === "string" ? raw.model.trim() : "";
  if (provider === "" || model === "") return null;
  const reasoningEffort = typeof raw.reasoningEffort === "string" ? raw.reasoningEffort.trim() : "";
  return { provider, model, ...(reasoningEffort === "" ? {} : { reasoningEffort }) };
}

/** 规整外部传入的档位模型配置：非法/缺省一律回落 null（= 跟随项目/部署默认）。 */
function normalizeWorkloadModels(raw) {
  const out = defaultWorkloadModels();
  if (raw === null || raw === undefined || typeof raw !== "object") return out;
  for (const tier of WORKLOAD_TIERS) {
    const item = raw[tier];
    if (item === null || item === undefined) continue;
    if (typeof item !== "object") continue;
    const provider = typeof item.provider === "string" ? item.provider.trim() : "";
    const model = typeof item.model === "string" ? item.model.trim() : "";
    if (provider === "" || model === "") continue;
    const reasoningEffort = typeof item.reasoningEffort === "string" ? item.reasoningEffort.trim() : "";
    out[tier] = { provider, model, ...(reasoningEffort === "" ? {} : { reasoningEffort }) };
  }
  return out;
}

function slotsOf(task) {
  return task.slots ?? SIZE_SLOTS[task.size] ?? 2;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function tail(text, limit = 1400) {
  const s = String(text ?? "");
  if (s.length <= limit) return s;
  const head = s.slice(0, 240);
  return `${head}\n…（省略 ${s.length - limit - 240} 字符）…\n${s.slice(-(limit - 240))}`;
}

/** 从字符串末尾取不超过 bytes 字节的最长后缀长度（UTF-8 安全，不切断多字节字符）。 */
function fitSuffixChars(s, bytes) {
  if (Buffer.byteLength(s, "utf8") <= bytes) return s.length;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (Buffer.byteLength(s.slice(s.length - mid), "utf8") <= bytes) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * 按 UTF-8 字节封顶：保留头 60% + 尾 30%，中间注明省略量。
 * 用于工具输出与简报——单条有上限，避免一条命令把上下文灌满。
 */
function capBytes(value, limit = 6144) {
  const s = String(value ?? "");
  const max = Math.max(256, Number(limit) || 6144);
  if (Buffer.byteLength(s, "utf8") <= max) return s;
  const headBytes = Math.floor(max * 0.6);
  const tailBytes = Math.floor(max * 0.3);
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (Buffer.byteLength(s.slice(0, mid), "utf8") <= headBytes) lo = mid;
    else hi = mid - 1;
  }
  const head = s.slice(0, lo);
  const tailLen = fitSuffixChars(s, tailBytes);
  const tailText = tailLen > 0 ? s.slice(s.length - tailLen) : "";
  const omitted = s.length - head.length - tailText.length;
  return `${head}\n…（输出过长，已省略 ${omitted} 字符；需要全量请分次查询）…\n${tailText}`;
}

/**
 * 在指定 cwd 跑 shell 命令（/bin/bash -lc）。host 进程执行，不受会话沙箱限制——
 * 这正是 plan §4.4「隔离工作区由 host 自己 shell 建」的本意。
 */
function runShell(command, options = {}) {
  const {
    cwd = process.cwd(),
    timeoutMs = 10 * 60 * 1000,
    env = {},
  } = options;
  return new Promise((resolvePromise) => {
    const startedAt = Date.now();
    let child;
    try {
      child = spawn("/bin/bash", ["-lc", command], {
        cwd,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      resolvePromise({ command, cwd, exitCode: null, stdout: "", stderr: String(error), ok: false, timedOut: false, ms: 0 });
      return;
    }
    let stdout = "";
    let stderr = "";
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
    }, Math.max(1000, timeoutMs));
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ command, cwd, exitCode: null, stdout, stderr: stderr + String(error), ok: false, timedOut: false, ms: Date.now() - startedAt });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({
        command,
        cwd,
        exitCode: code,
        stdout,
        stderr,
        ok: code === 0 && !killed,
        timedOut: killed,
        ms: Date.now() - startedAt,
        tail: tail(`${stdout}\n${stderr}`),
      });
    });
  });
}

/** 直接 spawn 一个可执行文件（git 等），不做 shell 展开。 */
function run(command, args, options = {}) {
  const { cwd = process.cwd(), timeoutMs = 120000, env = {} } = options;
  return new Promise((resolvePromise) => {
    const startedAt = Date.now();
    let child;
    try {
      child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resolvePromise({ command: `${command} ${args.join(" ")}`, cwd, exitCode: null, stdout: "", stderr: String(error), ok: false, timedOut: false, ms: 0 });
      return;
    }
    let stdout = "";
    let stderr = "";
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
    }, Math.max(1000, timeoutMs));
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ command: `${command} ${args.join(" ")}`, cwd, exitCode: null, stdout, stderr: stderr + String(error), ok: false, timedOut: false, ms: Date.now() - startedAt });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({
        command: `${command} ${args.join(" ")}`,
        cwd,
        exitCode: code,
        stdout,
        stderr,
        ok: code === 0 && !killed,
        timedOut: killed,
        ms: Date.now() - startedAt,
        tail: tail(`${stdout}\n${stderr}`),
      });
    });
  });
}

async function realpathSafe(p) {
  try { return realpathSync(resolve(p)); } catch { return resolve(p); }
}

function readJsonFile(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; }
}

function writeJsonFile(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${randomUUID().slice(0, 8)}`;
  writeFileSync(tmp, JSON.stringify(value, null, 1), "utf8");
  renameSync(tmp, file);
}
// ───────────────────────────── git.js ─────────────────────────────
/**
 * 工程台 host 半边 · git：仓库校验、worktree 生命周期、分支与合并。
 *
 * 边界依据（plan §4.5 / §4.5.1 / §4.8）：
 *  - worktree 一律建在仓库外（worktreeRoot），gitdir 写主仓 .git/worktrees；
 *  - 分支 type/<taskId>-<slug>，从 baseBranch 切；
 *  - 宿主 squash 成 1 个提交；
 *  - 集成批次：从 base 建 dsh/integration-test/<batch>，先打 refs/dsh/base-backup/<ts>；
 *  - 推送到 main（本地快进 base，不推远端）只在 /batch/ff 显式 confirm 后执行。
 */



/** `git <args>` 的封装，返回 {ok, stdout, stderr, exitCode}。 */
async function git(cwd, args, options = {}) {
  const r = await run("git", args, { cwd, timeoutMs: options.timeoutMs ?? 120000 });
  return { ...r, out: r.stdout.trim(), err: r.stderr.trim() };
}

/**
 * 工程台内部路径（参考截图附件等）。
 * 这是宿主在派发时预置的输入，不是任务改动：diff 统计和验收提交都要排除。
 */
function isConsoleInternalPath(filePath) {
  const normalized = String(filePath ?? "").replace(/^\.\//, "");
  return normalized === ".project-console" || normalized.startsWith(".project-console/");
}

async function isGitRepo(path) {
  if (!existsSync(path)) return false;
  const r = await git(path, ["rev-parse", "--show-toplevel"]);
  return r.ok;
}

async function repoTop(path) {
  const r = await git(path, ["rev-parse", "--show-toplevel"]);
  return r.ok ? r.out : null;
}

async function currentBranch(repoPath) {
  const r = await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return r.ok ? r.out : null;
}

async function headSha(repoPath) {
  const r = await git(repoPath, ["rev-parse", "HEAD"]);
  return r.ok ? r.out : null;
}

async function statusPorcelain(repoPath, options = {}) {
  // -uall：新目录里的每个未跟踪文件单独列出（默认会折叠成 "?? docs/"），
  // 验收判定器需要看到具体文件名和内容。
  const args = ["status", "--porcelain"];
  if (options.all === true) args.push("-uall");
  const r = await git(repoPath, args);
  return r.ok ? r.out : null;
}

async function refExists(repoPath, ref) {
  const r = await git(repoPath, ["show-ref", "--verify", "--quiet", `refs/heads/${ref}`, "refs/remotes/origin/" + ref]);
  if (r.ok) return true;
  const r2 = await git(repoPath, ["rev-parse", "--verify", "--quiet", ref]);
  return r2.ok;
}

async function branchSha(repoPath, ref) {
  const r = await git(repoPath, ["rev-parse", "--verify", ref]);
  return r.ok ? r.out : null;
}

/** 主仓快照（漂移检测）：HEAD + status 哈希。 */
async function repoSnapshot(repoPath) {
  const head = await headSha(repoPath);
  const status = (await statusPorcelain(repoPath)) ?? "";
  return { head, statusHash: hashOf(status), status, at: nowIso() };
}

/** 分支是否已存在（本地）。 */
async function localBranchExists(repoPath, branch) {
  const r = await git(repoPath, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
  return r.ok;
}

/** 创建一个任务 worktree。返回 {ok, worktreePath, branch, error?}。 */
async function addWorktree(repoPath, worktreePath, branch, baseRef) {
  mkdirSync(dirname(worktreePath), { recursive: true });
  if (existsSync(worktreePath) && existsSync(join(worktreePath, ".git"))) {
    return { ok: true, reused: true, worktreePath, branch };
  }
  const branchExists = await localBranchExists(repoPath, branch);
  const args = branchExists
    ? ["worktree", "add", worktreePath, branch]
    : ["worktree", "add", "-b", branch, worktreePath, baseRef];
  const r = await git(repoPath, args, { timeoutMs: 120000 });
  if (!r.ok) return { ok: false, error: tail(`${r.err}\n${r.out}`), worktreePath, branch };
  return { ok: true, reused: false, worktreePath, branch };
}

async function removeWorktree(repoPath, worktreePath, options = {}) {
  if (!worktreePath) return { ok: true, skipped: true };
  const r = await git(repoPath, ["worktree", "remove", "--force", worktreePath], { timeoutMs: 120000 });
  // 目录被删但登记残留时兜底 prune。
  await git(repoPath, ["worktree", "prune"]);
  return { ok: r.ok, error: r.ok ? undefined : tail(r.err), out: r.out };
}

async function deleteBranch(repoPath, branch) {
  return git(repoPath, ["branch", "-D", branch]);
}

/** 复制 gitignore 的本地依赖（setup.copy 的 from→to 语义）。 */
function copyInto(from, toPath) {
  mkdirSync(dirname(toPath), { recursive: true });
  cpSync(from, toPath, { recursive: true, dereference: false });
}

/** 跑一条 setup 命令。 */
async function runRecipeCommands(commands, cwd, env = {}, timeoutMs = 10 * 60 * 1000) {
  const results = [];
  for (const command of commands ?? []) {
    const r = await runShell(command, { cwd, env, timeoutMs });
    results.push({ command, exitCode: r.exitCode, ok: r.ok, timedOut: r.timedOut, tail: r.tail, ms: r.ms });
    if (!r.ok) break;
  }
  return results;
}

/** 目录大小（MB），异步 du。 */
async function dirSizeMB(path) {
  if (!existsSync(path)) return 0;
  const r = await runShell(`du -sm ${JSON.stringify(path)} 2>/dev/null | cut -f1`, { timeoutMs: 30000 });
  const n = Number(String(r.stdout).trim());
  return Number.isFinite(n) ? n : 0;
}

/* ────────────────────── 任务分支提交（宿主 squash） ────────────────────── */

/**
 * 在任务 worktree 里把当前改动 squash 成 1 个提交（基于 base 的单一提交）。
 * 已提交/未提交都收敛为「相对 base 恰好一个 commit」，便于集成时逐任务一个 commit。
 */
async function squashTaskCommit(worktreePath, baseRef, message) {
  const baseSha = await branchSha(worktreePath, baseRef);
  if (baseSha === null) return { ok: false, error: `base ref ${baseRef} not found in worktree` };
  // 用 merge-base 做 squash 基线：base 在任务期间前进时，不要 reset 到新 base，
  // 否则旧 worktree 树会把新 base 里的文件「反向删除」。
  const mergeBase = await git(worktreePath, ["merge-base", baseSha, "HEAD"]);
  const forkSha = mergeBase.ok && mergeBase.out !== "" ? mergeBase.out : baseSha;
  const status = await statusPorcelain(worktreePath);
  if (status === null) return { ok: false, error: "git status failed" };
  if (status.trim() !== "") {
    // .project-console/ 是工程台预置的附件目录，不属于任务改动，不进提交。
    const add = await git(worktreePath, ["add", "-A", "--", ".", ":(exclude).project-console"]);
    if (!add.ok) return { ok: false, error: `git add failed: ${add.err}` };
    // 允许空提交？不：没改动就不提交（附件目录是唯一改动时也走这里）。
    const staged = await git(worktreePath, ["diff", "--cached", "--quiet"]);
    if (!staged.ok) {
      const commit = await git(worktreePath, ["commit", "--no-verify", "-m", message], { timeoutMs: 120000 });
      if (!commit.ok) return { ok: false, error: `git commit failed: ${tail(commit.err || commit.out)}` };
    }
  }
  // 收敛为相对 base 一个提交：重置到 base（soft），再提交一次。
  const countR = await git(worktreePath, ["rev-list", "--count", `${forkSha}..HEAD`]);
  const count = Number(countR.out) || 0;
  if (count > 1) {
    const reset = await git(worktreePath, ["reset", "--soft", forkSha]);
    if (!reset.ok) return { ok: false, error: `git reset failed: ${reset.err}` };
    const commit = await git(worktreePath, ["commit", "--no-verify", "-m", message], { timeoutMs: 120000 });
    if (!commit.ok) return { ok: false, error: `git commit failed: ${tail(commit.err || commit.out)}` };
  }
  if (count === 0) {
    // 没有任何任务改动：返回 head，让上层标注 no-change。
    const head = await headSha(worktreePath);
    return { ok: true, skipped: true, head, diffStat: "", filesChanged: 0, files: [] };
  }
  const head = await headSha(worktreePath);
  const statR = await git(worktreePath, ["diff", "--numstat", `${forkSha}..HEAD`]);
  const files = parseNumstat(statR.out).filter((file) => !isConsoleInternalPath(file.path));
  const added = files.reduce((a, f) => a + f.additions, 0);
  const removed = files.reduce((a, f) => a + f.deletions, 0);
  return {
    ok: true,
    skipped: false,
    head,
    baseSha: forkSha,
    diffStat: `+${added}/-${removed}`,
    filesChanged: files.length,
    files: files.slice(0, 200),
  };
}

function parseNumstat(out) {
  const entries = new Map();
  for (const line of String(out ?? "").split("\n")) {
    if (!line.trim()) continue;
    const [addedRaw, removedRaw, ...rest] = line.split("\t");
    // `git diff --no-index /dev/null <file>` 输出的是 `/dev/null => <file>`。
    const filePath = rest.join("\t").replace(/^\/dev\/null => /, "");
    if (!filePath) continue;
    const additions = addedRaw === "-" ? 0 : Number(addedRaw) || 0;
    const deletions = removedRaw === "-" ? 0 : Number(removedRaw) || 0;
    const prev = entries.get(filePath) ?? { path: filePath, additions: 0, deletions: 0 };
    prev.additions += additions;
    prev.deletions += deletions;
    entries.set(filePath, prev);
  }
  return [...entries.values()];
}

/**
 * 未跟踪文件（任务新建的文件）的 numstat。
 * `git diff` 默认不含 untracked，任务只加新文件时证据会显示 0 个文件，所以单独补。
 * 二进制文件按 git 习惯记 0/0（显示成「二进制」）；不进 index，避免污染 agent 工作区。
 */
async function untrackedNumstat(worktreePath) {
  const listed = await git(worktreePath, ["ls-files", "--others", "--exclude-standard", "-z"]);
  if (!listed.ok || listed.out === "") return [];
  const paths = String(listed.out).split("\0").filter(Boolean).slice(0, 100);
  const entries = [];
  for (const filePath of paths) {
    if (isConsoleInternalPath(filePath)) continue;
    // --no-index 在两边有差异时退出码 1，属正常；只看 stdout。
    const r = await run("git", ["diff", "--no-index", "--numstat", "--", "/dev/null", filePath], {
      cwd: worktreePath,
      timeoutMs: 30000,
    });
    if (r.stdout) entries.push(...parseNumstat(r.stdout));
  }
  return entries;
}

/**
 * 任务相对 base 的改动统计：未提交改动（工作树 vs 分支 tip）+ 未跟踪的新文件。
 * 注意：
 *  - 只跑一次 numstat：`git diff <sha>` 已同时覆盖 staged/unstaged，跑两次会把行数翻倍；
 *  - 如果 agent 自己在本分支上提交过，这一步只统计剩余未提交改动，
 *    验收时的 squash 提交按 project.baseBranch 计算，仍会给出权威的完整清单。
 */
async function diffStat(worktreePath, baseRef) {
  const baseTip = await branchSha(worktreePath, baseRef);
  if (baseTip === null) return { diffStat: "", filesChanged: 0, files: [] };
  const changed = await git(worktreePath, ["diff", "--numstat", baseTip]);
  const untracked = await untrackedNumstat(worktreePath);
  const files = parseNumstat(changed.out).filter((file) => !isConsoleInternalPath(file.path)).concat(untracked);
  const added = files.reduce((a, f) => a + f.additions, 0);
  const removed = files.reduce((a, f) => a + f.deletions, 0);
  return { diffStat: `+${added}/-${removed}`, filesChanged: files.length, files: files.slice(0, 200) };
}

/**
 * 工作区相对 base 的 diff 文本（含未跟踪文件清单与小文件内容），给一次性验收判定器用。
 * 与 diffStat 同一个基线口径；排除工程台内部路径（参考截图附件）。
 */
async function diffText(worktreePath, baseRef, maxBytes = 12288) {
  const baseTip = await branchSha(worktreePath, baseRef);
  const parts = [];
  if (baseTip !== null) {
    const d = await git(worktreePath, ["diff", "--no-color", "--no-ext-diff", baseTip], { timeoutMs: 60000 });
    if (d.ok && d.out) parts.push(d.out);
  }
  const status = (await statusPorcelain(worktreePath, { all: true })) ?? "";
  const untracked = status
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3).trim())
    .filter((p) => p !== "" && !isConsoleInternalPath(p));
  if (untracked.length > 0) {
    parts.push(`\n=== 未跟踪文件（diff 不含）===\n${untracked.slice(0, 30).join("\n")}`);
    for (const rel of untracked.slice(0, 3)) {
      try {
        const abs = join(worktreePath, rel);
        const st = lstatSync(abs);
        if (st.isSymbolicLink()) {
          parts.push(`--- ${rel}（符号链接，内容不展开）`);
          continue;
        }
        if (!st.isFile()) continue;
        if (st.size > 2000) {
          parts.push(`--- ${rel}（新文件，${st.size} 字节，内容未展开）`);
          continue;
        }
        const buf = readFileSync(abs);
        if (buf.includes(0)) {
          parts.push(`--- ${rel}（二进制，${st.size} 字节）`);
          continue;
        }
        parts.push(`--- ${rel}（新文件，${st.size} 字节）---\n${buf.toString("utf8")}`);
      } catch { /* ignore */ }
    }
  }
  const text = parts.join("\n").trim();
  if (text === "") return "";
  return Buffer.byteLength(text, "utf8") <= maxBytes ? text : capBytes(text, maxBytes);
}

/* ─────────────────────────── 集成批次 ─────────────────────────── */

/**
 * 建集成测试分支 + 备份 ref，逐任务 squash-merge（每个任务一个 commit），再跑集成命令。
 * 失败不更新 base；成功也只到 awaiting_confirmation，等 /batch/ff 显式确认。
 */
async function createIntegrationBatch(core, project, tasks, batchId, commands, timeoutMs) {
  const repo = project.repoPath;
  const baseRef = project.baseBranch;
  const baseSha = await branchSha(repo, baseRef);
  if (baseSha === null) return { ok: false, error: `base 分支 ${baseRef} 不存在` };
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const backupRef = `refs/dsh/base-backup/${stamp}-${batchId}`;
  const backup = await git(repo, ["update-ref", backupRef, baseSha]);
  if (!backup.ok) return { ok: false, error: `打备份 ref 失败：${backup.err}` };

  const testBranch = `dsh/integration-test/${batchId}`;
  const worktree = join(project.worktreeRoot, `integration-${batchId}`);
  const add = await addWorktree(repo, worktree, testBranch, baseSha);
  if (!add.ok) return { ok: false, error: `建集成 worktree 失败：${add.error}`, backupRef, baseSha };

  // 集成 worktree 也需要项目 setup 配方（依赖/配置）——否则 tsc/vitest 直接 not found。
  // 这是实测踩过的坑：只在任务派发时跑了 setup，集成阶段忘了，typecheck exit 127。
  const setupResults = [];
  for (const spec of project.setup?.copy ?? []) {
    const from = resolve(project.repoPath, spec.from ?? spec);
    const to = resolve(worktree, spec.to ?? (spec.from ?? spec));
    if (!existsSync(from)) continue;
    const cp = await runShell(`cp -a ${JSON.stringify(from)} ${JSON.stringify(to)}`, { cwd: worktree, timeoutMs: 600000 });
    setupResults.push({ step: "copy", from, to, exitCode: cp.exitCode, ok: cp.ok, tail: cp.tail });
    if (!cp.ok) return { ok: false, error: `集成 setup.copy 失败：${spec.from}`, backupRef, baseSha, testWorktree: worktree, testBranch };
  }
  for (const command of project.setup?.commands ?? []) {
    const r = await runShell(command, { cwd: worktree, env: project.setup?.env ?? {}, timeoutMs: 900000 });
    setupResults.push({ step: "command", command, exitCode: r.exitCode, ok: r.ok, tail: r.tail, ms: r.ms });
    if (!r.ok) return { ok: false, error: `集成 setup 命令失败：${command}`, backupRef, baseSha, testWorktree: worktree, testBranch, setupResults };
  }

  const perTask = [];
  const failures = [];
  for (const task of tasks) {
    const merge = await git(worktree, ["merge", "--squash", "--no-edit", task.branch], { timeoutMs: 180000 });
    if (!merge.ok) {
      const conflictFiles = (await git(worktree, ["diff", "--name-only", "--diff-filter=U"])).out;
      await git(worktree, ["reset", "--hard", "HEAD"]);
      failures.push({ taskId: task.id, stage: "merge", error: tail(merge.err || merge.out), conflictFiles });
      break;
    }
    // 旧版验收提交可能把工程台附件目录（.project-console/）带进任务分支；集成时一律剔除，
    // 只从 index 移除、不动工作树，避免把宿主预置的输入文件写进 base。
    const internalFiles = await git(worktree, ["ls-files", "--", ".project-console"]);
    if (internalFiles.ok && internalFiles.out.trim() !== "") {
      await git(worktree, ["rm", "-r", "--cached", "--quiet", "--", ".project-console"]);
    }
    const commit = await git(worktree, [
      "commit", "--no-verify", "-m",
      `${task.type}: #${task.id} ${task.title}\n\nTask: #${task.id}\nSession: ${task.sessionId ?? "-"}`,
    ], { timeoutMs: 60000 });
    if (!commit.ok) {
      // 空提交（任务无改动）跳过，不阻断批次。
      const isNothing = /nothing to commit|no changes added/i.test(commit.out + commit.stderr);
      perTask.push({ taskId: task.id, commit: null, skipped: isNothing, error: isNothing ? undefined : tail(commit.err) });
      if (!isNothing) { failures.push({ taskId: task.id, stage: "commit", error: tail(commit.err) }); break; }
      continue;
    }
    const sha = await headSha(worktree);
    perTask.push({ taskId: task.id, commit: sha });
  }

  const commandResults = [];
  if (failures.length === 0) {
    for (const command of commands ?? []) {
      const r = await runShell(command, { cwd: worktree, timeoutMs });
      commandResults.push({ command, exitCode: r.exitCode, ok: r.ok, timedOut: r.timedOut, tail: r.tail, ms: r.ms });
      if (!r.ok) break;
    }
  }
  const passed = failures.length === 0 && commandResults.every((c) => c.ok);
  return {
    ok: true,
    passed,
    baseSha,
    backupRef,
    testBranch,
    testWorktree: worktree,
    perTask,
    failures,
    commandResults,
    setupResults,
    verdict: passed ? "all-green" : "failed",
  };
}

/** 清理集成 worktree（保留分支，等 ff/revert 后再删）。 */
async function cleanupIntegrationWorktree(project, batch) {
  if (!batch.testWorktree) return { ok: true, skipped: true };
  return removeWorktree(project.repoPath, batch.testWorktree);
}

/**
 * 推送到 main：把本地 base 快进到批次测试结果，不推远端。调用方必须先做人工确认（/batch/ff 的 confirm 字段）。
 * 要求主仓当前在 base 分支且工作区干净。
 */
async function fastForwardBase(project, batch) {
  const repo = project.repoPath;
  const branch = await currentBranch(repo);
  if (branch !== project.baseBranch) {
    return { ok: false, code: "wrong-branch", error: `主仓当前在 ${branch}，要求 ${project.baseBranch}` };
  }
  const status = await statusPorcelain(repo);
  if (status === null) return { ok: false, code: "git-failed", error: "git status 失败" };
  if (status.trim() !== "") {
    return { ok: false, code: "dirty", error: `主仓工作区不干净，拒绝推送：\n${tail(status, 600)}` };
  }
  const merge = await git(repo, ["merge", "--ff-only", batch.testBranch], { timeoutMs: 120000 });
  if (!merge.ok) return { ok: false, code: "ff-failed", error: tail(merge.err || merge.out) };
  const sha = await headSha(repo);
  // backupRef 必须保持指向合并前的 base：它是「回滚」的唯一依据。
  // 旧实现在这里把 backupRef 改成了合并后提交，导致回滚 reset 到当前 HEAD（等于没回滚）。
  return { ok: true, mergedSha: sha, workingTree: "updated" };
}

async function revertBase(project, batch) {
  const repo = project.repoPath;
  const backup = await branchSha(repo, batch.backupRef);
  // baseShaBefore 是集成开始时记下的 base，回滚以它为准；backupRef 只作兜底。
  // 旧版本会把 backupRef 改成合并后提交，靠 baseShaBefore 仍能把历史批次回滚回来。
  const target = batch.baseShaBefore || backup;
  if (!target) return { ok: false, error: "没有可用的合并前基准（baseShaBefore / 备份 ref 都缺失），无法回滚" };
  const branch = await currentBranch(repo);
  if (branch !== project.baseBranch) return { ok: false, error: `主仓当前不在 ${project.baseBranch}` };
  // 只允许回滚「最新一次合并」：base 又被推进过（新提交/新批次）时硬重置会把这些改动一起抹掉。
  const head = await headSha(repo);
  if (batch.mergedSha && head !== batch.mergedSha) {
    return { ok: false, code: "stale", error: `base 在批次 ${batch.id} 合并后又被推进过（当前 ${String(head).slice(0, 8)}，批次 ${String(batch.mergedSha).slice(0, 8)}），不能硬回滚；请先处理后续提交或批次` };
  }
  if (batch.mergedSha) {
    const ancestor = await git(repo, ["merge-base", "--is-ancestor", target, batch.mergedSha]);
    if (!ancestor.ok) {
      return { ok: false, code: "stale", error: "记录的合并前 base 不是批次提交的祖先，拒绝硬回滚（状态可能被手改过）" };
    }
  }
  const status = await statusPorcelain(repo);
  if (status === null) return { ok: false, code: "git-failed", error: "git status 失败" };
  if (status.trim() !== "") {
    return { ok: false, code: "dirty", error: `主仓工作区不干净，回滚会丢掉未提交改动：\n${tail(status, 600)}` };
  }
  const reset = await git(repo, ["reset", "--hard", target]);
  if (!reset.ok) return { ok: false, error: tail(reset.err) };
  return { ok: true, restoredSha: target };
}
// ───────────────────────────── service.js ─────────────────────────────
/**
 * 工程台 host 半边 · 业务服务：项目/任务/派发/证据/验收/集成/澄清/lead。
 *
 * 设计事实依据：research/plugin/API.md（会话创建、事件、权限、路由、工具、
 * 无法 import 内部包），plan §4.3–§4.9。
 */





const ACTIVE = new Set(["provisioning", "running", "verifying"]);
// 任务输入上限：防止一条超大 brief/DoD 把 state、/state 和 worker 首轮 prompt 一起放大。
const TASK_LIMITS = {
  titleBytes: 500,
  briefBytes: 32 * 1024,
  dodItems: 30,
  dodItemBytes: 2 * 1024,
};
function validateTaskInput(input) {
  const title = String(input?.title ?? "").trim();
  if (title === "") return { ok: false, code: "bad-title", error: "标题不能为空" };
  if (Buffer.byteLength(title, "utf8") > TASK_LIMITS.titleBytes) {
    return { ok: false, code: "title-too-large", error: `标题超过 ${TASK_LIMITS.titleBytes} 字节，请缩短` };
  }
  const brief = String(input?.brief ?? "");
  if (Buffer.byteLength(brief, "utf8") > TASK_LIMITS.briefBytes) {
    return { ok: false, code: "brief-too-large", error: `需求 brief 超过 ${Math.round(TASK_LIMITS.briefBytes / 1024)}KB，请拆分或只保留关键内容` };
  }
  if (input?.dod !== undefined && !Array.isArray(input.dod)) {
    return { ok: false, code: "bad-dod", error: "DoD 必须是字符串数组" };
  }
  const dod = (input?.dod ?? []).map((item) => String(item));
  if (dod.length > TASK_LIMITS.dodItems) {
    return { ok: false, code: "dod-too-large", error: `DoD 超过 ${TASK_LIMITS.dodItems} 条，请合并或拆分任务` };
  }
  const longItem = dod.find((item) => Buffer.byteLength(item, "utf8") > TASK_LIMITS.dodItemBytes);
  if (longItem !== undefined) {
    return { ok: false, code: "dod-too-large", error: `单条 DoD 超过 ${Math.round(TASK_LIMITS.dodItemBytes / 1024)}KB，请缩短` };
  }
  return { ok: true, title, brief, dod };
}
// provider 503/限流等瞬时错误的自动重试策略：5 次，逐步拉长（30s/1m/2m/3m/4m）。
const PROVIDER_RETRY_MAX = 5;
const PROVIDER_RETRY_DELAYS_SEC = [30, 60, 120, 180, 240];
const REVIEW = new Set(["needs_review", "failed"]);
const DONE = new Set(["accepted", "merged", "abandoned"]);

/* ─────────────────────────── 服务取用 ─────────────────────────── */

function svc(core, name) {
  try {
    const v = core.ctx.get(name);
    return v ?? undefined;
  } catch {
    return undefined;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 给会话事件生成一行摘要（UI 会话面板用）。 */
function summarizeEvent(event) {
  if (!event || !event.type) return null;
  const d = event.data ?? {};
  const textOf = (content) => (Array.isArray(content)
    ? content.map((b) => (b && b.type === "text" ? b.text : "")).join("")
    : "");
  let summary = "";
  switch (event.type) {
    case "tool/call": summary = `调用 ${d.name ?? "tool"} ${String(d.arguments ?? "").slice(0, 120)}`; break;
    case "tool/result": {
      const c = d.message?.content ?? [];
      summary = `结果 ${textOf(c).replace(/\s+/g, " ").slice(0, 120)}`;
      break;
    }
    case "assistant/message": summary = textOf(d.message?.content ?? []).replace(/\s+/g, " ").slice(0, 160); break;
    case "user/message": summary = `用户消息 ${textOf(d.content ?? []).replace(/\s+/g, " ").slice(0, 120)}`; break;
    case "turn/start": summary = `turn #${d.turn ?? "?"} 开始`; break;
    case "turn/end": summary = `turn #${d.turn ?? "?"} 结束（${d.reason?.kind ?? "?"}）`; break;
    case "team/message/queued": summary = "队友消息排队"; break;
    default: return null;
  }
  return summary === "" ? null : { type: event.type, summary, time: event.time ?? Date.now() };
}

/** 会话是否隐藏（origin=subagent 的会话不出现在侧栏）。 */
function hiddenSessionList(core) {
  return new Set(core.hiddenSessions ?? []);
}

/**
 * 派发时按任务工作量档位选模型：
 *   档位配置（settings.workloadModels）→ 项目 workerModel → agents.create 的部署默认。
 * 返回 {} 表示交给 createHiddenSessionAt 的默认选择。
 */
function workloadModelOf(core, project, task) {
  const tier = workloadTierOfSize(task?.size);
  const configured = core.state?.settings?.workloadModels?.[tier] ?? null;
  if (configured && configured.provider && configured.model) {
    return {
      provider: configured.provider,
      model: configured.model,
      ...(configured.reasoningEffort ? { reasoningEffort: configured.reasoningEffort } : {}),
    };
  }
  if (project?.workerModel?.model) return { ...project.workerModel };
  return {};
}

/** 用 agents.create 直接建一个 origin=subagent 的会话（侧栏隐藏），meta.cwd=工作区。 */
async function createHiddenSession(core, project, worktreePath, task = null) {
  return createHiddenSessionAt(core, worktreePath, workloadModelOf(core, project, task));
}

/**
 * 通用：在任意 cwd 建隐藏会话（任务会话 / lead 会话 / 工作量评估会话共用）。
 * options.preset=false 时不挂 agent preset（评估会话不需要工具，挂上反而白带一大坨工具 schema）。
 */
async function createHiddenSessionAt(core, cwd, workerModel, contextEntry = null, options = {}) {
  const agents = svc(core, "agents");
  if (!agents || typeof agents.create !== "function") throw new Error("agents 服务不可用");
  let defaults = {};
  try {
    const adm = svc(core, "agentDefaultModel");
    if (adm && typeof adm.currentSelection === "function") defaults = adm.currentSelection() ?? {};
  } catch { /* ignore */ }
  const w = workerModel ?? {};
  const provider = w.provider ?? defaults.provider ?? "mtcode";
  const model = w.model ?? defaults.model ?? "deepseek-flash";
  const reasoningEffort = w.reasoningEffort ?? defaults.reasoningEffort;
  const agentOptions = {
    get provider() { return provider; },
    get model() { return model; },
    ...(reasoningEffort === undefined ? {} : { get reasoningEffort() { return reasoningEffort; } }),
  };
  // 关键：隐藏任务会话必须挂上默认 agent preset（standard），否则没有 bash/read/write 等工具，
  // 任务会话形同残废（实测 #7：unknown tool "bash"）。preset 挂载方式与 sessionController 内部
  // composeAgent() 一致：resolve 默认 preset → mount 到 agentKt。
  // 评估会话（options.preset === false）例外：纯文本判定，不需要工具。
  const presets = svc(core, "agentPresets");
  let presetId;
  let setup = async () => {};
  if (options.preset !== false && presets && typeof presets.resolve === "function") {
    const wanted = typeof options.presetId === "string" && options.presetId !== "" ? options.presetId : undefined;
    try {
      let resolvedPreset;
      if (wanted) {
        try {
          resolvedPreset = await presets.resolve(wanted);
        } catch (error) {
          core.log(`agentPresets.resolve(${wanted}) 失败，回退默认 preset`, String(error?.message ?? error));
          resolvedPreset = await presets.resolve(undefined);
        }
      } else {
        resolvedPreset = await presets.resolve(undefined);
      }
      presetId = resolvedPreset?.id;
      if (wanted && presetId !== wanted) core.log(`preset 回退：想要 ${wanted}，实际 ${presetId ?? "无"}`);
    } catch (error) {
      core.log("agentPresets.resolve 失败（隐藏会话无 preset）", String(error));
    }
  }
  if (presetId && typeof presets.mount === "function") {
    setup = async (agentCtx) => {
      await presets.mount(agentCtx, presetId);
    };
  }
  if (contextEntry) {
    const baseSetup = setup;
    setup = async (agentCtx) => {
      await baseSetup(agentCtx);
      try {
        agentCtx.systemPrompt?.context?.({ name: contextEntry.name, order: contextEntry.order ?? 130, text: contextEntry.text });
      } catch (error) {
        core.log("systemPrompt.context 注册失败", String(error));
      }
    };
  }
  // 判定器会话：把所有宿主全局工具（project_*、team_* 等）对本次会话屏蔽，
  // 只允许输出文字——避免模型无视「不调用工具」直接 project_accept 绕过判定。
  // 诊断会话：只屏蔽改状态的工具（project_* 写工具、write/edit、递归 diagnose），保留 read/grep/bash。
  if (options.restrictTools === true || Array.isArray(options.denyTools)) {
    const baseSetup = setup;
    setup = async (agentCtx) => {
      await baseSetup(agentCtx);
      try {
        const known = [...(agentCtx.tools?.view?.(agentCtx)?.knownNames ?? [])];
        const deny = options.restrictTools === true
          ? known
          : (options.denyTools ?? []).filter((name) => known.includes(name));
        if (deny.length > 0) agentCtx.tools.restrict({ deny });
        core.log(`session[${options.label ?? "restricted"}] 已屏蔽 ${deny.length} 个工具`);
      } catch (error) {
        core.log(`session[${options.label ?? "restricted"}] 屏蔽工具失败`, String(error?.message ?? error));
      }
    };
  }
  // 一次性会话（验收判定/仓库诊断）创建后打一行 schema 体积，用来验证窄 preset 是否生效。
  if (options.label) {
    const baseSetup = setup;
    setup = async (agentCtx) => {
      await baseSetup(agentCtx);
      try {
        const visible = agentCtx?.tools?.view?.(agentCtx)?.visible;
        const count = visible instanceof Map ? visible.size : 0;
        // 注意：这里只记可见工具数（近似）；实际请求 schema 以会话日志的 request/header 为准。
        core.log(`session[${options.label}] preset=${presetId ?? "none"} visibleTools=${count}`);
      } catch (error) {
        core.log(`session[${options.label}] schema 统计失败`, String(error?.message ?? error));
      }
    };
  }
  const sessionId = `session-${uuid()}`;
  const created = await agents.create({
    sessionId,
    agentOptions,
    meta: { cwd, origin: "subagent", ...(presetId === undefined ? {} : { agentPreset: presetId }) },
    setup,
  });
  const agent = created?.agent ?? created;
  if (!agent || !agent.session) throw new Error("agents.create 未返回 agent");
  core.hiddenSessions = core.hiddenSessions ?? new Set();
  core.hiddenSessions.add(agent.id ?? sessionId);
  core.log(`hidden session created ${agent.id ?? sessionId} cwd=${cwd}`);
  return { agent, sessionId: agent.id ?? sessionId, presetId: presetId ?? null };
}

/** 取活着的 agent：优先 agents.get（隐藏会话可拿），再退回 sessionController.resolveAgent。 */
async function resolvePromptAgent(core, sessionId) {
  const agents = svc(core, "agents");
  try {
    const a = agents && typeof agents.get === "function" ? agents.get(sessionId) : undefined;
    if (a !== undefined) return { agent: a };
  } catch { /* ignore */ }
  return waitForAgent(core, sessionId, 20000);
}

/* ─────────────────────── AI 工作量评估（工作量人不设置，AI 判定） ─────────────────────── */

/**
 * 评估器 persona：只输出一行 JSON。工作量只影响槽位与派发模型，不影响是否返工，
 * 所以判定标准写「宁小勿大」，避免 AI 为了保险把所有任务都判成大。
 */
const WORKLOAD_ESTIMATOR_PERSONA = [
  "你是「工程台」的工作量评估器，只判断需求该按哪一档工作量执行。",
  "输出要求：只输出一行 JSON，不要解释，不要 Markdown 代码块，不要调用任何工具。",
  '格式：{"size":"xs|s|m|l|xl","reason":"不超过 20 字的判断依据"}',
  "判定标准（按改动范围、跨模块程度和验证成本）：",
  "- xs：文案/配置/单文件几行改动；",
  "- s：单点小功能或 bug 修复，1-2 个文件，不需要跨模块协调；",
  "- m：一个完整功能或模块，多文件改动，需要自测；",
  "- l：跨模块/大范围重构/复杂 3D 场景或视频等，验证面广；",
  "- xl：跨项目/多阶段，或需要拆成多个任务才能安全执行。",
  "拿不准时宁小勿大：规模只影响槽位与派发模型，不影响是否返工。",
].join("\n");

/**
 * 工作台自己的模型（工程台 lead 会话 + 工作量判定用）。
 * 设置页配了就用设置的，否则 null = 部署默认（agents.create 的默认选择）。
 */
function workbenchModelOf(core) {
  const settings = core.state?.settings ?? {};
  return normalizeModelSelection(settings.workbenchModel) ?? normalizeModelSelection(settings.leadWorkerModel);
}

/** 评估会话用哪个模型：工作台模型 / 部署默认；能选低思考强度就选（评估是轻任务，要快）。 */
async function estimatorModelOf(core) {
  let selection = workbenchModelOf(core);
  if (!selection) {
    try {
      const adm = svc(core, "agentDefaultModel");
      if (adm && typeof adm.currentSelection === "function") selection = adm.currentSelection() ?? {};
    } catch { /* ignore */ }
  }
  if (!selection || !selection.provider || !selection.model) return undefined;
  const picked = { provider: selection.provider, model: selection.model };
  try {
    const llm = svc(core, "llm");
    if (llm && typeof llm.resolveModelInfo === "function") {
      const info = await llm.resolveModelInfo(selection.provider, selection.model);
      const ids = (info?.reasoning?.efforts ?? []).map((effort) => effort.id);
      if (ids.includes("low")) picked.reasoningEffort = "low";
      else if (ids.includes("off")) picked.reasoningEffort = "off";
    }
  } catch { /* 能力查不到就沿用部署默认思考强度 */ }
  return picked;
}

/**
 * 把当前工作台模型应用到这个活着的 lead 会话上（设置页保存后调用）。
 * 直接改 agent.model.select()，不走 sessionController.selectModel ——
 * 后者会把选择顺手写成部署默认模型（profile 配置），改工作台模型不该改全局默认。
 */
async function applyWorkbenchModel(core) {
  const sessionId = core.state?.lead?.sessionId;
  if (!sessionId) return { ok: true, applied: false, reason: "lead 会话还没创建" };
  let target = workbenchModelOf(core);
  if (!target) {
    // 用户清空配置 = 回到部署默认：把 lead 会话也切回默认选择。
    try {
      const adm = svc(core, "agentDefaultModel");
      if (adm && typeof adm.currentSelection === "function") target = adm.currentSelection() ?? null;
    } catch { /* ignore */ }
  }
  if (!target || !target.provider || !target.model) {
    return { ok: true, applied: false, reason: "没有可用的默认模型" };
  }
  const selection = {
    provider: target.provider,
    model: target.model,
    ...(target.reasoningEffort ? { reasoningEffort: target.reasoningEffort } : {}),
  };
  // 先校验模型/思考强度可用，免得把会话切成一个调不通的模型。
  try {
    const llm = svc(core, "llm");
    if (llm && typeof llm.resolveCallConfig === "function") await llm.resolveCallConfig(selection);
    else if (llm && typeof llm.resolveModelInfo === "function") await llm.resolveModelInfo(selection.provider, selection.model);
  } catch (error) {
    core.log("工作台模型不可用", String(error));
    return { ok: false, error: `模型不可用：${error instanceof Error ? error.message : String(error)}` };
  }
  try {
    // 只在 agent 已经活着时直接切；插件重载后 lead agent 会失效，别在这里轮询等 20s。
    const agents = svc(core, "agents");
    const agent = agents && typeof agents.get === "function" ? agents.get(sessionId) : undefined;
    if (!agent || !agent.model || typeof agent.model.select !== "function") {
      return { ok: true, applied: false, reason: "lead 会话 agent 已失效，下次重建会话时按新配置生效" };
    }
    agent.model.select(selection);
    core.log(`工作台模型已切换 ${selection.provider}/${selection.model}${selection.reasoningEffort ? `@${selection.reasoningEffort}` : ""} session=${sessionId}`);
    return { ok: true, applied: true, model: selection };
  } catch (error) {
    core.log("工作台模型切换失败（下次重建 lead 生效）", String(error));
    return { ok: false, error: String(error) };
  }
}

/** 取/建评估会话；插件重载或模型切换后会失效，这里按需重建。 */
async function ensureEstimator(core) {
  const rotateEvery = positiveInt(core.state.settings?.estimatorRotateEvery, 20, 1, 500);
  // 评估会话复用同一上下文，次数多了也会慢：到点重建，成本接近 0（每次只判一行 JSON）。
  if (core.estimatorSessionId && (core.estimatorCount ?? 0) >= rotateEvery) {
    core.log(`工作量评估会话已用 ${core.estimatorCount} 次，重建`);
    core.estimatorSessionId = null;
    core.estimatorCount = 0;
  }
  if (core.estimatorSessionId) {
    try {
      const alive = await resolvePromptAgent(core, core.estimatorSessionId);
      if (alive.agent) return { ok: true, sessionId: core.estimatorSessionId };
    } catch { /* 重建 */ }
  }
  try {
    const model = await estimatorModelOf(core);
    const created = await createHiddenSessionAt(
      core,
      core.stateDir,
      model,
      { name: "project-console:workload-estimator", order: 140, text: WORKLOAD_ESTIMATOR_PERSONA },
      { preset: false },
    );
    core.estimatorSessionId = created.sessionId;
    core.estimatorCount = 0;
    core.log(`工作量评估会话已创建 ${created.sessionId}`);
    return { ok: true, sessionId: created.sessionId };
  } catch (error) {
    core.estimatorSessionId = null;
    core.log("工作量评估会话创建失败", String(error));
    return { ok: false, error: String(error) };
  }
}

async function readSessionEvents(core, sessionId) {
  const sq = svc(core, "sessionQuery");
  if (!sq || typeof sq.readSession !== "function") return null;
  const read = await sq.readSession(sessionId);
  return Array.isArray(read?.events) ? read.events : [];
}

/** 等评估会话这一轮结束：看到 prompt 之后的 turn/end 后取最后一条 assistant 文本。 */
async function waitEstimatorReply(core, sessionId, afterSeq, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let events = [];
    try {
      events = await readSessionEvents(core, sessionId);
    } catch { events = []; }
    if (events !== null) {
      const fresh = events.filter((event) => Number(event?.seq ?? -1) > afterSeq);
      const ended = fresh.some((event) => event?.type === "turn/end");
      if (ended) {
        const texts = fresh
          .filter((event) => event.type === "assistant/message")
          .map((event) => messageText(event.data?.message?.content ?? []).trim())
          .filter((text) => text !== "");
        return { ok: true, text: texts.length > 0 ? texts[texts.length - 1] : "" };
      }
    }
    await sleep(200);
  }
  return { ok: false, error: "评估超时" };
}

/** 解析评估输出：优先 JSON，兜底裸尺寸词。 */
function parseWorkloadVerdict(text) {
  const raw = String(text ?? "").trim();
  if (raw === "") return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      const size = String(parsed?.size ?? "").trim().toLowerCase();
      if (Object.hasOwn(SIZE_SLOTS, size)) {
        const reason = typeof parsed?.reason === "string" ? parsed.reason.trim().slice(0, 60) : "";
        return { size, reason };
      }
    } catch { /* 继续尝试裸词 */ }
  }
  const token = raw.toLowerCase().match(/(?:^|\s)(xs|s|m|l|xl)(?:\s|$|,|。|，)/);
  if (token) return { size: token[1], reason: "" };
  return null;
}

/** 给评估器的用户消息：标题/类型 + 需求原文（截断，避免把整份 PRD 塞进去）。 */
function buildEstimatePrompt(task) {
  const brief = String(task.brief ?? "").trim();
  const clipped = brief.length > 4000 ? `${brief.slice(0, 4000)}\n…（原文过长，已截断）` : brief;
  return [
    "请判断下面这个工程台需求的工作量档位。",
    "只输出一行 JSON，例如：{\"size\":\"m\",\"reason\":\"多文件功能，需要自测\"}",
    "",
    `标题：${task.title ?? ""}`,
    `类型：${task.type ?? "feature"}`,
    "需求原文：",
    clipped === "" ? "（无）" : clipped,
  ].join("\n");
}

/**
 * AI 判工作量：串行执行（同一评估会话不能同时跑两个回合），失败返回 ok:false。
 * 返回 {ok, size, reason, model}。
 */
async function estimateWorkload(core, task) {
  const run = async () => {
    const estimator = await ensureEstimator(core);
    if (!estimator.ok) return { ok: false, error: estimator.error };
    const events = await readSessionEvents(core, estimator.sessionId);
    if (events === null) return { ok: false, error: "sessionQuery 不可用，读不到评估会话" };
    const afterSeq = events.length > 0 ? Number(events[events.length - 1].seq ?? 0) : 0;
    const sent = await promptSession(core, estimator.sessionId, buildEstimatePrompt(task));
    if (!sent.ok) {
      core.estimatorSessionId = null;
      return { ok: false, error: sent.error };
    }
    const reply = await waitEstimatorReply(core, estimator.sessionId, afterSeq);
    if (!reply.ok) {
      core.estimatorSessionId = null;
      return { ok: false, error: reply.error };
    }
    const verdict = parseWorkloadVerdict(reply.text);
    if (!verdict) {
      return { ok: false, error: `评估结果无法解析：${String(reply.text ?? "").slice(0, 120)}` };
    }
    core.estimatorCount = (core.estimatorCount ?? 0) + 1;
    return { ok: true, ...verdict };
  };
  const previous = core.estimatorTail ?? Promise.resolve();
  const current = previous.catch(() => {}).then(run);
  core.estimatorTail = current.catch(() => {});
  return current;
}

/**
 * 评估一个已有任务并写回 size/slots（创建时自动评估失败、或人工觉得判歪了用）。
 * 只允许非运行中任务重估。
 */
async function reestimateTask(core, taskId) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (ACTIVE.has(task.status)) return { ok: false, code: "state", error: `任务执行中（${task.status}），不能重估工作量` };
  const verdict = await estimateWorkload(core, task);
  if (!verdict.ok) {
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      if (t) {
        t.estimateError = String(verdict.error ?? "评估失败").slice(0, 300);
        t.updatedAt = nowIso();
      }
    });
    saveNow(core);
    return { ok: false, code: "estimate-failed", error: verdict.error };
  }
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    t.size = verdict.size;
    t.slots = SIZE_SLOTS[verdict.size];
    t.sizeSource = "ai";
    t.sizeReason = verdict.reason ?? "";
    t.estimateError = null;
    t.estimatedAt = nowIso();
    t.updatedAt = nowIso();
  });
  saveNow(core);
  core.log(`AI 重估工作量 #${task.id} → ${verdict.size}（${verdict.reason ?? ""}）`);
  return { ok: true, task: taskView(core, findTask(core, task.id)) };
}

/** 模型目录（设置页拉取）：providers + 各模型支持的思考强度；服务缺失时返回空目录。 */
async function modelCatalog(core) {
  const cached = core.modelCatalogCache;
  if (cached && Date.now() - cached.at < 30000) return cached.value;
  const empty = { providers: [], current: null };
  const llm = svc(core, "llm");
  if (!llm || typeof llm.listProviders !== "function") return empty;
  let current = null;
  try {
    const adm = svc(core, "agentDefaultModel");
    if (adm && typeof adm.currentSelection === "function") current = adm.currentSelection() ?? null;
  } catch { /* ignore */ }
  const providers = [];
  for (const provider of llm.listProviders()) {
    const models = [];
    try {
      for (const model of await llm.listModels(provider.id)) {
        let reasoning = null;
        try {
          const info = await llm.resolveModelInfo(provider.id, model.id);
          if (info?.reasoning?.efforts?.length > 0) {
            reasoning = {
              defaultEffort: info.reasoning.defaultEffort ?? null,
              efforts: info.reasoning.efforts.map((effort) => ({ id: effort.id, name: effort.name })),
            };
          }
        } catch { /* 能力查不到就只给模型 */ }
        models.push({ id: model.id, name: model.name, reasoning });
      }
    } catch (error) {
      core.log(`模型目录读取失败 provider=${provider.id}`, String(error));
    }
    providers.push({ id: provider.id, name: provider.name, models });
  }
  const value = { providers, current };
  core.modelCatalogCache = { at: Date.now(), value };
  return value;
}


/** /state.sessions：工程台会话列表（lead + 任务会话）。 */
function sessionsView(core) {
  const state = core.state;
  const rows = [];
  const leadId = state.lead.sessionId;
  const lastEvents = core.lastEvents ?? new Map();
  if (leadId) {
    rows.push({
      id: leadId,
      kind: "lead",
      taskId: null,
      projectId: null,
      title: "工程台 · super agent",
      status: state.settings.leadStatus === "running" ? "running" : "idle",
      hidden: true,
      startedAt: state.lead.createdAt,
      updatedAt: state.lead.lastPromptAt ?? state.lead.createdAt,
      lastEvent: lastEvents.get(leadId) ?? null,
    });
  }
  for (const t of state.tasks) {
    if (!t.sessionId) continue;
    const running = ACTIVE.has(t.status) || (lastRunOf(core, t.id)?.endedAt === null);
    rows.push({
      id: t.sessionId,
      kind: "task",
      taskId: t.id,
      projectId: t.projectId,
      title: t.title,
      status: running ? "running" : (["needs_review", "failed", "verifying", "accepted", "merged", "abandoned"].includes(t.status) ? "idle" : "unknown"),
      hidden: Boolean(t.hiddenSession),
      startedAt: lastRunOf(core, t.id)?.startedAt ?? t.createdAt,
      updatedAt: t.updatedAt,
      lastEvent: lastEvents.get(t.sessionId) ?? null,
    });
  }
  rows.sort((a, b) => {
    if (a.kind === "lead") return -1;
    if (b.kind === "lead") return 1;
    if (a.status !== b.status) return a.status === "running" ? -1 : 1;
    return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
  });
  return rows;
}

/** 放弃原因分类：模型服务 / 重复任务 / 中断 / 操作员取消 / 范围调整 / 其他。 */
function inferAbandonCategory(task) {
  if (task.abandonCategory) return task.abandonCategory;
  const text = `${task.abandonReason ?? ""} ${task.error ?? ""}`;
  if (/(模型|provider|503|429|5\d\d|限流|服务不可用|超时|RATE_LIMIT|SERVER)/i.test(text)) return "provider";
  if (/(重复|duplicate|同范围|同一范围|已有 #?\d+|与 #?\d+ 同)/i.test(text)) return "duplicate";
  if (/(中断|崩溃|provisioning|实例|竞态|孤儿)/i.test(text)) return "interrupted";
  if (/(取消|cancel)/i.test(text)) return "cancelled";
  if (/(范围|scope|降级|不做|撤回|放弃该需求)/i.test(text)) return "scope";
  return "other";
}

function findProject(core, projectId) {
  return core.state.projects.find((p) => p.id === projectId);
}

function findTask(core, taskId) {
  return core.state.tasks.find((t) => t.id === Number(taskId));
}

function findRun(core, taskId, runId) {
  return core.state.runs.find((r) => r.taskId === Number(taskId) && (runId === undefined || r.id === runId));
}

function tasksOf(core, projectId) {
  return core.state.tasks.filter((t) => t.projectId === projectId);
}

function pruneQuestions(core) {
  core.state.questions = core.state.questions.filter((q) => q.status !== "dismissed" || true);
}

/* ─────────────────────────── 视图投影 ─────────────────────────── */

function usedSlotsOf(core, projectId) {
  return core.state.tasks
    .filter((t) => (projectId === undefined || t.projectId === projectId) && ACTIVE.has(t.status))
    .reduce((a, t) => a + slotsOf(t), 0);
}

/** 路径前缀归一化：去掉开头 ./ 和结尾 /，用于 touches 重叠判断。 */
function normalizeTouch(path) {
  return String(path ?? "").trim().replace(/^\.\//, "").replace(/\/+$/, "");
}

function touchesOverlap(a, b) {
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

// 只要任务还「占用着」这些路径（运行中、待验收、已验收未合并），就不要再并发改同一片。
const TOUCH_OWNERS = new Set([...ACTIVE, "needs_review", "accepted"]);

/** 同一项目里仍占用 touches 的任务如果有重叠，返回冲突任务；没有 touches 的任务不参与。 */
function findTouchConflict(core, task, projectId) {
  const touches = (Array.isArray(task.touches) ? task.touches : []).map(normalizeTouch).filter(Boolean);
  if (touches.length === 0) return null;
  for (const other of core.state.tasks) {
    if (other.id === task.id || other.projectId !== projectId) continue;
    if (!TOUCH_OWNERS.has(other.status)) continue;
    const otherTouches = (Array.isArray(other.touches) ? other.touches : []).map(normalizeTouch).filter(Boolean);
    for (const a of touches) {
      const hit = otherTouches.find((b) => touchesOverlap(a, b));
      if (hit) return { task: other, path: a, otherPath: hit };
    }
  }
  return null;
}

/** 任务从非 active 状态重新开跑（人工打回/补指令）前，先过槽位和冲突域。 */
function canStartTask(core, task) {
  const project = findProject(core, task.projectId);
  if (!project) return { ok: false, code: "no-project", error: "项目不存在" };
  const size = slotsOf(task);
  const projectUsed = usedSlotsOf(core, project.id);
  if (projectUsed + size > project.slotBudget) {
    return { ok: false, code: "slots", scope: "project", error: `项目槽位不足：已用 ${projectUsed}/${project.slotBudget}，本任务需要 ${size}` };
  }
  const globalUsed = usedSlotsOf(core);
  if (globalUsed + size > core.state.settings.globalSlotBudget) {
    return { ok: false, code: "slots", scope: "global", error: `全局槽位不足：已用 ${globalUsed}/${core.state.settings.globalSlotBudget}，本任务需要 ${size}` };
  }
  const conflict = findTouchConflict(core, task, project.id);
  if (conflict) {
    return { ok: false, code: "conflict", error: `路径冲突：#${conflict.task.id}「${conflict.task.title}」正在占用 ${conflict.path}` };
  }
  return { ok: true };
}

function runView(core, run) {
  if (!run) return null;
  return {
    id: run.id,
    status: run.endedAt ? (run.outcome === "failed" ? "failed" : "finished") : "running",
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    sessionId: run.sessionId,
    diffStat: run.diffStat ?? "",
    filesChanged: run.filesChanged ?? 0,
    selfTest: run.selfTest ?? { total: 0, passed: 0, failed: 0, commands: [] },
    finalText: run.finalText ?? "",
    reason: run.reason ?? null,
    drift: run.drift ?? null,
    setup: run.setup ?? null,
    files: Array.isArray(run.files) ? run.files : [],
    hostVerify: run.hostVerify ?? null,
    // 任务会话当 Team Lead 时开出来的 teammate 子会话证据（自测命令 + 最终报告）。
    teammates: Array.isArray(run.teammates) ? run.teammates : [],
  };
}

function taskView(core, task) {
  const run = lastRunOf(core, task.id);
  const questions = core.state.questions.filter((q) => q.taskId === task.id && q.status === "open");
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    type: task.type,
    size: task.size,
    slots: slotsOf(task),
    sizeSource: task.sizeSource ?? (task.size ? "legacy" : null),
    sizeReason: task.sizeReason ?? "",
    estimateError: task.estimateError ?? null,
    estimatedAt: task.estimatedAt ?? null,
    workloadTier: workloadTierOfSize(task.size),
    workloadLabel: WORKLOAD_TIER_LABELS[workloadTierOfSize(task.size)] ?? "中",
    // 已经跑过的任务用 run 里记录的“实际模型”，还没跑的用当前配置推算“将用模型”。
    workerModel: (run && run.workerModel && run.workerModel.model)
      ? run.workerModel
      : workloadModelOf(core, findProject(core, task.projectId), task),
    priority: task.priority ?? 100,
    brief: task.brief ?? "",
    dod: task.dod ?? [],
    dodSource: task.dodSource ?? "agent",
    status: task.status,
    dependsOn: task.dependsOn ?? [],
    touches: task.touches ?? [],
    tags: task.tags ?? [],
    branch: task.branch ?? null,
    worktreePath: task.worktreePath ?? null,
    sessionId: task.sessionId ?? null,
    runCount: task.runCount ?? 0,
    lastRun: runView(core, run),
    questions,
    acceptance: task.acceptance ?? null,
    review: task.review ?? null,
    reviewRounds: task.reviewRounds ?? 0,
    reworkRounds: task.reworkRounds ?? 0,
    abandonReason: task.abandonReason ?? null,
    abandonCategory: task.status === "abandoned" || task.status === "failed" ? inferAbandonCategory(task) : null,
    hiddenSession: Boolean(task.hiddenSession),
    interventions: task.interventions ?? [],
    attachments: task.attachments ?? [],
    error: task.error ?? null,
    retryCount: task.retryCount ?? 0,
    batchId: task.batchId ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function lastRunOf(core, taskId) {
  const runs = core.state.runs.filter((r) => r.taskId === Number(taskId));
  return runs.length > 0 ? runs[runs.length - 1] : null;
}

function projectView(core, project) {
  return {
    ...project,
    usedSlots: usedSlotsOf(core, project.id),
    taskCounts: countTasks(core, project.id),
  };
}

function countTasks(core, projectId) {
  const counts = { todo: 0, running: 0, review: 0, done: 0, questions: 0 };
  for (const t of tasksOf(core, projectId)) {
    if (t.status === "inbox" || t.status === "queued" || t.status === "needs_input") counts.todo += 1;
    else if (ACTIVE.has(t.status)) counts.running += 1;
    else if (REVIEW.has(t.status)) counts.review += 1;
    else if (DONE.has(t.status)) counts.done += 1;
  }
  counts.questions = core.state.questions.filter((q) => q.status === "open" && (q.projectId === projectId || q.projectId === null)).length;
  return counts;
}

function stateView(core) {
  const state = core.state;
  const slots = {
    globalSlotBudget: state.settings.globalSlotBudget,
    used: usedSlotsOf(core),
    projects: {},
  };
  for (const p of state.projects) {
    slots.projects[p.id] = { budget: p.slotBudget, used: usedSlotsOf(core, p.id) };
  }
  const diskUsed = state.projects.reduce((a, p) => a + (p.diskUsedGB ?? 0), 0);
  return {
    ok: true,
    version: state.version,
    now: nowIso(),
    settings: {
      globalSlotBudget: state.settings.globalSlotBudget,
      autoDispatch: state.settings.autoDispatch,
      leadSessionId: state.settings.leadSessionId,
      clarifyFirst: state.settings.clarifyFirst,
      workloadModels: normalizeWorkloadModels(state.settings.workloadModels),
      workbenchModel: workbenchModelOf(core),
      reviewMode: reviewModeOf(core),
      reviewerModel: normalizeModelSelection(state.settings.reviewerModel),
      leadCtxLimitTokens: leadCtxLimitOf(core),
      leadKeepMessages: positiveInt(state.settings.leadKeepMessages, 10, 0, 40),
      toolOutputLimitBytes: toolOutputLimitOf(core),
      estimatorRotateEvery: positiveInt(state.settings.estimatorRotateEvery, 20, 1, 500),
      hostVerifyOnAccept: true,
      hostVerifyOnNeedInfo: true,
      hostVerifyTimeoutMs: positiveInt(state.settings.hostVerifyTimeoutMs, 120000, 10000, 600000),
      deepReview: true,
      deepReviewTimeoutMs: positiveInt(state.settings.deepReviewTimeoutMs, 150000, 20000, 600000),
      reviewImages: true,
      reviewImageMax: positiveInt(state.settings.reviewImageMax, 3, 1, 8),
      maxReworkRounds: positiveInt(state.settings.maxReworkRounds, 5, 1, 20),
    },
    counters: state.counters,
    projects: state.projects.map((p) => projectView(core, p)),
    tasks: state.tasks.map((t) => taskView(core, t)),
    runs: state.runs.slice(-80).map((r) => ({ ...r })),
    batches: state.batches.slice(-20).map((b) => batchView(b)),
    questions: state.questions.map((q) => ({ ...q })),
    lead: {
      sessionId: state.lead.sessionId,
      createdAt: state.lead.createdAt,
      lastPromptAt: state.lead.lastPromptAt,
      status: state.settings.leadStatus ?? "unknown",
      presetId: state.lead.presetId ?? null,
      epoch: state.lead.epoch ?? 1,
      previousSessionId: state.lead.previousSessionId ?? null,
      pendingContinuation: Boolean(state.lead.pendingContinuation),
    },
    review: {
      stats: state.stats?.review ?? null,
      recent: (state.reviewLog ?? []).slice(-20),
    },
    slots,
    disk: { globalBudgetGB: state.settings.globalDiskBudgetGB, usedGB: Math.round(diskUsed * 10) / 10 },
  };
}

function batchView(batch) {
  return {
    id: batch.id,
    projectId: batch.projectId,
    taskIds: batch.taskIds,
    status: batch.status,
    testBranch: batch.testBranch,
    testWorktree: batch.testWorktree,
    baseShaBefore: batch.baseShaBefore,
    backupRef: batch.backupRef,
    commands: batch.commands ?? [],
    perTask: batch.perTask ?? [],
    failures: batch.failures ?? [],
    verdict: batch.verdict ?? null,
    mergedSha: batch.mergedSha ?? null,
    confirmedBy: batch.confirmedBy ?? null,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

/* ─────────────────────────── 项目 ─────────────────────────── */

/** 规范化项目证据目录（验收报告从这里收图片）：绝对路径数组，最多 8 条，支持 {taskId} 模板。 */
function normalizeEvidenceRoots(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const text = raw.trim();
    if (text === "" || text.length > 400) continue;
    // 只收绝对路径 / 模板路径；相对路径在宿主进程 cwd 下没有意义。
    if (!text.startsWith("/")) continue;
    if (!out.includes(text)) out.push(text);
    if (out.length >= 8) break;
  }
  return out;
}


/** 项目 id 递增：删除项目后不能再按「数量 + 1」取号（会和已有 id 撞）。 */
function nextProjectId(core) {
  let max = 0;
  for (const project of core.state.projects) {
    const m = /^p(\d+)$/.exec(String(project?.id ?? ""));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `p${max + 1}`;
}

async function addProject(core, input) {
  const repoPath = resolve(String(input.repoPath ?? "").trim());
  if (!(await isGitRepo(repoPath))) return { ok: false, code: "not-git", error: `不是 git 仓库：${repoPath}` };
  const top = await repoTop(repoPath);
  const id0 = realpathSafe(top);
  for (const p of core.state.projects) {
    const same = p.repoPath === id0;
    if (same) return { ok: false, code: "duplicate", error: `项目已存在：${p.id} ${p.name}`, projectId: p.id };
  }
  const baseBranch = String(input.baseBranch ?? "main");
  const sha = await branchSha(top, baseBranch);
  if (sha === null) return { ok: false, code: "no-base", error: `base 分支不存在：${baseBranch}` };
  const id = nextProjectId(core);
  const workerFilePolicy = input.workerFilePolicy === "danger-full-access" || input.workerFilePolicy === "workspace-write"
    ? input.workerFilePolicy
    : (input.autonomy === "unleashed" ? "danger-full-access" : "workspace-write");
  const project = {
    id,
    name: String(input.name ?? top.split("/").pop() ?? id),
    repoPath: top,
    baseBranch,
    integrationBranch: String(input.integrationBranch ?? baseBranch),
    autonomy: workerFilePolicy === "danger-full-access" ? "unleashed" : "self-drive",
    workerFilePolicy,
    mergeMode: String(input.mergeMode ?? "test-branch"),
    worktreeRoot: resolve(String(input.worktreeRoot ?? join(core.stateDir, "worktrees", id))),
    slotBudget: Math.max(1, Math.min(12, Number(input.slotBudget ?? 6) || 6)),
    diskBudgetGB: Math.max(1, Number(input.diskBudgetGB ?? 40) || 40),
    perTaskDiskGB: Math.max(1, Number(input.perTaskDiskGB ?? 4) || 4),
    workerModel: input.workerModel ?? { provider: "mtcode", model: "deepseek-flash", reasoningEffort: "max" },
    setup: {
      copy: Array.isArray(input.setup?.copy) ? input.setup.copy : [],
      commands: Array.isArray(input.setup?.commands) ? input.setup.commands : [],
      env: input.setup?.env ?? {},
    },
    verify: { commands: Array.isArray(input.verify?.commands) ? input.verify.commands : [] },
    integrationTests: {
      commands: Array.isArray(input.integrationTests?.commands) ? input.integrationTests.commands : [],
      timeoutMs: Number(input.integrationTests?.timeoutMs ?? 900000),
    },
    protectedBranches: input.protectedBranches ?? ["main", "master", "release/*"],
    // 验收报告从哪些仓库外目录收证据截图（支持 {taskId} 模板；空数组=只用约定目录/会话证据）。
    evidenceRoots: normalizeEvidenceRoots(input.evidenceRoots),
    archivedAt: null,
    diskUsedGB: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mkdirSync(project.worktreeRoot, { recursive: true });
  mutate(core, (s) => { s.projects.push(project); });
  saveNow(core);
  return { ok: true, project: projectView(core, project) };
}

async function updateProject(core, projectId, patch) {
  const project = findProject(core, projectId);
  if (!project) return { ok: false, code: "not-found", error: "项目不存在" };
  if (patch.workerFilePolicy !== undefined && !["workspace-write", "danger-full-access"].includes(patch.workerFilePolicy)) {
    return { ok: false, code: "bad-policy", error: "workerFilePolicy 只能是 workspace-write 或 danger-full-access" };
  }
  // 改 base 分支前先确认它真的存在：否则之后每条任务都会在建 worktree 时失败。
  if (patch.baseBranch !== undefined) {
    const base = String(patch.baseBranch ?? "").trim();
    if (base === "") return { ok: false, code: "no-base", error: "base 分支不能为空" };
    if ((await branchSha(project.repoPath, base)) === null) {
      return { ok: false, code: "no-base", error: `base 分支不存在：${base}` };
    }
  }
  const allowed = ["name", "baseBranch", "integrationBranch", "autonomy", "workerFilePolicy", "mergeMode", "worktreeRoot",
    "slotBudget", "diskBudgetGB", "perTaskDiskGB", "workerModel", "setup", "verify", "integrationTests",
    "protectedBranches", "evidenceRoots", "archivedAt", "diskUsedGB"];
  mutate(core, (s) => {
    const p = s.projects.find((x) => x.id === projectId);
    for (const key of allowed) {
      if (patch[key] === undefined) continue;
      if (key === "evidenceRoots") p[key] = normalizeEvidenceRoots(patch[key]);
      else if (key === "slotBudget") p[key] = Math.max(1, Math.min(12, Number(patch[key]) || 6));
      else if (key === "workerFilePolicy") {
        p[key] = patch[key];
        p.autonomy = patch[key] === "danger-full-access" ? "unleashed" : "self-drive";
      } else p[key] = patch[key];
    }
    // 旧的 autonomy-only 调用也要和 workerFilePolicy 保持一致，避免 UI/派发读两套值。
    if (patch.autonomy !== undefined && patch.workerFilePolicy === undefined) {
      p.workerFilePolicy = patch.autonomy === "unleashed" ? "danger-full-access" : "workspace-write";
    }
    p.updatedAt = nowIso();
  });
  return { ok: true, project: projectView(core, findProject(core, projectId)) };
}

/**
 * 彻底删除项目：项目登记、名下任务记录（运行/澄清）、集成批次一起删，
 * 清任务 worktree/分支、报告、证据归档、参考截图；仓库本身和已合并提交不动。
 * 有执行中（或正在派发）的任务时拒绝，避免删掉正在跑的工作。
 */
async function deleteProject(core, projectId) {
  await ensureState(core);
  const project = findProject(core, String(projectId ?? ""));
  if (!project) return { ok: false, code: "not-found", error: "项目不存在" };
  const tasks = tasksOf(core, project.id);
  const running = tasks.filter((task) => ACTIVE.has(task.status) || core.dispatching?.has(task.id));
  if (running.length > 0) {
    return {
      ok: false,
      code: "busy",
      error: `项目还有 ${running.length} 个任务在执行（${running.map((t) => `#${t.id}`).join("、")}），先取消或等它们结束后再删`,
    };
  }
  // 集成批次会把批次记录写回 state；跑到一半删项目会让 integrate 拿到 undefined 直接崩。
  const runningBatch = core.state.batches.find((batch) => batch.projectId === project.id && batch.status === "running");
  if (runningBatch) {
    return { ok: false, code: "busy", error: `集成批次 ${runningBatch.id} 正在运行，等它结束（或失败）后再删项目` };
  }

  // 任务会话归档：会话面板/侧栏不再残留（失败不阻塞删除）。
  const sessionsArchived = [];
  const workspaceRegistry = svc(core, "workspaceRegistry");
  for (const task of tasks) {
    if (!task.sessionId) continue;
    try {
      await workspaceRegistry?.archiveSession?.(task.sessionId);
      sessionsArchived.push(task.sessionId);
    } catch { /* ignore */ }
  }

  // 任务 worktree / 分支：合并后一般已清理，残留的这里补清。
  for (const task of tasks) {
    try {
      if (task.worktreePath && existsSync(task.worktreePath)) await removeWorktree(project.repoPath, task.worktreePath);
      if (task.branch) await deleteBranch(project.repoPath, task.branch);
    } catch (error) {
      core.log(`删除项目 ${project.id} 时清理任务 #${task.id} 的 worktree/分支失败（忽略）`, String(error));
    }
  }

  // 项目的 worktree 根目录：清空后只删空目录，且不碰别的项目在用的路径，也不碰仓库/状态目录本身。
  const managedRoots = join(core.stateDir, "worktrees");
  const worktreeRoot = resolve(String(project.worktreeRoot ?? join(managedRoots, project.id)));
  const otherRoots = core.state.projects
    .filter((p) => p.id !== project.id)
    .map((p) => resolve(String(p.worktreeRoot ?? "")));
  const blockedRoots = new Set([core.home, core.stateDir, project.repoPath, "/", managedRoots]);
  const sharedPaths = otherRoots.some((root) => root === worktreeRoot || root.startsWith(worktreeRoot + "/"));
  let worktreeRootRemoved = false;
  if (!blockedRoots.has(worktreeRoot) && !sharedPaths) {
    try {
      if (readdirSync(worktreeRoot).length === 0) {
        rmdirSync(worktreeRoot);
        worktreeRootRemoved = true;
      }
    } catch { /* 不存在或非空：留着 */ }
  }

  // 任务报告 / 证据归档 / 参考截图：任务记录删掉后没人再看得到，顺手清盘。
  const uploadsRoot = join(core.stateDir, "uploads");
  let removedFiles = 0;
  for (const task of tasks) {
    const targets = [join(core.stateDir, "reports", `task-${task.id}.html`), join(core.evidenceDir, `task-${task.id}`)];
    for (const attachment of task.attachments ?? []) {
      const filePath = resolve(String(attachment?.path ?? ""));
      if (filePath.startsWith(uploadsRoot + "/")) targets.push(filePath);
    }
    for (const target of targets) {
      try {
        if (existsSync(target)) {
          rmSync(target, { recursive: true, force: true });
          removedFiles += 1;
        }
      } catch { /* ignore */ }
    }
  }

  // 集成批次：测试分支/worktree 残留清掉，批次记录随项目一起删。
  const batches = core.state.batches.filter((batch) => batch.projectId === project.id);
  for (const batch of batches) {
    try {
      if (batch.testWorktree && existsSync(batch.testWorktree)) await removeWorktree(project.repoPath, batch.testWorktree);
      if (batch.testBranch) await deleteBranch(project.repoPath, batch.testBranch);
    } catch { /* ignore */ }
  }

  const taskIds = new Set(tasks.map((task) => task.id));
  const deleted = {
    projectId: project.id,
    name: project.name,
    tasks: tasks.map((task) => ({ id: task.id, title: task.title, status: task.status })),
    batches: batches.map((batch) => batch.id),
    worktreeRoot,
    worktreeRootRemoved,
    filesRemoved: removedFiles,
    repoPath: project.repoPath,
  };
  mutate(core, (s) => {
    s.projects = s.projects.filter((p) => p.id !== project.id);
    s.tasks = s.tasks.filter((t) => !taskIds.has(t.id));
    s.runs = s.runs.filter((r) => !taskIds.has(r.taskId));
    s.questions = s.questions.filter((q) => q.projectId !== project.id && !taskIds.has(q.taskId));
    s.batches = s.batches.filter((b) => b.projectId !== project.id);
  });
  saveNow(core);
  core.log(
    `delete project ${project.id}「${project.name}」：任务 ${deleted.tasks.length} 个、批次 ${deleted.batches.length} 个、清理文件 ${removedFiles} 个` +
      `${worktreeRootRemoved ? "、worktree 根目录已删" : ""}，仓库保留 ${project.repoPath}`,
  );
  return { ok: true, deleted, sessionsArchived };
}

/* ─────────────────────────── 任务 ─────────────────────────── */

async function addTask(core, input) {
  const project = findProject(core, input.projectId);
  if (!project) return { ok: false, code: "no-project", error: `项目不存在：${input.projectId}` };
  if (project.archivedAt) return { ok: false, code: "archived", error: "项目已归档" };
  const validated = validateTaskInput(input);
  if (!validated.ok) return validated;
  const { title, brief, dod } = validated;
  const type = ["feature", "fix", "refactor", "perf", "chore", "docs", "test"].includes(input.type)
    ? input.type : "feature";

  // 工作量人不设置：显式传 size 的只可能是 AI/接口（人工界面已移除该字段），
  // 没传 size 就在创建时让 AI 判；判失败按 m 暂定并在任务上留 error，可在详情里重估。
  let size;
  let sizeSource;
  let sizeReason = "";
  let estimateError = null;
  let estimatedAt = null;
  if (Object.hasOwn(SIZE_SLOTS, input.size)) {
    size = input.size;
    sizeSource = input.sizeSource === "human" ? "human" : input.sizeSource === "given" ? "given" : "ai";
    sizeReason = typeof input.sizeReason === "string" ? input.sizeReason.slice(0, 60) : "";
    if (sizeSource === "ai") estimatedAt = nowIso();
  } else {
    const verdict = await estimateWorkload(core, { title, brief, type });
    if (verdict.ok) {
      size = verdict.size;
      sizeSource = "ai";
      sizeReason = verdict.reason ?? "";
      estimatedAt = nowIso();
    } else {
      size = "m";
      sizeSource = "fallback";
      estimateError = String(verdict.error ?? "AI 评估失败").slice(0, 300);
      core.log(`任务「${title}」AI 评估工作量失败，按 m 暂定：${estimateError}`);
    }
  }

  const n = core.state.counters.task + 1;
  core.state.counters.task = n;
  const task = {
    id: n,
    projectId: project.id,
    title,
    type,
    size,
    slots: SIZE_SLOTS[size],
    sizeSource,
    sizeReason,
    estimateError,
    estimatedAt,
    priority: Number(input.priority ?? 100),
    brief,
    dod,
    dodSource: input.dodSource === "human" ? "human" : "agent",
    status: "queued",
    dependsOn: Array.isArray(input.dependsOn) ? input.dependsOn.map(Number) : [],
    touches: Array.isArray(input.touches) ? input.touches.map(String) : [],
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    attachments: sanitizeAttachments(core, input.attachments),
    branch: null,
    worktreePath: null,
    sessionId: null,
    workspaceId: null,
    runCount: 0,
    acceptance: null,
    abandonReason: null,
    error: null,
    batchId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mutate(core, (s) => { s.tasks.push(task); });
  saveNow(core);
  return { ok: true, task: taskView(core, task) };
}

async function updateTask(core, taskId, patch) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (patch?.title !== undefined) {
    const title = String(patch.title).trim();
    if (title === "") return { ok: false, code: "bad-title", error: "标题不能为空" };
    if (Buffer.byteLength(title, "utf8") > TASK_LIMITS.titleBytes) return { ok: false, code: "title-too-large", error: "标题过长" };
  }
  if (patch?.brief !== undefined) {
    if (typeof patch.brief !== "string") return { ok: false, code: "bad-brief", error: "brief 必须是字符串" };
    if (Buffer.byteLength(patch.brief, "utf8") > TASK_LIMITS.briefBytes) {
      return { ok: false, code: "brief-too-large", error: `需求 brief 超过 ${Math.round(TASK_LIMITS.briefBytes / 1024)}KB，请拆分或只保留关键内容` };
    }
  }
  if (patch?.dod !== undefined) {
    if (!Array.isArray(patch.dod)) return { ok: false, code: "bad-dod", error: "DoD 必须是字符串数组" };
    if (patch.dod.length > TASK_LIMITS.dodItems) return { ok: false, code: "dod-too-large", error: `DoD 超过 ${TASK_LIMITS.dodItems} 条` };
    if (patch.dod.some((item) => Buffer.byteLength(String(item), "utf8") > TASK_LIMITS.dodItemBytes)) {
      return { ok: false, code: "dod-too-large", error: "单条 DoD 过长" };
    }
  }
  if (patch?.size !== undefined && !Object.hasOwn(SIZE_SLOTS, patch.size)) {
    return { ok: false, code: "bad-size", error: `工作量必须是 ${Object.keys(SIZE_SLOTS).join("/")}` };
  }
  if (patch?.type !== undefined && !["feature", "fix", "refactor", "perf", "chore", "docs", "test"].includes(patch.type)) {
    return { ok: false, code: "bad-type", error: "任务类型不合法" };
  }
  for (const key of ["dependsOn", "touches", "tags"]) {
    if (patch?.[key] !== undefined && !Array.isArray(patch[key])) return { ok: false, code: "bad-array", error: `${key} 必须是数组` };
  }
  const allowed = ["title", "brief", "dod", "priority", "size", "touches", "type", "dependsOn", "tags"];
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === Number(taskId));
    for (const key of allowed) if (patch[key] !== undefined) t[key] = patch[key];
    if (patch.size !== undefined && Object.hasOwn(SIZE_SLOTS, patch.size)) {
      t.size = patch.size;
      t.slots = SIZE_SLOTS[patch.size];
      t.sizeSource = "ai";
      if (typeof patch.sizeReason === "string") t.sizeReason = patch.sizeReason.slice(0, 60);
      t.estimatedAt = nowIso();
      t.estimateError = null;
    }
    t.updatedAt = nowIso();
  });
  return { ok: true, task: taskView(core, findTask(core, taskId)) };
}

/* ─────────────────────────── 会话与派发 ─────────────────────────── */

/**
 * 隐藏会话（origin=subagent）归 subagent routing 独占：sessionController.resolveAgent
 * 对它只会稳定返回 session/agent-busy（"is owned by subagent routing"），不会「等一会儿就好」。
 * 插件热重载后 state 里留着的旧 lead/任务会话都会走到这条路径；必须立刻失败交给调用方重建，
 * 不能在 20s 轮询里白等（实测一次发送被拖成 40s）。
 */
function isSubagentOwnedError(error) {
  if (error === null || typeof error !== "object") return false;
  if (error.code === "session/agent-busy") return true;
  return String(error.message ?? error).includes("is owned by subagent routing");
}

async function waitForAgent(core, sessionId, timeoutMs = 25000) {
  const sc = svc(core, "sessionController");
  if (!sc) return { error: new Error("sessionController 不可用") };
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const r = await sc.resolveAgent(sessionId);
      if (r && r.agent) return r;
      last = r && r.error ? r.error : null;
      if (isSubagentOwnedError(last)) return { error: last };
    } catch (error) {
      if (isSubagentOwnedError(error)) return { error };
      last = error;
    }
    await sleep(250);
  }
  return { error: last ?? new Error("resolveAgent 超时") };
}

/** 构造一条 user 消息（等价 createUserMessage；不能 import dsh-llm，见 API.md R3）。 */
function developerMessage(text) {
  return {
    id: uuid(),
    role: "developer",
    content: [{ type: "text", text }],
    source: { kind: "user" },
  };
}

function userMessage(text) {
  return {
    id: uuid(),
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "user" },
  };
}

async function promptSession(core, sessionId, textOrMessage) {
  const sessions = svc(core, "sessions");
  const resolved = await resolvePromptAgent(core, sessionId);
  if (!resolved.agent) {
    return { ok: false, error: `拿不到会话 agent：${resolved.error?.message ?? resolved.error ?? "unknown"}` };
  }
  const agent = resolved.agent;
  try {
    const message = typeof textOrMessage === "string" ? userMessage(textOrMessage) : textOrMessage;
    agent.followup(message);
  } catch (error) {
    return { ok: false, error: `followup 失败：${String(error)}` };
  }
  try {
    if (sessions && typeof sessions.flush === "function") await sessions.flush(agent.session);
  } catch { /* flush 是尽力而为 */ }
  return { ok: true, sessionId };
}

function buildBrief(core, project, task, attachments = []) {
  const lines = [];
  lines.push(`【工程台任务 #${task.id}】${task.title}`);
  lines.push("");
  lines.push(`项目：${project.name}（${project.repoPath}）`);
  lines.push(`你的当前工作目录就是本任务的隔离 git worktree（分支 ${task.branch}），只允许在 cwd 内改文件；不要 push、不要切换/改写分支以外的仓库。`);
  lines.push(`工作区模式：workspace/worktree 隔离。改动会在验收后由宿主 squash 成一个提交再进集成分支。`);
  lines.push("");
  if (task.brief) {
    lines.push("## 需求原文 / 简报");
    lines.push(task.brief);
    lines.push("");
  }
  if (task.dod && task.dod.length > 0) {
    lines.push("## 验收标准（DoD，已由工程台预拟，可细化）");
    for (const d of task.dod) lines.push(`- ${d}`);
    lines.push("");
  } else {
    lines.push("## 验收标准");
    lines.push("第一步先把验收标准（DoD）写成 3-6 条可验证的条目，再动手。");
    lines.push("");
  }
  lines.push("## 硬约束");
  lines.push("1. 只改本 worktree 内的文件；不 push、不改 base 分支、不动 setup 配方拷进来的只读资产。");
  lines.push("2. 完成后在最后一条消息里输出结构化报告：DoD 逐条自检结果 / 改动摘要 / 为什么这样做 / 你实际跑过的测试命令与结果（原样贴关键输出）/ 风险与遗留 / 建议 review 重点。");
  lines.push("3. 自测证据以「命令 + 退出码 + 输出尾部」为准，不要转述或编造；没跑过的测试要如实写「未跑」。");
  lines.push("4. 需求里有任何不清楚/可疑/疑似伪需求的地方，在报告最前面用「## 待澄清」列出，不要靠猜；已经能做的部分先做完。");
  lines.push("5. 视觉/界面/成片类改动要留验收截图：用本机 google-chrome / chromium 无头模式（仓库有 CDP 零依赖验收脚本可参考），产物放本 worktree 的 artifacts/ 下。");
  lines.push("6. 工程台的「验收报告」会自动内联截图：至少留 2 张能说明结果的关键图（页面截图 / 关键帧 / 前后对比），文件名写清内容。纯后端/配置类改动不受此限。");
  lines.push("");
  if (attachments && attachments.length > 0) {
    lines.push("## 参考截图（需求方在新建需求时附的图）");
    for (const a of attachments) {
      lines.push(`- ${a.worktreePath ?? a.path}（${a.name ?? "截图"}）`);
    }
    lines.push("这些是本机图片文件，可用 read_image 直接查看；请结合截图理解需求。");
    lines.push("");
  }
  if (project.verify && project.verify.commands && project.verify.commands.length > 0) {
    lines.push("## 自测命令（必须真跑并把结果贴进报告）");
    for (const c of project.verify.commands) lines.push(`- \`${c}\``);
    lines.push("");
  }
  lines.push(`完成时请确认：${project.verify?.commands?.length ? "上述自测命令全部通过，" : ""}改动符合 DoD、没有遗留调试代码。`);
  return lines.join("\n");
}

async function dispatchTask(core, taskId, options = {}) {
  await ensureState(core);
  const nid = Number(taskId);
  if (!core.dispatching) core.dispatching = new Set();
  if (core.dispatching.has(nid)) return { ok: false, code: "busy", error: `任务 #${nid} 正在派发中（本实例锁）` };
  core.dispatching.add(nid);
  try {
    return await dispatchTaskLocked(core, taskId, options);
  } finally {
    core.dispatching.delete(nid);
  }
}

async function dispatchTaskLocked(core, taskId, options = {}) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: `任务不存在：#${taskId}` };
  const project = findProject(core, task.projectId);
  if (!project) return { ok: false, code: "no-project", error: "项目不存在" };
  if (project.archivedAt) return { ok: false, code: "archived", error: "项目已归档，不再派发" };
  if (ACTIVE.has(task.status)) return { ok: false, code: "busy", error: `任务已在执行中（${task.status}）` };
  if (task.status === "needs_input") return { ok: false, code: "needs-input", error: "任务在待澄清状态，先回答问题" };
  // 终态任务不能再开一轮：accepted 的提交还没合并，重新派发会覆盖验收结果；
  // merged 的改动已经在 base 上，再跑一次只会产生重复提交。放弃的任务走「继续」。
  if (["accepted", "merged", "abandoned"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务已是 ${task.status} 状态，不能再派发` };
  }

  // 依赖：必须已 merged（进入 base），否则依赖任务的文件不在 base 上，本任务 worktree 看不到。
  for (const depId of task.dependsOn ?? []) {
    const dep = findTask(core, depId);
    if (!dep || dep.status !== "merged") {
      return { ok: false, code: "deps", error: `依赖任务 #${depId} 未合入 base（${dep?.status ?? "缺失"}）` };
    }
  }
  // 冲突域：touches 有重叠的任务不并发。touches 为空时不拦（兼容旧任务）。
  const conflict = findTouchConflict(core, task, project.id);
  if (conflict) {
    return {
      ok: false, code: "conflict",
      error: `路径冲突：本任务 touches 与 #${conflict.task.id}「${conflict.task.title}」重叠（${conflict.path} / ${conflict.otherPath}），等它验收/合并或放弃后再派发`,
    };
  }
  // 槽位
  const size = slotsOf(task);
  const projectUsed = usedSlotsOf(core, project.id);
  if (projectUsed + size > project.slotBudget) {
    // scope 让调度泵能区分：项目满了只跳过这一条，别的项目还有空槽；全局满了才整轮停。
    return { ok: false, code: "slots", scope: "project", error: `项目槽位不足：已用 ${projectUsed}/${project.slotBudget}，本任务需要 ${size}` };
  }
  const globalUsed = usedSlotsOf(core);
  if (globalUsed + size > core.state.settings.globalSlotBudget) {
    return { ok: false, code: "slots", scope: "global", error: `全局槽位不足：已用 ${globalUsed}/${core.state.settings.globalSlotBudget}，本任务需要 ${size}` };
  }

  const branch = task.branch ?? `${task.type}/${task.id}-${slugify(task.title)}`;
  const worktreePath = task.worktreePath ?? join(project.worktreeRoot, `t${task.id}`);
  const slug = slugify(task.title);

  // 先落盘 provisioning + 本实例的 dispatchToken，防止跨实例并发重复派发。
  const dispatchToken = `${core.instanceId}:${Date.now()}`;
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    t.status = "provisioning";
    t.branch = branch;
    t.worktreePath = worktreePath;
    t.error = null;
    t.dispatchToken = dispatchToken;
    t.updatedAt = nowIso();
  });
  saveNow(core);
  const stillMine = () => findTask(core, task.id)?.dispatchToken === dispatchToken;
  core.log(`dispatch #${task.id} ${task.title} → ${branch} @ ${worktreePath}`);

  const snapshot = await repoSnapshot(project.repoPath);
  const setupResults = [];
  try {
    // 1) worktree
    const wt = await addWorktree(project.repoPath, worktreePath, branch, project.baseBranch);
    if (!wt.ok) throw new Error(`建 worktree 失败：${wt.error}`);
    // 2) setup copy + commands
    for (const spec of project.setup?.copy ?? []) {
      const from = resolve(project.repoPath, spec.from ?? spec);
      const toRel = spec.to ?? (spec.from ?? spec);
      const to = resolve(worktreePath, toRel);
      if (!existsSync(from)) continue;
      const cp = await runShell(`cp -a ${JSON.stringify(from)} ${JSON.stringify(to)}`, { cwd: worktreePath, timeoutMs: 600000 });
      setupResults.push({ step: "copy", from, to, exitCode: cp.exitCode, ok: cp.ok, tail: cp.tail });
      if (!cp.ok) throw new Error(`setup.copy 失败：${spec.from}`);
    }
    for (const command of project.setup?.commands ?? []) {
      const r = await runShell(command, { cwd: worktreePath, env: project.setup?.env ?? {}, timeoutMs: 900000 });
      setupResults.push({ step: "command", command, exitCode: r.exitCode, ok: r.ok, tail: r.tail, ms: r.ms });
      if (!r.ok) throw new Error(`setup 命令失败：${command}`);
    }

    // 3) 会话：默认建「隐藏会话」（origin=subagent，不建 workspace，左侧栏不出现，
    //    会话入口统一收在工程台页面的「会话」面板里）。agents.create 不可用时退回
    //    sessionController.create（可见会话 + workspace 分组），保证任何版本都能派发。
    if (!stillMine()) throw new Error("派发已被其他实例接管，放弃本次派发（dispatchToken 不匹配）");
    const sc = svc(core, "sessionController");
    const workerModel = workloadModelOf(core, project, task);
    const workloadTier = workloadTierOfSize(task.size);
    let sessionId = null;
    let hiddenSession = false;
    let liveAgent = null;
    let workspaceId = task.workspaceId ?? null;
    if (project.hiddenTaskSessions !== false) {
      try {
        const hid = await createHiddenSession(core, project, worktreePath, task);
        sessionId = hid.sessionId;
        liveAgent = hid.agent;
        hiddenSession = true;
      } catch (error) {
        core.log("隐藏会话创建失败，退回 sessionController 可见会话", String(error));
        sessionId = null;
      }
    }
    if (sessionId === null) {
      const reg = svc(core, "workspaceRegistry");
      if (reg && typeof reg.create === "function") {
        try {
          const ws = await reg.create(worktreePath, `#${task.id} ${task.title.slice(0, 30)}`);
          workspaceId = ws?.id ?? workspaceId;
        } catch (error) {
          core.log("workspaceRegistry.create 失败（继续用 cwd 建会话）", String(error));
        }
      }
      if (!sc || typeof sc.create !== "function") throw new Error("sessionController 不可用");
      const created = await sc.create(workspaceId ? { workspaceId } : { cwd: worktreePath });
      sessionId = created.sessionId ?? created.id;
      if (!sessionId) throw new Error("sessionController.create 没有返回 sessionId");
    }

    // 4) 权限档位 + worker 模型
    const mode = project.workerFilePolicy === "workspace-write"
      ? "workspace-write"
      : project.workerFilePolicy === "danger-full-access"
        ? "danger-full-access"
        : (project.autonomy === "unleashed" ? "danger-full-access" : "workspace-write");
    const presets = svc(core, "permissionPresets");
    try {
      if (!liveAgent) liveAgent = (await resolvePromptAgent(core, sessionId)).agent ?? null;
      if (liveAgent) {
        if (presets && typeof presets.set === "function") presets.set(liveAgent.session, mode);
        core.log(`permissionPresets.set(${mode}) ok session=${sessionId}`);
      }
    } catch (error) {
      core.log(`permissionPresets.set(${mode}) 失败`, String(error));
    }
    // 隐藏会话的模型来自 agents.create 的 agentOptions；可见会话走 selectModel。
    if (!hiddenSession && !liveAgent && sc && typeof sc.selectModel === "function") {
      core.log("会话 agent 未就绪，跳过权限/模型设置");
    }
    if (!hiddenSession && liveAgent && workerModel.model && sc?.selectModel) {
      try {
        await sc.selectModel({ sessionId, ...workerModel });
      } catch (error) {
        core.log("selectModel 失败（沿用默认模型）", String(error));
      }
    }
    core.log(`dispatch #${task.id} 工作量=${workloadTier}/${task.size} 模型=${workerModel.provider ?? "默认"}/${workerModel.model ?? "默认"}${workerModel.reasoningEffort ? `@${workerModel.reasoningEffort}` : ""}`);

    // 4.5) 参考截图复制进 worktree（agent 用 read_image 看）
    const worktreeAttachments = [];
    if (Array.isArray(task.attachments) && task.attachments.length > 0) {
      const destDir = join(worktreePath, ".project-console", "attachments");
      mkdirSync(destDir, { recursive: true });
      for (const att of task.attachments) {
        try {
          if (!att || typeof att.path !== "string" || !existsSync(att.path)) continue;
          const safeName = String(att.name ?? "screenshot.png").replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 80) || "screenshot.png";
          const dest = join(destDir, `${worktreeAttachments.length + 1}-${safeName}`);
          cpSync(att.path, dest);
          worktreeAttachments.push({ ...att, worktreePath: dest });
        } catch (error) {
          core.log(`复制参考截图失败 ${att?.name}`, String(error));
        }
      }
    }

    // 取消/放弃可能发生在建 worktree、会话、拷截图的任意一步之后。写 run 之前再确认一次：
    // 任务仍是 provisioning 才继续；旧代码会把用户已取消的任务改回 running，等于复活。
    const beforeRun = findTask(core, task.id);
    if (!stillMine() || !beforeRun || beforeRun.status !== "provisioning") {
      if (beforeRun?.status === "abandoned") {
        try { const agent = liveAgent ?? (await resolvePromptAgent(core, sessionId)).agent; agent?.cancel?.({ kind: "user" }, { keepInbox: false }); } catch { /* ignore */ }
        try { if (existsSync(worktreePath)) await removeWorktree(project.repoPath, worktreePath); } catch { /* ignore */ }
        try { if (branch) await deleteBranch(project.repoPath, branch); } catch { /* ignore */ }
        try { if (workspaceId) svc(core, "workspaceRegistry")?.delete?.(workspaceId); } catch { /* ignore */ }
        core.log(`dispatch #${task.id} 在派发过程中被取消，已停止派发并清理 worktree/分支/会话`);
      }
      return { ok: false, code: "cancelled", error: "任务在派发过程中被取消，本次派发已放弃" };
    }

    // 5) run 记录
    core.state.counters.run += 1;
    const run = {
      id: `r${core.state.counters.run}`,
      taskId: task.id,
      sessionId,
      startedAt: nowIso(),
      endedAt: null,
      outcome: null,
      reason: null,
      diffStat: "",
      filesChanged: 0,
      selfTest: { total: 0, passed: 0, failed: 0, commands: [] },
      finalText: "",
      setup: setupResults,
      hiddenSession,
      workloadTier,
      workerModel,
      drift: { snapshotAtDispatch: snapshot, snapshotAtEnd: null, mainRepoChanged: false },
    };
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      t.status = "running";
      t.sessionId = sessionId;
      t.hiddenSession = hiddenSession;
      t.workspaceId = workspaceId;
      t.runCount = (t.runCount ?? 0) + 1;
      // 记录 fork 时的 base tip：验收时 base 前进了要拒绝/要求 rebase，避免把旧树 squash 进新 base。
      t.baseShaAtDispatch = t.baseShaAtDispatch ?? snapshot.head ?? null;
      t.updatedAt = nowIso();
      s.runs.push(run);
    });
    saveNow(core);

    // 6) prompt
    const brief = buildBrief(core, project, findTask(core, task.id), worktreeAttachments);
    const prompt = await promptSession(core, sessionId, brief);
    if (!prompt.ok) throw new Error(prompt.error);
    return { ok: true, task: taskView(core, findTask(core, task.id)), run: runView(core, run), sessionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      if (!t) return;
      // 派发失败时任务可能已经被用户取消/验收：不要用 failed 覆盖终态。
      if (["abandoned", "accepted", "merged"].includes(t.status)) { t.updatedAt = nowIso(); return; }
      t.status = "failed";
      t.error = message;
      t.updatedAt = nowIso();
    });
    saveNow(core);
    core.log(`dispatch #${task.id} 失败`, message);
    return { ok: false, code: "dispatch-failed", error: message, task: taskView(core, findTask(core, task.id)) };
  }
}

/** 操作员取消任务会话（终止 agent 当前 turn，任务标 failed；用于重复派发/误派发的清理）。 */
async function cancelTask(core, taskId, reason) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (["accepted", "merged"].includes(task.status)) return { ok: false, code: "state", error: `任务已${task.status === "merged" ? "合并" : "验收"}，不能取消` };
  let cancelled = false;
  if (task.sessionId) {
    try {
      const resolved = await resolvePromptAgent(core, task.sessionId);
      if (resolved?.agent) {
        resolved.agent.cancel({ kind: "user" }, { keepInbox: false });
        cancelled = true;
      }
    } catch (error) {
      core.log(`cancel agent 失败 #${task.id}`, String(error));
    }
  }
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    if (t) {
      t.status = "abandoned";
      t.abandonReason = `用户取消需求：${String(reason ?? "").slice(0, 300)}`;
      t.abandonCategory = "cancelled";
      t.updatedAt = nowIso();
    }
  });
  saveNow(core);
  core.log(`cancel task #${task.id} session=${task.sessionId ?? "-"} agentCancelled=${cancelled}`);
  return { ok: true, task: taskView(core, findTask(core, task.id)), agentCancelled: cancelled };
}


/** 归档一个会话（侧栏隐藏，数据保留）。 */
async function archiveSessionById(core, sessionId) {
  if (!sessionId) return { ok: false, code: "empty", error: "sessionId 不能为空" };
  const reg = svc(core, "workspaceRegistry");
  if (!reg || typeof reg.archiveSession !== "function") return { ok: false, code: "no-service", error: "workspaceRegistry 不可用" };
  try {
    await reg.archiveSession(sessionId);
    return { ok: true, archived: true, sessionId };
  } catch (error) {
    return { ok: false, code: "archive-failed", error: String(error?.message ?? error) };
  }
}

/** 按 sessionId 取消一个会话（用于清理未被任务表跟踪的孤儿会话）。 */
async function cancelSession(core, sessionId, reason) {
  const sc = svc(core, "sessionController");
  let cancelled = false;
  try {
    const resolved = await sc?.resolveAgent?.(sessionId);
    if (resolved?.agent) {
      resolved.agent.cancel({ kind: "user" }, { keepInbox: false });
      cancelled = true;
    }
  } catch (error) {
    core.log(`cancelSession 失败 ${sessionId}`, String(error));
  }
  core.log(`cancelSession ${sessionId} cancelled=${cancelled} reason=${String(reason ?? "").slice(0, 80)}`);
  return { ok: true, sessionId, cancelled };
}

/** 操作员中途给任务会话补指令（接管/纠偏/让 agent 自己 rebase 解冲突）。 */
async function promptTask(core, taskId, text) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (!task.sessionId) return { ok: false, code: "no-session", error: "任务还没有会话（未派发）" };
  const message = String(text ?? "").trim();
  if (message === "") return { ok: false, code: "empty", error: "指令不能为空" };
  if (["accepted", "merged", "abandoned"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务已${task.status === "merged" ? "合并" : task.status === "accepted" ? "验收" : "放弃"}，不能再补指令` };
  }
  if (core.reviewing?.has(task.id)) {
    return { ok: false, code: "busy", error: "任务正在验收判定中，等判定结束后再补指令" };
  }
  if (!ACTIVE.has(task.status)) {
    const allowed = canStartTask(core, task);
    if (!allowed.ok) return allowed;
  }
  const body = `【工程台操作员指令 · 任务 #${task.id}】\n${message}`;
  const r = await promptSession(core, task.sessionId, body);
  if (!r.ok) return r;
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    t.interventions = Array.isArray(t.interventions) ? t.interventions : [];
    t.interventions.push({ at: nowIso(), text: message.slice(0, 2000) });
    t.updatedAt = nowIso();
    if (t.status === "needs_review" || t.status === "failed") {
      // 操作员直接补指令等同于继续返工
      t.status = "running";
      s.counters.run += 1;
      s.runs.push({
        id: `r${s.counters.run}`,
        taskId: t.id,
        sessionId: t.sessionId,
        startedAt: nowIso(),
        endedAt: null,
        outcome: null,
        reason: null,
        diffStat: "",
        filesChanged: 0,
        selfTest: { total: 0, passed: 0, failed: 0, commands: [] },
        finalText: "",
        setup: [],
        drift: {},
        rework: "operator-instruction",
      });
    }
  });
  saveNow(core);
  core.log(`operator prompt #${task.id}: ${message.slice(0, 80)}`);
  return { ok: true, task: taskView(core, findTask(core, task.id)) };
}

/* ─────────────────────────── 证据归集 ─────────────────────────── */

/** 判断一条 shell 命令是否是「自测/验收」命令（用于证据归集）。
 * 注意：不能只做子串匹配——`wc -l .../model.test.ts`、`git diff -- test` 这类也会命中 test。
 * 先剥掉 `cd ... &&` 前缀，再要求命令词落在开头（npm/npx/node tools/... 等）。 */
function isSelfTestCommand(command) {
  const stripped = String(command ?? "")
    .trim()
    .replace(/^(?:cd\s+[^&;]+?\s*&&\s*)+/g, "")
    .trim();
  if (stripped === "") return false;
  if (/^(wc|ls|cat|grep|rg|sed|find|git|head|tail|echo|cp|mkdir|rm|stat|file|xxd|od|jq|python3?\s+-c|curl)\b/.test(stripped)) return false;
  return /^(npm\s+(run\s+)?(test|build|typecheck|verify|ci)|pnpm\s+(run\s+)?(test|build|typecheck|verify|ci)|npx\s+(vitest|jest|tsc)|tsc\b|eslint\b|pytest\b|python3?\s+-m\s+pytest|make\s+(test|check|verify)|ffprobe\b|node\s+tools\/verify|node\s+\S*(check|test|verify|spec)\S*|node\s+--test\b|bash\s+\S*(check|test|verify)\S*|google-chrome\b|chromium\b)/i.test(stripped)
    || /(^|[&;|]\s*)(npm\s+(run\s+)?(test|build|typecheck)|pnpm\s+(run\s+)?(test|build|typecheck)|npx\s+vitest|node\s+tools\/verify)/i.test(stripped);
}

/** 按命令记录重算自测汇总：项目 verify 命令无论叫什么名字都算自测。 */
function computeSelfTest(commands, verifyCommands = []) {
  const verifySet = new Set((verifyCommands ?? []).map((command) => String(command).trim()).filter(Boolean));
  const picked = (Array.isArray(commands) ? commands : []).filter((command) => command && command.kind !== "file"
    && (isSelfTestCommand(command.command) || verifySet.has(String(command.command ?? "").trim())));
  return {
    total: picked.length,
    passed: picked.filter((command) => command.ok).length,
    failed: picked.filter((command) => !command.ok).length,
    commands: picked.slice(-40),
  };
}

function messageText(content) {
  if (!Array.isArray(content)) return "";
  return content.map((b) => (b?.type === "text" ? b.text : b?.type === "tool-call" ? "" : "")).join("");
}

function parseToolArguments(raw) {
  if (raw === undefined || raw === null) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(String(raw)); } catch { return { raw: String(raw) }; }
}

function commandOfToolCall(name, args) {
  if (!args) return null;
  if (typeof args.command === "string") return args.command;
  if (typeof args.script === "string") return args.script;
  if (Array.isArray(args.commands)) return args.commands.join("\n");
  if (Array.isArray(args.args)) return args.args.join(" ");
  if (Array.isArray(args.actions)) {
    return args.actions
      .map((a) => a?.command ?? a?.cmd ?? a?.input?.command ?? null)
      .filter(Boolean)
      .join("\n");
  }
  return null;
}

function exitCodeOf(text, toolName) {
  const value = String(text ?? "");
  // 这些是「没跑完」的终止标记：超时/被信号杀/转后台/被停止。
  // 不能因为后面没有 [exit code: N] 就当成功——promoted 的 npm test 在证据里会是假绿灯。
  if (/\[timed out after \d+ms\]/i.test(value)
    || /\[still running after \d+ms; moved to background job/i.test(value)
    || /\[killed by signal:/i.test(value)
    || /\[stopped:/i.test(value)) return null;
  const m = /\[exit code:\s*(-?\d+)\]/.exec(value);
  if (m) return Number(m[1]);
  if (/error/i.test(value) && /^\s*(Error|error)/.test(value)) return null;
  if (toolName === "bash" || toolName === "bash-persistent" || toolName === "pwsh") return 0;
  return null;
}

/** 从一串会话事件里抽证据（命令 + 退出码 + 尾部输出 + 最终报告 + spawn_teammate 记录）。 */
function evidenceOfEvents(events) {
  const calls = new Map();
  const commands = [];
  const spawns = [];
  let finalText = "";
  let firstUserText = "";
  for (const evt of events) {
    if (!evt || !evt.type) continue;
    if (evt.type === "tool/call") {
      calls.set(evt.data.callId, evt.data);
      if (evt.data?.name === "spawn_teammate") {
        const args = parseToolArguments(evt.data.arguments);
        spawns.push({
          name: typeof args?.name === "string" ? args.name : null,
          description: typeof args?.description === "string" ? args.description : "",
        });
      }
    } else if (evt.type === "tool/result") {
      const d = evt.data;
      const call = calls.get(d.message?.source?.callId ?? d.message?.toolCallId);
      const name = call?.name ?? "tool";
      const args = parseToolArguments(call?.arguments);
      const text = messageText(d.message?.content ?? []);
      if (name === "bash" || name === "bash-persistent" || name === "pwsh" || name === "pwsh-persistent") {
        const command = commandOfToolCall(name, args);
        if (command) {
          const exitCode = exitCodeOf(text, name);
          commands.push({ command, exitCode, ok: exitCode === 0, tail: tail(text, 1200), tool: name });
        }
      } else if (name === "write" || name === "edit" || name === "str_replace_editor") {
        const target = args.path ?? args.file_path ?? args.filePath ?? "";
        commands.push({ command: `${name} ${target}`, exitCode: 0, ok: true, tail: "", tool: name, kind: "file" });
      }
    } else if (evt.type === "assistant/message") {
      const text = messageText(evt.data?.message?.content ?? []);
      if (text && text.trim() !== "") finalText = text;
    } else if (evt.type === "user/message") {
      if (firstUserText === "") firstUserText = messageText(evt.data?.content ?? []).replace(/\s+/g, " ").trim();
    }
  }
  const selfTestCommands = commands.filter((c) => c.kind !== "file" && isSelfTestCommand(c.command));
  const passed = selfTestCommands.filter((c) => c.ok).length;
  const failed = selfTestCommands.filter((c) => !c.ok).length;
  return {
    commands: commands.slice(-120),
    selfTest: {
      total: selfTestCommands.length,
      passed,
      failed,
      commands: selfTestCommands.slice(-40),
    },
    finalText: tail(finalText, 6000),
    spawns,
    firstUserText,
  };
}

/** 读一条会话并抽证据；读失败返回 null（不阻塞主流程）。 */
async function readSessionEvidence(core, sessionId) {
  const events = await readSessionEvents(core, sessionId);
  if (events === null) return null;
  return evidenceOfEvents(events);
}

/** 任务主会话开出来的 teammate 子会话（Agent Teams：origin=subagent、parentSession=主会话）。 */
async function teammateSessionsOf(core, mainSessionId) {
  const sq = svc(core, "sessionQuery");
  if (!sq || typeof sq.traceSession !== "function" || !mainSessionId) return [];
  let trace = null;
  try {
    trace = await sq.traceSession(mainSessionId);
  } catch (error) {
    core.log("traceSession 失败", mainSessionId, String(error));
    return [];
  }
  const rows = [];
  const walk = (nodes, depth) => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const header = node?.session?.header ?? {};
      if (header.id && depth <= 2) {
        rows.push({
          sessionId: header.id,
          depth,
          createdAt: header.createdAt ?? null,
          agentPreset: header.agentPreset ?? null,
        });
      }
      walk(node?.descendants, depth + 1);
    }
  };
  walk(trace?.descendants, 1);
  rows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  return rows.slice(0, 8);
}

/** 从 teammate 首条 prompt 里认名字（spawn 参数缺失时的兜底）。 */
function teammateNameFromText(text) {
  const match = /(?:teammate|队友)\s*[`「]([^`」]+)[`」]/.exec(String(text ?? ""));
  return match ? match[1] : null;
}

/** 采集主会话下面所有 teammate 的证据（自测命令 + 最终报告），口径和父会话一致，按体积裁剪。 */
async function collectTeammateEvidence(core, mainSessionId, spawns = []) {
  const mates = await teammateSessionsOf(core, mainSessionId);
  if (mates.length === 0) return [];
  const out = [];
  for (const [index, mate] of mates.entries()) {
    const evidence = await readSessionEvidence(core, mate.sessionId);
    if (!evidence) continue;
    const spawn = spawns[index] ?? null;
    const selfTestCommands = (evidence.selfTest.commands ?? []).map((command) => ({
      ...command,
      tail: tail(command.tail ?? "", 600),
    }));
    out.push({
      sessionId: mate.sessionId,
      name: spawn?.name ?? teammateNameFromText(evidence.firstUserText) ?? `teammate-${index + 1}`,
      description: spawn?.description ?? "",
      depth: mate.depth,
      createdAt: mate.createdAt,
      commandCount: evidence.commands.length,
      selfTest: {
        total: evidence.selfTest.total,
        passed: evidence.selfTest.passed,
        failed: evidence.selfTest.failed,
        commands: selfTestCommands,
      },
      finalText: tail(evidence.finalText, 2500),
    });
    if (out.length >= 8) break;
  }
  return out;
}

/** 从会话日志抽取证据（命令 + 退出码 + 尾部输出 + 最终报告），并顺带归集 teammate 子会话。 */
async function collectEvidence(core, run) {
  const parent = await readSessionEvidence(core, run.sessionId);
  if (parent === null) {
    core.log("readSession 失败", run.sessionId);
    return { commands: [], selfTest: { total: 0, passed: 0, failed: 0, commands: [] }, finalText: "", teammates: [] };
  }
  const teammates = await collectTeammateEvidence(core, run.sessionId, parent.spawns ?? []);
  return {
    commands: parent.commands,
    selfTest: parent.selfTest,
    finalText: parent.finalText,
    teammates,
  };
}

/** 报告/详情用的 teammate 证据：run 里已归集就直接用；历史 run 现场从会话日志补。 */
async function teammateEvidenceForReport(core, run) {
  if (!run || !run.sessionId) return [];
  if (Array.isArray(run.teammates) && run.teammates.length > 0) return run.teammates;
  const parent = await readSessionEvidence(core, run.sessionId);
  const spawns = parent?.spawns ?? [];
  if (spawns.length === 0) return [];
  return collectTeammateEvidence(core, run.sessionId, spawns);
}

/** 重收某个任务最近一次 run 的证据（turn/end 归集失败、插件重启后的恢复手段）。 */
async function recollectEvidence(core, taskId) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  const run = lastRunOf(core, task.id);
  if (!run) return { ok: false, code: "no-run", error: "任务还没有 run" };
  const project = findProject(core, task.projectId);
  const evidence = await collectEvidence(core, run);
  const worktreeAlive = Boolean(project && task.worktreePath && existsSync(task.worktreePath));
  // 任务合并后 worktree 已清理：diff/drift 没法重算，保留上次归集的，只刷新会话侧证据（含 teammate）。
  const diff = worktreeAlive
    ? await diffStat(task.worktreePath, task.branch)
    : { diffStat: run.diffStat ?? "", filesChanged: run.filesChanged ?? 0, files: Array.isArray(run.files) ? run.files : [] };
  let drift = run.drift ?? {};
  if (project && worktreeAlive) {
    const snapNow = await repoSnapshot(project.repoPath);
    const before = run.drift?.snapshotAtDispatch ?? {};
    drift = {
      ...drift,
      snapshotAtEnd: snapNow,
      mainRepoChanged: Boolean(before.head && snapNow.head !== before.head),
      statusDirty: Boolean((snapNow.status ?? "").trim() !== ""),
    };
  }
  const selfTest = computeSelfTest(evidence.commands, project?.verify?.commands ?? []);
  mutate(core, (s) => {
    const r = s.runs.find((x) => x.id === run.id);
    if (!r) return;
    r.selfTest = selfTest;
    r.commands = evidence.commands;
    r.finalText = evidence.finalText;
    r.teammates = evidence.teammates ?? [];
    r.diffStat = diff.diffStat;
    r.filesChanged = diff.filesChanged;
    r.files = diff.files;
    r.drift = drift;
    if (r.endedAt === null) {
      r.endedAt = nowIso();
      r.outcome = "finished";
      r.reason = r.reason ?? "recovered";
    }
  });
  saveNow(core);
  core.log(`recollect evidence #${task.id} run=${run.id} selfTest=${evidence.selfTest.passed}/${evidence.selfTest.total} diff=${diff.diffStat}`);
  return { ok: true, task: taskView(core, findTask(core, task.id)), run: runView(core, lastRunOf(core, task.id)) };
}

/** turn/end 处理：归集证据、状态投影、漂移检测。 */
async function handleTurnEnd(core, session, event) {
  const sessionId = session?.id;
  if (!sessionId) return;
  const run = core.state.runs.find((r) => r.sessionId === sessionId && r.endedAt === null);
  const reason = event?.data?.reason ?? {};
  if (!run) {
    // lead 会话：只更新状态
    if (core.state.lead.sessionId === sessionId) {
      mutate(core, (s) => { s.settings.leadStatus = "idle"; });
    }
    return;
  }
  const task = findTask(core, run.taskId);
  if (!task) return;
  core.log(`turn/end #${task.id} reason=${reason.kind ?? "?"} session=${sessionId}`);
  mutate(core, (s) => {
    const r = s.runs.find((x) => x.id === run.id);
    if (!r) return;
    r.endedAt = nowIso();
    r.reason = reason.kind ?? "unknown";
    r.outcome = reason.kind === "completed" || reason.kind === "done" || reason.kind === "success" ? "finished" : "failed";
  });
  // provider 服务端错误（503/429/RATE_LIMIT/SERVER/TIMEOUT/overloaded）不是任务的错：
  // 自动重派（最多 3 次，指数退避），否则一次网关抖动就毁掉无人值守的队列。
  const failureText = String(reason?.error?.message ?? reason?.error?.code ?? "");
  const providerTransient = reason.kind === "error" && /(\b5\d\d\b|429|RATE_LIMIT|SERVER|TIMEOUT|overload|ECONNRESET|ETIMEDOUT)/i.test(failureText);
  if (providerTransient) {
    const taskNow = findTask(core, task.id);
    const attempts = (taskNow?.retryCount ?? 0) + 1;
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      if (t) {
        t.retryCount = attempts;
        t.error = `provider 暂时不可用，自动重试 ${attempts}/${PROVIDER_RETRY_MAX}：${failureText}`;
        t.status = attempts <= PROVIDER_RETRY_MAX ? "queued" : "failed";
        t.updatedAt = nowIso();
      }
    });
    saveNow(core);
    if (attempts <= PROVIDER_RETRY_MAX) {
      const delaySec = PROVIDER_RETRY_DELAYS_SEC[attempts - 1] ?? attempts * 60;
      core.log(`#${task.id} provider 错误，${attempts}/${PROVIDER_RETRY_MAX} 次重试将在 ${delaySec}s 后进行：${failureText}`);
      const timer = setTimeout(() => {
        void dispatchTask(core, task.id).then((r) => {
          core.log(`#${task.id} 自动重试派发 ${r.ok ? "ok" : "失败: " + r.error}`);
        }).catch((error) => core.log("自动重试失败", String(error)));
      }, delaySec * 1000);
      if (typeof timer.unref === "function") timer.unref();
    } else {
      core.log(`#${task.id} 重试 ${PROVIDER_RETRY_MAX} 次仍失败，标记 failed：${failureText}`);
    }
    return;
  }

  // 证据（异步，写盘统一在最后）
  try {
    const evidence = await collectEvidence(core, run);
    const project = findProject(core, task.projectId);
    const diff = project && task.worktreePath ? await diffStat(task.worktreePath, task.branch) : { diffStat: "", filesChanged: 0 };
    let drift = { mainRepoChanged: false };
    if (project) {
      const snapNow = await repoSnapshot(project.repoPath);
      const before = run.drift?.snapshotAtDispatch ?? {};
      drift = {
        snapshotAtEnd: snapNow,
        mainRepoChanged: Boolean(before.head && snapNow.head !== before.head),
        statusDirty: Boolean((snapNow.status ?? "").trim() !== ""),
      };
    }
    const selfTest = computeSelfTest(evidence.commands, project?.verify?.commands ?? []);
    mutate(core, (s) => {
      const r = s.runs.find((x) => x.id === run.id);
      if (r) {
        r.selfTest = selfTest;
        r.commands = evidence.commands;
        r.finalText = evidence.finalText;
        r.teammates = evidence.teammates ?? [];
        r.diffStat = diff.diffStat;
        r.filesChanged = diff.filesChanged;
        r.files = diff.files;
        r.drift = { ...(r.drift ?? {}), ...drift };
      }
      const t = s.tasks.find((x) => x.id === task.id);
      if (t) {
        // 终态优先：任务已被放弃/验收/合并时，迟到的 turn/end 不再改状态（只记证据）。
        if (!["abandoned", "accepted", "merged"].includes(t.status)) {
          const okTurn = reason.kind === "completed" || reason.kind === "done" || reason.kind === "success";
          // 成功结束先进入「验收中」（verifying），由 lead 自动验收后转为通过/打回；
          // turn 异常则直接 failed，交人工处理。
          t.status = okTurn ? "verifying" : "failed";
          t.error = okTurn ? null : `会话结束原因：${reason.kind ?? "unknown"}${failureText ? `：${failureText.slice(0, 300)}` : ""}`;
        }
        t.updatedAt = nowIso();
      }
    });
  } catch (error) {
    core.log("证据归集失败", String(error));
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      if (t && !["abandoned", "accepted", "merged"].includes(t.status)) t.status = "verifying";
    });
  }
  saveNow(core);

  // 自动验收：只对成功收尾的任务；失败 turn 交人工。按 settings.reviewMode 分派，
  // 默认走一次性判定器（reviewer），不再把任务证据灌进常驻 lead 会话。
  const reviewed = findTask(core, task.id);
  if (reviewed && reviewed.status === "verifying") {
    void requestReview(core, reviewed.id).then((r) => {
      if (!r.ok) core.log(`自动验收未触发 #${reviewed.id}：${r.error ?? r.code}`);
    }).catch((error) => core.log("自动验收异常", String(error)));
  }
}

/* ─────────────────────────── lead 自动验收（验收中） ─────────────────────────── */

function buildReviewPrompt(core, task, run) {
  const project = findProject(core, task.projectId);
  const st = run?.selfTest ?? {};
  const cmds = (st.commands ?? []).map((c) => `- \`${c.command}\` → exit ${c.exitCode}${c.ok === false ? "（失败）" : ""}；输出尾部：${String(c.tail ?? "").slice(0, 300).replace(/\n/g, " ")}`).join("\n");
  const files = (run?.files ?? []).slice(0, 40).map((f) => `- ${f.path}（+${f.additions}/-${f.deletions}）`).join("\n");
  const drift = run?.drift?.mainRepoChanged ? "警告：主仓在任务执行期间有变更（drift），验收时注意对比基线。" : "无 drift。";
  return [
    `【工程台自动验收 · 任务 #${task.id}】${task.title}`,
    `项目：${project?.name ?? task.projectId}；类型：${task.type}；依据：任务自测证据 + diff + 验收标准。`,
    "",
    "你的角色：工程台 super agent，替操作员做第一道验收。只做审查和判定，不要改代码、不要派新任务。",
    "判定标准：①DoD/需求核心是否真的实现（看证据与 diff，不只看报告自述）；②自测命令是否全绿且覆盖需求；③有无越界改动/调试残留/明显风险；④证据不足以判断时不要硬判。",
    "",
    `自测：${st.passed ?? 0}/${st.total ?? 0} 项通过；文件变更 ${run?.filesChanged ?? 0} 个；diff ${run?.diffStat ?? "-"}。`,
    cmds ? `\n命令结果：\n${cmds}` : "",
    files ? `\n改动文件：\n${files}` : "",
    "",
    `diff 基线：${project?.baseBranch ?? "main"}；${drift}`,
    "",
    "判定动作（必须三选一）：",
    `- 通过：调用 project_accept {task_id:${task.id}}；`,
    `- 不通过：调用 project_rework {task_id:${task.id}, feedback:"具体、可执行的返工意见（指出证据/代码里的问题）"}；`,
    `- 证据不足或需求有歧义：调用 project_question {text:"...", task_id:${task.id}} 提待澄清，不要验收。`,
    "不要输出长篇报告，判定后一句话说明理由即可。",
  ].filter((line) => line !== "").join("\n");
}

/** 让 lead 对指定任务做验收（幂等节流：同一 run 只自动请求一次）。 */
async function requestLeadReview(core, taskId, options = {}) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (!["verifying", "needs_review"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务状态 ${task.status} 不需要验收` };
  }
  const run = lastRunOf(core, task.id);
  if (!options.force && run?.autoReviewRequestedAt) {
    return { ok: false, code: "already", error: "本轮已请求过自动验收" };
  }
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    if (t) {
      // 进入验收中：状态先落 verifying，lead 判定后再 accepted/rework/待澄清，
      // 这样看板能真实显示「工程台验收中」而不是停在 needs_review 干等。
      if (t.status === "needs_review") t.status = "verifying";
      t.reviewRounds = (t.reviewRounds ?? 0) + 1;
      t.updatedAt = nowIso();
    }
    const r = s.runs.find((x) => x.id === run?.id);
    if (r) r.autoReviewRequestedAt = nowIso();
  });
  saveNow(core);
  const text = buildReviewPrompt(core, findTask(core, task.id), lastRunOf(core, task.id));
  const res = await promptLead(core, text);
  core.log(`lead 自动验收请求 #${task.id} → ${res.ok ? "已发送" : "失败: " + res.error}`);
  return { ok: res.ok, error: res.error };
}

/* ─────────────────── 一次性验收判定器（reviewer） ─────────────────── */

/** 判定器模型：设置里配了用配置的；否则跟随工作台模型 + high 思考强度。 */
function reviewerModelOf(core) {
  const configured = normalizeModelSelection(core.state.settings?.reviewerModel);
  if (configured) return configured;
  const base = workbenchModelOf(core);
  if (base?.provider && base?.model) return { provider: base.provider, model: base.model, reasoningEffort: "high" };
  return { reasoningEffort: "high" };
}

/** 解析判定器输出：必须是一行/一段 JSON；不允许缺 feedback 的 rework。 */
function parseReviewVerdict(text) {
  const raw = String(text ?? "").trim();
  if (raw === "") return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let obj;
  try { obj = JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  const verdict = String(obj?.verdict ?? "").trim().toLowerCase();
  if (!["accept", "rework", "need_info"].includes(verdict)) return null;
  const confidenceRaw = String(obj?.confidence ?? "med").trim().toLowerCase();
  const confidence = ["low", "med", "high"].includes(confidenceRaw) ? confidenceRaw : "med";
  const reason = String(obj?.reason ?? "").trim().slice(0, 300);
  const feedback = String(obj?.feedback ?? "").trim().slice(0, 1000);
  if (verdict === "rework" && feedback === "") return null;
  return { verdict, confidence, reason, feedback };
}

/** 登录 shell 启动时可能往 stderr 打 dconf/GTK 噪音：清掉，别让它进证据卡。 */
function cleanShellNoise(text) {
  return String(text ?? "")
    .split("\n")
    .filter((line) => !/^Unexpected value in dconf:?/.test(line) && !/^Binding '.*' already registered/.test(line))
    .join("\n")
    .trim();
}

/** 从任务 worktree 里找最多 N 张验收截图（任务产出优先，参考截图兜底）。 */
function imageMime(file) {
  const ext = String(file ?? "").toLowerCase();
  if (ext.endsWith(".png")) return "image/png";
  if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return "image/jpeg";
  if (ext.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function collectImageFiles(dir, out, max, depth = 0) {
  if (depth > 2 || out.length >= max) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (out.length >= max) return;
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { collectImageFiles(full, out, max, depth + 1); continue; }
    if (!/\.(png|jpe?g|webp)$/i.test(entry.name)) continue;
    try {
      const st = lstatSync(full);
      if (st.isSymbolicLink() || !st.isFile()) continue;
      if (st.size > 0 && st.size <= 1.5 * 1024 * 1024) out.push(full);
    } catch { /* skip */ }
  }
}

function collectReviewImagePaths(core, task, run, max = 3) {
  const limit = positiveInt(max, 3, 0, 8);
  if (limit === 0) return [];
  const produced = [];
  const refs = [];
  const add = (file, bucket) => {
    if (!file) return;
    try {
      const st = lstatSync(file);
      if (st.isSymbolicLink() || !st.isFile() || st.size <= 0 || st.size > 1.5 * 1024 * 1024) return;
      if (!/\.(png|jpe?g|webp)$/i.test(file)) return;
      if (!produced.includes(file) && !refs.includes(file)) bucket.push(file);
    } catch { /* skip */ }
  };
  if (task.worktreePath && existsSync(task.worktreePath)) {
    for (const item of run?.files ?? []) add(join(task.worktreePath, item.path), produced);
    for (const sub of ["artifacts", "acceptance", "screenshots", "evidence"]) {
      const dir = join(task.worktreePath, sub);
      if (existsSync(dir)) collectImageFiles(dir, produced, limit * 4);
    }
  }
  for (const att of task.attachments ?? []) add(att.path ?? att.worktreePath, refs);
  // 关键图优先：before/after/compare/final/result 这类文件名排前面；参考图排后。
  const score = (file) => {
    const name = basename(file).toLowerCase();
    if (/before|after|compare|diff|final|accept|result|验收|对比|前后/.test(name)) return 0;
    if (/shot|screenshot|截图|view|page|render/.test(name)) return 1;
    return 2;
  };
  const all = [...produced, ...refs];
  const refSet = new Set(refs);
  all.sort((a, b) => (score(a) + (refSet.has(a) ? 10 : 0)) - (score(b) + (refSet.has(b) ? 10 : 0)));
  return all.slice(0, limit);
}

/** 把证据卡 + 验收截图组成一条 user message（attachments 服务不可用时退化为纯文本）。 */
async function buildReviewMessage(core, prompt, task, run) {
  const max = positiveInt(core.state.settings?.reviewImageMax, 3, 1, 8);
  if (max <= 0) return userMessage(prompt);
  const paths = collectReviewImagePaths(core, task, run, max);
  if (paths.length === 0) return userMessage(prompt);
  const attachments = svc(core, "attachments");
  if (!attachments || typeof attachments.admitPromptContent !== "function") return userMessage(prompt);
  try {
    const names = paths.map((file) => basename(file)).join("、");
    const parts = [{ type: "text", text: `${prompt}\n\n附 ${paths.length} 张验收截图（${names}；任务产出优先、参考图兜底；不是 diff 的一部分）：` }];
    for (const file of paths) {
      parts.push({ type: "image", data: readFileSync(file).toString("base64"), mediaType: imageMime(file), name: basename(file) });
    }
    const admitted = await attachments.admitPromptContent(parts);
    return { id: uuid(), role: "user", content: admitted, source: { kind: "user" } };
  } catch (error) {
    core.log("验收截图内联失败（退化为纯文本）", String(error?.message ?? error));
    return userMessage(prompt);
  }
}

/** need_info 时宿主复跑项目验证命令：把「没跑测试」变成硬证据（最多 2 条，失败即停）。 */
async function runHostVerify(core, task, run) {
  const project = findProject(core, task.projectId);
  const commands = Array.isArray(project?.verify?.commands) ? project.verify.commands : [];
  if (!task.worktreePath || !existsSync(task.worktreePath) || commands.length === 0) {
    return { ok: false, skipped: true };
  }
  const timeout = positiveInt(core.state.settings?.hostVerifyTimeoutMs, 120000, 10000, 600000);
  const before = ((await statusPorcelain(task.worktreePath, { all: true })) ?? "");
  const results = [];
  for (const command of commands) {
    const r = await runShell(command, { cwd: task.worktreePath, env: project?.setup?.env ?? {}, timeoutMs: timeout });
    const output = r.ok ? (r.stdout ?? "") : `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
    results.push({
      command,
      exitCode: r.exitCode,
      ok: r.ok,
      timedOut: Boolean(r.timedOut),
      ms: r.ms,
      tail: tail(cleanShellNoise(output), 1200),
    });
    if (!r.ok) break;
  }
  const after = ((await statusPorcelain(task.worktreePath, { all: true })) ?? "");
  const tracked = (text) => text.split("\n").filter((line) => line !== "" && !line.startsWith("??")).join("\n");
  const dirty = tracked(before) !== tracked(after);
  mutate(core, (s) => {
    const r = s.runs.find((x) => x.id === run.id);
    if (r) { r.hostVerify = results; r.hostVerifyAt = nowIso(); r.hostVerifyDirty = dirty; }
  });
  saveNow(core);
  core.log(`宿主复跑 #${task.id}：${results.map((r) => `${r.ok ? "✓" : "✗"} ${r.command} exit=${r.exitCode ?? "?"}`).join("；")}${dirty ? "（改动受跟踪文件）" : ""}`);
  return { ok: results.every((r) => r.ok) && !dirty, results, dirty, skipped: false };
}

/** 组装判定器证据卡（单条 user message，≤15KB；diff 直接给，不让模型自己去查）。 */
async function buildReviewEvidenceCard(core, task, run) {
  const project = findProject(core, task.projectId);
  const st = run?.selfTest ?? {};
  // 展示会话里所有跑过的 bash 命令（不只「自测」正则命中的），否则 node check.mjs
  // 这类等价验证会被漏掉，判定器只能看到 0/0 而误判 need_info。
  const allCommands = (Array.isArray(run?.commands) ? run.commands : []).filter((c) => c.kind !== "file");
  const commandSource = allCommands.length > 0 ? allCommands : (st.commands ?? []);
  // 命令窗口：项目 verify 命令优先保留，再补最近 12 条；避免长任务把关键测试挤出窗口。
  const verifySet = new Set((Array.isArray(project?.verify?.commands) ? project.verify.commands : []).map((c) => String(c).trim()));
  const recent = commandSource.slice(-12);
  const verifyHits = commandSource.filter((c) => verifySet.has(String(c.command ?? "").trim()));
  const cmdSource = [...verifyHits, ...recent.filter((c) => !verifyHits.includes(c))].slice(0, 20);
  const cmdLines = cmdSource.map((c) => {
    if (c.ok === false) {
      return `- ✗ ${c.command}（exit ${c.exitCode ?? "?"}）\n  尾部：${cleanShellNoise(String(c.tail ?? "")).slice(0, 700).replace(/\n/g, "\n  ")}`;
    }
    const cleaned = cleanShellNoise(String(c.tail ?? "")).replace(/\s+/g, " ");
    return `- ✓ ${c.command}（exit ${c.exitCode ?? 0}）${cleaned ? `：${cleaned.slice(0, 120)}` : ""}`;
  });
  // 项目验证命令 + package.json scripts：让判定器能判断「npm test」与「node check.mjs」是否等价。
  const verifyLines = [];
  if (Array.isArray(project?.verify?.commands) && project.verify.commands.length > 0) {
    verifyLines.push(`- 项目验证命令：${project.verify.commands.join("；")}`);
  }
  if (task.worktreePath) {
    try {
      const pkg = JSON.parse(readFileSync(join(task.worktreePath, "package.json"), "utf8"));
      if (pkg && pkg.scripts && Object.keys(pkg.scripts).length > 0) {
        verifyLines.push(`- package.json scripts：${JSON.stringify(pkg.scripts).slice(0, 600)}`);
      }
    } catch { /* 没有 package.json 或解析失败 */ }
  }
  const hostVerifyLines = (run?.hostVerify ?? []).map((r) => `- ${r.ok ? "✓" : "✗"} ${r.command}（exit ${r.exitCode ?? "?"}${r.timedOut ? "，超时" : ""}）${r.tail ? `：${String(r.tail).replace(/\s+/g, " ").slice(0, 200)}` : ""}`);
  const selfTestView = computeSelfTest(commandSource, project?.verify?.commands ?? []);
  const files = (run?.files ?? []).slice(0, 20).map((f) => `- ${f.path}（+${f.additions}/-${f.deletions}）`);
  const dod = (task.dod ?? []).slice(0, 12).map((d) => `- ${d}`);
  let diff = "";
  if (task.worktreePath && project) {
    try { diff = await diffText(task.worktreePath, project.baseBranch, 12288); } catch (error) { diff = `（读 diff 失败：${String(error?.message ?? error)}）`; }
  }
  let status = "";
  if (task.worktreePath) {
    try {
      status = ((await statusPorcelain(task.worktreePath, { all: true })) ?? "")
        .split("\n")
        .filter((line) => !line.includes(".project-console/"))
        .join("\n");
    } catch { status = ""; }
  }
  const drift = run?.drift?.mainRepoChanged ? "主仓在任务期间有变更（drift），diff 基线可能不可靠。" : "无 drift。";
  const prompt = [
    `【一次性验收判定 · 任务 #${task.id}】${task.title}`,
    `项目：${project?.name ?? task.projectId}；类型：${task.type}；工作量：${task.size ?? "?"}`,
    "",
    "## 验收标准（DoD）",
    dod.length > 0 ? dod.join("\n") : "（任务没有写 DoD）",
    "",
    ...(verifyLines.length > 0 ? ["## 项目验证配置", ...verifyLines, ""] : []),
    "## 需求摘要",
    capBytes(String(task.brief ?? "").trim() || "（无）", 1500),
    "",
    "## 改动（相对 base，含未跟踪文件）",
    diff || "（空：没有任何改动）",
    "",
    "## 实际跑过的命令",
    cmdLines.length > 0 ? cmdLines.join("\n") : "（任务没有跑过命令）",
    ...(commandSource.length > cmdSource.length ? [`（命令窗口只展示项目验证命令 + 最近 12 条；共 ${commandSource.length} 条）`] : []),
    "",
    ...(hostVerifyLines.length > 0 ? ["## 宿主复跑验证（不是任务自述，退出码可信）", ...hostVerifyLines, ""] : []),
    "## 改动文件",
    files.length > 0 ? files.join("\n") : "（无）",
    "",
    "## 工作区状态（验收前）",
    capBytes(status || "（干净）", 800),
    "",
    "## 任务最终报告（摘要）",
    capBytes(String(run?.finalText ?? "").trim() || "（无）", 1800),
    "",
    "## 风险信号",
    `- ${drift}`,
    `- 自测汇总 ${selfTestView.passed}/${selfTestView.total}；全部命令 ${commandSource.length} 条；文件变更 ${run?.filesChanged ?? 0}；diff ${run?.diffStat ?? "-"}`,
    `- 宿主复跑 ${hostVerifyLines.length > 0 ? (run?.hostVerifyDirty ? "改动了受跟踪文件（谨慎）" : "完成，见上") : "未跑 / 不适用"}`,
    `- ${diff ? "diff 已给出" : "diff 为空：除非任务明确要求零改动，否则不要 accept"}`,
    "",
    "只输出一行 JSON。",
  ].join("\n");
  return { prompt, diffEmpty: diff === "", diffBytes: Buffer.byteLength(diff, "utf8") };
}

/** 等某个会话这一轮结束，取最后一条 assistant 文本（通用版，验收/诊断共用）。 */
async function waitSessionReply(core, sessionId, afterSeq, timeoutMs = 120000) {
  const deadline = Date.now() + Math.max(5000, timeoutMs);
  while (Date.now() < deadline) {
    let events = [];
    try {
      events = await readSessionEvents(core, sessionId);
    } catch { events = []; }
    if (events !== null) {
      const fresh = events.filter((event) => Number(event?.seq ?? -1) > afterSeq);
      if (fresh.some((event) => event?.type === "turn/end")) {
        const texts = fresh
          .filter((event) => event.type === "assistant/message")
          .map((event) => messageText(event.data?.message?.content ?? []).trim())
          .filter((text) => text !== "");
        return { ok: true, text: texts.length > 0 ? texts[texts.length - 1] : "" };
      }
    }
    await sleep(250);
  }
  return { ok: false, error: "等待会话回复超时" };
}

/** 记录一条判定（reviewLog 最多 100 条 + 计数），并把结果挂到 run/task 上。 */
function recordReview(core, task, run, entry) {
  const log = { taskId: task.id, runId: run?.id ?? null, at: nowIso(), ...entry };
  mutate(core, (s) => {
    s.reviewLog = Array.isArray(s.reviewLog) ? s.reviewLog : [];
    s.reviewLog.push(log);
    if (s.reviewLog.length > 100) s.reviewLog = s.reviewLog.slice(-100);
    if (!s.stats || typeof s.stats !== "object") s.stats = {};
    if (!s.stats.review || typeof s.stats.review !== "object") s.stats.review = { runs: 0, accepted: 0, reworked: 0, needInfo: 0, failed: 0, tokens: 0 };
    const stats = s.stats.review;
    stats.runs += 1;
    if (log.verdict === "accept") stats.accepted += 1;
    else if (log.verdict === "rework") stats.reworked += 1;
    else if (log.verdict === "need_info") stats.needInfo += 1;
    else stats.failed += 1;
    if (Number.isFinite(log.tokens)) stats.tokens += log.tokens;
    const r = s.runs.find((x) => x.id === run?.id);
    if (r) r.review = log;
    const t = s.tasks.find((x) => x.id === task.id);
    if (t) t.review = log;
  });
  saveNow(core);
  return log;
}

/** 执行判定：起一次性隐藏会话（无工具 preset:false），只跑一个回合。 */
async function runReviewSession(core, taskId, options = {}) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, error: "任务不存在" };
  const run = lastRunOf(core, task.id);
  if (!run) return { ok: false, error: "任务没有 run" };
  const started = Date.now();
  let created;
  try {
    created = await createHiddenSessionAt(
      core,
      core.stateDir,
      reviewerModelOf(core),
      { name: "project-console:reviewer-persona", order: 145, text: REVIEWER_PERSONA },
      { preset: false, restrictTools: true, label: "reviewer" },
    );
  } catch (error) {
    return { ok: false, error: `建判定会话失败：${String(error?.message ?? error)}`, ms: Date.now() - started };
  }
  try {
    const events = await readSessionEvents(core, created.sessionId);
    if (events === null) throw new Error("读不到判定会话事件");
    const afterSeq = events.length > 0 ? Number(events[events.length - 1].seq ?? 0) : 0;
    const card = await buildReviewEvidenceCard(core, findTask(core, task.id), lastRunOf(core, task.id));
    const stageNote = options.stage ? `\n\n（本轮：${options.stage}）` : "";
    const message = await buildReviewMessage(core, card.prompt + stageNote, task, run);
    const sent = await promptSession(core, created.sessionId, message);
    if (!sent.ok) throw new Error(sent.error);
    const reply = await waitSessionReply(core, created.sessionId, afterSeq, reviewTimeoutOf(core));
    if (!reply.ok) throw new Error(reply.error);
    const verdict = parseReviewVerdict(reply.text);
    if (!verdict) throw new Error(`判定输出无法解析：${String(reply.text ?? "").slice(0, 160)}`);
    const usage = contextUsageOf(core, created.sessionId);
    return {
      ok: true,
      ...verdict,
      raw: String(reply.text ?? "").slice(0, 600),
      tokens: usage?.tokens ?? null,
      model: reviewerModelOf(core),
      ms: Date.now() - started,
      sessionId: created.sessionId,
      diffBytes: card.diffBytes,
      diffEmpty: card.diffEmpty,
      stage: options.stage ?? "reviewer",
    };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error), ms: Date.now() - started, sessionId: created.sessionId };
  } finally {
    try { core.hiddenSessions?.delete(created.sessionId); } catch { /* ignore */ }
    try { await archiveSessionById(core, created.sessionId); } catch { /* hidden 会话可能不在 registry */ }
  }
}

/** 组装深审 prompt：判定器疑问 + 证据卡 + 只读调查规则。 */
function buildDeepReviewPrompt(core, task, run, doubt, card) {
  const project = findProject(core, task.projectId);
  const worktree = task.worktreePath && existsSync(task.worktreePath) ? task.worktreePath : null;
  return [
    card,
    "",
    "## 深审任务",
    `第一道判定器的疑问：${String(doubt ?? "").trim() || "证据不足"}`,
    `工作区：${worktree ?? "（worktree 不存在，只能读 state/日志）"}`,
    `仓库：${project?.repoPath ?? "-"}；base：${project?.baseBranch ?? "-"}`,
    "",
    "你可以：读文件、git diff/show/log、grep、运行项目自带的只读检查（例如 node check.mjs）。",
    "你不可以：修改文件、git commit/push、安装依赖、调用任何工程台写工具。",
    "只回答这个疑问；结论必须有证据。只输出一行 JSON。",
  ].join("\n");
}

/** 一次性只读深审：带工具的隐藏会话，解决判定器说不清的那一项。 */
async function runDeepReviewSession(core, taskId, runId, doubt) {
  const task = findTask(core, taskId);
  const run = core.state.runs.find((x) => x.id === runId) ?? lastRunOf(core, taskId);
  if (!task || !run) return { ok: false, error: "任务或 run 不存在" };
  const project = findProject(core, task.projectId);
  const worktree = task.worktreePath && existsSync(task.worktreePath) ? task.worktreePath : null;
  const cwd = worktree ?? project?.repoPath ?? core.stateDir;
  const started = Date.now();
  let created;
  try {
    created = await createHiddenSessionAt(
      core,
      cwd,
      reviewerModelOf(core),
      { name: "project-console:deep-review-persona", order: 146, text: DEEP_REVIEW_PERSONA },
      {
        label: "deep-review",
        denyTools: [
          "project_accept", "project_rework", "project_add", "project_update", "project_dispatch",
          "project_integrate", "project_abandon", "project_question", "project_set_budget",
          "project_throttle", "project_diagnose", "write", "edit", "apply_patch",
        ],
      },
    );
  } catch (error) {
    return { ok: false, error: `建深审会话失败：${String(error?.message ?? error)}`, ms: Date.now() - started };
  }
  try {
    const presets = svc(core, "permissionPresets");
    try { presets?.set?.(created.agent.session, "workspace-write"); } catch { /* ignore */ }
    const trackedStatus = async () => ((await statusPorcelain(cwd, { all: true })) ?? "")
      .split("\n").filter((line) => line !== "" && !line.startsWith("??")).join("\n");
    const beforeTracked = await trackedStatus();
    const events = await readSessionEvents(core, created.sessionId);
    if (events === null) throw new Error("读不到深审会话事件");
    const afterSeq = events.length > 0 ? Number(events[events.length - 1].seq ?? 0) : 0;
    const card = await buildReviewEvidenceCard(core, findTask(core, taskId), lastRunOf(core, taskId));
    const prompt = buildDeepReviewPrompt(core, task, run, doubt, card.prompt);
    const message = await buildReviewMessage(core, prompt, task, run);
    const sent = await promptSession(core, created.sessionId, message);
    if (!sent.ok) throw new Error(sent.error);
    const timeout = positiveInt(core.state.settings?.deepReviewTimeoutMs, 150000, 20000, 600000);
    const reply = await waitSessionReply(core, created.sessionId, afterSeq, timeout);
    if (!reply.ok) throw new Error(reply.error);
    const verdict = parseReviewVerdict(reply.text);
    if (!verdict) throw new Error(`深审输出无法解析：${String(reply.text ?? "").slice(0, 160)}`);
    const afterTracked = await trackedStatus();
    if (afterTracked !== beforeTracked) {
      return { ok: false, dirty: true, error: "深审改动了受跟踪文件，判定作废", ms: Date.now() - started, sessionId: created.sessionId };
    }
    const usage = contextUsageOf(core, created.sessionId);
    return {
      ok: true,
      ...verdict,
      stage: "deep",
      tokens: usage?.tokens ?? null,
      model: reviewerModelOf(core),
      ms: Date.now() - started,
      sessionId: created.sessionId,
      diffBytes: card.diffBytes,
      diffEmpty: card.diffEmpty,
    };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error), ms: Date.now() - started, sessionId: created.sessionId };
  } finally {
    try { core.hiddenSessions?.delete(created.sessionId); } catch { /* ignore */ }
    try { await archiveSessionById(core, created.sessionId); } catch { /* ignore */ }
  }
}

/** 执行判定结果（accept/rework/need_info）。 */
async function applyReviewVerdict(core, taskId, runId, result) {
  const task = findTask(core, taskId);
  const run = core.state.runs.find((x) => x.id === runId) ?? null;
  if (!task) return { ok: false, error: "任务不存在" };
  const current = findTask(core, taskId);
  if (current && ["accepted", "merged", "abandoned", "running"].includes(current.status)) {
    core.log(`reviewer #${taskId} 判定结果忽略：任务已变成 ${current.status}`);
    return { ok: true, ignored: true };
  }
  const entry = {
    verdict: result.verdict,
    confidence: result.confidence ?? "med",
    reason: String(result.reason ?? "").slice(0, 300),
    feedback: String(result.feedback ?? "").slice(0, 1000),
    model: result.model ?? null,
    tokens: Number.isFinite(result.tokens) ? result.tokens : null,
    ms: Number.isFinite(result.ms) ? result.ms : null,
    sessionId: result.sessionId ?? null,
    by: "reviewer",
    stage: result.stage ?? "reviewer",
    hostVerify: Array.isArray(result.hostVerify) ? result.hostVerify : null,
  };
  let applied = { ok: true };
  if (result.verdict === "accept") {
    applied = await acceptTask(core, taskId, { by: "reviewer" });
  } else if (result.verdict === "rework") {
    const maxRework = positiveInt(core.state.settings?.maxReworkRounds, 5, 1, 20);
    const nextRounds = (findTask(core, taskId)?.reworkRounds ?? 0) + 1;
    if (nextRounds > maxRework) {
      mutate(core, (s) => {
        const t = s.tasks.find((x) => x.id === task.id);
        if (t && !["abandoned", "accepted", "merged"].includes(t.status)) {
          t.status = "needs_review";
          t.reworkRounds = nextRounds;
          t.error = `连续返工超过 ${maxRework} 次，已转人工`;
          t.updatedAt = nowIso();
        }
      });
      const capped = { ...entry, verdict: "need_info", confidence: "low", reason: `连续返工超过 ${maxRework} 次，已停止自动返工并转人工`, feedback: "" };
      const log = recordReview(core, task, run, capped);
      core.log(`reviewer #${task.id} → need_info（返工超限 ${nextRounds}/${maxRework}）`);
      return { ok: true, review: log };
    }
    applied = await reworkTask(core, taskId, entry.feedback || entry.reason || "验收未通过：请按 DoD 补齐并自测", { fromReview: true });
  } else {
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      if (t && !["abandoned", "accepted", "merged"].includes(t.status)) {
        t.status = "needs_review";
        t.updatedAt = nowIso();
      }
    });
    applied = { ok: true };
  }
  if (!applied.ok) {
    const failedEntry = { ...entry, verdict: "error", error: String(applied.error ?? "执行判定结果失败").slice(0, 500) };
    recordReview(core, task, run, failedEntry);
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      if (t && !["abandoned", "accepted", "merged"].includes(t.status)) { t.status = "needs_review"; t.updatedAt = nowIso(); }
    });
    saveNow(core);
    return { ok: false, error: failedEntry.error };
  }
  if (result.verdict === "accept" && Array.isArray(result.hostVerify)) {
    mutate(core, (s) => {
      const t = s.tasks.find((x) => x.id === task.id);
      if (t && t.acceptance) t.acceptance.hostVerify = result.hostVerify;
    });
  }
  const log = recordReview(core, task, run, entry);
  core.log(`reviewer #${task.id} → ${entry.verdict}（${entry.confidence}）tokens=${entry.tokens ?? "?"} ${entry.reason.slice(0, 80)}`);
  return { ok: true, review: log };
}

/** 判定失败：重试一次；仍失败则转人工（needs_review），不阻塞队列。 */
async function handleReviewFailure(core, taskId, runId, result) {
  const task = findTask(core, taskId);
  if (!task) return;
  const run = core.state.runs.find((x) => x.id === runId) ?? lastRunOf(core, task.id);
  const attempts = run?.reviewAttempts ?? 1;
  core.log(`reviewer 判定失败 #${taskId}（第 ${attempts} 次）：${result.error}`);
  if (attempts < 2) {
    const timer = setTimeout(() => {
      void requestReview(core, taskId, { force: true, retry: true }).then((r) => {
        if (!r.ok) core.log(`reviewer 重试未触发 #${taskId}：${r.error ?? r.code}`);
      }).catch((error) => core.log("reviewer 重试异常", String(error)));
    }, 15000);
    if (typeof timer.unref === "function") timer.unref();
    return;
  }
  const entry = {
    verdict: "error",
    confidence: "low",
    reason: "判定器失败，已转人工",
    error: String(result.error ?? "").slice(0, 500),
    ms: Number.isFinite(result.ms) ? result.ms : null,
    sessionId: result.sessionId ?? null,
    by: "reviewer",
  };
  recordReview(core, task, run, entry);
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    if (t && !["abandoned", "accepted", "merged"].includes(t.status)) {
      t.status = "needs_review";
      t.updatedAt = nowIso();
    }
  });
  saveNow(core);
}

/**
 * 自动验收入口：按 settings.reviewMode 分派。
 * 默认 reviewer：一次性判定，串行排队；outcome 不经过 lead。
 */
async function requestReview(core, taskId, options = {}) {
  await ensureState(core);
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (!["verifying", "needs_review"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务状态 ${task.status} 不需要验收` };
  }
  const run = lastRunOf(core, task.id);
  if (!run) return { ok: false, code: "no-run", error: "任务没有 run" };
  if (!options.force && run.reviewRequestedFor === run.id) {
    return { ok: false, code: "already", error: "本轮已请求过自动验收" };
  }
  const mode = reviewModeOf(core);
  if (mode === "off") return { ok: false, code: "off", error: "自动验收已关闭" };
  if (mode === "lead") return requestLeadReview(core, task.id, { force: options.force === true });
  core.reviewing = core.reviewing ?? new Set();
  if (core.reviewing.has(task.id)) return { ok: false, code: "busy", error: "验收进行中" };
  core.reviewing.add(task.id);
  mutate(core, (s) => {
    const r = s.runs.find((x) => x.id === run.id);
    if (r) {
      r.reviewRequestedAt = nowIso();
      r.reviewRequestedFor = run.id;
      r.reviewAttempts = (r.reviewAttempts ?? 0) + 1;
    }
    const t = s.tasks.find((x) => x.id === task.id);
    if (t) {
      if (t.status === "needs_review") t.status = "verifying";
      t.reviewRounds = (t.reviewRounds ?? 0) + 1;
      t.updatedAt = nowIso();
    }
  });
  saveNow(core);
  const requestedAttempt = (core.state.runs.find((x) => x.id === run.id)?.reviewAttempts) ?? 1;
  const job = async () => {
    let result;
    let stage = "reviewer";
    try {
      result = await runReviewSession(core, task.id, { stage: "reviewer" });
      // 证据不足 → 宿主复跑项目验证命令，再判一次；仍不足 → 一次性只读深审；再不行转人工。
      if (result.ok && result.verdict === "need_info") {
        // 固定行为：need_info 先让宿主复跑项目验证，把「没跑测试」补成硬证据。
        const verify = await runHostVerify(core, findTask(core, task.id), lastRunOf(core, task.id));
        if (!verify.skipped && Array.isArray(verify.results) && verify.results.length > 0) {
          stage = "reviewer+hostVerify";
          result = await runReviewSession(core, task.id, { stage: "宿主复跑后复判" });
        }
        if (result.ok && result.verdict === "need_info") {
          const deep = await runDeepReviewSession(core, task.id, run.id, result.reason);
          if (deep.ok) {
            if (deep.verdict === "accept") {
              // 深审只负责补证据，不负责推翻首判；accept 必须交人工。
              result = {
                ok: true, verdict: "need_info", confidence: "low",
                reason: "深审倾向 accept，但首判证据不足；按保守策略转人工确认，不自动验收。",
                feedback: "", stage: "deep", tokens: deep.tokens, ms: deep.ms, sessionId: deep.sessionId,
                diffBytes: deep.diffBytes, diffEmpty: deep.diffEmpty,
              };
            } else {
              result = deep;
            }
            stage = "deep";
          } else if (deep.dirty) {
            result = {
              ok: true, verdict: "need_info", confidence: "low",
              reason: `深审改动了受跟踪文件，判定作废：${String(deep.error ?? "").slice(0, 200)}`,
              feedback: "", stage: "deep",
            };
            stage = "deep";
          } else {
            core.log(`深审未完成 #${task.id}：${deep.error}（保留 need_info）`);
          }
        }
      }
    } catch (error) {
      result = { ok: false, error: String(error?.message ?? error) };
    }
    // accept 前宿主默认复跑项目验证：自测可以造假/漏跑，验收前再用宿主退出码兜一次。
    if (result && result.ok && result.verdict === "accept") {
      const latest = lastRunOf(core, task.id);
      let verify;
      if (latest && Array.isArray(latest.hostVerify) && latest.hostVerify.length > 0) {
        verify = { ok: latest.hostVerify.every((r) => r.ok), results: latest.hostVerify, dirty: Boolean(latest.hostVerifyDirty), skipped: false };
      } else {
        verify = await runHostVerify(core, findTask(core, task.id), latest);
      }
      if (!verify.skipped) {
        stage = "accept+hostVerify";
        if (verify.dirty) {
          result = { ok: true, verdict: "need_info", confidence: "low", reason: "宿主复跑改动了受跟踪文件，不能自动验收", feedback: "", stage };
        } else if (!verify.ok) {
          const failed = verify.results.filter((r) => !r.ok).map((r) => `${r.command} exit ${r.exitCode ?? "?"}`).join("；") || "验证命令失败";
          result = {
            ok: true, verdict: "rework", confidence: "high",
            reason: `宿主复跑未通过：${failed}`,
            feedback: `宿主复跑失败：${failed}。请修复后重新运行项目验证命令，把退出码贴进报告。`,
            stage,
          };
        } else {
          result = { ...result, stage, hostVerify: verify.results };
        }
      }
    }
    if (result && result.ok) result.stage = result.stage ?? stage;
    // 宿主硬门禁：空 diff、低置信度 accept 一律转人工，不靠模型自觉。
    if (result && result.ok && result.verdict === "accept") {
      if (result.diffEmpty === true) {
        result = { ...result, verdict: "need_info", confidence: "low", reason: "工作区没有任何改动，不能自动验收；需人工确认是否为零改动任务。", feedback: "" };
      } else if (String(result.confidence ?? "").toLowerCase() === "low") {
        result = { ...result, verdict: "need_info", reason: `判定器低置信度 accept：${String(result.reason ?? "").slice(0, 160)}`, feedback: "" };
      }
    }
    try {
      if (result.ok) {
        const applied = await applyReviewVerdict(core, task.id, run.id, result);
        if (!applied.ok) core.log(`reviewer 结果执行失败 #${task.id}：${applied.error}`);
      } else {
        await handleReviewFailure(core, task.id, run.id, result);
      }
    } finally {
      core.reviewing.delete(task.id);
    }
  };
  const tail = core.reviewTail ?? Promise.resolve();
  core.reviewTail = tail.then(job, job).catch((error) => core.log("reviewer 队列异常", String(error)));
  core.log(`reviewer 验收请求 #${task.id} 入队（第 ${requestedAttempt} 次）`);
  return { ok: true, queued: true, mode };
}

/** 手动深审：跳过第一道判定，直接起一次性只读调查并执行结论（供人工/测试用）。 */
async function requestDeepReview(core, taskId, options = {}) {
  await ensureState(core);
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (!["verifying", "needs_review"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务状态 ${task.status} 不能深审` };
  }
  const run = lastRunOf(core, task.id);
  if (!run) return { ok: false, code: "no-run", error: "任务没有 run" };
  core.reviewing = core.reviewing ?? new Set();
  if (core.reviewing.has(task.id)) return { ok: false, code: "busy", error: "验收进行中" };
  core.reviewing.add(task.id);
  try {
    const deep = await runDeepReviewSession(core, task.id, run.id, options.doubt ?? "人工要求深审");
    if (!deep.ok) {
      if (deep.dirty) {
        mutate(core, (s) => {
          const t = s.tasks.find((x) => x.id === task.id);
          if (t && !["abandoned", "accepted", "merged"].includes(t.status)) { t.status = "needs_review"; t.updatedAt = nowIso(); }
        });
        saveNow(core);
      }
      return { ok: false, code: "deep-failed", error: deep.error ?? "深审失败", dirty: Boolean(deep.dirty) };
    }
    const applied = await applyReviewVerdict(core, task.id, run.id, deep);
    return applied.ok ? { ok: true, review: applied.review, deep } : applied;
  } finally {
    core.reviewing.delete(task.id);
  }
}

/* ─────────────────────────── 验收 / 打回 / 放弃 ─────────────────────────── */

async function acceptTask(core, taskId, options = {}) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, error: "任务不存在" };
  const project = findProject(core, task.projectId);
  if (!project) return { ok: false, error: "项目不存在" };
  if (task.status === "accepted" || task.status === "merged") return { ok: false, error: "任务已验收/已合并" };
  // running 不能人工验收：worker 还在写 worktree，squash 会拿到半成品。
  if (!["needs_review", "failed", "verifying"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务当前状态 ${task.status} 不能验收` };
  }
  if (!task.worktreePath || !existsSync(task.worktreePath)) {
    return { ok: false, code: "no-worktree", error: "任务 worktree 不存在" };
  }
  if (task.baseShaAtDispatch) {
    const currentBase = await branchSha(project.repoPath, project.baseBranch);
    if (currentBase !== null && currentBase !== task.baseShaAtDispatch) {
      // 允许已 rebase 的任务：新 base 是 HEAD 的祖先，说明 worktree 已包含新 base。
      const rebased = await git(task.worktreePath, ["merge-base", "--is-ancestor", currentBase, "HEAD"]);
      if (!rebased.ok) {
        return { ok: false, code: "drift", error: "base 分支在任务执行期间前进了，拒绝验收；请先把任务 rebase 到新 base 再验收" };
      }
    }
  }
  const message = `${task.type}: #${task.id} ${task.title}\n\nTask: #${task.id}\nSession: ${task.sessionId ?? "-"}\nDoD: ${(task.dod ?? []).join(" | ") || "-"}`;
  const result = await squashTaskCommit(task.worktreePath, project.baseBranch, message);
  if (!result.ok) return { ok: false, code: "commit-failed", error: result.error };
  // squash 要跑几条 git 命令，期间任务可能被取消/已验收：不要用迟到的 accept 覆盖新状态。
  let accepted = false;
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    if (!t) return;
    if (["abandoned", "accepted", "merged"].includes(t.status)) { t.updatedAt = nowIso(); return; }
    accepted = true;
    t.status = "accepted";
    t.acceptance = {
      acceptedAt: nowIso(),
      acceptedBy: options.by ?? "operator",
      commit: result.head,
      skipped: Boolean(result.skipped),
      diffStat: result.diffStat,
      filesChanged: result.filesChanged,
      files: result.files ?? [],
    };
    t.error = null;
    t.updatedAt = nowIso();
  });
  saveNow(core);
  if (!accepted) {
    core.log(`accept #${task.id} 未生效：任务在验收过程中被取消/已验收（commit ${result.head} 仍在任务分支上）`);
    return { ok: false, code: "state", error: "任务在验收过程中被取消或已验收，本次验收未生效" };
  }
  core.log(`accept #${task.id} commit=${result.head} ${result.diffStat}`);
  return { ok: true, task: taskView(core, findTask(core, task.id)), acceptance: result };
}

async function reworkTask(core, taskId, feedback, options = {}) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, error: "任务不存在" };
  if (["accepted", "merged", "abandoned"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务已${task.status === "merged" ? "合并" : task.status === "accepted" ? "验收" : "放弃"}，不能打回` };
  }
  if (!["needs_review", "verifying", "failed"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务当前状态 ${task.status} 不能打回` };
  }
  const text = String(feedback ?? "").trim();
  if (text === "") return { ok: false, code: "no-feedback", error: "打回必须写意见" };
  // 判定器/深审本身就是「正在验收」的持有者；它给出的 rework 结论必须能执行，
  // 只有外部（操作员、lead）在判定进行中打回才拒绝。
  if (options.fromReview !== true && core.reviewing?.has(task.id)) {
    return { ok: false, code: "busy", error: "任务正在验收判定中，等判定结束后再打回" };
  }
  if (!task.sessionId) return { ok: false, code: "no-session", error: "任务没有会话，无法打回；请重新派发" };
  if (!ACTIVE.has(task.status)) {
    const allowed = canStartTask(core, task);
    if (!allowed.ok) return allowed;
  }
  const prompt = [
    `【工程台打回 · 任务 #${task.id}】`,
    "人工验收未通过，改完继续自测并在最后消息里给出更新后的 DoD 自检与测试证据。",
    "",
    "打回意见：",
    text,
    "",
    "硬约束不变：只改本 worktree；完成后输出结构化报告。",
  ].join("\n");
  const r = await promptSession(core, task.sessionId, prompt);
  if (!r.ok) return r;
  // promptSession 是异步的，期间任务可能被取消/验收；这时不要再把它改回 running。
  const current = findTask(core, task.id);
  if (!current || ["abandoned", "accepted", "merged"].includes(current.status)) {
    return { ok: false, code: "state", error: "任务在打回过程中被取消或已验收，本次打回未生效" };
  }
  core.state.counters.run += 1;
  const run = {
    id: `r${core.state.counters.run}`,
    taskId: task.id,
    sessionId: task.sessionId,
    startedAt: nowIso(),
    endedAt: null,
    outcome: null,
    reason: null,
    diffStat: "",
    filesChanged: 0,
    selfTest: { total: 0, passed: 0, failed: 0, commands: [] },
    finalText: "",
    setup: [],
    drift: { snapshotAtRework: null },
    rework: text,
  };
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    t.status = "running";
    t.error = null;
    t.runCount = (t.runCount ?? 0) + 1;
    t.reworkRounds = (t.reworkRounds ?? 0) + 1;
    t.updatedAt = nowIso();
    s.runs.push(run);
  });
  saveNow(core);
  return { ok: true, task: taskView(core, findTask(core, task.id)) };
}

/** 校验并规范化 attachments（只允许 uploads 目录内的图片文件）。 */
function sanitizeAttachments(core, input) {
  if (!Array.isArray(input)) return [];
  const uploadsRoot = join(core.stateDir, "uploads");
  const out = [];
  for (const item of input.slice(0, 8)) {
    if (!item || typeof item.path !== "string") continue;
    const p = resolve(item.path);
    if (!p.startsWith(uploadsRoot + "/") && p !== uploadsRoot) continue;
    if (!existsSync(p)) continue;
    const name = String(item.name ?? p.split("/").pop() ?? "screenshot.png").slice(0, 120);
    const mime = String(item.mime ?? "image/png");
    let size = 0;
    try { size = statSync(p).size; } catch { /* ignore */ }
    out.push({ path: p, name, mime, size });
  }
  return out;
}

const UPLOAD_MIME_EXT = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

/** 保存一张需求参考截图（base64），返回 {path,name,mime,size}。 */
async function uploadAttachment(core, input) {
  const mime = String(input?.mime ?? "image/png");
  if (!Object.hasOwn(UPLOAD_MIME_EXT, mime)) return { ok: false, code: "bad-mime", error: `不支持的图片类型：${mime}` };
  const data = String(input?.dataBase64 ?? "");
  if (data === "") return { ok: false, code: "empty", error: "图片数据为空" };
  let bytes;
  try { bytes = Buffer.from(data.replace(/^data:[^;]+;base64,/, ""), "base64"); }
  catch { return { ok: false, code: "bad-data", error: "base64 解码失败" }; }
  if (bytes.length === 0) return { ok: false, code: "empty", error: "图片数据为空" };
  if (bytes.length > UPLOAD_MAX_BYTES) return { ok: false, code: "too-large", error: `图片超过 8MB（${Math.round(bytes.length / 1024 / 1024)}MB）` };
  const dir = join(core.stateDir, "uploads");
  mkdirSync(dir, { recursive: true });
  const safeBase = String(input?.name ?? "screenshot").replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 60) || "screenshot";
  const ext = UPLOAD_MIME_EXT[mime];
  const fileName = `${Date.now()}-${uuid().slice(0, 8)}-${safeBase.replace(new RegExp(`${ext.replace(".", "\\.")}$`), "")}${ext}`;
  const filePath = join(dir, fileName);
  writeFileSync(filePath, bytes);
  core.log(`upload attachment ${fileName} ${bytes.length}B ${mime}`);
  return { ok: true, file: { path: filePath, name: String(input?.name ?? fileName), mime, size: bytes.length } };
}

/** 彻底删除任务（只允许非运行中）。返回删除详情。 */
async function deleteTask(core, taskId) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (ACTIVE.has(task.status)) return { ok: false, code: "busy", error: `任务正在执行（${task.status}），不能删除` };
  const project = findProject(core, task.projectId);
  const sessionsArchived = [];
  // 归档该任务会话，避免侧栏残留（失败不阻塞删除）
  if (task.sessionId) {
    const reg = svc(core, "workspaceRegistry");
    try { await reg?.archiveSession?.(task.sessionId); sessionsArchived.push(task.sessionId); } catch { /* ignore */ }
  }
  // 清理 worktree / 分支（合并后一般已清理）
  try {
    if (project && task.worktreePath && existsSync(task.worktreePath)) await removeWorktree(project.repoPath, task.worktreePath);
    if (project && task.branch) await deleteBranch(project.repoPath, task.branch);
  } catch (error) {
    core.log(`删除任务 #${task.id} 时清理 worktree/分支失败（忽略）`, String(error));
  }
  mutate(core, (s) => {
    s.tasks = s.tasks.filter((t) => t.id !== task.id);
    s.runs = s.runs.filter((r) => r.taskId !== task.id);
    s.questions = s.questions.filter((q) => q.taskId !== task.id);
    s.reviewLog = (Array.isArray(s.reviewLog) ? s.reviewLog : []).filter((r) => r.taskId !== task.id);
  });
  pruneReviewStats(core);
  saveNow(core);
  core.log(`delete task #${task.id}「${task.title}」（${task.status}）`);
  return { ok: true, deleted: { taskId: task.id, title: task.title, status: task.status }, sessionsArchived };
}

/** 读取 uploads 目录内的一张图片，供 /file 路由返回。 */
function readAttachmentFile(core, rawPath) {
  if (typeof rawPath !== "string" || rawPath === "") return null;
  const uploadsRoot = join(core.stateDir, "uploads");
  const p = resolve(rawPath);
  if (!p.startsWith(uploadsRoot + "/")) return null;
  if (!existsSync(p)) return null;
  const mime = Object.entries(UPLOAD_MIME_EXT).find(([, ext]) => p.toLowerCase().endsWith(ext))?.[0] ?? "application/octet-stream";
  try { return { bytes: readFileSync(p), mime, size: statSync(p).size }; } catch { return null; }
}

/** 继续 abandoned/failed 任务：重新排队并立即尝试派发（worktree 会按需重建）。 */
async function resumeTask(core, taskId) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  if (!["abandoned", "failed"].includes(task.status)) {
    return { ok: false, code: "state", error: `任务状态 ${task.status} 不支持「继续」（只支持已放弃/失败）` };
  }
  const previousStatus = task.status;
  const previousReason = task.abandonReason ?? task.error ?? "";
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    t.status = "queued";
    t.error = null;
    t.retryCount = 0;
    t.resumeLog = Array.isArray(t.resumeLog) ? t.resumeLog : [];
    t.resumeLog.push({ at: nowIso(), from: previousStatus, reason: previousReason.slice(0, 500) });
    t.updatedAt = nowIso();
  });
  saveNow(core);
  core.log(`resume #${task.id}（from ${previousStatus}）`);
  const dispatch = await dispatchTask(core, task.id);
  return {
    ok: true,
    task: taskView(core, findTask(core, task.id)),
    dispatch: dispatch.ok
      ? { ok: true, sessionId: dispatch.sessionId }
      : { ok: false, code: dispatch.code, error: dispatch.error },
  };
}

async function abandonTask(core, taskId, reason, category) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, error: "任务不存在" };
  // accepted 的提交还在任务分支上（合并前）；merged 的提交已经进了 base。
  // 这两种状态再「放弃」会清掉 worktree/分支或把已合并任务改写成 abandoned，不能放行。
  if (task.status === "accepted" || task.status === "merged") {
    return {
      ok: false,
      code: "state",
      error: `任务已${task.status === "merged" ? "合并" : "验收"}，不能放弃；${task.status === "merged" ? "如需撤销这一批，用批次回滚" : "确实不要了请直接删除任务"}`,
    };
  }
  // 先取消会话，避免放弃后 agent 继续跑、turn/end 再改状态。
  if (task.sessionId) {
    try {
      const resolved = await resolvePromptAgent(core, task.sessionId);
      if (resolved?.agent) resolved.agent.cancel({ kind: "user" }, { keepInbox: false });
    } catch { /* ignore */ }
  }
  const project = findProject(core, task.projectId);
  let patchArchive = null;
  if (project && task.worktreePath && existsSync(task.worktreePath)) {
    const r = await runShell(`git add -A && git diff --cached > .pc-abandon.patch && git reset`, { cwd: task.worktreePath, timeoutMs: 120000 });
    if (r.ok) {
      try { patchArchive = join(core.stateDir, "evidence", `task-${task.id}-abandon.patch`); mkdirSync(join(core.stateDir, "evidence"), { recursive: true }); const content = await readFile(join(task.worktreePath, ".pc-abandon.patch"), "utf8"); await writeFile(patchArchive, content, "utf8"); } catch { /* ignore */ }
    }
    await removeWorktree(project.repoPath, task.worktreePath);
    if (task.branch) await deleteBranch(project.repoPath, task.branch);
    if (task.workspaceId) {
      const reg = svc(core, "workspaceRegistry");
      try { reg?.delete?.(task.workspaceId); } catch { /* ignore */ }
    }
  }
  mutate(core, (s) => {
    const t = s.tasks.find((x) => x.id === task.id);
    t.status = "abandoned";
    // worktree 已清掉；resume 后从当前 base 重新切，旧 dispatch 快照不能再用于 drift 判断。
    t.baseShaAtDispatch = null;
    t.abandonReason = String(reason ?? "");
    t.abandonCategory = category ?? inferAbandonCategory({ abandonReason: String(reason ?? "") });
    t.updatedAt = nowIso();
  });
  saveNow(core);
  return { ok: true, task: taskView(core, findTask(core, task.id)), patchArchive };
}

/* ─────────────────────────── 澄清（反问） ─────────────────────────── */

async function askQuestion(core, input) {
  const n = core.state.counters.question + 1;
  core.state.counters.question = n;
  const task = input.taskId === undefined || input.taskId === null ? null : findTask(core, input.taskId);
  const projectId = task ? task.projectId : (input.projectId ?? null);
  const question = {
    id: `q${n}`,
    projectId,
    taskId: task ? task.id : null,
    text: String(input.text ?? "").trim(),
    context: String(input.context ?? ""),
    options: Array.isArray(input.options) ? input.options.map(String) : [],
    status: "open",
    answer: null,
    askedBy: input.askedBy ?? "human",
    askedAt: nowIso(),
    answeredAt: null,
  };
  if (question.text === "") return { ok: false, code: "empty", error: "问题内容不能为空" };
  mutate(core, (s) => {
    s.questions.push(question);
    if (task) {
      const t = s.tasks.find((x) => x.id === task.id);
      if (t && !["accepted", "merged", "abandoned"].includes(t.status)) {
        t.status = "needs_input";
        t.updatedAt = nowIso();
      }
    }
  });
  saveNow(core);
  core.log(`question ${question.id} task=${question.taskId ?? "-"} ${question.text.slice(0, 60)}`);
  return { ok: true, question };
}

async function answerQuestion(core, questionId, answer, options = {}) {
  const question = core.state.questions.find((q) => q.id === questionId);
  if (!question) return { ok: false, code: "not-found", error: "问题不存在" };
  if (question.status !== "open") return { ok: false, code: "closed", error: "问题已处理" };
  const text = String(answer ?? "").trim();
  if (text === "") return { ok: false, code: "empty", error: "回答不能为空" };

  const task = question.taskId === null ? null : findTask(core, question.taskId);
  const terminal = Boolean(task && ["accepted", "merged", "abandoned"].includes(task.status));
  const willResume = Boolean(task && task.sessionId && options.dispatch !== false && !terminal);
  // 恢复任务前先过槽位/冲突域：回答一条待澄清会把任务重新变成 running。
  // 检查不过就把问题留在「待澄清」，用户腾出槽位后还能再答，不会把问题消费掉。
  if (willResume && task && !ACTIVE.has(task.status)) {
    const allowed = canStartTask(core, task);
    if (!allowed.ok) return { ...allowed, question };
  }

  mutate(core, (s) => {
    const q = s.questions.find((x) => x.id === questionId);
    q.status = "answered";
    q.answer = text;
    q.answeredAt = nowIso();
  });
  saveNow(core);

  const forwarded = [];
  const note = `【工程台澄清回复 · ${question.id}】\n问题：${question.text}\n回答：${text}`;
  // 1) 转给 lead 会话（走 promptLead：自动带简报/轮换检查）
  if (core.state.lead.sessionId) {
    const r = await promptLead(core, note);
    forwarded.push({ to: "lead", ok: r.ok });
  }
  // 2) 如果绑定了任务：已结束的任务只转发不恢复；待澄清任务有会话就回给会话，
  //    没会话（还没派发过）就放回队列，交给调度泵。
  if (task && options.dispatch !== false) {
    if (terminal) {
      forwarded.push({ to: `task#${task.id}`, ok: false, error: `任务已${task.status === "merged" ? "合并" : task.status === "accepted" ? "验收" : "放弃"}，不再回给任务会话` });
    } else if (willResume) {
      const r = await promptSession(core, task.sessionId, `${note}\n\n按回答继续完成任务。`);
      forwarded.push({ to: `task#${task.id}`, ok: r.ok });
      const currentTask = findTask(core, task.id);
      const canResumeNow = Boolean(currentTask && !ACTIVE.has(currentTask.status) && !["abandoned", "accepted", "merged"].includes(currentTask.status));
      if (r.ok && !ACTIVE.has(task.status) && canResumeNow) {
        core.state.counters.run += 1;
        const run = {
          id: `r${core.state.counters.run}`,
          taskId: task.id,
          sessionId: task.sessionId,
          startedAt: nowIso(),
          endedAt: null,
          outcome: null,
          reason: null,
          diffStat: "",
          filesChanged: 0,
          selfTest: { total: 0, passed: 0, failed: 0, commands: [] },
          finalText: "",
          setup: [],
          drift: {},
          rework: "clarification",
        };
        mutate(core, (s) => {
          const t = s.tasks.find((x) => x.id === task.id);
          if (t) {
            t.status = "running";
            t.updatedAt = nowIso();
            t.runCount = (t.runCount ?? 0) + 1;
          }
          s.runs.push(run);
        });
        saveNow(core);
      }
    } else if (!task.sessionId && task.status === "needs_input") {
      mutate(core, (s) => {
        const t = s.tasks.find((x) => x.id === task.id);
        if (t && t.status === "needs_input") { t.status = "queued"; t.updatedAt = nowIso(); }
      });
      saveNow(core);
      forwarded.push({ to: `task#${task.id}`, ok: true, queued: true });
    }
  }
  return { ok: true, forwarded, question: core.state.questions.find((q) => q.id === questionId) };
}

/* ─────────────────────────── 集成 / 合并 ─────────────────────────── */

async function integrate(core, projectId, taskIds) {
  const project = findProject(core, projectId);
  if (!project) return { ok: false, error: "项目不存在" };
  let tasks = tasksOf(core, projectId).filter((t) => t.status === "accepted");
  if (Array.isArray(taskIds) && taskIds.length > 0) {
    const wanted = new Set(taskIds.map(Number));
    tasks = tasks.filter((t) => wanted.has(t.id));
  }
  if (tasks.length === 0) return { ok: false, code: "no-tasks", error: "没有待集成的已验收任务" };
  // 同一项目同时只允许一个集成批次：两次并发会把同一批任务合两遍，产生重复测试分支和
  // 永远等不到确认的第二个批次。重载中断的 running 批次会在启动时转 failed。
  const activeBatch = core.state.batches.find((batch) => batch.projectId === projectId && batch.status === "running");
  if (activeBatch) {
    return { ok: false, code: "busy", error: `集成批次 ${activeBatch.id} 正在运行，等它结束再发起新批次` };
  }
  const n = core.state.counters.batch + 1;
  core.state.counters.batch = n;
  const batchId = `b${n}`;
  const branch = await currentBranch(project.repoPath);
  if (branch !== project.baseBranch) {
    return { ok: false, code: "wrong-branch", error: `主仓当前在 ${branch}，集成需要 ${project.baseBranch}（避免污染工作区）` };
  }
  const status = await statusPorcelain(project.repoPath);
  if (status && status.trim() !== "") {
    return { ok: false, code: "dirty", error: `主仓工作区不干净，拒绝集成：\n${tail(status, 400)}` };
  }
  core.log(`integrate ${batchId} tasks=${tasks.map((t) => `#${t.id}`).join(",")}`);
  const batch = {
    id: batchId,
    projectId,
    taskIds: tasks.map((t) => t.id),
    status: "running",
    testBranch: `dsh/integration-test/${batchId}`,
    testWorktree: null,
    baseShaBefore: null,
    backupRef: null,
    commands: [],
    perTask: [],
    failures: [],
    verdict: null,
    mergedSha: null,
    confirmedBy: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mutate(core, (s) => { s.batches.push(batch); });
  saveNow(core);

  const result = await createIntegrationBatch(
    core, project, tasks, batchId,
    project.integrationTests?.commands ?? [], project.integrationTests?.timeoutMs ?? 900000,
  );
  if (!result.ok) {
    mutate(core, (s) => {
      const b = s.batches.find((x) => x.id === batchId);
      b.status = "failed";
      b.verdict = result.error ?? "infra-error";
      b.updatedAt = nowIso();
    });
    saveNow(core);
    return { ok: false, code: "integration-failed", error: result.error, batch: batchView(core.state.batches.find((b) => b.id === batchId)) };
  }
  // 清理集成 worktree（保留分支）
  if (result.testWorktree) await cleanupIntegrationWorktree(project, result);
  mutate(core, (s) => {
    const b = s.batches.find((x) => x.id === batchId);
    b.status = result.passed ? "awaiting_confirmation" : "failed";
    b.verdict = result.verdict;
    b.baseShaBefore = result.baseSha;
    b.backupRef = result.backupRef;
    b.testWorktree = null;
    b.commands = result.commandResults;
    b.perTask = result.perTask;
    b.failures = result.failures;
    b.updatedAt = nowIso();
    if (result.passed) {
      for (const t of s.tasks) if (b.taskIds.includes(t.id)) { t.batchId = batchId; }
    }
  });
  saveNow(core);
  core.log(`integrate ${batchId} → ${result.passed ? "all-green" : "failed"}`);
  return { ok: true, batch: batchView(core.state.batches.find((b) => b.id === batchId)) };
}

async function ffBatch(core, batchId, confirm) {
  if (confirm !== "fast-forward") {
    return { ok: false, code: "confirm-required", error: "推送到 main 需要显式确认：confirm=\"fast-forward\"" };
  }
  const batch = core.state.batches.find((b) => b.id === batchId);
  if (!batch) return { ok: false, error: "批次不存在" };
  if (batch.status !== "awaiting_confirmation") return { ok: false, code: "state", error: `批次状态 ${batch.status} 不能推送` };
  const project = findProject(core, batch.projectId);
  if (!project) return { ok: false, error: "项目不存在" };
  const r = await fastForwardBase(project, batch);
  if (!r.ok) return r;
  mutate(core, (s) => {
    const b = s.batches.find((x) => x.id === batchId);
    b.status = "merged";
    b.mergedSha = r.mergedSha;
    b.confirmedBy = "operator";
    b.mergedAt = nowIso();
    b.updatedAt = nowIso();
    for (const t of s.tasks) {
      if (b.taskIds.includes(t.id)) {
        t.status = "merged";
        t.updatedAt = nowIso();
      }
    }
  });
  saveNow(core);
  // 清理任务 worktree / 工作区（合并完成后）。任务分支保留：批次回滚后要把任务退回
  // accepted 重新集成，分支被删掉就没得 merge 了。分支只存 ref，占空间可以忽略。
  for (const taskId of batch.taskIds) {
    const task = findTask(core, taskId);
    if (!task) continue;
    if (task.worktreePath) await removeWorktree(project.repoPath, task.worktreePath);
    if (task.workspaceId) {
      const reg = svc(core, "workspaceRegistry");
      try { reg?.delete?.(task.workspaceId); } catch { /* ignore */ }
    }
  }
  try { await deleteBranch(project.repoPath, batch.testBranch); } catch { /* ignore */ }
  return { ok: true, batch: batchView(core.state.batches.find((b) => b.id === batchId)), mergedSha: r.mergedSha };
}

async function revertBatch(core, batchId) {
  const batch = core.state.batches.find((b) => b.id === batchId);
  if (!batch) return { ok: false, error: "批次不存在" };
  if (batch.status !== "merged") {
    return { ok: false, code: "state", error: `批次状态 ${batch.status} 不能回滚（只有已推送到 main 的批次可以回滚）` };
  }
  const project = findProject(core, batch.projectId);
  if (!project) return { ok: false, error: "项目不存在" };
  const r = await revertBase(project, batch);
  if (!r.ok) return r;
  mutate(core, (s) => {
    const b = s.batches.find((x) => x.id === batchId);
    b.status = "reverted";
    b.updatedAt = nowIso();
    for (const t of s.tasks) if (b.taskIds.includes(t.id)) { t.status = "accepted"; t.updatedAt = nowIso(); }
  });
  saveNow(core);
  return { ok: true, batch: batchView(core.state.batches.find((b) => b.id === batchId)), restoredSha: r.restoredSha };
}

/* ─────────────────────────── lead（super agent） ─────────────────────────── */

const LEAD_PERSONA = [
  "你是「工程台 Project Console」的常驻 super agent（跨项目总台），不是普通聊天助手。",
  "你的职责：接需求、判断真伪、拆任务、排优先级、派发/打回、决定集成批次、回答项目状态问题。",
  "你不做代码验收判定：自动验收由一次性判定器完成，结果只以简报里一行摘要的形式给你。",
  "工作方式：",
  "1) 每条用户消息前都附有【工程台简报】，那就是当前状态；不要凭记忆编状态。需要更多细节时用 project_status / project_task 只拉需要的部分。",
  "2) 接需求先用 project_list / project_status 看现状，再决定动作；不要一次拉全量任务列表。",
  "3) 需求含糊、验收标准不可测、或者你怀疑是伪需求（已有实现、重复、收益不成比例、没想清楚）时：",
  "   不要硬干。先用 project_question 把问题提到看板（附上你的判断与选项），再用 project_challenge 记录你的分析（做/砍/降级/先澄清）。",
  "4) 清晰的需求用 project_add 建任务（brief 写可执行需求 + DoD 草稿），填 touches（预计改动的路径，工程台用它避免同项目并发冲突），再 project_dispatch；并发受槽位限制，优先保住大任务。",
  "   工作量（size）由你判断，不要反问操作者；拿不准宁小勿大。",
  "5) 要看小文件用 project_read（按行、输出封顶）；搜代码用 project_search；大范围调查/失败原因用 project_diagnose（一次性只读会话，返回蒸馏结论）。不要一次读大文件、不要跑命令（你也没有 bash）。",
  "6) 已验收的批量任务用 project_integrate 发起集成批次；推送到 main 是人工确认动作，你只能发起批次、不能自动推送。",
  "7) 回答状态时引用真实任务 id、run、证据命令；没有数据就说没有。你说话要短、直接、可执行；先结论后理由。",
  "8) 如果简报显示「判定异常/需人工」，提醒操作者看对应任务；不要自己替判定器做验收。",
].join("\n");

/* ─────────────────────── 上下文管理（plan-context v0.1） ─────────────────────── */

const LEAD_PRESET_ID = "project-lead";
const REVIEW_MODES = ["reviewer", "lead", "off"];

function positiveInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function reviewModeOf(core) {
  const mode = String(core.state?.settings?.reviewMode ?? "reviewer");
  return REVIEW_MODES.includes(mode) ? mode : "reviewer";
}

function leadCtxLimitOf(core) {
  return positiveInt(core.state?.settings?.leadCtxLimitTokens, 100000, 10000, 2000000);
}

function toolOutputLimitOf(core) {
  return positiveInt(core.state?.settings?.toolOutputLimitBytes, 6144, 512, 65536);
}

function reviewTimeoutOf(core) {
  return positiveInt(core.state?.settings?.reviewTimeoutMs, 120000, 20000, 600000);
}

/** 会话当前上下文 tokens：优先 tokenMeter 真值，拿不到返回 null（不要拿估算冒充真值）。 */
function contextUsageOf(core, sessionId) {
  if (!sessionId) return null;
  const agents = svc(core, "agents");
  let agent;
  try { agent = agents?.get?.(sessionId); } catch { agent = undefined; }
  if (!agent || !agent.session) return null;
  const tm = svc(core, "tokenMeter");
  let tokens = null;
  try {
    const measured = tm?.measure?.(agent.session);
    if (measured && Number.isFinite(measured.totalTokens)) tokens = measured.totalTokens;
  } catch (error) {
    core.log("tokenMeter.measure 失败", String(error?.message ?? error));
  }
  let pressureTokens = null;
  try {
    const pressure = tm?.contextPressure?.(agent.session);
    pressureTokens = Number.isFinite(pressure?.pressureTokens) ? pressure.pressureTokens : null;
  } catch { /* optional */ }
  let model = null;
  try {
    const config = agent.session?.requestHeader?.()?.config;
    if (config?.provider && config?.model) model = { provider: config.provider, model: config.model };
  } catch { /* optional */ }
  return { sessionId, tokens, pressureTokens, model };
}

/** /status 用的上下文总览（含轮换配置、判定器统计）。 */
async function contextStatusOf(core) {
  const leadUsage = contextUsageOf(core, core.state.lead.sessionId);
  const estimatorUsage = contextUsageOf(core, core.estimatorSessionId);
  let contextWindow = null;
  try {
    const llm = svc(core, "llm");
    let selection = leadUsage?.model ?? workbenchModelOf(core);
    if (!selection) {
      const adm = svc(core, "agentDefaultModel");
      selection = adm && typeof adm.currentSelection === "function" ? adm.currentSelection() : null;
    }
    if (llm && selection?.provider && selection?.model) {
      const info = await llm.resolveModelInfo(selection.provider, selection.model);
      contextWindow = info?.context?.contextWindow ?? null;
    }
  } catch { /* ignore */ }
  const review = core.state.stats?.review ?? {};
  return {
    reviewMode: reviewModeOf(core),
    lead: {
      sessionId: core.state.lead.sessionId ?? null,
      presetId: core.state.lead.presetId ?? null,
      epoch: core.state.lead.epoch ?? 1,
      tokens: leadUsage?.tokens ?? null,
      pressureTokens: leadUsage?.pressureTokens ?? null,
      contextWindow,
      limit: leadCtxLimitOf(core),
      pendingContinuation: Boolean(core.state.lead.pendingContinuation),
    },
    estimator: {
      sessionId: core.estimatorSessionId ?? null,
      tokens: estimatorUsage?.tokens ?? null,
      sinceRotate: core.estimatorCount ?? 0,
      rotateEvery: positiveInt(core.state.settings?.estimatorRotateEvery, 20, 1, 500),
    },
    review: {
      ...review,
      inflight: core.reviewing?.size ?? 0,
      hostVerifyOnAccept: true,
      hostVerifyOnNeedInfo: true,
      deepReview: true,
      images: positiveInt(core.state.settings?.reviewImageMax, 3, 1, 8),
    },
    budgets: {
      toolOutputBytes: toolOutputLimitOf(core),
      briefBytes: positiveInt(core.state.settings?.leadBriefBytes, 1600, 400, 8000),
    },
  };
}

function formatLocalTime(iso) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(iso));
  } catch {
    return String(iso ?? "").slice(0, 16).replace("T", " ");
  }
}

function snippet(text, max = 36) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/**
 * 给 lead 的确定性简报（≤ leadBriefBytes）。数据全部来自 state，不依赖模型记忆。
 * 每条人消息前都会注入；轮换续接也用它。
 */
function buildLeadBrief(core, options = {}) {
  const state = core.state;
  if (!state) return "";
  const limit = positiveInt(options.limitBytes ?? state.settings?.leadBriefBytes, 1600, 400, 8000);
  const since = options.since !== undefined ? options.since : state.lead?.lastPromptAt;
  const lines = [];
  const usage = contextUsageOf(core, state.lead?.sessionId);
  const ctxPart = usage?.tokens ? ` · 上下文 ${Math.round(usage.tokens / 1000)}k/${Math.round(leadCtxLimitOf(core) / 1000)}k` : "";
  lines.push(`【工程台简报 · ${formatLocalTime(nowIso())}${ctxPart}】`);

  if (state.projects.length === 0) {
    lines.push("还没有项目。");
  } else {
    const projectBits = state.projects.slice(0, 6).map((p) => {
      const c = countTasks(core, p.id);
      return `${p.id} ${snippet(p.name, 18)}（待办${c.todo}/运行${c.running}/验收${c.review}/待澄清${c.questions}）`;
    });
    lines.push(`项目 ${state.projects.length} 个：${projectBits.join("；")}`);
  }

  const attention = [];
  const verifying = state.tasks.filter((t) => t.status === "verifying").slice(0, 6);
  if (verifying.length > 0) attention.push(`待验收 ${verifying.map((t) => `#${t.id}`).join(" ")}`);
  const escalated = state.tasks.filter((t) => t.status === "needs_review").slice(0, 6);
  if (escalated.length > 0) attention.push(`需人工 ${escalated.map((t) => `#${t.id}`).join(" ")}`);
  const openQuestions = state.questions.filter((q) => q.status === "open");
  if (openQuestions.length > 0) {
    attention.push(`待澄清 ${openQuestions.slice(0, 3).map((q) => `${q.id}「${snippet(q.text, 28)}」`).join("、")}${openQuestions.length > 3 ? ` 等${openQuestions.length}条` : ""}`);
  }
  const failed = state.tasks.filter((t) => t.status === "failed").slice(0, 5);
  if (failed.length > 0) attention.push(`失败 ${failed.map((t) => `#${t.id}`).join(" ")}`);
  const batches = state.batches.filter((b) => b.status === "awaiting_confirmation").slice(0, 3);
  if (batches.length > 0) attention.push(`批次待确认 ${batches.map((b) => b.id).join(" ")}`);
  if (attention.length > 0) lines.push(`需要你处理：${attention.join("；")}`);

  const reviews = (state.reviewLog ?? []).filter((r) => (since ? String(r.at) > String(since) : true)).slice(-5);
  if (reviews.length > 0) {
    const label = { accept: "通过", rework: "打回", need_info: "转人工", error: "判定失败" };
    lines.push(`最近判定：${reviews.map((r) => `#${r.taskId} ${label[r.verdict] ?? r.verdict}${r.reason ? `（${snippet(r.reason, 30)}）` : ""}`).join("；")}`);
  }
  const reviewErrors = state.tasks.filter((t) => t.review?.verdict === "error").slice(0, 3);
  if (reviewErrors.length > 0) {
    lines.push(`判定异常：${reviewErrors.map((t) => `#${t.id} ${snippet(t.review.error ?? "", 30)}`).join("；")}`);
  }
  const text = lines.join("\n");
  return Buffer.byteLength(text, "utf8") <= limit ? text : capBytes(text, limit);
}

const REVIEWER_PERSONA = [
  "你是「工程台」的一次性验收判定器，只做一件事：根据随后的证据判定这次任务改动能否验收。",
  "硬规则：",
  "1) 只有一个回合；不调用任何工具；不假设你没看到的内容。",
  "2) 证据不足以判断（缺 diff、自测没覆盖 DoD、报告与证据矛盾）就判 need_info，不要硬判。",
  "3) 只看证据；报告里的自述不能当作通过依据。",
  "4) 只输出一行 JSON，不要 Markdown 代码块、不要解释。",
  "格式：{\"verdict\":\"accept|rework|need_info\",\"confidence\":\"low|med|high\",\"reason\":\"不超过 120 字\",\"feedback\":\"rework 时必填，具体可执行，不超过 500 字\"}",
  "口径：DoD 核心已实现且自测全绿、diff 无明显越界/调试残留 → accept；有明确问题 → rework；证据不足/需求歧义 → need_info。",
  "命令名不同但语义等价也算通过：例如 DoD 写 node check.mjs，实际跑 npm test，而 package.json 的 test script 就是 node check.mjs，且退出码为 0 —— 可以 accept；但必须能从证据里说明等价关系，不能只看命令字面。",
  "DoD 里要求某个命令退出码为 0 时，必须有该命令的实际执行证据（任务自测命令或宿主复跑记录）。没有执行证据就判 need_info，不许根据脚本内容推断它会通过。",
  "DoD 是验收标准。DoD 任一条明确未实现，或 DoD 与需求摘要冲突，只能输出 need_info，不要自行认定 DoD 作废、也不要替任务改写验收标准。",
].join("\n");

const DEEP_REVIEW_PERSONA = [
  "你是「工程台」的一次性深审调查员。第一道判定器对某个任务的证据有疑问，你来只读核实。",
  "硬规则：",
  "1) 只读：不改文件、不 git commit/push、不装依赖；可以读代码、git diff/show/log、grep，也可以运行项目自带的只读检查（例如 node check.mjs）。",
  "2) 结论必须落到证据：文件路径/行号、命令 + 退出码 + 关键输出。",
  "3) 只解决判定器提出的疑问；不要扩大范围。",
  "4) 只输出一行 JSON，不要 Markdown 代码块、不要解释。",
  "格式：{\"verdict\":\"accept|rework|need_info\",\"confidence\":\"low|med|high\",\"reason\":\"不超过 120 字\",\"feedback\":\"rework 时必填，具体可执行，不超过 500 字\"}",
  "你只补证据，不做验收决定：DoD 任一条明确未实现、或 DoD 与需求摘要冲突时，只能输出 need_info，不能 accept。",
].join("\n");

const DIAGNOSE_PERSONA = [
  "你是「工程台」的一次性调查员，帮调度员回答一个关于任务或仓库的具体问题。",
  "硬规则：只读——不改文件、不 push、不装依赖、不跑超过 60 秒的命令；结论必须有证据（文件路径 / commit / 命令输出）。",
  "输出：先一句话结论，再最多 5 条证据，再最多 2 条建议；总长不超过 15 行。找不到就直说找不到。",
].join("\n");

/** 把一段会话记录压成续接文本（只留人/助手文字，不要工具明细）。 */
function buildContinuationText(core, transcript, keep = 10) {
  const SKIP = ["<system-reminder>", "Current runtime context", "Time sampled", "【工程台简报", "【会话续接", "【工程台自检", "【工程台任务", "【工程台自动验收", "【工程台澄清回复"];
  const messages = transcript?.ok ? transcript.messages : [];
  const picked = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && (m.type === "user/message" || m.type === "assistant/message"))
    .filter((m) => !SKIP.some((prefix) => String(m.text ?? "").trimStart().startsWith(prefix)))
    .slice(-Math.max(0, Number(keep) || 0));
  const lines = picked.map((m) => `${m.role === "user" ? "用户" : "你"}：${capBytes(String(m.text ?? "").trim(), 600)}`);
  return [
    "【会话续接】上一段工程台会话已达上下文上限，已轮换；下面是最近对话与当前看板状态。",
    "",
    ...(lines.length > 0 ? ["最近对话：", ...lines, ""] : []),
    buildLeadBrief(core),
    "",
    "（工具明细已省略；需要细节用 project_* / project_diagnose 重新查。）",
  ].join("\n");
}

/** 主动轮换 lead 会话（默认由 promptLead 在超限时自动调用）。 */
async function rotateLead(core, options = {}) {
  await ensureState(core);
  // 并发轮换保护：同时到达的多条 prompt 共用一次轮换。
  // 没有这把锁时，5 条消息会各自从同一个旧会话重建，epoch 膨胀、留下空壳会话。
  if (core.rotating) {
    try { await core.rotating; } catch { /* 另一路失败时继续用当前会话 */ }
    return { ok: true, reused: true, to: core.state.lead.sessionId };
  }
  const job = (async () => {
    const from = core.state.lead.sessionId;
    if (!from) {
      const created = await ensureLead(core);
      return created.ok ? { ok: true, from: null, to: created.sessionId } : created;
    }
    const keep = positiveInt(options.keep ?? core.state.settings.leadKeepMessages, 10, 0, 40);
    const transcript = await transcriptOf(core, from, 600);
    const continuation = buildContinuationText(core, transcript, keep);
    const created = await ensureLead(core, {
      skipExisting: true,
      rotate: true,
      continuation,
      presetId: core.state.lead.presetId ?? LEAD_PRESET_ID,
    });
    if (!created.ok) return created;
    try { await archiveSessionById(core, from); } catch (error) { core.log("归档旧 lead 会话失败（忽略）", String(error)); }
    core.log(`lead 轮换 ${from} → ${created.sessionId}（续接 ${Buffer.byteLength(continuation, "utf8")}B）`);
    return { ok: true, from, to: created.sessionId, continuationBytes: Buffer.byteLength(continuation, "utf8") };
  })();
  core.rotating = job;
  try { return await job; } finally { core.rotating = null; }
}

/** 超限且空闲时轮换；忙就等下一次 prompt 再轮换。 */
async function maybeRotateLead(core, options = {}) {
  const sessionId = core.state.lead?.sessionId;
  if (!sessionId) return { rotated: false, reason: "no-session" };
  const limit = leadCtxLimitOf(core);
  const usage = contextUsageOf(core, sessionId);
  if (!usage || !Number.isFinite(usage.tokens)) return { rotated: false, reason: "no-measure" };
  if (usage.tokens < limit) return { rotated: false, tokens: usage.tokens };
  if (core.state.settings.leadStatus === "running") return { rotated: false, reason: "busy", tokens: usage.tokens };
  if (core.rotating) {
    try { await core.rotating; } catch { /* ignore */ }
    return { rotated: false, reason: "already-rotating", to: core.state.lead.sessionId };
  }
  const result = await rotateLead(core, options);
  return { ...result, rotated: result.ok === true, tokens: usage.tokens };
}

/** 组装一次性诊断 prompt：任务上下文 + 最近会话事件 + 明确问题。 */
function buildDiagnosePrompt(core, task, question, events) {
  const project = findProject(core, task.projectId);
  const run = lastRunOf(core, task.id);
  const st = run?.selfTest ?? {};
  const lines = [
    `【工程台诊断 · 任务 #${task.id}】${task.title}`,
    `项目：${project?.name ?? task.projectId}；仓库：${project?.repoPath ?? "-"}；base：${project?.baseBranch ?? "-"}`,
    `任务状态：${task.status}；分支：${task.branch ?? "-"}；worktree：${task.worktreePath ?? "-"}`,
    `DoD：${(task.dod ?? []).map((d) => d).join(" | ") || "（无）"}`,
    `任务简报：${capBytes(String(task.brief ?? "").trim() || "（无）", 800)}`,
    `最近 run：${run ? `${run.id} ${run.outcome ?? "running"} 自测 ${st.passed ?? 0}/${st.total ?? 0} diff ${run.diffStat ?? "-"}` : "无"}`,
  ];
  if (run?.selfTest?.commands?.length) {
    lines.push("自测命令：");
    for (const c of run.selfTest.commands.slice(-8)) lines.push(`- ${c.ok ? "✓" : "✗"} ${c.command}（exit ${c.exitCode ?? "?"}）`);
  }
  if (Array.isArray(events) && events.length > 0) {
    lines.push("", "最近会话事件：");
    for (const e of events.slice(-30)) lines.push(`- ${e.seq} [${e.type}] ${capBytes(e.summary ?? "", 200)}`);
  }
  lines.push(
    "",
    "## 问题",
    String(question ?? "").trim() || "（未提供问题；请给出任务当前状态与风险）",
    "",
    "请按你的角色规则回答：只读、≤15 行、有证据。",
  );
  return lines.join("\n");
}

/** 一次性只读调查：宿主起隐藏会话（默认 standard preset，带 read/grep/bash），返回蒸馏结论。 */
async function diagnoseTask(core, taskId, question, options = {}) {
  await ensureState(core);
  const task = findTask(core, taskId);
  if (!task) return { ok: false, error: "任务不存在" };
  const timeout = positiveInt(options.timeoutMs, 90000, 15000, 300000);
  const events = await taskEvents(core, task, 30);
  const prompt = buildDiagnosePrompt(core, task, question, events);
  let created;
  try {
    created = await createHiddenSessionAt(
      core,
      core.stateDir,
      undefined,
      { name: "project-console:diagnose-persona", order: 150, text: DIAGNOSE_PERSONA },
      {
        label: "diagnose",
        denyTools: [
          "project_accept", "project_rework", "project_add", "project_update", "project_dispatch",
          "project_integrate", "project_abandon", "project_question", "project_set_budget",
          "project_throttle", "project_diagnose", "write", "edit", "apply_patch",
        ],
      },
    );
  } catch (error) {
    return { ok: false, error: `建诊断会话失败：${String(error?.message ?? error)}` };
  }
  const started = Date.now();
  try {
    const presets = svc(core, "permissionPresets");
    try { presets?.set?.(created.agent.session, "workspace-write"); } catch { /* ignore */ }
    const before = await readSessionEvents(core, created.sessionId);
    if (before === null) throw new Error("读不到诊断会话事件");
    const afterSeq = before.length > 0 ? Number(before[before.length - 1].seq ?? 0) : 0;
    const sent = await promptSession(core, created.sessionId, prompt);
    if (!sent.ok) throw new Error(sent.error);
    const reply = await waitSessionReply(core, created.sessionId, afterSeq, timeout);
    if (!reply.ok) throw new Error(reply.error);
    const usage = contextUsageOf(core, created.sessionId);
    return {
      ok: true,
      text: capBytes(String(reply.text ?? "").trim() || "（诊断会话没有返回文本）", 2000),
      tokens: usage?.tokens ?? null,
      ms: Date.now() - started,
      sessionId: created.sessionId,
    };
  } catch (error) {
    try { created.agent?.cancel?.({ kind: "user" }, { keepInbox: false }); } catch { /* ignore */ }
    return { ok: false, error: String(error?.message ?? error), ms: Date.now() - started, sessionId: created.sessionId };
  } finally {
    try { core.hiddenSessions?.delete(created.sessionId); } catch { /* ignore */ }
    try { await archiveSessionById(core, created.sessionId); } catch { /* ignore */ }
  }
}

async function ensureLead(core, options = {}) {
  const wantedPreset = typeof options.presetId === "string" && options.presetId !== "" ? options.presetId : LEAD_PRESET_ID;
  const existingId = core.state.lead.sessionId;
  if (existingId && options.skipExisting !== true) {
    const wasHidden = Boolean(core.hiddenSessions?.has(existingId) || core.state.lead.hidden);
    const presetMatches = (core.state.lead.presetId ?? null) === wantedPreset;
    const alive = await resolvePromptAgent(core, existingId);
    if (alive.agent && wasHidden && presetMatches) {
      return { ok: true, sessionId: existingId, reused: true, hidden: true };
    }
    if (alive.agent && wasHidden && !presetMatches) {
      core.log(`lead preset 变化（${core.state.lead.presetId ?? "none"} → ${wantedPreset}），重建 lead 会话`);
    }
    if (alive.agent && !wasHidden) {
      // 旧的可视 lead：迁移成隐藏 lead（用户要求工程台会话不显示在左栏），旧会话归档。
      core.log("迁移可视 lead 会话为隐藏会话", existingId);
      try {
        const reg = svc(core, "workspaceRegistry");
        await reg?.archiveSession?.(existingId);
      } catch (error) {
        core.log("归档旧 lead 会话失败（忽略）", String(error));
      }
    }
  }
  const cwd = core.stateDir;
  mkdirSync(cwd, { recursive: true });
  let created;
  try {
    // persona 通过 systemPrompt runtime context 注入（per-agent scope，不占会话事件、可持久重建）。
    created = await createHiddenSessionAt(
      core,
      cwd,
      workbenchModelOf(core) ?? undefined,
      { name: "project-console:lead-persona", order: 130, text: LEAD_PERSONA },
      { presetId: wantedPreset, label: "lead" },
    );
  } catch (error) {
    return { ok: false, error: `建隐藏 lead 会话失败：${String(error)}` };
  }
  const sessionId = created.sessionId;
  const createdAgent = created.agent;
  const resolved = createdAgent ? { agent: createdAgent } : await resolvePromptAgent(core, sessionId);
  if (resolved.agent) {
    const presets = svc(core, "permissionPresets");
    try { presets?.set?.(resolved.agent.session, "workspace-write"); } catch { /* lead 只读为主 */ }
  } else {
    core.log("lead agent 未就绪", String(resolved.error));
  }
  const actualPreset = created.presetId ?? null;
  if (actualPreset !== wantedPreset) core.log(`lead preset 回退：想要 ${wantedPreset}，实际 ${actualPreset ?? "无"}`);
  mutate(core, (s) => {
    s.lead.sessionId = sessionId;
    s.lead.createdAt = nowIso();
    s.lead.hidden = true;
    s.lead.presetId = actualPreset;
    s.lead.previousSessionId = existingId ?? null;
    s.lead.epoch = options.rotate === true ? (s.lead.epoch ?? 1) + 1 : (s.lead.epoch ?? 1);
    s.lead.pendingContinuation = typeof options.continuation === "string" && options.continuation !== "" ? options.continuation : null;
    s.settings.leadSessionId = sessionId;
    s.settings.leadStatus = "idle";
  });
  saveNow(core);
  // 新 lead 会话按设置页配的工作台模型来（createHiddenSessionAt 已用；这里再兜一层防手改）。
  try { await applyWorkbenchModel(core); } catch { /* ignore */ }
  return { ok: true, sessionId, reused: false, hidden: true, presetId: actualPreset, epoch: core.state.lead.epoch };
}

/** 通用：读取一个会话的事件并转成可展示的对话记录（隐藏会话也适用，绕过 native 路由限制）。 */
async function transcriptOf(core, sessionId, limit = 200) {
  if (!sessionId) return { ok: false, code: "no-session", error: "没有会话" };
  const sq = svc(core, "sessionQuery");
  if (!sq || typeof sq.readSession !== "function") return { ok: false, code: "no-service", error: "sessionQuery 不可用" };
  let events = [];
  try {
    const read = await sq.readSession(sessionId);
    events = read.events ?? [];
  } catch (error) {
    return { ok: false, code: "read-failed", error: String(error) };
  }
  const textOf = (content) => (Array.isArray(content) ? content.map((b) => (b && b.type === "text" ? b.text : "")).join("") : "");
  const messages = [];
  for (const evt of events) {
    if (!evt || !evt.type) continue;
    if (evt.type === "user/message") {
      const text = textOf(evt.data?.content ?? []).trim();
      if (text) messages.push({ role: "user", text, time: evt.time, type: evt.type });
    } else if (evt.type === "developer/message" || evt.type === "system/message") {
      const text = textOf(evt.data?.content ?? evt.data?.message?.content ?? []).trim();
      if (text) messages.push({ role: "system", text, time: evt.time, type: evt.type });
    } else if (evt.type === "assistant/message") {
      const text = textOf(evt.data?.message?.content ?? []).trim();
      if (text) messages.push({ role: "assistant", text, time: evt.time, type: evt.type });
    } else if (evt.type === "tool/call") {
      messages.push({ role: "tool", text: `调用 ${evt.data?.name ?? "tool"} ${String(evt.data?.arguments ?? "").slice(0, 240)}`, time: evt.time, type: evt.type });
    } else if (evt.type === "tool/result") {
      const text = textOf(evt.data?.message?.content ?? []).replace(/\s+/g, " ").slice(0, 280);
      if (text) messages.push({ role: "tool", text: `结果 ${text}`, time: evt.time, type: evt.type });
    } else if (evt.type === "turn/end") {
      messages.push({ role: "system", text: `回合结束（${evt.data?.reason?.kind ?? "?"}）`, time: evt.time, type: evt.type });
    }
  }
  return { ok: true, sessionId, messages: messages.slice(-limit) };
}

/** lead 对话记录（供工程台内嵌对话抽屉）。 */
async function leadTranscript(core, limit = 200) {
  const sessionId = core.state.lead.sessionId;
  if (!sessionId) return { ok: false, code: "no-lead", error: "工程台会话还没创建" };
  const r = await transcriptOf(core, sessionId, limit);
  return r.ok ? { ...r, status: core.state.settings.leadStatus ?? "unknown" } : r;
}

/** 任务会话记录（含历次 run 的会话列表，供看板内查看会话，替代打不开的 native 会话）。 */
async function taskTranscript(core, taskId, options = {}) {
  const task = findTask(core, taskId);
  if (!task) return { ok: false, code: "not-found", error: "任务不存在" };
  const runs = core.state.runs.filter((r) => r.taskId === task.id && r.sessionId);
  const pick = options.runId
    ? runs.find((r) => r.id === options.runId)
    : (runs[runs.length - 1] ?? null);
  const sessionId = pick?.sessionId ?? task.sessionId;
  const r = await transcriptOf(core, sessionId, options.limit ?? 200);
  const runList = runs.map((run) => ({
    runId: run.id,
    sessionId: run.sessionId,
    status: run.endedAt ? (run.outcome === "failed" ? "failed" : "finished") : "running",
    startedAt: run.startedAt,
    endedAt: run.endedAt ?? null,
    selfTest: run.selfTest ? { passed: run.selfTest.passed ?? 0, total: run.selfTest.total ?? 0 } : { passed: 0, total: 0 },
  })).reverse();
  return r.ok ? { ...r, taskId: task.id, runId: pick?.id ?? null, runs: runList } : { ...r, taskId: task.id, runs: runList };
}

async function promptLead(core, text) {
  await ensureState(core);
  const message = String(text ?? "").trim();
  if (message === "") return { ok: false, code: "empty", error: "消息不能为空" };
  if (!core.state.lead.sessionId) {
    const created = await ensureLead(core);
    if (!created.ok) return created;
  }
  try {
    const rotated = await maybeRotateLead(core);
    if (rotated?.rotated) core.log(`lead 轮换完成：${rotated.from ?? "-"} → ${rotated.to}`);
  } catch (error) {
    core.log("lead 轮换检查失败（继续用当前会话）", String(error?.message ?? error));
  }
  const payload = composeLeadPrompt(core, message);
  let r = await promptSession(core, core.state.lead.sessionId, payload);
  if (!r.ok) {
    // 隐藏 lead 的生命周期挂在插件 fiber 上，插件热重载后会失效：这里自愈重建一个隐藏 lead 再发。
    // 跳过 ensureLead 里的「旧会话还活着吗」检查：promptSession 刚判定它不可用，再查一遍纯属白等。
    core.log("lead 会话不可用，重建隐藏 lead", String(r.error).slice(0, 200));
    const created = await ensureLead(core, { skipExisting: true });
    if (!created.ok) return created;
    r = await promptSession(core, created.sessionId, payload);
  }
  if (r.ok) {
    mutate(core, (s) => { s.lead.lastPromptAt = nowIso(); s.settings.leadStatus = "running"; });
    saveNow(core);
  }
  return r;
}

/** 每条人消息前拼简报；轮换后的续接文本优先。 */
function composeLeadPrompt(core, text) {
  const raw = String(text ?? "");
  if (raw.startsWith("【会话续接】") || raw.startsWith("【工程台简报")) return raw;
  let prefix = "";
  if (core.state.lead.pendingContinuation) {
    prefix = String(core.state.lead.pendingContinuation);
    mutate(core, (s) => { s.lead.pendingContinuation = null; });
  }
  const parts = [];
  if (prefix !== "") parts.push(prefix);
  if (!prefix.includes("【工程台简报")) parts.push(buildLeadBrief(core));
  parts.push("————");
  parts.push(raw);
  return parts.join("\n\n");
}

/* ─────────────────────────── 调度 tick ─────────────────────────── */

/** 任务被删除后，判定记录/统计跟着收敛，避免简报里出现不存在的任务号。 */
function pruneReviewStats(core) {
  const s = core.state;
  if (!s || !Array.isArray(s.reviewLog)) return false;
  const ids = new Set(s.tasks.map((t) => t.id));
  const kept = s.reviewLog.filter((r) => ids.has(r.taskId));
  if (kept.length === s.reviewLog.length) return false;
  mutate(core, (st) => {
    st.reviewLog = kept;
    const stats = { runs: 0, accepted: 0, reworked: 0, needInfo: 0, failed: 0, tokens: 0 };
    for (const r of kept) {
      stats.runs += 1;
      if (r.verdict === "accept") stats.accepted += 1;
      else if (r.verdict === "rework") stats.reworked += 1;
      else if (r.verdict === "need_info") stats.needInfo += 1;
      else stats.failed += 1;
      if (Number.isFinite(r.tokens)) stats.tokens += r.tokens;
    }
    st.stats = st.stats ?? {};
    st.stats.review = stats;
  });
  saveNow(core);
  return true;
}

/** 插件重载/判定器超时会留下卡在 verifying 的任务：过了 5 分钟重试一次，最多 2 次。 */
async function maybeRetryStuckReviews(core) {
  if (!core.state || reviewModeOf(core) !== "reviewer") return;
  pruneReviewStats(core);
  const nowMs = Date.now();
  // 旧逻辑/中途重载可能把已判 need_info 的任务留在 verifying：收敛到 needs_review。
  for (const task of core.state.tasks) {
    if (task.status === "verifying" && task.review?.verdict && !["accept", "rework"].includes(task.review.verdict)) {
      mutate(core, (s) => {
        const t = s.tasks.find((x) => x.id === task.id);
        if (t) { t.status = "needs_review"; t.updatedAt = nowIso(); }
      });
      saveNow(core);
    }
  }
  for (const task of core.state.tasks) {
    if (task.status !== "verifying") continue;
    const run = lastRunOf(core, task.id);
    if (!run || run.review || !run.reviewRequestedAt) continue;
    if (core.reviewing?.has(task.id)) continue;
    const age = nowMs - Date.parse(run.reviewRequestedAt);
    if ((run.reviewAttempts ?? 0) >= 2) {
      // 已经重试过 2 次；插件再重载一次，队列里的判定就彻底丢了。超过 10 分钟直接转人工，
      // 别让任务永远卡在 verifying 占着槽位（这也是审计里「verifying 看门狗」的兜底）。
      if (Number.isFinite(age) && age > 600000) {
        core.log(`验收重试 ${run.reviewAttempts} 次仍未完成 #${task.id}，转人工`);
        mutate(core, (s) => {
          const t = s.tasks.find((x) => x.id === task.id);
          if (t && t.status === "verifying") {
            t.status = "needs_review";
            t.error = `验收重试 ${run.reviewAttempts} 次仍未完成（run ${run.id}），已转人工`;
            t.updatedAt = nowIso();
          }
        });
        saveNow(core);
      }
      continue;
    }
    if (!Number.isFinite(age) || age < 300000) continue;
    core.log(`验收超时重试 #${task.id}（上次请求 ${Math.round(age / 1000)}s 前）`);
    try { await requestReview(core, task.id, { force: true, retry: true }); }
    catch (error) { core.log("验收超时重试失败", String(error)); }
  }
}

async function tick(core) {
  await maybeRetryStuckReviews(core);
  if (core.state.settings.autoDispatch === false) return;
  const state = core.state;
  const queued = state.tasks
    .filter((t) => t.status === "queued")
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.id - b.id);
  // 卡在 provisioning 且没有会话的任务：插件重启/派发中途异常留下的孤儿，3 分钟后重新排队。
  const nowMs = Date.now();
  for (const t of state.tasks) {
    if (t.status === "provisioning" && !t.sessionId) {
      const age = nowMs - Date.parse(t.updatedAt ?? t.createdAt ?? nowIso());
      if (Number.isFinite(age) && age > 180000) {
        mutate(core, (st) => {
          const x = st.tasks.find((y) => y.id === t.id);
          if (x) {
            x.status = "queued";
            x.error = "派发中途中断（provisioning 超时），已自动重新排队";
            x.updatedAt = nowIso();
          }
        });
        saveNow(core);
        core.log(`孤儿 provisioning 任务 #${t.id} 已重新排队`);
      }
    }
  }
  if (queued.length > 0) {
    const signature = state.tasks.map((t) => t.id + ":" + t.status).join(",");
    if (core.lastQueueSignature !== signature) {
      core.lastQueueSignature = signature;
      core.log(`tick: queued=${queued.length}（${signature}）`);
    }
  }
  for (const task of queued) {
    const r = await dispatchTask(core, task.id, { auto: true });
    if (r.ok) {
      core.log(`auto-dispatch #${task.id} ok`);
      core.lastDispatchSkip = null;
      continue;
    }
    // 项目槽位不足 / 依赖未满足：只跳过这一条，不能 return——否则一个项目满槽会
    // 把排在后面的其他项目一起饿死（实测 p3 满槽时 p1/p2 空闲槽位也派不出去）。
    // 只有全局槽位不足才说明这一轮所有项目都没得派，直接结束本轮。
    if (r.code === "deps") continue;
    if (r.code === "slots") {
      if (r.scope === "global") return;
      continue;
    }
    const last = core.lastDispatchSkip;
    if (!last || last.taskId !== task.id || last.code !== r.code || nowMs - last.at > 60000) {
      core.lastDispatchSkip = { taskId: task.id, code: r.code ?? "error", at: nowMs };
      core.log(`auto-dispatch #${task.id} 跳过：${r.code ?? "error"} ${r.error ?? ""}`);
    }
  }
}

/**
 * 插件启动时回收「上一个实例留下的孤儿任务」（HMR 重载/崩溃/桌面版重启），立刻重新排队。
 *
 * 隐藏会话的生命周期挂在插件 fiber 上：插件一重载，正在跑的 turn 就没了，永远不会再
 * 收到 turn/end。所以启动时还停在 running/verifying、且最近一次 run 没写 endedAt 的任务，
 * 必然是上个实例中断留下的——结束该 run 并回队列，交给 5s 一轮的调度泵接着跑。
 */
async function reclaimOrphanDispatches(core) {
  const changed = [];
  const interrupted = [];
  const interruptedBatches = [];
  mutate(core, (s) => {
    for (const t of s.tasks) {
      if (t.status !== "provisioning") continue;
      const token = String(t.dispatchToken ?? "");
      if (token.startsWith(core.instanceId)) continue;
      t.status = "queued";
      t.error = "上一个插件实例派发中断（HMR/崩溃），已自动重新排队";
      t.updatedAt = nowIso();
      delete t.dispatchToken;
      changed.push(t.id);
    }
    for (const t of s.tasks) {
      if (t.status !== "running" && t.status !== "verifying") continue;
      const runs = s.runs.filter((r) => r.taskId === t.id);
      const last = runs.length > 0 ? runs[runs.length - 1] : null;
      if (!last || last.endedAt !== null) continue;
      last.endedAt = nowIso();
      last.outcome = "failed";
      last.reason = "plugin-reload";
      t.status = "queued";
      t.retryCount = 0;
      t.error = `插件重载中断了运行中的会话（run ${last.id}），已自动重新排队`;
      t.updatedAt = nowIso();
      delete t.dispatchToken;
      interrupted.push({ taskId: t.id, runId: last.id });
    }
    // 集成批次也挂在插件 fiber 上：跑到一半重载，异步任务没了，批次会永远停在 running，
    // 还会挡住删项目。启动时统一标记失败，并清掉它留下的测试 worktree/分支。
    for (const b of s.batches ?? []) {
      if (b.status !== "running") continue;
      b.status = "failed";
      b.verdict = "plugin-reload";
      b.error = "插件重载中断了集成批次，已标记失败；可以重新发起集成";
      b.updatedAt = nowIso();
      interruptedBatches.push({ id: b.id, projectId: b.projectId, testBranch: b.testBranch, testWorktree: b.testWorktree });
    }
  });
  if (changed.length > 0) {
    saveNow(core);
    core.log(`回收孤儿 provisioning 任务：${changed.map((id) => "#" + id).join(",")}`);
  }
  if (interrupted.length > 0) {
    saveNow(core);
    core.log(`回收插件重载中断的任务：${interrupted.map((x) => `#${x.taskId}(run ${x.runId})`).join(",")}`);
  }
  if (interruptedBatches.length > 0) {
    saveNow(core);
    for (const batch of interruptedBatches) {
      const project = findProject(core, batch.projectId);
      const worktree = batch.testWorktree ?? (project ? join(project.worktreeRoot, `integration-${batch.id}`) : null);
      try {
        if (project && worktree && existsSync(worktree)) await removeWorktree(project.repoPath, worktree);
        if (project && batch.testBranch) await deleteBranch(project.repoPath, batch.testBranch);
      } catch (error) {
        core.log(`清理中断批次 ${batch.id} 的 worktree/分支失败（忽略）`, String(error));
      }
    }
    core.log(`回收插件重载中断的集成批次：${interruptedBatches.map((b) => b.id).join(",")}`);
  }
}

/** 磁盘采样（每 30s 一次，避免每次 /state 都 du）。 */
async function sampleDisk(core) {
  const now = Date.now();
  if (core.lastDiskSample && now - core.lastDiskSample < 30000) return;
  core.lastDiskSample = now;
  for (const p of core.state.projects) {
    const sizes = await Promise.all([
      dirSizeMB(p.worktreeRoot),
      dirSizeMB(join(core.stateDir, "worktrees", p.id)),
    ]);
    p.diskUsedGB = Math.round((Math.max(...sizes) / 1024) * 100) / 100;
  }
  scheduleSave(core, 500);
}

/* ─────────────────────────── 任务日志摘要（UI 用） ─────────────────────────── */

async function taskEvents(core, task, limit = 200) {
  const sq = svc(core, "sessionQuery");
  const sessionId = task.sessionId;
  if (!sq || !sessionId || typeof sq.readSession !== "function") return [];
  try {
    const read = await sq.readSession(sessionId);
    const events = read.events ?? [];
    const rows = [];
    for (const evt of events) {
      if (!evt || !evt.type) continue;
      let summary = "";
      if (evt.type === "tool/call") summary = `${evt.data.name} ${String(evt.data.arguments ?? "").slice(0, 160)}`;
      else if (evt.type === "assistant/message") summary = messageText(evt.data?.message?.content ?? []).slice(0, 200);
      else if (evt.type === "user/message") summary = messageText(evt.data?.content ?? []).slice(0, 160);
      else if (evt.type === "turn/end") summary = `turn end: ${evt.data?.reason?.kind}`;
      else if (evt.type === "turn/start") summary = `turn start #${evt.data?.turn}`;
      else continue;
      rows.push({ seq: evt.seq, type: evt.type, time: evt.time, summary });
    }
    return rows.slice(-limit);
  } catch {
    return [];
  }
}
// ───────────────────────────── report.js ─────────────────────────────
/**
 * 工程台 host 半边 · 可下载验收报告（单文件 HTML，证据截图内联）。
 *
 * 只有验收完成（accepted / merged）的任务才能下载：报告对应已验收的提交，
 * 验收前的证据还在变，不提供下载（UI 不显示按钮，接口返回 409 not-accepted）。
 *
 * 为什么是一张自包含 HTML：验收人要的是「打开就能看、能转发、能打印」的东西。
 * 报告里所有图片都以 data URI 内联，没有任何外部资源/相对路径，离线可看；
 * 需要 PDF 时浏览器打印即可。宿主只依赖 Node 内置模块，不新增 npm 依赖。
 *
 * 图片来源（去重后按证据优先级挑选，最多 24 张、单张 ≤6MB、内联总量 ≤24MB）：
 *   1. worktree 里 artifacts/ screenshots/ shots/ captures/ evidence/ 本次运行产出的图；
 *   2. run.files 里新增/修改的图片（diff 里的图）；
 *   3. 任务简报 / 最终报告 / 命令输出里出现过的本机证据目录（例如之前约定的
 *      `/…/artifacts/#6/`）——历史任务 worktree 已清理时靠它兜底；
 *   4. 项目配置 evidenceRoots（模板 `{taskId}`），给仓库外的证据目录用；
 *   5. 宿主 own 归档（$DSH_HOME/project-console/evidence/task-<id>/report-images）。
 * 每次生成时把选中的图归档一份，所以 worktree 被清理后报告还能重新生成。
 */



const REPORT_VERSION = "1.6";
const REPORT_MAX_IMAGES = 24;
const REPORT_MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const REPORT_MAX_TOTAL_BYTES = 24 * 1024 * 1024;
const REPORT_MAX_CANDIDATES = 120;
const REPORT_WALK_FILE_LIMIT = 4000;
const REPORT_DIR_DEPTH = 4;
const REPORT_MENTION_DEPTH = 3;

const REPORT_IMAGE_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const REPORT_WORKTREE_DIRS = [
  "artifacts",
  "artifacts/evidence",
  "screenshots",
  "shots",
  "captures",
  "capture",
  "evidence",
  "test-results",
];

const REPORT_SKIP_DIR_NAMES = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".vite", ".cache",
  ".project-console", ".scratch", "__pycache__", ".pnpm",
]);

const REPORT_EVIDENCE_DIR_WORDS = /(?:^|\/)(?:artifacts?|evidence|screenshots?|shots?|captures?|keyframes?|test-results?)(?:\/|$)/i;

const REPORT_SOURCE_LABELS = {
  worktree: "工作区产物截图",
  files: "本次改动图片",
  mentioned: "会话证据目录",
  evidenceRoot: "项目证据目录",
  archive: "宿主归档",
  attachment: "需求参考截图",
};

const REPORT_SOURCE_PRIORITY = {
  worktree: 0,
  mentioned: 1,
  evidenceRoot: 2,
  files: 3,
  attachment: 4,
  archive: 5,
};

const REPORT_STATUS_TEXT = {
  inbox: "待办",
  queued: "待办",
  needs_input: "待澄清",
  provisioning: "准备中",
  running: "进行中",
  verifying: "验收中",
  needs_review: "待验收",
  failed: "失败",
  accepted: "已验收",
  merged: "已合并",
  abandoned: "已放弃",
};

/* ─────────────────────────── 小工具 ─────────────────────────── */

function reportMimeOf(path) {
  return REPORT_IMAGE_MIME[extname(String(path)).toLowerCase()] ?? null;
}

function reportStamp(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function reportBytesText(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function reportEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** 文案里只允许 http(s) 链接变成 <a>，避免把怪协议写进报告。 */
function reportLinkSafe(url) {
  return /^https?:\/\//i.test(String(url ?? ""));
}

function reportInline(text) {
  let html = reportEscape(text);
  html = html.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, (_m, strong) => `<strong>${strong}</strong>`);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => (
    reportLinkSafe(href) ? `<a href="${reportEscape(href)}" target="_blank" rel="noreferrer">${label}</a>` : label
  ));
  return html;
}

/** 极简 Markdown 渲染（标题 / 列表 / 表格 / 代码块 / 段落）。只处理合法转义后的文本。 */
function reportMarkdown(raw) {
  const lines = String(raw ?? "").replaceAll("\r\n", "\n").split("\n");
  const out = [];
  let paragraph = [];
  let list = [];
  let code = null;
  let table = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${paragraph.map((line) => reportInline(line)).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      out.push(`<ul>${list.map((item) => `<li>${reportInline(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flushTable = () => {
    if (table !== null) {
      const head = table.head ? `<thead><tr>${table.head.map((c) => `<th>${reportInline(c)}</th>`).join("")}</tr></thead>` : "";
      const body = table.rows.map((row) => `<tr>${row.map((c) => `<td>${reportInline(c)}</td>`).join("")}</tr>`).join("");
      out.push(`<table>${head}<tbody>${body}</tbody></table>`);
      table = null;
    }
  };
  const flushAll = () => { flushParagraph(); flushList(); flushTable(); };
  const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

  for (const line of lines) {
    if (code !== null) {
      if (/^\s*```/.test(line)) {
        out.push(`<pre class="report-code">${reportEscape(code.join("\n"))}</pre>`);
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (/^\s*```/.test(line)) {
      flushAll();
      code = [];
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = Math.min(4, Math.max(2, heading[1].length + 1));
      out.push(`<h${level}>${reportInline(heading[2])}</h${level}>`);
      continue;
    }
    const pipe = line.trim();
    if (pipe.startsWith("|") && pipe.endsWith("|") && pipe.length > 2) {
      flushParagraph();
      flushList();
      const cells = splitRow(pipe);
      if (table === null) table = { head: cells, rows: [] };
      else if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue;
      else table.rows.push(cells);
      continue;
    }
    const listItem = /^\s*[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      flushParagraph();
      flushTable();
      list.push(listItem[1]);
      continue;
    }
    if (line.trim() === "") {
      flushAll();
      continue;
    }
    flushList();
    flushTable();
    paragraph.push(line);
  }
  if (code !== null) out.push(`<pre class="report-code">${reportEscape(code.join("\n"))}</pre>`);
  flushAll();
  return out.join("\n");
}

function reportBadge(text, tone = "muted") {
  return `<span class="badge badge--${reportEscape(tone)}">${reportEscape(text)}</span>`;
}

function reportStatusTone(status) {
  if (["merged", "accepted"].includes(status)) return "success";
  if (["failed", "abandoned"].includes(status)) return "danger";
  if (["verifying", "needs_review", "running", "provisioning"].includes(status)) return "warn";
  return "muted";
}

function reportFileListLabel(path) {
  const dir = dirname(String(path ?? ""));
  const parent = basename(dir);
  return parent && parent !== "." && parent !== "/" ? parent : "";
}

/* ─────────────────────────── 图片采集 ─────────────────────────── */

function reportNewCollector(taskId) {
  const seen = new Set();
  const list = [];
  const skipped = [];
  // 约定：证据目录按任务分桶（artifacts/#6/、task-6/）。扫描父目录时别把别的任务的图
  // 当成这个任务的验收证据——那比没图更误导人。
  const foreignTaskOf = (path) => {
    const match = /(?:^|\/)(?:#|task-)(\d+)(?:\/|$)/.exec(path);
    return match === null ? null : Number(match[1]);
  };

  const addFile = (path, source) => {
    if (list.length >= REPORT_MAX_CANDIDATES) return;
    const mime = reportMimeOf(path);
    if (mime === null) return;
    let stat;
    try { stat = lstatSync(path); } catch { return; }
    // 不跟随符号链接：避免把 worktree 外的图片/内容带进验收报告。
    if (stat.isSymbolicLink() || !stat.isFile()) return;
    const real = (() => { try { return resolve(path); } catch { return null; } })();
    if (real === null || seen.has(real)) return;
    const foreignId = foreignTaskOf(real);
    if (foreignId !== null && Number.isFinite(Number(taskId)) && foreignId !== Number(taskId)) return;
    seen.add(real);
    if (stat.size <= 0) return;
    if (stat.size > REPORT_MAX_IMAGE_BYTES) {
      skipped.push({ name: basename(path), reason: `超过 ${reportBytesText(REPORT_MAX_IMAGE_BYTES)}` });
      return;
    }
    list.push({ path: real, name: basename(path), source, mime, size: stat.size, dir: dirname(real) });
  };

  const addDir = (dir, source, options = {}) => {
    try { if (lstatSync(dir).isSymbolicLink()) return; } catch { return; }
    const maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : REPORT_DIR_DEPTH;
    const minMtime = Number.isFinite(options.minMtime) ? options.minMtime : 0;
    const stack = [{ dir: resolve(dir), depth: 0 }];
    let visited = 0;
    while (stack.length > 0 && visited < REPORT_WALK_FILE_LIMIT) {
      const current = stack.pop();
      let entries;
      try { entries = readdirSync(current.dir, { withFileTypes: true }); }
      catch { continue; }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        visited += 1;
        if (visited > REPORT_WALK_FILE_LIMIT) break;
        if (entry.name.startsWith(".")) continue;
        const abs = join(current.dir, entry.name);
        if (entry.isDirectory()) {
          if (REPORT_SKIP_DIR_NAMES.has(entry.name)) continue;
          if (current.depth < maxDepth) stack.push({ dir: abs, depth: current.depth + 1 });
          continue;
        }
        if (!entry.isFile()) continue;
        if (reportMimeOf(entry.name) === null) continue;
        if (minMtime > 0) {
          let stat;
          try { stat = statSync(abs); } catch { continue; }
          if (stat.mtimeMs < minMtime) continue;
        }
        addFile(abs, source);
      }
    }
  };

  return { addFile, addDir, list, skipped };
}

/** 从简报 / 最终报告 / 命令输出里挖出本机绝对路径：图片文件直接收，证据目录递归收。 */
function reportMinePaths(collector, corpus) {
  const text = corpus.filter((item) => typeof item === "string" && item !== "").join("\n");
  if (text === "") return;
  const tokenPattern = /(?:^|[\s"'(=`])(\/[^\s"'`()<>|;]+)/g;
  let match = null;
  let count = 0;
  while ((match = tokenPattern.exec(text)) !== null && count < 200) {
    count += 1;
    const token = String(match[1]).replace(/[.,:]+$/, "");
    if (reportMimeOf(token) !== null) {
      collector.addFile(token, "mentioned");
      continue;
    }
    if (!REPORT_EVIDENCE_DIR_WORDS.test(token)) continue;
    try {
      const stat = statSync(token);
      if (stat.isDirectory()) collector.addDir(token, "mentioned", { maxDepth: REPORT_MENTION_DEPTH });
      else if (stat.isFile() && reportMimeOf(token) !== null) collector.addFile(token, "mentioned");
    } catch { /* 路径不存在（worktree 已清理等）就跳过 */ }
  }
}

/** 收集任务的证据图片（返回候选，尚未筛选/读盘）。 */
function reportCollectCandidates(core, task, project, run) {
  const collector = reportNewCollector(task.id);

  // 1) 本次 worktree 里运行期间产出的截图
  if (task.worktreePath && existsSync(task.worktreePath)) {
    const startMs = run && run.startedAt ? Date.parse(run.startedAt) : Number.NaN;
    const minMtime = Number.isFinite(startMs) ? startMs - 120000 : 0;
    for (const dir of REPORT_WORKTREE_DIRS) {
      const abs = join(task.worktreePath, dir);
      try { if (existsSync(abs) && statSync(abs).isDirectory()) collector.addDir(abs, "worktree", { minMtime }); }
      catch { /* ignore */ }
    }
    // 2) diff 里的图片（即使不在 artifacts 目录下也是本次改动的一部分）
    for (const file of Array.isArray(run?.files) ? run.files : []) {
      const rel = typeof file === "string" ? file : file?.path;
      if (!rel) continue;
      const abs = join(task.worktreePath, String(rel));
      if (existsSync(abs)) collector.addFile(abs, "files");
    }
  }

  // 3) 会话文字里提到过的本机证据目录/图片（历史任务 worktree 已清理时的主要来源）
  const commandText = (Array.isArray(run?.commands) ? run.commands : [])
    .map((command) => `${command?.command ?? ""}\n${command?.tail ?? ""}`);
  const hostVerifyText = (Array.isArray(run?.hostVerify?.commands) ? run.hostVerify.commands : [])
    .map((command) => `${command?.command ?? ""}\n${command?.tail ?? ""}`);
  reportMinePaths(collector, [task.brief, run?.finalText, ...commandText, ...hostVerifyText]);

  // 4) 项目配置的证据目录（模板 {taskId}）
  const roots = Array.isArray(project?.evidenceRoots) ? project.evidenceRoots : [];
  for (const root of roots) {
    if (typeof root !== "string" || root.trim() === "") continue;
    const expanded = root
      .replaceAll("#{taskId}", String(task.id))
      .replaceAll("{taskId}", String(task.id))
      .replaceAll("{id}", String(task.id));
    const target = resolve(expanded);
    try {
      const stat = statSync(target);
      if (stat.isDirectory()) collector.addDir(target, "evidenceRoot", { maxDepth: REPORT_MENTION_DEPTH });
      else if (stat.isFile() && reportMimeOf(target) !== null) collector.addFile(target, "evidenceRoot");
    } catch { /* 目录不存在就跳过 */ }
  }

  // 5) 宿主归档只在「现场一个证据图都没有」时兜底：worktree 清理后重新生成报告用。
  //    有现场证据时不用归档，避免历史归档里的旧图（甚至别的任务的图）混进本次报告。
  const hasLiveEvidence = collector.list.some((candidate) => candidate.source !== "attachment");
  if (!hasLiveEvidence) {
    const archiveDir = join(core.evidenceDir, `task-${task.id}`, "report-images");
    try { if (existsSync(archiveDir)) collector.addDir(archiveDir, "archive", { maxDepth: 2 }); }
    catch { /* ignore */ }
  }

  // 6) 需求参考截图（输入侧的图，单独一节展示）
  for (const attachment of Array.isArray(task.attachments) ? task.attachments : []) {
    if (attachment && typeof attachment.path === "string") collector.addFile(attachment.path, "attachment");
  }

  const candidates = collector.list.slice();
  candidates.sort((a, b) => {
    const pa = REPORT_SOURCE_PRIORITY[a.source] ?? 9;
    const pb = REPORT_SOURCE_PRIORITY[b.source] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.path.localeCompare(b.path);
  });
  return { candidates, skipped: collector.skipped };
}

/** 读取候选、按内容去重并套用体积上限，返回 {images, attachments, skipped, warnings}。 */
function reportSelectImages(candidates, skipped) {
  const images = [];
  const attachments = [];
  const hashes = new Set();
  const notes = skipped.slice();
  let totalBytes = 0;
  for (const candidate of candidates) {
    if (images.length + attachments.length >= REPORT_MAX_IMAGES) {
      notes.push({ name: candidate.name, reason: `超过 ${REPORT_MAX_IMAGES} 张上限` });
      continue;
    }
    let bytes;
    try { bytes = readFileSync(candidate.path); }
    catch { notes.push({ name: candidate.name, reason: "读取失败" }); continue; }
    const hash = createHash("sha1").update(bytes).digest("hex");
    if (hashes.has(hash)) continue;
    hashes.add(hash);
    if (totalBytes + bytes.length > REPORT_MAX_TOTAL_BYTES) {
      notes.push({ name: candidate.name, reason: "超过报告内联总量上限" });
      continue;
    }
    totalBytes += bytes.length;
    const item = { ...candidate, bytes, hash };
    if (candidate.source === "attachment") attachments.push(item);
    else images.push(item);
  }
  return { images, attachments, skipped: notes, totalBytes };
}

/** 把选中的图落到宿主归档目录（原子替换），下次 worktree 清理后仍能生成同一份报告。 */
function reportArchiveImages(core, taskId, images) {
  const archiveDir = join(core.evidenceDir, `task-${taskId}`, "report-images");
  const stagingDir = `${archiveDir}.tmp-${process.pid}-${Date.now()}`;
  try {
    mkdirSync(stagingDir, { recursive: true });
    images.forEach((image, index) => {
      const ext = extname(image.name).toLowerCase();
      const safeBase = basename(image.name, extname(image.name)).replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 48) || "image";
      const fileName = `${String(index + 1).padStart(2, "0")}-${safeBase}${ext}`;
      writeFileSync(join(stagingDir, fileName), image.bytes);
      image.archivedAs = fileName;
    });
    mkdirSync(dirname(archiveDir), { recursive: true });
    rmSync(archiveDir, { recursive: true, force: true });
    renameSync(stagingDir, archiveDir);
  } catch (error) {
    try { rmSync(stagingDir, { recursive: true, force: true }); } catch { /* ignore */ }
    core.log("验收报告图片归档失败（报告仍可生成）", String(error));
  }
}

/* ─────────────────────────── 报告 HTML ─────────────────────────── */

const REPORT_CSS = `
:root {
  color-scheme: light;
  --ink: #16181d; --muted: #5c626d; --line: #e3e6eb; --soft: #f5f6f8;
  --brand: #2f6fed; --success: #16803c; --warn: #b45309; --danger: #c62828;
}
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 20px 64px; background: #eef0f3; color: var(--ink);
  font: 14px/1.65 -apple-system, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif; }
.report { max-width: 1020px; margin: 0 auto; background: #fff; border-radius: 14px;
  box-shadow: 0 8px 32px rgba(20, 24, 40, 0.09); padding: 36px 40px 44px; }
h1 { font-size: 24px; line-height: 1.35; margin: 0 0 6px; }
h2 { font-size: 17px; margin: 34px 0 12px; padding-top: 18px; border-top: 1px solid var(--line); }
h2:first-of-type { border-top: none; padding-top: 0; }
h3 { font-size: 15px; margin: 20px 0 8px; }
h4 { font-size: 14px; margin: 16px 0 6px; }
p { margin: 8px 0; }
a { color: var(--brand); }
a:hover { text-decoration: none; }
.muted { color: var(--muted); }
.small { font-size: 12px; }
.mono { font-family: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace; font-size: 12.5px; }
.kicker { font-size: 12px; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
.headline { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; }
.badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px;
  padding: 2px 9px; font-size: 12px; line-height: 1.7; border: 1px solid transparent; }
.badge--success { color: var(--success); background: #e9f7ee; border-color: #bfe6cc; }
.badge--warn { color: var(--warn); background: #fff6e8; border-color: #f3d9b0; }
.badge--danger { color: var(--danger); background: #fdeceb; border-color: #f3c2c0; }
.badge--muted { color: var(--muted); background: var(--soft); border-color: var(--line); }
.badge--info { color: var(--brand); background: #edf3ff; border-color: #cbdcff; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; margin: 18px 0 6px; }
.kv { border: 1px solid var(--line); border-radius: 10px; background: #fbfcfd; padding: 9px 12px; }
.kv dt { font-size: 11.5px; color: var(--muted); margin: 0 0 2px; }
.kv dd { margin: 0; font-size: 13px; word-break: break-all; }
.alert { border-radius: 10px; padding: 12px 14px; margin: 16px 0; border: 1px solid; font-size: 13px; }
.alert--danger { color: var(--danger); background: #fdf1f0; border-color: #f0c7c4; }
.alert--info { color: #1d4ed8; background: #f0f6ff; border-color: #cadcff; }
.alert strong { font-weight: 600; }
ul, ol { margin: 8px 0; padding-left: 22px; }
li { margin: 4px 0; }
table { width: 100%; border-collapse: collapse; margin: 10px 0 4px; font-size: 12.5px; }
th, td { border: 1px solid var(--line); padding: 6px 9px; text-align: left; vertical-align: top; }
th { background: #f6f7f9; font-weight: 600; color: #424852; }
tr:nth-child(even) td { background: #fcfcfd; }
.checks { list-style: none; padding-left: 0; }
.checks li { position: relative; padding-left: 22px; }
.checks li::before { content: "☐"; position: absolute; left: 2px; color: var(--muted); }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; margin: 12px 0 4px; }
figure.shot { margin: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #fff; }
figure.shot img { display: block; width: 100%; height: auto; background: #f2f4f7; }
figure.shot figcaption { padding: 8px 10px 10px; font-size: 12px; color: var(--muted); }
figure.shot figcaption strong { display: block; color: var(--ink); font-size: 12.5px; font-weight: 600;
  overflow-wrap: anywhere; }
figure.shot figcaption span { display: block; margin-top: 2px; }
figure.shot.single { grid-column: 1 / -1; }
pre.report-code { background: #f6f7f9; border: 1px solid var(--line); border-radius: 8px;
  padding: 10px 12px; overflow-x: auto; font-size: 12px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
details { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; margin: 6px 0; }
details summary { cursor: pointer; color: var(--muted); font-size: 12px; }
details[open] summary { margin-bottom: 6px; }
.footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11.5px; }
.footer p { margin: 3px 0; }
.warn-text { color: var(--danger); }
@media print {
  body { background: #fff; padding: 0; }
  .report { box-shadow: none; border-radius: 0; padding: 16px 6px; max-width: none; }
  h2 { break-after: avoid; }
  figure.shot { break-inside: avoid; }
  details { border: none; padding: 0; }
  details[open] summary { margin-bottom: 4px; }
}
`;

function reportRenderImagesSection(images, title, description) {
  if (images.length === 0) return "";
  const figures = images.map((image, index) => {
    const dataUri = `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`;
    const sourceTail = reportFileListLabel(image.path);
    const meta = [REPORT_SOURCE_LABELS[image.source] ?? image.source, sourceTail, reportBytesText(image.size)]
      .filter((part) => part && part !== "").join(" · ");
    return [
      `<figure class="shot${images.length === 1 ? " single" : ""}">`,
      `<img src="${dataUri}" alt="${reportEscape(image.name)}" loading="lazy">`,
      `<figcaption><strong>${reportEscape(image.name)}</strong><span>${reportEscape(meta)}</span></figcaption>`,
      `</figure>`,
    ].join("");
  }).join("\n");
  return [
    `<h2>${reportEscape(title)}${reportBadge(`${images.length} 张`, "info")}</h2>`,
    description ? `<p class="muted small">${reportEscape(description)}</p>` : "",
    `<div class="gallery">${figures}</div>`,
  ].filter(Boolean).join("\n");
}

function reportRenderSelfTest(selfTest, options = {}) {
  const level = Number.isInteger(options.level) ? options.level : 2;
  const title = String(options.title ?? "自测命令");
  const heading = (badges) => `<h${level}>${reportEscape(title)}${badges ?? ""}</h${level}>`;
  const commands = Array.isArray(selfTest?.commands) ? selfTest.commands : [];
  const total = Number(selfTest?.total ?? commands.length ?? 0);
  const passed = Number(selfTest?.passed ?? 0);
  if (total === 0 && commands.length === 0) {
    return `${heading()}<p class="alert alert--info">没有可归集的自测命令记录（会话里没有识别到自测命令，或证据未收集）。</p>`;
  }
  const allPassed = passed === total && total > 0;
  const tone = allPassed ? "success" : "danger";
  const head = heading(reportBadge(`selfTest ${passed}/${total}`, tone));
  const body = commands.map((command) => {
    const exit = command?.exitCode;
    const ok = command?.ok !== false && exit === 0;
    const tail = String(command?.tail ?? "").trim();
    return [
      `<tr><td class="mono">${reportEscape(command?.command ?? "—")}</td>`,
      `<td>${reportBadge(String(exit ?? "?"), ok ? "success" : "danger")}</td>`,
      `<td>${tail ? `<details><summary>输出尾部（${tail.length} 字符）</summary><pre class="report-code">${reportEscape(tail)}</pre></details>` : "—"}</td></tr>`,
    ].join("");
  }).join("\n");
  return `${head}<table><thead><tr><th style="width:40%">命令</th><th style="width:70px">退出码</th><th>输出</th></tr></thead><tbody>${body}</tbody></table>`;
}

/** 队友子会话小节：任务主会话当 Team Lead 时开的 teammate，命令/输出各自成表。 */
function reportRenderTeammates(teammates) {
  const list = Array.isArray(teammates) ? teammates : [];
  if (list.length === 0) return "";
  const totals = list.reduce((acc, mate) => ({
    total: acc.total + Number(mate?.selfTest?.total ?? 0),
    passed: acc.passed + Number(mate?.selfTest?.passed ?? 0),
  }), { total: 0, passed: 0 });
  const blocks = list.map((mate) => {
    const meta = [mate?.sessionId, mate?.description].filter((part) => typeof part === "string" && part !== "").join(" · ");
    const tone = totals.total > 0 && totals.passed === totals.total ? "success" : "warn";
    return [
      `<section class="teammate">`,
      `<h3>${reportEscape(mate?.name ?? "teammate")}${reportBadge(mate?.depth > 1 ? `嵌套 ${mate.depth} 层` : "teammate", "info")}${Number(mate?.selfTest?.total ?? 0) > 0 ? reportBadge(`自测 ${mate.selfTest.passed}/${mate.selfTest.total}`, tone) : ""}</h3>`,
      meta ? `<p class="muted small mono">${reportEscape(meta)}</p>` : "",
      reportRenderSelfTest(mate?.selfTest, { level: 4, title: "该队友的自测命令" }),
      mate?.finalText
        ? `<details><summary>该队友的最终报告（${mate.finalText.length} 字符）</summary><pre class="report-code">${reportEscape(mate.finalText)}</pre></details>`
        : "",
      `</section>`,
    ].join("\n");
  }).join("\n");
  return [
    `<h2>队友子会话（Agent Teams）${reportBadge(`${list.length} 个`, "info")}${totals.total > 0 ? reportBadge(`队友自测 ${totals.passed}/${totals.total}`, totals.passed === totals.total ? "success" : "danger") : ""}</h2>`,
    `<p class="muted small">任务主会话这次当 Team Lead，用 spawn_teammate 开了以下 teammate；下面的命令/输出来自 teammate 子会话，不属于主会话 selfTest 证据。</p>`,
    blocks,
  ].join("\n");
}

function reportRenderChanges(task, run) {
  const acceptance = task.acceptance && typeof task.acceptance === "object" ? task.acceptance : null;
  const files = Array.isArray(acceptance?.files) && acceptance.files.length > 0
    ? acceptance.files
    : (Array.isArray(run?.files) ? run.files : []);
  const diffStat = acceptance?.diffStat || run?.diffStat || "—";
  const filesChanged = acceptance?.filesChanged ?? run?.filesChanged ?? files.length;
  if (files.length === 0) {
    return `<h2>本次改动</h2><p class="alert alert--info">没有可列出的改动文件（改动可能都在工程台内部文件里，或验收时是空提交）。</p>`;
  }
  const shown = files.slice(0, 80);
  const rows = shown.map((file) => {
    const path = typeof file === "string" ? file : String(file?.path ?? "");
    const additions = typeof file === "object" ? file?.additions : null;
    const deletions = typeof file === "object" ? file?.deletions : null;
    const stat = additions === null || additions === undefined ? "—" : `+${additions} / -${deletions ?? 0}`;
    return `<tr><td class="mono">${reportEscape(path)}</td><td>${reportEscape(stat)}</td></tr>`;
  }).join("\n");
  const more = files.length > shown.length ? `<p class="muted small">另有 ${files.length - shown.length} 个文件未列出。</p>` : "";
  return [
    `<h2>本次改动${reportBadge(diffStat, "muted")}${reportBadge(`${filesChanged} 个文件`, "muted")}</h2>`,
    acceptance ? `<p class="muted small">数据来自验收提交 ${reportEscape(String(acceptance.commit ?? "").slice(0, 10) || "—")}（squash 后相对 base）。</p>` : `<p class="muted small">数据来自最近一次运行（worktree diff）。</p>`,
    `<table><thead><tr><th>文件</th><th style="width:140px">增删行</th></tr></thead><tbody>${rows}</tbody></table>`,
    more,
  ].filter(Boolean).join("\n");
}

function reportRenderRuns(runs) {
  if (runs.length === 0) return `<h2>运行记录</h2><p class="alert alert--info">还没有运行记录。</p>`;
  const rows = runs.map((run) => {
    const selfTest = run.selfTest ?? {};
    const outcome = run.endedAt ? (run.outcome === "failed" ? "失败" : "完成") : "运行中";
    const outcomeTone = run.endedAt ? (run.outcome === "failed" ? "danger" : "success") : "warn";
    return [
      `<tr><td class="mono">${reportEscape(run.id)}</td>`,
      `<td>${reportEscape(reportStamp(run.startedAt))}</td>`,
      `<td>${reportBadge(outcome, outcomeTone)}</td>`,
      `<td>${Number(selfTest.total ?? 0) > 0 ? reportEscape(`${selfTest.passed ?? 0}/${selfTest.total}`) : "—"}</td>`,
      `<td class="mono">${reportEscape(run.diffStat || "—")}</td>`,
      `<td>${reportEscape(run.reason ?? "—")}</td></tr>`,
    ].join("");
  }).join("\n");
  return [
    `<h2>运行记录${reportBadge(`${runs.length} 次`, "muted")}</h2>`,
    `<table><thead><tr><th>run</th><th>开始时间</th><th>结果</th><th>自测</th><th>diff</th><th>结束原因</th></tr></thead><tbody>${rows}</tbody></table>`,
  ].join("\n");
}

function reportRenderDrift(run) {
  const drift = run?.drift;
  if (!drift || typeof drift !== "object") return "";
  const changed = Boolean(drift.mainRepoChanged);
  const before = drift.snapshotAtDispatch?.head ?? "—";
  const after = drift.snapshotAtEnd?.head ?? "—";
  const dirty = Boolean(drift.statusDirty);
  return [
    `<h2>主仓漂移检测${reportBadge(changed || dirty ? "需要留意" : "无漂移", changed || dirty ? "warn" : "success")}</h2>`,
    `<p class="muted small">${changed ? "任务运行期间主仓 HEAD 变过（可能是其它任务合入或人工操作）；验收时以任务分支相对 base 的 diff 为准。" : "任务运行期间主仓 HEAD 未变。"}${dirty ? " 结束时主仓工作区有未提交改动。" : ""}</p>`,
    `<p class="small mono">dispatch HEAD ${reportEscape(String(before).slice(0, 12))} → end HEAD ${reportEscape(String(after).slice(0, 12))}</p>`,
  ].join("\n");
}

function reportRenderBatch(batch) {
  if (!batch) return "";
  const commands = Array.isArray(batch.commands) ? batch.commands : [];
  const rows = commands.map((command) => {
    const tail = String(command?.tail ?? "").trim();
    const ok = command?.exitCode === 0;
    return [
      `<tr><td class="mono">${reportEscape(command?.command ?? "—")}</td>`,
      `<td>${reportBadge(String(command?.exitCode ?? "?"), ok ? "success" : "danger")}</td>`,
      `<td>${tail ? `<details><summary>日志尾部（${tail.length} 字符）</summary><pre class="report-code">${reportEscape(tail)}</pre></details>` : "—"}</td></tr>`,
    ].join("");
  }).join("\n");
  const tone = batch.status === "merged" ? "success" : batch.status === "failed" ? "danger" : "warn";
  return [
    `<h2>集成批次${reportBadge(String(batch.status ?? "—"), tone)}${reportBadge(reportEscape(batch.id), "muted")}</h2>`,
    `<div class="grid">`,
    `<div class="kv"><dt>测试分支</dt><dd class="mono">${reportEscape(batch.testBranch ?? "—")}</dd></div>`,
    `<div class="kv"><dt>base 前 SHA</dt><dd class="mono">${reportEscape(String(batch.baseShaBefore ?? "—").slice(0, 12))}</dd></div>`,
    `<div class="kv"><dt>备份 ref</dt><dd class="mono">${reportEscape(batch.backupRef ?? "—")}</dd></div>`,
    batch.mergedSha ? `<div class="kv"><dt>合入后 SHA</dt><dd class="mono">${reportEscape(String(batch.mergedSha).slice(0, 12))}</dd></div>` : "",
    batch.verdict ? `<div class="kv"><dt>判定</dt><dd>${reportEscape(batch.verdict)}</dd></div>` : "",
    `</div>`,
    commands.length > 0
      ? `<table><thead><tr><th style="width:40%">集成测试命令</th><th style="width:70px">退出码</th><th>输出</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<p class="alert alert--info">这个批次没有记录集成测试命令输出。</p>`,
  ].filter(Boolean).join("\n");
}

function reportRenderAcceptance(task, runs) {
  const acceptance = task.acceptance && typeof task.acceptance === "object" ? task.acceptance : null;
  if (!acceptance) {
    return `<h2>验收与集成</h2><p class="alert alert--info">任务还没验收（当前状态：${reportEscape(REPORT_STATUS_TEXT[task.status] ?? task.status)}）。</p>`;
  }
  return [
    `<h2>验收记录${reportBadge(acceptance.acceptedBy === "operator" ? "人工验收" : "工程台/lead 验收", "info")}</h2>`,
    `<div class="grid">`,
    `<div class="kv"><dt>验收时间</dt><dd>${reportEscape(reportStamp(acceptance.acceptedAt))}</dd></div>`,
    `<div class="kv"><dt>验收提交</dt><dd class="mono">${reportEscape(acceptance.commit ?? "—")}</dd></div>`,
    `<div class="kv"><dt>提交 diff</dt><dd>${reportEscape(acceptance.diffStat ?? "—")}</dd></div>`,
    `<div class="kv"><dt>改动文件</dt><dd>${reportEscape(String(acceptance.filesChanged ?? (acceptance.files ?? []).length))} 个</dd></div>`,
    acceptance.skipped ? `<div class="kv"><dt>空提交</dt><dd>是（验收时工作树没有改动）</dd></div>` : "",
    `</div>`,
  ].filter(Boolean).join("\n");
}

function reportRenderFinalText(run) {
  const text = String(run?.finalText ?? "").trim();
  if (text === "") return `<h2>会话最终报告</h2><p class="alert alert--info">没有归集到会话最终报告。</p>`;
  return `<h2>会话最终报告</h2><div class="final-text">${reportMarkdown(text)}</div>`;
}

function reportRenderSummaryGrid(task, project, run, teammates) {
  const acceptance = task.acceptance ?? {};
  const selfTest = run?.selfTest ?? {};
  const rows = [
    ["任务", `#${task.id} · ${REPORT_STATUS_TEXT[task.status] ?? task.status}`],
    ["项目", project?.name ?? task.projectId],
    ["分支", task.branch ?? "—"],
    ["类型 / 工作量", `${task.type ?? "—"} / ${task.size ?? "—"}`],
    ["任务模型", run?.workerModel ? `${run.workerModel.provider}/${run.workerModel.model}${run.workerModel.reasoningEffort ? `@${run.workerModel.reasoningEffort}` : ""}` : "—"],
    ["自测结果", Number(selfTest.total ?? 0) > 0 ? `${selfTest.passed ?? 0}/${selfTest.total} 通过` : "无记录"],
    ["改动统计", acceptance.diffStat || run?.diffStat || "—"],
    ["验收提交", acceptance.commit ? String(acceptance.commit).slice(0, 10) : "未验收"],
    ["运行次数", String((run ? 1 : 0) + (Number(task.runCount ?? 0) > 0 ? Number(task.runCount) - 1 : 0))],
    ["队友子会话", (() => {
      const list = Array.isArray(teammates) ? teammates : [];
      if (list.length === 0) return "—";
      const totals = list.reduce((acc, mate) => ({
        total: acc.total + Number(mate?.selfTest?.total ?? 0),
        passed: acc.passed + Number(mate?.selfTest?.passed ?? 0),
      }), { total: 0, passed: 0 });
      return `${list.length} 个（队友自测 ${totals.passed}/${totals.total}）`;
    })()],
  ];
  return `<div class="grid">${rows.map(([label, value]) => (
    `<div class="kv"><dt>${reportEscape(label)}</dt><dd>${reportEscape(value)}</dd></div>`
  )).join("")}</div>`;
}

function reportHtml(core, task, project, run, runs, batch, imageSelection, teammates) {
  const statusText = REPORT_STATUS_TEXT[task.status] ?? task.status;
  const images = imageSelection.images;
  const attachments = imageSelection.attachments;
  const totalImages = images.length + attachments.length;
  const warnings = [];
  if (images.length === 0) {
    warnings.push(
      `<div class="alert alert--danger"><strong>没有采集到验收截图。</strong>本报告目前只有文字证据，不足以判断界面/成片类交付是否达标。`
      + ` 让任务会话把关键结果截图放到 worktree 的 <code>artifacts/</code> 下（或给项目配置 <code>evidenceRoots</code>），然后重新点「验收报告」。</div>`,
    );
  }
  if (imageSelection.skipped.length > 0) {
    warnings.push(`<p class="muted small">有 ${imageSelection.skipped.length} 张图片因体积/数量上限未内联：${reportEscape(imageSelection.skipped.slice(0, 6).map((item) => `${item.name}（${item.reason}）`).join("；"))}</p>`);
  }
  const title = `验收报告 · 任务 #${task.id} ${task.title ?? ""}`.trim();
  const acceptanceBadge = task.status === "merged" ? reportBadge("已合并", "success")
    : task.status === "accepted" ? reportBadge("已验收", "success")
      : task.status === "verifying" ? reportBadge("验收中", "warn")
        : task.status === "needs_review" ? reportBadge("待验收", "warn")
          : reportBadge(statusText, reportStatusTone(task.status));
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${reportEscape(title)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<main class="report">
<div class="kicker">工程台 · 验收报告 · v${REPORT_VERSION}</div>
<div class="headline"><h1>${reportEscape(task.title ?? `任务 #${task.id}`)}</h1></div>
<div class="badges">${reportBadge(`任务 #${task.id}`, "info")}${acceptanceBadge}${reportBadge(project?.name ?? task.projectId, "muted")}${reportBadge(`${totalImages} 张图`, totalImages > 0 ? "info" : "danger")}</div>
<p class="muted small">生成时间 ${reportEscape(reportStamp(new Date().toISOString()))} · 单文件离线报告，图片已内联；需要 PDF 时用浏览器打印。</p>
${warnings.join("\n")}
${reportRenderSummaryGrid(task, project, run, teammates)}
${reportRenderImagesSection(images, "证据截图", "以下图片由宿主从任务证据中自动采集并内联（工作区产物 / 命令输出里的证据目录 / 项目证据目录 / 宿主归档）。")}
${reportRenderImagesSection(attachments, "需求参考截图", "需求方在新建任务时附的参考图，用于核对交付是否偏离需求。")}
<h2>验收标准 DoD</h2>
${Array.isArray(task.dod) && task.dod.length > 0
    ? `<ul class="checks">${task.dod.map((item) => `<li>${reportInline(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("")}</ul>`
    : `<p class="alert alert--info">任务没有写 DoD。</p>`}
${reportRenderSelfTest(run?.selfTest)}
${reportRenderTeammates(teammates)}
${reportRenderChanges(task, run)}
${reportRenderFinalText(run)}
${reportRenderRuns(runs)}
${reportRenderDrift(run)}
${reportRenderAcceptance(task, runs)}
${reportRenderBatch(batch)}
<div class="footer">
<p>数据来源：任务会话证据归集（命令/退出码/输出尾部/最终报告/diff/漂移）+ 宿主采集的截图。报告由工程台宿主自动生成，未经人工改写。</p>
<p>生成器：dsh-project-console v${reportEscape(REPORT_VERSION)} · 任务 ${reportEscape(task.id)} · run ${reportEscape(run?.id ?? "—")} · 图片 ${totalImages} 张（${reportBytesText(imageSelection.totalBytes)}）</p>
</div>
</main>
</body>
</html>`;
}

/* ─────────────────────────── 对外入口 ─────────────────────────── */

function reportFileNameOf(task) {
  const raw = `验收报告-任务${task.id}-${task.title ?? ""}`;
  const safe = raw.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
  return `${safe || `验收报告-任务${task.id}`}.html`;
}

/** 只有验收完成（accepted / merged）的任务才开放下载：报告代表已验收的提交，未验收时证据还会变。 */
const REPORT_DOWNLOADABLE_STATUSES = new Set(["accepted", "merged"]);

async function reportBuildNow(core, taskId) {
  const task = findTask(core, Number(taskId));
  if (!task) return { ok: false, code: "not-found", error: `任务不存在：#${taskId}` };
  if (!REPORT_DOWNLOADABLE_STATUSES.has(task.status)) {
    return {
      ok: false,
      code: "not-accepted",
      error: `任务还没验收通过（当前状态：${task.status}），验收报告在验收完成后才可下载`,
    };
  }
  const project = findProject(core, task.projectId);
  const runs = core.state.runs.filter((run) => run.taskId === task.id);
  const run = runs.length > 0 ? runs[runs.length - 1] : null;
  const batches = core.state.batches.filter((batch) => Array.isArray(batch.taskIds) && batch.taskIds.includes(task.id));
  const batch = batches.length > 0 ? batches[batches.length - 1] : null;

  const { candidates, skipped } = reportCollectCandidates(core, task, project, run);
  const imageSelection = reportSelectImages(candidates, skipped);
  reportArchiveImages(core, task.id, imageSelection.images);
  const teammates = await teammateEvidenceForReport(core, run);
  const teammateSelfTest = teammates.reduce((acc, mate) => ({
    total: acc.total + Number(mate?.selfTest?.total ?? 0),
    passed: acc.passed + Number(mate?.selfTest?.passed ?? 0),
  }), { total: 0, passed: 0 });

  const html = reportHtml(core, task, project ?? null, run, runs, batch, imageSelection, teammates);
  const bytes = Buffer.from(html, "utf8");
  const reportsDir = join(core.stateDir, "reports");
  mkdirSync(reportsDir, { recursive: true });
  const filePath = join(reportsDir, `task-${task.id}.html`);
  const staging = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(staging, bytes);
  renameSync(staging, filePath);

  const sourceCounts = {};
  for (const image of imageSelection.images) {
    const label = REPORT_SOURCE_LABELS[image.source] ?? image.source;
    sourceCounts[label] = (sourceCounts[label] ?? 0) + 1;
  }
  const report = {
    taskId: task.id,
    title: task.title ?? "",
    status: task.status,
    runId: run?.id ?? null,
    generatedAt: new Date().toISOString(),
    fileName: reportFileNameOf(task),
    fileSize: bytes.length,
    fileSizeText: reportBytesText(bytes.length),
    imageCount: imageSelection.images.length + imageSelection.attachments.length,
    evidenceImageCount: imageSelection.images.length,
    attachmentCount: imageSelection.attachments.length,
    imageBytes: imageSelection.totalBytes,
    imageBytesText: reportBytesText(imageSelection.totalBytes),
    imageSources: sourceCounts,
    skipped: imageSelection.skipped.slice(0, 20),
    names: imageSelection.images.slice(0, 30).map((image) => image.name),
    teammateCount: teammates.length,
    teammateNames: teammates.map((mate) => mate.name),
    teammateSelfTest,
  };
  core.log(`验收报告 #${task.id} 生成：${report.fileName} ${report.fileSizeText} 图片 ${report.imageCount} 张`);
  return { ok: true, report, filePath };
}

/**
 * 生成（覆盖）一个任务的验收报告，返回 {ok, report, filePath}。
 * 同一进程内串行生成，避免两次点击同时替换同一个文件。
 */
async function buildAcceptanceReport(core, taskId) {
  const previous = core.reportTail ?? Promise.resolve();
  const job = previous.catch(() => {}).then(() => reportBuildNow(core, taskId));
  core.reportTail = job.catch(() => {});
  return job;
}

/** 报告文件路径（不重新生成），供下载路由使用。 */
function reportPathOf(core, taskId) {
  return join(core.stateDir, "reports", `task-${Number(taskId)}.html`);
}

/** 读取报告文件；不存在返回 null。 */
function readReportFile(core, taskId) {
  const file = reportPathOf(core, taskId);
  if (!existsSync(file)) return null;
  try {
    const bytes = readFileSync(file);
    return { bytes, size: bytes.length, file };
  } catch {
    return null;
  }
}
// ───────────────────────────── http.js ─────────────────────────────
/**
 * 工程台 host 半边 · HTTP 路由（/project-console-api）。
 *
 * host webserver 不做鉴权（API.md §2.7），所有写请求强制自定义头 x-project-console: 1
 * 作为 CSRF 挡板；同源页面正常带；跨源简单请求带不了这个头。
 */




const ROUTE_PREFIX = "/project-console-api";

const MAX_BODY = 12 * 1024 * 1024; // 需求截图上传用（单张 ≤8MB，base64 膨胀后 ~11MB）

function send(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on("data", (c) => {
      if (tooLarge) return; // 已拒绝：继续流掉剩余数据，别再往内存里堆。
      size += c.length;
      if (size > MAX_BODY) {
        tooLarge = true;
        chunks.length = 0;
        // 不能 req.destroy()：socket 一断，上层就发不出 413，客户端只能看到 ECONNRESET。
        reject(Object.assign(new Error("请求体过大"), { status: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (tooLarge) return;
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.trim() === "") { resolvePromise({}); return; }
      try { resolvePromise(JSON.parse(raw)); }
      catch (error) { reject(Object.assign(new Error("请求体不是合法 JSON"), { status: 400 })); }
    });
    req.on("error", (error) => { if (!tooLarge) reject(error); });
  });
}

function methodOf(req) { return (req.method ?? "GET").toUpperCase(); }

function createHandler(core) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url ?? "/", "http://internal");
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] !== "project-console-api") return send(res, 404, { ok: false, error: "not found" });
      if (methodOf(req) !== "GET" && req.headers["x-project-console"] !== "1") {
        return send(res, 403, { ok: false, error: "missing x-project-console header" });
      }
      await ensureState(core);
      const action = parts.slice(1).join("/");
      const q = Object.fromEntries(url.searchParams);
      const route = ROUTES[action];
      if (!route) return send(res, 404, { ok: false, error: `unknown action ${action}` });
      const parsed = methodOf(req) === "GET" ? {} : await readBody(req);
      // 请求体必须是 JSON 对象：`null` / 数组 / 裸字符串走到路由里会变成
      // “Cannot read properties of null”，直接 500。这里统一挡在路由之前。
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return send(res, 400, { ok: false, code: "bad-body", error: "请求体必须是 JSON 对象" });
      }
      const body = parsed;
      const result = await route(core, body, q, req, res);
      if (result === null) return; // route 自己完成了响应（如 /file 图片流）
      const status = result?.httpStatus ?? 200;
      const payload = result ?? { ok: true };
      if (payload.ok === false) {
        // 失败响应统一落到 4xx：只认 code 的话，少数没写 code 的失败会以 200 返回，
        // 让按 HTTP 状态判断的调用方（脚本/集成）误以为成功。
        const httpStatus = { "not-found": 404, "no-project": 404, "no-tasks": 409, "not-accepted": 409, slots: 409, deps: 409, conflict: 409, drift: 409, stale: 409, busy: 409, state: 409, dirty: 409, "wrong-branch": 409 }[payload.code] ?? 400;
        return send(res, payload.httpStatus ?? httpStatus, payload);
      }
      return send(res, status, payload);
    } catch (error) {
      const status = error && error.status ? error.status : 500;
      core.log("route error", String(error?.stack ?? error));
      send(res, status, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function ok(value) { return Object.assign({ ok: true }, value); }
function fail(code, error) { return { ok: false, code, error }; }

const ROUTES = {
  ping: async (core) => ok({
    plugin: "project-console",
    pid: process.pid,
    origin: safeOrigin(core),
    now: nowIso(),
    stateDir: core.stateDir,
  }),

  status: async (core) => {
    const services = {};
    for (const name of ["webServer", "sessionController", "sessions", "workspaceRegistry",
      "permissionPresets", "sessionQuery", "tools", "storageDomain", "shell", "approval"]) {
      services[name] = svc(core, name) !== undefined;
    }
    const counts = {
      projects: core.state.projects.length,
      tasks: core.state.tasks.length,
      active: core.state.tasks.filter((t) => ["provisioning", "running", "verifying"].includes(t.status)).length,
      review: core.state.tasks.filter((t) => ["needs_review", "failed"].includes(t.status)).length,
      questions: core.state.questions.filter((qq) => qq.status === "open").length,
    };
    return ok({ plugin: "project-console", version: "0.2.10", services, counts, context: await contextStatusOf(core), now: nowIso() });
  },

  state: async (core) => {
    await sampleDisk(core);
    return { ...stateView(core), sessions: sessionsView(core) };
  },

  // 模型目录：设置页里给「低/中/高工作量」选模型用。llm 服务不可用时返回空目录，
  // 前端退化成手填 provider/model。
  models: async (core) => ok(await modelCatalog(core)),

  task: async (core, _body, q) => {
    const task = findTask(core, q.id);
    if (!task) return fail("not-found", "任务不存在");
    const events = q.events === "0" ? [] : await taskEvents(core, task, 60);
    return ok({ task: taskView(core, task), run: lastRunOf(core, task.id) ?? null, events });
  },

  "task/log": async (core, _body, q) => {
    const task = findTask(core, q.id);
    if (!task) return fail("not-found", "任务不存在");
    const events = await taskEvents(core, task, Number(q.limit ?? 200));
    return ok({ taskId: task.id, sessionId: task.sessionId ?? null, events });
  },

  "project/add": async (core, body) => addProject(core, body),
  "project/update": async (core, body) => updateProject(core, body.projectId, body.patch ?? {}),
  "project/archive": async (core, body) => {
    const project = findProject(core, body.projectId);
    if (!project) return fail("not-found", "项目不存在");
    project.archivedAt = nowIso();
    saveNow(core);
    return ok({ project: projectView(core, project) });
  },
  "project/delete": async (core, body) => deleteProject(core, body.projectId),

  "task/add": async (core, body) => addTask(core, body),
  "task/update": async (core, body) => updateTask(core, body.taskId, body.patch ?? {}),
  "task/estimate": async (core, body) => reestimateTask(core, body.taskId),
  "task/dispatch": async (core, body) => {
    const r = await dispatchTask(core, body.taskId, { manual: true });
    return r;
  },
  "task/rework": async (core, body) => reworkTask(core, body.taskId, body.feedback),
  "task/accept": async (core, body) => acceptTask(core, body.taskId, { by: body.by ?? "operator" }),
  "task/abandon": async (core, body) => abandonTask(core, body.taskId, body.reason, body.category),
  "task/resume": async (core, body) => resumeTask(core, body.taskId),
  "task/review": async (core, body) => (body.mode === "reviewer"
    ? requestReview(core, body.taskId, { force: body.force === true })
    : requestLeadReview(core, body.taskId, { force: body.force === true })),
  "task/diagnose": async (core, body) => diagnoseTask(core, body.taskId, body.question),
  "task/deep-review": async (core, body) => requestDeepReview(core, body.taskId, { doubt: body.doubt }),
  "task/delete": async (core, body) => deleteTask(core, body.taskId),
  upload: async (core, body) => uploadAttachment(core, body),
  "task/ask": async (core, body) => askQuestion(core, body),
  "task/prompt": async (core, body) => promptTask(core, body.taskId, body.text),
  "task/collect": async (core, body) => recollectEvidence(core, body.taskId),

  // 可下载验收报告：GET /report?task=6 生成并返回元数据；GET /report/file?task=6 返回
  // 单文件 HTML（图片已内联）。?inline=1 时用 inline disposition，方便浏览器直接预览。
  report: async (core, _body, q) => {
    const built = await buildAcceptanceReport(core, Number(q.task));
    return built.ok ? ok({ report: built.report }) : built;
  },
  "report/file": async (core, _body, q, req, res) => {
    const built = await buildAcceptanceReport(core, Number(q.task));
    if (!built.ok) return built;
    const file = readReportFile(core, built.report.taskId);
    if (!file) return { httpStatus: 404, ok: false, error: "报告文件不存在" };
    const fallbackName = `acceptance-report-task-${built.report.taskId}.html`;
    const disposition = q.inline === "1" ? "inline" : "attachment";
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-length": String(file.size),
      "content-disposition": `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(built.report.fileName)}`,
      "cache-control": "no-store",
    });
    res.end(file.bytes);
    return null;
  },
  "task/cancel": async (core, body) => cancelTask(core, body.taskId, body.reason),
  "session/cancel": async (core, body) => cancelSession(core, body.sessionId, body.reason),

  "question/answer": async (core, body) => answerQuestion(core, body.questionId, body.answer, { dispatch: body.dispatch }),

  "batch/integrate": async (core, body) => integrate(core, body.projectId, body.taskIds),
  "batch/ff": async (core, body) => ffBatch(core, body.batchId, body.confirm),
  "batch/revert": async (core, body) => revertBatch(core, body.batchId),
  batch: async (core, _body, q) => {
    const batch = core.state.batches.find((b) => b.id === q.id);
    if (!batch) return fail("not-found", "批次不存在");
    return ok({ batch, tasks: core.state.tasks.filter((t) => batch.taskIds.includes(t.id)).map((t) => taskView(core, t)) });
  },

  "lead/create": async (core, body) => ensureLead(core, body),
  "lead/prompt": async (core, body) => promptLead(core, body.text),
  "lead/rotate": async (core, _body, q) => rotateLead(core, { keep: q.keep === undefined ? undefined : Number(q.keep) }),
  context: async (core) => ok(await contextStatusOf(core)),
  "lead/transcript": async (core, _body, q) => leadTranscript(core, Number(q.limit ?? 200)),
  "task/transcript": async (core, _body, q) => taskTranscript(core, Number(q.taskId), { runId: q.runId, limit: Number(q.limit ?? 200) }),
  "session/transcript": async (core, _body, q) => transcriptOf(core, String(q.sessionId ?? ""), Number(q.limit ?? 200)),
  "session/archive": async (core, body) => archiveSessionById(core, body.sessionId),
  lead: async (core) => ok({
    sessionId: core.state.lead.sessionId,
    createdAt: core.state.lead.createdAt,
    lastPromptAt: core.state.lead.lastPromptAt,
    status: core.state.settings.leadStatus ?? "unknown",
  }),

  "verify/run": async (core, body) => {
    const task = findTask(core, body.taskId);
    if (!task) return fail("not-found", "任务不存在");
    const project = findProject(core, task.projectId);
    if (!project) return fail("not-found", "项目不存在");
    if (!task.worktreePath) return fail("no-worktree", "任务没有 worktree");
    const results = [];
    for (const command of project.verify?.commands ?? []) {
      const r = await runShell(command, { cwd: task.worktreePath, timeoutMs: 900000 });
      results.push({ command, exitCode: r.exitCode, ok: r.ok, tail: r.tail, ms: r.ms });
      if (!r.ok) break;
    }
    const runRecord = lastRunOf(core, task.id);
    if (runRecord) {
      runRecord.hostVerify = { at: nowIso(), commands: results };
      saveNow(core);
    }
    return ok({ commands: results, allOk: results.every((r) => r.ok) });
  },

  "settings/update": async (core, body) => {
    const patch = body ?? {};
    if (patch.autoDispatch !== undefined) core.state.settings.autoDispatch = Boolean(patch.autoDispatch);
    if (patch.globalSlotBudget !== undefined) {
      core.state.settings.globalSlotBudget = Math.max(1, Math.min(16, Math.round(Number(patch.globalSlotBudget) || 8)));
    }
    if (patch.clarifyFirst !== undefined) core.state.settings.clarifyFirst = Boolean(patch.clarifyFirst);
    if (patch.reviewMode !== undefined) {
      const mode = String(patch.reviewMode);
      if (["reviewer", "lead", "off"].includes(mode)) core.state.settings.reviewMode = mode;
    }
    if (patch.reviewerModel !== undefined) core.state.settings.reviewerModel = normalizeModelSelection(patch.reviewerModel);
    if (patch.leadCtxLimitTokens !== undefined) {
      core.state.settings.leadCtxLimitTokens = Math.max(10000, Math.min(2000000, Number(patch.leadCtxLimitTokens) || 100000));
    }
    if (patch.leadKeepMessages !== undefined) {
      core.state.settings.leadKeepMessages = Math.max(0, Math.min(40, Number(patch.leadKeepMessages) || 10));
    }
    if (patch.toolOutputLimitBytes !== undefined) {
      core.state.settings.toolOutputLimitBytes = Math.max(512, Math.min(65536, Number(patch.toolOutputLimitBytes) || 6144));
    }
    if (patch.estimatorRotateEvery !== undefined) {
      core.state.settings.estimatorRotateEvery = Math.max(1, Math.min(500, Number(patch.estimatorRotateEvery) || 20));
    }
    if (patch.hostVerifyOnAccept !== undefined) core.state.settings.hostVerifyOnAccept = true;
    if (patch.hostVerifyOnNeedInfo !== undefined) core.state.settings.hostVerifyOnNeedInfo = true;
    if (patch.hostVerifyTimeoutMs !== undefined) {
      core.state.settings.hostVerifyTimeoutMs = Math.max(10000, Math.min(600000, Number(patch.hostVerifyTimeoutMs) || 120000));
    }
    if (patch.deepReview !== undefined) core.state.settings.deepReview = true;
    if (patch.deepReviewTimeoutMs !== undefined) {
      core.state.settings.deepReviewTimeoutMs = Math.max(20000, Math.min(600000, Number(patch.deepReviewTimeoutMs) || 150000));
    }
    if (patch.reviewImages !== undefined) core.state.settings.reviewImages = true;
    if (patch.reviewImageMax !== undefined) {
      core.state.settings.reviewImageMax = Math.max(1, Math.min(8, Number(patch.reviewImageMax) || 3));
    }
    if (patch.maxReworkRounds !== undefined) {
      core.state.settings.maxReworkRounds = Math.max(1, Math.min(20, Number(patch.maxReworkRounds) || 5));
    }
    if (patch.workloadModels !== undefined) {
      core.state.settings.workloadModels = normalizeWorkloadModels(patch.workloadModels);
    }
    let workbench = null;
    if (patch.workbenchModel !== undefined) {
      const before = normalizeModelSelection(core.state.settings.workbenchModel);
      const after = normalizeModelSelection(patch.workbenchModel);
      core.state.settings.workbenchModel = after;
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        // 评估会话缓存了创建时的模型，换模型后作废，下次判工作量按新模型重建。
        core.estimatorSessionId = null;
        workbench = await applyWorkbenchModel(core);
      }
    }
    core.state.version += 1;
    saveNow(core);
    return ok({
      settings: {
        autoDispatch: core.state.settings.autoDispatch,
        globalSlotBudget: core.state.settings.globalSlotBudget,
        clarifyFirst: core.state.settings.clarifyFirst,
        workloadModels: normalizeWorkloadModels(core.state.settings.workloadModels),
        workbenchModel: workbenchModelOf(core),
        reviewMode: core.state.settings.reviewMode,
        reviewerModel: normalizeModelSelection(core.state.settings.reviewerModel),
        leadCtxLimitTokens: core.state.settings.leadCtxLimitTokens,
        leadKeepMessages: core.state.settings.leadKeepMessages,
        toolOutputLimitBytes: core.state.settings.toolOutputLimitBytes,
        estimatorRotateEvery: core.state.settings.estimatorRotateEvery,
        hostVerifyOnAccept: core.state.settings.hostVerifyOnAccept,
        hostVerifyOnNeedInfo: core.state.settings.hostVerifyOnNeedInfo,
        hostVerifyTimeoutMs: core.state.settings.hostVerifyTimeoutMs,
        deepReview: core.state.settings.deepReview,
        deepReviewTimeoutMs: core.state.settings.deepReviewTimeoutMs,
        reviewImages: core.state.settings.reviewImages,
        reviewImageMax: core.state.settings.reviewImageMax,
        maxReworkRounds: core.state.settings.maxReworkRounds,
      },
      ...(workbench === null ? {} : { workbench }),
    });
  },

  tick: async (core) => {
    await tick(core);
    return ok({ now: nowIso(), queued: core.state.tasks.filter((t) => t.status === "queued").length });
  },

  // 清理左侧栏里的工程台历史会话：把所有 cwd 属于工程台工作区/数据目录的任务会话归档（隐藏），
  // lead 会话保留可见。只归档非运行中的会话；运行中的跳过。
  "admin/cleanup-sessions": async (core, body) => {
    const stopActive = body?.stopActive === true;
    const reg = svc(core, "workspaceRegistry");
    if (!reg || typeof reg.archiveSession !== "function") return fail("no-service", "workspaceRegistry.archiveSession 不可用");
    const sq = svc(core, "sessionQuery");
    const leadId = core.state.lead.sessionId;
    const already = new Set(reg.archivedSessionIds ?? []);
    const roots = [
      join(core.stateDir, "worktrees"),
      ...core.state.projects.map((p) => p.worktreeRoot),
    ].filter(Boolean);
    const isProjectConsoleCwd = (cwd) => typeof cwd === "string" && roots.some((r) => cwd === r || cwd.startsWith(r + "/") || cwd.startsWith(r));
    let headers = [];
    if (sq && typeof sq.listSessions === "function") {
      try { headers = await sq.listSessions(); } catch (error) { core.log("listSessions 失败", String(error)); }
    }
    const candidates = [];
    for (const h of headers) {
      const header = h?.header ?? h ?? {};
      const id = header.id ?? header.sessionId;
      if (!id || id === leadId) continue;
      if (already.has(id)) continue;
      // 队友（origin=subagent）本来就不在侧栏显示，不用归档；只处理历史上以根会话建的工程台会话。
      if (header.origin === "subagent") continue;
      const cwd = header.cwd;
      if (cwd === undefined || !isProjectConsoleCwd(cwd)) continue;
      candidates.push({ id, cwd });
    }
    const archived = [];
    const skipped = [];
    for (const item of candidates) {
      try {
        await reg.archiveSession(item.id, stopActive ? { stopActivity: true } : {});
        archived.push(item);
      } catch (error) {
        skipped.push({ sessionId: item.id, reason: String(error?.message ?? error) });
      }
    }
    return ok({ archived, skipped, totalCandidates: candidates.length, headerCount: headers.length });
  },

  file: async (core, _body, q, req, res) => {
    const file = readAttachmentFile(core, q.path);
    if (!file) return { httpStatus: 404, ok: false, error: "file not found" };
    res.writeHead(200, {
      "content-type": file.mime,
      "content-length": String(file.size),
      "cache-control": "private, max-age=300",
    });
    res.end(file.bytes);
    return null; // 已经在 route 里直接回写
  },

  "admin/host": async (core) => ok({
    cwd: process.cwd(),
    home: core.home,
    stateDir: core.stateDir,
    version: process.versions.node,
    pid: process.pid,
    node: process.execPath,
  }),

  "admin/recompose": async (core) => {
    // 触发热重载：改 profile cordis.patch.yml 的尾部注释内容（HMR 监听配置变化，
    // 并会替换已链接包目标文件变化的插件模块）。仅调试用。
    try {
      const patchFile = join(core.home, "profiles", "desktop", "cordis.patch.yml");
      const fs = await import("node:fs/promises");
      let text = await fs.readFile(patchFile, "utf8");
      const lines = text.split("\n");
      const marker = "# dsh-project-console reload @";
      const idx = lines.findIndex((l) => l.startsWith(marker));
      const line = `${marker} ${nowIso()}`;
      if (idx >= 0) lines[idx] = line; else lines.push(line, "");
      await fs.writeFile(patchFile, lines.join("\n"), "utf8");
      return ok({ touched: true, file: patchFile });
    } catch (error) {
      return fail("recompose-failed", String(error));
    }
  },
};

function safeOrigin(core) {
  try {
    const ws = svc(core, "webServer");
    return ws && typeof ws.getOrigin === "function" ? ws.getOrigin() : undefined;
  } catch { return undefined; }
}
// ───────────────────────────── tools.js ─────────────────────────────
/**
 * 工程台 host 半边 · 模型工具（给 lead super agent 用）。
 *
 * 关键事实（API.md §2.9）：第三方 host 代码**不能** import @deepseek-ai/dsh-tools
 * （实机 /selftest 已证伪 R1），所以不能 defineTool；这里注册普通对象 definition，
 * 参数/输出用标准 JSON Schema（ToolsService.register 只校验 output 形态与 JSON Schema 合法性）。
 *
 * 权限：写工具只允许工程台 lead 会话调用（exec.agent.session.id === state.lead.sessionId）；
 * 读工具对任何会话开放。worker 会话即使看到工具也拿不到写权限。
 */


function textOutput() {
  return {
    schema: { type: "string" },
    render: (_args, value) => [{ type: "text", text: String(value) }],
  };
}

function tool(name, description, parameters, execute) {
  return {
    name,
    description,
    parameters,
    output: textOutput(),
    async execute(args, exec) {
      const value = await execute(args ?? {}, exec);
      return typeof value === "string" ? value : String(value);
    },
  };
}

/** 写工具前置：只认工程台 lead 会话。 */
function requireLead(core, exec) {
  const leadId = core.state?.lead?.sessionId;
  const sessionId = exec?.agent?.session?.id;
  if (!leadId) return "被拒绝：工程台 lead 会话还没创建（先由宿主 POST /lead/create）。";
  if (sessionId !== leadId) return "被拒绝：该工具只有工程台 lead 会话可以调用。";
  return null;
}

function projectIdArg(core, raw) {
  if (raw) return String(raw);
  const projects = core.state.projects;
  return projects.length === 1 ? projects[0].id : null;
}

/* ───────────────────── 只读工具的路径边界 ───────────────────── */

function realOrNull(path) {
  try { return realpathSync(path); } catch { return null; }
}

function insideRoot(real, root) {
  if (!real || !root) return false;
  return real === root || real.startsWith(root + sep);
}

/**
 * 只读工具允许读哪些根：
 * - lead：所有项目仓库/worktree、工程台数据目录、uploads；
 * - worker：只允许自己的 worktree；
 * - 其它会话：工程台数据目录。
 * 这样 lead 能查项目与证据，worker 不能顺手读宿主凭据/别人的 worktree。
 */
function readRootsFor(core, exec) {
  const roots = new Set();
  const add = (path) => { const real = path ? realOrNull(path) : null; if (real) roots.add(real); };
  const sessionId = exec?.agent?.session?.id ?? null;
  const state = core.state ?? {};
  const isLead = Boolean(sessionId && state.lead?.sessionId === sessionId);
  const ownTask = sessionId ? (state.tasks ?? []).find((t) => t.sessionId === sessionId) : null;
  if (isLead) {
    add(core.stateDir);
    add(join(core.stateDir, "uploads"));
    for (const project of state.projects ?? []) {
      add(project.repoPath);
      add(project.worktreeRoot);
    }
    for (const task of state.tasks ?? []) add(task.worktreePath);
  } else if (ownTask?.worktreePath) {
    add(ownTask.worktreePath);
  } else {
    add(core.stateDir);
  }
  return [...roots];
}

/** 解析路径并校验它（以及符号链接目标）落在允许的根内。 */
function resolveReadablePath(core, raw, exec) {
  const abs = resolve(String(raw ?? ""));
  const real = realOrNull(abs);
  if (!real) return { ok: false, error: `读不到：路径不存在或不可解析 ${abs}` };
  const roots = readRootsFor(core, exec);
  if (roots.length === 0) return { ok: false, error: "被拒绝：当前会话没有可读根目录" };
  if (!roots.some((root) => insideRoot(real, root))) {
    return { ok: false, error: `被拒绝：路径不在允许范围（项目/worktree/工程台数据目录）内：${abs}` };
  }
  return { ok: true, path: real };
}

const OBJ = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const STR = (description) => ({ type: "string", description });
const NUM = (description) => ({ type: "number", description });
const ARR = (description, items = { type: "string" }) => ({ type: "array", description, items });

/** 生成全部工具定义。 */
function toolDefinitions(core) {
  return [
    tool(
      "project_list",
      "列出工程台所有项目及其队列状态（待办/进行中/待验收/待澄清计数、槽位、最近批次）。回答「现在手上有什么」先调这个。",
      OBJ({}),
      async () => {
        const s = core.state;
        if (s.projects.length === 0) return "工程台还没有项目。请让操作者在顶栏「项目」里添加，或告诉我仓库路径与 base 分支。";
        const lines = s.projects.map((p) => {
          const v = projectView(core, p);
          const c = v.taskCounts;
          return `${p.id} ${p.name}  [${p.repoPath}] base=${p.baseBranch} 自主度=${p.autonomy}\n` +
            `  待办 ${c.todo} / 进行中 ${c.running} / 待验收 ${c.review} / 待澄清 ${c.questions} / 已归档 ${c.done}\n` +
            `  槽位 ${v.usedSlots}/${p.slotBudget}（全局 ${s.settings.globalSlotBudget}） 磁盘 ${p.diskUsedGB ?? 0}GB/${p.diskBudgetGB}GB`;
        });
        const recent = s.batches.slice(-3).map((b) => `${b.id} ${b.status} tasks=${b.taskIds.map((id) => "#" + id).join(",")}`);
        return [`工程台项目（${s.projects.length} 个）：`, ...lines, "", `最近集成批次：${recent.length ? recent.join("；") : "无"}`].join("\n");
      },
    ),

    tool(
      "project_status",
      "看全局或单个项目的状态：先给状态计数，再按优先级列最多 N 个任务（默认 25）。需要单任务细节用 project_task。",
      OBJ({ project_id: STR("可选，项目 id；省略看全局"), limit: NUM("可选，最多返回多少条任务，默认 25，上限 100") }),
      async (args) => {
        const s = core.state;
        const tasks = args.project_id ? s.tasks.filter((t) => t.projectId === args.project_id) : s.tasks;
        if (tasks.length === 0) return "没有任务。";
        const limit = Math.max(1, Math.min(100, Number(args.limit) || 25));
        const priority = { verifying: 0, needs_review: 1, failed: 2, needs_input: 3, running: 4, provisioning: 5, queued: 6, inbox: 7, accepted: 8, merged: 9, abandoned: 10 };
        const sorted = [...tasks].sort((a, b) => (priority[a.status] ?? 50) - (priority[b.status] ?? 50) || b.id - a.id);
        const counts = {};
        for (const t of tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
        const rows = sorted.slice(0, limit).map((t) => {
          const run = lastRunOf(core, t.id);
          const selfTest = run?.selfTest ? `自测 ${run.selfTest.passed}/${run.selfTest.total}${run.selfTest.failed ? ` 失败${run.selfTest.failed}` : ""}` : "无自测证据";
          const review = t.review?.verdict ? ` · 判定 ${t.review.verdict}` : "";
          return `#${t.id} [${t.status}] ${t.title} · ${t.size} · ${t.projectId} · ${t.branch ?? "无分支"} · ${selfTest}${review}`;
        });
        const head = `任务 ${tasks.length} 个：${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" ")}`;
        const tailLine = tasks.length > limit ? `…还有 ${tasks.length - limit} 个未列出（用 limit 或 project_task 查看）` : "";
        return [head, ...rows, ...(tailLine ? [tailLine] : [])].join("\n");
      },
    ),

    tool(
      "project_task",
      "读单个任务详情（需求、DoD、证据命令、diff、questions）。",
      OBJ({ task_id: NUM("任务 id") }, ["task_id"]),
      async (args) => {
        const task = findTask(core, args.task_id);
        if (!task) return `任务 #${args.task_id} 不存在`;
        const v = taskView(core, task);
        const lines = [
          `#${v.id} [${v.status}] ${v.title}（${v.type}/${v.size}，项目 ${v.projectId}）`,
          `分支：${v.branch ?? "-"}  worktree：${v.worktreePath ?? "-"}`,
          `会话：${v.sessionId ?? "-"}  runs：${v.runCount}`,
          `DoD：${v.dod.length ? "\n- " + v.dod.join("\n- ") : "（未写）"}`,
          `最近 run：${v.lastRun ? `${v.lastRun.id} ${v.lastRun.status} 自测 ${v.lastRun.selfTest.passed}/${v.lastRun.selfTest.total} diff ${v.lastRun.diffStat} ${v.lastRun.filesChanged}文件` : "无"}`,
        ];
        if (v.lastRun?.selfTest?.commands?.length) {
          lines.push("自测命令：");
          for (const c of v.lastRun.selfTest.commands.slice(-10)) lines.push(`  ${c.ok ? "✓" : "✗"} ${c.command} (exit ${c.exitCode ?? "?"})`);
        }
        if (v.questions.length) lines.push(`待澄清：${v.questions.map((q) => q.text).join(" / ")}`);
        return lines.join("\n");
      },
    ),

    tool(
      "project_task_log",
      "读任务会话最近事件（为什么失败/在干什么）。默认 20 条，每条截断；要完整结论用 project_diagnose。",
      OBJ({ task_id: NUM("任务 id"), limit: NUM("可选，条数，默认 20，上限 60") }, ["task_id"]),
      async (args) => {
        const task = findTask(core, args.task_id);
        if (!task) return `任务 #${args.task_id} 不存在`;
        const limit = Math.max(1, Math.min(60, Number(args.limit) || 20));
        const events = await taskEvents(core, task, limit);
        if (events.length === 0) return "没有可读事件（会话可能还没开始或已被清理）。";
        return events.map((e) => `${e.seq} [${e.type}] ${String(e.summary ?? "").slice(0, 180)}`).join("\n");
      },
    ),

    tool(
      "project_read",
      "读文本文件（只读，按行返回，输出封顶 6KB）。大文件/仓库级调查用 project_diagnose。",
      OBJ({
        path: STR("文件绝对路径"),
        offset: NUM("可选，起始行，默认 1"),
        limit: NUM("可选，最多返回行数，默认 400，上限 2000"),
      }, ["path"]),
      async (args, exec) => {
        const checked = resolveReadablePath(core, args.path, exec);
        if (!checked.ok) return checked.error;
        const file = checked.path;
        try {
          const st = statSync(file);
          if (!st.isFile()) return `不是文件：${file}`;
          if (st.size > 4 * 1024 * 1024) return `文件过大（${st.size} 字节），请用 project_diagnose 调查`;
          const lines = readFileSync(file, "utf8").split("\n");
          const offset = Math.max(1, Number(args.offset) || 1);
          const limit = Math.max(1, Math.min(2000, Number(args.limit) || 400));
          const slice = lines.slice(offset - 1, offset - 1 + limit);
          const body = slice.map((line, index) => `${offset + index}\t${line}`).join("\n");
          const remain = lines.length - (offset - 1 + slice.length);
          return remain > 0 ? `${body}\n…（共 ${lines.length} 行，已显示到 ${offset - 1 + slice.length}）` : body;
        } catch (error) {
          return `读失败：${String(error?.message ?? error)}`;
        }
      },
    ),

    tool(
      "project_search",
      "在文件/目录里搜内容（只读，输出封顶）。path 用绝对路径，默认工程台数据目录；找不到就换目录或用 project_diagnose。",
      OBJ({
        pattern: STR("正则或关键字"),
        path: STR("可选，目录或文件绝对路径"),
        include: STR("可选，文件名 glob，如 *.ts"),
      }, ["pattern"]),
      async (args, exec) => {
        const checked = resolveReadablePath(core, args.path ?? core.stateDir, exec);
        if (!checked.ok) return checked.error;
        const target = checked.path;
        const pattern = String(args.pattern ?? "");
        if (pattern === "") return "pattern 不能为空";
        let re;
        try { re = new RegExp(pattern, "i"); } catch { re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); }
        const include = String(args.include ?? "").trim();
        const includeRe = include === "" ? null : new RegExp(`^${include.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
        const matches = [];
        const MAX = 60;
        const searchFile = (file) => {
          if (matches.length >= MAX) return;
          if (includeRe && !includeRe.test(file.split("/").pop())) return;
          try {
            // 不跟随符号链接：避免把仓库外文件内容带进只读搜索结果。
            const st = lstatSync(file);
            if (st.isSymbolicLink() || !st.isFile() || st.size > 4 * 1024 * 1024) return;
            const text = readFileSync(file, "utf8");
            if (text.includes("\u0000")) return;
            const lines = text.split("\n");
            for (let i = 0; i < lines.length && matches.length < MAX; i += 1) {
              if (re.test(lines[i])) matches.push(`${file}:${i + 1}:${lines[i].trim().slice(0, 240)}`);
            }
          } catch { /* skip unreadable */ }
        };
        const walk = (dir, depth) => {
          if (matches.length >= MAX || depth > 8) return;
          let entries;
          try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
          for (const entry of entries) {
            if (matches.length >= MAX) return;
            if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "build") continue;
            if (entry.isSymbolicLink()) continue;
            const full = join(dir, entry.name);
            if (entry.isDirectory()) walk(full, depth + 1);
            else if (entry.isFile()) searchFile(full);
          }
        };
        try {
          const st = statSync(target);
          if (st.isDirectory()) walk(target, 0);
          else searchFile(target);
        } catch (error) {
          return `搜不了 ${target}：${String(error?.message ?? error)}`;
        }
        if (matches.length === 0) return `（无匹配：${pattern} @ ${target}）`;
        return matches.join("\n") + (matches.length >= MAX ? `\n…（只显示前 ${MAX} 条）` : "");
      },
    ),

    tool(
      "project_brief",
      "看当前看板简报（≤1.5KB）：项目队列、待处理、最近判定、失败项。回答「现在什么状态」前先看它。",
      OBJ({}),
      async () => buildLeadBrief(core),
    ),

    tool(
      "project_diagnose",
      "让宿主开一个一次性只读调查会话，回答关于任务/仓库的具体问题（≤2KB 蒸馏结论）。回答「为什么失败 / 这段代码」时用它，不要自己读大文件或跑命令。",
      OBJ({ task_id: NUM("任务 id"), question: STR("要查清的问题，越具体越好") }, ["task_id", "question"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await diagnoseTask(core, Number(args.task_id), String(args.question ?? ""));
        return r.ok ? r.text : `诊断失败：${r.error}`;
      },
    ),

    tool(
      "project_add",
      "建任务（已在看板排队）。brief 写原始需求 + 关键约束；DoD 可先空着让任务会话自己写。工作量（size）由你按需求范围判断，不要反问操作者；不填则工程台自动判。",
      OBJ({
        project_id: STR("项目 id，如 p1"),
        title: STR("任务标题（一句话）"),
        brief: STR("需求原文 / 可执行简报"),
        type: STR("feature|fix|refactor|perf|chore|docs|test，默认 feature"),
        size: STR("工作量 xs|s|m|l|xl（由你判断），默认交给工程台 AI 评估"),
        priority: NUM("数字越小越先派发，默认 100"),
        touches: ARR("预计触及的路径前缀（用于并发冲突控制；同一项目里 touches 有重叠的任务不会同时派发）"),
        dod: ARR("验收标准草稿（可空）"),
      }, ["project_id", "title", "brief"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await addTask(core, {
          projectId: args.project_id, title: args.title, brief: args.brief,
          type: args.type, size: args.size, sizeSource: args.size ? "ai" : undefined,
          priority: args.priority, touches: args.touches, dod: args.dod,
        });
        return r.ok
          ? `已建任务 #${r.task.id}：${r.task.title}（${r.task.status}，工作量 ${r.task.workloadLabel ?? r.task.size}，槽位 ${r.task.slots}，派发模型 ${r.task.workerModel?.model ?? "部署默认"}）`
          : `建任务失败：${r.error}`;
      },
    ),

    tool(
      "project_update",
      "改任务规格（title/brief/dod/priority/size/touches）。size 是工作量 xs|s|m|l|xl，由 AI 判断，不要问操作者。",
      OBJ({
        task_id: NUM("任务 id"),
        patch: { type: "object", description: "要改的字段：title/brief/dod/priority/size/touches", additionalProperties: true },
      }, ["task_id", "patch"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await updateTask(core, args.task_id, args.patch ?? {});
        return r.ok ? `已更新 #${r.task.id}` : `更新失败：${r.error}`;
      },
    ),

    tool(
      "project_dispatch",
      "立即派发任务：建 worktree、开会话、发简报。受槽位与依赖限制。",
      OBJ({ task_id: NUM("任务 id") }, ["task_id"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await dispatchTask(core, args.task_id);
        return r.ok ? `已派发 #${r.task.id}，会话 ${r.sessionId}` : `派发失败（${r.code ?? "error"}）：${r.error}`;
      },
    ),

    tool(
      "project_rework",
      "打回任务并把意见 followup 回原会话返工。",
      OBJ({ task_id: NUM("任务 id"), feedback: STR("打回意见（具体、可执行）") }, ["task_id", "feedback"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await reworkTask(core, args.task_id, args.feedback);
        return r.ok ? `已打回 #${args.task_id}，会话继续返工` : `打回失败：${r.error}`;
      },
    ),

    tool(
      "project_accept",
      "验收通过任务（宿主 squash 成提交）。验收依据看 project_task 的自测证据。",
      OBJ({ task_id: NUM("任务 id") }, ["task_id"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await acceptTask(core, args.task_id, { by: "lead" });
        return r.ok ? `已验收 #${args.task_id}，commit ${r.acceptance.head}（${r.acceptance.diffStat}）` : `验收失败：${r.error}`;
      },
    ),

    tool(
      "project_abandon",
      "放弃任务（清 worktree/分支，patch 存档）。",
      OBJ({ task_id: NUM("任务 id"), reason: STR("放弃原因") }, ["task_id", "reason"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await abandonTask(core, args.task_id, args.reason);
        return r.ok ? `已放弃 #${args.task_id}` : `放弃失败：${r.error}`;
      },
    ),

    tool(
      "project_question",
      "需求不清晰/有歧义/需要用户决策时，把问题提到工程台看板（不阻塞你继续做其他任务）。会显示在「待澄清」区，用户回答后会转发给你和任务会话。",
      OBJ({
        text: STR("要问的问题（具体、带背景，别问能自己查到的）"),
        context: STR("可选：为什么问、你的初步判断"),
        options: ARR("可选：给出的候选选项"),
        task_id: NUM("可选：绑定任务 id；任务会进入待澄清状态"),
        project_id: STR("可选：项目 id"),
      }, ["text"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await askQuestion(core, { ...args, askedBy: "lead" });
        return r.ok ? `已提问 ${r.question.id}（看板「待澄清」区），用户回答后自动转发给你。` : `提问失败：${r.error}`;
      },
    ),

    tool(
      "project_challenge",
      "对需求做「真伪需求」判断并留痕：是伪需求/重复实现/收益不成比例/验收不可测时，写清判断、证据、建议（做/砍/降级/先澄清），并置为待澄清。不要为了干活而硬接伪需求。",
      OBJ({
        text: STR("需求原文或摘要"),
        verdict: STR("真需求|疑似伪需求|重复实现|验收不可测|收益不成比例"),
        evidence: STR("判断依据（现有实现/代码位置/数据/成本）"),
        recommendation: STR("建议：做 / 砍 / 降级 / 先澄清（写具体动作）"),
        task_id: NUM("可选：相关任务 id"),
        project_id: STR("可选：项目 id"),
      }, ["text", "verdict", "evidence", "recommendation"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const body = [
          `【需求体检】判定：${args.verdict}`,
          `依据：${args.evidence}`,
          `建议：${args.recommendation}`,
        ].join("\n");
        const r = await askQuestion(core, {
          text: `需求体检：${args.text}`,
          context: body,
          options: ["按建议执行", "坚持原需求", "先澄清"],
          taskId: args.task_id,
          projectId: args.project_id,
          askedBy: "lead",
        });
        if (!r.ok) return `记录失败：${r.error}`;
        return `${body}\n\n已记录为待澄清 ${r.question.id}：请操作者在看板确认（按建议执行/坚持原需求/先澄清）。`;
      },
    ),

    tool(
      "project_integrate",
      "对已验收任务发起集成批次：从 base 建测试分支+备份 ref、逐任务 squash、跑集成测试。推送到 main 需人工确认，你只能发起批次。",
      OBJ({ project_id: STR("项目 id"), task_ids: ARR("可选：指定任务 id 子集") }, ["project_id"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const r = await integrate(core, args.project_id, args.task_ids);
        if (!r.ok) return `集成失败：${r.error}`;
        const b = r.batch;
        return [
          `集成批次 ${b.id}：${b.status}（${b.verdict ?? ""}）`,
          `base 前 sha ${b.baseShaBefore}，备份 ${b.backupRef}`,
          ...b.commands.map((c) => `${c.ok ? "✓" : "✗"} ${c.command} (exit ${c.exitCode})`),
        ].join("\n");
      },
    ),

    tool(
      "project_set_budget",
      "调项目槽位预算（人类硬上限内）。",
      OBJ({ project_id: STR("项目 id"), slots: NUM("新的项目槽位预算（1-12）") }, ["project_id", "slots"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        const p = findProject(core, args.project_id);
        if (!p) return "项目不存在";
        p.slotBudget = Math.max(1, Math.min(12, Number(args.slots)));
        saveNow(core);
        return `项目 ${p.id} 槽位预算 → ${p.slotBudget}`;
      },
    ),

    tool(
      "project_throttle",
      "暂停/恢复自动派发。",
      OBJ({ pause: { type: "boolean", description: "true=暂停自动派发，false=恢复" } }, ["pause"]),
      async (args, exec) => {
        const denied = requireLead(core, exec);
        if (denied) return denied;
        core.state.settings.autoDispatch = !args.pause;
        saveNow(core);
        return args.pause ? "已暂停自动派发" : "已恢复自动派发";
      },
    ),

    tool(
      "project_lead_selfcheck",
      "工程台自检：项目数/任务状态分布/自身会话 id（回答状态前可先跑）。",
      OBJ({}),
      async (_args, exec) => {
        const s = core.state;
        const byStatus = {};
        for (const t of s.tasks) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
        return [
          `lead 会话：${s.lead.sessionId ?? "未创建"}`,
          `调用者会话：${exec?.agent?.session?.id ?? "未知"}`,
          `项目 ${s.projects.length} 个，任务 ${s.tasks.length} 个：${JSON.stringify(byStatus)}`,
          `槽位 ${s.tasks.filter((t) => ["provisioning", "running", "verifying"].includes(t.status)).reduce((a, t) => a + (t.slots ?? 2), 0)}/${s.settings.globalSlotBudget}`,
        ].join("\n");
      },
    ),
  ];
}

/** 在插件根 scope 注册全部工具。 */
function registerTools(core, ctx) {
  if (!ctx.tools || typeof ctx.tools.register !== "function") {
    core.log("tools 服务不可用，跳过模型工具注册");
    return () => {};
  }
  const disposers = [];
  const limit = Math.max(512, Math.min(65536, Number(core.state?.settings?.toolOutputLimitBytes) || 6144));
  for (const definition of toolDefinitions(core)) {
    // 工具输出统一按字节封顶：单条有上限，避免一次查询把上下文灌满。
    const capped = {
      ...definition,
      async execute(args, exec) {
        const value = await definition.execute(args, exec);
        const current = Math.max(512, Math.min(65536, Number(core.state?.settings?.toolOutputLimitBytes) || limit));
        return capBytes(typeof value === "string" ? value : String(value), current);
      },
    };
    try {
      disposers.push(ctx.tools.register(capped));
    } catch (error) {
      core.log(`工具注册失败 ${definition.name}`, String(error?.message ?? error));
    }
  }
  core.log(`已注册 ${disposers.length} 个工程台模型工具`);
  return () => { for (const d of disposers) { try { d(); } catch { /* ignore */ } } };
}
// ───────────────────────────── mount.js ─────────────────────────────
/**
 * 工程台 host 半边 · 装配层（打进 lib/engine.mjs 单文件 bundle）。
 *
 * 为什么单独 build：dsh-hmr 对已链接包的替换只可靠地替换「被 loader 直接 import 的入口模块」，
 * 入口静态 import 的兄弟模块改动不一定被逐出（实测：改 service.js 后 tick 一直跑旧代码）。
 * 因此 build-host.mjs 把 core/git/service/http/tools 打成一个 no-relative-import 的
 * lib/engine.mjs，thin entry（src/index.js）用 ?v=<mtime> 动态 import —— 改任何 host 逻辑
 * 后重新 build + 触发 profile 重组即可整包换新，无需重启桌面版。
 */
function mount(ctx) {
  const core = makeCore(ctx);
  core.log("工程台 host 半边启动", core.stateDir);

  // 状态先加载（异步，不阻塞注册；后续操作按需 await ensureState）。
  ensureState(core).then(
    async () => {
      core.log("状态就绪，项目数", core.state.projects.length, "任务数", core.state.tasks.length);
      try {
        await reclaimOrphanDispatches(core);
      } catch (error) {
        core.log("回收孤儿派发失败", String(error));
      }
    },
    (error) => core.log("状态加载失败", String(error)),
  );

  // ── HTTP 路由 ──────────────────────────────────────────────
  ctx.inject(["webServer"], (httpCtx) => {
    const handler = createHandler(core);
    httpCtx.effect(
      () => httpCtx.webServer.register({ kind: "prefix", path: ROUTE_PREFIX, handler }),
      "dsh-project-console: /project-console-api routes",
    );
    core.log("已注册路由", ROUTE_PREFIX);
  });

  core.log("apply: phase routes done");
  // ── 模型工具（lead super agent 用） ─────────────────────────
  try {
    ctx.inject(["tools"], (toolCtx) => {
      const dispose = registerTools(core, toolCtx);
      toolCtx.effect(() => dispose, "dsh-project-console: model tools");
    });
  } catch (error) {
    core.log("tools 注入失败（模型工具不可用）", String(error));
  }

  core.log("apply: phase tools done");
  // ── 内部 preset 不上架：工程台自己 resolve/mount，不进 DSH 的模式列表 ──
  hideInternalPresets(core);
  core.log("apply: phase preset-visibility done");
  // ── 会话事件观察：turn 结束 → 归集证据 ──────────────────────
  ctx.effect(() => {
    const off = ctx.on("session/event", (session, event) => {
      try {
        const sid = session?.id;
        if (sid) {
          const summary = summarizeEvent(event);
          if (summary) {
            if (!core.lastEvents) core.lastEvents = new Map();
            core.lastEvents.set(sid, summary);
            if (core.lastEvents.size > 400) {
              const first = core.lastEvents.keys().next().value;
              core.lastEvents.delete(first);
            }
          }
        }
        if (event?.type === "turn/end") {
          void handleTurnEnd(core, session, event).catch((error) => core.log("handleTurnEnd 失败", String(error)));
        } else if (event?.type === "agent/status" || event?.type === "turn/start") {
          const sessionId = session?.id;
          if (sessionId && core.state?.lead?.sessionId === sessionId) {
            core.state.settings.leadStatus = event.type === "turn/start" ? "running" : "idle";
          }
        }
      } catch (error) {
        core.log("session/event 处理失败", String(error));
      }
    });
    return () => { try { off?.(); } catch { /* ignore */ } };
  }, "dsh-project-console: evidence observer");

  core.log("apply: phase session-event done");
  // agent/status 的另一路（status: running/idle），用于 lead 状态显示。
  ctx.effect(() => {
    const off = ctx.on("agent/status", (payload) => {
      try {
        const sessionId = payload?.agent?.session?.id;
        if (!sessionId || !core.state) return;
        if (core.state.lead?.sessionId === sessionId) {
          core.state.settings.leadStatus = payload.status === "running" ? "running" : "idle";
        }
      } catch { /* ignore */ }
    });
    return () => { try { off?.(); } catch { /* ignore */ } };
  }, "dsh-project-console: agent status observer");

  core.log("apply: phase agent-status done");
  // ── 定时调度：队列泵 + 磁盘采样 ─────────────────────────────
  ctx.effect(() => {
    let busy = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      (async () => {
        try {
          await ensureState(core);
          await tick(core);
          await sampleDisk(core);
        } catch (error) {
          core.log("tick 失败", String(error));
        } finally {
          busy = false;
        }
      })();
    }, 5000);
    if (typeof timer.unref === "function") timer.unref();
    core.log("apply: scheduler tick installed");
    return () => clearInterval(timer);
  }, "dsh-project-console: scheduler tick");
  core.log("apply: phase timer done");
}

// loadState 保留导出便于调试/测试（避免打包器 tree-shake 提醒）。
const __internals = { ensureState, saveNow };

/** 工程台内部使用、不该作为「模式」暴露给用户的 preset。 */
const INTERNAL_PRESET_IDS = ["project-lead"];

/**
 * 把工程台内部 preset 从 Agent 预设 roster 里摘掉。
 *
 * 这版 DSH 的 preset 定义没有「隐藏」字段：注册了就会出现在设置卡片和新任务的模式选择器里。
 * lead 会话走的是 agentPresets.resolve() + mount()，不经过 remoteExportList（客户端拿 roster
 * 的唯一出口），所以只包住这个方法——preset 照常注册、解析、挂载，工程台行为不变。
 * 升级后 DSH 若改了方法名，过滤会静默失效（列表里重新出现 project-lead），不影响会话创建。
 */
function hideInternalPresets(core) {
  const presets = svc(core, "agentPresets");
  if (presets === undefined || typeof presets.remoteExportList !== "function") {
    core.log("preset roster 过滤跳过：agentPresets 不可用");
    return;
  }
  const proto = Object.getPrototypeOf(presets);
  const original = proto?.remoteExportList;
  if (typeof original !== "function") {
    core.log("preset roster 过滤跳过：remoteExportList 不存在");
    return;
  }
  if (original.__projectConsoleHidden === true) return;
  const filtered = async function (...args) {
    const roster = await original.apply(this, args);
    if (!roster || !Array.isArray(roster.presets)) return roster;
    return { ...roster, presets: roster.presets.filter((row) => !INTERNAL_PRESET_IDS.includes(row?.id)) };
  };
  Object.defineProperty(filtered, "__projectConsoleHidden", { value: true });
  proto.remoteExportList = filtered;
  // 按客户端拿 roster 的同一条路径读一次：日志里能看到实际可见的 preset id。
  Promise.resolve(presets.remoteExportList()).then(
    (roster) => core.log("preset roster 可见项:", (roster?.presets ?? []).map((row) => row.id).join(",") || "(空)"),
    (error) => core.log("读取 preset roster 失败", String(error?.message ?? error)),
  );
}

export { mount };
