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
import {
  stateView, taskView, lastRunOf, findTask, findProject, addTask, updateTask,
  dispatchTask, reworkTask, acceptTask, abandonTask, askQuestion, integrate,
  ensureLead, tick, taskEvents, projectView, buildLeadBrief, diagnoseTask,
} from "./service.js";
import { saveNow, nowIso, tail, capBytes } from "./core.js";
import { readFileSync, statSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import { resolve, join, sep } from "node:path";

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
export function toolDefinitions(core) {
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
export function registerTools(core, ctx) {
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
