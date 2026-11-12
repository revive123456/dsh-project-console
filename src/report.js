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
import {
  existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, lstatSync, writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { teammateEvidenceForReport } from "./service.js";
import { createHash } from "node:crypto";

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
export async function buildAcceptanceReport(core, taskId) {
  const previous = core.reportTail ?? Promise.resolve();
  const job = previous.catch(() => {}).then(() => reportBuildNow(core, taskId));
  core.reportTail = job.catch(() => {});
  return job;
}

/** 报告文件路径（不重新生成），供下载路由使用。 */
export function reportPathOf(core, taskId) {
  return join(core.stateDir, "reports", `task-${Number(taskId)}.html`);
}

/** 读取报告文件；不存在返回 null。 */
export function readReportFile(core, taskId) {
  const file = reportPathOf(core, taskId);
  if (!existsSync(file)) return null;
  try {
    const bytes = readFileSync(file);
    return { bytes, size: bytes.length, file };
  } catch {
    return null;
  }
}
