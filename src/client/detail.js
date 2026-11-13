/**
 * 工程台 client：任务详情抽屉（520px 右侧，打开时每 3s GET /task?id=）。
 */

/** 一次 run 的 teammate 子会话证据（Agent Teams：任务会话当 Team Lead 开出来的）。 */
function PcTeammatesBlock(props) {
  const teammates = Array.isArray(props.teammates) ? props.teammates : [];
  if (teammates.length === 0) return null;
  const totals = teammates.reduce((acc, mate) => ({
    total: acc.total + Number(mate && mate.selfTest ? mate.selfTest.total : 0),
    passed: acc.passed + Number(mate && mate.selfTest ? mate.selfTest.passed : 0),
  }), { total: 0, passed: 0 });
  return pcElement(
    "div",
    { className: "pc-stack", style: { marginTop: 8 } },
    pcElement(PcSectionTitle, null, "队友子会话", `${teammates.length} 个 · 队友自测 ${totals.passed}/${totals.total}`),
    pcElement(
      "div",
      { className: "pc-hint" },
      "任务会话当 Team Lead 时用 spawn_teammate 开的 teammate；这些命令/输出来自子会话，不计入上面的 selfTest。",
    ),
    teammates.map((mate) =>
      pcElement(
        "div",
        { key: mate.sessionId || mate.name, className: "pc-run" },
        pcElement(
          "div",
          { className: "pc-run-head" },
          pcElement(PcBadge, { tone: "info", icon: "users" }, String(mate.name || "teammate")),
          mate.description ? pcElement("span", null, String(mate.description)) : null,
          mate.sessionId ? pcElement("span", { className: "pc-mono", style: { marginLeft: "auto" } }, String(mate.sessionId).slice(0, 18)) : null,
        ),
        pcElement(PcSelfTestTable, { selfTest: mate.selfTest }),
        mate.finalText
          ? pcElement(PcDetails, { summary: "查看该队友的最终输出" }, pcElement("pre", { className: "pc-tail" }, String(mate.finalText)))
          : null,
      ),
    ),
  );
}

/** 一次 run 的 selfTest 命令表格（命令 / 退出码 / 尾部输出折叠）。 */
function PcSelfTestTable(props) {
  const selfTest = props.selfTest;
  if (!selfTest || typeof selfTest !== "object") {
    return pcElement("div", { className: "pc-hint" }, "本次运行没有 selfTest 记录");
  }
  const summaryRaw = pcSelfTestText(selfTest);
  const summary = summaryRaw && summaryRaw.total > 0 ? summaryRaw : null;
  const commands = Array.isArray(selfTest.commands) ? selfTest.commands : [];
  if (!summary && commands.length === 0) {
    return pcElement("div", { className: "pc-hint" }, "本次运行没有 selfTest 记录");
  }
  return pcElement(
    "div",
    { className: "pc-stack" },
    summary
      ? pcElement(
          "div",
          { className: "pc-row", style: { fontSize: 11.5 } },
          pcElement(
            PcBadge,
            { tone: summary.allPassed ? "success" : "danger" },
            `selfTest ${summary.passed}/${summary.total}`,
          ),
          summary.failed > 0 ? pcElement("span", { className: "pc-err-text" }, `${summary.failed} 条失败`) : null,
        )
      : null,
    commands.length > 0
      ? pcElement(
          "table",
          { className: "pc-table" },
          pcElement(
            "thead",
            null,
            pcElement(
              "tr",
              null,
              pcElement("th", { style: { width: "46%" } }, "命令"),
              pcElement("th", { style: { width: 48 } }, "退出码"),
              pcElement("th", null, "输出尾部"),
            ),
          ),
          pcElement(
            "tbody",
            null,
            commands.map((command, index) =>
              pcElement(
                "tr",
                { key: `${command.command || "cmd"}-${index}` },
                pcElement("td", { className: "pc-table-command" }, command.command || "—"),
                pcElement(
                  "td",
                  null,
                  pcElement(PcBadge, { tone: command.ok === false || command.exitCode !== 0 ? "danger" : "success", icon: "terminal" }, String(command.exitCode ?? "?")),
                ),
                pcElement(
                  "td",
                  null,
                  command.tail
                    ? pcElement(PcDetails, { summary: "展开输出尾部" }, pcElement("pre", { className: "pc-tail" }, String(command.tail)))
                    : pcElement("span", { className: "pc-hint" }, "—"),
                ),
              ),
            ),
          ),
        )
      : null,
  );
}

/** 取 run 的 diff 文件清单（host 字段名契约未定，兼容几种常见形状；无则 null）。 */
function pcRunFiles(run, task) {
  const candidates = [
    run && run.files,
    run && run.diffFiles,
    run && run.changedFiles,
    task && task.files,
    task && task.patch && task.patch.files,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return null;
}

/** 工程台内部路径（附件落盘等），不算任务自己的改动。 */
function pcIsInternalChangePath(filePath) {
  const normalized = String(filePath ?? "").replace(/^\.\//, "");
  return normalized === ".project-console" || normalized.startsWith(".project-console/");
}

/** diff 文件条目归一化：兼容 string / {path, additions, deletions} 两种形状。 */
function pcNormalizeChangeFile(file, index) {
  if (typeof file === "string") {
    return file === "" ? null : { path: file, additions: null, deletions: null, key: `s-${index}-${file}` };
  }
  if (!file || typeof file !== "object") return null;
  const filePath = file.path || file.file || file.name || "";
  if (filePath === "") return null;
  return {
    path: String(filePath),
    additions: pcNum(file.additions, null),
    deletions: pcNum(file.deletions, null),
    key: `o-${index}-${filePath}`,
  };
}

/** 拆成「任务改动」与「工程台内部文件」，并合计增删行数。 */
function pcSplitChangeFiles(files) {
  const list = Array.isArray(files) ? files : [];
  const visible = [];
  let hiddenCount = 0;
  let added = 0;
  let deleted = 0;
  let knownStats = 0;
  for (let index = 0; index < list.length; index += 1) {
    const file = pcNormalizeChangeFile(list[index], index);
    if (!file) continue;
    if (pcIsInternalChangePath(file.path)) {
      hiddenCount += 1;
      continue;
    }
    visible.push(file);
    if (file.additions !== null || file.deletions !== null) knownStats += 1;
    added += file.additions ?? 0;
    deleted += file.deletions ?? 0;
  }
  return { files: visible, hiddenCount, added, deleted, knownStats };
}

/** 一行改动文件：路径 + 增删行数（二进制/仅元数据变化显示「二进制」）。 */
function pcChangeRow(file, index) {
  const hasStats = file.additions !== null || file.deletions !== null;
  const noLines = hasStats && (file.additions ?? 0) === 0 && (file.deletions ?? 0) === 0;
  const stat =
    !hasStats || noLines
      ? pcElement(
          "span",
          { key: "blank", className: "pc-change-stat pc-change-blank", title: noLines ? "二进制或仅元数据变化，没有行数统计" : "没有行数统计" },
          hasStats ? "二进制" : "—",
        )
      : pcElement(
          "span",
          { key: "stat", className: "pc-change-stat" },
          pcElement("span", { className: "pc-diff-add" }, `+${file.additions ?? 0}`),
          pcElement("span", { className: "pc-diff-del" }, `-${file.deletions ?? 0}`),
        );
  return pcElement(
    "div",
    { className: "pc-change-row", key: `${file.key}-${index}`, title: file.path, "data-testid": "pc-change-row" },
    pcElement("span", { className: "pc-change-path" }, file.path),
    stat,
  );
}

/** 任务改动视图：已验收/已合并看验收提交（squash 后权威），其它看最近一次运行。 */
function pcTaskChanges(task, lastRun) {
  if (!task) return null;
  const acceptance = task.acceptance && typeof task.acceptance === "object" ? task.acceptance : null;
  if (acceptance) {
    const split = pcSplitChangeFiles(acceptance.files);
    const parsed = pcParseDiffStat(acceptance.diffStat);
    const rawCount = pcNum(acceptance.filesChanged, 0);
    return {
      source: "acceptance",
      files: split.files,
      hiddenCount: split.hiddenCount,
      added: split.knownStats > 0 ? split.added : parsed ? parsed.added : null,
      deleted: split.knownStats > 0 ? split.deleted : parsed ? parsed.deleted : null,
      count: split.files.length > 0 ? split.files.length : rawCount,
      rawCount,
      diffStat: acceptance.diffStat || "",
      commit: acceptance.commit || "",
      at: acceptance.acceptedAt || "",
      skipped: acceptance.skipped === true,
      run: null,
      running: false,
      runState: "finished",
    };
  }
  if (lastRun) {
    const split = pcSplitChangeFiles(lastRun.files);
    const parsed = pcParseDiffStat(lastRun.diffStat);
    const rawCount = pcNum(lastRun.filesChanged, 0);
    return {
      source: "run",
      files: split.files,
      hiddenCount: split.hiddenCount,
      added: split.knownStats > 0 ? split.added : parsed ? parsed.added : null,
      deleted: split.knownStats > 0 ? split.deleted : parsed ? parsed.deleted : null,
      count: split.files.length > 0 ? split.files.length : rawCount,
      rawCount,
      diffStat: lastRun.diffStat || "",
      run: lastRun,
      running: pcRunState(lastRun) === "running",
      runState: pcRunState(lastRun),
    };
  }
  return {
    source: "none",
    files: [],
    hiddenCount: 0,
    added: null,
    deleted: null,
    count: 0,
    rawCount: 0,
    diffStat: "",
    run: null,
    running: false,
    runState: "none",
  };
}

/** 「本次改动」小节：改动文件清单 + 来源（验收提交 / 最近一次运行）。 */
function PcChangedFiles(props) {
  const view = props.view;
  if (!view) return null;
  const files = view.files;
  const hasStat = view.added !== null && view.deleted !== null;
  const rightParts = [];
  if (files.length > 0) rightParts.push(`${files.length} 个文件`);
  if (hasStat) rightParts.push(`+${view.added}/-${view.deleted}`);
  const metaParts = [];
  if (view.source === "acceptance") {
    metaParts.push(view.commit ? `验收提交 ${String(view.commit).slice(0, 7)}` : "验收提交");
    if (view.at) metaParts.push(pcFmtDateTime(view.at));
  } else if (view.source === "run" && view.run) {
    metaParts.push(`最近运行 ${view.run.id ?? ""}`.trim());
    metaParts.push(view.running ? "运行中" : pcFmtDateTime(view.run.endedAt || view.run.startedAt));
  }
  const children = [
    pcElement(PcSectionTitle, { key: "title" }, "本次改动", rightParts.length > 0 ? rightParts.join(" · ") : null),
  ];
  if (metaParts.length > 0) {
    children.push(pcElement("div", { key: "meta", className: "pc-change-meta" }, metaParts.join(" · ")));
  }
  if (files.length > 0) {
    children.push(pcElement("div", { key: "list", className: "pc-change-list" }, files.slice(0, 8).map(pcChangeRow)));
    if (files.length > 8) {
      children.push(
        pcElement(
          PcDetails,
          { key: "more", summary: `展开其余 ${files.length - 8} 个文件` },
          pcElement("div", { className: "pc-change-list" }, files.slice(8).map((file, index) => pcChangeRow(file, index + 8))),
        ),
      );
    }
  } else if (view.source === "acceptance") {
    children.push(
      pcElement(
        "div",
        { key: "empty", className: "pc-hint" },
        view.hiddenCount > 0 ? "改动都在工程台内部文件里（.project-console/…）" : view.skipped ? "验收时工作树没有改动（空提交）" : "验收提交里没有任务改动的文件",
      ),
    );
  } else if (view.source === "run") {
    children.push(
      pcElement(
        "div",
        { key: "empty", className: "pc-hint" },
        view.hiddenCount > 0 && view.rawCount - view.hiddenCount <= 0
          ? "改动都在工程台内部文件里（.project-console/…）"
          : view.running
            ? "还在运行，改动文件出现后会自动刷新"
            : view.rawCount > 0
              ? `宿主记录了 ${view.rawCount} 个改动文件${view.diffStat ? `（${view.diffStat}）` : ""}，但没有文件清单`
              : "本次运行没有改文件",
      ),
    );
  } else {
    children.push(pcElement("div", { key: "empty", className: "pc-hint" }, "任务运行结束后，这里会列出改动的文件"));
  }
  if (view.hiddenCount > 0 && files.length > 0) {
    children.push(pcElement("div", { key: "hidden", className: "pc-change-hint" }, `已隐藏 ${view.hiddenCount} 个工程台内部文件（.project-console/…）`));
  }
  return pcElement("div", { className: "pc-section", "data-testid": "pc-changed-files" }, children);
}

/** run 状态：taskView.lastRun 有 status；state.runs 原始记录只有 outcome。 */
function pcRunState(run) {
  if (!run || typeof run !== "object") return "finished";
  if (run.status === "running" || run.status === "failed" || run.status === "finished") return run.status;
  if (!run.endedAt) return "running";
  return run.outcome === "failed" ? "failed" : "finished";
}

/** 单个 run 块。 */
function PcRunBlock(props) {
  const run = props.run;
  if (!run || typeof run !== "object") return null;
  const runState = pcRunState(run);
  const statusTone = runState === "running" ? "busy" : runState === "failed" ? "danger" : "success";
  const fileSplit = pcSplitChangeFiles(pcRunFiles(run, props.task));
  const hostVerify = run.hostVerify && Array.isArray(run.hostVerify.commands) ? run.hostVerify : null;
  return pcElement(
    "div",
    { className: "pc-run" },
    pcElement(
      "div",
      { className: "pc-run-head" },
      pcElement("span", { className: "pc-run-id" }, `run ${run.id ?? "?"}`),
      pcElement(PcBadge, { tone: statusTone }, runState === "running" ? "运行中" : runState === "failed" ? "失败" : "已结束"),
      pcElement("span", null, `开始 ${pcFmtDateTime(run.startedAt)}`),
      pcElement("span", null, `· 耗时 ${pcRunDuration(run, props.now)}`),
      run.diffStat ? pcElement("span", { className: "pc-mono", style: { marginLeft: "auto" } }, run.diffStat) : null,
      pcNum(run.filesChanged, null) !== null ? pcElement("span", null, `${run.filesChanged} 文件`) : null,
    ),
    run.drift && run.drift.mainRepoChanged
      ? pcElement(
          "div",
          { className: "pc-card-warn" },
          pcElement(PcIcon, { name: "alert", size: 11 }),
          pcElement("span", null, "任务执行期间主仓有变更（drift）"),
        )
      : null,
    pcElement(PcSelfTestTable, { selfTest: run.selfTest }),
    pcElement(PcTeammatesBlock, { teammates: run.teammates }),
    hostVerify
      ? pcElement(
          "div",
          { className: "pc-stack" },
          pcElement(PcSectionTitle, null, "宿主复跑", pcFmtDateTime(hostVerify.at)),
          pcElement(PcIntegrationCommands, { commands: hostVerify.commands }),
        )
      : null,
    run.finalText
      ? pcElement(PcDetails, { summary: "查看会话最终输出" }, pcElement("pre", { className: "pc-tail" }, String(run.finalText)))
      : null,
    fileSplit.files.length > 0
      ? pcElement(
          "div",
          { className: "pc-stack" },
          pcElement(PcSectionTitle, null, "本次运行改动"),
          pcElement("div", { className: "pc-change-list" }, fileSplit.files.slice(0, 30).map(pcChangeRow)),
          fileSplit.files.length > 30 ? pcElement("div", { className: "pc-hint" }, `… 另有 ${fileSplit.files.length - 30} 个文件`) : null,
          fileSplit.hiddenCount > 0
            ? pcElement("div", { className: "pc-change-hint" }, `已隐藏 ${fileSplit.hiddenCount} 个工程台内部文件（.project-console/…）`)
            : null,
        )
      : fileSplit.hiddenCount > 0
        ? pcElement("div", { className: "pc-hint" }, "本次只有工程台内部文件改动")
        : pcNum(run.filesChanged, 0) > 0
          ? pcElement(
              "div",
              { className: "pc-hint" },
              `宿主未提供文件清单（本次 ${run.filesChanged} 个文件${run.diffStat ? `，${run.diffStat}` : ""}）`,
            )
          : null,
  );
}

/** 会话事件列表。 */
function PcEventList(props) {
  const events = Array.isArray(props.events) ? props.events : [];
  if (events.length === 0) return pcElement("div", { className: "pc-hint" }, "暂无会话事件");
  return pcElement(
    "div",
    { className: "pc-event-list" },
    events
      .slice()
      .reverse()
      .slice(0, 40)
      .map((event, index) =>
        pcElement(
          "div",
          { className: "pc-event", key: `${event.seq ?? index}-${event.type || ""}`, title: event.brief || event.summary || "" },
          pcElement("span", { className: "pc-event-time" }, pcFmtClock(event.time)),
          pcElement("span", { className: "pc-event-type" }, event.type || "event"),
          pcElement("span", { className: "pc-event-brief" }, event.brief || event.summary || ""),
        ),
      ),
  );
}

/** 详情抽屉里的操作按钮（与卡片同款动作）。 */
function PcDetailActions(props) {
  const task = props.task;
  const column = pcColumnOf(task.status);
  const busy = props.busy || {};
  const isBusy = (key) => Boolean(busy[`${key}-${task.id}`]);
  const sessionId = pcTaskSessionId(task);
  const items = [];
  const push = (element) => items.push(element);
  // 验收报告只对验收完成（accepted / merged）的任务开放：报告对应已验收的提交。
  if (task.status === "accepted" || task.status === "merged") {
    push(
      pcElement(
        PcButton,
        {
          key: "report",
          variant: "secondary",
          size: "sm",
          icon: "download",
          loading: isBusy("report"),
          onClick: () => props.onDownloadReport(task),
          testId: "pc-btn-download-report",
          title: "下载验收报告（单文件 HTML，证据截图内联；可离线打开或打印成 PDF）",
        },
        "验收报告",
      ),
    );
  }
  if (task.status === "abandoned" || task.status === "failed") {
    push(
      pcElement(
        PcButton,
        {
          key: "resume",
          variant: "primary",
          size: "sm",
          icon: "play",
          loading: isBusy("resume"),
          onClick: () => props.onTaskAction("resume", task),
          testId: "pc-btn-resume",
          title: "重新排队并派发（POST /task/resume）",
        },
        "继续",
      ),
    );
  }
  if (column === "todo") {
    push(
      pcElement(
        PcButton,
        { key: "dispatch", variant: "primary", size: "sm", icon: "play", loading: isBusy("dispatch"), onClick: () => props.onTaskAction("dispatch", task), testId: "pc-task-dispatch" },
        "派发",
      ),
    );
    push(
      pcElement(PcButton, { key: "prio-up", variant: "ghost", size: "sm", icon: "arrowUp", loading: isBusy("priority-up"), onClick: () => props.onTaskAction("priority-up", task) }, "提优先级"),
    );
    push(
      pcElement(PcButton, { key: "prio-down", variant: "ghost", size: "sm", icon: "arrowDown", loading: isBusy("priority-down"), onClick: () => props.onTaskAction("priority-down", task) }, "降优先级"),
    );
    push(
      pcElement(
        PcButton,
        {
          key: "estimate",
          variant: "ghost",
          size: "sm",
          icon: "zap",
          loading: isBusy("estimate"),
          onClick: () => props.onTaskAction("estimate", task),
          testId: "pc-task-estimate",
          title: "重新判定工作量（POST /task/estimate）",
        },
        "重估",
      ),
    );
    push(
      pcElement(PcButton, { key: "abandon", variant: "danger", size: "sm", icon: "trash", loading: isBusy("abandon"), onClick: () => props.onTaskAction("abandon", task), testId: "pc-task-abandon" }, "放弃"),
    );
  } else if (column === "review") {
    push(
      pcElement(PcButton, { key: "accept", variant: "success", size: "sm", icon: "check", loading: isBusy("accept"), onClick: () => props.onTaskAction("accept", task), testId: "pc-task-accept" }, "验收通过"),
    );
    push(
      pcElement(PcButton, { key: "rework", variant: "danger", size: "sm", icon: "undo", onClick: () => props.onTaskAction("rework", task), testId: "pc-task-rework" }, "打回返工"),
    );
    push(
      pcElement(
        PcButton,
        {
          key: "request-review",
          variant: "secondary",
          size: "sm",
          icon: "robot",
          loading: isBusy("request-review"),
          onClick: () => props.onTaskAction("request-review", task),
          testId: "pc-btn-request-review",
          title: task.status === "verifying" ? "让工程台重新验收一次（force 对同一 run 重试）" : "让工程台 lead 验收一次",
        },
        "让工程台验收",
      ),
    );
    push(
      pcElement(
        PcButton,
        {
          key: "transcript",
          variant: "secondary",
          size: "sm",
          icon: "history",
          disabled: !sessionId,
          onClick: () => props.onViewTranscript(task),
          testId: "pc-btn-view-transcript",
          title: sessionId ? "查看任务完整会话记录（隐藏会话，不跳 native）" : "任务还没有会话",
        },
        "查看会话记录",
      ),
    );
    push(
      pcElement(PcButton, { key: "verify", variant: "secondary", size: "sm", icon: "terminal", loading: isBusy("verify"), onClick: () => props.onTaskAction("verify", task) }, "宿主复跑"),
    );
  } else if (column === "running") {
    push(
      pcElement(
        PcButton,
        {
          key: "transcript",
          variant: "secondary",
          size: "sm",
          icon: "history",
          disabled: !sessionId,
          onClick: () => props.onViewTranscript(task),
          testId: "pc-btn-view-transcript",
          title: sessionId ? "查看任务完整会话记录（隐藏会话，不跳 native）" : "任务还没有会话",
        },
        "查看会话记录",
      ),
    );
  } else {
    if (task.status !== "abandoned") {
      push(
        pcElement(
          PcButton,
          { key: "batch", variant: "secondary", size: "sm", icon: "layers", onClick: () => props.onOpenIntegration(task.projectId) },
          "查看集成批次",
        ),
      );
    }
    push(
      pcElement(
        PcButton,
        {
          key: "transcript",
          variant: "ghost",
          size: "sm",
          icon: "history",
          disabled: !sessionId,
          onClick: () => props.onViewTranscript(task),
          testId: "pc-btn-view-transcript",
          title: sessionId ? "查看任务完整会话记录（隐藏会话，不跳 native）" : "任务还没有会话",
        },
        "查看会话记录",
      ),
    );
  }
  if (column === "running" || column === "review") {
    items.push(
      pcElement(
        PcButton,
        {
          key: "cancel-task",
          variant: "cancel",
          size: "sm",
          icon: "close",
          onClick: () => props.onCancelTask(task),
          testId: "pc-btn-cancel-task",
          title: "取消需求：终止会话并把任务标记为已取消（之后可在已归档里点「继续」重做）",
        },
        "取消需求",
      ),
    );
  }
  return pcElement("div", { className: "pc-drawer-actions" }, items);
}

/** 任务详情抽屉。 */
function PcDetailDrawer(props) {
  const taskId = props.taskId;
  const fallbackTask = props.fallbackTask || null;
  const [detail, setDetail] = React.useState({ phase: "loading", task: null, run: null, events: [], error: null });

  React.useEffect(() => {
    let cancelled = false;
    let timer = null;
    const load = async () => {
      try {
        const payload = await pcGetTask(taskId);
        if (cancelled) return;
        setDetail({
          phase: "ready",
          task: payload.task || null,
          run: payload.run || null,
          events: Array.isArray(payload.events) ? payload.events : [],
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setDetail((previous) => ({
          phase: previous.phase === "ready" ? "ready" : "error",
          task: previous.task,
          run: previous.run,
          events: previous.events,
          error,
        }));
      } finally {
        if (!cancelled) timer = setTimeout(load, 3000);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [taskId]);

  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose]);

  const task = detail.task || fallbackTask;
  const projects = (props.state && props.state.projects) || [];
  const runs = props.state && Array.isArray(props.state.runs) ? props.state.runs : [];
  const project = task ? pcProjectById(projects, task.projectId) : null;
  const statusMeta = task ? pcStatusMeta(task.status) : null;
  const taskRuns = task
    ? (() => {
        const list = runs.filter((run) => String(run.taskId) === String(task.id));
        if (detail.run && !list.some((run) => String(run.id) === String(detail.run.id))) list.push(detail.run);
        return list.sort((a, b) => (pcTimeMs(a.startedAt) ?? 0) - (pcTimeMs(b.startedAt) ?? 0));
      })()
    : [];
  const lastRun = task ? pcTaskLastRun(task, runs) : null;
  const taskQuestions = task && Array.isArray(task.questions) ? task.questions : [];

  const head = pcElement(
    "div",
    { className: "pc-drawer-head" },
    pcElement(
      "div",
      { className: "pc-drawer-head-text" },
      pcElement(
        "div",
        { className: "pc-drawer-eyebrow" },
        pcElement("span", { className: "pc-card-id" }, `#${taskId}`),
        task && task.status === "verifying"
          ? pcElement(PcChip, { className: "pc-chip-verifying" }, "验收中")
          : statusMeta
            ? pcElement(PcBadge, { tone: statusMeta.tone }, statusMeta.label)
            : null,
        task && pcNum(task.priority, null) !== null ? pcElement(PcChip, { mono: true }, `P${task.priority}`) : null,
        task && task.size
          ? pcElement(
              PcChip,
              {
                mono: true,
                tone: pcSizeSourceMeta(task).tone || undefined,
                title: pcSizeSourceMeta(task).title,
              },
              pcWorkloadChipText(task),
            )
          : null,
      ),
      pcElement("div", { className: "pc-drawer-title" }, (task && task.title) || "任务详情"),
      pcElement(
        "div",
        { className: "pc-drawer-sub" },
        pcElement("span", null, project ? project.name : task ? task.projectId : "—"),
        task && task.branch ? pcElement("span", { className: "pc-mono" }, `· ${task.branch}`) : null,
      ),
    ),
    task && !["provisioning", "running", "verifying"].includes(task.status)
      ? pcElement(
          "button",
          {
            type: "button",
            className: "pc-icon-btn pc-icon-btn--danger",
            onClick: () => props.onDeleteTask(task),
            title: "彻底删除任务（不可恢复）",
            "aria-label": "彻底删除任务",
            "data-testid": "pc-btn-delete",
          },
          pcElement(PcIcon, { name: "trash", size: 15 }),
        )
      : null,
    pcElement(
      "button",
      { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭详情（Esc）", "aria-label": "关闭详情" },
      pcElement(PcIcon, { name: "close", size: 15 }),
    ),
  );

  const eventsRef = React.useRef(null);
  React.useEffect(() => {
    if (props.focusEvents !== true) return undefined;
    const timer = setTimeout(() => {
      const node = eventsRef.current;
      if (node && typeof node.scrollIntoView === "function") node.scrollIntoView({ block: "start" });
    }, 350);
    return () => clearTimeout(timer);
  }, [props.focusEvents, taskId, detail.phase]);

  const bodyChildren = [];
  bodyChildren.push(
    pcElement("div", { key: "actions" }, task ? pcElement(PcDetailActions, {
      task,
      busy: props.busy,
      onTaskAction: props.onTaskAction,
      onViewTranscript: props.onViewTranscript,
      onOpenIntegration: props.onOpenIntegration,
      onCancelTask: props.onCancelTask,
      onDownloadReport: props.onDownloadReport,
    }) : null),
  );
  if (detail.error) {
    bodyChildren.push(
      pcElement(
        "div",
        { key: "err", className: "pc-error-box" },
        `详情接口读取失败：${detail.error.message}${task ? "（下方为看板快照，可能稍旧）" : ""}`,
      ),
    );
  }
  if (task && (task.status === "abandoned" || task.status === "failed")) {
    bodyChildren.push(
      pcElement(
        "div",
        { key: "reason", className: "pc-section" },
        pcElement(
          PcSectionTitle,
          null,
          task.status === "failed" ? "失败原因" : "放弃原因",
          pcTaskReasonText(task).length > 0 ? `${pcTaskReasonText(task).length} 字` : null,
        ),
        pcElement(PcReasonBlock, { task, clamp: false }),
      ),
    );
  }
  if (!task) {
    bodyChildren.push(
      pcElement(PcEmpty, {
        key: "empty",
        icon: detail.phase === "loading" ? "history" : "alert",
        tone: "warn",
        title: detail.phase === "loading" ? "读取任务详情…" : "任务不存在",
        desc: detail.phase === "loading" ? "正在请求 GET /task?id=" + taskId : "宿主没有返回这个任务，可能已被删除。",
      }),
    );
  } else {
    // /state.runs 里是原始 run（含实际派发模型），task.lastRun 是投影；优先取原始记录。
    const lastRunRaw = lastRun ? (runs.find((run) => String(run.id) === String(lastRun.id)) || lastRun) : null;
    const workerModel = pcTaskWorkerModel(props.state, task, lastRunRaw);
    const workloadText = [
      pcWorkloadLabel(task.size),
      task.size ? `（${String(task.size).toUpperCase()}）` : "",
      "",
    ].join("");
    const metaRows = [
      ["项目", project ? project.name : task.projectId],
      ["类型 / 工作量", `${task.type || "—"} / ${workloadText || "—"}`],
      ["任务模型", pcWorkerModelText(workerModel)],
      ["优先级", pcNum(task.priority, null) === null ? "—" : `P${task.priority}`],
      ["槽位", pcNum(task.slots, null) === null ? "—" : String(task.slots)],
      ["分支", task.branch || "—"],
      ["worktree", task.worktreePath || "—"],
      ["会话", task.sessionId || (lastRun && lastRun.sessionId) || "—"],
      ["创建时间", pcFmtDateTime(task.createdAt)],
      ["更新时间", pcFmtDateTime(task.updatedAt)],
      ["运行次数", pcNum(task.runCount, null) === null ? "—" : String(task.runCount)],
    ];
    bodyChildren.push(
      pcElement(
        "div",
        { key: "meta", className: "pc-section" },
        pcElement(PcSectionTitle, null, "基本信息"),
        pcElement(
          "div",
          { className: "pc-kv-grid" },
          metaRows.map(([label, value]) =>
            pcElement(
              PcKV,
              { key: label, label, mono: label === "会话" || label === "分支" || label === "worktree" },
              String(value),
            ),
          ),
        ),
        Array.isArray(task.dependsOn) && task.dependsOn.length > 0
          ? pcElement(
              "div",
              { className: "pc-row", style: { flexWrap: "wrap", fontSize: 11, marginTop: 2 } },
              pcElement("span", { className: "pc-dim" }, "依赖："),
              task.dependsOn.map((dep) => pcElement(PcChip, { key: dep, mono: true }, `#${dep}`)),
            )
          : null,
        Array.isArray(task.touches) && task.touches.length > 0
          ? pcElement(
              "div",
              { className: "pc-row", style: { flexWrap: "wrap", fontSize: 11 } },
              pcElement("span", { className: "pc-dim" }, "触及路径："),
              task.touches.map((touch) => pcElement(PcChip, { key: touch, mono: true }, touch)),
            )
          : null,
        Array.isArray(task.tags) && task.tags.length > 0
          ? pcElement(
              "div",
              { className: "pc-row", style: { flexWrap: "wrap", fontSize: 11 } },
              pcElement("span", { className: "pc-dim" }, "标签："),
              task.tags.map((tag) => pcElement(PcChip, { key: tag }, tag)),
            )
          : null,
      ),
    );
    bodyChildren.push(
      pcElement("div", { key: "changes" }, pcElement(PcChangedFiles, { view: pcTaskChanges(task, lastRun) })),
    );
    bodyChildren.push(
      pcElement(
        "div",
        { key: "brief", className: "pc-section" },
        pcElement(PcSectionTitle, null, "需求原文 / 简报"),
        pcElement("pre", { className: "pc-pre pc-pre--brief" }, task.brief || "（没有简报）"),
      ),
    );
    const taskAttachments = pcTaskAttachments(task);
    if (taskAttachments.length > 0) {
      bodyChildren.push(
        pcElement(
          "div",
          { key: "attachments", className: "pc-section" },
          pcElement(
            PcSectionTitle,
            null,
            "参考截图",
            `${taskAttachments.length} 张 · 点击新窗口看原图`,
          ),
          pcElement(
            "div",
            { className: "pc-att-grid", "data-testid": "pc-attachments" },
            taskAttachments.map((attachment, index) =>
              pcElement(PcAttachmentTile, {
                key: `${attachment.path || "att"}-${index}`,
                attachment,
              }),
            ),
          ),
        ),
      );
    }
    bodyChildren.push(
      pcElement(
        "div",
        { key: "dod", className: "pc-section" },
        pcElement(PcSectionTitle, null, "验收标准 DoD", Array.isArray(task.dod) ? `${task.dod.length} 条` : null),
        Array.isArray(task.dod) && task.dod.length > 0
          ? pcElement(
              "ul",
              { className: "pc-list" },
              task.dod.map((item, index) => pcElement("li", { key: index }, typeof item === "string" ? item : JSON.stringify(item))),
            )
          : pcElement("div", { className: "pc-hint" }, "还没有 DoD 条目"),
      ),
    );
    bodyChildren.push(
      pcElement(
        "div",
        { key: "runs", className: "pc-section" },
        pcElement(PcSectionTitle, null, "运行记录", taskRuns.length > 0 ? `${taskRuns.length} 次` : null),
        taskRuns.length === 0
          ? pcElement("div", { className: "pc-hint" }, "还没有运行记录")
          : taskRuns.map((run) => pcElement(PcRunBlock, { key: run.id, run, task, now: props.now })),
      ),
    );
    if (taskQuestions.length > 0) {
      bodyChildren.push(
        pcElement(
          "div",
          { key: "questions", className: "pc-section" },
          pcElement(PcSectionTitle, null, "澄清问题", `${taskQuestions.length} 条`),
          taskQuestions.map((question) =>
            pcElement(
              "div",
              { key: question.id, className: "pc-run" },
              pcElement(
                "div",
                { className: "pc-run-head" },
                pcElement(PcBadge, { tone: question.status === "open" ? "warn" : question.status === "answered" ? "success" : "muted" }, question.status === "open" ? "待回答" : question.status === "answered" ? "已回答" : "已忽略"),
                pcElement("span", null, pcFmtDateTime(question.askedAt)),
              ),
              pcElement("div", { style: { fontSize: 12, lineHeight: 1.55 } }, question.text || ""),
              question.answer ? pcElement("div", { className: "pc-hint" }, `回答：${question.answer}`) : null,
            ),
          ),
        ),
      );
    }
    bodyChildren.push(
      pcElement(
        "div",
        { key: "events", className: "pc-section pc-events-section", ref: eventsRef },
        pcElement(PcSectionTitle, null, "最近会话事件", detail.events.length > 0 ? `${detail.events.length} 条` : null),
        pcElement(PcEventList, { events: detail.events }),
      ),
    );
  }

  return pcElement(
    "div",
    {
      className: "pc-drawer-mask",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) props.onClose();
      },
    },
    pcElement(
      "aside",
      { className: "pc-drawer", "data-testid": "pc-detail", role: "dialog", "aria-label": "任务详情", "aria-modal": "true" },
      head,
      pcElement("div", { className: "pc-drawer-body" }, bodyChildren),
    ),
  );
}
