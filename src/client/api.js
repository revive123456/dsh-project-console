/**
 * 工程台 client：host 通信（同源 fetch）。
 * 依据 CONTRACT.md §0/§2：写请求带 x-project-console: 1 挡板头；
 * 返回 JSON；错误统一 {ok:false, error, code?} + 4xx/5xx。
 */

/** 写请求挡板头（GET 不需要，带上也无副作用）。 */
const PC_WRITE_HEADER = { "x-project-console": "1" };

/**
 * 请求 /project-console-api 前缀下的端点。
 * 成功返回解析后的 JSON；失败抛 Error（带 status / code / payload）。
 */
async function pcApi(path, options) {
  const opts = options || {};
  const isWrite = typeof opts.method === "string" && opts.method.toUpperCase() !== "GET";
  const headers = Object.assign({}, isWrite ? PC_WRITE_HEADER : {}, opts.headers || {});
  let res;
  try {
    res = await fetch(`${PC_API_BASE}${path}`, {
      method: opts.method || "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      credentials: "same-origin",
    });
  } catch (cause) {
    const error = new Error("网络请求失败：无法连接工程台宿主");
    error.cause = cause;
    error.status = 0;
    throw error;
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const error = new Error((json && json.error) || `HTTP ${res.status}`);
    error.status = res.status;
    error.code = json && json.code;
    error.payload = json;
    throw error;
  }
  if (json && json.ok === false) {
    const error = new Error(json.error || "操作失败");
    error.status = res.status;
    error.code = json.code;
    error.payload = json;
    throw error;
  }
  return json === null ? {} : json;
}

function pcGet(path, signal) {
  return pcApi(path, { signal });
}

function pcPost(path, body, signal) {
  return pcApi(path, { method: "POST", body: body === undefined ? {} : body, signal });
}

/** GET /state —— 唯一的状态来源。 */
function pcGetState(signal) {
  return pcGet("/state", signal);
}

/** GET /task?id= —— 详情抽屉 / 运行中卡片的事件摘要。 */
function pcGetTask(taskId, signal) {
  return pcGet(`/task?id=${encodeURIComponent(taskId)}`, signal);
}

/** GET /task/log?id= —— 原始事件摘要（UI 展开时用）。 */
function pcGetTaskLog(taskId, limit, signal) {
  return pcGet(`/task/log?id=${encodeURIComponent(taskId)}&limit=${encodeURIComponent(limit ?? 200)}`, signal);
}

/** GET /batch?id= —— 批次完整报告。 */
function pcGetBatch(batchId, signal) {
  return pcGet(`/batch?id=${encodeURIComponent(batchId)}`, signal);
}

/** GET /ping —— 用来区分「host 路由没就绪」与业务失败。 */
function pcPing(signal) {
  return pcGet("/ping", signal);
}

/** POST /task/resume —— 放弃/失败的任务重新排队并立即尝试派发。 */
function pcResumeTask(taskId, signal) {
  return pcPost("/task/resume", { taskId }, signal);
}

/** POST /upload —— 上传参考截图（base64），返回 {ok, file:{path,name,mime,size}}。 */
function pcUploadAttachment(file, signal) {
  return pcPost(
    "/upload",
    { name: file.name, mime: file.mime, dataBase64: file.dataBase64 },
    signal,
  );
}

/** POST /task/delete —— 彻底删除任务（仅非运行中）。 */
function pcDeleteTask(taskId, signal) {
  return pcPost("/task/delete", { taskId }, signal);
}

/** POST /project/delete —— 彻底删除项目（连带任务记录；执行中的任务会挡住删除）。 */
function pcDeleteProject(projectId, signal) {
  return pcPost("/project/delete", { projectId }, signal);
}

/** POST /task/review —— 让工程台 lead 重新验收一次（force=true 可对同一 run 重试）。 */
function pcRequestReview(taskId, force, signal) {
  return pcPost("/task/review", force ? { taskId, force: true } : { taskId }, signal);
}

/** POST /task/cancel —— 取消运行中/待验收任务（状态 → abandoned / cancelled）。 */
function pcCancelTask(taskId, signal) {
  return pcPost("/task/cancel", { taskId }, signal);
}

/** POST /session/archive —— 隐藏会话（侧栏不显示，会话数据保留）。 */
function pcArchiveSession(sessionId, signal) {
  return pcPost("/session/archive", { sessionId }, signal);
}

/** GET /lead/transcript —— 工程台 lead 对话记录（新版界面内嵌对话用）。 */
function pcGetLeadTranscript(signal) {
  return pcGet("/lead/transcript?limit=200", signal);
}

/** GET /task/transcript —— 任务会话完整记录（隐藏会话的只读替代入口）。 */
function pcGetTaskTranscript(taskId, runId, signal) {
  const query = new URLSearchParams({ taskId: String(taskId), limit: "200" });
  if (runId !== null && runId !== undefined && runId !== "") query.set("runId", String(runId));
  return pcGet(`/task/transcript?${query.toString()}`, signal);
}

/** GET /report?task= —— 生成（或刷新）验收报告，返回元数据（文件名 / 图片张数 / 体积）。 */
function pcBuildReport(taskId, signal) {
  return pcGet(`/report?task=${encodeURIComponent(taskId)}`, signal);
}

/** GET /report/file?task= —— 验收报告下载地址（单文件 HTML，证据截图已内联）。 */
function pcReportFileUrl(taskId, inline) {
  return `${PC_API_BASE}/report/file?task=${encodeURIComponent(taskId)}${inline ? "&inline=1" : ""}`;
}

/** GET /models —— 模型目录（provider / model / 思考强度），设置页的档位模型下拉用。 */
function pcGetModels(signal) {
  return pcGet("/models", signal);
}

/** POST /task/estimate —— 让 AI 重新判定任务工作量（非运行中任务）。 */
function pcEstimateTask(taskId, signal) {
  return pcPost("/task/estimate", { taskId }, signal);
}
