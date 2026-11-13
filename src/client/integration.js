/**
 * 工程台 client：集成与合并抽屉。
 *
 * 对应 CONTRACT.md §3.6：列出 accepted 任务多选 + 发起集成；
 * 最近批次报告（命令/退出码/日志尾/判定/推送到 main 二次确认/回滚）。
 * POST /batch/integrate 是同步的，可能跑 1-10 分钟：按钮 loading + 顶部警示条。
 */

/** 集成命令表格（命令 / 退出码 / 输出尾部）。 */
function PcIntegrationCommands(props) {
  const commands = Array.isArray(props.commands) ? props.commands : [];
  if (commands.length === 0) return pcElement("div", { className: "pc-hint" }, "没有集成命令记录");
  return pcElement(
    "table",
    { className: "pc-table" },
    pcElement(
      "thead",
      null,
      pcElement(
        "tr",
        null,
        pcElement("th", { style: { width: "42%" } }, "命令"),
        pcElement("th", { style: { width: 52 } }, "退出码"),
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
            pcElement(
              PcBadge,
              { tone: command.ok === false || command.exitCode !== 0 ? "danger" : "success" },
              String(command.exitCode ?? "?"),
            ),
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
  );
}

/** 单个批次报告 + 推送到 main/回滚操作。 */
function PcBatchCard(props) {
  const batch = props.batch;
  const meta = pcBatchMeta(batch.status);
  const [step, setStep] = React.useState(null); // null | "ff" | "revert"
  const [open, setOpen] = React.useState(false);
  const [report, setReport] = React.useState(null);
  const [reportError, setReportError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [verdictOpen, setVerdictOpen] = React.useState(false);
  const effective = report && typeof report === "object" ? Object.assign({}, batch, report) : batch;
  const project = pcProjectById(props.projects, batch.projectId);
  const taskIds = Array.isArray(batch.taskIds) ? batch.taskIds : [];
  // 「已合并」对操作员更直觉的说法是「已推送到 main」：推的目标就是这个项目的主干分支。
  const statusLabel = batch.status === "merged"
    ? `已推送到 ${(project && (project.integrationBranch || project.baseBranch)) || "main"}`
    : meta.label;

  React.useEffect(() => {
    if (!open || report !== null || reportError !== null) return undefined;
    let cancelled = false;
    pcGetBatch(batch.id)
      .then((payload) => {
        if (!cancelled) setReport(payload.batch || payload);
      })
      .catch((error) => {
        if (!cancelled) setReportError(error);
      });
    return () => {
      cancelled = true;
    };
  }, [open, batch.id, report, reportError]);

  // host 的 integrate 成功后会停在 awaiting_confirmation，等 /batch/ff 显式确认；
  // 契约里还预留了 passed，两种都允许点「推送到 main」，其余状态明确拒绝。
  const canFf = batch.status === "passed" || batch.status === "awaiting_confirmation";
  const canRevert = batch.status === "merged";
  const running = batch.status === "running" || busy;
  const verdictText = pcVerdictLabel(effective.verdict);
  const bisectText = (() => {
    const bisect = effective.bisect;
    if (!bisect) return null;
    if (typeof bisect === "string") return bisect;
    if (typeof bisect === "object") return bisect.summary || bisect.culprit || JSON.stringify(bisect);
    return String(bisect);
  })();

  const doFf = async () => {
    setBusy(true);
    try {
      const res = await pcPost("/batch/ff", { batchId: batch.id, confirm: "fast-forward" });
      props.toast("success", `已推送到 main${res && res.mergedSha ? `：${res.mergedSha}` : ""}`);
      setStep(null);
      props.onRefresh();
    } catch (error) {
      props.toast("error", pcFriendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const doRevert = async () => {
    setBusy(true);
    try {
      await pcPost("/batch/revert", { batchId: batch.id });
      props.toast("success", `已回滚批次 ${batch.id}`);
      setStep(null);
      props.onRefresh();
    } catch (error) {
      props.toast("error", pcFriendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  return pcElement(
    "div",
    { className: "pc-batch" },
    pcElement(
      "div",
      { className: "pc-batch-head" },
      pcElement("span", { className: "pc-batch-id" }, batch.id),
      pcElement(PcBadge, { tone: meta.tone }, statusLabel),
      pcElement("span", { className: "pc-batch-title" }, `集成 ${taskIds.length} 个任务`),
      pcElement("span", { className: "pc-batch-meta", style: { marginLeft: "auto" } }, pcFmtRelative(batch.createdAt, props.now)),
      pcElement(
        PcButton,
        { variant: "ghost", size: "sm", icon: open ? "chevronDown" : "list", onClick: () => setOpen(!open) },
        open ? "收起报告" : "展开报告",
      ),
    ),
    pcElement(
      "div",
      { className: "pc-batch-meta" },
      project ? pcElement("span", null, project.name) : null,
      pcElement("span", null, "任务：", taskIds.map((id) => `#${id}`).join(" ")),
      effective.testBranch ? pcElement("span", { className: "pc-mono" }, `测试分支 ${effective.testBranch}`) : null,
      effective.baseShaBefore ? pcElement("span", { className: "pc-mono" }, `base ${String(effective.baseShaBefore).slice(0, 8)}`) : null,
      effective.mergedSha ? pcElement("span", { className: "pc-mono" }, `合并 ${String(effective.mergedSha).slice(0, 8)}`) : null,
      effective.backupRef ? pcElement("span", { className: "pc-mono" }, `备份 ${effective.backupRef}`) : null,
      verdictText ? pcElement(PcBadge, { tone: batch.status === "failed" ? "danger" : "success" }, `判定：${verdictText}`) : null,
    ),
    running
      ? pcElement(
          "div",
          { className: "pc-banner pc-banner--busy" },
          pcElement(PcSpinner, { size: 12 }),
          pcElement("span", null, "集成测试运行中，不要关闭页面（可能 1-10 分钟）"),
        )
      : null,
    open
      ? pcElement(
          "div",
          { className: "pc-stack" },
          reportError
            ? pcElement("div", { className: "pc-error-box" }, `批次报告读取失败：${reportError.message}（以下为看板快照）`)
            : null,
          pcElement(PcIntegrationCommands, { commands: effective.commands }),
          Array.isArray(effective.failures) && effective.failures.length > 0
            ? pcElement(
                "div",
                { className: "pc-banner pc-banner--err" },
                pcElement(PcIcon, { name: "alert", size: 12 }),
                pcElement(
                  "span",
                  null,
                  `失败项：${effective.failures
                    .map((failure) => (typeof failure === "string" ? failure : failure.reason || failure.error || `#${failure.taskId ?? "?"}`))
                    .join("；")}`,
                ),
              )
            : null,
          Array.isArray(effective.perTask) && effective.perTask.length > 0
            ? pcElement(
                "div",
                { className: "pc-hint" },
                `逐任务结果：${effective.perTask
                  .map((entry) => `#${entry.taskId ?? entry.id ?? "?"} ${entry.ok === false ? "失败" : "通过"}${entry.detail ? `（${entry.detail}）` : ""}`)
                  .join(" · ")}`,
              )
            : null,
          bisectText
            ? pcElement("div", { className: "pc-banner pc-banner--warn" }, pcElement(PcIcon, { name: "alert", size: 12 }), pcElement("span", null, `二分定位：${bisectText}`))
            : null,
          effective.workingTree
            ? pcElement("div", { className: "pc-hint" }, `工作区：${effective.workingTree}`)
            : null,
        )
      : null,
    pcElement(
      "div",
      { className: "pc-batch-actions" },
      canFf
        ? pcElement(
            PcButton,
            { variant: "primary", size: "sm", icon: "fastForward", disabled: running, onClick: () => setStep(step === "ff" ? null : "ff"), title: "把批次测试结果推送到本地 main 分支（不推远端仓库）" },
            "推送到 main",
          )
        : null,
      canRevert
        ? pcElement(
            PcButton,
            { variant: "danger", size: "sm", icon: "rotateCcw", disabled: running, onClick: () => setStep(step === "revert" ? null : "revert") },
            "回滚",
          )
        : null,
      batch.status === "failed"
        ? pcElement("span", { className: "pc-hint" }, "集成测试未通过，修复后重新发起集成")
        : null,
    ),
    step === "ff"
      ? pcElement(
          "div",
          { className: "pc-confirm" },
          pcElement(
            "div",
            { className: "pc-confirm-text" },
            pcElement("strong", { style: { fontSize: 12 } }, "确认推送到 main？"),
            pcElement(
              "span",
              null,
              "将把批次测试结果",
              effective.mergedSha ? `（${String(effective.mergedSha).slice(0, 8)}）` : "",
              "推送到",
              project ? `「${project.name}」的 ${project.integrationBranch || project.baseBranch || "main"}` : "main",
              " 分支。",
            ),
            pcElement(
              "span",
              null,
              "只更新本地 main，不会推送到远端仓库；宿主在改动前已把原分支备份到 ",
              effective.backupRef ? pcElement("span", { className: "pc-ref" }, effective.backupRef) : "备份 ref",
              "，出问题可用「回滚」恢复。",
            ),
          ),
          pcElement(
            "div",
            { className: "pc-confirm-actions" },
            pcElement(PcButton, { variant: "ghost", size: "sm", onClick: () => setStep(null), disabled: busy }, "取消"),
            pcElement(
              PcButton,
              { variant: "primary", size: "sm", icon: "fastForward", loading: busy, onClick: doFf, testId: "pc-btn-ff-confirm" },
              "确认推送",
            ),
          ),
        )
      : null,
    step === "revert"
      ? pcElement(
          "div",
          { className: "pc-confirm" },
          pcElement(
            "div",
            { className: "pc-confirm-text" },
            pcElement("strong", { style: { fontSize: 12 } }, "确认回滚已合并批次？"),
            pcElement(
              "span",
              null,
              "将用备份 ",
              effective.backupRef ? pcElement("span", { className: "pc-ref" }, effective.backupRef) : "ref",
              " 或 revert commit 把 base 恢复到合并前状态；已合并的提交会从分支上移除。",
            ),
          ),
          pcElement(
            "div",
            { className: "pc-confirm-actions" },
            pcElement(PcButton, { variant: "ghost", size: "sm", onClick: () => setStep(null), disabled: busy }, "取消"),
            pcElement(
              PcButton,
              { variant: "danger", size: "sm", icon: "rotateCcw", loading: busy, onClick: doRevert, testId: "pc-btn-revert-confirm" },
              "确认回滚",
            ),
          ),
        )
      : null,
  );
}

/** 集成与合并抽屉。 */
function PcIntegrationDrawer(props) {
  const state = props.state || {};
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const acceptedAll = (Array.isArray(state.tasks) ? state.tasks : []).filter((task) => task && task.status === "accepted");
  const initialProject =
    props.initialProjectId ||
    (props.selectedProject && projects.some((p) => p.id === props.selectedProject) ? props.selectedProject : "") ||
    (acceptedAll[0] && acceptedAll[0].projectId) ||
    (projects[0] && projects[0].id) ||
    "";
  const [projectId, setProjectId] = React.useState(initialProject);
  const accepted = acceptedAll.filter((task) => task.projectId === projectId);
  const acceptedKey = accepted.map((task) => task.id).join(",");
  const [selected, setSelected] = React.useState([]);
  const [integrating, setIntegrating] = React.useState(false);
  const [integrateStartedAt, setIntegrateStartedAt] = React.useState(null);
  const [elapsed, setElapsed] = React.useState(0);
  const batches = (Array.isArray(state.batches) ? state.batches : [])
    .filter((batch) => batch.projectId === projectId)
    .sort((a, b) => (pcTimeMs(b.createdAt) ?? 0) - (pcTimeMs(a.createdAt) ?? 0));
  const project = pcProjectById(projects, projectId);
  const busyAction = props.busy || {};

  React.useEffect(() => {
    setSelected((previous) => {
      if (previous.length === 0) return accepted.map((task) => task.id);
      const available = new Set(accepted.map((task) => task.id));
      return previous.filter((id) => available.has(id));
    });
    // acceptedKey 变化（新验收/合并）时重算勾选
  }, [acceptedKey]);

  React.useEffect(() => {
    if (!integrating) return undefined;
    const timer = setInterval(() => setElapsed(Date.now() - (integrateStartedAt || Date.now())), 1000);
    return () => clearInterval(timer);
  }, [integrating, integrateStartedAt]);

  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !integrating) props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose, integrating]);

  const toggleTask = (id) => {
    setSelected((previous) => (previous.includes(id) ? previous.filter((item) => item !== id) : previous.concat(id)));
  };

  const integrate = async () => {
    if (integrating || !projectId) return;
    setIntegrating(true);
    setIntegrateStartedAt(Date.now());
    setElapsed(0);
    try {
      const body = { projectId };
      if (selected.length > 0) body.taskIds = selected;
      const payload = await pcPost("/batch/integrate", body);
      const batch = payload && payload.batch ? payload.batch : payload;
      if (batch && (batch.status === "passed" || batch.status === "awaiting_confirmation")) {
        props.toast("success", `集成测试通过（批次 ${batch.id}），等待确认推送到 main`);
      } else if (batch && batch.status === "failed") {
        props.toast("error", `集成测试失败（批次 ${batch.id}），展开报告看命令输出`);
      } else {
        props.toast("success", `集成请求完成${batch && batch.id ? `（批次 ${batch.id}）` : ""}`);
      }
      props.onRefresh();
    } catch (error) {
      props.toast("error", pcFriendlyError(error));
    } finally {
      setIntegrating(false);
      setIntegrateStartedAt(null);
    }
  };

  const header = pcElement(
    "div",
    { className: "pc-drawer-head" },
    pcElement(
      "div",
      { className: "pc-drawer-head-text" },
      pcElement(
        "div",
        { className: "pc-drawer-eyebrow" },
        pcElement(PcBadge, { tone: "busy", icon: "layers" }, "集成与合并"),
      ),
      pcElement("div", { className: "pc-drawer-title" }, "在测试分支上集成，人工确认后推送到 main"),
      pcElement(
        "div",
        { className: "pc-drawer-sub" },
        pcElement("span", null, "流程：勾选已验收任务 → 发起集成 → 跑集成命令 → 通过后推送到 main → 需要时回滚"),
      ),
    ),
    pcElement(
      "button",
      { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭", "aria-label": "关闭集成面板", disabled: integrating },
      pcElement(PcIcon, { name: "close", size: 15 }),
    ),
  );

  const bodyChildren = [];
  bodyChildren.push(
    pcElement(
      "div",
      { key: "project", className: "pc-row", style: { justifyContent: "space-between" } },
      pcElement(
        "div",
        { className: "pc-row" },
        pcElement("span", { className: "pc-hint" }, "项目"),
        pcElement(
          PcSelect,
          {
            value: projectId,
            onChange: (value) => {
              setProjectId(value);
              setSelected([]);
            },
            style: { width: 220, height: 28 },
            disabled: integrating,
          },
          projects.length === 0 ? pcElement("option", { value: "" }, "（没有项目）") : null,
          projects.map((item) => pcElement("option", { key: item.id, value: item.id }, item.name)),
        ),
      ),
      project && project.integrationBranch
        ? pcElement("span", { className: "pc-hint pc-mono" }, `集成目标分支 ${project.integrationBranch}`)
        : null,
    ),
  );
  if (project && project.integrationTests && Array.isArray(project.integrationTests.commands) && project.integrationTests.commands.length > 0) {
    bodyChildren.push(
      pcElement(
        "div",
        { key: "cmds", className: "pc-hint pc-mono" },
        `集成命令：${project.integrationTests.commands.join(" · ")}`,
      ),
    );
  }
  if (integrating) {
    bodyChildren.push(
      pcElement(
        "div",
        { key: "busy", className: "pc-banner pc-banner--busy" },
        pcElement(PcSpinner, { size: 13 }),
        pcElement(
          "span",
          null,
          `集成测试运行中，不要关闭页面（已等待 ${pcFmtDuration(elapsed)}；可能 1-10 分钟）`,
        ),
      ),
    );
  }
  bodyChildren.push(
    pcElement(
      "div",
      { key: "select", className: "pc-section" },
      pcElement(PcSectionTitle, null, "可集成的已验收任务", `${accepted.length} 个`),
      accepted.length === 0
        ? pcElement(
            "div",
            { className: "pc-hint" },
            "当前项目没有「已验收」任务。先在验收中列点「验收」，任务才会进入可集成列表。",
          )
        : pcElement(
            "div",
            { className: "pc-select-list" },
            pcElement(
              "label",
              { className: "pc-check-row", style: { fontWeight: 600 } },
              pcElement("input", {
                type: "checkbox",
                className: "pc-check-input",
                checked: selected.length === accepted.length && accepted.length > 0,
                onChange: () => setSelected(selected.length === accepted.length ? [] : accepted.map((task) => task.id)),
                disabled: integrating,
              }),
              pcElement("span", { className: "pc-check-row-title" }, selected.length === accepted.length ? "取消全选" : "全选"),
              pcElement("span", { className: "pc-hint" }, `已选 ${selected.length}/${accepted.length}`),
            ),
            accepted.map((task) =>
              pcElement(
                "label",
                { key: task.id, className: "pc-check-row" },
                pcElement("input", {
                  type: "checkbox",
                  className: "pc-check-input",
                  checked: selected.includes(task.id),
                  onChange: () => toggleTask(task.id),
                  disabled: integrating,
                }),
                pcElement("span", { className: "pc-card-id" }, `#${task.id}`),
                pcElement("span", { className: "pc-check-row-title" }, task.title || "（未命名任务）"),
                task.size ? pcElement(PcChip, { mono: true }, pcWorkloadChipText(task)) : null,
                task.acceptance && task.acceptance.acceptedAt
                  ? pcElement("span", { className: "pc-hint" }, pcFmtDateTime(task.acceptance.acceptedAt))
                  : null,
              ),
            ),
          ),
    ),
  );
  bodyChildren.push(
    pcElement(
      "div",
      { key: "run", className: "pc-integrate-bar" },
      pcElement("span", { className: "pc-hint" }, `将集成 ${selected.length} 个任务（未勾选时按宿主默认=全部已验收）`),
      pcElement(
        PcButton,
        {
          variant: "primary",
          size: "md",
          icon: "layers",
          loading: integrating,
          disabled: integrating || !projectId || accepted.length === 0,
          onClick: integrate,
          testId: "pc-btn-integrate-run",
        },
        "发起集成",
      ),
    ),
  );
  bodyChildren.push(
    pcElement(
      "div",
      { key: "batches", className: "pc-section" },
      pcElement(PcSectionTitle, null, "最近批次", batches.length > 0 ? `${batches.length} 个` : null),
      batches.length === 0
        ? pcElement("div", { className: "pc-hint" }, "还没有集成批次。勾选已验收任务后点「发起集成」。")
        : batches.map((batch) =>
            pcElement(PcBatchCard, {
              key: batch.id,
              batch,
              projects,
              now: props.now,
              toast: props.toast,
              onRefresh: props.onRefresh,
              busy: Boolean(busyAction[`batch-${batch.id}`]),
            }),
          ),
    ),
  );

  return pcElement(
    "div",
    {
      className: "pc-drawer-mask",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget && !integrating) props.onClose();
      },
    },
    pcElement(
      "aside",
      { className: "pc-drawer pc-drawer--wide", "data-testid": "pc-integration", role: "dialog", "aria-label": "集成与合并", "aria-modal": "true" },
      header,
      pcElement("div", { className: "pc-drawer-body" }, bodyChildren),
    ),
  );
}
