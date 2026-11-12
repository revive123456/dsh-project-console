/**
 * 工程台 client：整页状态机（顶栏 + 统计条 + 看板 + 抽屉 + 弹窗 + Toast + 空状态）。
 * 数据来源：GET /state 每 2s 轮询（CONTRACT.md §3 交互细节）。
 */

/** 顶栏。 */
function PcTopBar(props) {
  const value = props.state.value;
  const projects = (value && Array.isArray(value.projects) ? value.projects : []).filter((p) => p && !p.archivedAt);
  const ready = props.state.phase === "ready" && value !== null;
  const leadSessionId =
    (value && value.settings && value.settings.leadSessionId) || (value && value.lead && value.lead.sessionId) || "";
  const acceptedCount = (value && Array.isArray(value.tasks) ? value.tasks : []).filter(
    (task) => task && task.status === "accepted" && (!props.selectedProject || task.projectId === props.selectedProject),
  ).length;
  let connLabel = "正在连接工程台…";
  if (props.conn === "online") {
    connLabel = `已连接 · 自动刷新 2s${props.state.fetchedAt ? ` · 同步于 ${pcFmtClock(new Date(props.state.fetchedAt).toISOString())}` : ""}`;
  } else if (props.conn === "offline") {
    connLabel = "连接中断，正在重试…";
  }
  const connDot = props.conn === "online" ? "online" : props.conn === "offline" ? "offline" : "idle";
  return React.createElement(
    "header",
    { className: "pc-topbar" },
    React.createElement(
      "div",
      { className: "pc-brand" },
      React.createElement("div", { className: "pc-brand-icon" }, React.createElement(PcIcon, { name: "board", size: 16 })),
      React.createElement(
        "div",
        { className: "pc-brand-text" },
        React.createElement("span", { className: "pc-brand-title" }, "工程台"),
        React.createElement(
          "span",
          { className: "pc-brand-sub" },
          React.createElement(PcDot, { tone: connDot, title: connLabel }),
          connLabel,
        ),
      ),
    ),
    React.createElement("div", { className: "pc-topbar-spacer" }),
    React.createElement(
      "div",
      { className: "pc-topbar-actions" },
      React.createElement(
        PcSelect,
        {
          className: "pc-project-select",
          testId: "pc-project-switcher",
          value: props.selectedProject,
          disabled: !ready,
          onChange: props.onSelectProject,
          title: "按项目筛选看板",
        },
        React.createElement("option", { value: "" }, "全部项目"),
        projects.map((project) =>
          React.createElement(
            "option",
            { key: project.id, value: project.id },
            `${project.name}${pcReviewCountOf(value, project.id) > 0 ? `（验收中 ${pcReviewCountOf(value, project.id)}）` : ""}`,
          ),
        ),
      ),
      React.createElement(
        PcButton,
        {
          variant: "secondary",
          size: "sm",
          icon: "chat",
          disabled: !ready,
          onClick: props.onOpenSessions,
          testId: "pc-btn-sessions",
          title: "会话列表：工程台会话 + 任务会话（任务会话已隐藏，左栏看不到）",
        },
        "会话",
        props.sessionsCount > 0
          ? React.createElement("span", { className: "pc-btn-count", "data-testid": "pc-btn-sessions-count" }, String(props.sessionsCount))
          : null,
      ),
      React.createElement(
        PcButton,
        { variant: "ghost", size: "sm", icon: "folder", disabled: !ready, onClick: props.onOpenProjects, testId: "pc-btn-projects", title: "项目管理：添加项目、删除项目（连带任务记录）" },
        "项目",
      ),
      React.createElement(
        PcButton,
        { variant: "primary", size: "sm", icon: "plus", disabled: !ready || projects.length === 0, onClick: props.onNewTask, testId: "pc-btn-new-task" },
        "新需求",
      ),
      React.createElement(
        PcButton,
        {
          variant: "secondary",
          size: "sm",
          icon: "layers",
          disabled: !ready || projects.length === 0,
          onClick: () => props.onOpenIntegration(null),
          testId: "pc-btn-integrate",
        },
        acceptedCount > 0 ? `集成 ${acceptedCount}` : "集成",
      ),
      React.createElement(
        PcButton,
        {
          variant: "secondary",
          size: "sm",
          icon: "chat",
          disabled: !ready,
          loading: Boolean(props.busy && props.busy["lead-create"]),
          onClick: props.onLeadChat,
          testId: "pc-btn-lead-chat",
          title: leadSessionId ? "打开工程台 lead 会话" : "创建工程台 lead 会话",
        },
        leadSessionId ? "和工程台聊" : "创建工程台会话",
      ),
      React.createElement(
        PcButton,
        {
          variant: "secondary",
          size: "sm",
          icon: "settings",
          disabled: !ready,
          onClick: props.onOpenSettings,
          testId: "pc-btn-settings",
          title: "设置：配置低/中/高工作量分别用哪个模型",
        },
        "设置",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "pc-icon-btn",
          onClick: props.onRefresh,
          disabled: props.refreshing,
          title: "立即刷新状态",
          "aria-label": "刷新",
          "data-testid": "pc-btn-refresh",
        },
        props.refreshing ? React.createElement(PcSpinner, { size: 14 }) : React.createElement(PcIcon, { name: "refresh", size: 15 }),
      ),
    ),
  );
}

/** 添加项目表单（空状态与项目管理弹窗共用）。 */
function PcAddProjectForm(props) {
  const [name, setName] = React.useState("");
  const [repoPath, setRepoPath] = React.useState("");
  const [baseBranch, setBaseBranch] = React.useState("main");
  const [workerFilePolicy, setWorkerFilePolicy] = React.useState("workspace-write");
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    if (busy) return;
    if (name.trim() === "") {
      props.toast("error", "请填写项目名称");
      return;
    }
    if (repoPath.trim() === "") {
      props.toast("error", "请填写仓库绝对路径");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), repoPath: repoPath.trim(), baseBranch: baseBranch.trim() || "main", workerFilePolicy };
      const created = await pcPost("/project/add", payload);
      const project = created && created.project ? created.project : null;
      props.toast("success", `已添加项目${project && project.name ? `「${project.name}」` : ""}，开始添加第一个需求吧`);
      setName("");
      setRepoPath("");
      if (props.onCreated) props.onCreated(project);
    } catch (error) {
      props.toast("error", pcFriendlyError(error));
    } finally {
      setBusy(false);
    }
  };
  const fields = React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "pc-form-grid pc-form-grid--2" },
      React.createElement(
        PcField,
        { label: "项目名称", required: true },
        React.createElement(PcInput, { value: name, onChange: setName, placeholder: "例如 my-project", testId: "pc-input-project-name" }),
      ),
      React.createElement(
        PcField,
        { label: "仓库绝对路径", required: true, hint: "必须是本机已存在的 Git 仓库" },
        React.createElement(PcInput, { value: repoPath, onChange: setRepoPath, placeholder: "例如 /path/to/your-repo", testId: "pc-input-project-repo" }),
      ),
    ),
    React.createElement(
      "div",
      { className: "pc-form-grid pc-form-grid--2" },
      React.createElement(
        PcField,
        { label: "主干分支", hint: "集成完成后推送到这个分支（一般填 main）" },
        React.createElement(PcInput, { value: baseBranch, onChange: setBaseBranch, placeholder: "main" }),
      ),
      React.createElement(
        PcField,
        { label: "任务会话权限", hint: "workspace-write 只能写 worktree；全权限适合依赖 home 缓存的视觉任务" },
        React.createElement(
          PcSelect,
          { value: workerFilePolicy, onChange: setWorkerFilePolicy, testId: "pc-select-project-worker-policy" },
          React.createElement("option", { value: "workspace-write" }, "只写 worktree（workspace-write，推荐）"),
          React.createElement("option", { value: "danger-full-access" }, "宿主全权限（danger-full-access，信任模式）"),
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "pc-empty-actions" },
      React.createElement(
        PcButton,
        { variant: "primary", size: "md", icon: "plus", loading: busy, onClick: submit, testId: "pc-btn-add-project-submit" },
        "添加项目",
      ),
    ),
  );
  if (props.plain) return fields;
  return React.createElement("div", { className: "pc-empty-card" }, React.createElement("div", { className: "pc-empty-card-title" }, React.createElement(PcIcon, { name: "folder", size: 15 }), "添加项目"), fields);
}

/** 项目管理弹窗：列出全部项目（看板已归档的也列）+ 删除入口 + 添加项目表单。 */
function PcProjectsDialog(props) {
  const projects = Array.isArray(props.projects) ? props.projects : [];
  return React.createElement(
    PcModal,
    {
      title: "项目",
      subtitle: "工程台跟踪的仓库。删除项目会连它名下的任务记录一起删；仓库本身和已合并到主干分支的提交不动。",
      width: 720,
      onClose: props.onClose,
      footer: React.createElement(PcButton, { variant: "ghost", size: "md", onClick: props.onClose }, "关闭"),
    },
    React.createElement(
      "div",
      { className: "pc-projects-section" },
      React.createElement(PcSectionTitle, { icon: "folder", right: `${projects.length} 个` }, "已登记的项目"),
      projects.length === 0
        ? React.createElement("div", { className: "pc-note" }, "还没有项目。用下面的表单添加一个，工程台才能建需求、派任务。")
        : React.createElement(
            "div",
            { className: "pc-projects-list", "data-testid": "pc-projects-list" },
            projects.map((project) => {
              const counts = project.taskCounts || {};
              const archived = Boolean(project.archivedAt);
              return React.createElement(
                "div",
                { key: project.id, className: "pc-projects-row", "data-testid": `pc-project-row-${project.id}` },
                React.createElement(
                  "div",
                  { className: "pc-projects-main" },
                  React.createElement(
                    "div",
                    { className: "pc-projects-name-row" },
                    React.createElement("span", { className: "pc-projects-name", title: project.repoPath }, project.name || project.id),
                    React.createElement(PcChip, { mono: true, title: "项目 id" }, project.id),
                    archived ? React.createElement(PcBadge, { tone: "idle" }, "已归档") : null,
                  ),
                  React.createElement("div", { className: "pc-projects-repo", title: project.repoPath }, project.repoPath || "（未设置仓库路径）"),
                  React.createElement(
                    "div",
                    { className: "pc-projects-meta" },
                    React.createElement("span", null, `base ${project.baseBranch || "main"}`),
                    React.createElement("span", null, `待办 ${pcNum(counts.todo, 0)}`),
                    React.createElement("span", null, `进行中 ${pcNum(counts.running, 0)}`),
                    React.createElement("span", null, `验收中 ${pcNum(counts.review, 0)}`),
                    React.createElement("span", null, `已归档 ${pcNum(counts.done, 0)}`),
                    React.createElement("span", null, `槽位 ${pcNum(project.usedSlots, 0)}/${pcNum(project.slotBudget, 6)}`),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "pc-projects-policy" },
                  React.createElement("span", { className: "pc-field-label" }, "任务权限"),
                  React.createElement(
                    PcSelect,
                    {
                      value: project.workerFilePolicy || (project.autonomy === "unleashed" ? "danger-full-access" : "workspace-write"),
                      testId: `pc-select-project-policy-${project.id}`,
                      onChange: (value) => props.onPolicyChange && props.onPolicyChange(project, value),
                    },
                    React.createElement("option", { value: "workspace-write" }, "workspace-write"),
                    React.createElement("option", { value: "danger-full-access" }, "danger-full-access"),
                  ),
                ),
                React.createElement(
                  PcButton,
                  {
                    variant: "danger",
                    size: "sm",
                    icon: "trash",
                    onClick: () => props.onDelete(project),
                    testId: `pc-btn-delete-project-${project.id}`,
                    title: `删除项目「${project.name || project.id}」（连带任务记录）`,
                  },
                  "删除",
                ),
              );
            }),
          ),
    ),
    React.createElement(
      "div",
      { className: "pc-projects-section" },
      React.createElement(PcSectionTitle, { icon: "plus" }, "添加项目"),
      React.createElement(PcAddProjectForm, {
        plain: true,
        toast: props.toast,
        onCreated: () => {
          if (props.onCreated) props.onCreated();
        },
      }),
    ),
  );
}

/** 设置页里的「模型 + 思考强度」选择器（工作台模型 / 各档位模型共用）。 */
function PcSettingsModelPicker(props) {
  const catalogView = props.catalogView;
  const catalogEmpty = Boolean(props.catalogEmpty);
  const value = props.value || { key: "", effort: "" };
  const disabled = Boolean(props.disabled);
  const onChange = props.onChange;
  const testId = props.testId;
  const selected = value.key ? catalogView.models.find((model) => model.key === value.key) : null;
  const efforts = selected && selected.reasoning && Array.isArray(selected.reasoning.efforts) ? selected.reasoning.efforts : [];
  const currentEffort = value.effort || "";
  const knownEffort = efforts.some((effort) => effort.id === currentEffort);
  const splitKey = (key) => {
    const sep = String(key || "").indexOf("::");
    if (sep < 0) return { provider: "", model: "" };
    return { provider: String(key).slice(0, sep), model: String(key).slice(sep + 2) };
  };
  const current = splitKey(value.key);
  let modelControl;
  let effortControl;
  if (catalogEmpty) {
    // 模型目录读不到（llm 服务/凭据不可用）时退化成手填，至少能配置。
    modelControl = React.createElement(
      "div",
      { className: "pc-settings-route" },
      React.createElement(PcInput, {
        value: current.provider,
        placeholder: "provider，如 mtcode",
        disabled,
        onChange: (next) => onChange({ key: next ? `${next}::${current.model}` : "", effort: value.effort }),
      }),
      React.createElement(PcInput, {
        value: current.model,
        placeholder: "model，如 deepseek-flash",
        disabled,
        onChange: (next) => onChange({ key: next ? `${current.provider}::${next}` : "", effort: value.effort }),
      }),
    );
    effortControl = React.createElement(PcInput, {
      value: currentEffort,
      placeholder: "思考强度，如 max（可空）",
      disabled,
      onChange: (next) => onChange({ key: value.key, effort: next }),
    });
  } else {
    modelControl = React.createElement(
      PcSelect,
      {
        value: value.key,
        disabled,
        onChange: (next) => onChange({ key: next, effort: "" }),
        testId: `pc-settings-model-${testId}`,
      },
      React.createElement("option", { value: "" }, "跟随项目 / 部署默认"),
      value.key && !selected ? React.createElement("option", { value: value.key }, `当前：${value.key.replace("::", " / ")}`) : null,
      catalogView.groups.map((group) =>
        React.createElement(
          "optgroup",
          { key: group.id, label: group.name },
          group.models.map((model) => React.createElement("option", { key: model.key, value: model.key }, model.name)),
        ),
      ),
    );
    effortControl = React.createElement(
      PcSelect,
      {
        value: currentEffort,
        disabled,
        onChange: (next) => onChange({ key: value.key, effort: next }),
        testId: `pc-settings-effort-${testId}`,
      },
      React.createElement("option", { value: "" }, "模型默认"),
      currentEffort && !knownEffort ? React.createElement("option", { value: currentEffort }, `当前：${currentEffort}`) : null,
      efforts.map((effort) => React.createElement("option", { key: effort.id, value: effort.id }, effort.name || effort.id)),
    );
  }
  return React.createElement(
    "div",
    { className: "pc-settings-grid" },
    React.createElement(
      "div",
      { className: "pc-settings-cell" },
      React.createElement("span", { className: "pc-field-label" }, "模型"),
      modelControl,
    ),
    React.createElement(
      "div",
      { className: "pc-settings-cell" },
      React.createElement("span", { className: "pc-field-label" }, "思考强度"),
      effortControl,
    ),
  );
}

/**
 * 「设置」弹窗：
 *   - 工作台模型（工程台会话 + 工作量判定）
 *   - 低 / 中 / 高工作量各自派发用哪个模型
 *   - 调度：自动派发、全局 / 项目并发槽位
 * 工作量本身由 AI 判定，人不设置。
 */
function PcSettingsDialog(props) {
  const stateValue = props.state && props.state.value ? props.state.value : {};
  const settings = stateValue.settings || {};
  const projects = (stateValue.projects || []).filter((project) => project && !project.archivedAt);
  const [catalog, setCatalog] = React.useState({ phase: "loading", providers: [], current: null, error: "" });
  const [draft, setDraft] = React.useState(() => ({
    workbench: pcModelDraftOf(settings.workbenchModel),
    workload: pcWorkloadDraftOf(settings),
    autoDispatch: settings.autoDispatch !== false,
    globalSlotBudget: String(pcNum(settings.globalSlotBudget, 8)),
    reviewMode: settings.reviewMode || "reviewer",
    reviewer: pcModelDraftOf(settings.reviewerModel),
    reviewImageMax: String(pcNum(settings.reviewImageMax, 3)),
    leadCtxLimitTokens: String(pcNum(settings.leadCtxLimitTokens, 100000)),
    projectSlots: Object.fromEntries(projects.map((project) => [project.id, String(pcNum(project.slotBudget, 6))])),
  }));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    pcGetModels()
      .then((value) => {
        if (cancelled) return;
        setCatalog({
          phase: "ready",
          providers: value && Array.isArray(value.providers) ? value.providers : [],
          current: value && value.current ? value.current : null,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setCatalog({ phase: "ready", providers: [], current: null, error: pcFriendlyError(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 扁平化模型目录（provider::model），同时按 provider 分组给 optgroup 用。 */
  const catalogView = React.useMemo(() => {
    const models = [];
    const groups = [];
    for (const provider of catalog.providers) {
      const group = { id: provider.id, name: provider.name || provider.id, models: [] };
      for (const model of provider.models || []) {
        const item = {
          key: `${provider.id}::${model.id}`,
          provider: provider.id,
          providerName: provider.name || provider.id,
          id: model.id,
          name: model.name || model.id,
          reasoning: model.reasoning || null,
        };
        group.models.push(item);
        models.push(item);
      }
      if (group.models.length > 0) groups.push(group);
    }
    return { models, groups };
  }, [catalog.providers]);
  const catalogEmpty = catalog.phase === "ready" && catalogView.models.length === 0;

  const setWorkbench = (value) => setDraft((previous) => Object.assign({}, previous, { workbench: value }));
  const setTier = (tier, value) =>
    setDraft((previous) => Object.assign({}, previous, { workload: Object.assign({}, previous.workload, { [tier]: value }) }));
  const setProjectSlot = (projectId, value) =>
    setDraft((previous) => Object.assign({}, previous, { projectSlots: Object.assign({}, previous.projectSlots, { [projectId]: value }) }));
  const clampInt = (value, min, max, fallback) => {
    const n = pcNum(value, NaN);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const globalSlots = clampInt(draft.globalSlotBudget, 1, 16, 8);
      const saved = await pcPost("/settings/update", {
        workbenchModel: pcModelPayloadOf(draft.workbench),
        workloadModels: pcWorkloadModelsPayload(draft.workload),
        autoDispatch: draft.autoDispatch,
        globalSlotBudget: globalSlots,
        reviewMode: draft.reviewMode,
        reviewerModel: pcModelPayloadOf(draft.reviewer),
        reviewImageMax: clampInt(draft.reviewImageMax, 1, 8, 3),
        leadCtxLimitTokens: clampInt(draft.leadCtxLimitTokens, 10000, 2000000, 100000),
      });
      for (const project of projects) {
        const current = pcNum(project.slotBudget, null);
        const next = clampInt(draft.projectSlots[project.id], 1, 12, current === null ? 6 : current);
        if (next !== current) {
          await pcPost("/project/update", { projectId: project.id, patch: { slotBudget: next } });
        }
      }
      const workbench = saved && saved.workbench ? saved.workbench : null;
      if (workbench && workbench.ok === false) {
        props.toast("error", `配置已保存，但工作台会话切模型失败：${workbench.error}（下次重建会话生效）`);
      } else {
        props.toast("success", "设置已保存，对后续派发生效");
      }
      props.onSaved();
      props.onClose();
    } catch (error) {
      props.toast("error", pcFriendlyError(error));
    } finally {
      setSaving(false);
    }
  };

  const renderTier = ([tier, label]) =>
    React.createElement(
      "div",
      { key: tier, className: "pc-settings-tier" },
      React.createElement(
        "div",
        { className: "pc-settings-tier-head" },
        React.createElement("span", { className: "pc-settings-tier-name" }, `${label}工作量`),
        React.createElement("span", { className: "pc-settings-tier-sizes" }, `size ${PC_TIER_SIZE_HINT[tier] || ""}`),
      ),
      React.createElement(PcSettingsModelPicker, {
        value: draft.workload[tier],
        catalogView,
        catalogEmpty,
        disabled: saving,
        testId: tier,
        onChange: (value) => setTier(tier, value),
      }),
    );

  const renderProjectSlot = (project) =>
    React.createElement(
      "div",
      { key: project.id, className: "pc-settings-project" },
      React.createElement("span", { className: "pc-settings-project-name", title: project.repoPath }, project.name || project.id),
      React.createElement(PcInput, {
        type: "number",
        value: draft.projectSlots[project.id],
        disabled: saving,
        testId: `pc-settings-project-slot-${project.id}`,
        onChange: (value) => setProjectSlot(project.id, value),
      }),
      React.createElement("span", { className: "pc-settings-project-used" }, `占用 ${pcNum(project.usedSlots, 0)}`),
    );

  return React.createElement(
    PcModal,
    {
      title: "设置",
      subtitle: "工作台自己的模型、低/中/高工作量派发用的模型、以及同时能跑多少任务（并发槽位）。",
      width: 700,
      onClose: saving ? undefined : props.onClose,
      footer: React.createElement(
        React.Fragment,
        null,
        React.createElement(PcButton, { variant: "ghost", size: "md", onClick: props.onClose, disabled: saving }, "取消"),
        React.createElement(
          PcButton,
          { variant: "primary", size: "md", icon: "check", loading: saving, onClick: submit, testId: "pc-settings-save" },
          "保存配置",
        ),
      ),
    },
    catalog.phase === "loading" ? React.createElement("div", { className: "pc-hint" }, "正在读取模型目录…") : null,
    catalog.error
      ? React.createElement("div", { className: "pc-note" }, `模型目录读取失败（${catalog.error}），模型改成手填 provider / model。`)
      : null,
    React.createElement(
      "div",
      { className: "pc-settings-section" },
      React.createElement(PcSectionTitle, { icon: "robot" }, "工作台模型"),
      React.createElement("div", { className: "pc-note" }, "工程台会话（和工程台聊的那位）和工作量判定都用它。留空 = 部署默认。"),
      React.createElement(PcSettingsModelPicker, {
        value: draft.workbench,
        catalogView,
        catalogEmpty,
        disabled: saving,
        testId: "workbench",
        onChange: setWorkbench,
      }),
    ),
    React.createElement(
      "div",
      { className: "pc-settings-section" },
      React.createElement(PcSectionTitle, { icon: "zap" }, "工作量模型"),
      React.createElement(
        "div",
        { className: "pc-note" },
        "任务派发时按工作量档位选模型；留空 = 跟随项目 workerModel / 部署默认。",
      ),
      PC_WORKLOAD_TIERS.map(renderTier),
    ),
    React.createElement(
      "div",
      { className: "pc-settings-section" },
      React.createElement(PcSectionTitle, { icon: "check" }, "验收与上下文"),
      React.createElement(
        "div",
        { className: "pc-note" },
        "验收链路固定：一次性判定器 → need_info 时宿主复跑项目验证 → 仍缺证据时只读深审 → accept 前宿主再复跑一次项目验证。",
      ),
      React.createElement(
        "div",
        { className: "pc-settings-grid" },
        React.createElement(
          "div",
          { className: "pc-settings-cell" },
          React.createElement("span", { className: "pc-field-label" }, "验收执行者"),
          React.createElement(
            PcSelect,
            {
              value: draft.reviewMode,
              disabled: saving,
              testId: "pc-settings-review-mode",
              onChange: (value) => setDraft((previous) => Object.assign({}, previous, { reviewMode: value })),
            },
            React.createElement("option", { value: "reviewer" }, "一次性判定器（推荐）"),
            React.createElement("option", { value: "lead" }, "lead 自动验收（旧行为）"),
            React.createElement("option", { value: "off" }, "关闭自动验收（只人工）"),
          ),
        ),
        React.createElement(
          "div",
          { className: "pc-settings-cell" },
          React.createElement("span", { className: "pc-field-label" }, "lead 上下文轮换阈值（tokens）"),
          React.createElement(PcInput, {
            type: "number",
            value: draft.leadCtxLimitTokens,
            disabled: saving,
            testId: "pc-settings-lead-ctx",
            onChange: (value) => setDraft((previous) => Object.assign({}, previous, { leadCtxLimitTokens: value })),
          }),
        ),
      ),
      React.createElement(PcSettingsModelPicker, {
        value: draft.reviewer,
        catalogView,
        catalogEmpty,
        disabled: saving,
        testId: "reviewer",
        onChange: (value) => setDraft((previous) => Object.assign({}, previous, { reviewer: value })),
      }),
      React.createElement(
        "div",
        { className: "pc-settings-slot-row" },
        React.createElement("span", { className: "pc-field-label" }, "最多内联图片数"),
        React.createElement(PcInput, {
          type: "number",
          value: draft.reviewImageMax,
          disabled: saving,
          testId: "pc-settings-review-image-max",
          onChange: (value) => setDraft((previous) => Object.assign({}, previous, { reviewImageMax: value })),
        }),
        React.createElement("span", { className: "pc-hint" }, "1–8；只对视觉类任务生效"),
      ),
    ),
    React.createElement(
      "div",
      { className: "pc-settings-section" },
      React.createElement(PcSectionTitle, { icon: "layers" }, "调度"),
      React.createElement(
        "label",
        { className: "pc-check" },
        React.createElement("input", {
          type: "checkbox",
          checked: draft.autoDispatch,
          disabled: saving,
          "data-testid": "pc-settings-auto-dispatch",
          onChange: (event) => setDraft((previous) => Object.assign({}, previous, { autoDispatch: event.target.checked })),
        }),
        "自动派发（待办任务排到就派发；关掉后只能在任务上手动点「派发」）",
      ),
      React.createElement(
        "div",
        { className: "pc-settings-slot-row" },
        React.createElement("span", { className: "pc-field-label" }, "全局并发槽位"),
        React.createElement(PcInput, {
          type: "number",
          value: draft.globalSlotBudget,
          disabled: saving,
          testId: "pc-settings-global-slots",
          onChange: (value) => setDraft((previous) => Object.assign({}, previous, { globalSlotBudget: value })),
        }),
        React.createElement(
          "span",
          { className: "pc-hint" },
          `当前占用 ${pcNum(stateValue.slots && stateValue.slots.used, 0)} / ${pcNum(settings.globalSlotBudget, 8)}`,
        ),
      ),
      React.createElement(
        "div",
        { className: "pc-note" },
        "并发按槽位算：任务按工作量占槽（低 1、中 2、高 4、极大 6），全局和项目上限谁先满谁挡派发。改完对后续派发生效，不动运行中的任务。",
      ),
      projects.length > 0
        ? React.createElement(
            "div",
            { className: "pc-settings-projects" },
            React.createElement("div", { className: "pc-settings-project-head" }, "项目并发槽位"),
            projects.map(renderProjectSlot),
          )
        : null,
    ),
  );
}

/** 宿主未就绪空状态。 */
function PcHostDownEmpty(props) {
  const error = props.state.error;
  return React.createElement(
    PcEmpty,
    {
      icon: "alert",
      tone: "danger",
      title: "工程台宿主未就绪",
      desc: "页面本身已加载，但读不到宿主状态接口 GET /project-console-api/state。host 半边可能还在实现、还没加载，或者 DSH 需要重启一次。UI 会在状态可用后自动出现看板，不用刷新页面。",
    },
    error
      ? React.createElement(
          "div",
          { className: "pc-error-box", style: { textAlign: "left" } },
          `${error.message}${uiStatusHint(error)}`,
        )
      : null,
    React.createElement(
      "div",
      { style: { marginTop: 12, display: "flex", gap: 8 } },
      React.createElement(PcButton, { variant: "primary", size: "md", icon: "refresh", loading: props.refreshing, onClick: props.onRetry }, "重试"),
    ),
    React.createElement("div", { className: "pc-hint", style: { marginTop: 10 } }, "排查：curl 同源 /project-console-api/ping 应返回 {ok:true}；/state 由 host 侧提供。"),
  );
}

/** 错误里的 HTTP 状态补充说明。 */
function uiStatusHint(error) {
  const status = pcNum(error && error.status, null);
  if (status === 404) return "（HTTP 404 = 宿主路由未注册）";
  if (status === 403) return "（HTTP 403 = 写请求挡板/来源校验拒绝）";
  if (status === 0) return "（无法连接宿主）";
  return status === null ? "" : `（HTTP ${status}）`;
}

/** 无项目空状态。 */
function PcNoProjectsEmpty(props) {
  return React.createElement(
    PcEmpty,
    {
      icon: "folder",
      title: "还没有项目，先添加一个",
      desc: "工程台会把需求派发到项目仓库的独立 worktree 里执行，跑完在测试分支上集成测试，人工确认后再推送到主干分支。",
    },
    React.createElement(PcAddProjectForm, { toast: props.toast, onCreated: props.onCreated }),
  );
}

/** 新需求对话框（CONTRACT.md §3.8 + 参考截图附件：选择/粘贴图片，≤6 张、单张 ≤8MB）。 */
function PcNewTaskDialog(props) {
  const projects = (props.projects || []).filter((project) => project && !project.archivedAt);
  const initialProject =
    props.defaultProjectId && projects.some((project) => project.id === props.defaultProjectId)
      ? props.defaultProjectId
      : projects[0]
        ? projects[0].id
        : "";
  const [form, setForm] = React.useState({
    projectId: initialProject,
    title: "",
    brief: "",
    type: "feature",
    priority: "100",
    touches: "",
  });
  const [attachments, setAttachments] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadStep, setUploadStep] = React.useState("");
  const fileInputRef = React.useRef(null);
  const seqRef = React.useRef(0);
  const attachmentsRef = React.useRef(attachments);
  attachmentsRef.current = attachments;
  const set = (key, value) => setForm((previous) => Object.assign({}, previous, { [key]: value }));

  // 卸载时释放本地预览 URL
  React.useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const addFiles = (fileList) => {
    const incoming = Array.prototype.slice.call(fileList || []).filter(Boolean);
    if (incoming.length === 0) return;
    setAttachments((previous) => {
      const next = previous.slice();
      for (const file of incoming) {
        if (next.length >= PC_ATTACHMENT_MAX) {
          props.toast("error", `最多 ${PC_ATTACHMENT_MAX} 张参考图，多余的已忽略`);
          break;
        }
        const check = pcValidateAttachmentFile(file);
        if (!check.ok) {
          props.toast("error", check.reason);
          continue;
        }
        let previewUrl = "";
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          previewUrl = "";
        }
        next.push({
          key: `attachment-${++seqRef.current}`,
          file,
          name: file.name || `截图-${next.length + 1}.png`,
          size: file.size,
          mime: file.type,
          previewUrl,
        });
      }
      return next;
    });
  };

  const removeAttachment = (key) => {
    setAttachments((previous) =>
      previous.filter((item) => {
        if (item.key !== key) return true;
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          /* ignore */
        }
        return false;
      }),
    );
  };

  /** textarea 里 Ctrl+V：把剪贴板里的 image/* 收成附件。 */
  const handlePaste = (event) => {
    const items = event.clipboardData && event.clipboardData.items ? event.clipboardData.items : null;
    if (!items) return;
    const files = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item || item.kind !== "file") continue;
      if (!String(item.type || "").startsWith("image/")) continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    if (files.length > 0) {
      event.preventDefault();
      addFiles(files);
    }
  };

  const submit = async () => {
    if (submitting) return;
    if (!form.projectId) {
      props.toast("error", "请先选择项目");
      return;
    }
    if (form.title.trim() === "") {
      props.toast("error", "请填写任务标题");
      return;
    }
    if (form.brief.trim() === "") {
      props.toast("error", "请填写需求原文（可粘贴 PRD）");
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = [];
      for (let index = 0; index < attachments.length; index += 1) {
        const item = attachments[index];
        setUploadStep(`上传参考图 ${index + 1}/${attachments.length}…`);
        const dataBase64 = await pcFileToBase64(item.file);
        const result = await pcUploadAttachment({ name: item.name, mime: item.mime, dataBase64 });
        const file = result && result.file ? result.file : null;
        if (!file || !file.path) throw new Error(`参考图「${item.name}」上传失败`);
        uploaded.push({ path: file.path, name: file.name || item.name, mime: file.mime || item.mime });
      }
      setUploadStep("创建任务…");
      const payload = {
        projectId: form.projectId,
        title: form.title.trim(),
        brief: form.brief,
        type: form.type,
        priority: pcNum(form.priority, 100),
        touches: form.touches
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        attachments: uploaded,
      };
      const created = await pcPost("/task/add", payload);
      const task = created && created.task ? created.task : null;
      const workload = task && task.workloadLabel ? task.workloadLabel : null;
      props.toast(
        "success",
        `已创建任务${task && task.id !== undefined ? ` #${task.id}` : ""}${workload ? ` · 工作量 ${workload}` : ""}${uploaded.length > 0 ? `（含 ${uploaded.length} 张参考图）` : ""}，确认规格后即可派发`,
      );
      props.onCreated();
    } catch (error) {
      props.toast("error", pcFriendlyError(error));
    } finally {
      setSubmitting(false);
      setUploadStep("");
    }
  };

  const attachmentCount = attachments.length;
  return React.createElement(
    PcModal,
    {
      title: "新建需求",
      subtitle: "创建后进入「待办」列；确认规格后点「派发」，宿主会建 worktree + 会话并开始执行。截图会随任务简报一起交给执行会话。",
      width: 640,
      onClose: submitting ? undefined : props.onCancel,
      footer: React.createElement(
        React.Fragment,
        null,
        React.createElement(PcButton, { variant: "ghost", size: "md", onClick: props.onCancel, disabled: submitting }, "取消"),
        React.createElement(
          PcButton,
          { variant: "primary", size: "md", icon: "plus", loading: submitting, onClick: submit, testId: "pc-new-task-submit" },
          uploadStep || "创建任务",
        ),
      ),
    },
    React.createElement(
      PcField,
      { label: "项目", required: true },
      React.createElement(
        PcSelect,
        { value: form.projectId, onChange: (value) => set("projectId", value), disabled: submitting },
        projects.map((project) => React.createElement("option", { key: project.id, value: project.id }, project.name)),
      ),
    ),
    React.createElement(
      PcField,
      { label: "任务标题", required: true },
      React.createElement(PcInput, {
        value: form.title,
        onChange: (value) => set("title", value),
        placeholder: "一句话说清要做什么，例如：OAM 空气模块 3D 可视化",
        disabled: submitting,
        testId: "pc-new-task-title",
      }),
    ),
    React.createElement(
      PcField,
      { label: "需求原文 / 简报", required: true, hint: "可以粘贴 PRD、设计稿说明、验收要点；写给执行会话看" },
      React.createElement(PcTextarea, {
        value: form.brief,
        onChange: (value) => set("brief", value),
        onPaste: handlePaste,
        placeholder: "粘贴需求原文或 PRD 摘要…\n\n背景、目标、约束、参考文件路径都可以写在这里；截图可以直接 Ctrl+V 粘贴到这里。",
        rows: 7,
        disabled: submitting,
        testId: "pc-new-task-brief",
      }),
    ),
    React.createElement(
      "div",
      { className: "pc-attach-field" },
      React.createElement(
        "div",
        { className: "pc-attach-head" },
        React.createElement("span", { className: "pc-field-label" }, "参考截图"),
        React.createElement("span", { className: "pc-attach-count" }, `${attachmentCount} / ${PC_ATTACHMENT_MAX}`),
        React.createElement(
          PcButton,
          {
            variant: "secondary",
            size: "sm",
            icon: "plus",
            disabled: submitting || attachmentCount >= PC_ATTACHMENT_MAX,
            onClick: () => {
              if (fileInputRef.current) fileInputRef.current.click();
            },
            testId: "pc-btn-pick-attachment",
          },
          "选择图片",
        ),
      ),
      React.createElement(
        "div",
        { className: "pc-attach-hint" },
        "也可以直接在「需求原文」输入框里 Ctrl+V 粘贴剪贴板截图。最多 6 张、单张不超过 8MB（PNG / JPEG / WebP / GIF）。",
      ),
      React.createElement("input", {
        ref: fileInputRef,
        type: "file",
        accept: "image/*",
        multiple: true,
        style: { display: "none" },
        "data-testid": "pc-attachment-file-input",
        onChange: (event) => {
          addFiles(event.target.files);
          event.target.value = "";
        },
      }),
      attachmentCount > 0
        ? React.createElement(
            "div",
            { className: "pc-attach-list" },
            attachments.map((item, index) =>
              React.createElement(
                "div",
                { key: item.key, className: "pc-attach-item", "data-testid": `pc-attachment-${index}` },
                item.previewUrl
                  ? React.createElement("img", { className: "pc-attach-img", src: item.previewUrl, alt: item.name })
                  : React.createElement(PcIcon, { name: "file", size: 18 }),
                React.createElement(
                  "div",
                  { className: "pc-attach-meta" },
                  React.createElement("span", { className: "pc-attach-name", title: item.name }, item.name),
                  React.createElement("span", { className: "pc-attach-size" }, pcFmtFileSize(item.size)),
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "pc-attach-remove",
                    title: "移除这张图",
                    "aria-label": "移除参考截图",
                    "data-testid": "pc-btn-remove-attachment",
                    disabled: submitting,
                    onClick: () => removeAttachment(item.key),
                  },
                  React.createElement(PcIcon, { name: "close", size: 11 }),
                ),
              ),
            ),
          )
        : null,
      uploadStep ? React.createElement("div", { className: "pc-hint" }, uploadStep) : null,
    ),
    React.createElement(
      "div",
      { className: "pc-form-grid pc-form-grid--2" },
      React.createElement(
        PcField,
        { label: "类型" },
        React.createElement(
          PcSelect,
          { value: form.type, onChange: (value) => set("type", value), disabled: submitting },
          PC_TASK_TYPES.map(([value, label]) => React.createElement("option", { key: value, value }, label)),
        ),
      ),
      React.createElement(
        PcField,
        { label: "优先级", hint: "数字越大越先派发" },
        React.createElement(PcInput, {
          type: "number",
          value: form.priority,
          onChange: (value) => set("priority", value),
          disabled: submitting,
        }),
      ),
    ),
    React.createElement(
      PcField,
      { label: "预计触及路径", hint: "逗号分隔；用于冲突域提示，可留空" },
      React.createElement(PcInput, {
        value: form.touches,
        onChange: (value) => set("touches", value),
        placeholder: "src/oam/, examples/oam-air/",
        disabled: submitting,
      }),
    ),
  );
}

/** 打回 / 放弃 的原因输入弹窗。 */
function PcPromptModal(props) {
  const prompt = props.prompt;
  const isRework = prompt.kind === "rework";
  const task = prompt.task;
  const [text, setText] = React.useState("");
  const submit = () => {
    if (text.trim() === "") {
      props.toast("error", isRework ? "请填写返工意见" : "请填写放弃原因");
      return;
    }
    props.onConfirm(text.trim());
  };
  return React.createElement(
    PcModal,
    {
      title: isRework ? `打回任务 #${task.id}` : `放弃任务 #${task.id}`,
      subtitle: isRework ? "意见会 followup 回原任务会话，任务重新进入运行中。" : "放弃会清理 worktree 与任务分支，patch 会保留在任务记录里。",
      width: 540,
      onClose: props.busy ? undefined : props.onCancel,
      footer: React.createElement(
        React.Fragment,
        null,
        React.createElement(PcButton, { variant: "ghost", size: "md", onClick: props.onCancel, disabled: props.busy }, "取消"),
        React.createElement(
          PcButton,
          {
            variant: isRework ? "danger" : "danger",
            size: "md",
            icon: isRework ? "undo" : "trash",
            loading: props.busy,
            disabled: text.trim() === "",
            onClick: submit,
            testId: "pc-prompt-confirm",
          },
          isRework ? "确认打回" : "确认放弃",
        ),
      ),
    },
    React.createElement("div", { className: "pc-question-text" }, task.title || `任务 #${task.id}`),
    React.createElement(
      PcField,
      { label: isRework ? "返工意见" : "放弃原因", required: true },
      React.createElement(PcTextarea, {
        value: text,
        onChange: setText,
        rows: 5,
        autoFocus: true,
        placeholder: isRework ? "哪里不达标、期望改成什么样、要补哪些验证…" : "为什么放弃这个任务…",
        disabled: props.busy,
        testId: "pc-prompt-text",
      }),
    ),
  );
}

/** 工程台整页。 */
function ProjectConsolePage(props) {
  const ctx = props && props.ctx ? props.ctx : null;
  const [state, setState] = React.useState({ phase: "loading", value: null, error: null, fetchedAt: null, stale: false });
  const [conn, setConn] = React.useState("pending");
  const [selectedProject, setSelectedProject] = React.useState("");
  const [toasts, setToasts] = React.useState([]);
  const [busy, setBusy] = React.useState({});
  const [live, setLive] = React.useState({});
  const [detailId, setDetailId] = React.useState(null);
  const [detailFocusEvents, setDetailFocusEvents] = React.useState(false);
  const [sessionsOpen, setSessionsOpen] = React.useState(false);
  const [sessionsHighlight, setSessionsHighlight] = React.useState(null);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState(null);
  const [canceling, setCanceling] = React.useState(false);
  const [leadChatOpen, setLeadChatOpen] = React.useState(false);
  const [transcriptTarget, setTranscriptTarget] = React.useState(null);
  const [integrationOpen, setIntegrationOpen] = React.useState(false);
  const [integrationProject, setIntegrationProject] = React.useState(null);
  const [newTaskOpen, setNewTaskOpen] = React.useState(false);
  const [projectsOpen, setProjectsOpen] = React.useState(false);
  const [projectDeleteTarget, setProjectDeleteTarget] = React.useState(null);
  const [deletingProject, setDeletingProject] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());

  const toastSeq = React.useRef(0);
  const busyRef = React.useRef({});
  const connRef = React.useRef("pending");

  /** 统一 Toast：3s 自动消失。 */
  const toast = React.useCallback((kind, text, ttl) => {
    const id = ++toastSeq.current;
    setToasts((previous) => previous.concat({ id, kind, text }));
    setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, pcNum(ttl, 3000));
  }, []);
  const dismissToast = React.useCallback((id) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const setBusyKey = React.useCallback((key, value) => {
    busyRef.current[key] = value;
    setBusy((previous) => {
      const next = Object.assign({}, previous);
      if (value) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  /** 拉取 /state（2s 轮询 + 手动刷新共用）。 */
  const load = React.useCallback(async () => {
    try {
      const next = await pcGetState();
      setState({ phase: "ready", value: next, error: null, fetchedAt: Date.now(), stale: false });
      if (connRef.current === "offline") toast("success", "已重新连接工程台宿主");
      connRef.current = "online";
      setConn("online");
    } catch (error) {
      setState((previous) =>
        previous.phase === "ready"
          ? Object.assign({}, previous, { stale: true, error })
          : { phase: "error", value: null, error, fetchedAt: null, stale: false },
      );
      if (connRef.current !== "offline") toast("error", `工程台宿主连接失败：${pcFriendlyError(error)}`);
      connRef.current = "offline";
      setConn("offline");
    }
    return undefined;
  }, [toast]);

  React.useEffect(() => {
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [load]);

  /** 每秒刷新一次「现在」，让运行时长/相对时间走字。 */
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** 项目被归档/删除后回到「全部项目」。 */
  React.useEffect(() => {
    const value = state.value;
    if (!value || !Array.isArray(value.projects)) return;
    if (selectedProject && !value.projects.some((project) => project.id === selectedProject)) setSelectedProject("");
  }, [state.value, selectedProject]);

  /** 进行中任务：每 4s 拉一次最近会话事件（卡片显示最新一条）。 */
  const runningIds = React.useMemo(() => {
    const value = state.value;
    if (!value || !Array.isArray(value.tasks)) return "";
    return value.tasks
      .filter((task) => task && pcColumnOf(task.status) === "running")
      .map((task) => task.id)
      .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
      .join(",");
  }, [state.value]);
  React.useEffect(() => {
    if (runningIds === "") return undefined;
    const ids = runningIds.split(",").map((value) => (Number.isNaN(Number(value)) ? value : Number(value)));
    let cancelled = false;
    const poll = async () => {
      const entries = {};
      for (const id of ids) {
        try {
          const payload = await pcGetTask(id);
          entries[id] = { events: Array.isArray(payload.events) ? payload.events : [], at: Date.now() };
        } catch {
          /* 单个任务事件失败不影响整体 */
        }
      }
      if (!cancelled && Object.keys(entries).length > 0) {
        setLive((previous) => Object.assign({}, previous, entries));
      }
    };
    poll();
    const timer = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runningIds]);

  /** 查看任务完整会话记录（隐藏会话在 native UI 打不开，只能用只读抽屉，不再调 uiWorkspace.openSession）。 */
  const openTranscript = React.useCallback(
    (task) => {
      if (!task) return;
      const sessionId = pcTaskSessionId(task);
      if (!sessionId) {
        toast("info", "这个任务还没有会话");
        return;
      }
      setTranscriptTarget({ taskId: task.id, sessionId });
    },
    [toast],
  );

  /** 下载验收报告：先让宿主生成（收集证据图片内联），再触发浏览器下载。 */
  const downloadReport = React.useCallback(
    async (task) => {
      if (!task) return;
      const id = task.id;
      const key = `report-${id}`;
      if (busyRef.current[key]) return;
      setBusyKey(key, true);
      try {
        const payload = await pcBuildReport(id);
        const report = (payload && payload.report) || {};
        const total = Number(report.imageCount ?? 0);
        const link = document.createElement("a");
        link.href = pcReportFileUrl(id);
        link.download = report.fileName || `acceptance-report-task-${id}.html`;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        if (total > 0) {
          toast("success", `验收报告已开始下载：内联 ${total} 张图（${report.fileSizeText || "—"}）`);
        } else {
          toast("error", "报告已生成，但没有采集到截图（任务没留图）；报告顶部已标红，建议打回让任务补截图");
        }
      } catch (error) {
        toast("error", pcFriendlyError(error));
      } finally {
        setBusyKey(key, false);
      }
    },
    [setBusyKey, toast],
  );

  /** 任务动作（派发/验收/复跑/优先级；打回与放弃走弹窗）。 */
  const runTaskAction = React.useCallback(
    async (kind, task) => {
      const id = task.id;
      if (kind === "abandon" || kind === "rework") {
        setPrompt({ kind, task });
        return;
      }
      const key = `${kind}-${id}`;
      if (busyRef.current[key]) return;
      let request = null;
      let successText = "";
      if (kind === "dispatch") {
        request = () => pcPost("/task/dispatch", { taskId: id });
        successText = `已派发任务 #${id}，宿主正在建 worktree 和会话`;
      } else if (kind === "accept") {
        request = () => pcPost("/task/accept", { taskId: id });
        successText = `已验收 #${id}，现在可以在「集成」面板发起集成`;
      } else if (kind === "verify") {
        request = () => pcPost("/verify/run", { taskId: id });
        successText = `已触发宿主复跑 #${id} 的 verify 命令`;
      } else if (kind === "priority-up") {
        request = () => pcPost("/task/update", { taskId: id, patch: { priority: pcNum(task.priority, 0) + 10 } });
        successText = `优先级 → P${pcNum(task.priority, 0) + 10}`;
      } else if (kind === "priority-down") {
        request = () => pcPost("/task/update", { taskId: id, patch: { priority: pcNum(task.priority, 0) - 10 } });
        successText = `优先级 → P${pcNum(task.priority, 0) - 10}`;
      } else if (kind === "resume") {
        request = () => pcResumeTask(id);
        successText = `已重新排队 #${id}`;
      } else if (kind === "estimate") {
        request = () => pcEstimateTask(id);
        successText = `已重估 #${id} 的工作量`;
      } else if (kind === "request-review") {
        // 本轮已自动请求过验收时，host 返回 code=already；用户主动点按钮视为要求重验，自动带 force 重试。
        request = async () => {
          try {
            return await pcRequestReview(id);
          } catch (error) {
            if (error && error.code === "already") return await pcRequestReview(id, true);
            throw error;
          }
        };
        successText = "已让工程台验收";
      } else {
        return;
      }
      setBusyKey(key, true);
      try {
        const result = await request();
        if (kind === "resume") {
          const dispatch = result && result.dispatch ? result.dispatch : null;
          if (dispatch && dispatch.ok) {
            toast("success", `已重新排队 #${id}，宿主已开始派发`);
          } else if (dispatch && dispatch.error) {
            toast("success", `已重新排队 #${id}，稍后自动派发（派发未开始：${dispatch.error}）`);
          } else {
            toast("success", `已重新排队 #${id}，稍后自动派发`);
          }
        } else if (kind === "verify") {
          const commands = result && Array.isArray(result.commands) ? result.commands : [];
          const failed = commands.filter((command) => command.ok === false || command.exitCode !== 0);
          if (commands.length === 0) toast("info", "宿主复跑：项目没有配置 verify 命令");
          else if (failed.length === 0) toast("success", `宿主复跑通过：${commands.length} 条命令全部返回 0`);
          else toast("error", `宿主复跑有失败：${failed.length}/${commands.length} 条命令退出码非 0，详见任务详情`);
        } else if (kind === "estimate") {
          const updated = result && result.task ? result.task : null;
          toast(
            "success",
            updated && updated.workloadLabel
              ? `#${id} 工作量 → ${updated.workloadLabel}（size ${String(updated.size || "").toUpperCase()}）`
              : `已重估 #${id} 的工作量`,
          );
        } else {
          toast("success", successText);
        }
        await load();
      } catch (error) {
        toast("error", pcFriendlyError(error));
      } finally {
        setBusyKey(key, false);
      }
    },
    [load, setBusyKey, toast],
  );

  /** 打回 / 放弃 弹窗确认。 */
  const confirmPrompt = React.useCallback(
    async (text) => {
      const current = prompt;
      if (!current) return;
      const id = current.task.id;
      const key = `${current.kind}-${id}`;
      if (busyRef.current[key]) return;
      setBusyKey(key, true);
      try {
        if (current.kind === "rework") {
          await pcPost("/task/rework", { taskId: id, feedback: text });
          toast("success", `已打回 #${id}，返工意见已 followup 给原会话`);
        } else {
          await pcPost("/task/abandon", { taskId: id, reason: text });
          toast("success", `已放弃 #${id}，worktree 与任务分支已清理`);
        }
        setPrompt(null);
        await load();
      } catch (error) {
        toast("error", pcFriendlyError(error));
      } finally {
        setBusyKey(key, false);
      }
    },
    [load, prompt, setBusyKey, toast],
  );

  /** 回答澄清问题（dispatch=true 会继续任务会话）。 */
  const answerQuestion = React.useCallback(
    async (question, answer) => {
      const key = `question-${question.id}`;
      if (busyRef.current[key]) return;
      setBusyKey(key, true);
      try {
        const result = await pcPost("/question/answer", { questionId: question.id, answer, dispatch: true });
        const boundTask = (result && result.question && result.question.taskId !== null) || question.taskId !== null;
        if (boundTask) toast("success", "已回答，任务会话继续执行");
        else toast("success", "已回答，已同步给工程台会话");
        await load();
      } catch (error) {
        toast("error", pcFriendlyError(error));
      } finally {
        setBusyKey(key, false);
      }
    },
    [load, setBusyKey, toast],
  );

  /** 和工程台聊：open lead 隐藏会话对应的页面内对话抽屉（不再调 native openSession）。 */
  const openLeadChat = React.useCallback(async () => {
    const current = state.value;
    if (!current) return;
    const leadSessionId = pcLeadSessionId(current);
    if (leadSessionId) {
      setSessionsOpen(false);
      setLeadChatOpen(true);
      return;
    }
    const key = "lead-create";
    if (busyRef.current[key]) return;
    setBusyKey(key, true);
    try {
      const created = await pcPost("/lead/create", {});
      toast("success", "已创建工程台会话");
      await load();
      setSessionsOpen(false);
      setLeadChatOpen(true);
    } catch (error) {
      toast("error", pcFriendlyError(error));
    } finally {
      setBusyKey(key, false);
    }
  }, [state.value, load, setBusyKey, toast]);

  /** 请求取消任务（先弹确认框）。 */
  const requestCancelTask = React.useCallback((task) => {
    if (!task) return;
    setCancelTarget(task);
  }, []);

  /** 确认取消任务：POST /task/cancel → abandoned + cancelled；409（已验收/已合并）toast。 */
  const confirmCancelTask = React.useCallback(async () => {
    if (!cancelTarget || canceling) return;
    const targetId = cancelTarget.id;
    setCanceling(true);
    try {
      const result = await pcCancelTask(targetId);
      const agentCancelled = Boolean(result && result.agentCancelled);
      toast("success", `已取消任务 #${targetId}${agentCancelled ? "（会话已终止）" : ""}，可在已归档里点「继续」重做`);
      setCancelTarget(null);
      await load();
    } catch (error) {
      toast("error", pcFriendlyError(error));
    } finally {
      setCanceling(false);
    }
  }, [cancelTarget, canceling, load, toast]);

  /** 请求彻底删除任务（先弹确认框）。 */
  const requestDeleteTask = React.useCallback((task) => {
    if (!task) return;
    setDeleteTarget(task);
  }, []);

  /** 确认彻底删除（仅非运行中任务允许；host 返回 409 时给 toast）。 */
  const confirmDeleteTask = React.useCallback(async () => {
    if (!deleteTarget || deleting) return;
    const targetId = deleteTarget.id;
    setDeleting(true);
    try {
      const result = await pcDeleteTask(targetId);
      const deleted = result && result.deleted ? result.deleted : null;
      toast("success", `已彻底删除任务 #${deleted && deleted.taskId !== undefined ? deleted.taskId : targetId}`);
      setDeleteTarget(null);
      if (detailId !== null && String(detailId) === String(targetId)) {
        setDetailId(null);
        setDetailFocusEvents(false);
      }
      await load();
    } catch (error) {
      toast("error", pcFriendlyError(error));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, detailId, load, toast]);

  /** 打开项目管理弹窗（顶栏「项目」）。 */
  const openProjects = React.useCallback(() => setProjectsOpen(true), []);

  /** 请求删除项目（先弹确认框）。 */
  const requestDeleteProject = React.useCallback((project) => {
    if (!project) return;
    setProjectDeleteTarget(project);
  }, []);

  /** 切换项目任务会话权限（workerFilePolicy）。 */
  const updateProjectPolicy = React.useCallback(async (project, workerFilePolicy) => {
    if (!project || !workerFilePolicy) return;
    try {
      await pcPost("/project/update", { projectId: project.id, patch: { workerFilePolicy } });
      toast("success", `项目「${project.name || project.id}」任务权限 → ${workerFilePolicy}`);
      await load();
    } catch (error) {
      toast("error", pcFriendlyError(error));
    }
  }, [load, toast]);

  /** 确认彻底删除项目：连带任务记录；有执行中任务时 host 返回 409，给 toast。 */
  const confirmDeleteProject = React.useCallback(async () => {
    if (!projectDeleteTarget || deletingProject) return;
    const target = projectDeleteTarget;
    setDeletingProject(true);
    try {
      const result = await pcDeleteProject(target.id);
      const deleted = result && result.deleted ? result.deleted : null;
      const taskCount = deleted && Array.isArray(deleted.tasks) ? deleted.tasks.length : 0;
      toast("success", `已删除项目「${target.name || target.id}」${taskCount > 0 ? `（连带 ${taskCount} 个任务记录）` : ""}`);
      setProjectDeleteTarget(null);
      await load();
    } catch (error) {
      toast("error", pcFriendlyError(error));
    } finally {
      setDeletingProject(false);
    }
  }, [projectDeleteTarget, deletingProject, load, toast]);

  /** 打开会话面板（顶栏「会话」）。 */
  const openSessionsPanel = React.useCallback(() => {
    setSessionsHighlight(null);
    setSessionsOpen(true);
  }, []);

  /** 会话面板「查看日志」：任务会话打开详情并滚到事件区；lead 会话只提示去聊天看。 */
  const viewSessionLog = React.useCallback(
    (session) => {
      if (session && session.kind === "task" && session.taskId !== null && session.taskId !== undefined) {
        setSessionsOpen(false);
        setDetailFocusEvents(true);
        setDetailId(session.taskId);
        return;
      }
      toast("info", "工程台会话的日志在聊天里查看；这里能看到最近一条事件");
    },
    [toast],
  );

  /** 会话面板「隐藏」：POST /session/archive（侧栏隐藏，数据保留）。 */
  const hideSession = React.useCallback(
    async (session) => {
      if (!session || !session.id) return;
      try {
        await pcArchiveSession(session.id);
        toast("success", "已隐藏会话（侧栏不再显示，会话数据保留）");
        await load();
      } catch (error) {
        toast("error", pcFriendlyError(error));
      }
    },
    [load, toast],
  );

  const manualRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const value = state.value;
  const projects = value && Array.isArray(value.projects) ? value.projects : [];
  const hasProjects = projects.length > 0;
  const ready = state.phase === "ready";
  const counters = ready ? pcCountersOf(value, selectedProject) : { todo: 0, running: 0, review: 0, done: 0, questions: 0, total: 0 };
  const questions = ready ? pcOpenQuestions(value, selectedProject) : [];
  const tasks = ready ? pcTasksOf(value, selectedProject) : [];
  const fallbackDetailTask = tasks.find((task) => String(task.id) === String(detailId)) || null;
  const sessions = ready ? pcSessionList(value) : [];
  const sessionsCount = sessions.length;
  // 删除项目确认框：实时统计项目名下任务，执行中的任务会挡住删除（与 host 的 ACTIVE 集合一致）。
  const projectDeleteTasks = projectDeleteTarget && value && Array.isArray(value.tasks)
    ? value.tasks.filter((task) => task.projectId === projectDeleteTarget.id)
    : [];
  const projectDeleteBusy = projectDeleteTasks.filter((task) => ["provisioning", "running", "verifying"].includes(task.status));
  const projectDeleteTodo = projectDeleteTasks.filter((task) => ["inbox", "queued", "needs_input"].includes(task.status)).length;
  const projectDeleteReview = projectDeleteTasks.filter((task) => ["needs_review", "failed"].includes(task.status)).length;
  const projectDeleteDone = projectDeleteTasks.filter((task) => ["accepted", "merged", "abandoned"].includes(task.status)).length;

  const openDetail = React.useCallback((taskId) => {
    setDetailFocusEvents(false);
    setDetailId(taskId);
  }, []);
  const openIntegration = React.useCallback(
    (projectId) => {
      setIntegrationProject(projectId || selectedProject || null);
      setIntegrationOpen(true);
    },
    [selectedProject],
  );
  const closeIntegration = React.useCallback(() => setIntegrationOpen(false), []);

  let content = null;
  if (state.phase === "loading") {
    content = React.createElement(PcEmpty, {
      icon: "history",
      title: "正在连接工程台…",
      desc: "读取 GET /project-console-api/state。",
    });
  } else if (state.phase === "error") {
    content = React.createElement(PcHostDownEmpty, {
      state,
      refreshing,
      onRetry: manualRefresh,
    });
  } else if (!hasProjects) {
    content = React.createElement(PcNoProjectsEmpty, {
      toast,
      onCreated: load,
    });
  } else {
    content = React.createElement(PcBoard, {
      state: value,
      selectedProject,
      busy,
      live,
      now,
      onTaskAction: runTaskAction,
      onOpenDetail: openDetail,
      onViewTranscript: openTranscript,
      onOpenIntegration: openIntegration,
      onDeleteTask: requestDeleteTask,
      onCancelTask: requestCancelTask,
    });
  }

  return React.createElement(
    "div",
    { className: "pc-root", "data-testid": "pc-root" },
    React.createElement(PcTopBar, {
      state,
      conn,
      refreshing,
      busy,
      selectedProject,
      onSelectProject: setSelectedProject,
      onNewTask: () => setNewTaskOpen(true),
      onOpenProjects: openProjects,
      onOpenIntegration: openIntegration,
      onOpenSessions: openSessionsPanel,
      sessionsCount,
      onLeadChat: openLeadChat,
      onOpenSettings: () => setSettingsOpen(true),
      onRefresh: manualRefresh,
    }),
    ready && hasProjects
      ? React.createElement(PcStatBar, { state: value, counters })
      : null,
    ready && hasProjects
      ? React.createElement(PcQuestionsZone, {
          questions,
          tasks: value.tasks || [],
          projects,
          now,
          busy,
          onAnswer: answerQuestion,
          onOpenDetail: openDetail,
        })
      : null,
    content,
    detailId !== null && ready
      ? React.createElement(PcDetailDrawer, {
          ctx,
          taskId: detailId,
          fallbackTask: fallbackDetailTask,
          state: value,
          now,
          busy,
          onTaskAction: runTaskAction,
          onViewTranscript: openTranscript,
          onOpenIntegration: openIntegration,
          onDeleteTask: requestDeleteTask,
          onCancelTask: requestCancelTask,
          onDownloadReport: downloadReport,
          focusEvents: detailFocusEvents,
          onClose: () => {
            setDetailId(null);
            setDetailFocusEvents(false);
          },
        })
      : null,
    transcriptTarget && ready
      ? React.createElement(PcSessionViewerDrawer, {
          state: value,
          taskId: transcriptTarget.taskId,
          now,
          onClose: () => setTranscriptTarget(null),
        })
      : null,
    sessionsOpen && ready
      ? React.createElement(PcSessionsDrawer, {
          state: value,
          now,
          highlightSessionId: sessionsHighlight,
          onOpenLeadChat: openLeadChat,
          onViewLog: viewSessionLog,
          onHideSession: hideSession,
          onRefresh: load,
          onClose: () => {
            setSessionsOpen(false);
            setSessionsHighlight(null);
          },
        })
      : null,
    leadChatOpen && ready
      ? React.createElement(PcLeadChatDrawer, {
          state: value,
          toast,
          onClose: () => setLeadChatOpen(false),
          onPrompted: load,
        })
      : null,
    integrationOpen && ready
      ? React.createElement(PcIntegrationDrawer, {
          state: value,
          selectedProject,
          initialProjectId: integrationProject,
          now,
          busy,
          toast,
          onRefresh: load,
          onClose: closeIntegration,
      })
      : null,
    settingsOpen && ready
      ? React.createElement(PcSettingsDialog, {
          state,
          toast,
          onClose: () => setSettingsOpen(false),
          onSaved: load,
        })
      : null,
    cancelTarget
      ? React.createElement(
          PcModal,
          {
            title: "取消任务",
            width: 500,
            onClose: canceling ? undefined : () => setCancelTarget(null),
            footer: React.createElement(
              React.Fragment,
              null,
              React.createElement(PcButton, { variant: "ghost", size: "md", onClick: () => setCancelTarget(null), disabled: canceling }, "不取消"),
              React.createElement(
                PcButton,
                { variant: "danger", size: "md", icon: "close", loading: canceling, onClick: confirmCancelTask, testId: "pc-btn-cancel-confirm" },
                "确认取消",
              ),
            ),
          },
          React.createElement(
            "div",
            { className: "pc-question-text" },
            `取消任务 #${cancelTarget.id}？会终止会话并把任务标记为已取消，可之后在已归档里点「继续」重做。`,
          ),
          React.createElement(
            "div",
            { className: "pc-note" },
            `任务「${cancelTarget.title || "未命名"}」当前状态：${pcStatusMeta(cancelTarget.status).label}。取消后任务进入已归档（分类：操作员取消），需要时可以点「继续」重新排队。`,
          ),
        )
      : null,
    deleteTarget
      ? React.createElement(
          PcModal,
          {
            title: "彻底删除任务",
            width: 480,
            onClose: deleting ? undefined : () => setDeleteTarget(null),
            footer: React.createElement(
              React.Fragment,
              null,
              React.createElement(PcButton, { variant: "ghost", size: "md", onClick: () => setDeleteTarget(null), disabled: deleting }, "取消"),
              React.createElement(
                PcButton,
                { variant: "danger", size: "md", icon: "trash", loading: deleting, onClick: confirmDeleteTask, testId: "pc-btn-delete-confirm" },
                "彻底删除",
              ),
            ),
          },
          React.createElement(
            "div",
            { className: "pc-question-text" },
            `彻底删除任务 #${deleteTarget.id}？该操作不可恢复。`,
          ),
          React.createElement(
            "div",
            { className: "pc-note" },
            `任务「${deleteTarget.title || "未命名"}」当前状态：${pcStatusMeta(deleteTarget.status).label}。删除会同时移除运行记录、澄清问题和任务会话；已合并到 base 的提交不受影响。`,
          ),
        )
      : null,
    prompt
      ? React.createElement(PcPromptModal, {
          prompt,
          busy: Boolean(busy[`${prompt.kind}-${prompt.task.id}`]),
          toast,
          onCancel: () => setPrompt(null),
          onConfirm: confirmPrompt,
        })
      : null,
    newTaskOpen && ready
      ? React.createElement(PcNewTaskDialog, {
          projects,
          defaultProjectId: selectedProject,
          toast,
          onCancel: () => setNewTaskOpen(false),
          onCreated: () => {
            setNewTaskOpen(false);
            load();
          },
        })
      : null,
    projectsOpen && ready
      ? React.createElement(PcProjectsDialog, {
          projects,
          toast,
          onDelete: requestDeleteProject,
          onPolicyChange: updateProjectPolicy,
          onCreated: load,
          onClose: () => setProjectsOpen(false),
        })
      : null,
    projectDeleteTarget
      ? React.createElement(
          PcModal,
          {
            title: "删除项目",
            width: 560,
            onClose: deletingProject ? undefined : () => setProjectDeleteTarget(null),
            footer: React.createElement(
              React.Fragment,
              null,
              React.createElement(
                PcButton,
                { variant: "ghost", size: "md", onClick: () => setProjectDeleteTarget(null), disabled: deletingProject },
                "取消",
              ),
              React.createElement(
                PcButton,
                {
                  variant: "danger",
                  size: "md",
                  icon: "trash",
                  loading: deletingProject,
                  disabled: projectDeleteBusy.length > 0,
                  onClick: confirmDeleteProject,
                  testId: "pc-btn-delete-project-confirm",
                },
                "删除项目",
              ),
            ),
          },
          React.createElement(
            "div",
            { className: "pc-question-text" },
            `彻底删除项目「${projectDeleteTarget.name || projectDeleteTarget.id}」？该操作不可恢复。`,
          ),
          React.createElement(
            "div",
            { className: "pc-note" },
            `会连带删除名下 ${projectDeleteTasks.length} 个任务记录` +
              (projectDeleteTasks.length > 0
                ? `（待办 ${projectDeleteTodo} / 进行中 ${projectDeleteBusy.length} / 验收中 ${projectDeleteReview} / 已归档 ${projectDeleteDone}）`
                : "") +
              `，以及它们的运行记录、待澄清问题和集成批次；worktree、任务分支、验收报告和证据归档会一并清理。仓库 ${projectDeleteTarget.repoPath || "目录"} 本身和已合并到主干分支的提交不受影响。`,
          ),
          projectDeleteBusy.length > 0
            ? React.createElement(
                "div",
                { className: "pc-error-box" },
                `项目还有 ${projectDeleteBusy.length} 个任务在执行（${projectDeleteBusy.map((task) => `#${task.id}`).join("、")}），先取消或等它们结束后再删。`,
              )
            : null,
        )
      : null,
    React.createElement(PcToastStack, { toasts, onDismiss: dismissToast }),
  );
}
