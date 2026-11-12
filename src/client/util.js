/**
 * 工程台 client：常量与纯函数（无 React 依赖）。
 */

/** 左栏行 id / main 面板 key（必须一致）。 */
const PC_PANEL_ID = "project-console";

/** 同源 API 前缀（与 host 侧 ROUTE_PREFIX 一致）。 */
const PC_API_BASE = "/project-console-api";

/**
 * 任务状态元数据（CONTRACT.md §1 的 status 枚举）。
 * tone 决定徽标配色：idle=中性 / busy=蓝 / warn=琥珀 / danger=红 / success=绿 / muted=弱化。
 */
const PC_STATUS_META = {
  inbox: { label: "收件箱", tone: "idle" },
  queued: { label: "待办", tone: "idle" },
  provisioning: { label: "准备中", tone: "busy" },
  running: { label: "运行中", tone: "busy" },
  verifying: { label: "验收中", tone: "busy" },
  needs_review: { label: "验收中", tone: "warn" },
  failed: { label: "失败", tone: "danger" },
  needs_input: { label: "待澄清", tone: "warn" },
  accepted: { label: "已验收", tone: "success" },
  merged: { label: "已合并", tone: "success" },
  abandoned: { label: "已放弃", tone: "muted" },
};

/**
 * 看板四列定义（CONTRACT.md §3.4）。
 * needs_input 不在契约列出的状态里：它已经有 worktree/会话、只是等人工回答，
 * 归入「进行中」并在卡片上打「待澄清」徽标（偏差已记录在交付消息里）。
 */
const PC_COLUMN_DEFS = [
  {
    key: "todo",
    title: "待办",
    tone: "idle",
    statuses: ["inbox", "queued"],
    empty: "没有待派发的需求",
  },
  {
    key: "running",
    title: "进行中",
    tone: "busy",
    statuses: ["provisioning", "running", "needs_input"],
    empty: "没有运行中的任务",
  },
  {
    key: "review",
    title: "验收中",
    tone: "warn",
    statuses: ["verifying", "needs_review", "failed"],
    empty: "没有验收中的任务",
  },
  {
    key: "done",
    title: "已归档",
    tone: "success",
    statuses: ["accepted", "merged", "abandoned"],
    empty: "还没有归档任务",
  },
];

const PC_BATCH_STATUS_META = {
  running: { label: "运行中", tone: "busy" },
  passed: { label: "测试通过", tone: "success" },
  failed: { label: "测试失败", tone: "danger" },
  awaiting_confirmation: { label: "待人工确认", tone: "warn" },
  merged: { label: "已合并", tone: "success" },
  reverted: { label: "已回滚", tone: "muted" },
};

/** 任务类型的中文名（新需求表单用；契约只约定字符串值）。 */
const PC_TASK_TYPES = [
  ["feature", "新功能"],
  ["fix", "修复"],
  ["refactor", "重构"],
  ["perf", "性能"],
  ["chore", "杂项"],
  ["docs", "文档"],
  ["test", "测试"],
];

/* ───────────────────── 工作量（AI 判定，人只配置档位模型） ───────────────────── */

/** 工作量三档：低 / 中 / 高。 */
const PC_WORKLOAD_TIERS = [
  ["low", "低"],
  ["medium", "中"],
  ["high", "高"],
];

/** size（xs/s/m/l/xl）→ 工作量档位；未知按「中」。 */
const PC_SIZE_TIER = { xs: "low", s: "low", m: "medium", l: "high", xl: "high" };
const PC_SIZE_LABEL = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" };
/** 各档位覆盖的 size（设置页说明用）。 */
const PC_TIER_SIZE_HINT = { low: "xs / s", medium: "m", high: "l / xl" };

function pcWorkloadTier(size) {
  return PC_SIZE_TIER[size] ?? "medium";
}

function pcWorkloadLabel(size) {
  const tier = pcWorkloadTier(size);
  const found = PC_WORKLOAD_TIERS.find(([value]) => value === tier);
  return found ? found[1] : "中";
}

/** 工作量来源说明：AI 判定 / AI 评估失败暂定 / 旧数据。 */
function pcSizeSourceMeta(task) {
  const source = task && task.sizeSource;
  if (source === "fallback") {
    return {
      label: "",
      tone: "warn",
      title: `评估失败，暂按「${pcWorkloadLabel(task.size)}」派发${task.estimateError ? `：${task.estimateError}` : ""}。可在任务详情里重估。`,
    };
  }
  return { label: "", tone: "", title: "" };
}

/** 卡片/详情上的工作量标签文案（AI 判定会带出来源，方便区分是不是人设过）。 */
function pcWorkloadChipText(task) {
  return `工作量 ${pcWorkloadLabel(task && task.size)}`;
}

/** 任务的派发模型：实际跑过的 run 记录 → 档位配置 → 项目 workerModel → （空 = 部署默认）。 */
function pcTaskWorkerModel(state, task, lastRun) {
  const runModel = lastRun && lastRun.workerModel;
  if (runModel && runModel.model) {
    return {
      provider: runModel.provider || "",
      model: runModel.model,
      reasoningEffort: runModel.reasoningEffort || "",
      source: "run",
    };
  }
  const tier = pcWorkloadTier(task && task.size);
  const configured = state && state.settings && state.settings.workloadModels ? state.settings.workloadModels[tier] : null;
  if (configured && configured.provider && configured.model) {
    return {
      provider: configured.provider,
      model: configured.model,
      reasoningEffort: configured.reasoningEffort || "",
      source: "workload",
    };
  }
  const project = pcProjectById((state && state.projects) ?? [], task && task.projectId);
  if (project && project.workerModel && project.workerModel.model) {
    return {
      provider: project.workerModel.provider || "",
      model: project.workerModel.model,
      reasoningEffort: project.workerModel.reasoningEffort || "",
      source: "project",
    };
  }
  return { provider: "", model: "", reasoningEffort: "", source: "default" };
}

/** "mtcode/deepseek-flash · max"；没配置返回 "部署默认"。 */
function pcWorkerModelText(model) {
  if (!model || !model.model) return "部署默认";
  const route = model.provider ? `${model.provider}/${model.model}` : model.model;
  return model.reasoningEffort ? `${route} · ${model.reasoningEffort}` : route;
}

/** 单个模型选择 → 设置页草稿 {key, effort}；key = "provider::model"。 */
function pcModelDraftOf(config) {
  if (!config || !config.provider || !config.model) return { key: "", effort: "" };
  return { key: `${config.provider}::${config.model}`, effort: config.reasoningEffort || "" };
}

/** 设置页草稿 {key, effort} → host 模型选择 {provider, model, reasoningEffort?}；空 = null。 */
function pcModelPayloadOf(draft) {
  const item = draft || {};
  if (!item.key) return null;
  const sep = item.key.indexOf("::");
  if (sep < 0) return null;
  const provider = item.key.slice(0, sep);
  const model = item.key.slice(sep + 2);
  if (!provider || !model) return null;
  return { provider, model, ...(item.effort ? { reasoningEffort: item.effort } : {}) };
}

/** 设置页/详情页共用的档位模型草稿：{low:{key,effort}, ...}，key = "provider::model"。 */
function pcWorkloadDraftOf(settings) {
  const configured = (settings && settings.workloadModels) || {};
  const draft = {};
  for (const [tier] of PC_WORKLOAD_TIERS) {
    const item = configured[tier];
    draft[tier] = item && item.provider && item.model
      ? { key: `${item.provider}::${item.model}`, effort: item.reasoningEffort || "" }
      : { key: "", effort: "" };
  }
  return draft;
}

/** 草稿 → /settings/update 的 workloadModels 载荷（空 key = null，跟随项目/部署默认）。 */
function pcWorkloadModelsPayload(draft) {
  const out = {};
  for (const [tier] of PC_WORKLOAD_TIERS) {
    const item = (draft && draft[tier]) || {};
    if (!item.key) {
      out[tier] = null;
      continue;
    }
    const sep = item.key.indexOf("::");
    const provider = item.key.slice(0, sep);
    const model = item.key.slice(sep + 2);
    out[tier] = { provider, model, ...(item.effort ? { reasoningEffort: item.effort } : {}) };
  }
  return out;
}

/** 状态 → 看板列 key。 */
function pcColumnOf(status) {
  if (status === "inbox" || status === "queued") return "todo";
  if (status === "provisioning" || status === "running" || status === "needs_input") {
    return "running";
  }
  if (status === "verifying" || status === "needs_review" || status === "failed") return "review";
  if (status === "accepted" || status === "merged" || status === "abandoned") return "done";
  return "todo";
}

/** 状态元数据（未知状态回退成中性展示）。 */
function pcStatusMeta(status) {
  return PC_STATUS_META[status] ?? { label: status || "未知", tone: "idle" };
}

function pcBatchMeta(status) {
  return PC_BATCH_STATUS_META[status] ?? { label: status || "未知", tone: "idle" };
}

/** 数字安全取值。 */
function pcNum(value, fallback) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** ISO 字符串 / epoch 毫秒 → 毫秒时间戳；非法返回 null。 */
function pcTimeMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value === "") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** ISO → "MM-DD HH:mm"（今年省略年份）。 */
function pcFmtDateTime(iso) {
  const t = pcTimeMs(iso);
  if (t === null) return "—";
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}-${md}`;
}

/** ISO → "HH:mm:ss"。 */
function pcFmtClock(iso) {
  const t = pcTimeMs(iso);
  if (t === null) return "—";
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 相对时间："刚刚 / 12 秒前 / 3 分钟前 / 2 小时前 / 3 天前 / 日期"。 */
function pcFmtRelative(iso, nowMs) {
  const t = pcTimeMs(iso);
  if (t === null) return "—";
  const now = pcNum(nowMs, Date.now());
  const diff = now - t;
  if (diff < 0) return pcFmtDateTime(iso);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "刚刚";
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} 天前`;
  return pcFmtDateTime(iso);
}

/** 毫秒 → "3 分 24 秒" / "2 小时 5 分" / "4 天 3 小时"。 */
function pcFmtDuration(ms) {
  const value = pcNum(ms, NaN);
  if (!Number.isFinite(value) || value < 0) return "—";
  const sec = Math.floor(value / 1000);
  if (sec < 60) return `${sec} 秒`;
  const min = Math.floor(sec / 60);
  const rs = sec % 60;
  if (min < 60) return rs === 0 ? `${min} 分` : `${min} 分 ${rs} 秒`;
  const hour = Math.floor(min / 60);
  const rm = min % 60;
  if (hour < 24) return rm === 0 ? `${hour} 小时` : `${hour} 小时 ${rm} 分`;
  const day = Math.floor(hour / 24);
  const rh = hour % 24;
  return rh === 0 ? `${day} 天` : `${day} 天 ${rh} 小时`;
}

/** 运行时长：从 startedAt 算到现在（endedAt 存在则算到结束）。 */
function pcRunDuration(run, nowMs) {
  if (!run || typeof run !== "object") return "—";
  const start = pcTimeMs(run.startedAt);
  if (start === null) return "—";
  const end = run.endedAt ? pcTimeMs(run.endedAt) : null;
  return pcFmtDuration((end ?? pcNum(nowMs, Date.now())) - start);
}

/** ".5" 数据 / "1.4 GB" 之类的小数格式化。 */
function pcFmtGB(value) {
  const n = pcNum(value, null);
  if (n === null) return "—";
  return n >= 10 ? `${Math.round(n)}` : `${Math.round(n * 10) / 10}`;
}

/** "+120/-8" → { added: 120, deleted: 8 }；解析失败返回 null。 */
function pcParseDiffStat(diffStat) {
  if (typeof diffStat !== "string") return null;
  const m = diffStat.match(/([+-]?\d+)\s*\/\s*([+-]?\d+)/);
  if (!m) return null;
  return { added: Number(m[1]), deleted: Number(m[2]) };
}

/** selfTest 汇总："4/5"；无数据返回 null。 */
function pcSelfTestText(selfTest) {
  if (!selfTest || typeof selfTest !== "object") return null;
  const total = pcNum(selfTest.total, null);
  if (total === null) return null;
  const passed = pcNum(selfTest.passed, null);
  if (passed === null) return null;
  return { passed, total, failed: pcNum(selfTest.failed, total - passed), allPassed: passed >= total };
}

/** 会话 id 缩短展示（保留可辨识前缀 + 后缀）。 */
function pcShortSession(sessionId) {
  const text = String(sessionId ?? "");
  if (text === "") return "";
  if (text.length <= 22) return text;
  return `${text.slice(0, 10)}…${text.slice(-6)}`;
}

/** 批次判定 / 二分结论的中文展示（host 用英文标签，UI 里翻一下，原样兜底）。 */
function pcVerdictLabel(verdict) {
  if (verdict === null || verdict === undefined) return null;
  if (typeof verdict === "string") {
    const map = {
      "all-green": "全部通过",
      passed: "通过",
      failed: "失败",
      "infra-error": "环境错误",
      "no-tasks": "没有可集成任务",
    };
    return map[verdict] ?? verdict;
  }
  if (typeof verdict === "object") return verdict.summary || verdict.message || JSON.stringify(verdict);
  return String(verdict);
}

/**
 * 运行中卡片要显示的「最近一条事件」：优先最近一条非 user/message 的事件
 * （会话里注入的 runtime 上下文前言会把最新事件刷成噪音），没有再回退到最后一条。
 */
function pcLatestEvent(events) {
  const list = Array.isArray(events) ? events : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const event = list[i];
    if (!event) continue;
    if (event.type === "user/message") continue;
    return event;
  }
  return list.length > 0 ? list[list.length - 1] : null;
}

/** 当前项目（selectedProject 为空表示「全部项目」）。 */
function pcProjectById(projects, projectId) {
  return (projects ?? []).find((p) => p.id === projectId) ?? null;
}

/** 任务所属项目名。 */
function pcProjectName(projects, projectId) {
  const project = pcProjectById(projects, projectId);
  return project ? project.name : projectId || "—";
}

/** 任务最近一次 run 摘要：优先 task.lastRun，否则从 runs 里按开始时间取最后一条。 */
function pcTaskLastRun(task, runs) {
  if (task && task.lastRun) return task.lastRun;
  const list = (runs ?? []).filter((r) => r && String(r.taskId) === String(task?.id));
  if (list.length === 0) return null;
  return list.slice().sort((a, b) => (pcTimeMs(a.startedAt) ?? 0) - (pcTimeMs(b.startedAt) ?? 0)).at(-1) ?? null;
}

/** 任务会话 id：task.sessionId 优先，其次 lastRun.sessionId。 */
function pcTaskSessionId(task) {
  if (!task) return "";
  if (typeof task.sessionId === "string" && task.sessionId !== "") return task.sessionId;
  if (task.lastRun && typeof task.lastRun.sessionId === "string") return task.lastRun.sessionId;
  return "";
}

/** 列内排序：待办按优先级降序，其余按最近更新降序。 */
function pcSortColumn(column, tasks) {
  const list = (tasks ?? []).slice();
  if (column === "todo") {
    list.sort((a, b) => {
      const pa = pcNum(a.priority, 0);
      const pb = pcNum(b.priority, 0);
      if (pb !== pa) return pb - pa;
      return (pcTimeMs(b.createdAt) ?? 0) - (pcTimeMs(a.createdAt) ?? 0);
    });
    return list;
  }
  if (column === "done") {
    list.sort((a, b) => {
      const ta = pcTimeMs(a.acceptance && a.acceptance.acceptedAt) ?? pcTimeMs(a.updatedAt) ?? 0;
      const tb = pcTimeMs(b.acceptance && b.acceptance.acceptedAt) ?? pcTimeMs(b.updatedAt) ?? 0;
      return tb - ta;
    });
    return list;
  }
  list.sort((a, b) => (pcTimeMs(b.updatedAt) ?? pcTimeMs(b.createdAt) ?? 0) - (pcTimeMs(a.updatedAt) ?? pcTimeMs(a.createdAt) ?? 0));
  return list;
}

/** 某项目 / 全部项目的任务集合。 */
function pcTasksOf(state, projectId) {
  const tasks = (state && Array.isArray(state.tasks) ? state.tasks : []).filter((t) => t && t.id !== undefined);
  return projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
}

/** 待澄清 open 问题。 */
function pcOpenQuestions(state, projectId) {
  const list = (state && Array.isArray(state.questions) ? state.questions : []).filter(
    (q) => q && q.status === "open",
  );
  return projectId ? list.filter((q) => q.projectId === projectId) : list;
}

/** 统计条计数（当前筛选范围）。 */
function pcCountersOf(state, projectId) {
  const tasks = pcTasksOf(state, projectId);
  const count = (key) => tasks.filter((t) => pcColumnOf(t.status) === key).length;
  return {
    todo: count("todo"),
    running: count("running"),
    review: count("review"),
    done: count("done"),
    questions: pcOpenQuestions(state, projectId).length,
    total: tasks.length,
  };
}

/** 槽位汇总：优先 state.slots，回退按项目求和。 */
function pcSlotStats(state) {
  const slots = state && state.slots && typeof state.slots === "object" ? state.slots : null;
  if (slots && pcNum(slots.globalSlotBudget, null) !== null) {
    return { used: pcNum(slots.used, 0), budget: pcNum(slots.globalSlotBudget, 0) };
  }
  const projects = (state && Array.isArray(state.projects) ? state.projects : []).filter(
    (p) => p && !p.archivedAt,
  );
  return {
    used: projects.reduce((sum, p) => sum + pcNum(p.usedSlots, 0), 0),
    budget: projects.reduce((sum, p) => sum + pcNum(p.slotBudget, 0), 0),
  };
}

/** 磁盘汇总。 */
function pcDiskStats(state) {
  const disk = state && state.disk && typeof state.disk === "object" ? state.disk : null;
  return {
    used: pcNum(disk && disk.usedGB, 0),
    budget: pcNum(disk && disk.globalBudgetGB, 0),
  };
}

/** 验收中任务数（项目切换器里带在项目名后）。 */
function pcReviewCountOf(state, projectId) {
  return pcTasksOf(state, projectId).filter((t) => pcColumnOf(t.status) === "review").length;
}

/** 操作失败统一文案（CONTRACT.md §3 交互细节）。 */
function pcFriendlyError(error) {
  if (!error) return "操作失败";
  const status = pcNum(error.status, null);
  const code = error.code;
  if (code === "slots") return "槽位已满，先等运行中的任务结束";
  if (code === "deps") return error.message || "依赖任务还没合入 base，不能派发";
  if (code === "not-found") return error.message || "目标不存在，可能已被删除";
  if (code === "integration-failed") return error.message || "集成失败，展开批次报告看命令输出";
  if (code === "confirm-required") return "推送到 main 需要显式确认";
  if (status === 404 && !code) return "工程台宿主未就绪（端点 404），请稍后重试";
  if (status === 403) return "请求被拒绝：缺少写请求挡板头，或来源校验未通过";
  if (status === 409) return error.message || "状态冲突，请刷新后重试";
  if (status === 400) return error.message || "参数不合法";
  return error.message || "操作失败";
}

/**
 * 打开宿主会话（uiWorkspace.openSession）。
 * 返回 {ok:true} 或 {ok:false, reason:"service"|"open"|"no-session", message}，
 * 由调用方决定 toast 文案：服务缺失和「会话已不存在」要分开说。
 */
function pcOpenSession(ctx, sessionId) {
  if (!sessionId || !ctx) return { ok: false, reason: "no-session", message: "没有会话 id" };
  let uiWorkspace;
  try {
    uiWorkspace = typeof ctx.get === "function" ? ctx.get("uiWorkspace") : undefined;
  } catch (error) {
    return { ok: false, reason: "service", message: error && error.message ? error.message : String(error) };
  }
  if (!uiWorkspace || typeof uiWorkspace.openSession !== "function") {
    return { ok: false, reason: "service", message: "宿主没有提供 uiWorkspace 服务" };
  }
  try {
    uiWorkspace.openSession(sessionId);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "open", message: error && error.message ? error.message : String(error) };
  }
}

/** 取服务（惰性、带守卫）。 */
function pcService(ctx, name) {
  if (!ctx || typeof ctx.get !== "function") return undefined;
  try {
    return ctx.get(name);
  } catch {
    return undefined;
  }
}

/** 纯函数 sleep（测试/定时用不到，保留给未来，避免未使用报错——挂到顶层无副作用）。 */
function pcNoop() {}

/* ───────────────────── 会话面板（GET /state.sessions） ───────────────────── */

/** 会话状态元数据（host：running / idle / unknown）。 */
const PC_SESSION_STATUS_META = {
  running: { label: "运行中", tone: "busy" },
  idle: { label: "空闲", tone: "online" },
  unknown: { label: "未知", tone: "idle" },
};

function pcSessionStatusMeta(status) {
  return PC_SESSION_STATUS_META[status] ?? PC_SESSION_STATUS_META.unknown;
}

/** /state.sessions 列表；host 没提供该字段时返回空数组（UI 走空状态）。 */
function pcSessionList(state) {
  const list = state && Array.isArray(state.sessions) ? state.sessions : [];
  return list.filter((session) => session && typeof session === "object" && session.id);
}

/** 会话排序：lead 永远第一；任务会话运行中优先，其次 updatedAt 倒序。 */
function pcSortSessions(sessions) {
  const list = (sessions || []).slice();
  const leadRank = (session) => (session.kind === "lead" ? 0 : 1);
  list.sort((left, right) => {
    const leftLead = leadRank(left);
    const rightLead = leadRank(right);
    if (leftLead !== rightLead) return leftLead - rightLead;
    const leftRunning = left.status === "running" ? 0 : 1;
    const rightRunning = right.status === "running" ? 0 : 1;
    if (leftRunning !== rightRunning) return leftRunning - rightRunning;
    const leftTime = pcTimeMs(left.updatedAt) ?? pcTimeMs(left.startedAt) ?? 0;
    const rightTime = pcTimeMs(right.updatedAt) ?? pcTimeMs(right.startedAt) ?? 0;
    return rightTime - leftTime;
  });
  return list;
}

/** 会话标题兜底。 */
function pcSessionTitle(session) {
  if (!session) return "会话";
  if (session.title) return session.title;
  if (session.kind === "lead") return "工程台会话";
  if (session.taskId !== null && session.taskId !== undefined) return `任务 #${session.taskId}`;
  return "未命名会话";
}

/** 会话行的时间文案：运行中给运行时长，空闲给最后更新时间。 */
function pcSessionTimeText(session, nowMs) {
  if (!session) return "";
  const now = pcNum(nowMs, Date.now());
  if (session.status === "running") {
    const started = pcTimeMs(session.startedAt);
    return started === null ? "运行中" : `运行 ${pcFmtDuration(now - started)}`;
  }
  if (session.status === "idle" && session.updatedAt) return `更新于 ${pcFmtRelative(session.updatedAt, now)}`;
  if (session.updatedAt) return `更新于 ${pcFmtRelative(session.updatedAt, now)}`;
  return "";
}

/* ───────────────────── lead 对话（/lead/transcript） ───────────────────── */

/** lead 对话消息角色元数据（role: user | assistant | tool | system）。 */
const PC_CHAT_ROLES = {
  user: { label: "你", tone: "busy" },
  assistant: { label: "工程台", tone: "success" },
  tool: { label: "工具", tone: "idle" },
  system: { label: "系统", tone: "muted" },
};

function pcChatRoleMeta(role) {
  return PC_CHAT_ROLES[role] ?? { label: role || "消息", tone: "idle" };
}

/** 任务会话记录消息角色（与 lead 对话不同：user 表示原始需求）。 */
const PC_TRANSCRIPT_ROLES = {
  user: { label: "需求", tone: "busy" },
  assistant: { label: "执行会话", tone: "success" },
  tool: { label: "工具", tone: "idle" },
  system: { label: "系统", tone: "muted" },
};

function pcTranscriptRoleMeta(role) {
  return PC_TRANSCRIPT_ROLES[role] ?? { label: role || "消息", tone: "idle" };
}

/** run 状态元数据（/task/transcript 的 runs[].status）。 */
const PC_RUN_STATUS_META = {
  running: { label: "进行中", tone: "busy", dot: "busy" },
  finished: { label: "已结束", tone: "success", dot: "online" },
  failed: { label: "失败", tone: "danger", dot: "offline" },
};

function pcRunStatusMeta(status) {
  return PC_RUN_STATUS_META[status] ?? { label: status || "未知", tone: "idle", dot: "idle" };
}

/** run 选择 chip 文案：`r6 · 已结束 · 自测 9/9`。 */
function pcRunTabLabel(run) {
  if (!run) return "run";
  const meta = pcRunStatusMeta(run.status);
  const parts = [String(run.runId ?? "run"), meta.label];
  const selfTest = run.selfTest;
  const total = selfTest ? pcNum(selfTest.total, 0) : 0;
  if (total > 0) parts.push(`自测 ${pcNum(selfTest.passed, 0)}/${total}`);
  return parts.join(" · ");
}

/** 当前 lead 会话 id（state.lead.sessionId 优先）。 */
function pcLeadSessionId(state) {
  if (!state) return "";
  if (state.lead && typeof state.lead.sessionId === "string" && state.lead.sessionId !== "") return state.lead.sessionId;
  if (state.settings && typeof state.settings.leadSessionId === "string" && state.settings.leadSessionId !== "") {
    return state.settings.leadSessionId;
  }
  return "";
}

/* ───────────────────── 参考截图（attachments） ───────────────────── */

/** 新建需求时允许的附件上限（与 host 契约一致）。 */
const PC_ATTACHMENT_MAX = 6;
const PC_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
const PC_ATTACHMENT_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** 字节数 → "184 KB" / "1.2 MB"。 */
function pcFmtFileSize(bytes) {
  const n = pcNum(bytes, null);
  if (n === null || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** 任务附件列表（过滤掉没有 path 的脏数据）。 */
function pcTaskAttachments(task) {
  if (!task || !Array.isArray(task.attachments)) return [];
  return task.attachments.filter((attachment) => attachment && typeof attachment.path === "string" && attachment.path !== "");
}

/** 宿主 /file 端点 URL（img src 直接用）。 */
function pcAttachmentUrl(attachment) {
  const path = attachment && typeof attachment.path === "string" ? attachment.path : "";
  return `${PC_API_BASE}/file?path=${encodeURIComponent(path)}`;
}

/** File → base64（不带 data: 前缀），用于 POST /upload。 */
function pcFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

/** 校验一张待上传图片：类型 / 大小。返回 {ok, reason}。 */
function pcValidateAttachmentFile(file) {
  const mime = String(file && file.type ? file.type : "").toLowerCase();
  if (!PC_ATTACHMENT_MIMES.includes(mime)) return { ok: false, reason: `只支持 PNG / JPEG / WebP / GIF（${file && file.name ? file.name : "未知文件"}）` };
  if (pcNum(file && file.size, 0) > PC_ATTACHMENT_MAX_BYTES) {
    return { ok: false, reason: `图片超过 8MB：${file && file.name ? file.name : "未知文件"}` };
  }
  return { ok: true };
}

/* ───────────────────── 放弃 / 失败原因 ───────────────────── */

/** 放弃原因分类（host task.abandonCategory），没有或未知一律归 other。 */
const PC_ABANDON_CATEGORIES = {
  provider: { label: "模型服务", tone: "danger" },
  duplicate: { label: "重复任务", tone: "idle" },
  interrupted: { label: "中断", tone: "warn" },
  cancelled: { label: "操作员取消", tone: "muted" },
  scope: { label: "范围调整", tone: "busy" },
  other: { label: "其他", tone: "idle" },
};

function pcAbandonCategory(task) {
  const raw = task && typeof task.abandonCategory === "string" ? task.abandonCategory : "";
  const key = Object.prototype.hasOwnProperty.call(PC_ABANDON_CATEGORIES, raw) ? raw : "other";
  return Object.assign({ key }, PC_ABANDON_CATEGORIES[key]);
}

/** 任务的「原因」全文：abandoned 用 abandonReason，failed 用 error。 */
function pcTaskReasonText(task) {
  if (!task) return "";
  if (task.status === "abandoned") return task.abandonReason || "未填写放弃原因（可在详情里补充）";
  if (task.status === "failed") return task.error || "运行失败，查看详情里的命令输出";
  return "";
}
