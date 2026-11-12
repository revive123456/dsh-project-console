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
import { existsSync, mkdirSync, cpSync, readFileSync, statSync, lstatSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { run, runShell, tail, nowIso, hashOf, capBytes } from "./core.js";

/** `git <args>` 的封装，返回 {ok, stdout, stderr, exitCode}。 */
export async function git(cwd, args, options = {}) {
  const r = await run("git", args, { cwd, timeoutMs: options.timeoutMs ?? 120000 });
  return { ...r, out: r.stdout.trim(), err: r.stderr.trim() };
}

/**
 * 工程台内部路径（参考截图附件等）。
 * 这是宿主在派发时预置的输入，不是任务改动：diff 统计和验收提交都要排除。
 */
export function isConsoleInternalPath(filePath) {
  const normalized = String(filePath ?? "").replace(/^\.\//, "");
  return normalized === ".project-console" || normalized.startsWith(".project-console/");
}

export async function isGitRepo(path) {
  if (!existsSync(path)) return false;
  const r = await git(path, ["rev-parse", "--show-toplevel"]);
  return r.ok;
}

export async function repoTop(path) {
  const r = await git(path, ["rev-parse", "--show-toplevel"]);
  return r.ok ? r.out : null;
}

export async function currentBranch(repoPath) {
  const r = await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return r.ok ? r.out : null;
}

export async function headSha(repoPath) {
  const r = await git(repoPath, ["rev-parse", "HEAD"]);
  return r.ok ? r.out : null;
}

export async function statusPorcelain(repoPath, options = {}) {
  // -uall：新目录里的每个未跟踪文件单独列出（默认会折叠成 "?? docs/"），
  // 验收判定器需要看到具体文件名和内容。
  const args = ["status", "--porcelain"];
  if (options.all === true) args.push("-uall");
  const r = await git(repoPath, args);
  return r.ok ? r.out : null;
}

export async function refExists(repoPath, ref) {
  const r = await git(repoPath, ["show-ref", "--verify", "--quiet", `refs/heads/${ref}`, "refs/remotes/origin/" + ref]);
  if (r.ok) return true;
  const r2 = await git(repoPath, ["rev-parse", "--verify", "--quiet", ref]);
  return r2.ok;
}

export async function branchSha(repoPath, ref) {
  const r = await git(repoPath, ["rev-parse", "--verify", ref]);
  return r.ok ? r.out : null;
}

/** 主仓快照（漂移检测）：HEAD + status 哈希。 */
export async function repoSnapshot(repoPath) {
  const head = await headSha(repoPath);
  const status = (await statusPorcelain(repoPath)) ?? "";
  return { head, statusHash: hashOf(status), status, at: nowIso() };
}

/** 分支是否已存在（本地）。 */
export async function localBranchExists(repoPath, branch) {
  const r = await git(repoPath, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
  return r.ok;
}

/** 创建一个任务 worktree。返回 {ok, worktreePath, branch, error?}。 */
export async function addWorktree(repoPath, worktreePath, branch, baseRef) {
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

export async function removeWorktree(repoPath, worktreePath, options = {}) {
  if (!worktreePath) return { ok: true, skipped: true };
  const r = await git(repoPath, ["worktree", "remove", "--force", worktreePath], { timeoutMs: 120000 });
  // 目录被删但登记残留时兜底 prune。
  await git(repoPath, ["worktree", "prune"]);
  return { ok: r.ok, error: r.ok ? undefined : tail(r.err), out: r.out };
}

export async function deleteBranch(repoPath, branch) {
  return git(repoPath, ["branch", "-D", branch]);
}

/** 复制 gitignore 的本地依赖（setup.copy 的 from→to 语义）。 */
export function copyInto(from, toPath) {
  mkdirSync(dirname(toPath), { recursive: true });
  cpSync(from, toPath, { recursive: true, dereference: false });
}

/** 跑一条 setup 命令。 */
export async function runRecipeCommands(commands, cwd, env = {}, timeoutMs = 10 * 60 * 1000) {
  const results = [];
  for (const command of commands ?? []) {
    const r = await runShell(command, { cwd, env, timeoutMs });
    results.push({ command, exitCode: r.exitCode, ok: r.ok, timedOut: r.timedOut, tail: r.tail, ms: r.ms });
    if (!r.ok) break;
  }
  return results;
}

/** 目录大小（MB），异步 du。 */
export async function dirSizeMB(path) {
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
export async function squashTaskCommit(worktreePath, baseRef, message) {
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
export async function diffStat(worktreePath, baseRef) {
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
export async function diffText(worktreePath, baseRef, maxBytes = 12288) {
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
export async function createIntegrationBatch(core, project, tasks, batchId, commands, timeoutMs) {
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
export async function cleanupIntegrationWorktree(project, batch) {
  if (!batch.testWorktree) return { ok: true, skipped: true };
  return removeWorktree(project.repoPath, batch.testWorktree);
}

/**
 * 推送到 main：把本地 base 快进到批次测试结果，不推远端。调用方必须先做人工确认（/batch/ff 的 confirm 字段）。
 * 要求主仓当前在 base 分支且工作区干净。
 */
export async function fastForwardBase(project, batch) {
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

export async function revertBase(project, batch) {
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
