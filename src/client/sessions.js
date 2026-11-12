/**
 * 工程台 client：会话面板 + 工程台对话抽屉。
 *
 * 背景：任务会话是隐藏会话（侧栏不出现），lead 也改为隐藏会话，
 * native UI 打不开它们，所以：
 *   - 会话面板：lead 行「打开对话」→ 页面内对话抽屉；任务会话行「查看日志」+「隐藏」。
 *   - 对话抽屉：轮询 GET /lead/transcript 展示对话、POST /lead/prompt 发送。
 */

/** 单条对话消息。 */
function PcChatMessage(props) {
  const message = props.message || {};
  const role = typeof message.role === "string" ? message.role : "assistant";
  const meta = pcChatRoleMeta(role);
  const text = message.text === null || message.text === undefined ? "" : String(message.text);
  const isTool = role === "tool";
  return React.createElement(
    "div",
    { className: `pc-chat-msg pc-chat-msg--${role}`, "data-testid": "pc-chat-msg" },
    React.createElement(
      "div",
      { className: "pc-chat-msg-head" },
      React.createElement("span", { className: `pc-chat-role pc-chat-role--${meta.tone}` }, meta.label),
      message.time ? React.createElement("span", { className: "pc-chat-time" }, pcFmtClock(message.time)) : null,
      message.type ? React.createElement("span", { className: "pc-chat-type", title: String(message.type) }, String(message.type)) : null,
    ),
    React.createElement("div", { className: "pc-chat-text", title: isTool ? text : undefined }, text),
  );
}

/** 工程台对话抽屉（lead 隐藏会话的替代入口）。 */
function PcLeadChatDrawer(props) {
  const state = props.state || {};
  const lead = state.lead || {};
  const statusMeta = pcSessionStatusMeta(lead.status || (state.settings && state.settings.leadStatus) || "unknown");
  const sessionId = pcLeadSessionId(state);
  const [messages, setMessages] = React.useState([]);
  const [phase, setPhase] = React.useState("loading");
  const [error, setError] = React.useState(null);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [syncedAt, setSyncedAt] = React.useState(null);
  const listRef = React.useRef(null);
  const cancelledRef = React.useRef(false);
  const toast = props.toast;

  // 每 1.5s 轮询对话
  React.useEffect(() => {
    cancelledRef.current = false;
    let timer = null;
    const load = async () => {
      try {
        const payload = await pcGetLeadTranscript();
        if (cancelledRef.current) return;
        setMessages(Array.isArray(payload.messages) ? payload.messages : []);
        setPhase("ready");
        setError(null);
        setSyncedAt(Date.now());
      } catch (fetchError) {
        if (cancelledRef.current) return;
        setError(fetchError);
        setPhase((previous) => (previous === "ready" ? "ready" : "error"));
      } finally {
        if (!cancelledRef.current) timer = setTimeout(load, 1500);
      }
    };
    load();
    return () => {
      cancelledRef.current = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  // 新消息自动滚到最底
  React.useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !sending) props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose, sending]);

  const refreshOnce = async () => {
    try {
      const payload = await pcGetLeadTranscript();
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setPhase("ready");
      setError(null);
      setSyncedAt(Date.now());
    } catch {
      /* 轮询会继续重试 */
    }
  };

  const send = async () => {
    const value = text.trim();
    if (value === "" || sending) return;
    setSending(true);
    setText("");
    try {
      await pcPost("/lead/prompt", { text: value });
      toast("success", "已发送给工程台会话");
      await refreshOnce();
      if (props.onPrompted) props.onPrompted();
    } catch (sendError) {
      setText(value);
      toast("error", pcFriendlyError(sendError));
    } finally {
      setSending(false);
    }
  };

  const bodyChildren = [];
  if (phase === "error" && error) {
    bodyChildren.push(
      React.createElement(
        "div",
        { className: "pc-error-box", key: "error", style: { margin: "12px 16px" } },
        `读取对话失败：${error.message}（宿主 /lead/transcript 暂不可用时会持续重试）`,
      ),
    );
  }
  bodyChildren.push(
    React.createElement(
      "div",
      { className: "pc-chat-list", key: "list", ref: listRef },
      messages.length === 0
        ? React.createElement(
            "div",
            { className: "pc-panel-empty pc-chat-empty" },
            React.createElement("div", { className: "pc-empty-icon" }, React.createElement(PcIcon, { name: "chat", size: 20 })),
            React.createElement("div", { className: "pc-empty-title", style: { fontSize: 13.5 } }, phase === "loading" ? "正在读取对话…" : "还没有对话记录"),
            React.createElement(
              "div",
              { className: "pc-empty-desc", style: { fontSize: 11.5 } },
              phase === "loading" ? "GET /lead/transcript" : "在下面输入框给工程台发第一条指令，比如「用一句话说明当前看板状态」。",
            ),
          )
        : messages.map((message, index) =>
            React.createElement(PcChatMessage, { key: `${index}-${message.time || ""}`, message }),
          ),
    ),
  );
  bodyChildren.push(
    React.createElement(
      "div",
      { className: "pc-chat-composer", key: "composer" },
      React.createElement(PcTextarea, {
        value: text,
        onChange: setText,
        onKeyDown: (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        },
        rows: 3,
        disabled: sending,
        placeholder: "给工程台发消息…（Enter 发送，Shift+Enter 换行）\n例如：用一句话说明当前看板状态。",
        testId: "pc-chat-input",
      }),
      React.createElement(
        "div",
        { className: "pc-chat-composer-row" },
        React.createElement(
          "span",
          { className: "pc-hint" },
          `自动刷新 1.5s${syncedAt ? ` · 同步于 ${pcFmtClock(new Date(syncedAt).toISOString())}` : ""}`,
        ),
        React.createElement(
          PcButton,
          { variant: "primary", size: "sm", icon: "send", loading: sending, disabled: text.trim() === "", onClick: send, testId: "pc-chat-send" },
          "发送",
        ),
      ),
    ),
  );

  return React.createElement(
    "div",
    {
      className: "pc-drawer-mask",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget && !sending) props.onClose();
      },
    },
    React.createElement(
      "aside",
      { className: "pc-drawer pc-drawer--chat", "data-testid": "pc-lead-chat", role: "dialog", "aria-label": "工程台对话", "aria-modal": "true" },
      React.createElement(
        "div",
        { className: "pc-drawer-head" },
        React.createElement(
          "div",
          { className: "pc-drawer-head-text" },
          React.createElement(
            "div",
            { className: "pc-drawer-eyebrow" },
            React.createElement(PcBadge, { tone: "busy", icon: "robot" }, "工程台 · super agent"),
            React.createElement(PcDot, { tone: statusMeta.tone }),
            React.createElement("span", { className: "pc-hint" }, statusMeta.label),
            lead.hidden === true ? React.createElement(PcChip, {}, "隐藏会话") : null,
          ),
          React.createElement("div", { className: "pc-drawer-title" }, "工程台对话"),
          React.createElement(
            "div",
            { className: "pc-drawer-sub" },
            sessionId ? React.createElement("span", { className: "pc-mono" }, pcShortSession(sessionId)) : null,
            React.createElement("span", null, "对话记录来自 /lead/transcript，发送会直接驱动 lead"),
          ),
        ),
        React.createElement(
          "button",
          { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭对话", "aria-label": "关闭对话", disabled: sending },
          React.createElement(PcIcon, { name: "close", size: 15 }),
        ),
      ),
      React.createElement("div", { className: "pc-drawer-body pc-chat-body" }, bodyChildren),
    ),
  );
}

/** 单个会话行。 */
function PcSessionRow(props) {
  const session = props.session;
  const state = props.state || {};
  const statusMeta = pcSessionStatusMeta(session.status);
  const isLead = session.kind === "lead";
  const project = pcProjectById(state.projects, session.projectId);
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const task =
    session.taskId === null || session.taskId === undefined
      ? null
      : tasks.find((item) => String(item.id) === String(session.taskId)) || null;
  const title = (task && task.title) || session.title || pcSessionTitle(session);
  const lastEvent = session.lastEvent && typeof session.lastEvent === "object" ? session.lastEvent : null;
  const eventText = lastEvent
    ? `${lastEvent.type ? `${lastEvent.type} · ` : ""}${lastEvent.summary || ""}`
    : "暂无会话事件";
  const [hiding, setHiding] = React.useState(false);
  const hide = async () => {
    if (hiding) return;
    setHiding(true);
    try {
      await props.onHideSession(session);
    } finally {
      setHiding(false);
    }
  };
  return React.createElement(
    "div",
    {
      className: `pc-session-row${props.highlight ? " is-highlight" : ""}`,
      "data-testid": `pc-session-${session.id}`,
    },
    React.createElement(
      "div",
      { className: "pc-session-top" },
      React.createElement(
        PcBadge,
        { tone: isLead ? "busy" : "idle", icon: isLead ? "robot" : "terminal" },
        isLead ? "工程台" : `任务 #${session.taskId !== null && session.taskId !== undefined ? session.taskId : "?"}`,
      ),
      React.createElement("span", { className: "pc-session-title", title }, title),
      React.createElement(
        "span",
        { className: "pc-session-state" },
        React.createElement(PcDot, { tone: statusMeta.tone }),
        statusMeta.label,
        React.createElement("span", { className: "pc-session-time" }, pcSessionTimeText(session, props.now)),
      ),
    ),
    React.createElement(
      "div",
      { className: "pc-session-meta" },
      React.createElement("span", null, isLead ? "工程台" : project ? project.name : session.projectId || "—"),
      React.createElement("span", { className: "pc-mono" }, pcShortSession(session.id)),
      session.hidden ? React.createElement("span", { className: "pc-chip" }, "隐藏会话") : null,
    ),
    React.createElement(
      "div",
      { className: "pc-session-event", title: eventText },
      React.createElement(PcIcon, { name: "terminal", size: 11, style: { opacity: 0.7 } }),
      React.createElement("span", { className: "pc-session-event-text" }, eventText),
    ),
    React.createElement(
      "div",
      { className: "pc-session-actions" },
      isLead
        ? React.createElement(
            PcButton,
            {
              variant: "primary",
              size: "sm",
              icon: "chat",
              onClick: () => props.onOpenLeadChat(),
              title: "在工程台页面内打开对话（lead 是隐藏会话，native 聊天打不开）",
              testId: "pc-session-open-chat",
            },
            "打开对话",
          )
        : React.createElement(
            PcButton,
            {
              variant: "secondary",
              size: "sm",
              icon: "history",
              onClick: () => props.onViewLog(session),
              title: "打开任务详情并定位到会话事件",
            },
            "查看日志",
          ),
      isLead
        ? null
        : React.createElement(
            PcButton,
            {
              variant: "ghost",
              size: "sm",
              icon: "hide",
              loading: hiding,
              disabled: hiding,
              onClick: hide,
              title: "隐藏会话（侧栏不再显示，数据保留）",
              testId: "pc-btn-hide-session",
            },
            "隐藏",
          ),
    ),
  );
}

/** 会话面板（右侧抽屉）。 */
function PcSessionsDrawer(props) {
  const state = props.state || {};
  const sessions = pcSortSessions(pcSessionList(state));
  const runningCount = sessions.filter((session) => session.status === "running").length;
  const leadSession = sessions.find((session) => session.kind === "lead") || null;
  const highlightId = props.highlightSessionId || null;

  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose]);

  const bodyChildren = [];
  if (sessions.length === 0) {
    bodyChildren.push(
      React.createElement(
        "div",
        { className: "pc-panel-empty", key: "empty" },
        React.createElement("div", { className: "pc-empty-icon pc-empty-icon--warn" }, React.createElement(PcIcon, { name: "chat", size: 22 })),
        React.createElement("div", { className: "pc-empty-title", style: { fontSize: 14 } }, "宿主还没有提供会话列表"),
        React.createElement(
          "div",
          { className: "pc-empty-desc", style: { fontSize: 12 } },
          "GET /state.sessions 为空或尚未提供。host 更新后这里会自动出现工程台会话与任务会话；任务会话是隐藏会话，左栏不再显示。",
        ),
        React.createElement(PcButton, { variant: "secondary", size: "sm", icon: "refresh", onClick: props.onRefresh }, "刷新"),
      ),
    );
  } else {
    bodyChildren.push(
      React.createElement(
        "div",
        { className: "pc-session-list", key: "list" },
        sessions.map((session) =>
          React.createElement(PcSessionRow, {
            key: session.id,
            session,
            state,
            now: props.now,
            highlight: highlightId !== null && String(session.id) === String(highlightId),
            onOpenLeadChat: props.onOpenLeadChat,
            onViewLog: props.onViewLog,
            onHideSession: props.onHideSession,
          }),
        ),
      ),
    );
  }

  return React.createElement(
    "div",
    {
      className: "pc-drawer-mask",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) props.onClose();
      },
    },
    React.createElement(
      "aside",
      { className: "pc-drawer", "data-testid": "pc-sessions", role: "dialog", "aria-label": "会话", "aria-modal": "true" },
      React.createElement(
        "div",
        { className: "pc-drawer-head" },
        React.createElement(
          "div",
          { className: "pc-drawer-head-text" },
          React.createElement(
            "div",
            { className: "pc-drawer-eyebrow" },
            React.createElement(PcBadge, { tone: "busy", icon: "chat" }, "会话"),
            leadSession ? React.createElement(PcBadge, { tone: "idle", icon: "robot" }, "工程台会话已创建") : null,
          ),
          React.createElement("div", { className: "pc-drawer-title" }, "工程台会话与任务会话"),
          React.createElement(
            "div",
            { className: "pc-drawer-sub" },
            React.createElement(
              "span",
              null,
              `${sessions.length} 个会话${runningCount > 0 ? ` · ${runningCount} 个运行中` : ""} · 会话都是隐藏会话，只能从这里访问`,
            ),
          ),
        ),
        React.createElement(
          "button",
          { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭", "aria-label": "关闭会话面板" },
          React.createElement(PcIcon, { name: "close", size: 15 }),
        ),
      ),
      React.createElement("div", { className: "pc-drawer-body" }, bodyChildren),
    ),
  );
}

/** 会话记录里的一条消息（复用对话气泡样式，role 文案换成任务语境）。 */
function PcTranscriptMessage(props) {
  const message = props.message || {};
  const role = typeof message.role === "string" ? message.role : "assistant";
  const meta = pcTranscriptRoleMeta(role);
  const text = message.text === null || message.text === undefined ? "" : String(message.text);
  const isTool = role === "tool";
  return React.createElement(
    "div",
    { className: `pc-chat-msg pc-chat-msg--${role}`, "data-testid": "pc-transcript-msg" },
    React.createElement(
      "div",
      { className: "pc-chat-msg-head" },
      React.createElement("span", { className: `pc-chat-role pc-chat-role--${meta.tone}` }, meta.label),
      message.time ? React.createElement("span", { className: "pc-chat-time" }, pcFmtClock(message.time)) : null,
      message.type ? React.createElement("span", { className: "pc-chat-type", title: String(message.type) }, String(message.type)) : null,
    ),
    React.createElement("div", { className: "pc-chat-text", title: isTool ? text : undefined }, text),
  );
}

/**
 * 任务会话记录抽屉（只读，替代打不开的 native 隐藏会话）。
 * 多 run 时顶部有 chips；最新 run 运行中时每 3s 轮询。
 */
function PcSessionViewerDrawer(props) {
  const taskId = props.taskId;
  const state = props.state || {};
  const task = (Array.isArray(state.tasks) ? state.tasks : []).find((item) => String(item.id) === String(taskId)) || null;
  const project = task ? pcProjectById(state.projects, task.projectId) : null;
  const [selectedRunId, setSelectedRunId] = React.useState(null);
  const [payload, setPayload] = React.useState({ phase: "loading", data: null, error: null });
  const listRef = React.useRef(null);
  const loadRef = React.useRef(null);

  const load = React.useCallback(
    async (silent) => {
      if (!silent) setPayload((previous) => ({ phase: previous.data ? "ready" : "loading", data: previous.data, error: null }));
      try {
        const data = await pcGetTaskTranscript(taskId, selectedRunId);
        setPayload({ phase: "ready", data, error: null });
      } catch (error) {
        setPayload((previous) => ({ phase: previous.data ? "ready" : "error", data: previous.data, error }));
      }
    },
    [taskId, selectedRunId],
  );
  loadRef.current = load;

  React.useEffect(() => {
    setPayload({ phase: "loading", data: null, error: null });
    let cancelled = false;
    const run = async () => {
      try {
        const data = await pcGetTaskTranscript(taskId, selectedRunId);
        if (!cancelled) setPayload({ phase: "ready", data, error: null });
      } catch (error) {
        if (!cancelled) setPayload((previous) => ({ phase: previous.data ? "ready" : "error", data: previous.data, error }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [taskId, selectedRunId]);

  const data = payload.data;
  const runs = data && Array.isArray(data.runs) ? data.runs : [];
  const messages = data && Array.isArray(data.messages) ? data.messages : [];
  const latestRun = runs.length > 0 ? runs[0] : null;
  const latestRunning = Boolean(latestRun && latestRun.status === "running");
  const activeRunId = selectedRunId !== null ? selectedRunId : latestRun ? latestRun.runId : null;
  const activeRun = runs.find((run) => String(run.runId) === String(activeRunId)) || latestRun;
  const runMeta = pcRunStatusMeta(activeRun ? activeRun.status : "unknown");
  const sessionId = (data && data.sessionId) || (task ? task.sessionId : "") || "";

  // 最新 run 还在跑时才轮询
  React.useEffect(() => {
    if (!latestRunning) return undefined;
    const timer = setInterval(() => {
      if (loadRef.current) loadRef.current(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [latestRunning, taskId, selectedRunId]);

  // 消息变化自动滚到底
  React.useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, activeRunId]);

  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose]);

  const bodyChildren = [];
  if (runs.length > 0) {
    bodyChildren.push(
      React.createElement(
        "div",
        { className: "pc-run-tabs", key: "tabs" },
        runs.map((run) =>
          React.createElement(
            "button",
            {
              key: run.runId,
              type: "button",
              className: String(run.runId) === String(activeRunId) ? "pc-run-tab is-active" : "pc-run-tab",
              "data-testid": "pc-run-tab",
              onClick: () => setSelectedRunId(run.runId),
              title: run.sessionId ? `会话 ${run.sessionId}` : undefined,
            },
            pcRunTabLabel(run),
          ),
        ),
      ),
    );
  }
  if (payload.error) {
    bodyChildren.push(
      React.createElement(
        "div",
        { className: "pc-error-box", key: "err" },
        `读取会话记录失败：${payload.error.message}（隐藏会话记录来自 /task/transcript）`,
      ),
    );
  }
  bodyChildren.push(
    React.createElement(
      "div",
      { className: "pc-transcript-list", key: "list", ref: listRef },
      messages.length === 0
        ? React.createElement(
            "div",
            { className: "pc-panel-empty pc-transcript-empty" },
            React.createElement("div", { className: "pc-empty-icon" }, React.createElement(PcIcon, { name: "history", size: 20 })),
            React.createElement(
              "div",
              { className: "pc-empty-title", style: { fontSize: 13.5 } },
              payload.phase === "loading" ? "正在读取会话记录…" : "这次 run 还没有可读消息",
            ),
            React.createElement(
              "div",
              { className: "pc-empty-desc", style: { fontSize: 11.5 } },
              payload.phase === "loading" ? "GET /task/transcript" : "会话是隐藏的（左栏不显示），记录仍在宿主里；换一个 run 或等任务跑起来再看。",
            ),
          )
        : messages.map((message, index) =>
            React.createElement(PcTranscriptMessage, { key: `${activeRunId || "run"}-${index}`, message }),
          ),
    ),
  );

  return React.createElement(
    "div",
    {
      className: "pc-drawer-mask",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) props.onClose();
      },
    },
    React.createElement(
      "aside",
      { className: "pc-drawer pc-drawer--transcript", "data-testid": "pc-session-viewer", role: "dialog", "aria-label": "任务会话记录", "aria-modal": "true" },
      React.createElement(
        "div",
        { className: "pc-drawer-head" },
        React.createElement(
          "div",
          { className: "pc-drawer-head-text" },
          React.createElement(
            "div",
            { className: "pc-drawer-eyebrow" },
            React.createElement(PcBadge, { tone: "busy", icon: "history" }, "会话记录"),
            React.createElement(PcDot, { tone: runMeta.dot }),
            React.createElement("span", { className: "pc-hint" }, runMeta.label),
            sessionId ? React.createElement("span", { className: "pc-mono pc-hint" }, pcShortSession(sessionId)) : null,
            latestRunning ? React.createElement(PcChip, {}, "运行中 · 每 3s 刷新") : null,
          ),
          React.createElement("div", { className: "pc-drawer-title" }, `任务 #${taskId} · 会话记录`),
          React.createElement(
            "div",
            { className: "pc-drawer-sub" },
            task ? React.createElement("span", null, task.title || "")
            : null,
            project ? React.createElement("span", null, `· ${project.name}`) : null,
            React.createElement("span", null, `· ${runs.length} 个 run · ${messages.length} 条消息 · 只读`),
          ),
        ),
        React.createElement(
          "button",
          { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭", "aria-label": "关闭会话记录" },
          React.createElement(PcIcon, { name: "close", size: 15 }),
        ),
      ),
      React.createElement("div", { className: "pc-drawer-body pc-transcript-body" }, bodyChildren),
    ),
  );
}
