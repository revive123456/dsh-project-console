/**
 * 工程台 host 半边 · HTTP 路由（/project-console-api）。
 *
 * host webserver 不做鉴权（API.md §2.7），所有写请求强制自定义头 x-project-console: 1
 * 作为 CSRF 挡板；同源页面正常带；跨源简单请求带不了这个头。
 */
import {
  ensureState, saveNow, nowIso, readJsonFile,
} from "./core.js";
import {
  addProject, updateProject, addTask, updateTask, dispatchTask, reworkTask,
  acceptTask, abandonTask, askQuestion, answerQuestion, integrate, ffBatch, revertBatch,
  ensureLead, promptLead, stateView, taskView, findTask, findProject, lastRunOf,
  taskEvents, sampleDisk, tick, svc, projectView, promptTask, recollectEvidence,
  cancelTask, reclaimOrphanDispatches, cancelSession, resumeTask, sessionsView,
  uploadAttachment, deleteTask, readAttachmentFile, leadTranscript, archiveSessionById,
  requestLeadReview, taskTranscript, transcriptOf, reestimateTask, modelCatalog,
  applyWorkbenchModel, workbenchModelOf, deleteProject, contextStatusOf, rotateLead,
  diagnoseTask, requestReview, requestDeepReview,
} from "./service.js";
import { runShell, run, normalizeWorkloadModels, normalizeModelSelection } from "./core.js";
import { buildAcceptanceReport, readReportFile } from "./report.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROUTE_PREFIX = "/project-console-api";

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

export function createHandler(core) {
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
