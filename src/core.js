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
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, basename, dirname } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";

export const PLUGIN_ROOT_ROUTE = "/project-console-api";

/* ────────────────────────────── 路径 ────────────────────────────── */

export function dshHome() {
  return process.env.DSH_HOME && process.env.DSH_HOME.length > 0
    ? process.env.DSH_HOME
    : join(homedir(), ".dsh");
}

export function makeCore(ctx) {
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

export function safeJson(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function nowIso() { return new Date().toISOString(); }

export function hashOf(s) {
  return createHash("sha1").update(String(s)).digest("hex").slice(0, 12);
}

/* ────────────────────────────── 状态 ────────────────────────────── */

export function defaultState() {
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
export function normalizeLoadedState(raw) {
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
export async function ensureState(core) {
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
export function saveNow(core) {
  const state = core.state;
  if (state === null) return;
  state.updatedAt = nowIso();
  const tmp = core.stateFile + ".tmp-" + randomUUID().slice(0, 8);
  writeFileSync(tmp, JSON.stringify(state, null, 1), "utf8");
  renameSync(tmp, core.stateFile);
}

/** 去抖保存（UI 操作/状态投影用）。 */
export function scheduleSave(core, delay = 250) {
  if (core.saveTimer !== null) return;
  core.saveTimer = setTimeout(() => {
    core.saveTimer = null;
    try { saveNow(core); } catch (error) { core.log("保存失败", String(error)); }
  }, delay);
  if (typeof core.saveTimer.unref === "function") core.saveTimer.unref();
}

/** 修改状态并递增版本号。 */
export function mutate(core, fn) {
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

export function uuid() { return randomUUID(); }

export function slugify(text, maxLen = 40) {
  const base = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const ascii = base.replace(/[\u4e00-\u9fa5]/g, "");
  const cleaned = (ascii.length >= 4 ? ascii : base).replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (cleaned || "task").slice(0, maxLen);
}

export const SIZE_SLOTS = { xs: 1, s: 1, m: 2, l: 4, xl: 6 };

/* ────────────────────── 工作量档位（AI 判定 → 档位 → 模型） ────────────────────── */

/**
 * 工作量三档：低 / 中 / 高。任务 size（xs/s/m/l/xl）只影响槽位，
 * 档位决定派发时用哪个模型（settings.workloadModels）。
 */
export const WORKLOAD_TIERS = ["low", "medium", "high"];
export const WORKLOAD_TIER_LABELS = { low: "低", medium: "中", high: "高" };
/** size → 工作量档位；未知 size 按「中」处理（与 slotsOf 的兜底一致）。 */
export const SIZE_TIER = { xs: "low", s: "low", m: "medium", l: "high", xl: "high" };

export function workloadTierOfSize(size) {
  return SIZE_TIER[size] ?? "medium";
}

export function workloadTierLabel(size) {
  return WORKLOAD_TIER_LABELS[workloadTierOfSize(size)] ?? "中";
}

/** 工作量档位模型配置：{low:null|{provider,model,reasoningEffort}, medium:..., high:...}。 */
export function defaultWorkloadModels() {
  return { low: null, medium: null, high: null };
}

/** 单个模型选择：{provider, model, reasoningEffort?}；非法/缺省一律 null（= 部署默认）。 */
export function normalizeModelSelection(raw) {
  if (raw === null || raw === undefined || typeof raw !== "object") return null;
  const provider = typeof raw.provider === "string" ? raw.provider.trim() : "";
  const model = typeof raw.model === "string" ? raw.model.trim() : "";
  if (provider === "" || model === "") return null;
  const reasoningEffort = typeof raw.reasoningEffort === "string" ? raw.reasoningEffort.trim() : "";
  return { provider, model, ...(reasoningEffort === "" ? {} : { reasoningEffort }) };
}

/** 规整外部传入的档位模型配置：非法/缺省一律回落 null（= 跟随项目/部署默认）。 */
export function normalizeWorkloadModels(raw) {
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

export function slotsOf(task) {
  return task.slots ?? SIZE_SLOTS[task.size] ?? 2;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function tail(text, limit = 1400) {
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
export function capBytes(value, limit = 6144) {
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
export function runShell(command, options = {}) {
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
export function run(command, args, options = {}) {
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

export async function realpathSafe(p) {
  try { return realpathSync(resolve(p)); } catch { return resolve(p); }
}

export function readJsonFile(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; }
}

export function writeJsonFile(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${randomUUID().slice(0, 8)}`;
  writeFileSync(tmp, JSON.stringify(value, null, 1), "utf8");
  renameSync(tmp, file);
}
