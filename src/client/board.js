/**
 * 工程台 client：统计条、待澄清区、四列看板与任务卡片。
 */

/** 统计条的单个计数。 */
function PcStatCount(props) {
  const value = pcNum(props.value, 0);
  const tone = value > 0 && props.tone ? ` pc-stat-value--${props.tone}` : "";
  return React.createElement(
    "div",
    { className: "pc-stat", title: props.title },
    React.createElement("span", { className: "pc-stat-label" }, props.label),
    React.createElement("span", { className: `pc-stat-value${tone}` }, value),
  );
}

/** 统计条（CONTRACT.md §3.2）。 */
function PcStatBar(props) {
  const counters = props.counters;
  const slots = pcSlotStats(props.state);
  const disk = pcDiskStats(props.state);
  const pct = slots.budget > 0 ? Math.min(100, Math.round((slots.used / slots.budget) * 100)) : 0;
  const full = slots.budget > 0 && slots.used >= slots.budget;
  const lead = (props.state && props.state.lead) || null;
  const leadSessionId = (props.state && props.state.settings && props.state.settings.leadSessionId) || (lead && lead.sessionId);
  let leadLabel = "未创建";
  let leadTone = "idle";
  if (leadSessionId) {
    if (lead && lead.status === "running") {
      leadLabel = "运行中";
      leadTone = "busy";
    } else if (lead && lead.status === "idle") {
      leadLabel = "空闲";
      leadTone = "online";
    } else {
      leadLabel = "已创建";
      leadTone = "online";
    }
  }
  return React.createElement(
    "div",
    { className: "pc-statbar" },
    React.createElement(
      "div",
      { className: "pc-stat pc-stat--slots", "data-testid": "pc-stat-slots" },
      React.createElement("span", { className: "pc-stat-label" }, "槽位"),
      React.createElement("span", { className: `pc-stat-value${full ? " pc-stat-value--warn" : ""}` }, `${slots.used} / ${slots.budget}`),
      React.createElement(
        "div",
        { className: "pc-slot-bar", title: `全局槽位 ${slots.used}/${slots.budget}` },
        React.createElement("div", {
          className: full ? "pc-slot-bar-fill pc-slot-bar-fill--full" : "pc-slot-bar-fill",
          style: { width: `${pct}%` },
        }),
      ),
    ),
    React.createElement("div", { className: "pc-stat-sep" }),
    React.createElement(PcStatCount, { label: "待办", value: counters.todo, tone: "busy" }),
    React.createElement(PcStatCount, { label: "进行中", value: counters.running, tone: "busy" }),
    React.createElement(PcStatCount, { label: "验收中", value: counters.review, tone: "warn" }),
    React.createElement(PcStatCount, { label: "待澄清", value: counters.questions, tone: "warn" }),
    React.createElement(PcStatCount, { label: "已归档", value: counters.done, tone: "ok" }),
    React.createElement("div", { className: "pc-stat-sep" }),
    React.createElement(
      "div",
      { className: "pc-stat", title: "工程台数据目录磁盘占用" },
      React.createElement(PcIcon, { name: "hardDrive", size: 12, style: { color: "var(--dsw-alias-label-tertiary, #81858c)" } }),
      React.createElement("span", { className: "pc-stat-label" }, "磁盘"),
      React.createElement("span", { className: "pc-stat-value" }, `${pcFmtGB(disk.used)} / ${pcFmtGB(disk.budget)} GB`),
    ),
    React.createElement(
      "div",
      { className: "pc-statbar-right" },
      React.createElement(
        "span",
        { className: "pc-lead-state", title: "工程台 lead 会话状态" },
        React.createElement(PcDot, { tone: leadTone }),
        "工程台会话 · ",
        leadLabel,
      ),
    ),
  );
}

/** 单条待澄清问题（带本地回答输入态）。 */
function PcQuestionItem(props) {
  const question = props.question;
  const busy = Boolean(props.busy);
  const [answer, setAnswer] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const task = props.task || null;
  const projectName = pcProjectName(props.projects, question.projectId);
  const options = Array.isArray(question.options) ? question.options : [];
  const submit = () => {
    const text = answer.trim();
    if (text === "" || busy) return;
    props.onAnswer(question, text);
  };
  return React.createElement(
    "div",
    { className: "pc-question" },
    React.createElement(
      "div",
      { className: "pc-question-top" },
      React.createElement(PcBadge, { tone: "warn", icon: "help" }, "待回答"),
      React.createElement("span", null, projectName),
      task
        ? React.createElement(
            "button",
            {
              type: "button",
              className: "pc-chip pc-chip--clickable",
              onClick: () => props.onOpenTask(task.id),
              title: "打开任务详情",
            },
            `#${task.id} ${task.title || ""}`,
          )
        : null,
      React.createElement("span", { style: { marginLeft: "auto" } }, pcFmtRelative(question.askedAt, props.now)),
    ),
    React.createElement("div", { className: "pc-question-text" }, question.text || "（无文本）"),
    question.context ? React.createElement("div", { className: "pc-question-context" }, question.context) : null,
    React.createElement(
      "div",
      { className: "pc-question-reply" },
      options.length > 0
        ? React.createElement(
            "div",
            { className: "pc-question-options" },
            options.map((option) =>
              React.createElement(
                "button",
                {
                  key: option,
                  type: "button",
                  className: selected === option ? "pc-option-btn is-selected" : "pc-option-btn",
                  onClick: () => {
                    setSelected(option);
                    setAnswer(option);
                  },
                },
                option,
              ),
            ),
          )
        : null,
      React.createElement(
        "div",
        { className: "pc-question-input" },
        React.createElement(PcInput, {
          value: answer,
          placeholder: options.length > 0 ? "或输入自定义回答…" : "输入回答…",
          onChange: (value) => {
            setAnswer(value);
            setSelected(null);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          },
        }),
      ),
      React.createElement(
        PcButton,
        {
          variant: "primary",
          size: "sm",
          icon: "send",
          loading: busy,
          disabled: answer.trim() === "",
          onClick: submit,
          testId: "pc-question-answer",
        },
        "回复",
      ),
    ),
  );
}

/** 待澄清区（有 open 问题时置顶；无问题时渲染一个隐藏占位，保证 data-testid 存在）。 */
function PcQuestionsZone(props) {
  const questions = props.questions || [];
  if (questions.length === 0) {
    return React.createElement("section", { "data-testid": "pc-col-questions", style: { display: "none" } });
  }
  const tasks = props.tasks || [];
  return React.createElement(
    "section",
    { className: "pc-questions", "data-testid": "pc-col-questions", "aria-label": "待澄清问题" },
    React.createElement(
      "div",
      { className: "pc-questions-head" },
      React.createElement(PcIcon, { name: "help", size: 14 }),
      "待澄清",
      React.createElement(PcBadge, { tone: "warn" }, String(questions.length)),
      React.createElement("span", { style: { fontWeight: 400, opacity: 0.8 } }, "回答后任务会继续执行"),
    ),
    React.createElement(
      "div",
      { className: questions.length >= 2 ? "pc-questions-list pc-questions-list--two" : "pc-questions-list" },
      questions.map((question) =>
        React.createElement(PcQuestionItem, {
          key: question.id,
          question,
          task: tasks.find((task) => String(task.id) === String(question.taskId)) || null,
          projects: props.projects,
          now: props.now,
          busy: props.busy && props.busy[`question-${question.id}`],
          onAnswer: props.onAnswer,
          onOpenTask: props.onOpenDetail,
        }),
      ),
    ),
  );
}

/** diffStat 数字展示（+绿 / -红）。 */
function PcDiffStat(props) {
  const parsed = pcParseDiffStat(props.diffStat);
  if (!parsed) return null;
  return React.createElement(
    "span",
    { className: "pc-metric", title: "diff 增删行数" },
    React.createElement("span", { className: "pc-diff-add" }, `+${parsed.added}`),
    React.createElement("span", { style: { opacity: 0.55 } }, "/"),
    React.createElement("span", { className: "pc-diff-del" }, `-${parsed.deleted}`),
  );
}

/** 任务卡片（四列共用，按列渲染不同信息与操作）。 */
function PcTaskCard(props) {
  const task = props.task;
  const column = props.column;
  const busy = props.busy || {};
  const id = task.id;
  const meta = pcStatusMeta(task.status);
  const lastRun = pcTaskLastRun(task, props.runs);
  const projectName = pcProjectName(props.projects, task.projectId);
  const showProject = !props.selectedProject;
  const sessionId = pcTaskSessionId(task);
  const canSession = Boolean(sessionId);
  const live = (props.live && props.live[id]) || null;
  const latestEvent = pcLatestEvent(live && live.events);
  const isBusy = (key) => Boolean(busy[`${key}-${id}`]);

  const open = () => props.onOpenDetail(task.id);
  const actions = [];

  if (column === "todo") {
    actions.push(
      React.createElement(
        PcButton,
        {
          key: "dispatch",
          variant: "primary",
          size: "sm",
          icon: "play",
          loading: isBusy("dispatch"),
          onClick: () => props.onTaskAction("dispatch", task),
          testId: "pc-task-dispatch",
          title: "建 worktree + 会话并派发任务",
        },
        "派发",
      ),
      React.createElement(
        PcButton,
        { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open", title: "查看任务详情" },
        "详情",
      ),
      React.createElement(
        PcButton,
        {
          key: "abandon",
          variant: "danger",
          size: "sm",
          loading: isBusy("abandon"),
          onClick: () => props.onTaskAction("abandon", task),
          testId: "pc-task-abandon",
          title: "放弃任务并清理 worktree",
        },
        "放弃",
      ),
      React.createElement(
        "div",
        { key: "prio", className: "pc-card-prio-btns" },
        React.createElement(
          PcButton,
          {
            variant: "ghost",
            size: "sm",
            iconOnly: true,
            loading: isBusy("priority-up"),
            onClick: () => props.onTaskAction("priority-up", task),
            title: "提高优先级",
            testId: "pc-task-priority-up",
          },
          React.createElement(PcIcon, { name: "arrowUp", size: 11 }),
        ),
        React.createElement(
          PcButton,
          {
            variant: "ghost",
            size: "sm",
            iconOnly: true,
            loading: isBusy("priority-down"),
            onClick: () => props.onTaskAction("priority-down", task),
            title: "降低优先级",
            testId: "pc-task-priority-down",
          },
          React.createElement(PcIcon, { name: "arrowDown", size: 11 }),
        ),
      ),
    );
  } else if (column === "running") {
    actions.push(
      React.createElement(
        PcButton,
        {
          key: "transcript",
          variant: "secondary",
          size: "sm",
          icon: "history",
          disabled: !canSession,
          onClick: () => props.onViewTranscript(task),
          testId: "pc-btn-view-transcript",
          title: canSession ? "查看任务完整会话记录（隐藏会话，不跳 native）" : "任务还没有会话",
        },
        "会话记录",
      ),
      React.createElement(PcButton, { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open" }, "详情"),
      React.createElement(
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
  } else if (column === "review") {
    actions.push(
      React.createElement(
        PcButton,
        {
          key: "accept",
          variant: "success",
          size: "sm",
          icon: "check",
          loading: isBusy("accept"),
          onClick: () => props.onTaskAction("accept", task),
          testId: "pc-task-accept",
          title: "验收通过：宿主 squash 提交到任务分支",
        },
        "验收",
      ),
      React.createElement(
        PcButton,
        {
          key: "rework",
          variant: "danger",
          size: "sm",
          icon: "undo",
          onClick: () => props.onTaskAction("rework", task),
          testId: "pc-task-rework",
          title: "打回并附上返工意见",
        },
        "打回",
      ),
      task.status === "needs_review"
        ? React.createElement(
            PcButton,
            {
              key: "request-review",
              variant: "secondary",
              size: "sm",
              icon: "robot",
              loading: isBusy("request-review"),
              onClick: () => props.onTaskAction("request-review", task),
              testId: "pc-btn-request-review",
              title: "让工程台 lead 用 project_accept / project_rework 重新验收一次",
            },
            "让工程台验收",
          )
        : null,
      React.createElement(
        PcButton,
        {
          key: "transcript",
          variant: "ghost",
          size: "sm",
          icon: "history",
          disabled: !canSession,
          onClick: () => props.onViewTranscript(task),
          testId: "pc-btn-view-transcript",
          title: canSession ? "查看任务完整会话记录（隐藏会话，不跳 native）" : "任务还没有会话",
        },
        "会话记录",
      ),
      React.createElement(
        PcButton,
        {
          key: "verify",
          variant: "ghost",
          size: "sm",
          icon: "terminal",
          loading: isBusy("verify"),
          onClick: () => props.onTaskAction("verify", task),
          title: "宿主在 worktree 里复跑 verify 命令",
        },
        "复跑",
      ),
      React.createElement(PcButton, { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open" }, "详情"),
      React.createElement(
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
  } else {
    actions.push(
      React.createElement(PcButton, { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open" }, "详情"),
    );
    if (task.status !== "abandoned") {
      actions.push(
        React.createElement(
          PcButton,
          {
            key: "batch",
            variant: "ghost",
            size: "sm",
            icon: "layers",
            onClick: () => props.onOpenIntegration(task.projectId),
            title: "查看集成批次",
          },
          "查集成批次",
        ),
      );
    }
  }

  const selfTestRaw = lastRun && lastRun.selfTest ? pcSelfTestText(lastRun.selfTest) : null;
  const selfTest = selfTestRaw && selfTestRaw.total > 0 ? selfTestRaw : null;
  const driftWarn = Boolean(lastRun && lastRun.drift && lastRun.drift.mainRepoChanged);
  const canResume = task.status === "abandoned" || task.status === "failed";
  const reasonBlock = canResume
    ? React.createElement(PcReasonBlock, {
        task,
        clamp: true,
        resumeBusy: isBusy("resume"),
        onResume: () => props.onTaskAction("resume", task),
      })
    : null;

  const top = React.createElement(
    "div",
    { className: "pc-card-top" },
    React.createElement("span", { className: "pc-card-id" }, `#${id}`),
    task.status === "verifying"
      ? React.createElement(
          PcChip,
          { className: "pc-chip-verifying", title: "工程台 super agent 正在验收（人工可覆盖）" },
          React.createElement(PcSpinner, { size: 9 }),
          "验收中",
        )
      : React.createElement(
          PcBadge,
          { tone: meta.tone, icon: task.status === "failed" ? "alert" : task.status === "needs_input" ? "help" : undefined },
          meta.label,
        ),
    column === "todo" && pcNum(task.priority, null) !== null
      ? React.createElement("span", { className: "pc-card-prio", title: "优先级（数字越大越先派发）" }, `P${pcNum(task.priority, 0)}`)
      : null,
    column === "done"
      ? React.createElement(
          "button",
          {
            type: "button",
            className: "pc-icon-btn pc-card-del",
            title: "彻底删除任务（不可恢复）",
            "aria-label": "彻底删除任务",
            "data-testid": "pc-btn-delete",
            onClick: (event) => {
              event.stopPropagation();
              props.onDeleteTask(task);
            },
          },
          React.createElement(PcIcon, { name: "trash", size: 13 }),
        )
      : null,
  );

  const sub = [];
  if (showProject) sub.push(React.createElement("span", { key: "p", className: "pc-card-project" }, projectName));
  if (column === "todo") {
    sub.push(React.createElement(PcChip, { key: "t", mono: true }, task.type || "—"));
    const sizeMeta = pcSizeSourceMeta(task);
    sub.push(
      React.createElement(
        PcChip,
        { key: "s", mono: true, tone: sizeMeta.tone || undefined, title: sizeMeta.title },
        pcWorkloadChipText(task),
      ),
    );
    if (pcNum(task.slots, null) !== null) sub.push(React.createElement(PcChip, { key: "sl", mono: true }, `槽 ${task.slots}`));
    if (Array.isArray(task.dependsOn) && task.dependsOn.length > 0) {
      sub.push(React.createElement(PcChip, { key: "d", tone: "warn", mono: true }, `依赖 ${task.dependsOn.map((x) => `#${x}`).join(" ")}`));
    }
    if (Array.isArray(task.touches) && task.touches.length > 0) {
      sub.push(
        React.createElement(
          "span",
          { key: "touch", className: "pc-card-branch", title: task.touches.join("\n") },
          task.touches.slice(0, 2).join(" · ") + (task.touches.length > 2 ? ` +${task.touches.length - 2}` : ""),
        ),
      );
    }
  } else if (column === "running") {
    if (pcNum(task.slots, null) !== null) sub.push(React.createElement(PcChip, { key: "sl", mono: true }, `槽 ${task.slots}`));
    const runSizeMeta = pcSizeSourceMeta(task);
    sub.push(
      React.createElement(
        PcChip,
        { key: "wl", mono: true, tone: runSizeMeta.tone || undefined, title: runSizeMeta.title },
        `工作量 ${pcWorkloadLabel(task.size)}`,
      ),
    );
    sub.push(
      React.createElement(
        "span",
        { key: "dur", className: "pc-metric", title: "本次运行时长" },
        React.createElement(PcIcon, { name: "clock", size: 10 }),
        pcRunDuration(lastRun, props.now),
      ),
    );
    if (task.branch) sub.push(React.createElement("span", { key: "b", className: "pc-card-branch" }, task.branch));
  } else if (column === "review") {
    if (selfTest) {
      sub.push(
        React.createElement(
          "span",
          { key: "st", className: selfTest.allPassed ? "pc-metric pc-metric--ok" : "pc-metric pc-metric--err", title: "selfTest 通过数/总数" },
          `测试 ${selfTest.passed}/${selfTest.total}`,
        ),
      );
    }
    sub.push(React.createElement(PcDiffStat, { key: "diff", diffStat: lastRun && lastRun.diffStat }));
    if (lastRun && pcNum(lastRun.filesChanged, 0) > 0) {
      sub.push(React.createElement("span", { key: "f", className: "pc-metric" }, `${lastRun.filesChanged} 文件`));
    }
    if (task.branch) sub.push(React.createElement("span", { key: "b", className: "pc-card-branch" }, task.branch));
  } else {
    if (task.acceptance && task.acceptance.acceptedAt) {
      sub.push(React.createElement("span", { key: "acc" }, `验收 ${pcFmtDateTime(task.acceptance.acceptedAt)}`));
    }
    const batch = props.batchOfTask ? props.batchOfTask(task) : null;
    if (batch) sub.push(React.createElement(PcChip, { key: "bch", mono: true, tone: batch.status === "failed" ? "danger" : undefined }, `批次 ${batch.id} · ${pcBatchMeta(batch.status).label}`));
  }

  const attachmentCount = pcTaskAttachments(task).length;
  if (attachmentCount > 0) {
    sub.push(
      React.createElement(
        PcChip,
        { key: "att", title: "任务附带的参考截图（详情里可看）" },
        `参考图 ${attachmentCount}`,
      ),
    );
  }

  const rows = [];
  rows.push(top);
  rows.push(React.createElement("div", { className: "pc-card-title", title: task.title || "" }, task.title || "（未命名任务）"));
  if (sub.length > 0) rows.push(React.createElement("div", { className: "pc-card-sub" }, sub));
  if (column === "running") {
    rows.push(
      React.createElement(
        "div",
        { className: "pc-card-event", title: latestEvent ? `${latestEvent.type || ""} ${latestEvent.brief || ""}` : "" },
        React.createElement(PcIcon, { name: "terminal", size: 11, style: { opacity: 0.7 } }),
        React.createElement(
          "span",
          { className: "pc-card-event-text" },
          task.status === "needs_input" ? "等待澄清回答后继续" : latestEvent ? latestEvent.brief || latestEvent.summary || latestEvent.type : "等待会话事件…",
        ),
      ),
    );
  }
  if (task.status === "verifying") {
    rows.push(
      React.createElement(
        "div",
        { className: "pc-card-verifying" },
        React.createElement(PcSpinner, { size: 10 }),
        React.createElement("span", null, "工程台验收中…（可人工覆盖）"),
      ),
    );
  }
  if (driftWarn) {
    rows.push(
      React.createElement(
        "div",
        { className: "pc-card-warn" },
        React.createElement(PcIcon, { name: "alert", size: 11 }),
        React.createElement("span", null, "主仓在任务执行期间有变更（drift），验收前注意对比"),
      ),
    );
  }
  if (reasonBlock) {
    rows.push(reasonBlock);
  }
  rows.push(React.createElement("div", { className: "pc-card-actions" }, actions));

  return React.createElement(
    "div",
    {
      className: `pc-card${column === "done" ? " pc-card--done" : ""}${task.status === "failed" ? " pc-card--failed" : ""}${task.status === "abandoned" ? " pc-card--abandoned" : ""}${task.status === "verifying" ? " pc-card--verifying" : ""}`,
      "data-testid": `pc-task-${id}`,
      onClick: open,
      onKeyDown: (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      },
      role: "button",
      tabIndex: 0,
      "aria-label": `任务 #${id} ${task.title || ""}`,
    },
    rows,
  );
}

/** 单列看板。 */
function PcColumn(props) {
  const def = props.def;
  const isReviewColumn = def.key === "review";
  const hasVerifying = isReviewColumn && pcNum(props.verifyingCount, 0) > 0;
  // 验收列无条件叫「验收中」（用户要求：空列也写「验收中 0」）
  const title = def.title;
  let subtitle = null;
  if (isReviewColumn && props.tasks.length > 0) {
    subtitle = hasVerifying ? "工程台 super agent 正在审查证据" : "可点「让工程台验收」或人工验收";
  }
  return React.createElement(
    "section",
    { className: "pc-col", "data-testid": `pc-col-${def.key}`, "aria-label": `${title}列` },
    React.createElement(
      "div",
      { className: "pc-col-head" },
      React.createElement("span", { className: `pc-col-dot pc-col-dot--${def.tone}` }),
      React.createElement("span", { className: "pc-col-title" }, title),
      React.createElement("span", { className: "pc-col-count" }, String(props.tasks.length)),
      subtitle
        ? React.createElement(
            "div",
            { className: `pc-col-sub${hasVerifying ? " pc-col-sub--verifying" : ""}`, "data-testid": "pc-col-sub" },
            subtitle,
          )
        : null,
    ),
    React.createElement(
      "div",
      { className: "pc-col-body" },
      props.tasks.length === 0
        ? React.createElement("div", { className: "pc-empty-col" }, def.empty)
        : props.tasks.map((task) =>
            React.createElement(PcTaskCard, {
              key: task.id,
              task,
              column: def.key,
              projects: props.projects,
              runs: props.runs,
              selectedProject: props.selectedProject,
              busy: props.busy,
              live: props.live,
              now: props.now,
              batchOfTask: props.batchOfTask,
              onTaskAction: props.onTaskAction,
              onOpenDetail: props.onOpenDetail,
              onViewTranscript: props.onViewTranscript,
              onOpenIntegration: props.onOpenIntegration,
              onDeleteTask: props.onDeleteTask,
              onCancelTask: props.onCancelTask,
            }),
          ),
    ),
  );
}

/** 四列看板。 */
function PcBoard(props) {
  const state = props.state;
  const runs = state && Array.isArray(state.runs) ? state.runs : [];
  const batches = state && Array.isArray(state.batches) ? state.batches : [];
  const tasks = pcTasksOf(state, props.selectedProject);
  const batchOfTask = React.useMemo(() => {
    return (task) => {
      const list = batches.filter((batch) => Array.isArray(batch.taskIds) && batch.taskIds.some((tid) => String(tid) === String(task.id)));
      if (list.length === 0) return null;
      return list.slice().sort((a, b) => (pcTimeMs(b.createdAt) ?? 0) - (pcTimeMs(a.createdAt) ?? 0))[0];
    };
  }, [batches]);
  return React.createElement(
    "div",
    { className: "pc-board" },
    PC_COLUMN_DEFS.map((def) => {
      const columnTasks = pcSortColumn(
        def.key,
        tasks.filter((task) => def.statuses.includes(task.status)),
      );
      const verifyingCount = def.key === "review" ? columnTasks.filter((task) => task.status === "verifying").length : 0;
      return React.createElement(PcColumn, {
        key: def.key,
        def,
        tasks: columnTasks,
        verifyingCount,
        projects: state.projects,
        runs,
        selectedProject: props.selectedProject,
        busy: props.busy,
        live: props.live,
        now: props.now,
        batchOfTask,
        onTaskAction: props.onTaskAction,
        onOpenDetail: props.onOpenDetail,
        onViewTranscript: props.onViewTranscript,
        onOpenIntegration: props.onOpenIntegration,
        onDeleteTask: props.onDeleteTask,
        onCancelTask: props.onCancelTask,
      });
    }),
  );
}
