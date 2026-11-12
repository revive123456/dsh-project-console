#!/usr/bin/env node
/**
 * 隔离测试：项目删除（deleteProject）与项目 id 递增（addProject）。
 *
 * 不起宿主、不碰真实状态：把 lib/engine.mjs 复制到临时目录并追加导出，
 * 用假 core 直接调服务函数，在临时 git 仓库上验证删除边界。
 *
 * 跑：node build-host.mjs && node probe/delete-project.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "lib", "engine.mjs"), "utf8");
const exportNames = ["deleteProject", "addProject", "updateProject", "findProject", "tasksOf"];
for (const name of exportNames) {
  if (!new RegExp(`^(?:async\\s+)?function\\s+${name}\\b`, "m").test(source)) {
    throw new Error(`lib/engine.mjs 里找不到 ${name}（先跑 node build-host.mjs）`);
  }
}
const tmpRoot = mkdtempSync(join(tmpdir(), "pc-delete-project-"));
const engineCopy = join(tmpRoot, "engine-test.mjs");
writeFileSync(engineCopy, `${source}\nexport { ${exportNames.join(", ")} };\n`, "utf8");
process.on("exit", () => {
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});
const engine = await import(`file://${engineCopy}`);

/* ───────────────────────── 断言 ───────────────────────── */

let checks = 0;
let failures = 0;
function check(label, ok, detail) {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? `：${detail}` : ""}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

/* ───────────────────────── 夹具 ───────────────────────── */

const notify = () => new Date().toISOString();
const stateDir = join(tmpRoot, "state");
mkdirSync(join(stateDir, "reports"), { recursive: true });
mkdirSync(join(stateDir, "uploads"), { recursive: true });
mkdirSync(join(stateDir, "evidence"), { recursive: true });

function makeCore(state) {
  const core = {
    home: join(tmpRoot, "home"),
    stateDir,
    stateFile: join(stateDir, "state.json"),
    evidenceDir: join(stateDir, "evidence"),
    state,
    dispatching: new Set(),
    archivedSessions: [],
    logs: [],
    log: (...args) => core.logs.push(args.map(String).join(" ")),
    ctx: {
      get: (name) => (name === "workspaceRegistry"
        ? { archiveSession: async (sessionId) => { core.archivedSessions.push(sessionId); } }
        : undefined),
    },
  };
  return core;
}

function gitRepo(name) {
  const repo = join(tmpRoot, name);
  mkdirSync(repo, { recursive: true });
  execFileSync("git", ["init", "-q", "-b", "main", repo]);
  execFileSync("git", ["-C", repo, "config", "user.email", "test@example.com"]);
  execFileSync("git", ["-C", repo, "config", "user.name", "test"]);
  writeFileSync(join(repo, "README.md"), "fixture\n");
  execFileSync("git", ["-C", repo, "add", "."]);
  execFileSync("git", ["-C", repo, "commit", "-qm", "init"]);
  return repo;
}

function makeProject(id, repoPath, worktreeRoot) {
  return {
    id,
    name: `fixture-${id}`,
    repoPath,
    baseBranch: "main",
    integrationBranch: "main",
    autonomy: "unleashed",
    mergeMode: "test-branch",
    worktreeRoot,
    slotBudget: 4,
    diskBudgetGB: 40,
    perTaskDiskGB: 4,
    workerModel: { provider: "mtcode", model: "deepseek-flash", reasoningEffort: "max" },
    setup: { copy: [], commands: [], env: {} },
    verify: { commands: [] },
    integrationTests: { commands: [], timeoutMs: 120000 },
    protectedBranches: ["main"],
    evidenceRoots: [],
    archivedAt: null,
    diskUsedGB: 0,
    createdAt: notify(),
    updatedAt: notify(),
  };
}

function makeTask(id, projectId, status, extra = {}) {
  return {
    id,
    projectId,
    title: `fixture task ${id}`,
    type: "chore",
    size: "xs",
    slots: 1,
    sizeSource: "given",
    sizeReason: "",
    estimateError: null,
    estimatedAt: notify(),
    priority: 100,
    brief: "fixture",
    dod: [],
    dodSource: "agent",
    status,
    dependsOn: [],
    touches: [],
    tags: [],
    attachments: [],
    branch: null,
    worktreePath: null,
    sessionId: null,
    workspaceId: null,
    runCount: 0,
    acceptance: null,
    abandonReason: null,
    error: null,
    batchId: null,
    createdAt: notify(),
    updatedAt: notify(),
    ...extra,
  };
}

/* ───────────────────────── 场景 1：正常删除（连带记录） ───────────────────────── */

console.log("场景 1：删除项目，连带任务/运行/澄清/批次，清理 worktree/分支/报告/证据/截图");
{
  const repo = gitRepo("repo-1");
  const project = makeProject("p1", repo, join(tmpRoot, "wts", "p1"));
  const other = makeProject("p2", repo, join(tmpRoot, "wts", "p2"));
  mkdirSync(project.worktreeRoot, { recursive: true });
  mkdirSync(other.worktreeRoot, { recursive: true });
  // 真实 worktree + 分支，验证删除时能被 git 清干净。
  const worktreePath = join(project.worktreeRoot, "t1");
  execFileSync("git", ["-C", repo, "worktree", "add", "-q", "-b", "chore/1-fix", worktreePath, "main"]);
  // 报告 / 证据 / 参考截图
  writeFileSync(join(stateDir, "reports", "task-1.html"), "<html>report</html>");
  mkdirSync(join(stateDir, "evidence", "task-1", "report-images"), { recursive: true });
  writeFileSync(join(stateDir, "evidence", "task-1", "report-images", "a.png"), "png");
  writeFileSync(join(stateDir, "uploads", "shot.png"), "png");
  const state = {
    projects: [project, other],
    tasks: [
      makeTask(1, "p1", "merged", {
        branch: "chore/1-fix", worktreePath, sessionId: "session-task-1",
        attachments: [{ path: join(stateDir, "uploads", "shot.png"), name: "shot.png", mime: "image/png", size: 3 }],
      }),
      makeTask(2, "p1", "abandoned", { sessionId: "session-task-2" }),
      makeTask(3, "p2", "merged"),
    ],
    runs: [
      { id: 1, taskId: 1, status: "ended", startedAt: notify(), endedAt: notify() },
      { id: 2, taskId: 3, status: "ended", startedAt: notify(), endedAt: notify() },
    ],
    questions: [
      { id: 1, taskId: 1, projectId: "p1", status: "open", text: "q1" },
      { id: 2, taskId: 3, projectId: "p2", status: "open", text: "q2" },
    ],
    batches: [
      { id: "b1", projectId: "p1", taskIds: [1], status: "merged" },
      { id: "b2", projectId: "p2", taskIds: [3], status: "merged" },
    ],
  };
  const core = makeCore(state);
  const result = await engine.deleteProject(core, "p1");

  check("返回 ok", result.ok === true, JSON.stringify(result).slice(0, 200));
  check("项目从状态移除", state.projects.length === 1 && state.projects[0].id === "p2");
  check("p1 任务清空、p2 任务保留", state.tasks.length === 1 && state.tasks[0].id === 3);
  check("p1 运行记录清空、p2 保留", state.runs.length === 1 && state.runs[0].taskId === 3);
  check("p1 澄清清空、p2 保留", state.questions.length === 1 && state.questions[0].id === 2);
  check("p1 批次清空、p2 保留", state.batches.length === 1 && state.batches[0].id === "b2");
  check("任务会话被归档", core.archivedSessions.includes("session-task-1") && core.archivedSessions.includes("session-task-2"));
  check("worktree 目录已清理", !existsSync(worktreePath));
  check("任务分支已删", execFileSync("git", ["-C", repo, "branch", "--list", "chore/1-fix"]).toString().trim() === "");
  check("空的 worktree 根目录已删", !existsSync(project.worktreeRoot));
  check("报告文件已删", !existsSync(join(stateDir, "reports", "task-1.html")));
  check("证据归档已删", !existsSync(join(stateDir, "evidence", "task-1")));
  check("参考截图文件已删", !existsSync(join(stateDir, "uploads", "shot.png")));
  check("仓库本身保留", existsSync(join(repo, "README.md")));
  check("删除摘要带任务清单", Array.isArray(result.deleted.tasks) && result.deleted.tasks.length === 2);
  check("删除后落盘 state.json 同步", existsSync(join(stateDir, "state.json")));
}

/* ───────────────────────── 场景 2：执行中任务挡住删除 ───────────────────────── */

console.log("场景 2：项目里有执行中任务时拒绝删除");
{
  const repo = gitRepo("repo-2");
  const project = makeProject("p1", repo, join(tmpRoot, "wts2", "p1"));
  mkdirSync(project.worktreeRoot, { recursive: true });
  const state = {
    projects: [project],
    tasks: [makeTask(1, "p1", "running")],
    runs: [],
    questions: [],
    batches: [],
  };
  const core = makeCore(state);
  const result = await engine.deleteProject(core, "p1");
  check("返回 busy", result.ok === false && result.code === "busy", JSON.stringify(result));
  check("项目仍在", state.projects.length === 1 && state.projects[0].id === "p1");
  check("任务仍在", state.tasks.length === 1);
  check("worktree 根目录未动", existsSync(project.worktreeRoot));
  // 派发锁里的任务也算执行中（防派发过程中被删）。
  state.tasks[0].status = "queued";
  core.dispatching.add(1);
  const locked = await engine.deleteProject(core, "p1");
  check("正在派发的任务同样挡住删除", locked.ok === false && locked.code === "busy", JSON.stringify(locked));
}

/* ───────────────────────── 场景 3：不存在 / 别的项目根目录共享 ───────────────────────── */

console.log("场景 3：项目不存在、worktree 根目录与别的项目共享");
{
  const repo = gitRepo("repo-3");
  const sharedRoot = join(tmpRoot, "shared-wts");
  mkdirSync(sharedRoot, { recursive: true });
  const project = makeProject("p1", repo, sharedRoot);
  const other = makeProject("p2", repo, join(sharedRoot, "p2"));
  mkdirSync(other.worktreeRoot, { recursive: true });
  const state = { projects: [project, other], tasks: [], runs: [], questions: [], batches: [] };
  const core = makeCore(state);
  const missing = await engine.deleteProject(core, "p9");
  check("不存在的项目返回 not-found", missing.ok === false && missing.code === "not-found");
  const result = await engine.deleteProject(core, "p1");
  check("共享根目录不删（别的项目还在用）", result.ok === true && existsSync(sharedRoot) && existsSync(other.worktreeRoot));
  check("项目记录已删", state.projects.length === 1 && state.projects[0].id === "p2");
}

/* ───────────────────────── 场景 4：删除后新增项目 id 不撞 ───────────────────────── */

console.log("场景 4：删除项目后新增项目，id 取最大号 +1");
{
  const repo = gitRepo("repo-4");
  const project = makeProject("p2", repo, join(tmpRoot, "wts4", "p2"));
  const state = { projects: [project], tasks: [], runs: [], questions: [], batches: [] };
  const core = makeCore(state);
  const created = await engine.addProject(core, { name: "new", repoPath: repo, baseBranch: "main" });
  check("新增项目用 p3 而不是撞上已删的 p1/p2", created.ok === true && created.project.id === "p3", JSON.stringify(created).slice(0, 200));
  const created2 = await engine.addProject(core, { name: "another", repoPath: gitRepo("repo-5"), baseBranch: "main" });
  check("再次新增用 p4", created2.ok === true && created2.project.id === "p4");
}

console.log("");
console.log(`${checks - failures}/${checks} 项通过`);
if (failures > 0) process.exitCode = 1;
