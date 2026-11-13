window.__ModuleLoader__.load({
	id: "dsh-project-console",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
		void require("react/jsx-runtime");

		// ===== src/client/i18n.js =====
		/**
		 * 工程台 UI 文案的本地化（zh / en）。
		 *
		 * 做法：源码里的中文就是词典 key；`pcElement` 在创建 React 元素时翻译
		 * 直接字符串子节点和常见的文本属性。用户数据（任务标题、项目名）只在
		 * 恰好等于某条 UI 文案时才会被翻到，正常不会命中。
		 */

		const PC_I18N_NS = "dsh-project-console";

		/** 英文词典。zh 词典由 key 自身生成，保证中文界面永远拿到原文。 */
		const PC_EN = {
		  "网络请求失败：无法连接工程台宿主": "Network request failed: cannot reach the Project Console host",
		  "操作失败": "Operation failed",
		  "正在连接工程台…": "Connecting to Project Console…",
		  "连接中断，正在重试…": "Connection lost, retrying…",
		  "工程台": "Project Console",
		  "按项目筛选看板": "Filter board by project",
		  "全部项目": "All projects",
		  "会话列表：工程台会话 + 任务会话（任务会话已隐藏，左栏看不到）": "Session list: Project Console sessions + task sessions (task sessions are hidden from the left column)",
		  "会话": "Sessions",
		  "项目管理：添加项目、删除项目（连带任务记录）": "Project management: add and remove projects (removing also deletes their task records)",
		  "项目": "Projects",
		  "新需求": "New request",
		  "集成": "Integrate",
		  "打开工程台 lead 会话": "Open the Project Console lead session",
		  "创建工程台 lead 会话": "Create a Project Console lead session",
		  "和工程台聊": "Chat with Project Console",
		  "创建工程台会话": "Create Project Console session",
		  "设置：配置低/中/高工作量分别用哪个模型": "Settings: which model to use for low/medium/high workload",
		  "设置": "Settings",
		  "立即刷新状态": "Refresh status now",
		  "刷新": "Refresh",
		  "请填写项目名称": "Enter a project name",
		  "请填写仓库绝对路径": "Enter the repository's absolute path",
		  " : \"\"}，开始添加第一个需求吧": " : \"\"}, let's add your first request",
		  "项目名称": "Project name",
		  "例如 my-project": "e.g. my-project",
		  "仓库绝对路径": "Repository absolute path",
		  "必须是本机已存在的 Git 仓库": "Must be an existing Git repository on this machine",
		  "例如 /path/to/your-repo": "e.g. /path/to/your-repo",
		  "主干分支": "Main branch",
		  "集成完成后推送到这个分支（一般填 main）": "Integration pushes to this branch when done (usually main)",
		  "任务会话权限": "Task session permissions",
		  "workspace-write 只能写 worktree；全权限适合依赖 home 缓存的视觉任务": "workspace-write can only write to the worktree; full access suits visual tasks that rely on home cache",
		  "只写 worktree（workspace-write，推荐）": "Write to worktree only (workspace-write, recommended)",
		  "宿主全权限（danger-full-access，信任模式）": "Full host access (danger-full-access, trusted mode)",
		  "添加项目": "Add project",
		  "工程台跟踪的仓库。删除项目会连它名下的任务记录一起删；仓库本身和已合并到主干分支的提交不动。": "Repositories tracked by Project Console. Deleting a project also deletes its task records; the repository itself and commits already merged into the main branch are left untouched.",
		  "关闭": "Close",
		  "已登记的项目": "Registered projects",
		  "还没有项目。用下面的表单添加一个，工程台才能建需求、派任务。": "No projects yet. Add one with the form below so Project Console can create requests and dispatch tasks.",
		  "项目 id": "Project id",
		  "已归档": "Archived",
		  "（未设置仓库路径）": "(no repository path set)",
		  "任务权限": "Task permissions",
		  "删除": "Delete",
		  "provider，如 mtcode": "provider, e.g. mtcode",
		  "model，如 deepseek-flash": "model, e.g. deepseek-flash",
		  "思考强度，如 max（可空）": "reasoning effort, e.g. max (optional)",
		  "跟随项目 / 部署默认": "Follow project / deployment default",
		  "模型默认": "Model default",
		  "模型": "Model",
		  "思考强度": "Reasoning effort",
		  "设置已保存，对后续派发生效": "Settings saved; applies to future dispatches",
		  "工作台自己的模型、低/中/高工作量派发用的模型、以及同时能跑多少任务（并发槽位）。": "The workbench's own model, the models used to dispatch low/medium/high workload, and how many tasks can run at once (concurrency slots).",
		  "取消": "Cancel",
		  "保存配置": "Save settings",
		  "正在读取模型目录…": "Loading model catalog…",
		  "工作台模型": "Workbench model",
		  "工程台会话（和工程台聊的那位）和工作量判定都用它。留空 = 部署默认。": "Used by the Project Console session (the one you chat with) and by workload sizing. Blank = deployment default.",
		  "工作量模型": "Workload model",
		  "任务派发时按工作量档位选模型；留空 = 跟随项目 workerModel / 部署默认。": "A model is picked per workload tier when dispatching tasks; blank = follow the project's workerModel / deployment default.",
		  "验收与上下文": "Acceptance and context",
		  "验收链路固定：一次性判定器 → need_info 时宿主复跑项目验证 → 仍缺证据时只读深审 → accept 前宿主再复跑一次项目验证。": "The acceptance chain is fixed: one-shot judge → on need_info, the host re-runs project verification → if evidence is still missing, a read-only deep review → before accept, the host re-runs project verification once more.",
		  "验收执行者": "Who runs acceptance",
		  "一次性判定器（推荐）": "One-shot judge (recommended)",
		  "lead 自动验收（旧行为）": "Lead auto-acceptance (old behavior)",
		  "关闭自动验收（只人工）": "Turn off auto-acceptance (manual only)",
		  "lead 上下文轮换阈值（tokens）": "Lead context rotation threshold (tokens)",
		  "最多内联图片数": "Max inlined images",
		  "1–8；只对视觉类任务生效": "1–8; only applies to visual tasks",
		  "调度": "Scheduling",
		  "自动派发（待办任务排到就派发；关掉后只能在任务上手动点「派发」）": "Auto-dispatch (dispatch backlog tasks as they reach the front; when off, you can only dispatch manually from a task)",
		  "全局并发槽位": "Global concurrency slots",
		  "并发按槽位算：任务按工作量占槽（低 1、中 2、高 4、极大 6），全局和项目上限谁先满谁挡派发。改完对后续派发生效，不动运行中的任务。": "Concurrency is counted in slots: a task takes slots by workload (low 1, medium 2, high 4, extra-large 6); whichever cap fills first, global or project, blocks dispatching. Changes apply to future dispatches and leave running tasks alone.",
		  "项目并发槽位": "Project concurrency slots",
		  "工程台宿主未就绪": "Project Console host not ready",
		  "页面本身已加载，但读不到宿主状态接口 GET /project-console-api/state。host 半边可能还在实现、还没加载，或者 DSH 需要重启一次。UI 会在状态可用后自动出现看板，不用刷新页面。": "The page itself has loaded, but the host state endpoint GET /project-console-api/state is unreachable. The host half may still be under construction or not loaded yet, or DSH may need a restart. The board appears automatically once state is available — no page refresh needed.",
		  "重试": "Retry",
		  "排查：curl 同源 /project-console-api/ping 应返回 {ok:true}；/state 由 host 侧提供。": "To debug: curl the same-origin /project-console-api/ping, which should return {ok:true}; /state is served by the host side.",
		  "（HTTP 404 = 宿主路由未注册）": "(HTTP 404 = host route not registered)",
		  "（HTTP 403 = 写请求挡板/来源校验拒绝）": "(HTTP 403 = rejected by the write guard/origin check)",
		  "（无法连接宿主）": "(cannot reach the host)",
		  "还没有项目，先添加一个": "No projects yet — add one first",
		  "工程台会把需求派发到项目仓库的独立 worktree 里执行，跑完在测试分支上集成测试，人工确认后再推送到主干分支。": "Project Console dispatches a request into a separate worktree in the project repository, runs integration tests on a test branch when it finishes, and pushes to the main branch after a human confirms.",
		  "请先选择项目": "Select a project first",
		  "请填写任务标题": "Enter a task title",
		  "请填写需求原文（可粘贴 PRD）": "Enter the request text (you can paste a PRD)",
		  "创建任务…": "Creating task…",
		  " : \"\"}，确认规格后即可派发": " : \"\"}, once the spec is confirmed you can dispatch",
		  "新建需求": "New request",
		  "创建后进入「待办」列；确认规格后点「派发」，宿主会建 worktree + 会话并开始执行。截图会随任务简报一起交给执行会话。": "New tasks land in the Backlog column; after you confirm the spec, click Dispatch and the host creates a worktree and a session and starts work. Screenshots are handed to the execution session along with the task brief.",
		  "创建任务": "Create task",
		  "任务标题": "Task title",
		  "一句话说清要做什么，例如：给页面加一个深色模式开关": "One line on what needs doing, e.g. add a dark mode toggle to the page",
		  "需求原文 / 简报": "Request text / brief",
		  "可以粘贴 PRD、设计稿说明、验收要点；写给执行会话看": "Paste the PRD, design notes, or acceptance points; this is what the execution session reads",
		  "粘贴需求原文或 PRD 摘要…\\n\\n背景、目标、约束、参考文件路径都可以写在这里；截图可以直接 Ctrl+V 粘贴到这里。": "Paste the request text or PRD summary…\\n\\nBackground, goals, constraints, and reference file paths all go here; you can also Ctrl+V screenshots straight into this box.",
		  "参考截图": "Reference screenshots",
		  "选择图片": "Choose images",
		  "也可以直接在「需求原文」输入框里 Ctrl+V 粘贴剪贴板截图。最多 6 张、单张不超过 8MB（PNG / JPEG / WebP / GIF）。": "You can also Ctrl+V a screenshot from the clipboard straight into the Request text box. Up to 6 images, 8MB each (PNG / JPEG / WebP / GIF).",
		  "移除这张图": "Remove this image",
		  "移除参考截图": "Remove reference screenshots",
		  "类型": "Type",
		  "优先级": "Priority",
		  "数字越大越先派发": "Higher numbers dispatch first",
		  "预计触及路径": "Paths likely touched",
		  "逗号分隔；用于冲突域提示，可留空": "Comma-separated; used for conflict hints, can be left blank",
		  "请填写返工意见": "Enter rework feedback",
		  "请填写放弃原因": "Enter a reason for abandoning",
		  "意见会 followup 回原任务会话，任务重新进入运行中。": "Feedback is sent back to the original task session as a follow-up, and the task returns to running.",
		  "放弃会清理 worktree 与任务分支，patch 会保留在任务记录里。": "Abandoning cleans up the worktree and task branch; the patch stays in the task record.",
		  "确认打回": "Confirm rework",
		  "确认放弃": "Confirm abandon",
		  "返工意见": "Rework feedback",
		  "放弃原因": "Reason for abandoning",
		  "哪里不达标、期望改成什么样、要补哪些验证…": "What falls short, how it should change, which checks to add…",
		  "为什么放弃这个任务…": "Why are you abandoning this task…",
		  "已重新连接工程台宿主": "Reconnected to the Project Console host",
		  "这个任务还没有会话": "This task has no session yet",
		  "报告已生成，但没有采集到截图（任务没留图）；报告顶部已标红，建议打回让任务补截图": "The report is ready but no screenshots were captured (the task left none); it is flagged red at the top — consider sending it back so the task can add screenshots",
		  "已让工程台验收": "Sent to Project Console for acceptance",
		  "宿主复跑：项目没有配置 verify 命令": "Host re-run: no verify command configured for the project",
		  "已回答，任务会话继续执行": "Answered; the task session continues",
		  "已回答，已同步给工程台会话": "Answered; synced to the Project Console session",
		  "已创建工程台会话": "Project Console session created",
		  "工程台会话的日志在聊天里查看；这里能看到最近一条事件": "Project Console session logs live in the chat; the latest event shows here",
		  "已隐藏会话（侧栏不再显示，会话数据保留）": "Session hidden (no longer in the sidebar, session data kept)",
		  "读取 GET /project-console-api/state。": "Reads GET /project-console-api/state.",
		  "取消任务": "Cancel task",
		  "不取消": "Don't cancel",
		  "确认取消": "Confirm cancel",
		  "彻底删除任务": "Delete task permanently",
		  "彻底删除": "Delete permanently",
		  "删除项目": "Delete project",
		  ").join(\"、\")}），先取消或等它们结束后再删。": "\").join(\"、\")}), cancel them or wait for them to finish before deleting.",
		  "未创建": "Not created",
		  "运行中": "Running",
		  "空闲": "Idle",
		  "已创建": "Created",
		  "槽位": "Slots",
		  "待办": "Queued",
		  "进行中": "In progress",
		  "验收中": "In review",
		  "待澄清": "Needs clarification",
		  "工程台数据目录磁盘占用": "Project Console data directory disk usage",
		  "磁盘": "Disk",
		  "工程台 lead 会话状态": "Project Console lead session status",
		  "工程台会话 · ": "Project Console session · ",
		  "待回答": "Awaiting answer",
		  "打开任务详情": "Open task details",
		  "（无文本）": "(no text)",
		  "或输入自定义回答…": "Or write a custom answer…",
		  "输入回答…": "Write an answer…",
		  "回复": "Reply",
		  "待澄清问题": "Clarification question",
		  "回答后任务会继续执行": "The task continues after you answer",
		  "diff 增删行数": "Diff lines added / removed",
		  "建 worktree + 会话并派发任务": "Create worktree + session and dispatch task",
		  "派发": "Dispatch",
		  "查看任务详情": "View task details",
		  "详情": "Details",
		  "放弃任务并清理 worktree": "Abandon task and clean up worktree",
		  "放弃": "Abandon",
		  "提高优先级": "Raise priority",
		  "降低优先级": "Lower priority",
		  "查看任务完整会话记录（隐藏会话，不跳 native）": "View the task's full session log (hidden session, no jump to native)",
		  "任务还没有会话": "Task has no session yet",
		  "会话记录": "Session log",
		  "取消需求：终止会话并把任务标记为已取消（之后可在已归档里点「继续」重做）": "Cancel requirement: stop the session and mark the task cancelled (you can later click Continue in Archived to redo it)",
		  "取消需求": "Cancel requirement",
		  "验收通过：宿主 squash 提交到任务分支": "Pass acceptance: the host squashes a commit onto the task branch",
		  "验收": "Accept",
		  "打回并附上返工意见": "Send back with rework notes",
		  "打回": "Send back",
		  "让工程台 lead 用 project_accept / project_rework 重新验收一次": "Have the Project Console lead run acceptance again via project_accept / project_rework",
		  "让工程台验收": "Let Project Console accept",
		  "宿主在 worktree 里复跑 verify 命令": "The host reruns the verify command in the worktree",
		  "复跑": "Rerun",
		  "查看集成批次": "View integration batches",
		  "查集成批次": "Integration batches",
		  "工程台 super agent 正在验收（人工可覆盖）": "Project Console super agent is running acceptance (manual override possible)",
		  "优先级（数字越大越先派发）": "Priority (higher numbers dispatch first)",
		  "彻底删除任务（不可恢复）": "Delete task permanently (cannot be undone)",
		  "本次运行时长": "Run duration",
		  "selfTest 通过数/总数": "selfTest passes / total",
		  "任务附带的参考截图（详情里可看）": "Reference screenshots attached to the task (viewable in details)",
		  "（未命名任务）": "(untitled task)",
		  "等待澄清回答后继续": "Waiting for a clarification answer before continuing",
		  "等待会话事件…": "Waiting for session events…",
		  "工程台验收中…（可人工覆盖）": "Project Console acceptance in progress… (manual override possible)",
		  "主仓在任务执行期间有变更（drift），验收前注意对比": "The main repo changed while the task was running (drift); compare before accepting",
		  "工程台 super agent 正在审查证据": "Project Console super agent is reviewing the evidence",
		  "可点「让工程台验收」或人工验收": "Click \"Let Project Console accept\" or accept manually",
		  "失败原因": "Failure reason",
		  "重新排队并派发（POST /task/resume）": "Re-queue and dispatch (POST /task/resume)",
		  "继续": "Continue",
		  "关闭提示": "Dismiss",
		  "\n.pc-root {\n  --pc-mono: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);\n  --pc-radius: 12px;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  min-height: 0;\n  min-width: 0;\n  width: 100%;\n  position: relative;\n  overflow: hidden;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  font-family: var(--dsw-font-family, system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif);\n  font-size: 13px;\n  line-height: 1.45;\n  -webkit-font-smoothing: antialiased;\n}\n.pc-root * { box-sizing: border-box; }\n.pc-root ::-webkit-scrollbar { width: 8px; height: 8px; }\n.pc-root ::-webkit-scrollbar-thumb {\n  background: var(--dsw-alias-scrollbar-bg-l2, #cfd3d6);\n  border-radius: 4px;\n}\n.pc-root ::-webkit-scrollbar-track { background: transparent; }\n.pc-mono { font-family: var(--pc-mono); font-variant-numeric: tabular-nums; }\n.pc-dim { color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-faint { color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-secondary { color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-num { font-family: var(--pc-mono); font-variant-numeric: tabular-nums; }\n.pc-warn-text { color: var(--dsw-alias-state-warn-label, #b45309); }\n.pc-err-text { color: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-ok-text { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 82%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-grow { flex: 1 1 auto; min-width: 0; }\n.pc-row { display: flex; align-items: center; gap: 8px; min-width: 0; }\n.pc-stack { display: flex; flex-direction: column; gap: 6px; min-width: 0; }\n.pc-divider { height: 1px; background: var(--dsw-alias-border-l1, #0000000a); margin: 2px 0; }\n.pc-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-note { font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-tertiary, #81858c); white-space: pre-wrap; word-break: break-word; }\n.pc-error-box {\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, var(--dsw-alias-bg-base, #fff));\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  border-radius: 9px;\n  padding: 8px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  word-break: break-word;\n}\n\n/* ---------- 顶栏 ---------- */\n.pc-topbar {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 10px 20px;\n  border-bottom: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  min-width: 0;\n}\n.pc-brand { display: flex; align-items: center; gap: 9px; min-width: 0; flex: none; }\n.pc-brand-icon {\n  width: 28px; height: 28px;\n  border-radius: 9px;\n  display: grid; place-items: center;\n  color: #fff;\n  background: linear-gradient(140deg, var(--dsw-static-deepseek-450, #5686fe), var(--dsw-static-deepseek-600, #4868b2));\n  box-shadow: 0 1px 3px rgb(65 118 230 / 0.32);\n}\n.pc-brand-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }\n.pc-brand-title { font-size: 15px; font-weight: 650; letter-spacing: 0.2px; line-height: 1.2; }\n.pc-brand-sub {\n  display: flex; align-items: center; gap: 5px;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  line-height: 1.2; white-space: nowrap;\n}\n.pc-topbar-spacer { flex: 1 1 auto; min-width: 12px; }\n.pc-topbar-actions { display: flex; align-items: center; gap: 8px; flex: none; }\n.pc-project-select {\n  height: 30px;\n  width: 196px;\n  max-width: 196px;\n  font-family: inherit;\n  font-size: 12px;\n  font-weight: 500;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  background: var(--dsw-alias-bg-base, #fff);\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  padding: 0 26px 0 9px;\n  outline: none;\n  cursor: pointer;\n  appearance: none;\n  background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381858c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9.5l6 6 6-6'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat;\n  background-position: right 8px center;\n}\n.pc-project-select:hover { border-color: var(--dsw-alias-border-l3, #0000001f); }\n.pc-project-select:focus { border-color: var(--dsw-alias-state-business-primary, #4176e6); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent); }\n.pc-icon-btn {\n  width: 28px; height: 28px;\n  display: grid; place-items: center;\n  border-radius: 7px;\n  border: 1px solid transparent;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  padding: 0;\n  transition: background-color 0.12s, color 0.12s;\n}\n.pc-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }\n.pc-icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }\n.pc-icon-btn:focus-visible, .pc-btn:focus-visible, .pc-project-select:focus-visible,\n.pc-input:focus-visible, .pc-textarea:focus-visible, .pc-select:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary, #4176e6);\n  outline-offset: 1px;\n}\n.pc-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary, #cfd3d6); flex: none; }\n.pc-dot--online { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.pc-dot--offline { background: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-dot--busy { background: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-dot--warn { background: var(--dsw-alias-state-warn-primary, #f59e0b); }\n\n/* ---------- 统计条 ---------- */\n.pc-statbar {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 18px;\n  padding: 7px 20px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n  font-size: 12px;\n  min-width: 0;\n  overflow: hidden;\n}\n.pc-stat { display: flex; align-items: baseline; gap: 6px; min-width: 0; white-space: nowrap; }\n.pc-stat-label { color: var(--dsw-alias-label-tertiary, #81858c); font-size: 11.5px; }\n.pc-stat-value {\n  font-family: var(--pc-mono);\n  font-variant-numeric: tabular-nums;\n  font-weight: 600;\n  font-size: 13px;\n  color: var(--dsw-alias-label-primary, #0f1115);\n}\n.pc-stat-value--warn { color: var(--dsw-alias-state-warn-label, #b45309); }\n.pc-stat-value--busy { color: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-stat-value--ok { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 80%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-stat-sep { width: 1px; height: 14px; background: var(--dsw-alias-border-l2, #0000001a); flex: none; }\n.pc-stat--slots { gap: 7px; }\n.pc-slot-bar {\n  width: 74px; height: 5px; border-radius: 3px; flex: none;\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 8%, transparent);\n  overflow: hidden;\n  align-self: center;\n}\n.pc-slot-bar-fill { height: 100%; border-radius: 3px; background: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-slot-bar-fill--full { background: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-statbar-right { margin-left: auto; display: flex; align-items: center; gap: 14px; flex: none; }\n.pc-lead-state { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }\n\n/* ---------- 待澄清区 ---------- */\n.pc-questions {\n  flex: none;\n  margin: 12px 20px 0;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 36%, transparent);\n  border-radius: var(--pc-radius);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 6%, var(--dsw-alias-bg-base, #fff));\n  overflow: hidden;\n}\n.pc-questions-head {\n  display: flex; align-items: center; gap: 8px;\n  padding: 8px 14px;\n  font-size: 12px; font-weight: 600;\n  color: var(--dsw-alias-state-warn-label, #b45309);\n}\n.pc-questions-head .pc-badge { margin-left: 2px; }\n.pc-questions-list {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  gap: 8px;\n  padding: 0 12px 11px;\n  max-height: 300px;\n  overflow-y: auto;\n}\n.pc-questions-list--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n.pc-questions-list--two .pc-question:last-child:nth-child(odd) { grid-column: 1 / -1; }\n.pc-question {\n  display: flex; flex-direction: column; gap: 6px;\n  padding: 9px 11px 10px;\n  border-radius: 10px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 26%, transparent);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  min-width: 0;\n}\n.pc-question-top { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); min-width: 0; }\n.pc-question-text { font-size: 12.5px; font-weight: 600; line-height: 1.45; color: var(--dsw-alias-label-primary, #0f1115); word-break: break-word; }\n.pc-question-context {\n  font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary, #61666b);\n  white-space: pre-wrap; word-break: break-word;\n  max-height: 34px; overflow: hidden;\n}\n.pc-question-reply { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 1px; }\n.pc-question-options { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }\n.pc-option-btn {\n  font-family: inherit; font-size: 11px; line-height: 1;\n  height: 23px; padding: 0 9px;\n  border-radius: 999px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 40%, transparent);\n  background: var(--dsw-alias-bg-base, #fff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  transition: background-color 0.12s, border-color 0.12s, color 0.12s;\n  white-space: nowrap;\n}\n.pc-option-btn:hover { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 10%, var(--dsw-alias-bg-base, #fff)); }\n.pc-option-btn.is-selected {\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 16%, var(--dsw-alias-bg-base, #fff));\n  border-color: var(--dsw-alias-state-warn-label, #b45309);\n  color: var(--dsw-alias-state-warn-label, #b45309);\n  font-weight: 600;\n}\n.pc-question-input { flex: 1 1 170px; min-width: 140px; }\n.pc-question-input .pc-input { height: 28px; font-size: 12px; }\n\n/* ---------- 看板 ---------- */\n.pc-board {\n  flex: 1 1 auto;\n  min-height: 0;\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 12px;\n  padding: 12px 20px 16px;\n}\n.pc-col {\n  min-width: 0; min-height: 0;\n  display: flex; flex-direction: column;\n  border-radius: var(--pc-radius);\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: #f6f7f9;\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 42%, transparent);\n  overflow: hidden;\n}\n.pc-col-head {\n  flex: none;\n  display: flex; align-items: center; gap: 7px;\n  padding: 9px 12px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  min-width: 0;\n}\n.pc-col-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-col-dot--idle { background: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-col-dot--busy { background: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-col-dot--warn { background: var(--dsw-alias-state-warn-primary, #f59e0b); }\n.pc-col-dot--success { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.pc-col-title { font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; }\n.pc-col-count {\n  font-family: var(--pc-mono); font-size: 10.5px; line-height: 17px; font-weight: 600;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 6%, transparent);\n  border-radius: 999px; padding: 0 7px; white-space: nowrap;\n}\n.pc-col-hint { margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-caption, #adb2b8); white-space: nowrap; }\n.pc-col-head { flex-wrap: wrap; row-gap: 1px; }\n.pc-col-sub {\n  flex: 1 0 100%;\n  font-size: 10px; line-height: 1.4;\n  color: var(--dsw-alias-label-caption, #adb2b8);\n  white-space: normal; word-break: break-word;\n}\n.pc-col-sub--verifying { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 78%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-col-body {\n  flex: 1 1 auto; min-height: 0;\n  display: flex; flex-direction: column; gap: 8px;\n  padding: 8px;\n  overflow-y: auto;\n}\n.pc-empty-col {\n  margin: 6px 2px; padding: 18px 10px;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 9px;\n  text-align: center;\n  font-size: 11.5px;\n  color: var(--dsw-alias-label-caption, #adb2b8);\n}\n\n/* ---------- 任务卡片 ---------- */\n.pc-card {\n  flex: none;\n  display: flex; flex-direction: column; gap: 7px;\n  padding: 9px 10px;\n  border-radius: 10px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  box-shadow: 0 1px 2px rgb(15 17 21 / 0.04);\n  cursor: pointer;\n  transition: border-color 0.12s, box-shadow 0.12s;\n  min-width: 0;\n}\n.pc-card:hover {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 38%, var(--dsw-alias-border-l2, #0000001a));\n  box-shadow: 0 2px 8px rgb(15 17 21 / 0.07);\n}\n.pc-card--done { opacity: 0.82; background: var(--dsw-alias-bg-base, #fff); }\n.pc-card--done:hover { opacity: 1; }\n.pc-card--failed { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, var(--dsw-alias-border-l2, #0000001a)); }\n.pc-card-top { display: flex; align-items: center; gap: 6px; min-width: 0; }\n.pc-card-id { font-family: var(--pc-mono); font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-tertiary, #81858c); flex: none; }\n.pc-card-top .pc-badge { flex: none; }\n.pc-card-prio { margin-left: auto; font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8); flex: none; }\n.pc-card-title {\n  font-size: 13px; font-weight: 600; line-height: 1.42;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;\n  overflow: hidden; word-break: break-word;\n}\n.pc-card-sub {\n  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  min-width: 0;\n}\n.pc-card-project { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }\n.pc-card-branch {\n  font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8);\n  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n  max-width: 100%;\n}\n.pc-card-meta {\n  display: flex; align-items: center; gap: 5px 7px; flex-wrap: wrap;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n}\n.pc-metric {\n  display: inline-flex; align-items: center; gap: 3px;\n  font-family: var(--pc-mono); font-size: 10.5px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 5%, transparent);\n  border-radius: 5px; padding: 0 5px; line-height: 17px;\n  white-space: nowrap;\n}\n.pc-metric--ok { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 10%, transparent); }\n.pc-metric--err { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n.pc-diff-add { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 80%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-diff-del { color: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-card-event {\n  display: flex; align-items: center; gap: 5px;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  min-width: 0;\n}\n.pc-card-event-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }\n.pc-card-reason {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  word-break: break-word;\n  max-width: 100%;\n}\n.pc-card-warn {\n  display: flex; align-items: flex-start; gap: 5px;\n  font-size: 10.5px; line-height: 1.45;\n  color: var(--dsw-alias-state-warn-label, #b45309);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 9%, transparent);\n  border-radius: 6px; padding: 4px 6px;\n  word-break: break-word;\n}\n.pc-card-err {\n  display: flex; align-items: flex-start; gap: 5px;\n  font-size: 10.5px; line-height: 1.45;\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent);\n  border-radius: 6px; padding: 4px 6px;\n  word-break: break-word;\n  max-height: 46px; overflow: hidden;\n}\n.pc-card-actions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 1px; }\n.pc-card-actions .pc-btn { height: 23px; padding: 0 7px; font-size: 11px; border-radius: 6px; }\n.pc-card-actions .pc-btn--icon { width: 23px; padding: 0; }\n.pc-card-prio-btns { display: flex; gap: 3px; margin-left: auto; }\n.pc-card-prio-btns .pc-btn {\n  width: 21px; height: 21px; padding: 0; border-radius: 5px;\n  border-color: var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-tertiary, #81858c);\n}\n.pc-card-prio-btns .pc-btn:hover:not(:disabled) { color: var(--dsw-alias-label-primary, #0f1115); }\n\n/* ---------- 按钮 ---------- */\n.pc-btn {\n  display: inline-flex; align-items: center; justify-content: center; gap: 5px;\n  font-family: inherit; font-size: 12px; font-weight: 500; line-height: 1;\n  height: 27px; padding: 0 10px;\n  border-radius: 7px;\n  border: 1px solid transparent;\n  background: transparent;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  white-space: nowrap;\n  cursor: pointer;\n  transition: background-color 0.12s, border-color 0.12s, color 0.12s;\n  flex: none;\n}\n.pc-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n.pc-btn--sm { height: 25px; padding: 0 9px; font-size: 11.5px; border-radius: 6px; }\n.pc-btn--md { height: 30px; padding: 0 13px; font-size: 12.5px; border-radius: 8px; }\n.pc-btn--primary {\n  background: var(--dsw-alias-button-primary-fill, #0f1115);\n  color: var(--dsw-alias-label-primary-foreground, #ffffff);\n}\n.pc-btn--primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #43454a); }\n.pc-btn--secondary {\n  border-color: var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n.pc-btn--secondary:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }\n.pc-btn--ghost { color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-btn--ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }\n.pc-btn--danger {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 32%, transparent);\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  background: transparent;\n}\n.pc-btn--danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n.pc-btn--success {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 34%, transparent);\n  color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 8%, transparent);\n}\n.pc-btn--success:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 14%, transparent); }\n.pc-btn--icon { width: 27px; height: 27px; padding: 0; }\n.pc-btn--block { width: 100%; }\n.pc-btn-label { overflow: hidden; text-overflow: ellipsis; }\n.pc-spinner { animation: pc-spin 0.9s linear infinite; }\n@keyframes pc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n\n/* ---------- 徽标 / 标签 ---------- */\n.pc-badge {\n  display: inline-flex; align-items: center; gap: 3px;\n  height: 18px; padding: 0 6px;\n  border-radius: 5px;\n  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;\n  white-space: nowrap;\n}\n.pc-badge--idle { color: var(--dsw-alias-label-secondary, #61666b); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #61666b) 11%, transparent); }\n.pc-badge--muted { color: var(--dsw-alias-label-caption, #adb2b8); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #61666b) 7%, transparent); }\n.pc-badge--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 11%, transparent); }\n.pc-badge--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 15%, transparent); }\n.pc-badge--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 11%, transparent); }\n.pc-badge--success { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 12%, transparent); }\n.pc-badge--done { color: var(--dsw-alias-state-done-primary, #7c3aed); background: color-mix(in srgb, var(--dsw-alias-state-done-primary, #7c3aed) 12%, transparent); }\n.pc-chip {\n  display: inline-flex; align-items: center; gap: 3px;\n  height: 18px; padding: 0 6px;\n  border-radius: 5px;\n  font-size: 10.5px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 5%, transparent);\n  white-space: nowrap;\n  max-width: 100%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.pc-chip--mono { font-family: var(--pc-mono); }\n.pc-chip--clickable { cursor: pointer; border: 0; font-family: inherit; }\n.pc-chip--clickable:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 9%, transparent); }\n.pc-chip--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, transparent); }\n.pc-chip--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n\n/* ---------- 抽屉 ---------- */\n.pc-drawer-mask {\n  position: absolute; inset: 0;\n  z-index: 40;\n  background: rgb(15 17 21 / 0.2);\n  display: flex; justify-content: flex-end;\n}\n.pc-drawer {\n  width: 520px; max-width: 94%;\n  height: 100%;\n  display: flex; flex-direction: column;\n  min-height: 0;\n  background: var(--dsw-alias-bg-base, #ffffff);\n  border-left: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  box-shadow: -14px 0 36px rgb(15 17 21 / 0.12);\n}\n.pc-drawer--wide { width: 640px; }\n.pc-drawer-head {\n  flex: none;\n  display: flex; align-items: flex-start; gap: 10px;\n  padding: 14px 18px 11px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n}\n.pc-drawer-head-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }\n.pc-drawer-eyebrow { display: flex; align-items: center; gap: 8px; min-width: 0; }\n.pc-drawer-title { font-size: 14.5px; font-weight: 650; line-height: 1.35; word-break: break-word; }\n.pc-drawer-sub { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); flex-wrap: wrap; }\n.pc-drawer-actions {\n  flex: none;\n  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;\n  padding: 9px 18px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n}\n.pc-drawer-body {\n  flex: 1 1 auto; min-height: 0;\n  overflow-y: auto;\n  padding: 14px 18px 24px;\n  display: flex; flex-direction: column; gap: 16px;\n}\n.pc-section { display: flex; flex-direction: column; gap: 7px; min-width: 0; }\n.pc-section-title {\n  display: flex; align-items: center; gap: 6px;\n  font-size: 10.5px; font-weight: 650; letter-spacing: 0.7px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  text-transform: uppercase;\n}\n.pc-section-title-right { margin-left: auto; font-weight: 500; letter-spacing: 0; text-transform: none; font-size: 10.5px; }\n.pc-kv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 16px; }\n.pc-kv { min-width: 0; display: flex; flex-direction: column; gap: 2px; }\n.pc-kv-label { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-kv-value { font-size: 12px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-word; }\n.pc-kv-value--mono { font-family: var(--pc-mono); font-size: 11px; word-break: break-all; }\n.pc-pre {\n  margin: 0;\n  max-height: 220px; overflow: auto;\n  padding: 9px 11px;\n  border-radius: 9px;\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 32%, transparent);\n  font-family: var(--pc-mono);\n  font-size: 11px;\n  line-height: 1.55;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n.pc-pre--brief { font-family: inherit; font-size: 12.5px; line-height: 1.62; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-list li { line-height: 1.5; word-break: break-word; }\n.pc-list--plain { list-style: none; padding-left: 0; }\n.pc-details { border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 8px; background: var(--dsw-alias-bg-base, #fff); overflow: hidden; }\n.pc-details-summary {\n  cursor: pointer; padding: 6px 9px;\n  font-size: 11px; color: var(--dsw-alias-link, #4176e6);\n  list-style: none;\n  display: flex; align-items: center; gap: 5px;\n  user-select: none;\n}\n.pc-details-summary::-webkit-details-marker { display: none; }\n.pc-details-summary::before { content: \"▸\"; font-size: 9px; opacity: 0.8; }\n.pc-details[open] > .pc-details-summary::before { content: \"▾\"; }\n.pc-details-summary:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-details-body { padding: 0 9px 9px; }\n.pc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }\n.pc-table th {\n  text-align: left; padding: 4px 6px;\n  font-size: 10px; font-weight: 600; letter-spacing: 0.3px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  border-bottom: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  white-space: nowrap;\n}\n.pc-table td { padding: 5px 6px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); vertical-align: top; }\n.pc-table tr:last-child td { border-bottom: 0; }\n.pc-table-command { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-word; }\n.pc-tail { margin: 3px 0 0; max-height: 150px; overflow: auto; font-family: var(--pc-mono); font-size: 10.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-run {\n  display: flex; flex-direction: column; gap: 7px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 9px;\n  padding: 9px 11px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-run-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-run-id { font-family: var(--pc-mono); font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-run-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 10px; }\n.pc-event-list { display: flex; flex-direction: column; max-height: 260px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 8px; }\n.pc-event { display: flex; align-items: baseline; gap: 8px; padding: 4px 8px; font-size: 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); }\n.pc-event:last-child { border-bottom: 0; }\n.pc-event-time { font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8); flex: none; width: 56px; }\n.pc-event-type { font-family: var(--pc-mono); font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #81858c); flex: none; width: 84px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-event-brief { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-secondary, #61666b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n\n/* ---------- 弹窗 / 表单 ---------- */\n.pc-modal-mask {\n  position: absolute; inset: 0;\n  z-index: 60;\n  background: var(--dsw-alias-bg-mask-1, #0000003d);\n  display: grid; place-items: center;\n  padding: 24px;\n}\n.pc-modal {\n  width: min(560px, 100%);\n  max-height: 88%;\n  display: flex; flex-direction: column;\n  min-height: 0;\n  border-radius: 14px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  box-shadow: 0 20px 52px rgb(15 17 21 / 0.2);\n  overflow: hidden;\n}\n.pc-modal-head { flex: none; display: flex; align-items: flex-start; gap: 10px; padding: 15px 18px 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); }\n.pc-modal-head-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }\n.pc-modal-title { font-size: 14.5px; font-weight: 650; }\n.pc-modal-subtitle { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #81858c); line-height: 1.5; }\n.pc-modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 12px; }\n.pc-modal-foot { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 11px 18px; border-top: 1px solid var(--dsw-alias-border-l1, #0000000a); background: var(--dsw-alias-bg-layer-1, #ffffff); }\n.pc-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }\n.pc-field-label { display: flex; align-items: baseline; gap: 3px; font-size: 11.5px; font-weight: 550; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-field-required { color: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-field-right { margin-left: auto; font-weight: 400; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-field-hint { font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-input, .pc-textarea, .pc-select {\n  width: 100%;\n  font-family: inherit;\n  font-size: 12.5px;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  padding: 6px 9px;\n  outline: none;\n  transition: border-color 0.12s, box-shadow 0.12s;\n}\n.pc-input { height: 31px; }\n.pc-select { height: 31px; cursor: pointer; padding-right: 24px; appearance: none;\n  background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381858c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9.5l6 6 6-6'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat; background-position: right 8px center; }\n.pc-textarea { min-height: 84px; resize: vertical; line-height: 1.55; }\n.pc-input:focus, .pc-textarea:focus, .pc-select:focus {\n  border-color: var(--dsw-alias-state-business-primary, #4176e6);\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 16%, transparent);\n}\n.pc-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n.pc-form-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n.pc-workload-note {\n  display: flex; align-items: flex-start; gap: 6px;\n  padding: 7px 9px;\n  border-radius: 8px;\n  font-size: 11.5px; line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 6%, transparent);\n}\n.pc-workload-note > svg { margin-top: 2px; color: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-settings-tier {\n  display: flex; flex-direction: column; gap: 8px;\n  padding: 10px 12px;\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n}\n.pc-settings-tier-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }\n.pc-settings-tier-name { font-size: 12.5px; font-weight: 620; }\n.pc-settings-tier-sizes { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-settings-grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 10px; }\n.pc-settings-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; }\n.pc-settings-route { display: flex; gap: 6px; }\n.pc-settings-section { display: flex; flex-direction: column; gap: 8px; }\n.pc-settings-slot-row { display: grid; grid-template-columns: minmax(0, 132px) 96px minmax(0, 1fr); align-items: center; gap: 10px; }\n.pc-settings-projects { display: flex; flex-direction: column; gap: 7px; padding: 9px 11px; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 10px; }\n.pc-settings-project-head { font-size: 11.5px; font-weight: 550; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-settings-project { display: grid; grid-template-columns: minmax(0, 1fr) 96px 74px; align-items: center; gap: 10px; }\n.pc-settings-project-name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-settings-project-used { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }\n\n/* ---------- 项目管理弹窗 ---------- */\n.pc-projects-section { display: flex; flex-direction: column; gap: 8px; }\n.pc-projects-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 10px; }\n.pc-projects-row {\n  display: flex; align-items: center; gap: 12px;\n  padding: 10px 12px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n}\n.pc-projects-row:first-child { border-radius: 9px 9px 0 0; }\n.pc-projects-row:last-child { border-bottom: 0; border-radius: 0 0 9px 9px; }\n.pc-projects-row:only-child { border-radius: 9px; }\n.pc-projects-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }\n.pc-projects-policy { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }\n.pc-projects-policy .pc-field-label { white-space: nowrap; }\n.pc-projects-policy select { min-width: 132px; }\n.pc-projects-name-row { display: flex; align-items: center; gap: 7px; min-width: 0; }\n.pc-projects-name { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-projects-repo { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-projects-meta { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-check { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dsw-alias-label-secondary, #61666b); cursor: pointer; user-select: none; }\n.pc-check input { width: 13px; height: 13px; accent-color: var(--dsw-alias-state-business-primary, #4176e6); cursor: pointer; margin: 0; }\n\n/* ---------- 空状态 ---------- */\n.pc-empty {\n  flex: 1 1 auto; min-height: 0;\n  display: flex; flex-direction: column; align-items: center; justify-content: center;\n  gap: 10px;\n  padding: 32px 24px;\n  text-align: center;\n}\n.pc-empty-icon {\n  width: 54px; height: 54px; border-radius: 16px;\n  display: grid; place-items: center;\n  color: var(--dsw-alias-state-business-primary, #4176e6);\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent);\n}\n.pc-empty-icon--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, transparent); }\n.pc-empty-icon--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n.pc-empty-title { font-size: 16px; font-weight: 650; letter-spacing: 0.2px; }\n.pc-empty-desc { max-width: 560px; font-size: 12.5px; line-height: 1.65; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-empty-extra { margin-top: 2px; width: min(620px, 100%); display: flex; flex-direction: column; align-items: center; gap: 10px; }\n.pc-empty-extra .pc-error-box { width: 100%; text-align: left; }\n.pc-empty-card {\n  width: min(600px, 100%);\n  display: flex; flex-direction: column; gap: 12px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 14px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n  box-shadow: 0 10px 28px rgb(15 17 21 / 0.06);\n  padding: 16px 18px;\n  text-align: left;\n}\n.pc-empty-card-title { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }\n.pc-empty-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }\n.pc-empty .pc-error-box { text-align: left; max-width: 620px; width: 100%; }\n\n/* ---------- 集成与合并 ---------- */\n.pc-banner {\n  display: flex; align-items: flex-start; gap: 7px;\n  padding: 8px 11px;\n  border-radius: 9px;\n  font-size: 11.5px; line-height: 1.55;\n}\n.pc-banner--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 9%, transparent); }\n.pc-banner--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 9%, transparent); }\n.pc-banner--err { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent); }\n.pc-integrate-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l2, #0000001a); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, #ffffff); }\n.pc-integrate-bar .pc-btn { margin-left: auto; }\n.pc-select-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l2, #0000001a); border-radius: 10px; overflow: hidden; }\n.pc-check-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 11.5px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); cursor: pointer; }\n.pc-check-row:last-child { border-bottom: 0; }\n.pc-check-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-check-row .pc-badge { flex: none; }\n.pc-check-row-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-batch {\n  display: flex; flex-direction: column; gap: 8px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 10px;\n  padding: 10px 12px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-batch-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }\n.pc-batch-id { font-family: var(--pc-mono); font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-batch-title { font-size: 12px; font-weight: 600; }\n.pc-batch-meta { display: flex; align-items: center; gap: 6px 10px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-batch-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }\n.pc-confirm {\n  display: flex; flex-direction: column; gap: 8px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 42%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 8%, transparent);\n  border-radius: 9px;\n  padding: 9px 11px;\n  font-size: 11.5px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n.pc-confirm-text { display: flex; flex-direction: column; gap: 4px; line-height: 1.55; }\n.pc-confirm-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }\n.pc-ref { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-all; }\n\n/* ---------- Toast ---------- */\n.pc-toasts {\n  position: absolute;\n  top: 14px; left: 50%;\n  transform: translateX(-50%);\n  z-index: 90;\n  display: flex; flex-direction: column; align-items: center; gap: 8px;\n  pointer-events: none;\n  max-width: 92%;\n}\n.pc-toast {\n  pointer-events: auto;\n  display: flex; align-items: center; gap: 8px;\n  min-width: 200px; max-width: 560px;\n  padding: 8px 10px 8px 12px;\n  border-radius: 9px;\n  font-size: 12px; line-height: 1.45;\n  color: var(--dsw-alias-toast-label, #ffffff);\n  background: var(--dsw-alias-toast-bg, #353638);\n  box-shadow: 0 10px 26px rgb(0 0 0 / 0.2);\n}\n.pc-toast--success { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, #0b1220); }\n.pc-toast--error { background: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-toast-text { flex: 1 1 auto; min-width: 0; word-break: break-word; }\n.pc-toast-close {\n  flex: none;\n  display: grid; place-items: center;\n  width: 20px; height: 20px;\n  border: 0; border-radius: 5px;\n  background: transparent;\n  color: inherit; opacity: 0.7;\n  cursor: pointer;\n  padding: 0;\n}\n.pc-toast-close:hover { opacity: 1; background: rgb(255 255 255 / 0.12); }\n\n/* ---------- 顶栏按钮内计数 badge ---------- */\n.pc-btn-count {\n  display: inline-flex; align-items: center; justify-content: center;\n  min-width: 16px; height: 15px; padding: 0 4px;\n  border-radius: 999px;\n  font-family: var(--pc-mono);\n  font-size: 9.5px; font-weight: 700; line-height: 1;\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 15%, transparent);\n}\n\n/* ---------- 放弃 / 失败原因块 ---------- */\n.pc-reason {\n  display: flex; flex-direction: column; gap: 4px;\n  border-radius: 8px;\n  padding: 6px 8px 7px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 7%, transparent);\n}\n.pc-reason--failed,\n.pc-reason--provider {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 32%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent);\n}\n.pc-reason-head { display: flex; align-items: center; gap: 5px; min-width: 0; }\n.pc-reason-label { font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }\n.pc-reason-spacer { flex: 1 1 auto; min-width: 4px; }\n.pc-reason .pc-btn { height: 21px; padding: 0 7px; font-size: 10.5px; border-radius: 5px; }\n.pc-reason-text {\n  font-size: 11px; line-height: 1.5;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  white-space: pre-wrap; word-break: break-word;\n}\n.pc-reason-text--clamp {\n  display: -webkit-box;\n  -webkit-line-clamp: 4;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n.pc-card--abandoned { opacity: 0.94; background: var(--dsw-alias-bg-base, #fff); }\n.pc-card--abandoned:hover { opacity: 1; }\n\n/* ---------- 会话面板 ---------- */\n.pc-session-list { display: flex; flex-direction: column; gap: 8px; }\n.pc-session-row {\n  display: flex; flex-direction: column; gap: 5px;\n  min-width: 0;\n  padding: 9px 11px 8px;\n  border-radius: 10px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-session-row.is-highlight {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 62%, var(--dsw-alias-border-l2, #0000001a));\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 16%, transparent);\n}\n.pc-session-top { display: flex; align-items: center; gap: 7px; min-width: 0; }\n.pc-session-title {\n  flex: 1 1 auto; min-width: 0;\n  font-size: 12.5px; font-weight: 600;\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n}\n.pc-session-state {\n  flex: none;\n  display: flex; align-items: center; gap: 5px;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  white-space: nowrap;\n}\n.pc-session-time { font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-session-meta {\n  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n}\n.pc-session-event {\n  display: flex; align-items: center; gap: 5px;\n  min-width: 0;\n  padding: 4px 7px;\n  border-radius: 6px;\n  font-size: 11px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 30%, transparent);\n}\n.pc-session-event-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-session-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }\n.pc-panel-empty {\n  display: flex; flex-direction: column; align-items: center; gap: 9px;\n  padding: 30px 18px;\n  text-align: center;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 12px;\n}\n.pc-events-section { scroll-margin-top: 8px; }\n\n/* ---------- 参考截图（详情抽屉 / 新建需求） ---------- */\n.pc-att-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }\n.pc-att {\n  display: flex; flex-direction: column; gap: 3px;\n  min-width: 0;\n  color: inherit; text-decoration: none;\n  border-radius: 8px;\n}\n.pc-att:hover .pc-att-img { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 45%, var(--dsw-alias-border-l2, #0000001a)); }\n.pc-att-img {\n  display: block;\n  width: 100%; height: 96px;\n  object-fit: cover;\n  border-radius: 8px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 32%, transparent);\n  transition: border-color 0.12s;\n}\n.pc-att-caption { display: flex; align-items: baseline; gap: 6px; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-att-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-att-size { flex: none; font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-att-fallback {\n  height: 96px;\n  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;\n  padding: 6px;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  text-align: center; overflow: hidden;\n}\n.pc-att-fallback-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-att-fallback-path { max-width: 100%; overflow: hidden; font-family: var(--pc-mono); font-size: 9px; color: var(--dsw-alias-label-caption, #adb2b8); word-break: break-all; max-height: 24px; }\n\n.pc-attach-field {\n  display: flex; flex-direction: column; gap: 7px;\n  padding: 10px 12px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 10px;\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 20%, transparent);\n}\n.pc-attach-head { display: flex; align-items: center; gap: 8px; }\n.pc-attach-count { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-attach-head .pc-btn { margin-left: auto; }\n.pc-attach-hint { font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-attach-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }\n.pc-attach-item {\n  position: relative;\n  display: flex; flex-direction: column; gap: 3px;\n  min-width: 0;\n  padding: 5px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-attach-img { display: block; width: 100%; height: 76px; object-fit: cover; border-radius: 6px; }\n.pc-attach-meta { display: flex; align-items: baseline; gap: 5px; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-attach-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-attach-size { flex: none; font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-attach-remove {\n  position: absolute; top: 8px; right: 8px;\n  width: 20px; height: 20px;\n  display: grid; place-items: center;\n  padding: 0;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 50%;\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  box-shadow: 0 1px 3px rgb(15 17 21 / 0.12);\n}\n.pc-attach-remove:hover { color: var(--dsw-alias-state-error-primary, #dc2626); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, transparent); }\n.pc-attach-remove:disabled { opacity: 0.5; cursor: not-allowed; }\n\n/* ---------- 彻底删除 ---------- */\n.pc-card-del { width: 22px; height: 22px; color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-card-del:hover { color: var(--dsw-alias-state-error-primary, #dc2626) !important; background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 10%, transparent) !important; }\n.pc-icon-btn--danger:hover { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 10%, transparent); }\n\n/* ---------- 取消需求（次级危险按钮） ---------- */\n.pc-btn--cancel {\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  background: transparent;\n  border-color: transparent;\n}\n.pc-btn--cancel:hover:not(:disabled) {\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 8%, transparent);\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n}\n.pc-card-actions .pc-btn--cancel { border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 26%, transparent); }\n\n/* ---------- 验收中（verifying：lead 先验收，人工可覆盖） ---------- */\n.pc-chip-verifying {\n  display: inline-flex; align-items: center; gap: 3px;\n  height: 18px; padding: 0 6px;\n  border-radius: 5px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 32%, transparent);\n  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;\n  white-space: nowrap;\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent);\n}\n.pc-card-verifying {\n  display: flex; align-items: center; gap: 5px;\n  padding: 4px 7px;\n  border-radius: 6px;\n  font-size: 10.5px; line-height: 1.4;\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent);\n}\n.pc-card--verifying {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 34%, var(--dsw-alias-border-l2, #0000001a));\n}\n\n/* ---------- 工程台对话抽屉 ---------- */\n.pc-drawer--chat { width: 560px; }\n.pc-chat-body { padding: 0; gap: 0; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }\n.pc-chat-list {\n  flex: 1 1 auto; min-height: 0;\n  overflow-y: auto;\n  display: flex; flex-direction: column; gap: 10px;\n  padding: 12px 16px;\n}\n.pc-chat-msg { display: flex; flex-direction: column; gap: 3px; max-width: 92%; min-width: 0; }\n.pc-chat-msg--user { align-self: flex-end; align-items: flex-end; max-width: 84%; }\n.pc-chat-msg--assistant { align-self: flex-start; }\n.pc-chat-msg--tool, .pc-chat-msg--system { align-self: stretch; max-width: 100%; }\n.pc-chat-msg-head { display: flex; align-items: center; gap: 6px; font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-chat-role { font-weight: 700; letter-spacing: 0.3px; }\n.pc-chat-role--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-chat-role--success { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-chat-role--idle { color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-chat-role--muted { color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-chat-time { font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-chat-type {\n  max-width: 200px;\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n  padding: 0 4px; border-radius: 4px;\n  font-family: var(--pc-mono); font-size: 9px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 6%, transparent);\n}\n.pc-chat-text {\n  padding: 7px 10px;\n  border-radius: 10px;\n  border: 1px solid transparent;\n  font-size: 12.5px; line-height: 1.62;\n  white-space: pre-wrap; word-break: break-word;\n  color: var(--dsw-alias-label-primary, #0f1115);\n}\n.pc-chat-msg--user .pc-chat-text {\n  background: var(--dsw-alias-button-primary-fill, #0f1115);\n  color: var(--dsw-alias-label-primary-foreground, #ffffff);\n  border-radius: 10px 10px 3px 10px;\n}\n.pc-chat-msg--assistant .pc-chat-text {\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 34%, transparent);\n  border-color: var(--dsw-alias-border-l1, #0000000a);\n  border-radius: 10px 10px 10px 3px;\n}\n.pc-chat-msg--tool .pc-chat-text {\n  padding: 4px 8px;\n  font-family: var(--pc-mono);\n  font-size: 10.5px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 22%, transparent);\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n}\n.pc-chat-msg--system .pc-chat-text {\n  font-size: 11px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: transparent;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n}\n.pc-chat-composer {\n  flex: none;\n  display: flex; flex-direction: column; gap: 8px;\n  padding: 10px 16px 14px;\n  border-top: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-chat-composer .pc-textarea { min-height: 64px; max-height: 170px; resize: vertical; }\n.pc-chat-composer-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }\n.pc-chat-empty { border: 0; padding: 28px 16px; }\n\n/* ---------- 任务会话记录抽屉（只读，替代 native 会话） ---------- */\n.pc-drawer--transcript { width: 620px; }\n.pc-transcript-body {\n  padding: 10px 16px 14px;\n  gap: 8px;\n  display: flex; flex-direction: column;\n  min-height: 0;\n  overflow: hidden;\n}\n.pc-run-tabs { flex: none; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }\n.pc-run-tab {\n  font-family: inherit;\n  font-size: 11px; line-height: 1;\n  height: 26px; padding: 0 10px;\n  border-radius: 999px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background-color 0.12s, border-color 0.12s, color 0.12s;\n}\n.pc-run-tab:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-run-tab.is-active {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent);\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  font-weight: 600;\n}\n.pc-transcript-list {\n  flex: 1 1 auto; min-height: 0;\n  overflow-y: auto;\n  display: flex; flex-direction: column; gap: 9px;\n  padding: 2px 0 6px;\n}\n.pc-transcript-empty { border: 0; padding: 26px 16px; }\n\n/* 本次改动：文件清单（验收提交 / 最近一次运行） */\n.pc-change-meta { font-size: 10.5px; color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-change-hint { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-change-list {\n  display: flex; flex-direction: column; min-width: 0;\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  border-radius: 9px;\n  background: var(--dsw-alias-bg-base, #fff);\n  overflow: hidden;\n}\n.pc-change-row {\n  display: flex; align-items: center; gap: 8px;\n  padding: 5px 9px;\n  min-width: 0;\n  font-family: var(--pc-mono);\n  font-size: 11px;\n  line-height: 1.45;\n}\n.pc-change-row + .pc-change-row { border-top: 1px solid var(--dsw-alias-border-l1, #0000000a); }\n.pc-change-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-change-path {\n  flex: 1 1 auto; min-width: 0;\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n.pc-change-stat { flex: none; display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }\n.pc-change-blank { color: var(--dsw-alias-label-caption, #adb2b8); font-size: 10px; }\n": "\n.pc-root {\n  --pc-mono: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);\n  --pc-radius: 12px;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  min-height: 0;\n  min-width: 0;\n  width: 100%;\n  position: relative;\n  overflow: hidden;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  font-family: var(--dsw-font-family, system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif);\n  font-size: 13px;\n  line-height: 1.45;\n  -webkit-font-smoothing: antialiased;\n}\n.pc-root * { box-sizing: border-box; }\n.pc-root ::-webkit-scrollbar { width: 8px; height: 8px; }\n.pc-root ::-webkit-scrollbar-thumb {\n  background: var(--dsw-alias-scrollbar-bg-l2, #cfd3d6);\n  border-radius: 4px;\n}\n.pc-root ::-webkit-scrollbar-track { background: transparent; }\n.pc-mono { font-family: var(--pc-mono); font-variant-numeric: tabular-nums; }\n.pc-dim { color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-faint { color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-secondary { color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-num { font-family: var(--pc-mono); font-variant-numeric: tabular-nums; }\n.pc-warn-text { color: var(--dsw-alias-state-warn-label, #b45309); }\n.pc-err-text { color: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-ok-text { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 82%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-grow { flex: 1 1 auto; min-width: 0; }\n.pc-row { display: flex; align-items: center; gap: 8px; min-width: 0; }\n.pc-stack { display: flex; flex-direction: column; gap: 6px; min-width: 0; }\n.pc-divider { height: 1px; background: var(--dsw-alias-border-l1, #0000000a); margin: 2px 0; }\n.pc-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-note { font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-tertiary, #81858c); white-space: pre-wrap; word-break: break-word; }\n.pc-error-box {\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, var(--dsw-alias-bg-base, #fff));\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  border-radius: 9px;\n  padding: 8px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  word-break: break-word;\n}\n\n/* ---------- Top bar ---------- */\n.pc-topbar {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 10px 20px;\n  border-bottom: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  min-width: 0;\n}\n.pc-brand { display: flex; align-items: center; gap: 9px; min-width: 0; flex: none; }\n.pc-brand-icon {\n  width: 28px; height: 28px;\n  border-radius: 9px;\n  display: grid; place-items: center;\n  color: #fff;\n  background: linear-gradient(140deg, var(--dsw-static-deepseek-450, #5686fe), var(--dsw-static-deepseek-600, #4868b2));\n  box-shadow: 0 1px 3px rgb(65 118 230 / 0.32);\n}\n.pc-brand-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }\n.pc-brand-title { font-size: 15px; font-weight: 650; letter-spacing: 0.2px; line-height: 1.2; }\n.pc-brand-sub {\n  display: flex; align-items: center; gap: 5px;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  line-height: 1.2; white-space: nowrap;\n}\n.pc-topbar-spacer { flex: 1 1 auto; min-width: 12px; }\n.pc-topbar-actions { display: flex; align-items: center; gap: 8px; flex: none; }\n.pc-project-select {\n  height: 30px;\n  width: 196px;\n  max-width: 196px;\n  font-family: inherit;\n  font-size: 12px;\n  font-weight: 500;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  background: var(--dsw-alias-bg-base, #fff);\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  padding: 0 26px 0 9px;\n  outline: none;\n  cursor: pointer;\n  appearance: none;\n  background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381858c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9.5l6 6 6-6'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat;\n  background-position: right 8px center;\n}\n.pc-project-select:hover { border-color: var(--dsw-alias-border-l3, #0000001f); }\n.pc-project-select:focus { border-color: var(--dsw-alias-state-business-primary, #4176e6); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent); }\n.pc-icon-btn {\n  width: 28px; height: 28px;\n  display: grid; place-items: center;\n  border-radius: 7px;\n  border: 1px solid transparent;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  padding: 0;\n  transition: background-color 0.12s, color 0.12s;\n}\n.pc-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }\n.pc-icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }\n.pc-icon-btn:focus-visible, .pc-btn:focus-visible, .pc-project-select:focus-visible,\n.pc-input:focus-visible, .pc-textarea:focus-visible, .pc-select:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary, #4176e6);\n  outline-offset: 1px;\n}\n.pc-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary, #cfd3d6); flex: none; }\n.pc-dot--online { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.pc-dot--offline { background: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-dot--busy { background: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-dot--warn { background: var(--dsw-alias-state-warn-primary, #f59e0b); }\n\n/* ---------- Stats bar ---------- */\n.pc-statbar {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 18px;\n  padding: 7px 20px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n  font-size: 12px;\n  min-width: 0;\n  overflow: hidden;\n}\n.pc-stat { display: flex; align-items: baseline; gap: 6px; min-width: 0; white-space: nowrap; }\n.pc-stat-label { color: var(--dsw-alias-label-tertiary, #81858c); font-size: 11.5px; }\n.pc-stat-value {\n  font-family: var(--pc-mono);\n  font-variant-numeric: tabular-nums;\n  font-weight: 600;\n  font-size: 13px;\n  color: var(--dsw-alias-label-primary, #0f1115);\n}\n.pc-stat-value--warn { color: var(--dsw-alias-state-warn-label, #b45309); }\n.pc-stat-value--busy { color: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-stat-value--ok { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 80%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-stat-sep { width: 1px; height: 14px; background: var(--dsw-alias-border-l2, #0000001a); flex: none; }\n.pc-stat--slots { gap: 7px; }\n.pc-slot-bar {\n  width: 74px; height: 5px; border-radius: 3px; flex: none;\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 8%, transparent);\n  overflow: hidden;\n  align-self: center;\n}\n.pc-slot-bar-fill { height: 100%; border-radius: 3px; background: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-slot-bar-fill--full { background: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-statbar-right { margin-left: auto; display: flex; align-items: center; gap: 14px; flex: none; }\n.pc-lead-state { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }\n\n/* ---------- Clarification area ---------- */\n.pc-questions {\n  flex: none;\n  margin: 12px 20px 0;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 36%, transparent);\n  border-radius: var(--pc-radius);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 6%, var(--dsw-alias-bg-base, #fff));\n  overflow: hidden;\n}\n.pc-questions-head {\n  display: flex; align-items: center; gap: 8px;\n  padding: 8px 14px;\n  font-size: 12px; font-weight: 600;\n  color: var(--dsw-alias-state-warn-label, #b45309);\n}\n.pc-questions-head .pc-badge { margin-left: 2px; }\n.pc-questions-list {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  gap: 8px;\n  padding: 0 12px 11px;\n  max-height: 300px;\n  overflow-y: auto;\n}\n.pc-questions-list--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n.pc-questions-list--two .pc-question:last-child:nth-child(odd) { grid-column: 1 / -1; }\n.pc-question {\n  display: flex; flex-direction: column; gap: 6px;\n  padding: 9px 11px 10px;\n  border-radius: 10px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 26%, transparent);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  min-width: 0;\n}\n.pc-question-top { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); min-width: 0; }\n.pc-question-text { font-size: 12.5px; font-weight: 600; line-height: 1.45; color: var(--dsw-alias-label-primary, #0f1115); word-break: break-word; }\n.pc-question-context {\n  font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary, #61666b);\n  white-space: pre-wrap; word-break: break-word;\n  max-height: 34px; overflow: hidden;\n}\n.pc-question-reply { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 1px; }\n.pc-question-options { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }\n.pc-option-btn {\n  font-family: inherit; font-size: 11px; line-height: 1;\n  height: 23px; padding: 0 9px;\n  border-radius: 999px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 40%, transparent);\n  background: var(--dsw-alias-bg-base, #fff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  transition: background-color 0.12s, border-color 0.12s, color 0.12s;\n  white-space: nowrap;\n}\n.pc-option-btn:hover { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 10%, var(--dsw-alias-bg-base, #fff)); }\n.pc-option-btn.is-selected {\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 16%, var(--dsw-alias-bg-base, #fff));\n  border-color: var(--dsw-alias-state-warn-label, #b45309);\n  color: var(--dsw-alias-state-warn-label, #b45309);\n  font-weight: 600;\n}\n.pc-question-input { flex: 1 1 170px; min-width: 140px; }\n.pc-question-input .pc-input { height: 28px; font-size: 12px; }\n\n/* ---------- Board ---------- */\n.pc-board {\n  flex: 1 1 auto;\n  min-height: 0;\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 12px;\n  padding: 12px 20px 16px;\n}\n.pc-col {\n  min-width: 0; min-height: 0;\n  display: flex; flex-direction: column;\n  border-radius: var(--pc-radius);\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: #f6f7f9;\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 42%, transparent);\n  overflow: hidden;\n}\n.pc-col-head {\n  flex: none;\n  display: flex; align-items: center; gap: 7px;\n  padding: 9px 12px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  min-width: 0;\n}\n.pc-col-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-col-dot--idle { background: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-col-dot--busy { background: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-col-dot--warn { background: var(--dsw-alias-state-warn-primary, #f59e0b); }\n.pc-col-dot--success { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.pc-col-title { font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; }\n.pc-col-count {\n  font-family: var(--pc-mono); font-size: 10.5px; line-height: 17px; font-weight: 600;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 6%, transparent);\n  border-radius: 999px; padding: 0 7px; white-space: nowrap;\n}\n.pc-col-hint { margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-caption, #adb2b8); white-space: nowrap; }\n.pc-col-head { flex-wrap: wrap; row-gap: 1px; }\n.pc-col-sub {\n  flex: 1 0 100%;\n  font-size: 10px; line-height: 1.4;\n  color: var(--dsw-alias-label-caption, #adb2b8);\n  white-space: normal; word-break: break-word;\n}\n.pc-col-sub--verifying { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 78%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-col-body {\n  flex: 1 1 auto; min-height: 0;\n  display: flex; flex-direction: column; gap: 8px;\n  padding: 8px;\n  overflow-y: auto;\n}\n.pc-empty-col {\n  margin: 6px 2px; padding: 18px 10px;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 9px;\n  text-align: center;\n  font-size: 11.5px;\n  color: var(--dsw-alias-label-caption, #adb2b8);\n}\n\n/* ---------- Task cards ---------- */\n.pc-card {\n  flex: none;\n  display: flex; flex-direction: column; gap: 7px;\n  padding: 9px 10px;\n  border-radius: 10px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  box-shadow: 0 1px 2px rgb(15 17 21 / 0.04);\n  cursor: pointer;\n  transition: border-color 0.12s, box-shadow 0.12s;\n  min-width: 0;\n}\n.pc-card:hover {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 38%, var(--dsw-alias-border-l2, #0000001a));\n  box-shadow: 0 2px 8px rgb(15 17 21 / 0.07);\n}\n.pc-card--done { opacity: 0.82; background: var(--dsw-alias-bg-base, #fff); }\n.pc-card--done:hover { opacity: 1; }\n.pc-card--failed { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, var(--dsw-alias-border-l2, #0000001a)); }\n.pc-card-top { display: flex; align-items: center; gap: 6px; min-width: 0; }\n.pc-card-id { font-family: var(--pc-mono); font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-tertiary, #81858c); flex: none; }\n.pc-card-top .pc-badge { flex: none; }\n.pc-card-prio { margin-left: auto; font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8); flex: none; }\n.pc-card-title {\n  font-size: 13px; font-weight: 600; line-height: 1.42;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;\n  overflow: hidden; word-break: break-word;\n}\n.pc-card-sub {\n  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  min-width: 0;\n}\n.pc-card-project { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }\n.pc-card-branch {\n  font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8);\n  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n  max-width: 100%;\n}\n.pc-card-meta {\n  display: flex; align-items: center; gap: 5px 7px; flex-wrap: wrap;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n}\n.pc-metric {\n  display: inline-flex; align-items: center; gap: 3px;\n  font-family: var(--pc-mono); font-size: 10.5px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 5%, transparent);\n  border-radius: 5px; padding: 0 5px; line-height: 17px;\n  white-space: nowrap;\n}\n.pc-metric--ok { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 10%, transparent); }\n.pc-metric--err { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n.pc-diff-add { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 80%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-diff-del { color: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-card-event {\n  display: flex; align-items: center; gap: 5px;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  min-width: 0;\n}\n.pc-card-event-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }\n.pc-card-reason {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  word-break: break-word;\n  max-width: 100%;\n}\n.pc-card-warn {\n  display: flex; align-items: flex-start; gap: 5px;\n  font-size: 10.5px; line-height: 1.45;\n  color: var(--dsw-alias-state-warn-label, #b45309);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 9%, transparent);\n  border-radius: 6px; padding: 4px 6px;\n  word-break: break-word;\n}\n.pc-card-err {\n  display: flex; align-items: flex-start; gap: 5px;\n  font-size: 10.5px; line-height: 1.45;\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent);\n  border-radius: 6px; padding: 4px 6px;\n  word-break: break-word;\n  max-height: 46px; overflow: hidden;\n}\n.pc-card-actions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 1px; }\n.pc-card-actions .pc-btn { height: 23px; padding: 0 7px; font-size: 11px; border-radius: 6px; }\n.pc-card-actions .pc-btn--icon { width: 23px; padding: 0; }\n.pc-card-prio-btns { display: flex; gap: 3px; margin-left: auto; }\n.pc-card-prio-btns .pc-btn {\n  width: 21px; height: 21px; padding: 0; border-radius: 5px;\n  border-color: var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-tertiary, #81858c);\n}\n.pc-card-prio-btns .pc-btn:hover:not(:disabled) { color: var(--dsw-alias-label-primary, #0f1115); }\n\n/* ---------- Buttons ---------- */\n.pc-btn {\n  display: inline-flex; align-items: center; justify-content: center; gap: 5px;\n  font-family: inherit; font-size: 12px; font-weight: 500; line-height: 1;\n  height: 27px; padding: 0 10px;\n  border-radius: 7px;\n  border: 1px solid transparent;\n  background: transparent;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  white-space: nowrap;\n  cursor: pointer;\n  transition: background-color 0.12s, border-color 0.12s, color 0.12s;\n  flex: none;\n}\n.pc-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n.pc-btn--sm { height: 25px; padding: 0 9px; font-size: 11.5px; border-radius: 6px; }\n.pc-btn--md { height: 30px; padding: 0 13px; font-size: 12.5px; border-radius: 8px; }\n.pc-btn--primary {\n  background: var(--dsw-alias-button-primary-fill, #0f1115);\n  color: var(--dsw-alias-label-primary-foreground, #ffffff);\n}\n.pc-btn--primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #43454a); }\n.pc-btn--secondary {\n  border-color: var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n.pc-btn--secondary:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }\n.pc-btn--ghost { color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-btn--ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }\n.pc-btn--danger {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 32%, transparent);\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  background: transparent;\n}\n.pc-btn--danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n.pc-btn--success {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 34%, transparent);\n  color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 8%, transparent);\n}\n.pc-btn--success:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 14%, transparent); }\n.pc-btn--icon { width: 27px; height: 27px; padding: 0; }\n.pc-btn--block { width: 100%; }\n.pc-btn-label { overflow: hidden; text-overflow: ellipsis; }\n.pc-spinner { animation: pc-spin 0.9s linear infinite; }\n@keyframes pc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n\n/* ---------- Badges / labels ---------- */\n.pc-badge {\n  display: inline-flex; align-items: center; gap: 3px;\n  height: 18px; padding: 0 6px;\n  border-radius: 5px;\n  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;\n  white-space: nowrap;\n}\n.pc-badge--idle { color: var(--dsw-alias-label-secondary, #61666b); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #61666b) 11%, transparent); }\n.pc-badge--muted { color: var(--dsw-alias-label-caption, #adb2b8); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #61666b) 7%, transparent); }\n.pc-badge--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 11%, transparent); }\n.pc-badge--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 15%, transparent); }\n.pc-badge--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 11%, transparent); }\n.pc-badge--success { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 12%, transparent); }\n.pc-badge--done { color: var(--dsw-alias-state-done-primary, #7c3aed); background: color-mix(in srgb, var(--dsw-alias-state-done-primary, #7c3aed) 12%, transparent); }\n.pc-chip {\n  display: inline-flex; align-items: center; gap: 3px;\n  height: 18px; padding: 0 6px;\n  border-radius: 5px;\n  font-size: 10.5px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 5%, transparent);\n  white-space: nowrap;\n  max-width: 100%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.pc-chip--mono { font-family: var(--pc-mono); }\n.pc-chip--clickable { cursor: pointer; border: 0; font-family: inherit; }\n.pc-chip--clickable:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 9%, transparent); }\n.pc-chip--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, transparent); }\n.pc-chip--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n\n/* ---------- Drawer ---------- */\n.pc-drawer-mask {\n  position: absolute; inset: 0;\n  z-index: 40;\n  background: rgb(15 17 21 / 0.2);\n  display: flex; justify-content: flex-end;\n}\n.pc-drawer {\n  width: 520px; max-width: 94%;\n  height: 100%;\n  display: flex; flex-direction: column;\n  min-height: 0;\n  background: var(--dsw-alias-bg-base, #ffffff);\n  border-left: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  box-shadow: -14px 0 36px rgb(15 17 21 / 0.12);\n}\n.pc-drawer--wide { width: 640px; }\n.pc-drawer-head {\n  flex: none;\n  display: flex; align-items: flex-start; gap: 10px;\n  padding: 14px 18px 11px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n}\n.pc-drawer-head-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }\n.pc-drawer-eyebrow { display: flex; align-items: center; gap: 8px; min-width: 0; }\n.pc-drawer-title { font-size: 14.5px; font-weight: 650; line-height: 1.35; word-break: break-word; }\n.pc-drawer-sub { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); flex-wrap: wrap; }\n.pc-drawer-actions {\n  flex: none;\n  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;\n  padding: 9px 18px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n}\n.pc-drawer-body {\n  flex: 1 1 auto; min-height: 0;\n  overflow-y: auto;\n  padding: 14px 18px 24px;\n  display: flex; flex-direction: column; gap: 16px;\n}\n.pc-section { display: flex; flex-direction: column; gap: 7px; min-width: 0; }\n.pc-section-title {\n  display: flex; align-items: center; gap: 6px;\n  font-size: 10.5px; font-weight: 650; letter-spacing: 0.7px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  text-transform: uppercase;\n}\n.pc-section-title-right { margin-left: auto; font-weight: 500; letter-spacing: 0; text-transform: none; font-size: 10.5px; }\n.pc-kv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 16px; }\n.pc-kv { min-width: 0; display: flex; flex-direction: column; gap: 2px; }\n.pc-kv-label { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-kv-value { font-size: 12px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-word; }\n.pc-kv-value--mono { font-family: var(--pc-mono); font-size: 11px; word-break: break-all; }\n.pc-pre {\n  margin: 0;\n  max-height: 220px; overflow: auto;\n  padding: 9px 11px;\n  border-radius: 9px;\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 32%, transparent);\n  font-family: var(--pc-mono);\n  font-size: 11px;\n  line-height: 1.55;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n.pc-pre--brief { font-family: inherit; font-size: 12.5px; line-height: 1.62; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-list li { line-height: 1.5; word-break: break-word; }\n.pc-list--plain { list-style: none; padding-left: 0; }\n.pc-details { border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 8px; background: var(--dsw-alias-bg-base, #fff); overflow: hidden; }\n.pc-details-summary {\n  cursor: pointer; padding: 6px 9px;\n  font-size: 11px; color: var(--dsw-alias-link, #4176e6);\n  list-style: none;\n  display: flex; align-items: center; gap: 5px;\n  user-select: none;\n}\n.pc-details-summary::-webkit-details-marker { display: none; }\n.pc-details-summary::before { content: \"▸\"; font-size: 9px; opacity: 0.8; }\n.pc-details[open] > .pc-details-summary::before { content: \"▾\"; }\n.pc-details-summary:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-details-body { padding: 0 9px 9px; }\n.pc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }\n.pc-table th {\n  text-align: left; padding: 4px 6px;\n  font-size: 10px; font-weight: 600; letter-spacing: 0.3px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  border-bottom: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  white-space: nowrap;\n}\n.pc-table td { padding: 5px 6px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); vertical-align: top; }\n.pc-table tr:last-child td { border-bottom: 0; }\n.pc-table-command { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-word; }\n.pc-tail { margin: 3px 0 0; max-height: 150px; overflow: auto; font-family: var(--pc-mono); font-size: 10.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-run {\n  display: flex; flex-direction: column; gap: 7px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 9px;\n  padding: 9px 11px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-run-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-run-id { font-family: var(--pc-mono); font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-run-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 10px; }\n.pc-event-list { display: flex; flex-direction: column; max-height: 260px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 8px; }\n.pc-event { display: flex; align-items: baseline; gap: 8px; padding: 4px 8px; font-size: 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); }\n.pc-event:last-child { border-bottom: 0; }\n.pc-event-time { font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8); flex: none; width: 56px; }\n.pc-event-type { font-family: var(--pc-mono); font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #81858c); flex: none; width: 84px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-event-brief { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-secondary, #61666b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n\n/* ---------- Dialog / form ---------- */\n.pc-modal-mask {\n  position: absolute; inset: 0;\n  z-index: 60;\n  background: var(--dsw-alias-bg-mask-1, #0000003d);\n  display: grid; place-items: center;\n  padding: 24px;\n}\n.pc-modal {\n  width: min(560px, 100%);\n  max-height: 88%;\n  display: flex; flex-direction: column;\n  min-height: 0;\n  border-radius: 14px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  box-shadow: 0 20px 52px rgb(15 17 21 / 0.2);\n  overflow: hidden;\n}\n.pc-modal-head { flex: none; display: flex; align-items: flex-start; gap: 10px; padding: 15px 18px 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); }\n.pc-modal-head-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }\n.pc-modal-title { font-size: 14.5px; font-weight: 650; }\n.pc-modal-subtitle { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #81858c); line-height: 1.5; }\n.pc-modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 12px; }\n.pc-modal-foot { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 11px 18px; border-top: 1px solid var(--dsw-alias-border-l1, #0000000a); background: var(--dsw-alias-bg-layer-1, #ffffff); }\n.pc-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }\n.pc-field-label { display: flex; align-items: baseline; gap: 3px; font-size: 11.5px; font-weight: 550; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-field-required { color: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-field-right { margin-left: auto; font-weight: 400; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-field-hint { font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-input, .pc-textarea, .pc-select {\n  width: 100%;\n  font-family: inherit;\n  font-size: 12.5px;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  padding: 6px 9px;\n  outline: none;\n  transition: border-color 0.12s, box-shadow 0.12s;\n}\n.pc-input { height: 31px; }\n.pc-select { height: 31px; cursor: pointer; padding-right: 24px; appearance: none;\n  background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381858c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9.5l6 6 6-6'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat; background-position: right 8px center; }\n.pc-textarea { min-height: 84px; resize: vertical; line-height: 1.55; }\n.pc-input:focus, .pc-textarea:focus, .pc-select:focus {\n  border-color: var(--dsw-alias-state-business-primary, #4176e6);\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 16%, transparent);\n}\n.pc-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n.pc-form-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n.pc-workload-note {\n  display: flex; align-items: flex-start; gap: 6px;\n  padding: 7px 9px;\n  border-radius: 8px;\n  font-size: 11.5px; line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 6%, transparent);\n}\n.pc-workload-note > svg { margin-top: 2px; color: var(--dsw-alias-state-business-primary, #4176e6); }\n.pc-settings-tier {\n  display: flex; flex-direction: column; gap: 8px;\n  padding: 10px 12px;\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n}\n.pc-settings-tier-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }\n.pc-settings-tier-name { font-size: 12.5px; font-weight: 620; }\n.pc-settings-tier-sizes { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-settings-grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 10px; }\n.pc-settings-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; }\n.pc-settings-route { display: flex; gap: 6px; }\n.pc-settings-section { display: flex; flex-direction: column; gap: 8px; }\n.pc-settings-slot-row { display: grid; grid-template-columns: minmax(0, 132px) 96px minmax(0, 1fr); align-items: center; gap: 10px; }\n.pc-settings-projects { display: flex; flex-direction: column; gap: 7px; padding: 9px 11px; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 10px; }\n.pc-settings-project-head { font-size: 11.5px; font-weight: 550; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-settings-project { display: grid; grid-template-columns: minmax(0, 1fr) 96px 74px; align-items: center; gap: 10px; }\n.pc-settings-project-name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-settings-project-used { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }\n\n/* ---------- Project management dialog ---------- */\n.pc-projects-section { display: flex; flex-direction: column; gap: 8px; }\n.pc-projects-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 10px; }\n.pc-projects-row {\n  display: flex; align-items: center; gap: 12px;\n  padding: 10px 12px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-layer-1, #ffffff);\n}\n.pc-projects-row:first-child { border-radius: 9px 9px 0 0; }\n.pc-projects-row:last-child { border-bottom: 0; border-radius: 0 0 9px 9px; }\n.pc-projects-row:only-child { border-radius: 9px; }\n.pc-projects-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }\n.pc-projects-policy { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }\n.pc-projects-policy .pc-field-label { white-space: nowrap; }\n.pc-projects-policy select { min-width: 132px; }\n.pc-projects-name-row { display: flex; align-items: center; gap: 7px; min-width: 0; }\n.pc-projects-name { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-projects-repo { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-projects-meta { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-check { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dsw-alias-label-secondary, #61666b); cursor: pointer; user-select: none; }\n.pc-check input { width: 13px; height: 13px; accent-color: var(--dsw-alias-state-business-primary, #4176e6); cursor: pointer; margin: 0; }\n\n/* ---------- Empty state ---------- */\n.pc-empty {\n  flex: 1 1 auto; min-height: 0;\n  display: flex; flex-direction: column; align-items: center; justify-content: center;\n  gap: 10px;\n  padding: 32px 24px;\n  text-align: center;\n}\n.pc-empty-icon {\n  width: 54px; height: 54px; border-radius: 16px;\n  display: grid; place-items: center;\n  color: var(--dsw-alias-state-business-primary, #4176e6);\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent);\n}\n.pc-empty-icon--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, transparent); }\n.pc-empty-icon--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }\n.pc-empty-title { font-size: 16px; font-weight: 650; letter-spacing: 0.2px; }\n.pc-empty-desc { max-width: 560px; font-size: 12.5px; line-height: 1.65; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-empty-extra { margin-top: 2px; width: min(620px, 100%); display: flex; flex-direction: column; align-items: center; gap: 10px; }\n.pc-empty-extra .pc-error-box { width: 100%; text-align: left; }\n.pc-empty-card {\n  width: min(600px, 100%);\n  display: flex; flex-direction: column; gap: 12px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 14px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n  box-shadow: 0 10px 28px rgb(15 17 21 / 0.06);\n  padding: 16px 18px;\n  text-align: left;\n}\n.pc-empty-card-title { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }\n.pc-empty-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }\n.pc-empty .pc-error-box { text-align: left; max-width: 620px; width: 100%; }\n\n/* ---------- Integration and merge ---------- */\n.pc-banner {\n  display: flex; align-items: flex-start; gap: 7px;\n  padding: 8px 11px;\n  border-radius: 9px;\n  font-size: 11.5px; line-height: 1.55;\n}\n.pc-banner--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 9%, transparent); }\n.pc-banner--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 9%, transparent); }\n.pc-banner--err { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent); }\n.pc-integrate-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l2, #0000001a); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, #ffffff); }\n.pc-integrate-bar .pc-btn { margin-left: auto; }\n.pc-select-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l2, #0000001a); border-radius: 10px; overflow: hidden; }\n.pc-check-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 11.5px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); cursor: pointer; }\n.pc-check-row:last-child { border-bottom: 0; }\n.pc-check-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-check-row .pc-badge { flex: none; }\n.pc-check-row-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-batch {\n  display: flex; flex-direction: column; gap: 8px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 10px;\n  padding: 10px 12px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-batch-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }\n.pc-batch-id { font-family: var(--pc-mono); font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-batch-title { font-size: 12px; font-weight: 600; }\n.pc-batch-meta { display: flex; align-items: center; gap: 6px 10px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-batch-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }\n.pc-confirm {\n  display: flex; flex-direction: column; gap: 8px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 42%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 8%, transparent);\n  border-radius: 9px;\n  padding: 9px 11px;\n  font-size: 11.5px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n.pc-confirm-text { display: flex; flex-direction: column; gap: 4px; line-height: 1.55; }\n.pc-confirm-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }\n.pc-ref { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-all; }\n\n/* ---------- Toast ---------- */\n.pc-toasts {\n  position: absolute;\n  top: 14px; left: 50%;\n  transform: translateX(-50%);\n  z-index: 90;\n  display: flex; flex-direction: column; align-items: center; gap: 8px;\n  pointer-events: none;\n  max-width: 92%;\n}\n.pc-toast {\n  pointer-events: auto;\n  display: flex; align-items: center; gap: 8px;\n  min-width: 200px; max-width: 560px;\n  padding: 8px 10px 8px 12px;\n  border-radius: 9px;\n  font-size: 12px; line-height: 1.45;\n  color: var(--dsw-alias-toast-label, #ffffff);\n  background: var(--dsw-alias-toast-bg, #353638);\n  box-shadow: 0 10px 26px rgb(0 0 0 / 0.2);\n}\n.pc-toast--success { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, #0b1220); }\n.pc-toast--error { background: var(--dsw-alias-state-error-primary, #dc2626); }\n.pc-toast-text { flex: 1 1 auto; min-width: 0; word-break: break-word; }\n.pc-toast-close {\n  flex: none;\n  display: grid; place-items: center;\n  width: 20px; height: 20px;\n  border: 0; border-radius: 5px;\n  background: transparent;\n  color: inherit; opacity: 0.7;\n  cursor: pointer;\n  padding: 0;\n}\n.pc-toast-close:hover { opacity: 1; background: rgb(255 255 255 / 0.12); }\n\n/* ---------- Count badge inside top bar buttons ---------- */\n.pc-btn-count {\n  display: inline-flex; align-items: center; justify-content: center;\n  min-width: 16px; height: 15px; padding: 0 4px;\n  border-radius: 999px;\n  font-family: var(--pc-mono);\n  font-size: 9.5px; font-weight: 700; line-height: 1;\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 15%, transparent);\n}\n\n/* ---------- Abandon / failure reason block ---------- */\n.pc-reason {\n  display: flex; flex-direction: column; gap: 4px;\n  border-radius: 8px;\n  padding: 6px 8px 7px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 7%, transparent);\n}\n.pc-reason--failed,\n.pc-reason--provider {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 32%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent);\n}\n.pc-reason-head { display: flex; align-items: center; gap: 5px; min-width: 0; }\n.pc-reason-label { font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }\n.pc-reason-spacer { flex: 1 1 auto; min-width: 4px; }\n.pc-reason .pc-btn { height: 21px; padding: 0 7px; font-size: 10.5px; border-radius: 5px; }\n.pc-reason-text {\n  font-size: 11px; line-height: 1.5;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  white-space: pre-wrap; word-break: break-word;\n}\n.pc-reason-text--clamp {\n  display: -webkit-box;\n  -webkit-line-clamp: 4;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n.pc-card--abandoned { opacity: 0.94; background: var(--dsw-alias-bg-base, #fff); }\n.pc-card--abandoned:hover { opacity: 1; }\n\n/* ---------- Session panel ---------- */\n.pc-session-list { display: flex; flex-direction: column; gap: 8px; }\n.pc-session-row {\n  display: flex; flex-direction: column; gap: 5px;\n  min-width: 0;\n  padding: 9px 11px 8px;\n  border-radius: 10px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-session-row.is-highlight {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 62%, var(--dsw-alias-border-l2, #0000001a));\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 16%, transparent);\n}\n.pc-session-top { display: flex; align-items: center; gap: 7px; min-width: 0; }\n.pc-session-title {\n  flex: 1 1 auto; min-width: 0;\n  font-size: 12.5px; font-weight: 600;\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n}\n.pc-session-state {\n  flex: none;\n  display: flex; align-items: center; gap: 5px;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n  white-space: nowrap;\n}\n.pc-session-time { font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-session-meta {\n  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;\n  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);\n}\n.pc-session-event {\n  display: flex; align-items: center; gap: 5px;\n  min-width: 0;\n  padding: 4px 7px;\n  border-radius: 6px;\n  font-size: 11px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 30%, transparent);\n}\n.pc-session-event-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-session-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }\n.pc-panel-empty {\n  display: flex; flex-direction: column; align-items: center; gap: 9px;\n  padding: 30px 18px;\n  text-align: center;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 12px;\n}\n.pc-events-section { scroll-margin-top: 8px; }\n\n/* ---------- Reference screenshots (detail drawer / new requirement) ---------- */\n.pc-att-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }\n.pc-att {\n  display: flex; flex-direction: column; gap: 3px;\n  min-width: 0;\n  color: inherit; text-decoration: none;\n  border-radius: 8px;\n}\n.pc-att:hover .pc-att-img { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 45%, var(--dsw-alias-border-l2, #0000001a)); }\n.pc-att-img {\n  display: block;\n  width: 100%; height: 96px;\n  object-fit: cover;\n  border-radius: 8px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 32%, transparent);\n  transition: border-color 0.12s;\n}\n.pc-att-caption { display: flex; align-items: baseline; gap: 6px; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-att-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-att-size { flex: none; font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-att-fallback {\n  height: 96px;\n  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;\n  padding: 6px;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  text-align: center; overflow: hidden;\n}\n.pc-att-fallback-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-att-fallback-path { max-width: 100%; overflow: hidden; font-family: var(--pc-mono); font-size: 9px; color: var(--dsw-alias-label-caption, #adb2b8); word-break: break-all; max-height: 24px; }\n\n.pc-attach-field {\n  display: flex; flex-direction: column; gap: 7px;\n  padding: 10px 12px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 10px;\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 20%, transparent);\n}\n.pc-attach-head { display: flex; align-items: center; gap: 8px; }\n.pc-attach-count { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-attach-head .pc-btn { margin-left: auto; }\n.pc-attach-hint { font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-attach-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }\n.pc-attach-item {\n  position: relative;\n  display: flex; flex-direction: column; gap: 3px;\n  min-width: 0;\n  padding: 5px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-attach-img { display: block; width: 100%; height: 76px; object-fit: cover; border-radius: 6px; }\n.pc-attach-meta { display: flex; align-items: baseline; gap: 5px; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-attach-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.pc-attach-size { flex: none; font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-attach-remove {\n  position: absolute; top: 8px; right: 8px;\n  width: 20px; height: 20px;\n  display: grid; place-items: center;\n  padding: 0;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  border-radius: 50%;\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  box-shadow: 0 1px 3px rgb(15 17 21 / 0.12);\n}\n.pc-attach-remove:hover { color: var(--dsw-alias-state-error-primary, #dc2626); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, transparent); }\n.pc-attach-remove:disabled { opacity: 0.5; cursor: not-allowed; }\n\n/* ---------- Permanent delete ---------- */\n.pc-card-del { width: 22px; height: 22px; color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-card-del:hover { color: var(--dsw-alias-state-error-primary, #dc2626) !important; background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 10%, transparent) !important; }\n.pc-icon-btn--danger:hover { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 10%, transparent); }\n\n/* ---------- Cancel requirement (secondary danger button) ---------- */\n.pc-btn--cancel {\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n  background: transparent;\n  border-color: transparent;\n}\n.pc-btn--cancel:hover:not(:disabled) {\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 8%, transparent);\n  color: var(--dsw-alias-state-error-primary, #dc2626);\n}\n.pc-card-actions .pc-btn--cancel { border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 26%, transparent); }\n\n/* ---------- In acceptance (verifying: lead accepts first, manual override possible) ---------- */\n.pc-chip-verifying {\n  display: inline-flex; align-items: center; gap: 3px;\n  height: 18px; padding: 0 6px;\n  border-radius: 5px;\n  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 32%, transparent);\n  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;\n  white-space: nowrap;\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent);\n}\n.pc-card-verifying {\n  display: flex; align-items: center; gap: 5px;\n  padding: 4px 7px;\n  border-radius: 6px;\n  font-size: 10.5px; line-height: 1.4;\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent);\n}\n.pc-card--verifying {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 34%, var(--dsw-alias-border-l2, #0000001a));\n}\n\n/* ---------- Project Console chat drawer ---------- */\n.pc-drawer--chat { width: 560px; }\n.pc-chat-body { padding: 0; gap: 0; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }\n.pc-chat-list {\n  flex: 1 1 auto; min-height: 0;\n  overflow-y: auto;\n  display: flex; flex-direction: column; gap: 10px;\n  padding: 12px 16px;\n}\n.pc-chat-msg { display: flex; flex-direction: column; gap: 3px; max-width: 92%; min-width: 0; }\n.pc-chat-msg--user { align-self: flex-end; align-items: flex-end; max-width: 84%; }\n.pc-chat-msg--assistant { align-self: flex-start; }\n.pc-chat-msg--tool, .pc-chat-msg--system { align-self: stretch; max-width: 100%; }\n.pc-chat-msg-head { display: flex; align-items: center; gap: 6px; font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-chat-role { font-weight: 700; letter-spacing: 0.3px; }\n.pc-chat-role--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-chat-role--success { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); }\n.pc-chat-role--idle { color: var(--dsw-alias-label-secondary, #61666b); }\n.pc-chat-role--muted { color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-chat-time { font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-chat-type {\n  max-width: 200px;\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n  padding: 0 4px; border-radius: 4px;\n  font-family: var(--pc-mono); font-size: 9px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 6%, transparent);\n}\n.pc-chat-text {\n  padding: 7px 10px;\n  border-radius: 10px;\n  border: 1px solid transparent;\n  font-size: 12.5px; line-height: 1.62;\n  white-space: pre-wrap; word-break: break-word;\n  color: var(--dsw-alias-label-primary, #0f1115);\n}\n.pc-chat-msg--user .pc-chat-text {\n  background: var(--dsw-alias-button-primary-fill, #0f1115);\n  color: var(--dsw-alias-label-primary-foreground, #ffffff);\n  border-radius: 10px 10px 3px 10px;\n}\n.pc-chat-msg--assistant .pc-chat-text {\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 34%, transparent);\n  border-color: var(--dsw-alias-border-l1, #0000000a);\n  border-radius: 10px 10px 10px 3px;\n}\n.pc-chat-msg--tool .pc-chat-text {\n  padding: 4px 8px;\n  font-family: var(--pc-mono);\n  font-size: 10.5px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 22%, transparent);\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n}\n.pc-chat-msg--system .pc-chat-text {\n  font-size: 11px;\n  color: var(--dsw-alias-label-tertiary, #81858c);\n  background: transparent;\n  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);\n}\n.pc-chat-composer {\n  flex: none;\n  display: flex; flex-direction: column; gap: 8px;\n  padding: 10px 16px 14px;\n  border-top: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n}\n.pc-chat-composer .pc-textarea { min-height: 64px; max-height: 170px; resize: vertical; }\n.pc-chat-composer-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }\n.pc-chat-empty { border: 0; padding: 28px 16px; }\n\n/* ---------- Task session log drawer (read-only, replaces the native session) ---------- */\n.pc-drawer--transcript { width: 620px; }\n.pc-transcript-body {\n  padding: 10px 16px 14px;\n  gap: 8px;\n  display: flex; flex-direction: column;\n  min-height: 0;\n  overflow: hidden;\n}\n.pc-run-tabs { flex: none; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }\n.pc-run-tab {\n  font-family: inherit;\n  font-size: 11px; line-height: 1;\n  height: 26px; padding: 0 10px;\n  border-radius: 999px;\n  border: 1px solid var(--dsw-alias-border-l2, #0000001a);\n  background: var(--dsw-alias-bg-base, #ffffff);\n  color: var(--dsw-alias-label-secondary, #61666b);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background-color 0.12s, border-color 0.12s, color 0.12s;\n}\n.pc-run-tab:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-run-tab.is-active {\n  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent);\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent);\n  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));\n  font-weight: 600;\n}\n.pc-transcript-list {\n  flex: 1 1 auto; min-height: 0;\n  overflow-y: auto;\n  display: flex; flex-direction: column; gap: 9px;\n  padding: 2px 0 6px;\n}\n.pc-transcript-empty { border: 0; padding: 26px 16px; }\n\n/* Changes in this run: file list (acceptance commit / latest run) */\n.pc-change-meta { font-size: 10.5px; color: var(--dsw-alias-label-caption, #adb2b8); }\n.pc-change-hint { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }\n.pc-change-list {\n  display: flex; flex-direction: column; min-width: 0;\n  border: 1px solid var(--dsw-alias-border-l1, #0000000a);\n  border-radius: 9px;\n  background: var(--dsw-alias-bg-base, #fff);\n  overflow: hidden;\n}\n.pc-change-row {\n  display: flex; align-items: center; gap: 8px;\n  padding: 5px 9px;\n  min-width: 0;\n  font-family: var(--pc-mono);\n  font-size: 11px;\n  line-height: 1.45;\n}\n.pc-change-row + .pc-change-row { border-top: 1px solid var(--dsw-alias-border-l1, #0000000a); }\n.pc-change-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }\n.pc-change-path {\n  flex: 1 1 auto; min-width: 0;\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n.pc-change-stat { flex: none; display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }\n.pc-change-blank { color: var(--dsw-alias-label-caption, #adb2b8); font-size: 10px; }\n",
		  "队友子会话": "Teammate sub-sessions",
		  "任务会话当 Team Lead 时用 spawn_teammate 开的 teammate；这些命令/输出来自子会话，不计入上面的 selfTest。": "Teammates spawned with spawn_teammate while the task session acts as Team Lead; these commands and outputs come from sub-sessions and are not counted in selfTest above.",
		  "查看该队友的最终输出": "View this teammate's final output",
		  "本次运行没有 selfTest 记录": "No selfTest records for this run",
		  "命令": "Command",
		  "退出码": "Exit code",
		  "输出尾部": "Output tail",
		  "展开输出尾部": "Expand output tail",
		  "二进制或仅元数据变化，没有行数统计": "Binary or metadata-only change, no line counts",
		  "没有行数统计": "No line counts",
		  "二进制": "Binary",
		  "验收提交": "Acceptance commit",
		  "本次改动": "Changes ",
		  "改动都在工程台内部文件里（.project-console/…）": "All changes are in Project Console internal files (.project-console/…)",
		  "验收时工作树没有改动（空提交）": "No changes in the working tree at acceptance time (empty commit)",
		  "验收提交里没有任务改动的文件": "The acceptance commit has no files changed by the task",
		  "还在运行，改动文件出现后会自动刷新": "Still running; this refreshes as soon as changed files show up",
		  " : \"\"}，但没有文件清单": "\" : \"\"}, but no file list",
		  "本次运行没有改文件": "No files changed in this run",
		  "任务运行结束后，这里会列出改动的文件": "Changed files will be listed here after the task finishes",
		  "失败": "Failed",
		  "已结束": "Finished",
		  "任务执行期间主仓有变更（drift）": "The main repo changed while the task was running (drift)",
		  "宿主复跑": "Host rerun",
		  "查看会话最终输出": "View the session's final output",
		  "本次运行改动": "Changes in this run",
		  "本次只有工程台内部文件改动": "Only Project Console internal files changed in this run",
		  "暂无会话事件": "No session events yet",
		  "下载验收报告（单文件 HTML，证据截图内联；可离线打开或打印成 PDF）": "Download the acceptance report (single HTML file with evidence screenshots inlined; open offline or print to PDF)",
		  "验收报告": "Acceptance report",
		  "提优先级": "Raise priority",
		  "降优先级": "Lower priority",
		  "重新判定工作量（POST /task/estimate）": "Re-estimate size (POST /task/estimate)",
		  "重估": "Re-estimate",
		  "验收通过": "Accept",
		  "打回返工": "Send back for rework",
		  "让工程台重新验收一次（force 对同一 run 重试）": "Have Project Console accept again (force retries the same run)",
		  "让工程台 lead 验收一次": "Have the Project Console lead accept once",
		  "查看会话记录": "View session log",
		  "任务详情": "Task details",
		  "关闭详情（Esc）": "Close details (Esc)",
		  "关闭详情": "Close details",
		  "读取任务详情…": "Loading task details…",
		  "任务不存在": "Task not found",
		  "正在请求 GET /task?id=": "Requesting GET /task?id=",
		  "宿主没有返回这个任务，可能已被删除。": "The host did not return this task; it may have been deleted.",
		  "类型 / 工作量": "Type / size",
		  "任务模型": "Task model",
		  "分支": "Branch",
		  "创建时间": "Created",
		  "更新时间": "Updated",
		  "运行次数": "Runs",
		  "基本信息": "Basics",
		  "依赖：": "Dependencies:",
		  "触及路径：": "Touched paths:",
		  "标签：": "Labels:",
		  "（没有简报）": "(no brief)",
		  "验收标准 DoD": "Acceptance criteria (DoD) ",
		  "还没有 DoD 条目": "No DoD items yet",
		  "运行记录": "Run history ",
		  "还没有运行记录": "No runs yet",
		  "澄清问题": "Clarification questions ",
		  "已回答": "Answered",
		  "已忽略": "Ignored",
		  "最近会话事件": "Recent session events ",
		  "没有集成命令记录": "No integration commands recorded",
		  "收起报告": "Collapse report",
		  "展开报告": "Expand report",
		  "任务：": "Task: ",
		  "集成测试运行中，不要关闭页面（可能 1-10 分钟）": "Integration tests are running — don't close the page (may take 1-10 minutes)",
		  "通过": "Passed",
		  "把批次测试结果推送到本地 main 分支（不推远端仓库）": "Push the batch test results to the local main branch (no remote push)",
		  "推送到 main": "Push to main",
		  "回滚": "Roll back",
		  "集成测试未通过，修复后重新发起集成": "Integration tests failed — fix the issue and start a new integration batch",
		  "确认推送到 main？": "Confirm push to main?",
		  "将把批次测试结果": "The batch test results will be ",
		  "推送到": "pushed to ",
		  " 分支。": " branch.",
		  "只更新本地 main，不会推送到远端仓库；宿主在改动前已把原分支备份到 ": "Only the local main is updated; nothing is pushed to the remote. Before the change, the host backed up the original branch to ",
		  "备份 ref": "backup ref",
		  "，出问题可用「回滚」恢复。": "; if something goes wrong, use \"Roll back\" to restore it.",
		  "确认推送": "Confirm push",
		  "确认回滚已合并批次？": "Roll back the merged batch?",
		  "将用备份 ": "The backup ",
		  " 或 revert commit 把 base 恢复到合并前状态；已合并的提交会从分支上移除。": " or a revert commit will restore base to its pre-merge state; merged commits are removed from the branch.",
		  "确认回滚": "Confirm rollback",
		  "集成与合并": "Integration and merge",
		  "在测试分支上集成，人工确认后推送到 main": "Integrate on a test branch, push to main after manual confirmation",
		  "流程：勾选已验收任务 → 发起集成 → 跑集成命令 → 通过后推送到 main → 需要时回滚": "Flow: select accepted tasks → start an integration batch → run integration commands → push to main when passed → roll back if needed",
		  "关闭集成面板": "Close integration panel",
		  "（没有项目）": "(no projects)",
		  "可集成的已验收任务": "Accepted tasks ready to integrate ",
		  "当前项目没有「已验收」任务。先在验收中列点「验收」，任务才会进入可集成列表。": "This project has no accepted tasks yet. Mark them as accepted in Acceptance first — only then do they appear in the integrable list.",
		  "取消全选": "Deselect all",
		  "全选": "Select all",
		  "发起集成": "Start integration",
		  "最近批次": "Recent batches ",
		  "还没有集成批次。勾选已验收任务后点「发起集成」。": "No integration batches yet. Select accepted tasks, then click \"Start integration\".",
		  "已发送给工程台会话": "Sent to the Project Console session",
		  "正在读取对话…": "Loading conversation…",
		  "还没有对话记录": "No conversation yet",
		  "在下面输入框给工程台发第一条指令，比如「用一句话说明当前看板状态」。": "Use the box below to send the Project Console its first instruction, e.g. \"Describe the current board status in one sentence.\"",
		  "给工程台发消息…（Enter 发送，Shift+Enter 换行）\\n例如：用一句话说明当前看板状态。": "Message the Project Console… (Enter to send, Shift+Enter for a new line)\\nFor example: describe the current board status in one sentence.",
		  "发送": "Send",
		  "工程台对话": "Project Console chat",
		  "工程台 · super agent": "Project Console · super agent",
		  "隐藏会话": "Hide session",
		  "对话记录来自 /lead/transcript，发送会直接驱动 lead": "Transcript comes from /lead/transcript; sending drives lead directly",
		  "关闭对话": "Close chat",
		  "在工程台页面内打开对话（lead 是隐藏会话，native 聊天打不开）": "Open the conversation in the Project Console page (lead is a hidden session, so native chat can't open it)",
		  "打开对话": "Open chat",
		  "打开任务详情并定位到会话事件": "Open task details and jump to the session events",
		  "查看日志": "View log",
		  "隐藏会话（侧栏不再显示，数据保留）": "Hide session (hidden from the sidebar, data kept)",
		  "隐藏": "Hide",
		  "宿主还没有提供会话列表": "The host doesn't provide a session list yet",
		  "GET /state.sessions 为空或尚未提供。host 更新后这里会自动出现工程台会话与任务会话；任务会话是隐藏会话，左栏不再显示。": "GET /state.sessions is empty or not provided yet. After the host is updated, Project Console sessions and task sessions show up here automatically; task sessions are hidden and no longer appear in the left column.",
		  "工程台会话已创建": "Project Console session created",
		  "工程台会话与任务会话": "Project Console and task sessions",
		  " : \"\"} · 会话都是隐藏会话，只能从这里访问": " : \"\"} · All sessions are hidden and can only be reached from here",
		  "关闭会话面板": "Close session panel",
		  "正在读取会话记录…": "Loading session log…",
		  "这次 run 还没有可读消息": "This run has no readable messages yet",
		  "会话是隐藏的（左栏不显示），记录仍在宿主里；换一个 run 或等任务跑起来再看。": "The session is hidden (not shown in the left column) but its log is still on the host. Try another run, or check back once the task starts running.",
		  "任务会话记录": "Task session log",
		  "运行中 · 每 3s 刷新": "Running · refreshes every 3s",
		  "关闭会话记录": "Close session log",
		  "收件箱": "Inbox",
		  "准备中": "Preparing",
		  "已验收": "Accepted",
		  "已合并": "Merged",
		  "已放弃": "Abandoned",
		  "没有待派发的需求": "No requests waiting to be dispatched",
		  "没有运行中的任务": "No running tasks",
		  "没有验收中的任务": "No tasks awaiting acceptance",
		  "还没有归档任务": "No archived tasks yet",
		  "测试通过": "Tests passed",
		  "测试失败": "Tests failed",
		  "待人工确认": "Awaiting manual confirmation",
		  "已回滚": "Rolled back",
		  "新功能": "Feature",
		  "修复": "Fix",
		  "重构": "Refactor",
		  "性能": "Perf",
		  "杂项": "Chore",
		  "文档": "Docs",
		  "测试": "Test",
		  "低": "Low",
		  "中": "Medium",
		  "高": "High",
		  " : \"\"}。可在任务详情里重估。": " : \"\"}. You can re-estimate it in the task details.",
		  "部署默认": "Deployment default",
		  "未知": "Unknown",
		  "刚刚 / 12 秒前 / 3 分钟前 / 2 小时前 / 3 天前 / 日期": "just now / 12 seconds ago / 3 minutes ago / 2 hours ago / 3 days ago / date",
		  "刚刚": "Just now",
		  "3 分 24 秒": "3 min 24 s",
		  "2 小时 5 分": "2 h 5 min",
		  "4 天 3 小时": "4 d 3 h",
		  "全部通过": "All passed",
		  "环境错误": "Environment error",
		  "没有可集成任务": "No tasks available to integrate",
		  "槽位已满，先等运行中的任务结束": "Slots are full — wait for running tasks to finish",
		  "依赖任务还没合入 base，不能派发": "Dependency tasks haven't been merged into base; can't dispatch",
		  "目标不存在，可能已被删除": "Target doesn't exist; it may have been deleted",
		  "集成失败，展开批次报告看命令输出": "Integration failed. Expand the batch report to see the command output.",
		  "推送到 main 需要显式确认": "Pushing to main requires explicit confirmation",
		  "工程台宿主未就绪（端点 404），请稍后重试": "The Project Console host isn't ready (endpoint 404). Try again later.",
		  "请求被拒绝：缺少写请求挡板头，或来源校验未通过": "Request rejected: missing the write-request guard header or failed origin check",
		  "状态冲突，请刷新后重试": "State conflict. Refresh and try again.",
		  "参数不合法": "Invalid parameters",
		  "没有会话 id": "No session id",
		  "宿主没有提供 uiWorkspace 服务": "The host doesn't provide the uiWorkspace service",
		  "工程台会话": "Project Console session",
		  "未命名会话": "Untitled session",
		  "你": "You",
		  "工具": "Tool",
		  "系统": "System",
		  "消息": "Message",
		  "需求": "Request",
		  "执行会话": "Execution session",
		  "r6 · 已结束 · 自测 9/9": "r6 · finished · self-test 9/9",
		  "读取图片失败": "Failed to load image",
		  "模型服务": "Model service",
		  "重复任务": "Duplicate task",
		  "中断": "Interrupted",
		  "操作员取消": "Cancelled by operator",
		  "范围调整": "Scope change",
		  "其他": "Other",
		  "未填写放弃原因（可在详情里补充）": "No abandonment reason given (you can add one in the details)",
		  "运行失败，查看详情里的命令输出": "Run failed. Check the command output in the details."
		};

		/** 带占位符的动态文案（模板字符串拼出来的），用模式匹配兜底。 */
		const PC_EN_PATTERNS = [
		  [/^刚刚$/, "just now"],
		  [/^(\d+) 秒前$/, "$1s ago"],
		  [/^(\d+) 分钟前$/, "$1 min ago"],
		  [/^(\d+) 小时前$/, "$1 h ago"],
		  [/^(\d+) 天前$/, "$1 d ago"],
		  [/^已连接 · 自动刷新 2s · 同步于 (.+)$/, "Connected · auto-refresh 2s · synced at $1"],
		  [/^(.+?)（验收中 (\d+)）$/, "$1 ($2 in review)"],
		  [/^集成 (\d+)$/, "Integrate $1"],
		  [/^自测 (\d+)\/(\d+)$/, "Tests $1/$2"],
		  [/^测试 (\d+)\/(\d+)$/, "Tests $1/$2"],
		  [/^工作量 (.+)$/, (m) => `Workload ${pcT(m[1])}`],
		  [/^槽 (\d+)$/, "Slot $1"],
		  [/^(\d+) 文件$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "file" : "files"}`],
		  [/^(\d+) 个文件$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "file" : "files"}`],
		  [/^(\d+) 个文件( · .+)$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "file" : "files"}${m[2]}`],
		  [/^(\d+) 个任务$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "task" : "tasks"}`],
		  [/^(\d+) 个会话$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "session" : "sessions"}`],
		  [/^验收 (.+)$/, "Accepted $1"],
		  [/^批次 (\S+) · (.+)$/, (m) => `Batch ${m[1]} · ${pcT(m[2])}`],
		  [/^(\d+) (秒|分|小时|天)$/, (m) => {
		    const unit = { "秒": "s", "分": "min", "小时": "h", "天": "d" }[m[2]] ?? "";
		    return `${m[1]} ${unit}`;
		  }],
		  [/^(.+?) \/ (.+?)（(.+?)）$/, (m) => `${m[1]} / ${pcT(m[2])} (${m[3]})`],
		  [/^(\d+) 条$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "item" : "items"}`],
		  [/^(\d+) 条失败$/, (m) => `${m[1]} failed`],
		  [/^(\d+) 次$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "run" : "runs"}`],
		  [/^最近运行 (.+)$/, "Last run $1"],
		  [/^开始 (.+)$/, "Started $1"],
		  [/^· 耗时 (.+)$/, (m) => `· took ${pcT(m[1])}`],
		  [/^(\d+) 个$/, "$1"],
		  [/^已选 (\d+)\/(\d+)$/, "Selected $1/$2"],
		  [/^集成目标分支 (.+)$/, "Integration target branch $1"],
		  [/^集成命令：(.+)$/, "Integration commands: $1"],
		  [/^将集成 (\d+) 个任务（未勾选时按宿主默认=全部已验收）$/, (m) => `Will integrate ${m[1]} ${Number(m[1]) === 1 ? "task" : "tasks"} (host default = all accepted when none are selected)`],
		  [/^集成 (\d+) 个任务$/, (m) => `Integrate ${m[1]} ${Number(m[1]) === 1 ? "task" : "tasks"}`],
		  [/^测试分支 (.+)$/, "Test branch $1"],
		  [/^备份 (.+)$/, "Backup $1"],
		  [/^判定：(.+)$/, (m) => `Verdict: ${pcT(m[1])}`],
		  [/^已推送到 (.+)$/, "Pushed to $1"],
		  [/^合并 (.+)$/, "Merged $1"],
		  [/^全局槽位 (\d+)\/(\d+)$/, "Global slots $1/$2"],
		  [/^当前占用 (\d+) \/ (\d+)$/, "Currently used $1 / $2"],
		  [/^占用 (\d+)$/, "Used $1"],
		  [/^(低|中|高)工作量$/, (m) => `${pcT(m[1])} workload`],
		  [/^(待办|进行中|验收中|已归档)列$/, (m) => `${pcT(m[1])} column`],
		];

		let pcLocale = null;
		let pcTranslator = null;

		function pcSetLocale(locale) {
		  pcLocale = locale ?? null;
		  try {
		    pcTranslator = pcLocale && typeof pcLocale.bind === "function" ? pcLocale.bind(PC_I18N_NS) : null;
		  } catch {
		    pcTranslator = null;
		  }
		}

		function pcCurrentLang() {
		  try {
		    const active = pcLocale && typeof pcLocale.getSnapshot === "function" ? pcLocale.getSnapshot()?.active : null;
		    return typeof active === "string" ? active : "zh";
		  } catch {
		    return "zh";
		  }
		}

		function pcPatternTranslate(text) {
		  for (const [re, replacement] of PC_EN_PATTERNS) {
		    const m = re.exec(text);
		    if (!m) continue;
		    if (typeof replacement === "function") return replacement(m);
		    return replacement.replace(/\$(\d)/g, (_all, index) => m[Number(index)] ?? "");
		  }
		  return null;
		}

		function pcT(text, params) {
		  if (typeof text !== "string" || text === "") return text;
		  let translated = text;
		  try {
		    if (pcTranslator) translated = pcTranslator(text, params);
		  } catch {
		    translated = text;
		  }
		  if (translated !== text) return translated;
		  if (!pcCurrentLang().startsWith("zh")) {
		    const pattern = pcPatternTranslate(text);
		    if (pattern !== null) return pattern;
		  }
		  return text;
		}

		const PC_TEXT_PROPS = new Set([
		  "placeholder", "title", "aria-label", "alt", "label",
		  "hint", "desc", "subtitle", "summary", "text", "message",
		  "confirmText", "cancelText", "catalogEmpty",
		]);

		function pcMapChildren(children) {
		  const out = [];
		  for (const child of children) {
		    if (typeof child === "string") out.push(pcT(child));
		    else if (Array.isArray(child)) out.push(pcMapChildren(child));
		    else out.push(child);
		  }
		  return out;
		}

		/** React.createElement 的本地化包装。 */
		function pcElement(type, props, ...children) {
		  let nextProps = props;
		  if (nextProps && typeof nextProps === "object") {
		    for (const key of Object.keys(nextProps)) {
		      if (PC_TEXT_PROPS.has(key) && typeof nextProps[key] === "string") {
		        if (nextProps === props) nextProps = { ...props };
		        nextProps[key] = pcT(nextProps[key]);
		      }
		    }
		  }
		  return React.createElement(type, nextProps, ...pcMapChildren(children));
		}

		function pcUnescapeText(value) {
		  return typeof value === "string"
		    ? value.replace(/\\n/g, "\n").replace(/\\t/g, "\t")
		    : value;
		}

		function pcNormalizeDictionary(dict) {
		  const out = {};
		  for (const [key, value] of Object.entries(dict)) out[pcUnescapeText(key)] = pcUnescapeText(value);
		  return out;
		}

		function pcDictionaries() {
		  const en = pcNormalizeDictionary(PC_EN);
		  const zh = {};
		  for (const key of Object.keys(en)) zh[key] = key;
		  return { zh, en };
		}
		// ===== src/client/util.js =====
		/**
		 * 工程台 client：常量与纯函数（无 React 依赖）。
		 */

		/** 左栏行 id / main 面板 key（必须一致）。 */
		const PC_PANEL_ID = "project-console";

		/** 同源 API 前缀（与 host 侧 ROUTE_PREFIX 一致）。 */
		const PC_API_BASE = "/project-console-api";

		/**
		 * 任务状态元数据（CONTRACT.md §1 的 status 枚举）。
		 * tone 决定徽标配色：idle=中性 / busy=蓝 / warn=琥珀 / danger=红 / success=绿 / muted=弱化。
		 */
		const PC_STATUS_META = {
		  inbox: { label: "收件箱", tone: "idle" },
		  queued: { label: "待办", tone: "idle" },
		  provisioning: { label: "准备中", tone: "busy" },
		  running: { label: "运行中", tone: "busy" },
		  verifying: { label: "验收中", tone: "busy" },
		  needs_review: { label: "验收中", tone: "warn" },
		  failed: { label: "失败", tone: "danger" },
		  needs_input: { label: "待澄清", tone: "warn" },
		  accepted: { label: "已验收", tone: "success" },
		  merged: { label: "已合并", tone: "success" },
		  abandoned: { label: "已放弃", tone: "muted" },
		};

		/**
		 * 看板四列定义（CONTRACT.md §3.4）。
		 * needs_input 不在契约列出的状态里：它已经有 worktree/会话、只是等人工回答，
		 * 归入「进行中」并在卡片上打「待澄清」徽标（偏差已记录在交付消息里）。
		 */
		const PC_COLUMN_DEFS = [
		  {
		    key: "todo",
		    title: "待办",
		    tone: "idle",
		    statuses: ["inbox", "queued"],
		    empty: "没有待派发的需求",
		  },
		  {
		    key: "running",
		    title: "进行中",
		    tone: "busy",
		    statuses: ["provisioning", "running", "needs_input"],
		    empty: "没有运行中的任务",
		  },
		  {
		    key: "review",
		    title: "验收中",
		    tone: "warn",
		    statuses: ["verifying", "needs_review", "failed"],
		    empty: "没有验收中的任务",
		  },
		  {
		    key: "done",
		    title: "已归档",
		    tone: "success",
		    statuses: ["accepted", "merged", "abandoned"],
		    empty: "还没有归档任务",
		  },
		];

		const PC_BATCH_STATUS_META = {
		  running: { label: "运行中", tone: "busy" },
		  passed: { label: "测试通过", tone: "success" },
		  failed: { label: "测试失败", tone: "danger" },
		  awaiting_confirmation: { label: "待人工确认", tone: "warn" },
		  merged: { label: "已合并", tone: "success" },
		  reverted: { label: "已回滚", tone: "muted" },
		};

		/** 任务类型的中文名（新需求表单用；契约只约定字符串值）。 */
		const PC_TASK_TYPES = [
		  ["feature", "新功能"],
		  ["fix", "修复"],
		  ["refactor", "重构"],
		  ["perf", "性能"],
		  ["chore", "杂项"],
		  ["docs", "文档"],
		  ["test", "测试"],
		];

		/* ───────────────────── 工作量（AI 判定，人只配置档位模型） ───────────────────── */

		/** 工作量三档：低 / 中 / 高。 */
		const PC_WORKLOAD_TIERS = [
		  ["low", "低"],
		  ["medium", "中"],
		  ["high", "高"],
		];

		/** size（xs/s/m/l/xl）→ 工作量档位；未知按「中」。 */
		const PC_SIZE_TIER = { xs: "low", s: "low", m: "medium", l: "high", xl: "high" };
		const PC_SIZE_LABEL = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" };
		/** 各档位覆盖的 size（设置页说明用）。 */
		const PC_TIER_SIZE_HINT = { low: "xs / s", medium: "m", high: "l / xl" };

		function pcWorkloadTier(size) {
		  return PC_SIZE_TIER[size] ?? "medium";
		}

		function pcWorkloadLabel(size) {
		  const tier = pcWorkloadTier(size);
		  const found = PC_WORKLOAD_TIERS.find(([value]) => value === tier);
		  return found ? found[1] : "中";
		}

		/** 工作量来源说明：AI 判定 / AI 评估失败暂定 / 旧数据。 */
		function pcSizeSourceMeta(task) {
		  const source = task && task.sizeSource;
		  if (source === "fallback") {
		    return {
		      label: "",
		      tone: "warn",
		      title: `评估失败，暂按「${pcWorkloadLabel(task.size)}」派发${task.estimateError ? `：${task.estimateError}` : ""}。可在任务详情里重估。`,
		    };
		  }
		  return { label: "", tone: "", title: "" };
		}

		/** 卡片/详情上的工作量标签文案（AI 判定会带出来源，方便区分是不是人设过）。 */
		function pcWorkloadChipText(task) {
		  return `工作量 ${pcWorkloadLabel(task && task.size)}`;
		}

		/** 任务的派发模型：实际跑过的 run 记录 → 档位配置 → 项目 workerModel → （空 = 部署默认）。 */
		function pcTaskWorkerModel(state, task, lastRun) {
		  const runModel = lastRun && lastRun.workerModel;
		  if (runModel && runModel.model) {
		    return {
		      provider: runModel.provider || "",
		      model: runModel.model,
		      reasoningEffort: runModel.reasoningEffort || "",
		      source: "run",
		    };
		  }
		  const tier = pcWorkloadTier(task && task.size);
		  const configured = state && state.settings && state.settings.workloadModels ? state.settings.workloadModels[tier] : null;
		  if (configured && configured.provider && configured.model) {
		    return {
		      provider: configured.provider,
		      model: configured.model,
		      reasoningEffort: configured.reasoningEffort || "",
		      source: "workload",
		    };
		  }
		  const project = pcProjectById((state && state.projects) ?? [], task && task.projectId);
		  if (project && project.workerModel && project.workerModel.model) {
		    return {
		      provider: project.workerModel.provider || "",
		      model: project.workerModel.model,
		      reasoningEffort: project.workerModel.reasoningEffort || "",
		      source: "project",
		    };
		  }
		  return { provider: "", model: "", reasoningEffort: "", source: "default" };
		}

		/** "mtcode/deepseek-flash · max"；没配置返回 "部署默认"。 */
		function pcWorkerModelText(model) {
		  if (!model || !model.model) return "部署默认";
		  const route = model.provider ? `${model.provider}/${model.model}` : model.model;
		  return model.reasoningEffort ? `${route} · ${model.reasoningEffort}` : route;
		}

		/** 单个模型选择 → 设置页草稿 {key, effort}；key = "provider::model"。 */
		function pcModelDraftOf(config) {
		  if (!config || !config.provider || !config.model) return { key: "", effort: "" };
		  return { key: `${config.provider}::${config.model}`, effort: config.reasoningEffort || "" };
		}

		/** 设置页草稿 {key, effort} → host 模型选择 {provider, model, reasoningEffort?}；空 = null。 */
		function pcModelPayloadOf(draft) {
		  const item = draft || {};
		  if (!item.key) return null;
		  const sep = item.key.indexOf("::");
		  if (sep < 0) return null;
		  const provider = item.key.slice(0, sep);
		  const model = item.key.slice(sep + 2);
		  if (!provider || !model) return null;
		  return { provider, model, ...(item.effort ? { reasoningEffort: item.effort } : {}) };
		}

		/** 设置页/详情页共用的档位模型草稿：{low:{key,effort}, ...}，key = "provider::model"。 */
		function pcWorkloadDraftOf(settings) {
		  const configured = (settings && settings.workloadModels) || {};
		  const draft = {};
		  for (const [tier] of PC_WORKLOAD_TIERS) {
		    const item = configured[tier];
		    draft[tier] = item && item.provider && item.model
		      ? { key: `${item.provider}::${item.model}`, effort: item.reasoningEffort || "" }
		      : { key: "", effort: "" };
		  }
		  return draft;
		}

		/** 草稿 → /settings/update 的 workloadModels 载荷（空 key = null，跟随项目/部署默认）。 */
		function pcWorkloadModelsPayload(draft) {
		  const out = {};
		  for (const [tier] of PC_WORKLOAD_TIERS) {
		    const item = (draft && draft[tier]) || {};
		    if (!item.key) {
		      out[tier] = null;
		      continue;
		    }
		    const sep = item.key.indexOf("::");
		    const provider = item.key.slice(0, sep);
		    const model = item.key.slice(sep + 2);
		    out[tier] = { provider, model, ...(item.effort ? { reasoningEffort: item.effort } : {}) };
		  }
		  return out;
		}

		/** 状态 → 看板列 key。 */
		function pcColumnOf(status) {
		  if (status === "inbox" || status === "queued") return "todo";
		  if (status === "provisioning" || status === "running" || status === "needs_input") {
		    return "running";
		  }
		  if (status === "verifying" || status === "needs_review" || status === "failed") return "review";
		  if (status === "accepted" || status === "merged" || status === "abandoned") return "done";
		  return "todo";
		}

		/** 状态元数据（未知状态回退成中性展示）。 */
		function pcStatusMeta(status) {
		  return PC_STATUS_META[status] ?? { label: status || "未知", tone: "idle" };
		}

		function pcBatchMeta(status) {
		  return PC_BATCH_STATUS_META[status] ?? { label: status || "未知", tone: "idle" };
		}

		/** 数字安全取值。 */
		function pcNum(value, fallback) {
		  const n = typeof value === "number" ? value : Number(value);
		  return Number.isFinite(n) ? n : fallback;
		}

		/** ISO 字符串 / epoch 毫秒 → 毫秒时间戳；非法返回 null。 */
		function pcTimeMs(value) {
		  if (typeof value === "number" && Number.isFinite(value)) return value;
		  if (typeof value !== "string" || value === "") return null;
		  const t = Date.parse(value);
		  return Number.isNaN(t) ? null : t;
		}

		/** ISO → "MM-DD HH:mm"（今年省略年份）。 */
		function pcFmtDateTime(iso) {
		  const t = pcTimeMs(iso);
		  if (t === null) return "—";
		  const d = new Date(t);
		  const pad = (n) => String(n).padStart(2, "0");
		  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		  return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}-${md}`;
		}

		/** ISO → "HH:mm:ss"。 */
		function pcFmtClock(iso) {
		  const t = pcTimeMs(iso);
		  if (t === null) return "—";
		  const d = new Date(t);
		  const pad = (n) => String(n).padStart(2, "0");
		  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		}

		/** 相对时间："刚刚 / 12 秒前 / 3 分钟前 / 2 小时前 / 3 天前 / 日期"。 */
		function pcFmtRelative(iso, nowMs) {
		  const t = pcTimeMs(iso);
		  if (t === null) return "—";
		  const now = pcNum(nowMs, Date.now());
		  const diff = now - t;
		  if (diff < 0) return pcFmtDateTime(iso);
		  const sec = Math.floor(diff / 1000);
		  if (sec < 5) return "刚刚";
		  if (sec < 60) return `${sec} 秒前`;
		  const min = Math.floor(sec / 60);
		  if (min < 60) return `${min} 分钟前`;
		  const hour = Math.floor(min / 60);
		  if (hour < 24) return `${hour} 小时前`;
		  const day = Math.floor(hour / 24);
		  if (day < 7) return `${day} 天前`;
		  return pcFmtDateTime(iso);
		}

		/** 毫秒 → "3 分 24 秒" / "2 小时 5 分" / "4 天 3 小时"。 */
		function pcFmtDuration(ms) {
		  const value = pcNum(ms, NaN);
		  if (!Number.isFinite(value) || value < 0) return "—";
		  const sec = Math.floor(value / 1000);
		  if (sec < 60) return `${sec} 秒`;
		  const min = Math.floor(sec / 60);
		  const rs = sec % 60;
		  if (min < 60) return rs === 0 ? `${min} 分` : `${min} 分 ${rs} 秒`;
		  const hour = Math.floor(min / 60);
		  const rm = min % 60;
		  if (hour < 24) return rm === 0 ? `${hour} 小时` : `${hour} 小时 ${rm} 分`;
		  const day = Math.floor(hour / 24);
		  const rh = hour % 24;
		  return rh === 0 ? `${day} 天` : `${day} 天 ${rh} 小时`;
		}

		/** 运行时长：从 startedAt 算到现在（endedAt 存在则算到结束）。 */
		function pcRunDuration(run, nowMs) {
		  if (!run || typeof run !== "object") return "—";
		  const start = pcTimeMs(run.startedAt);
		  if (start === null) return "—";
		  const end = run.endedAt ? pcTimeMs(run.endedAt) : null;
		  return pcFmtDuration((end ?? pcNum(nowMs, Date.now())) - start);
		}

		/** ".5" 数据 / "1.4 GB" 之类的小数格式化。 */
		function pcFmtGB(value) {
		  const n = pcNum(value, null);
		  if (n === null) return "—";
		  return n >= 10 ? `${Math.round(n)}` : `${Math.round(n * 10) / 10}`;
		}

		/** "+120/-8" → { added: 120, deleted: 8 }；解析失败返回 null。 */
		function pcParseDiffStat(diffStat) {
		  if (typeof diffStat !== "string") return null;
		  const m = diffStat.match(/([+-]?\d+)\s*\/\s*([+-]?\d+)/);
		  if (!m) return null;
		  return { added: Number(m[1]), deleted: Number(m[2]) };
		}

		/** selfTest 汇总："4/5"；无数据返回 null。 */
		function pcSelfTestText(selfTest) {
		  if (!selfTest || typeof selfTest !== "object") return null;
		  const total = pcNum(selfTest.total, null);
		  if (total === null) return null;
		  const passed = pcNum(selfTest.passed, null);
		  if (passed === null) return null;
		  return { passed, total, failed: pcNum(selfTest.failed, total - passed), allPassed: passed >= total };
		}

		/** 会话 id 缩短展示（保留可辨识前缀 + 后缀）。 */
		function pcShortSession(sessionId) {
		  const text = String(sessionId ?? "");
		  if (text === "") return "";
		  if (text.length <= 22) return text;
		  return `${text.slice(0, 10)}…${text.slice(-6)}`;
		}

		/** 批次判定 / 二分结论的中文展示（host 用英文标签，UI 里翻一下，原样兜底）。 */
		function pcVerdictLabel(verdict) {
		  if (verdict === null || verdict === undefined) return null;
		  if (typeof verdict === "string") {
		    const map = {
		      "all-green": "全部通过",
		      passed: "通过",
		      failed: "失败",
		      "infra-error": "环境错误",
		      "no-tasks": "没有可集成任务",
		    };
		    return map[verdict] ?? verdict;
		  }
		  if (typeof verdict === "object") return verdict.summary || verdict.message || JSON.stringify(verdict);
		  return String(verdict);
		}

		/**
		 * 运行中卡片要显示的「最近一条事件」：优先最近一条非 user/message 的事件
		 * （会话里注入的 runtime 上下文前言会把最新事件刷成噪音），没有再回退到最后一条。
		 */
		function pcLatestEvent(events) {
		  const list = Array.isArray(events) ? events : [];
		  for (let i = list.length - 1; i >= 0; i -= 1) {
		    const event = list[i];
		    if (!event) continue;
		    if (event.type === "user/message") continue;
		    return event;
		  }
		  return list.length > 0 ? list[list.length - 1] : null;
		}

		/** 当前项目（selectedProject 为空表示「全部项目」）。 */
		function pcProjectById(projects, projectId) {
		  return (projects ?? []).find((p) => p.id === projectId) ?? null;
		}

		/** 任务所属项目名。 */
		function pcProjectName(projects, projectId) {
		  const project = pcProjectById(projects, projectId);
		  return project ? project.name : projectId || "—";
		}

		/** 任务最近一次 run 摘要：优先 task.lastRun，否则从 runs 里按开始时间取最后一条。 */
		function pcTaskLastRun(task, runs) {
		  if (task && task.lastRun) return task.lastRun;
		  const list = (runs ?? []).filter((r) => r && String(r.taskId) === String(task?.id));
		  if (list.length === 0) return null;
		  return list.slice().sort((a, b) => (pcTimeMs(a.startedAt) ?? 0) - (pcTimeMs(b.startedAt) ?? 0)).at(-1) ?? null;
		}

		/** 任务会话 id：task.sessionId 优先，其次 lastRun.sessionId。 */
		function pcTaskSessionId(task) {
		  if (!task) return "";
		  if (typeof task.sessionId === "string" && task.sessionId !== "") return task.sessionId;
		  if (task.lastRun && typeof task.lastRun.sessionId === "string") return task.lastRun.sessionId;
		  return "";
		}

		/** 列内排序：待办按优先级降序，其余按最近更新降序。 */
		function pcSortColumn(column, tasks) {
		  const list = (tasks ?? []).slice();
		  if (column === "todo") {
		    list.sort((a, b) => {
		      const pa = pcNum(a.priority, 0);
		      const pb = pcNum(b.priority, 0);
		      if (pb !== pa) return pb - pa;
		      return (pcTimeMs(b.createdAt) ?? 0) - (pcTimeMs(a.createdAt) ?? 0);
		    });
		    return list;
		  }
		  if (column === "done") {
		    list.sort((a, b) => {
		      const ta = pcTimeMs(a.acceptance && a.acceptance.acceptedAt) ?? pcTimeMs(a.updatedAt) ?? 0;
		      const tb = pcTimeMs(b.acceptance && b.acceptance.acceptedAt) ?? pcTimeMs(b.updatedAt) ?? 0;
		      return tb - ta;
		    });
		    return list;
		  }
		  list.sort((a, b) => (pcTimeMs(b.updatedAt) ?? pcTimeMs(b.createdAt) ?? 0) - (pcTimeMs(a.updatedAt) ?? pcTimeMs(a.createdAt) ?? 0));
		  return list;
		}

		/** 某项目 / 全部项目的任务集合。 */
		function pcTasksOf(state, projectId) {
		  const tasks = (state && Array.isArray(state.tasks) ? state.tasks : []).filter((t) => t && t.id !== undefined);
		  return projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
		}

		/** 待澄清 open 问题。 */
		function pcOpenQuestions(state, projectId) {
		  const list = (state && Array.isArray(state.questions) ? state.questions : []).filter(
		    (q) => q && q.status === "open",
		  );
		  return projectId ? list.filter((q) => q.projectId === projectId) : list;
		}

		/** 统计条计数（当前筛选范围）。 */
		function pcCountersOf(state, projectId) {
		  const tasks = pcTasksOf(state, projectId);
		  const count = (key) => tasks.filter((t) => pcColumnOf(t.status) === key).length;
		  return {
		    todo: count("todo"),
		    running: count("running"),
		    review: count("review"),
		    done: count("done"),
		    questions: pcOpenQuestions(state, projectId).length,
		    total: tasks.length,
		  };
		}

		/** 槽位汇总：优先 state.slots，回退按项目求和。 */
		function pcSlotStats(state) {
		  const slots = state && state.slots && typeof state.slots === "object" ? state.slots : null;
		  if (slots && pcNum(slots.globalSlotBudget, null) !== null) {
		    return { used: pcNum(slots.used, 0), budget: pcNum(slots.globalSlotBudget, 0) };
		  }
		  const projects = (state && Array.isArray(state.projects) ? state.projects : []).filter(
		    (p) => p && !p.archivedAt,
		  );
		  return {
		    used: projects.reduce((sum, p) => sum + pcNum(p.usedSlots, 0), 0),
		    budget: projects.reduce((sum, p) => sum + pcNum(p.slotBudget, 0), 0),
		  };
		}

		/** 磁盘汇总。 */
		function pcDiskStats(state) {
		  const disk = state && state.disk && typeof state.disk === "object" ? state.disk : null;
		  return {
		    used: pcNum(disk && disk.usedGB, 0),
		    budget: pcNum(disk && disk.globalBudgetGB, 0),
		  };
		}

		/** 验收中任务数（项目切换器里带在项目名后）。 */
		function pcReviewCountOf(state, projectId) {
		  return pcTasksOf(state, projectId).filter((t) => pcColumnOf(t.status) === "review").length;
		}

		/** 操作失败统一文案（CONTRACT.md §3 交互细节）。 */
		function pcFriendlyError(error) {
		  if (!error) return "操作失败";
		  const status = pcNum(error.status, null);
		  const code = error.code;
		  if (code === "slots") return "槽位已满，先等运行中的任务结束";
		  if (code === "deps") return error.message || "依赖任务还没合入 base，不能派发";
		  if (code === "not-found") return error.message || "目标不存在，可能已被删除";
		  if (code === "integration-failed") return error.message || "集成失败，展开批次报告看命令输出";
		  if (code === "confirm-required") return "推送到 main 需要显式确认";
		  if (status === 404 && !code) return "工程台宿主未就绪（端点 404），请稍后重试";
		  if (status === 403) return "请求被拒绝：缺少写请求挡板头，或来源校验未通过";
		  if (status === 409) return error.message || "状态冲突，请刷新后重试";
		  if (status === 400) return error.message || "参数不合法";
		  return error.message || "操作失败";
		}

		/**
		 * 打开宿主会话（uiWorkspace.openSession）。
		 * 返回 {ok:true} 或 {ok:false, reason:"service"|"open"|"no-session", message}，
		 * 由调用方决定 toast 文案：服务缺失和「会话已不存在」要分开说。
		 */
		function pcOpenSession(ctx, sessionId) {
		  if (!sessionId || !ctx) return { ok: false, reason: "no-session", message: "没有会话 id" };
		  let uiWorkspace;
		  try {
		    uiWorkspace = typeof ctx.get === "function" ? ctx.get("uiWorkspace") : undefined;
		  } catch (error) {
		    return { ok: false, reason: "service", message: error && error.message ? error.message : String(error) };
		  }
		  if (!uiWorkspace || typeof uiWorkspace.openSession !== "function") {
		    return { ok: false, reason: "service", message: "宿主没有提供 uiWorkspace 服务" };
		  }
		  try {
		    uiWorkspace.openSession(sessionId);
		    return { ok: true };
		  } catch (error) {
		    return { ok: false, reason: "open", message: error && error.message ? error.message : String(error) };
		  }
		}

		/** 取服务（惰性、带守卫）。 */
		function pcService(ctx, name) {
		  if (!ctx || typeof ctx.get !== "function") return undefined;
		  try {
		    return ctx.get(name);
		  } catch {
		    return undefined;
		  }
		}

		/** 纯函数 sleep（测试/定时用不到，保留给未来，避免未使用报错——挂到顶层无副作用）。 */
		function pcNoop() {}

		/* ───────────────────── 会话面板（GET /state.sessions） ───────────────────── */

		/** 会话状态元数据（host：running / idle / unknown）。 */
		const PC_SESSION_STATUS_META = {
		  running: { label: "运行中", tone: "busy" },
		  idle: { label: "空闲", tone: "online" },
		  unknown: { label: "未知", tone: "idle" },
		};

		function pcSessionStatusMeta(status) {
		  return PC_SESSION_STATUS_META[status] ?? PC_SESSION_STATUS_META.unknown;
		}

		/** /state.sessions 列表；host 没提供该字段时返回空数组（UI 走空状态）。 */
		function pcSessionList(state) {
		  const list = state && Array.isArray(state.sessions) ? state.sessions : [];
		  return list.filter((session) => session && typeof session === "object" && session.id);
		}

		/** 会话排序：lead 永远第一；任务会话运行中优先，其次 updatedAt 倒序。 */
		function pcSortSessions(sessions) {
		  const list = (sessions || []).slice();
		  const leadRank = (session) => (session.kind === "lead" ? 0 : 1);
		  list.sort((left, right) => {
		    const leftLead = leadRank(left);
		    const rightLead = leadRank(right);
		    if (leftLead !== rightLead) return leftLead - rightLead;
		    const leftRunning = left.status === "running" ? 0 : 1;
		    const rightRunning = right.status === "running" ? 0 : 1;
		    if (leftRunning !== rightRunning) return leftRunning - rightRunning;
		    const leftTime = pcTimeMs(left.updatedAt) ?? pcTimeMs(left.startedAt) ?? 0;
		    const rightTime = pcTimeMs(right.updatedAt) ?? pcTimeMs(right.startedAt) ?? 0;
		    return rightTime - leftTime;
		  });
		  return list;
		}

		/** 会话标题兜底。 */
		function pcSessionTitle(session) {
		  if (!session) return "会话";
		  if (session.title) return session.title;
		  if (session.kind === "lead") return "工程台会话";
		  if (session.taskId !== null && session.taskId !== undefined) return `任务 #${session.taskId}`;
		  return "未命名会话";
		}

		/** 会话行的时间文案：运行中给运行时长，空闲给最后更新时间。 */
		function pcSessionTimeText(session, nowMs) {
		  if (!session) return "";
		  const now = pcNum(nowMs, Date.now());
		  if (session.status === "running") {
		    const started = pcTimeMs(session.startedAt);
		    return started === null ? "运行中" : `运行 ${pcFmtDuration(now - started)}`;
		  }
		  if (session.status === "idle" && session.updatedAt) return `更新于 ${pcFmtRelative(session.updatedAt, now)}`;
		  if (session.updatedAt) return `更新于 ${pcFmtRelative(session.updatedAt, now)}`;
		  return "";
		}

		/* ───────────────────── lead 对话（/lead/transcript） ───────────────────── */

		/** lead 对话消息角色元数据（role: user | assistant | tool | system）。 */
		const PC_CHAT_ROLES = {
		  user: { label: "你", tone: "busy" },
		  assistant: { label: "工程台", tone: "success" },
		  tool: { label: "工具", tone: "idle" },
		  system: { label: "系统", tone: "muted" },
		};

		function pcChatRoleMeta(role) {
		  return PC_CHAT_ROLES[role] ?? { label: role || "消息", tone: "idle" };
		}

		/** 任务会话记录消息角色（与 lead 对话不同：user 表示原始需求）。 */
		const PC_TRANSCRIPT_ROLES = {
		  user: { label: "需求", tone: "busy" },
		  assistant: { label: "执行会话", tone: "success" },
		  tool: { label: "工具", tone: "idle" },
		  system: { label: "系统", tone: "muted" },
		};

		function pcTranscriptRoleMeta(role) {
		  return PC_TRANSCRIPT_ROLES[role] ?? { label: role || "消息", tone: "idle" };
		}

		/** run 状态元数据（/task/transcript 的 runs[].status）。 */
		const PC_RUN_STATUS_META = {
		  running: { label: "进行中", tone: "busy", dot: "busy" },
		  finished: { label: "已结束", tone: "success", dot: "online" },
		  failed: { label: "失败", tone: "danger", dot: "offline" },
		};

		function pcRunStatusMeta(status) {
		  return PC_RUN_STATUS_META[status] ?? { label: status || "未知", tone: "idle", dot: "idle" };
		}

		/** run 选择 chip 文案：`r6 · 已结束 · 自测 9/9`。 */
		function pcRunTabLabel(run) {
		  if (!run) return "run";
		  const meta = pcRunStatusMeta(run.status);
		  const parts = [String(run.runId ?? "run"), meta.label];
		  const selfTest = run.selfTest;
		  const total = selfTest ? pcNum(selfTest.total, 0) : 0;
		  if (total > 0) parts.push(`自测 ${pcNum(selfTest.passed, 0)}/${total}`);
		  return parts.join(" · ");
		}

		/** 当前 lead 会话 id（state.lead.sessionId 优先）。 */
		function pcLeadSessionId(state) {
		  if (!state) return "";
		  if (state.lead && typeof state.lead.sessionId === "string" && state.lead.sessionId !== "") return state.lead.sessionId;
		  if (state.settings && typeof state.settings.leadSessionId === "string" && state.settings.leadSessionId !== "") {
		    return state.settings.leadSessionId;
		  }
		  return "";
		}

		/* ───────────────────── 参考截图（attachments） ───────────────────── */

		/** 新建需求时允许的附件上限（与 host 契约一致）。 */
		const PC_ATTACHMENT_MAX = 6;
		const PC_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
		const PC_ATTACHMENT_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

		/** 字节数 → "184 KB" / "1.2 MB"。 */
		function pcFmtFileSize(bytes) {
		  const n = pcNum(bytes, null);
		  if (n === null || n < 0) return "—";
		  if (n < 1024) return `${n} B`;
		  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
		  return `${(n / 1024 / 1024).toFixed(1)} MB`;
		}

		/** 任务附件列表（过滤掉没有 path 的脏数据）。 */
		function pcTaskAttachments(task) {
		  if (!task || !Array.isArray(task.attachments)) return [];
		  return task.attachments.filter((attachment) => attachment && typeof attachment.path === "string" && attachment.path !== "");
		}

		/** 宿主 /file 端点 URL（img src 直接用）。 */
		function pcAttachmentUrl(attachment) {
		  const path = attachment && typeof attachment.path === "string" ? attachment.path : "";
		  return `${PC_API_BASE}/file?path=${encodeURIComponent(path)}`;
		}

		/** File → base64（不带 data: 前缀），用于 POST /upload。 */
		function pcFileToBase64(file) {
		  return new Promise((resolve, reject) => {
		    const reader = new FileReader();
		    reader.onerror = () => reject(new Error("读取图片失败"));
		    reader.onload = () => {
		      const result = String(reader.result || "");
		      const comma = result.indexOf(",");
		      resolve(comma >= 0 ? result.slice(comma + 1) : result);
		    };
		    reader.readAsDataURL(file);
		  });
		}

		/** 校验一张待上传图片：类型 / 大小。返回 {ok, reason}。 */
		function pcValidateAttachmentFile(file) {
		  const mime = String(file && file.type ? file.type : "").toLowerCase();
		  if (!PC_ATTACHMENT_MIMES.includes(mime)) return { ok: false, reason: `只支持 PNG / JPEG / WebP / GIF（${file && file.name ? file.name : "未知文件"}）` };
		  if (pcNum(file && file.size, 0) > PC_ATTACHMENT_MAX_BYTES) {
		    return { ok: false, reason: `图片超过 8MB：${file && file.name ? file.name : "未知文件"}` };
		  }
		  return { ok: true };
		}

		/* ───────────────────── 放弃 / 失败原因 ───────────────────── */

		/** 放弃原因分类（host task.abandonCategory），没有或未知一律归 other。 */
		const PC_ABANDON_CATEGORIES = {
		  provider: { label: "模型服务", tone: "danger" },
		  duplicate: { label: "重复任务", tone: "idle" },
		  interrupted: { label: "中断", tone: "warn" },
		  cancelled: { label: "操作员取消", tone: "muted" },
		  scope: { label: "范围调整", tone: "busy" },
		  other: { label: "其他", tone: "idle" },
		};

		function pcAbandonCategory(task) {
		  const raw = task && typeof task.abandonCategory === "string" ? task.abandonCategory : "";
		  const key = Object.prototype.hasOwnProperty.call(PC_ABANDON_CATEGORIES, raw) ? raw : "other";
		  return Object.assign({ key }, PC_ABANDON_CATEGORIES[key]);
		}

		/** 任务的「原因」全文：abandoned 用 abandonReason，failed 用 error。 */
		function pcTaskReasonText(task) {
		  if (!task) return "";
		  if (task.status === "abandoned") return task.abandonReason || "未填写放弃原因（可在详情里补充）";
		  if (task.status === "failed") return task.error || "运行失败，查看详情里的命令输出";
		  return "";
		}
		// ===== src/client/api.js =====
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
		// ===== src/client/css.js =====
		/**
		 * 工程台 client：全量样式（注入 <style data-plugin-css="dsh-project-console">）。
		 *
		 * 约定：
		 *   - 颜色/边框/文字色尽量走 DSH 主题别名（--dsw-alias-*），自带浅色回退值，
		 *     深色主题由宿主变量自动适配；需要混色的地方用 color-mix（官方 CSS 同款做法）。
		 *   - 布局尺寸为 1600×1000 验收调过：基础字号 12~14px，看板四列等分不横向溢出。
		 */

		const PC_CSS = `
		.pc-root {
		  --pc-mono: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
		  --pc-radius: 12px;
		  box-sizing: border-box;
		  display: flex;
		  flex-direction: column;
		  height: 100%;
		  min-height: 0;
		  min-width: 0;
		  width: 100%;
		  position: relative;
		  overflow: hidden;
		  color: var(--dsw-alias-label-primary, #0f1115);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  font-family: var(--dsw-font-family, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
		  font-size: 13px;
		  line-height: 1.45;
		  -webkit-font-smoothing: antialiased;
		}
		.pc-root * { box-sizing: border-box; }
		.pc-root ::-webkit-scrollbar { width: 8px; height: 8px; }
		.pc-root ::-webkit-scrollbar-thumb {
		  background: var(--dsw-alias-scrollbar-bg-l2, #cfd3d6);
		  border-radius: 4px;
		}
		.pc-root ::-webkit-scrollbar-track { background: transparent; }
		.pc-mono { font-family: var(--pc-mono); font-variant-numeric: tabular-nums; }
		.pc-dim { color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-faint { color: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-secondary { color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-num { font-family: var(--pc-mono); font-variant-numeric: tabular-nums; }
		.pc-warn-text { color: var(--dsw-alias-state-warn-label, #b45309); }
		.pc-err-text { color: var(--dsw-alias-state-error-primary, #dc2626); }
		.pc-ok-text { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 82%, var(--dsw-alias-label-primary, #0f1115)); }
		.pc-grow { flex: 1 1 auto; min-width: 0; }
		.pc-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
		.pc-stack { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
		.pc-divider { height: 1px; background: var(--dsw-alias-border-l1, #0000000a); margin: 2px 0; }
		.pc-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-note { font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-tertiary, #81858c); white-space: pre-wrap; word-break: break-word; }
		.pc-error-box {
		  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, transparent);
		  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, var(--dsw-alias-bg-base, #fff));
		  color: var(--dsw-alias-state-error-primary, #dc2626);
		  border-radius: 9px;
		  padding: 8px 10px;
		  font-size: 12px;
		  line-height: 1.5;
		  word-break: break-word;
		}

		/* ---------- 顶栏 ---------- */
		.pc-topbar {
		  flex: none;
		  display: flex;
		  align-items: center;
		  gap: 12px;
		  padding: 10px 20px;
		  border-bottom: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  min-width: 0;
		}
		.pc-brand { display: flex; align-items: center; gap: 9px; min-width: 0; flex: none; }
		.pc-brand-icon {
		  width: 28px; height: 28px;
		  border-radius: 9px;
		  display: grid; place-items: center;
		  color: #fff;
		  background: linear-gradient(140deg, var(--dsw-static-deepseek-450, #5686fe), var(--dsw-static-deepseek-600, #4868b2));
		  box-shadow: 0 1px 3px rgb(65 118 230 / 0.32);
		}
		.pc-brand-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
		.pc-brand-title { font-size: 15px; font-weight: 650; letter-spacing: 0.2px; line-height: 1.2; }
		.pc-brand-sub {
		  display: flex; align-items: center; gap: 5px;
		  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);
		  line-height: 1.2; white-space: nowrap;
		}
		.pc-topbar-spacer { flex: 1 1 auto; min-width: 12px; }
		.pc-topbar-actions { display: flex; align-items: center; gap: 8px; flex: none; }
		.pc-project-select {
		  height: 30px;
		  width: 196px;
		  max-width: 196px;
		  font-family: inherit;
		  font-size: 12px;
		  font-weight: 500;
		  color: var(--dsw-alias-label-primary, #0f1115);
		  background: var(--dsw-alias-bg-base, #fff);
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 8px;
		  padding: 0 26px 0 9px;
		  outline: none;
		  cursor: pointer;
		  appearance: none;
		  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381858c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9.5l6 6 6-6'/%3E%3C/svg%3E");
		  background-repeat: no-repeat;
		  background-position: right 8px center;
		}
		.pc-project-select:hover { border-color: var(--dsw-alias-border-l3, #0000001f); }
		.pc-project-select:focus { border-color: var(--dsw-alias-state-business-primary, #4176e6); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent); }
		.pc-icon-btn {
		  width: 28px; height: 28px;
		  display: grid; place-items: center;
		  border-radius: 7px;
		  border: 1px solid transparent;
		  background: transparent;
		  color: var(--dsw-alias-label-secondary, #61666b);
		  cursor: pointer;
		  padding: 0;
		  transition: background-color 0.12s, color 0.12s;
		}
		.pc-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }
		.pc-icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }
		.pc-icon-btn:focus-visible, .pc-btn:focus-visible, .pc-project-select:focus-visible,
		.pc-input:focus-visible, .pc-textarea:focus-visible, .pc-select:focus-visible {
		  outline: 2px solid var(--dsw-alias-state-business-primary, #4176e6);
		  outline-offset: 1px;
		}
		.pc-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary, #cfd3d6); flex: none; }
		.pc-dot--online { background: var(--dsw-alias-state-success-primary, #22c55e); }
		.pc-dot--offline { background: var(--dsw-alias-state-error-primary, #dc2626); }
		.pc-dot--busy { background: var(--dsw-alias-state-business-primary, #4176e6); }
		.pc-dot--warn { background: var(--dsw-alias-state-warn-primary, #f59e0b); }

		/* ---------- 统计条 ---------- */
		.pc-statbar {
		  flex: none;
		  display: flex;
		  align-items: center;
		  gap: 18px;
		  padding: 7px 20px;
		  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  background: var(--dsw-alias-bg-layer-1, #ffffff);
		  font-size: 12px;
		  min-width: 0;
		  overflow: hidden;
		}
		.pc-stat { display: flex; align-items: baseline; gap: 6px; min-width: 0; white-space: nowrap; }
		.pc-stat-label { color: var(--dsw-alias-label-tertiary, #81858c); font-size: 11.5px; }
		.pc-stat-value {
		  font-family: var(--pc-mono);
		  font-variant-numeric: tabular-nums;
		  font-weight: 600;
		  font-size: 13px;
		  color: var(--dsw-alias-label-primary, #0f1115);
		}
		.pc-stat-value--warn { color: var(--dsw-alias-state-warn-label, #b45309); }
		.pc-stat-value--busy { color: var(--dsw-alias-state-business-primary, #4176e6); }
		.pc-stat-value--ok { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 80%, var(--dsw-alias-label-primary, #0f1115)); }
		.pc-stat-sep { width: 1px; height: 14px; background: var(--dsw-alias-border-l2, #0000001a); flex: none; }
		.pc-stat--slots { gap: 7px; }
		.pc-slot-bar {
		  width: 74px; height: 5px; border-radius: 3px; flex: none;
		  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 8%, transparent);
		  overflow: hidden;
		  align-self: center;
		}
		.pc-slot-bar-fill { height: 100%; border-radius: 3px; background: var(--dsw-alias-state-business-primary, #4176e6); }
		.pc-slot-bar-fill--full { background: var(--dsw-alias-state-error-primary, #dc2626); }
		.pc-statbar-right { margin-left: auto; display: flex; align-items: center; gap: 14px; flex: none; }
		.pc-lead-state { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }

		/* ---------- 待澄清区 ---------- */
		.pc-questions {
		  flex: none;
		  margin: 12px 20px 0;
		  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 36%, transparent);
		  border-radius: var(--pc-radius);
		  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 6%, var(--dsw-alias-bg-base, #fff));
		  overflow: hidden;
		}
		.pc-questions-head {
		  display: flex; align-items: center; gap: 8px;
		  padding: 8px 14px;
		  font-size: 12px; font-weight: 600;
		  color: var(--dsw-alias-state-warn-label, #b45309);
		}
		.pc-questions-head .pc-badge { margin-left: 2px; }
		.pc-questions-list {
		  display: grid;
		  grid-template-columns: minmax(0, 1fr);
		  gap: 8px;
		  padding: 0 12px 11px;
		  max-height: 300px;
		  overflow-y: auto;
		}
		.pc-questions-list--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.pc-questions-list--two .pc-question:last-child:nth-child(odd) { grid-column: 1 / -1; }
		.pc-question {
		  display: flex; flex-direction: column; gap: 6px;
		  padding: 9px 11px 10px;
		  border-radius: 10px;
		  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 26%, transparent);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  min-width: 0;
		}
		.pc-question-top { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); min-width: 0; }
		.pc-question-text { font-size: 12.5px; font-weight: 600; line-height: 1.45; color: var(--dsw-alias-label-primary, #0f1115); word-break: break-word; }
		.pc-question-context {
		  font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary, #61666b);
		  white-space: pre-wrap; word-break: break-word;
		  max-height: 34px; overflow: hidden;
		}
		.pc-question-reply { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 1px; }
		.pc-question-options { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
		.pc-option-btn {
		  font-family: inherit; font-size: 11px; line-height: 1;
		  height: 23px; padding: 0 9px;
		  border-radius: 999px;
		  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 40%, transparent);
		  background: var(--dsw-alias-bg-base, #fff);
		  color: var(--dsw-alias-label-secondary, #61666b);
		  cursor: pointer;
		  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
		  white-space: nowrap;
		}
		.pc-option-btn:hover { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 10%, var(--dsw-alias-bg-base, #fff)); }
		.pc-option-btn.is-selected {
		  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 16%, var(--dsw-alias-bg-base, #fff));
		  border-color: var(--dsw-alias-state-warn-label, #b45309);
		  color: var(--dsw-alias-state-warn-label, #b45309);
		  font-weight: 600;
		}
		.pc-question-input { flex: 1 1 170px; min-width: 140px; }
		.pc-question-input .pc-input { height: 28px; font-size: 12px; }

		/* ---------- 看板 ---------- */
		.pc-board {
		  flex: 1 1 auto;
		  min-height: 0;
		  display: grid;
		  grid-template-columns: repeat(4, minmax(0, 1fr));
		  gap: 12px;
		  padding: 12px 20px 16px;
		}
		.pc-col {
		  min-width: 0; min-height: 0;
		  display: flex; flex-direction: column;
		  border-radius: var(--pc-radius);
		  border: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  background: #f6f7f9;
		  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 42%, transparent);
		  overflow: hidden;
		}
		.pc-col-head {
		  flex: none;
		  display: flex; align-items: center; gap: 7px;
		  padding: 9px 12px;
		  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  min-width: 0;
		}
		.pc-col-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-col-dot--idle { background: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-col-dot--busy { background: var(--dsw-alias-state-business-primary, #4176e6); }
		.pc-col-dot--warn { background: var(--dsw-alias-state-warn-primary, #f59e0b); }
		.pc-col-dot--success { background: var(--dsw-alias-state-success-primary, #22c55e); }
		.pc-col-title { font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; }
		.pc-col-count {
		  font-family: var(--pc-mono); font-size: 10.5px; line-height: 17px; font-weight: 600;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 6%, transparent);
		  border-radius: 999px; padding: 0 7px; white-space: nowrap;
		}
		.pc-col-hint { margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-caption, #adb2b8); white-space: nowrap; }
		.pc-col-head { flex-wrap: wrap; row-gap: 1px; }
		.pc-col-sub {
		  flex: 1 0 100%;
		  font-size: 10px; line-height: 1.4;
		  color: var(--dsw-alias-label-caption, #adb2b8);
		  white-space: normal; word-break: break-word;
		}
		.pc-col-sub--verifying { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 78%, var(--dsw-alias-label-primary, #0f1115)); }
		.pc-col-body {
		  flex: 1 1 auto; min-height: 0;
		  display: flex; flex-direction: column; gap: 8px;
		  padding: 8px;
		  overflow-y: auto;
		}
		.pc-empty-col {
		  margin: 6px 2px; padding: 18px 10px;
		  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 9px;
		  text-align: center;
		  font-size: 11.5px;
		  color: var(--dsw-alias-label-caption, #adb2b8);
		}

		/* ---------- 任务卡片 ---------- */
		.pc-card {
		  flex: none;
		  display: flex; flex-direction: column; gap: 7px;
		  padding: 9px 10px;
		  border-radius: 10px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  box-shadow: 0 1px 2px rgb(15 17 21 / 0.04);
		  cursor: pointer;
		  transition: border-color 0.12s, box-shadow 0.12s;
		  min-width: 0;
		}
		.pc-card:hover {
		  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 38%, var(--dsw-alias-border-l2, #0000001a));
		  box-shadow: 0 2px 8px rgb(15 17 21 / 0.07);
		}
		.pc-card--done { opacity: 0.82; background: var(--dsw-alias-bg-base, #fff); }
		.pc-card--done:hover { opacity: 1; }
		.pc-card--failed { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, var(--dsw-alias-border-l2, #0000001a)); }
		.pc-card-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
		.pc-card-id { font-family: var(--pc-mono); font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-tertiary, #81858c); flex: none; }
		.pc-card-top .pc-badge { flex: none; }
		.pc-card-prio { margin-left: auto; font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8); flex: none; }
		.pc-card-title {
		  font-size: 13px; font-weight: 600; line-height: 1.42;
		  color: var(--dsw-alias-label-primary, #0f1115);
		  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
		  overflow: hidden; word-break: break-word;
		}
		.pc-card-sub {
		  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
		  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);
		  min-width: 0;
		}
		.pc-card-project { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
		.pc-card-branch {
		  font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8);
		  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		  max-width: 100%;
		}
		.pc-card-meta {
		  display: flex; align-items: center; gap: 5px 7px; flex-wrap: wrap;
		  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);
		}
		.pc-metric {
		  display: inline-flex; align-items: center; gap: 3px;
		  font-family: var(--pc-mono); font-size: 10.5px;
		  color: var(--dsw-alias-label-secondary, #61666b);
		  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 5%, transparent);
		  border-radius: 5px; padding: 0 5px; line-height: 17px;
		  white-space: nowrap;
		}
		.pc-metric--ok { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 10%, transparent); }
		.pc-metric--err { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }
		.pc-diff-add { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 80%, var(--dsw-alias-label-primary, #0f1115)); }
		.pc-diff-del { color: var(--dsw-alias-state-error-primary, #dc2626); }
		.pc-card-event {
		  display: flex; align-items: center; gap: 5px;
		  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);
		  min-width: 0;
		}
		.pc-card-event-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
		.pc-card-reason {
		  display: -webkit-box;
		  -webkit-line-clamp: 2;
		  -webkit-box-orient: vertical;
		  overflow: hidden;
		  word-break: break-word;
		  max-width: 100%;
		}
		.pc-card-warn {
		  display: flex; align-items: flex-start; gap: 5px;
		  font-size: 10.5px; line-height: 1.45;
		  color: var(--dsw-alias-state-warn-label, #b45309);
		  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 9%, transparent);
		  border-radius: 6px; padding: 4px 6px;
		  word-break: break-word;
		}
		.pc-card-err {
		  display: flex; align-items: flex-start; gap: 5px;
		  font-size: 10.5px; line-height: 1.45;
		  color: var(--dsw-alias-state-error-primary, #dc2626);
		  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent);
		  border-radius: 6px; padding: 4px 6px;
		  word-break: break-word;
		  max-height: 46px; overflow: hidden;
		}
		.pc-card-actions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 1px; }
		.pc-card-actions .pc-btn { height: 23px; padding: 0 7px; font-size: 11px; border-radius: 6px; }
		.pc-card-actions .pc-btn--icon { width: 23px; padding: 0; }
		.pc-card-prio-btns { display: flex; gap: 3px; margin-left: auto; }
		.pc-card-prio-btns .pc-btn {
		  width: 21px; height: 21px; padding: 0; border-radius: 5px;
		  border-color: var(--dsw-alias-border-l2, #0000001a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  color: var(--dsw-alias-label-tertiary, #81858c);
		}
		.pc-card-prio-btns .pc-btn:hover:not(:disabled) { color: var(--dsw-alias-label-primary, #0f1115); }

		/* ---------- 按钮 ---------- */
		.pc-btn {
		  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
		  font-family: inherit; font-size: 12px; font-weight: 500; line-height: 1;
		  height: 27px; padding: 0 10px;
		  border-radius: 7px;
		  border: 1px solid transparent;
		  background: transparent;
		  color: var(--dsw-alias-label-primary, #0f1115);
		  white-space: nowrap;
		  cursor: pointer;
		  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
		  flex: none;
		}
		.pc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
		.pc-btn--sm { height: 25px; padding: 0 9px; font-size: 11.5px; border-radius: 6px; }
		.pc-btn--md { height: 30px; padding: 0 13px; font-size: 12.5px; border-radius: 8px; }
		.pc-btn--primary {
		  background: var(--dsw-alias-button-primary-fill, #0f1115);
		  color: var(--dsw-alias-label-primary-foreground, #ffffff);
		}
		.pc-btn--primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #43454a); }
		.pc-btn--secondary {
		  border-color: var(--dsw-alias-border-l2, #0000001a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  color: var(--dsw-alias-label-secondary, #61666b);
		}
		.pc-btn--secondary:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }
		.pc-btn--ghost { color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-btn--ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #2631480f); color: var(--dsw-alias-label-primary, #0f1115); }
		.pc-btn--danger {
		  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 32%, transparent);
		  color: var(--dsw-alias-state-error-primary, #dc2626);
		  background: transparent;
		}
		.pc-btn--danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }
		.pc-btn--success {
		  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 34%, transparent);
		  color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115));
		  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 8%, transparent);
		}
		.pc-btn--success:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 14%, transparent); }
		.pc-btn--icon { width: 27px; height: 27px; padding: 0; }
		.pc-btn--block { width: 100%; }
		.pc-btn-label { overflow: hidden; text-overflow: ellipsis; }
		.pc-spinner { animation: pc-spin 0.9s linear infinite; }
		@keyframes pc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

		/* ---------- 徽标 / 标签 ---------- */
		.pc-badge {
		  display: inline-flex; align-items: center; gap: 3px;
		  height: 18px; padding: 0 6px;
		  border-radius: 5px;
		  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;
		  white-space: nowrap;
		}
		.pc-badge--idle { color: var(--dsw-alias-label-secondary, #61666b); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #61666b) 11%, transparent); }
		.pc-badge--muted { color: var(--dsw-alias-label-caption, #adb2b8); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #61666b) 7%, transparent); }
		.pc-badge--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 11%, transparent); }
		.pc-badge--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 15%, transparent); }
		.pc-badge--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 11%, transparent); }
		.pc-badge--success { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 12%, transparent); }
		.pc-badge--done { color: var(--dsw-alias-state-done-primary, #7c3aed); background: color-mix(in srgb, var(--dsw-alias-state-done-primary, #7c3aed) 12%, transparent); }
		.pc-chip {
		  display: inline-flex; align-items: center; gap: 3px;
		  height: 18px; padding: 0 6px;
		  border-radius: 5px;
		  font-size: 10.5px;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 5%, transparent);
		  white-space: nowrap;
		  max-width: 100%;
		  overflow: hidden;
		  text-overflow: ellipsis;
		}
		.pc-chip--mono { font-family: var(--pc-mono); }
		.pc-chip--clickable { cursor: pointer; border: 0; font-family: inherit; }
		.pc-chip--clickable:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 9%, transparent); }
		.pc-chip--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, transparent); }
		.pc-chip--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }

		/* ---------- 抽屉 ---------- */
		.pc-drawer-mask {
		  position: absolute; inset: 0;
		  z-index: 40;
		  background: rgb(15 17 21 / 0.2);
		  display: flex; justify-content: flex-end;
		}
		.pc-drawer {
		  width: 520px; max-width: 94%;
		  height: 100%;
		  display: flex; flex-direction: column;
		  min-height: 0;
		  background: var(--dsw-alias-bg-base, #ffffff);
		  border-left: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  box-shadow: -14px 0 36px rgb(15 17 21 / 0.12);
		}
		.pc-drawer--wide { width: 640px; }
		.pc-drawer-head {
		  flex: none;
		  display: flex; align-items: flex-start; gap: 10px;
		  padding: 14px 18px 11px;
		  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);
		}
		.pc-drawer-head-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
		.pc-drawer-eyebrow { display: flex; align-items: center; gap: 8px; min-width: 0; }
		.pc-drawer-title { font-size: 14.5px; font-weight: 650; line-height: 1.35; word-break: break-word; }
		.pc-drawer-sub { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); flex-wrap: wrap; }
		.pc-drawer-actions {
		  flex: none;
		  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
		  padding: 9px 18px;
		  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  background: var(--dsw-alias-bg-layer-1, #ffffff);
		}
		.pc-drawer-body {
		  flex: 1 1 auto; min-height: 0;
		  overflow-y: auto;
		  padding: 14px 18px 24px;
		  display: flex; flex-direction: column; gap: 16px;
		}
		.pc-section { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
		.pc-section-title {
		  display: flex; align-items: center; gap: 6px;
		  font-size: 10.5px; font-weight: 650; letter-spacing: 0.7px;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  text-transform: uppercase;
		}
		.pc-section-title-right { margin-left: auto; font-weight: 500; letter-spacing: 0; text-transform: none; font-size: 10.5px; }
		.pc-kv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 16px; }
		.pc-kv { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
		.pc-kv-label { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-kv-value { font-size: 12px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-word; }
		.pc-kv-value--mono { font-family: var(--pc-mono); font-size: 11px; word-break: break-all; }
		.pc-pre {
		  margin: 0;
		  max-height: 220px; overflow: auto;
		  padding: 9px 11px;
		  border-radius: 9px;
		  border: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 32%, transparent);
		  font-family: var(--pc-mono);
		  font-size: 11px;
		  line-height: 1.55;
		  color: var(--dsw-alias-label-secondary, #61666b);
		  white-space: pre-wrap;
		  word-break: break-word;
		}
		.pc-pre--brief { font-family: inherit; font-size: 12.5px; line-height: 1.62; color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-list li { line-height: 1.5; word-break: break-word; }
		.pc-list--plain { list-style: none; padding-left: 0; }
		.pc-details { border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 8px; background: var(--dsw-alias-bg-base, #fff); overflow: hidden; }
		.pc-details-summary {
		  cursor: pointer; padding: 6px 9px;
		  font-size: 11px; color: var(--dsw-alias-link, #4176e6);
		  list-style: none;
		  display: flex; align-items: center; gap: 5px;
		  user-select: none;
		}
		.pc-details-summary::-webkit-details-marker { display: none; }
		.pc-details-summary::before { content: "▸"; font-size: 9px; opacity: 0.8; }
		.pc-details[open] > .pc-details-summary::before { content: "▾"; }
		.pc-details-summary:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }
		.pc-details-body { padding: 0 9px 9px; }
		.pc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
		.pc-table th {
		  text-align: left; padding: 4px 6px;
		  font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  border-bottom: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  white-space: nowrap;
		}
		.pc-table td { padding: 5px 6px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); vertical-align: top; }
		.pc-table tr:last-child td { border-bottom: 0; }
		.pc-table-command { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-word; }
		.pc-tail { margin: 3px 0 0; max-height: 150px; overflow: auto; font-family: var(--pc-mono); font-size: 10.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-run {
		  display: flex; flex-direction: column; gap: 7px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 9px;
		  padding: 9px 11px;
		  background: var(--dsw-alias-bg-base, #ffffff);
		}
		.pc-run-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-run-id { font-family: var(--pc-mono); font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-run-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 10px; }
		.pc-event-list { display: flex; flex-direction: column; max-height: 260px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 8px; }
		.pc-event { display: flex; align-items: baseline; gap: 8px; padding: 4px 8px; font-size: 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); }
		.pc-event:last-child { border-bottom: 0; }
		.pc-event-time { font-family: var(--pc-mono); font-size: 10px; color: var(--dsw-alias-label-caption, #adb2b8); flex: none; width: 56px; }
		.pc-event-type { font-family: var(--pc-mono); font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #81858c); flex: none; width: 84px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-event-brief { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-secondary, #61666b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

		/* ---------- 弹窗 / 表单 ---------- */
		.pc-modal-mask {
		  position: absolute; inset: 0;
		  z-index: 60;
		  background: var(--dsw-alias-bg-mask-1, #0000003d);
		  display: grid; place-items: center;
		  padding: 24px;
		}
		.pc-modal {
		  width: min(560px, 100%);
		  max-height: 88%;
		  display: flex; flex-direction: column;
		  min-height: 0;
		  border-radius: 14px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  box-shadow: 0 20px 52px rgb(15 17 21 / 0.2);
		  overflow: hidden;
		}
		.pc-modal-head { flex: none; display: flex; align-items: flex-start; gap: 10px; padding: 15px 18px 11px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); }
		.pc-modal-head-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
		.pc-modal-title { font-size: 14.5px; font-weight: 650; }
		.pc-modal-subtitle { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #81858c); line-height: 1.5; }
		.pc-modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 12px; }
		.pc-modal-foot { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 11px 18px; border-top: 1px solid var(--dsw-alias-border-l1, #0000000a); background: var(--dsw-alias-bg-layer-1, #ffffff); }
		.pc-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
		.pc-field-label { display: flex; align-items: baseline; gap: 3px; font-size: 11.5px; font-weight: 550; color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-field-required { color: var(--dsw-alias-state-error-primary, #dc2626); }
		.pc-field-right { margin-left: auto; font-weight: 400; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-field-hint { font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-input, .pc-textarea, .pc-select {
		  width: 100%;
		  font-family: inherit;
		  font-size: 12.5px;
		  color: var(--dsw-alias-label-primary, #0f1115);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 8px;
		  padding: 6px 9px;
		  outline: none;
		  transition: border-color 0.12s, box-shadow 0.12s;
		}
		.pc-input { height: 31px; }
		.pc-select { height: 31px; cursor: pointer; padding-right: 24px; appearance: none;
		  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381858c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9.5l6 6 6-6'/%3E%3C/svg%3E");
		  background-repeat: no-repeat; background-position: right 8px center; }
		.pc-textarea { min-height: 84px; resize: vertical; line-height: 1.55; }
		.pc-input:focus, .pc-textarea:focus, .pc-select:focus {
		  border-color: var(--dsw-alias-state-business-primary, #4176e6);
		  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 16%, transparent);
		}
		.pc-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
		.pc-form-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.pc-workload-note {
		  display: flex; align-items: flex-start; gap: 6px;
		  padding: 7px 9px;
		  border-radius: 8px;
		  font-size: 11.5px; line-height: 1.5;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 6%, transparent);
		}
		.pc-workload-note > svg { margin-top: 2px; color: var(--dsw-alias-state-business-primary, #4176e6); }
		.pc-settings-tier {
		  display: flex; flex-direction: column; gap: 8px;
		  padding: 10px 12px;
		  border: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  border-radius: 10px;
		  background: var(--dsw-alias-bg-layer-1, #ffffff);
		}
		.pc-settings-tier-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
		.pc-settings-tier-name { font-size: 12.5px; font-weight: 620; }
		.pc-settings-tier-sizes { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-settings-grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 10px; }
		.pc-settings-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
		.pc-settings-route { display: flex; gap: 6px; }
		.pc-settings-section { display: flex; flex-direction: column; gap: 8px; }
		.pc-settings-slot-row { display: grid; grid-template-columns: minmax(0, 132px) 96px minmax(0, 1fr); align-items: center; gap: 10px; }
		.pc-settings-projects { display: flex; flex-direction: column; gap: 7px; padding: 9px 11px; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 10px; }
		.pc-settings-project-head { font-size: 11.5px; font-weight: 550; color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-settings-project { display: grid; grid-template-columns: minmax(0, 1fr) 96px 74px; align-items: center; gap: 10px; }
		.pc-settings-project-name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-settings-project-used { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }

		/* ---------- 项目管理弹窗 ---------- */
		.pc-projects-section { display: flex; flex-direction: column; gap: 8px; }
		.pc-projects-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1, #0000000a); border-radius: 10px; }
		.pc-projects-row {
		  display: flex; align-items: center; gap: 12px;
		  padding: 10px 12px;
		  border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  background: var(--dsw-alias-bg-layer-1, #ffffff);
		}
		.pc-projects-row:first-child { border-radius: 9px 9px 0 0; }
		.pc-projects-row:last-child { border-bottom: 0; border-radius: 0 0 9px 9px; }
		.pc-projects-row:only-child { border-radius: 9px; }
		.pc-projects-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
		.pc-projects-policy { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
		.pc-projects-policy .pc-field-label { white-space: nowrap; }
		.pc-projects-policy select { min-width: 132px; }
		.pc-projects-name-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
		.pc-projects-name { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-projects-repo { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-projects-meta { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-check { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dsw-alias-label-secondary, #61666b); cursor: pointer; user-select: none; }
		.pc-check input { width: 13px; height: 13px; accent-color: var(--dsw-alias-state-business-primary, #4176e6); cursor: pointer; margin: 0; }

		/* ---------- 空状态 ---------- */
		.pc-empty {
		  flex: 1 1 auto; min-height: 0;
		  display: flex; flex-direction: column; align-items: center; justify-content: center;
		  gap: 10px;
		  padding: 32px 24px;
		  text-align: center;
		}
		.pc-empty-icon {
		  width: 54px; height: 54px; border-radius: 16px;
		  display: grid; place-items: center;
		  color: var(--dsw-alias-state-business-primary, #4176e6);
		  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent);
		}
		.pc-empty-icon--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 12%, transparent); }
		.pc-empty-icon--danger { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent); }
		.pc-empty-title { font-size: 16px; font-weight: 650; letter-spacing: 0.2px; }
		.pc-empty-desc { max-width: 560px; font-size: 12.5px; line-height: 1.65; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-empty-extra { margin-top: 2px; width: min(620px, 100%); display: flex; flex-direction: column; align-items: center; gap: 10px; }
		.pc-empty-extra .pc-error-box { width: 100%; text-align: left; }
		.pc-empty-card {
		  width: min(600px, 100%);
		  display: flex; flex-direction: column; gap: 12px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 14px;
		  background: var(--dsw-alias-bg-base, #ffffff);
		  box-shadow: 0 10px 28px rgb(15 17 21 / 0.06);
		  padding: 16px 18px;
		  text-align: left;
		}
		.pc-empty-card-title { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }
		.pc-empty-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
		.pc-empty .pc-error-box { text-align: left; max-width: 620px; width: 100%; }

		/* ---------- 集成与合并 ---------- */
		.pc-banner {
		  display: flex; align-items: flex-start; gap: 7px;
		  padding: 8px 11px;
		  border-radius: 9px;
		  font-size: 11.5px; line-height: 1.55;
		}
		.pc-banner--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 9%, transparent); }
		.pc-banner--warn { color: var(--dsw-alias-state-warn-label, #b45309); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 9%, transparent); }
		.pc-banner--err { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent); }
		.pc-integrate-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l2, #0000001a); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, #ffffff); }
		.pc-integrate-bar .pc-btn { margin-left: auto; }
		.pc-select-list { display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l2, #0000001a); border-radius: 10px; overflow: hidden; }
		.pc-check-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 11.5px; border-bottom: 1px solid var(--dsw-alias-border-l1, #0000000a); cursor: pointer; }
		.pc-check-row:last-child { border-bottom: 0; }
		.pc-check-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }
		.pc-check-row .pc-badge { flex: none; }
		.pc-check-row-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-batch {
		  display: flex; flex-direction: column; gap: 8px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 10px;
		  padding: 10px 12px;
		  background: var(--dsw-alias-bg-base, #ffffff);
		}
		.pc-batch-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
		.pc-batch-id { font-family: var(--pc-mono); font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-batch-title { font-size: 12px; font-weight: 600; }
		.pc-batch-meta { display: flex; align-items: center; gap: 6px 10px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-batch-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
		.pc-confirm {
		  display: flex; flex-direction: column; gap: 8px;
		  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 42%, transparent);
		  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 8%, transparent);
		  border-radius: 9px;
		  padding: 9px 11px;
		  font-size: 11.5px;
		  color: var(--dsw-alias-label-secondary, #61666b);
		}
		.pc-confirm-text { display: flex; flex-direction: column; gap: 4px; line-height: 1.55; }
		.pc-confirm-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
		.pc-ref { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-secondary, #61666b); word-break: break-all; }

		/* ---------- Toast ---------- */
		.pc-toasts {
		  position: absolute;
		  top: 14px; left: 50%;
		  transform: translateX(-50%);
		  z-index: 90;
		  display: flex; flex-direction: column; align-items: center; gap: 8px;
		  pointer-events: none;
		  max-width: 92%;
		}
		.pc-toast {
		  pointer-events: auto;
		  display: flex; align-items: center; gap: 8px;
		  min-width: 200px; max-width: 560px;
		  padding: 8px 10px 8px 12px;
		  border-radius: 9px;
		  font-size: 12px; line-height: 1.45;
		  color: var(--dsw-alias-toast-label, #ffffff);
		  background: var(--dsw-alias-toast-bg, #353638);
		  box-shadow: 0 10px 26px rgb(0 0 0 / 0.2);
		}
		.pc-toast--success { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, #0b1220); }
		.pc-toast--error { background: var(--dsw-alias-state-error-primary, #dc2626); }
		.pc-toast-text { flex: 1 1 auto; min-width: 0; word-break: break-word; }
		.pc-toast-close {
		  flex: none;
		  display: grid; place-items: center;
		  width: 20px; height: 20px;
		  border: 0; border-radius: 5px;
		  background: transparent;
		  color: inherit; opacity: 0.7;
		  cursor: pointer;
		  padding: 0;
		}
		.pc-toast-close:hover { opacity: 1; background: rgb(255 255 255 / 0.12); }

		/* ---------- 顶栏按钮内计数 badge ---------- */
		.pc-btn-count {
		  display: inline-flex; align-items: center; justify-content: center;
		  min-width: 16px; height: 15px; padding: 0 4px;
		  border-radius: 999px;
		  font-family: var(--pc-mono);
		  font-size: 9.5px; font-weight: 700; line-height: 1;
		  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));
		  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 15%, transparent);
		}

		/* ---------- 放弃 / 失败原因块 ---------- */
		.pc-reason {
		  display: flex; flex-direction: column; gap: 4px;
		  border-radius: 8px;
		  padding: 6px 8px 7px;
		  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent);
		  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 7%, transparent);
		}
		.pc-reason--failed,
		.pc-reason--provider {
		  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 32%, transparent);
		  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 7%, transparent);
		}
		.pc-reason-head { display: flex; align-items: center; gap: 5px; min-width: 0; }
		.pc-reason-label { font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); white-space: nowrap; }
		.pc-reason-spacer { flex: 1 1 auto; min-width: 4px; }
		.pc-reason .pc-btn { height: 21px; padding: 0 7px; font-size: 10.5px; border-radius: 5px; }
		.pc-reason-text {
		  font-size: 11px; line-height: 1.5;
		  color: var(--dsw-alias-label-secondary, #61666b);
		  white-space: pre-wrap; word-break: break-word;
		}
		.pc-reason-text--clamp {
		  display: -webkit-box;
		  -webkit-line-clamp: 4;
		  -webkit-box-orient: vertical;
		  overflow: hidden;
		}
		.pc-card--abandoned { opacity: 0.94; background: var(--dsw-alias-bg-base, #fff); }
		.pc-card--abandoned:hover { opacity: 1; }

		/* ---------- 会话面板 ---------- */
		.pc-session-list { display: flex; flex-direction: column; gap: 8px; }
		.pc-session-row {
		  display: flex; flex-direction: column; gap: 5px;
		  min-width: 0;
		  padding: 9px 11px 8px;
		  border-radius: 10px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		}
		.pc-session-row.is-highlight {
		  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 62%, var(--dsw-alias-border-l2, #0000001a));
		  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 16%, transparent);
		}
		.pc-session-top { display: flex; align-items: center; gap: 7px; min-width: 0; }
		.pc-session-title {
		  flex: 1 1 auto; min-width: 0;
		  font-size: 12.5px; font-weight: 600;
		  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		}
		.pc-session-state {
		  flex: none;
		  display: flex; align-items: center; gap: 5px;
		  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);
		  white-space: nowrap;
		}
		.pc-session-time { font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-session-meta {
		  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
		  font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c);
		}
		.pc-session-event {
		  display: flex; align-items: center; gap: 5px;
		  min-width: 0;
		  padding: 4px 7px;
		  border-radius: 6px;
		  font-size: 11px;
		  color: var(--dsw-alias-label-secondary, #61666b);
		  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 30%, transparent);
		}
		.pc-session-event-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-session-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
		.pc-panel-empty {
		  display: flex; flex-direction: column; align-items: center; gap: 9px;
		  padding: 30px 18px;
		  text-align: center;
		  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 12px;
		}
		.pc-events-section { scroll-margin-top: 8px; }

		/* ---------- 参考截图（详情抽屉 / 新建需求） ---------- */
		.pc-att-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
		.pc-att {
		  display: flex; flex-direction: column; gap: 3px;
		  min-width: 0;
		  color: inherit; text-decoration: none;
		  border-radius: 8px;
		}
		.pc-att:hover .pc-att-img { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 45%, var(--dsw-alias-border-l2, #0000001a)); }
		.pc-att-img {
		  display: block;
		  width: 100%; height: 96px;
		  object-fit: cover;
		  border-radius: 8px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 32%, transparent);
		  transition: border-color 0.12s;
		}
		.pc-att-caption { display: flex; align-items: baseline; gap: 6px; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-att-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-att-size { flex: none; font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-att-fallback {
		  height: 96px;
		  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
		  padding: 6px;
		  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 8px;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  text-align: center; overflow: hidden;
		}
		.pc-att-fallback-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; font-weight: 600; color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-att-fallback-path { max-width: 100%; overflow: hidden; font-family: var(--pc-mono); font-size: 9px; color: var(--dsw-alias-label-caption, #adb2b8); word-break: break-all; max-height: 24px; }

		.pc-attach-field {
		  display: flex; flex-direction: column; gap: 7px;
		  padding: 10px 12px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 10px;
		  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 20%, transparent);
		}
		.pc-attach-head { display: flex; align-items: center; gap: 8px; }
		.pc-attach-count { font-family: var(--pc-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-attach-head .pc-btn { margin-left: auto; }
		.pc-attach-hint { font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-attach-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
		.pc-attach-item {
		  position: relative;
		  display: flex; flex-direction: column; gap: 3px;
		  min-width: 0;
		  padding: 5px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 8px;
		  background: var(--dsw-alias-bg-base, #ffffff);
		}
		.pc-attach-img { display: block; width: 100%; height: 76px; object-fit: cover; border-radius: 6px; }
		.pc-attach-meta { display: flex; align-items: baseline; gap: 5px; min-width: 0; font-size: 10px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-attach-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.pc-attach-size { flex: none; font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-attach-remove {
		  position: absolute; top: 8px; right: 8px;
		  width: 20px; height: 20px;
		  display: grid; place-items: center;
		  padding: 0;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  border-radius: 50%;
		  background: var(--dsw-alias-bg-base, #ffffff);
		  color: var(--dsw-alias-label-secondary, #61666b);
		  cursor: pointer;
		  box-shadow: 0 1px 3px rgb(15 17 21 / 0.12);
		}
		.pc-attach-remove:hover { color: var(--dsw-alias-state-error-primary, #dc2626); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 34%, transparent); }
		.pc-attach-remove:disabled { opacity: 0.5; cursor: not-allowed; }

		/* ---------- 彻底删除 ---------- */
		.pc-card-del { width: 22px; height: 22px; color: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-card-del:hover { color: var(--dsw-alias-state-error-primary, #dc2626) !important; background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 10%, transparent) !important; }
		.pc-icon-btn--danger:hover { color: var(--dsw-alias-state-error-primary, #dc2626); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 10%, transparent); }

		/* ---------- 取消需求（次级危险按钮） ---------- */
		.pc-btn--cancel {
		  color: var(--dsw-alias-state-error-primary, #dc2626);
		  background: transparent;
		  border-color: transparent;
		}
		.pc-btn--cancel:hover:not(:disabled) {
		  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 8%, transparent);
		  color: var(--dsw-alias-state-error-primary, #dc2626);
		}
		.pc-card-actions .pc-btn--cancel { border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 26%, transparent); }

		/* ---------- 验收中（verifying：lead 先验收，人工可覆盖） ---------- */
		.pc-chip-verifying {
		  display: inline-flex; align-items: center; gap: 3px;
		  height: 18px; padding: 0 6px;
		  border-radius: 5px;
		  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 32%, transparent);
		  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;
		  white-space: nowrap;
		  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));
		  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent);
		}
		.pc-card-verifying {
		  display: flex; align-items: center; gap: 5px;
		  padding: 4px 7px;
		  border-radius: 6px;
		  font-size: 10.5px; line-height: 1.4;
		  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));
		  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent);
		}
		.pc-card--verifying {
		  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 34%, var(--dsw-alias-border-l2, #0000001a));
		}

		/* ---------- 工程台对话抽屉 ---------- */
		.pc-drawer--chat { width: 560px; }
		.pc-chat-body { padding: 0; gap: 0; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
		.pc-chat-list {
		  flex: 1 1 auto; min-height: 0;
		  overflow-y: auto;
		  display: flex; flex-direction: column; gap: 10px;
		  padding: 12px 16px;
		}
		.pc-chat-msg { display: flex; flex-direction: column; gap: 3px; max-width: 92%; min-width: 0; }
		.pc-chat-msg--user { align-self: flex-end; align-items: flex-end; max-width: 84%; }
		.pc-chat-msg--assistant { align-self: flex-start; }
		.pc-chat-msg--tool, .pc-chat-msg--system { align-self: stretch; max-width: 100%; }
		.pc-chat-msg-head { display: flex; align-items: center; gap: 6px; font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-chat-role { font-weight: 700; letter-spacing: 0.3px; }
		.pc-chat-role--busy { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115)); }
		.pc-chat-role--success { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 78%, var(--dsw-alias-label-primary, #0f1115)); }
		.pc-chat-role--idle { color: var(--dsw-alias-label-secondary, #61666b); }
		.pc-chat-role--muted { color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-chat-time { font-family: var(--pc-mono); color: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-chat-type {
		  max-width: 200px;
		  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		  padding: 0 4px; border-radius: 4px;
		  font-family: var(--pc-mono); font-size: 9px;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  background: color-mix(in srgb, var(--dsw-alias-label-primary, #0f1115) 6%, transparent);
		}
		.pc-chat-text {
		  padding: 7px 10px;
		  border-radius: 10px;
		  border: 1px solid transparent;
		  font-size: 12.5px; line-height: 1.62;
		  white-space: pre-wrap; word-break: break-word;
		  color: var(--dsw-alias-label-primary, #0f1115);
		}
		.pc-chat-msg--user .pc-chat-text {
		  background: var(--dsw-alias-button-primary-fill, #0f1115);
		  color: var(--dsw-alias-label-primary-foreground, #ffffff);
		  border-radius: 10px 10px 3px 10px;
		}
		.pc-chat-msg--assistant .pc-chat-text {
		  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 34%, transparent);
		  border-color: var(--dsw-alias-border-l1, #0000000a);
		  border-radius: 10px 10px 10px 3px;
		}
		.pc-chat-msg--tool .pc-chat-text {
		  padding: 4px 8px;
		  font-family: var(--pc-mono);
		  font-size: 10.5px;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #e9ecf2) 22%, transparent);
		  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);
		  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		}
		.pc-chat-msg--system .pc-chat-text {
		  font-size: 11px;
		  color: var(--dsw-alias-label-tertiary, #81858c);
		  background: transparent;
		  border: 1px dashed var(--dsw-alias-border-l2, #0000001a);
		}
		.pc-chat-composer {
		  flex: none;
		  display: flex; flex-direction: column; gap: 8px;
		  padding: 10px 16px 14px;
		  border-top: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		}
		.pc-chat-composer .pc-textarea { min-height: 64px; max-height: 170px; resize: vertical; }
		.pc-chat-composer-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
		.pc-chat-empty { border: 0; padding: 28px 16px; }

		/* ---------- 任务会话记录抽屉（只读，替代 native 会话） ---------- */
		.pc-drawer--transcript { width: 620px; }
		.pc-transcript-body {
		  padding: 10px 16px 14px;
		  gap: 8px;
		  display: flex; flex-direction: column;
		  min-height: 0;
		  overflow: hidden;
		}
		.pc-run-tabs { flex: none; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
		.pc-run-tab {
		  font-family: inherit;
		  font-size: 11px; line-height: 1;
		  height: 26px; padding: 0 10px;
		  border-radius: 999px;
		  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
		  background: var(--dsw-alias-bg-base, #ffffff);
		  color: var(--dsw-alias-label-secondary, #61666b);
		  cursor: pointer;
		  white-space: nowrap;
		  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
		}
		.pc-run-tab:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }
		.pc-run-tab.is-active {
		  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent);
		  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent);
		  color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 82%, var(--dsw-alias-label-primary, #0f1115));
		  font-weight: 600;
		}
		.pc-transcript-list {
		  flex: 1 1 auto; min-height: 0;
		  overflow-y: auto;
		  display: flex; flex-direction: column; gap: 9px;
		  padding: 2px 0 6px;
		}
		.pc-transcript-empty { border: 0; padding: 26px 16px; }

		/* 本次改动：文件清单（验收提交 / 最近一次运行） */
		.pc-change-meta { font-size: 10.5px; color: var(--dsw-alias-label-caption, #adb2b8); }
		.pc-change-hint { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #81858c); }
		.pc-change-list {
		  display: flex; flex-direction: column; min-width: 0;
		  border: 1px solid var(--dsw-alias-border-l1, #0000000a);
		  border-radius: 9px;
		  background: var(--dsw-alias-bg-base, #fff);
		  overflow: hidden;
		}
		.pc-change-row {
		  display: flex; align-items: center; gap: 8px;
		  padding: 5px 9px;
		  min-width: 0;
		  font-family: var(--pc-mono);
		  font-size: 11px;
		  line-height: 1.45;
		}
		.pc-change-row + .pc-change-row { border-top: 1px solid var(--dsw-alias-border-l1, #0000000a); }
		.pc-change-row:hover { background: var(--dsw-alias-interactive-bg-hover, #2631480f); }
		.pc-change-path {
		  flex: 1 1 auto; min-width: 0;
		  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		  color: var(--dsw-alias-label-secondary, #61666b);
		}
		.pc-change-stat { flex: none; display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }
		.pc-change-blank { color: var(--dsw-alias-label-caption, #adb2b8); font-size: 10px; }
		`;

		/** 注入样式（幂等；宿主 HMR 重载 client 时复用同一标签）。 */
		function pcEnsureStyles() {
		  if (typeof document === "undefined") return;
		  const tagId = "dsh-project-console/styles.css";
		  const existing = document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`);
		  if (existing !== null) {
		    if (existing.textContent !== PC_CSS) existing.textContent = PC_CSS;
		    return;
		  }
		  const tag = document.createElement("style");
		  tag.dataset.plugin = "dsh-project-console";
		  tag.dataset.pluginCss = tagId;
		  tag.textContent = PC_CSS;
		  document.head.appendChild(tag);
		}
		// ===== src/client/components.js =====
		/**
		 * 工程台 client：通用 UI 组件（纯 pcElement，无 JSX）。
		 */

		/** 内联 SVG 图标注册表：name → [["path", {d}], ["circle", {...}], ...]。 */
		const PC_ICON_PATHS = {
		  board: [
		    ["rect", { x: 3, y: 4, width: 7, height: 7, rx: 1.5 }],
		    ["rect", { x: 14, y: 4, width: 7, height: 7, rx: 1.5 }],
		    ["rect", { x: 3, y: 15, width: 7, height: 6, rx: 1.5 }],
		    ["path", { d: "M14.5 18.5l2 2 3.5-4" }],
		  ],
		  plus: [["path", { d: "M12 5v14M5 12h14" }]],
		  refresh: [
		    ["path", { d: "M20 11a8 8 0 1 0-2.4 6.7" }],
		    ["path", { d: "M20 4v7h-7" }],
		  ],
		  chat: [
		    ["path", { d: "M4 6.2A3.2 3.2 0 0 1 7.2 3h9.6A3.2 3.2 0 0 1 20 6.2v7.6a3.2 3.2 0 0 1-3.2 3.2H9.5L4 21z" }],
		  ],
		  close: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
		  chevronDown: [["path", { d: "M6 9.5l6 6 6-6" }]],
		  play: [["path", { d: "M8 5.2v13.6L19 12z" }]],
		  check: [["path", { d: "M4.5 12.5l5 5 10-11" }]],
		  undo: [
		    ["path", { d: "M9 14L4 9l5-5" }],
		    ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 0 11H11" }],
		  ],
		  trash: [
		    ["path", { d: "M4 7h16" }],
		    ["path", { d: "M9.5 7V4h5v3" }],
		    ["path", { d: "M6.5 7l1 13h9l1-13" }],
		  ],
		  list: [
		    ["path", { d: "M9 6h11M9 12h11M9 18h11" }],
		    ["path", { d: "M4 6h.01M4 12h.01M4 18h.01" }],
		  ],
		  external: [
		    ["path", { d: "M14 4h6v6" }],
		    ["path", { d: "M20 4l-9.5 9.5" }],
		    ["path", { d: "M18.5 14v5.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5V7a1.5 1.5 0 0 1 1.5-1.5H10" }],
		  ],
		  terminal: [
		    ["rect", { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2 }],
		    ["path", { d: "M7.5 9.5l2.5 2.5-2.5 2.5" }],
		    ["path", { d: "M13 14.5h4" }],
		  ],
		  layers: [
		    ["path", { d: "M12 3l9 5-9 5-9-5z" }],
		    ["path", { d: "M3 12.2l9 5 9-5" }],
		    ["path", { d: "M3 16.4l9 5 9-5" }],
		  ],
		  clock: [
		    ["circle", { cx: 12, cy: 12, r: 8.5 }],
		    ["path", { d: "M12 7.5V12l3.2 2" }],
		  ],
		  alert: [
		    ["path", { d: "M12 4.2l9.2 16.1H2.8z" }],
		    ["path", { d: "M12 10v4.4" }],
		    ["path", { d: "M12 17.4h.01" }],
		  ],
		  info: [
		    ["circle", { cx: 12, cy: 12, r: 8.5 }],
		    ["path", { d: "M12 11.2v5" }],
		    ["path", { d: "M12 8h.01" }],
		  ],
		  folder: [
		    ["path", { d: "M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6a2.5 2.5 0 0 1 2.5 2.5V17A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z" }],
		  ],
		  branch: [
		    ["circle", { cx: 6, cy: 6, r: 2.5 }],
		    ["circle", { cx: 6, cy: 18, r: 2.5 }],
		    ["circle", { cx: 18, cy: 9, r: 2.5 }],
		    ["path", { d: "M6 8.5v7" }],
		    ["path", { d: "M18 11.5V13a4 4 0 0 1-4 4H9" }],
		  ],
		  file: [
		    ["path", { d: "M6 3.5h7l5 5v12H6z" }],
		    ["path", { d: "M13 3.5v5h5" }],
		  ],
		  download: [
		    ["path", { d: "M12 3.5v11" }],
		    ["path", { d: "M7.5 10l4.5 4.5L16.5 10" }],
		    ["path", { d: "M5 20h14" }],
		  ],
		  arrowUp: [["path", { d: "M12 19V5M6 11l6-6 6 6" }]],
		  arrowDown: [["path", { d: "M12 5v14M18 13l-6 6-6-6" }]],
		  help: [
		    ["circle", { cx: 12, cy: 12, r: 8.5 }],
		    ["path", { d: "M9.4 9.4a2.6 2.6 0 1 1 3.8 2.4c-.8.4-1.2 1-1.2 1.8" }],
		    ["path", { d: "M12 17.2h.01" }],
		  ],
		  rotateCcw: [
		    ["path", { d: "M3.5 4.5v6h6" }],
		    ["path", { d: "M4 10.5a8.5 8.5 0 1 1 1.2 7.3" }],
		  ],
		  fastForward: [["path", { d: "M4.5 5.5l8 6.5-8 6.5zM13.5 5.5l8 6.5-8 6.5z" }]],
		  inbox: [
		    ["path", { d: "M4 13.5l2.2-8.5h11.6L20 13.5V19H4z" }],
		    ["path", { d: "M4 13.5h4.5l1.3 2.2h4.4l1.3-2.2H20" }],
		  ],
		  robot: [
		    ["rect", { x: 4.5, y: 8, width: 15, height: 10.5, rx: 2.5 }],
		    ["path", { d: "M12 4v4" }],
		    ["path", { d: "M9.2 12.3h.01M14.8 12.3h.01" }],
		    ["path", { d: "M3 12v3.5M21 12v3.5" }],
		  ],
		  history: [
		    ["path", { d: "M3.5 12a8.5 8.5 0 1 0 2.7-6.2" }],
		    ["path", { d: "M3.5 4.5v5h5" }],
		    ["path", { d: "M12 8v4.2l3 1.8" }],
		  ],
		  send: [["path", { d: "M4 11.5L20.5 4l-7.2 16.5-2.2-7z" }]],
		  spinner: [["circle", { cx: 12, cy: 12, r: 9, opacity: 0.25 }]],
		  dot: [["circle", { cx: 12, cy: 12, r: 4, fill: "currentColor", stroke: "none" }]],
		  hardDrive: [
		    ["rect", { x: 3, y: 4.5, width: 18, height: 15, rx: 2.5 }],
		    ["path", { d: "M3 13h18" }],
		    ["path", { d: "M7 16.5h.01M11 16.5h.01" }],
		  ],
		  users: [
		    ["circle", { cx: 9, cy: 8.5, r: 3.2 }],
		    ["path", { d: "M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" }],
		    ["path", { d: "M16 5.6a3.2 3.2 0 0 1 0 5.8" }],
		    ["path", { d: "M17.5 14.8c2 .6 3.3 2.2 3.7 4.7" }],
		  ],
		  zap: [["path", { d: "M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z" }]],
		  hide: [
		    ["path", { d: "M3 3l18 18" }],
		    ["path", { d: "M10.6 5.1A10.9 10.9 0 0 1 12 5c5.5 0 9.5 6 9.5 6a17.6 17.6 0 0 1-3.6 3.7" }],
		    ["path", { d: "M6.2 6.2A17.7 17.7 0 0 0 2.5 11S6.5 17 12 17a9.9 9.9 0 0 0 4.3-1" }],
		    ["path", { d: "M9.9 9.9a3 3 0 1 0 4.2 4.2" }],
		  ],
		  settings: [
		    ["circle", { cx: 12, cy: 12, r: 3.1 }],
		    ["path", { d: "M19.3 13.2a7.6 7.6 0 0 0 0-2.4l1.9-1.4-1.9-3.3-2.3 1a7.4 7.4 0 0 0-2.1-1.2L14.5 3h-5l-.4 2.9a7.4 7.4 0 0 0-2.1 1.2l-2.3-1L2.8 9.4l1.9 1.4a7.6 7.6 0 0 0 0 2.4l-1.9 1.4 1.9 3.3 2.3-1a7.4 7.4 0 0 0 2.1 1.2l.4 2.9h5l.4-2.9a7.4 7.4 0 0 0 2.1-1.2l2.3 1 1.9-3.3z" }],
		  ],
		};

		/** 侧栏图标：props = { size, active }（宿主侧边栏传入）。 */
		function ProjectConsoleIcon(props) {
		  const size = (props && props.size) || 18;
		  return pcElement(
		    "svg",
		    {
		      width: size,
		      height: size,
		      viewBox: "0 0 24 24",
		      fill: "none",
		      stroke: "currentColor",
		      strokeWidth: 1.8,
		      strokeLinecap: "round",
		      strokeLinejoin: "round",
		      "aria-hidden": "true",
		    },
		    PC_ICON_PATHS.board.map((entry, index) =>
		      pcElement(entry[0], Object.assign({ key: index }, entry[1])),
		    ),
		  );
		}

		/** 内联 SVG 图标。 */
		function PcIcon(props) {
		  const size = props.size || 14;
		  const paths = PC_ICON_PATHS[props.name] || PC_ICON_PATHS.info;
		  return pcElement(
		    "svg",
		    {
		      width: size,
		      height: size,
		      viewBox: "0 0 24 24",
		      fill: "none",
		      stroke: "currentColor",
		      strokeWidth: props.strokeWidth || 1.8,
		      strokeLinecap: "round",
		      strokeLinejoin: "round",
		      "aria-hidden": "true",
		      style: Object.assign({ flex: "none", display: "block" }, props.style),
		    },
		    paths.map((entry, index) => pcElement(entry[0], Object.assign({ key: index }, entry[1]))),
		  );
		}

		/** 菊花加载图标。 */
		function PcSpinner(props) {
		  const size = props && props.size ? props.size : 13;
		  return pcElement(
		    "svg",
		    {
		      width: size,
		      height: size,
		      viewBox: "0 0 24 24",
		      fill: "none",
		      "aria-hidden": "true",
		      className: "pc-spinner",
		    },
		    pcElement("circle", {
		      cx: 12,
		      cy: 12,
		      r: 9,
		      stroke: "currentColor",
		      strokeWidth: 3,
		      opacity: 0.22,
		    }),
		    pcElement("path", {
		      d: "M21 12a9 9 0 0 0-9-9",
		      stroke: "currentColor",
		      strokeWidth: 3,
		      strokeLinecap: "round",
		    }),
		  );
		}

		/** 按钮：variant = primary | secondary | ghost | danger；size = sm | md。 */
		function PcButton(props) {
		  const variant = props.variant || "secondary";
		  const size = props.size || "sm";
		  const classes = ["pc-btn", `pc-btn--${variant}`, `pc-btn--${size}`];
		  if (props.block) classes.push("pc-btn--block");
		  if (props.iconOnly) classes.push("pc-btn--icon");
		  if (props.className) classes.push(props.className);
		  const disabled = Boolean(props.disabled) || Boolean(props.loading);
		  const extra = {};
		  if (props.testId) extra["data-testid"] = props.testId;
		  if (props.title) extra.title = props.title;
		  return pcElement(
		    "button",
		    Object.assign(
		      {
		        type: props.type || "button",
		        className: classes.join(" "),
		        disabled,
		        onClick: disabled
		          ? undefined
		          : (event) => {
		              event.stopPropagation();
		              props.onClick(event);
		            },
		        style: props.style,
		        "aria-busy": props.loading ? "true" : undefined,
		      },
		      extra,
		    ),
		    props.loading ? pcElement(PcSpinner, { size: size === "sm" ? 11 : 13 }) : null,
		    props.icon && !props.loading ? pcElement(PcIcon, { name: props.icon, size: size === "sm" ? 12 : 14 }) : null,
		    props.children === undefined || props.children === null
		      ? null
		      : pcElement("span", { className: "pc-btn-label" }, props.children),
		    props.iconRight ? pcElement(PcIcon, { name: props.iconRight, size: size === "sm" ? 12 : 14 }) : null,
		  );
		}

		/** 状态徽标。 */
		function PcBadge(props) {
		  const tone = props.tone || "idle";
		  return pcElement(
		    "span",
		    { className: `pc-badge pc-badge--${tone}` },
		    props.icon ? pcElement(PcIcon, { name: props.icon, size: 10 }) : null,
		    props.children,
		  );
		}

		/** 轻量标签（类型/工作量/槽位之类）。 */
		function PcChip(props) {
		  const classes = ["pc-chip"];
		  if (props.mono) classes.push("pc-chip--mono");
		  if (props.tone) classes.push(`pc-chip--${props.tone}`);
		  if (props.onClick) classes.push("pc-chip--clickable");
		  if (props.className) classes.push(props.className);
		  const extra = props.testId ? { "data-testid": props.testId } : {};
		  return pcElement(
		    props.onClick ? "button" : "span",
		    Object.assign(
		      {
		        className: classes.join(" "),
		        type: props.onClick ? "button" : undefined,
		        onClick: props.onClick,
		        title: props.title,
		      },
		      extra,
		    ),
		    props.children,
		  );
		}

		/** 弹窗外壳（覆盖整页、点遮罩关闭、Esc 关闭）。 */
		function PcModal(props) {
		  React.useEffect(() => {
		    if (!props.onClose) return undefined;
		    const onKey = (event) => {
		      if (event.key === "Escape") {
		        event.stopPropagation();
		        props.onClose();
		      }
		    };
		    document.addEventListener("keydown", onKey);
		    return () => document.removeEventListener("keydown", onKey);
		  }, [props.onClose]);
		  return pcElement(
		    "div",
		    {
		      className: "pc-modal-mask",
		      onMouseDown: (event) => {
		        if (event.target === event.currentTarget && props.onClose) props.onClose();
		      },
		    },
		    pcElement(
		      "div",
		      {
		        className: "pc-modal",
		        style: props.width ? { width: `min(${props.width}px, 100%)` } : undefined,
		        role: "dialog",
		        "aria-modal": "true",
		        "aria-label": props.title,
		      },
		      pcElement(
		        "div",
		        { className: "pc-modal-head" },
		        pcElement(
		          "div",
		          { className: "pc-modal-head-text" },
		          pcElement("div", { className: "pc-modal-title" }, props.title),
		          props.subtitle ? pcElement("div", { className: "pc-modal-subtitle" }, props.subtitle) : null,
		        ),
		        props.onClose
		          ? pcElement(
		              "button",
		              { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭", "aria-label": "关闭" },
		              pcElement(PcIcon, { name: "close", size: 15 }),
		            )
		          : null,
		      ),
		      pcElement("div", { className: "pc-modal-body" }, props.children),
		      props.footer ? pcElement("div", { className: "pc-modal-foot" }, props.footer) : null,
		    ),
		  );
		}

		/** 表单字段：label + 控件 + 提示。 */
		function PcField(props) {
		  return pcElement(
		    "label",
		    { className: "pc-field" },
		    pcElement(
		      "span",
		      { className: "pc-field-label" },
		      props.label,
		      props.required ? pcElement("span", { className: "pc-field-required" }, "*") : null,
		      props.right ? pcElement("span", { className: "pc-field-right" }, props.right) : null,
		    ),
		    props.children,
		    props.hint ? pcElement("span", { className: "pc-field-hint" }, props.hint) : null,
		  );
		}

		function PcInput(props) {
		  const extra = {};
		  if (props.testId) extra["data-testid"] = props.testId;
		  if (props.placeholder) extra.placeholder = props.placeholder;
		  return pcElement(
		    "input",
		    Object.assign(
		      {
		        className: "pc-input",
		        type: props.type || "text",
		        value: props.value,
		        disabled: props.disabled,
		        onChange: (event) => props.onChange(event.target.value),
		        onKeyDown: props.onKeyDown,
		        autoFocus: props.autoFocus,
		        spellCheck: false,
		        style: props.style,
		      },
		      extra,
		    ),
		  );
		}

		function PcTextarea(props) {
		  const extra = {};
		  if (props.testId) extra["data-testid"] = props.testId;
		  return pcElement("textarea", {
		    className: "pc-textarea",
		    value: props.value,
		    placeholder: props.placeholder,
		    disabled: props.disabled,
		    rows: props.rows || 4,
		    onChange: (event) => props.onChange(event.target.value),
		    onPaste: props.onPaste,
		    onKeyDown: props.onKeyDown,
		    spellCheck: false,
		    style: props.style,
		    ...extra,
		  });
		}

		function PcSelect(props) {
		  const extra = {};
		  if (props.testId) extra["data-testid"] = props.testId;
		  return pcElement(
		    "select",
		    Object.assign(
		      {
		        className: props.className ? `pc-select ${props.className}` : "pc-select",
		        value: props.value,
		        disabled: props.disabled,
		        onChange: (event) => props.onChange(event.target.value),
		        style: props.style,
		        title: props.title,
		      },
		      extra,
		    ),
		    props.children,
		  );
		}

		/** 空状态（图标 + 标题 + 说明 + 操作）。 */
		function PcEmpty(props) {
		  return pcElement(
		    "div",
		    { className: "pc-empty" },
		    pcElement(
		      "div",
		      { className: `pc-empty-icon pc-empty-icon--${props.tone || "brand"}` },
		      pcElement(PcIcon, { name: props.icon || "board", size: 26 }),
		    ),
		    pcElement("div", { className: "pc-empty-title" }, props.title),
		    props.desc ? pcElement("div", { className: "pc-empty-desc" }, props.desc) : null,
		    props.children ? pcElement("div", { className: "pc-empty-extra" }, props.children) : null,
		  );
		}

		/** 小节标题。 */
		function PcSectionTitle(props) {
		  return pcElement(
		    "div",
		    { className: "pc-section-title" },
		    props.icon ? pcElement(PcIcon, { name: props.icon, size: 12 }) : null,
		    pcElement("span", null, props.children),
		    props.right ? pcElement("span", { className: "pc-section-title-right" }, props.right) : null,
		  );
		}

		/** 键值对。 */
		function PcKV(props) {
		  return pcElement(
		    "div",
		    { className: "pc-kv" },
		    pcElement("div", { className: "pc-kv-label" }, props.label),
		    pcElement("div", { className: props.mono ? "pc-kv-value pc-kv-value--mono" : "pc-kv-value" }, props.children),
		  );
		}

		/** 折叠块（原生 details，无状态）。 */
		function PcDetails(props) {
		  return pcElement(
		    "details",
		    { className: "pc-details" },
		    pcElement("summary", { className: "pc-details-summary" }, props.summary),
		    pcElement("div", { className: "pc-details-body" }, props.children),
		  );
		}

		/** 连接状态小圆点。 */
		function PcDot(props) {
		  return pcElement("span", {
		    className: `pc-dot pc-dot--${props.tone || "idle"}`,
		    title: props.title,
		  });
		}

		/**
		 * 已放弃 / 失败任务的原因块：原因分类 chip + 原因全文 + 可选「继续」按钮。
		 * 卡片上 clamp=true（最多 4 行）；详情抽屉里不 clamp，显示全文。
		 */
		function PcReasonBlock(props) {
		  const task = props.task;
		  const category = pcAbandonCategory(task);
		  const failed = task && task.status === "failed";
		  const text = pcTaskReasonText(task);
		  const classes = ["pc-reason", failed ? "pc-reason--failed" : "", `pc-reason--${category.key}`].filter(Boolean);
		  return pcElement(
		    "div",
		    { className: classes.join(" "), "data-testid": "pc-abandon-reason" },
		    pcElement(
		      "div",
		      { className: "pc-reason-head" },
		      pcElement(PcBadge, { tone: category.tone, icon: failed ? "alert" : "info" }, category.label),
		      pcElement("span", { className: "pc-reason-label" }, failed ? "失败原因" : "放弃原因"),
		      pcElement("span", { className: "pc-reason-spacer" }),
		      props.onResume
		        ? pcElement(
		            PcButton,
		            {
		              variant: "primary",
		              size: "sm",
		              icon: "play",
		              loading: props.resumeBusy,
		              disabled: props.resumeDisabled,
		              onClick: () => props.onResume(task),
		              testId: "pc-btn-resume",
		              title: "重新排队并派发（POST /task/resume）",
		            },
		            "继续",
		          )
		        : null,
		    ),
		    pcElement(
		      "div",
		      { className: props.clamp ? "pc-reason-text pc-reason-text--clamp" : "pc-reason-text", title: props.clamp ? text : undefined },
		      text,
		    ),
		  );
		}

		/**
		 * 任务附件缩略图：img 走宿主 /file 端点；加载失败时回退成文件名 + 路径。
		 * 点击在新窗口打开原图。
		 */
		function PcAttachmentTile(props) {
		  const attachment = props.attachment;
		  const [broken, setBroken] = React.useState(false);
		  const url = pcAttachmentUrl(attachment);
		  const name = attachment.name || "参考截图";
		  return pcElement(
		    "a",
		    {
		      className: "pc-att",
		      href: url,
		      target: "_blank",
		      rel: "noreferrer",
		      title: `${name}\n${attachment.path || ""}`,
		    },
		    broken
		      ? pcElement(
		          "div",
		          { className: "pc-att-fallback" },
		          pcElement(PcIcon, { name: "file", size: 18 }),
		          pcElement("span", { className: "pc-att-fallback-name" }, name),
		          pcElement("span", { className: "pc-att-fallback-path" }, attachment.path || ""),
		        )
		      : pcElement("img", {
		          className: "pc-att-img",
		          src: url,
		          alt: name,
		          loading: "lazy",
		          onError: () => setBroken(true),
		        }),
		    pcElement(
		      "span",
		      { className: "pc-att-caption" },
		      pcElement("span", { className: "pc-att-name" }, name),
		      attachment.size ? pcElement("span", { className: "pc-att-size" }, pcFmtFileSize(attachment.size)) : null,
		    ),
		  );
		}

		/** Toast 堆栈（3 秒自动消失，由 app 侧计时）。 */
		function PcToastStack(props) {
		  if (!props.toasts || props.toasts.length === 0) return null;
		  return pcElement(
		    "div",
		    { className: "pc-toasts", "aria-live": "polite" },
		    props.toasts.map((toast) =>
		      pcElement(
		        "div",
		        {
		          key: toast.id,
		          className: `pc-toast pc-toast--${toast.kind}`,
		          "data-testid": "pc-toast",
		          role: "status",
		        },
		        pcElement(PcIcon, {
		          name: toast.kind === "error" ? "alert" : toast.kind === "info" ? "info" : "check",
		          size: 14,
		        }),
		        pcElement("span", { className: "pc-toast-text" }, toast.text),
		        pcElement(
		          "button",
		          {
		            type: "button",
		            className: "pc-toast-close",
		            onClick: () => props.onDismiss(toast.id),
		            "aria-label": "关闭提示",
		          },
		          pcElement(PcIcon, { name: "close", size: 12 }),
		        ),
		      ),
		    ),
		  );
		}
		// ===== src/client/board.js =====
		/**
		 * 工程台 client：统计条、待澄清区、四列看板与任务卡片。
		 */

		/** 统计条的单个计数。 */
		function PcStatCount(props) {
		  const value = pcNum(props.value, 0);
		  const tone = value > 0 && props.tone ? ` pc-stat-value--${props.tone}` : "";
		  return pcElement(
		    "div",
		    { className: "pc-stat", title: props.title },
		    pcElement("span", { className: "pc-stat-label" }, props.label),
		    pcElement("span", { className: `pc-stat-value${tone}` }, value),
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
		  return pcElement(
		    "div",
		    { className: "pc-statbar" },
		    pcElement(
		      "div",
		      { className: "pc-stat pc-stat--slots", "data-testid": "pc-stat-slots" },
		      pcElement("span", { className: "pc-stat-label" }, "槽位"),
		      pcElement("span", { className: `pc-stat-value${full ? " pc-stat-value--warn" : ""}` }, `${slots.used} / ${slots.budget}`),
		      pcElement(
		        "div",
		        { className: "pc-slot-bar", title: `全局槽位 ${slots.used}/${slots.budget}` },
		        pcElement("div", {
		          className: full ? "pc-slot-bar-fill pc-slot-bar-fill--full" : "pc-slot-bar-fill",
		          style: { width: `${pct}%` },
		        }),
		      ),
		    ),
		    pcElement("div", { className: "pc-stat-sep" }),
		    pcElement(PcStatCount, { label: "待办", value: counters.todo, tone: "busy" }),
		    pcElement(PcStatCount, { label: "进行中", value: counters.running, tone: "busy" }),
		    pcElement(PcStatCount, { label: "验收中", value: counters.review, tone: "warn" }),
		    pcElement(PcStatCount, { label: "待澄清", value: counters.questions, tone: "warn" }),
		    pcElement(PcStatCount, { label: "已归档", value: counters.done, tone: "ok" }),
		    pcElement("div", { className: "pc-stat-sep" }),
		    pcElement(
		      "div",
		      { className: "pc-stat", title: "工程台数据目录磁盘占用" },
		      pcElement(PcIcon, { name: "hardDrive", size: 12, style: { color: "var(--dsw-alias-label-tertiary, #81858c)" } }),
		      pcElement("span", { className: "pc-stat-label" }, "磁盘"),
		      pcElement("span", { className: "pc-stat-value" }, `${pcFmtGB(disk.used)} / ${pcFmtGB(disk.budget)} GB`),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-statbar-right" },
		      pcElement(
		        "span",
		        { className: "pc-lead-state", title: "工程台 lead 会话状态" },
		        pcElement(PcDot, { tone: leadTone }),
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
		  return pcElement(
		    "div",
		    { className: "pc-question" },
		    pcElement(
		      "div",
		      { className: "pc-question-top" },
		      pcElement(PcBadge, { tone: "warn", icon: "help" }, "待回答"),
		      pcElement("span", null, projectName),
		      task
		        ? pcElement(
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
		      pcElement("span", { style: { marginLeft: "auto" } }, pcFmtRelative(question.askedAt, props.now)),
		    ),
		    pcElement("div", { className: "pc-question-text" }, question.text || "（无文本）"),
		    question.context ? pcElement("div", { className: "pc-question-context" }, question.context) : null,
		    pcElement(
		      "div",
		      { className: "pc-question-reply" },
		      options.length > 0
		        ? pcElement(
		            "div",
		            { className: "pc-question-options" },
		            options.map((option) =>
		              pcElement(
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
		      pcElement(
		        "div",
		        { className: "pc-question-input" },
		        pcElement(PcInput, {
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
		      pcElement(
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
		    return pcElement("section", { "data-testid": "pc-col-questions", style: { display: "none" } });
		  }
		  const tasks = props.tasks || [];
		  return pcElement(
		    "section",
		    { className: "pc-questions", "data-testid": "pc-col-questions", "aria-label": "待澄清问题" },
		    pcElement(
		      "div",
		      { className: "pc-questions-head" },
		      pcElement(PcIcon, { name: "help", size: 14 }),
		      "待澄清",
		      pcElement(PcBadge, { tone: "warn" }, String(questions.length)),
		      pcElement("span", { style: { fontWeight: 400, opacity: 0.8 } }, "回答后任务会继续执行"),
		    ),
		    pcElement(
		      "div",
		      { className: questions.length >= 2 ? "pc-questions-list pc-questions-list--two" : "pc-questions-list" },
		      questions.map((question) =>
		        pcElement(PcQuestionItem, {
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
		  return pcElement(
		    "span",
		    { className: "pc-metric", title: "diff 增删行数" },
		    pcElement("span", { className: "pc-diff-add" }, `+${parsed.added}`),
		    pcElement("span", { style: { opacity: 0.55 } }, "/"),
		    pcElement("span", { className: "pc-diff-del" }, `-${parsed.deleted}`),
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
		      pcElement(
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
		      pcElement(
		        PcButton,
		        { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open", title: "查看任务详情" },
		        "详情",
		      ),
		      pcElement(
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
		      pcElement(
		        "div",
		        { key: "prio", className: "pc-card-prio-btns" },
		        pcElement(
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
		          pcElement(PcIcon, { name: "arrowUp", size: 11 }),
		        ),
		        pcElement(
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
		          pcElement(PcIcon, { name: "arrowDown", size: 11 }),
		        ),
		      ),
		    );
		  } else if (column === "running") {
		    actions.push(
		      pcElement(
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
		      pcElement(PcButton, { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open" }, "详情"),
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
		  } else if (column === "review") {
		    actions.push(
		      pcElement(
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
		      pcElement(
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
		        ? pcElement(
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
		      pcElement(
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
		      pcElement(
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
		      pcElement(PcButton, { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open" }, "详情"),
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
		  } else {
		    actions.push(
		      pcElement(PcButton, { key: "open", variant: "ghost", size: "sm", icon: "list", onClick: open, testId: "pc-task-open" }, "详情"),
		    );
		    if (task.status !== "abandoned") {
		      actions.push(
		        pcElement(
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
		    ? pcElement(PcReasonBlock, {
		        task,
		        clamp: true,
		        resumeBusy: isBusy("resume"),
		        onResume: () => props.onTaskAction("resume", task),
		      })
		    : null;

		  const top = pcElement(
		    "div",
		    { className: "pc-card-top" },
		    pcElement("span", { className: "pc-card-id" }, `#${id}`),
		    task.status === "verifying"
		      ? pcElement(
		          PcChip,
		          { className: "pc-chip-verifying", title: "工程台 super agent 正在验收（人工可覆盖）" },
		          pcElement(PcSpinner, { size: 9 }),
		          "验收中",
		        )
		      : pcElement(
		          PcBadge,
		          { tone: meta.tone, icon: task.status === "failed" ? "alert" : task.status === "needs_input" ? "help" : undefined },
		          meta.label,
		        ),
		    column === "todo" && pcNum(task.priority, null) !== null
		      ? pcElement("span", { className: "pc-card-prio", title: "优先级（数字越大越先派发）" }, `P${pcNum(task.priority, 0)}`)
		      : null,
		    column === "done"
		      ? pcElement(
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
		          pcElement(PcIcon, { name: "trash", size: 13 }),
		        )
		      : null,
		  );

		  const sub = [];
		  if (showProject) sub.push(pcElement("span", { key: "p", className: "pc-card-project" }, projectName));
		  if (column === "todo") {
		    sub.push(pcElement(PcChip, { key: "t", mono: true }, task.type || "—"));
		    const sizeMeta = pcSizeSourceMeta(task);
		    sub.push(
		      pcElement(
		        PcChip,
		        { key: "s", mono: true, tone: sizeMeta.tone || undefined, title: sizeMeta.title },
		        pcWorkloadChipText(task),
		      ),
		    );
		    if (pcNum(task.slots, null) !== null) sub.push(pcElement(PcChip, { key: "sl", mono: true }, `槽 ${task.slots}`));
		    if (Array.isArray(task.dependsOn) && task.dependsOn.length > 0) {
		      sub.push(pcElement(PcChip, { key: "d", tone: "warn", mono: true }, `依赖 ${task.dependsOn.map((x) => `#${x}`).join(" ")}`));
		    }
		    if (Array.isArray(task.touches) && task.touches.length > 0) {
		      sub.push(
		        pcElement(
		          "span",
		          { key: "touch", className: "pc-card-branch", title: task.touches.join("\n") },
		          task.touches.slice(0, 2).join(" · ") + (task.touches.length > 2 ? ` +${task.touches.length - 2}` : ""),
		        ),
		      );
		    }
		  } else if (column === "running") {
		    if (pcNum(task.slots, null) !== null) sub.push(pcElement(PcChip, { key: "sl", mono: true }, `槽 ${task.slots}`));
		    const runSizeMeta = pcSizeSourceMeta(task);
		    sub.push(
		      pcElement(
		        PcChip,
		        { key: "wl", mono: true, tone: runSizeMeta.tone || undefined, title: runSizeMeta.title },
		        `工作量 ${pcWorkloadLabel(task.size)}`,
		      ),
		    );
		    sub.push(
		      pcElement(
		        "span",
		        { key: "dur", className: "pc-metric", title: "本次运行时长" },
		        pcElement(PcIcon, { name: "clock", size: 10 }),
		        pcRunDuration(lastRun, props.now),
		      ),
		    );
		    if (task.branch) sub.push(pcElement("span", { key: "b", className: "pc-card-branch" }, task.branch));
		  } else if (column === "review") {
		    if (selfTest) {
		      sub.push(
		        pcElement(
		          "span",
		          { key: "st", className: selfTest.allPassed ? "pc-metric pc-metric--ok" : "pc-metric pc-metric--err", title: "selfTest 通过数/总数" },
		          `测试 ${selfTest.passed}/${selfTest.total}`,
		        ),
		      );
		    }
		    sub.push(pcElement(PcDiffStat, { key: "diff", diffStat: lastRun && lastRun.diffStat }));
		    if (lastRun && pcNum(lastRun.filesChanged, 0) > 0) {
		      sub.push(pcElement("span", { key: "f", className: "pc-metric" }, `${lastRun.filesChanged} 文件`));
		    }
		    if (task.branch) sub.push(pcElement("span", { key: "b", className: "pc-card-branch" }, task.branch));
		  } else {
		    if (task.acceptance && task.acceptance.acceptedAt) {
		      sub.push(pcElement("span", { key: "acc" }, `验收 ${pcFmtDateTime(task.acceptance.acceptedAt)}`));
		    }
		    const batch = props.batchOfTask ? props.batchOfTask(task) : null;
		    if (batch) sub.push(pcElement(PcChip, { key: "bch", mono: true, tone: batch.status === "failed" ? "danger" : undefined }, `批次 ${batch.id} · ${pcBatchMeta(batch.status).label}`));
		  }

		  const attachmentCount = pcTaskAttachments(task).length;
		  if (attachmentCount > 0) {
		    sub.push(
		      pcElement(
		        PcChip,
		        { key: "att", title: "任务附带的参考截图（详情里可看）" },
		        `参考图 ${attachmentCount}`,
		      ),
		    );
		  }

		  const rows = [];
		  rows.push(top);
		  rows.push(pcElement("div", { className: "pc-card-title", title: task.title || "" }, task.title || "（未命名任务）"));
		  if (sub.length > 0) rows.push(pcElement("div", { className: "pc-card-sub" }, sub));
		  if (column === "running") {
		    rows.push(
		      pcElement(
		        "div",
		        { className: "pc-card-event", title: latestEvent ? `${latestEvent.type || ""} ${latestEvent.brief || ""}` : "" },
		        pcElement(PcIcon, { name: "terminal", size: 11, style: { opacity: 0.7 } }),
		        pcElement(
		          "span",
		          { className: "pc-card-event-text" },
		          task.status === "needs_input" ? "等待澄清回答后继续" : latestEvent ? latestEvent.brief || latestEvent.summary || latestEvent.type : "等待会话事件…",
		        ),
		      ),
		    );
		  }
		  if (task.status === "verifying") {
		    rows.push(
		      pcElement(
		        "div",
		        { className: "pc-card-verifying" },
		        pcElement(PcSpinner, { size: 10 }),
		        pcElement("span", null, "工程台验收中…（可人工覆盖）"),
		      ),
		    );
		  }
		  if (driftWarn) {
		    rows.push(
		      pcElement(
		        "div",
		        { className: "pc-card-warn" },
		        pcElement(PcIcon, { name: "alert", size: 11 }),
		        pcElement("span", null, "主仓在任务执行期间有变更（drift），验收前注意对比"),
		      ),
		    );
		  }
		  if (reasonBlock) {
		    rows.push(reasonBlock);
		  }
		  rows.push(pcElement("div", { className: "pc-card-actions" }, actions));

		  return pcElement(
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
		  return pcElement(
		    "section",
		    { className: "pc-col", "data-testid": `pc-col-${def.key}`, "aria-label": `${title}列` },
		    pcElement(
		      "div",
		      { className: "pc-col-head" },
		      pcElement("span", { className: `pc-col-dot pc-col-dot--${def.tone}` }),
		      pcElement("span", { className: "pc-col-title" }, title),
		      pcElement("span", { className: "pc-col-count" }, String(props.tasks.length)),
		      subtitle
		        ? pcElement(
		            "div",
		            { className: `pc-col-sub${hasVerifying ? " pc-col-sub--verifying" : ""}`, "data-testid": "pc-col-sub" },
		            subtitle,
		          )
		        : null,
		    ),
		    pcElement(
		      "div",
		      { className: "pc-col-body" },
		      props.tasks.length === 0
		        ? pcElement("div", { className: "pc-empty-col" }, def.empty)
		        : props.tasks.map((task) =>
		            pcElement(PcTaskCard, {
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
		  return pcElement(
		    "div",
		    { className: "pc-board" },
		    PC_COLUMN_DEFS.map((def) => {
		      const columnTasks = pcSortColumn(
		        def.key,
		        tasks.filter((task) => def.statuses.includes(task.status)),
		      );
		      const verifyingCount = def.key === "review" ? columnTasks.filter((task) => task.status === "verifying").length : 0;
		      return pcElement(PcColumn, {
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
		// ===== src/client/detail.js =====
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
		// ===== src/client/integration.js =====
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
		// ===== src/client/sessions.js =====
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
		  return pcElement(
		    "div",
		    { className: `pc-chat-msg pc-chat-msg--${role}`, "data-testid": "pc-chat-msg" },
		    pcElement(
		      "div",
		      { className: "pc-chat-msg-head" },
		      pcElement("span", { className: `pc-chat-role pc-chat-role--${meta.tone}` }, meta.label),
		      message.time ? pcElement("span", { className: "pc-chat-time" }, pcFmtClock(message.time)) : null,
		      message.type ? pcElement("span", { className: "pc-chat-type", title: String(message.type) }, String(message.type)) : null,
		    ),
		    pcElement("div", { className: "pc-chat-text", title: isTool ? text : undefined }, text),
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
		      pcElement(
		        "div",
		        { className: "pc-error-box", key: "error", style: { margin: "12px 16px" } },
		        `读取对话失败：${error.message}（宿主 /lead/transcript 暂不可用时会持续重试）`,
		      ),
		    );
		  }
		  bodyChildren.push(
		    pcElement(
		      "div",
		      { className: "pc-chat-list", key: "list", ref: listRef },
		      messages.length === 0
		        ? pcElement(
		            "div",
		            { className: "pc-panel-empty pc-chat-empty" },
		            pcElement("div", { className: "pc-empty-icon" }, pcElement(PcIcon, { name: "chat", size: 20 })),
		            pcElement("div", { className: "pc-empty-title", style: { fontSize: 13.5 } }, phase === "loading" ? "正在读取对话…" : "还没有对话记录"),
		            pcElement(
		              "div",
		              { className: "pc-empty-desc", style: { fontSize: 11.5 } },
		              phase === "loading" ? "GET /lead/transcript" : "在下面输入框给工程台发第一条指令，比如「用一句话说明当前看板状态」。",
		            ),
		          )
		        : messages.map((message, index) =>
		            pcElement(PcChatMessage, { key: `${index}-${message.time || ""}`, message }),
		          ),
		    ),
		  );
		  bodyChildren.push(
		    pcElement(
		      "div",
		      { className: "pc-chat-composer", key: "composer" },
		      pcElement(PcTextarea, {
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
		      pcElement(
		        "div",
		        { className: "pc-chat-composer-row" },
		        pcElement(
		          "span",
		          { className: "pc-hint" },
		          `自动刷新 1.5s${syncedAt ? ` · 同步于 ${pcFmtClock(new Date(syncedAt).toISOString())}` : ""}`,
		        ),
		        pcElement(
		          PcButton,
		          { variant: "primary", size: "sm", icon: "send", loading: sending, disabled: text.trim() === "", onClick: send, testId: "pc-chat-send" },
		          "发送",
		        ),
		      ),
		    ),
		  );

		  return pcElement(
		    "div",
		    {
		      className: "pc-drawer-mask",
		      onMouseDown: (event) => {
		        if (event.target === event.currentTarget && !sending) props.onClose();
		      },
		    },
		    pcElement(
		      "aside",
		      { className: "pc-drawer pc-drawer--chat", "data-testid": "pc-lead-chat", role: "dialog", "aria-label": "工程台对话", "aria-modal": "true" },
		      pcElement(
		        "div",
		        { className: "pc-drawer-head" },
		        pcElement(
		          "div",
		          { className: "pc-drawer-head-text" },
		          pcElement(
		            "div",
		            { className: "pc-drawer-eyebrow" },
		            pcElement(PcBadge, { tone: "busy", icon: "robot" }, "工程台 · super agent"),
		            pcElement(PcDot, { tone: statusMeta.tone }),
		            pcElement("span", { className: "pc-hint" }, statusMeta.label),
		            lead.hidden === true ? pcElement(PcChip, {}, "隐藏会话") : null,
		          ),
		          pcElement("div", { className: "pc-drawer-title" }, "工程台对话"),
		          pcElement(
		            "div",
		            { className: "pc-drawer-sub" },
		            sessionId ? pcElement("span", { className: "pc-mono" }, pcShortSession(sessionId)) : null,
		            pcElement("span", null, "对话记录来自 /lead/transcript，发送会直接驱动 lead"),
		          ),
		        ),
		        pcElement(
		          "button",
		          { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭对话", "aria-label": "关闭对话", disabled: sending },
		          pcElement(PcIcon, { name: "close", size: 15 }),
		        ),
		      ),
		      pcElement("div", { className: "pc-drawer-body pc-chat-body" }, bodyChildren),
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
		  return pcElement(
		    "div",
		    {
		      className: `pc-session-row${props.highlight ? " is-highlight" : ""}`,
		      "data-testid": `pc-session-${session.id}`,
		    },
		    pcElement(
		      "div",
		      { className: "pc-session-top" },
		      pcElement(
		        PcBadge,
		        { tone: isLead ? "busy" : "idle", icon: isLead ? "robot" : "terminal" },
		        isLead ? "工程台" : `任务 #${session.taskId !== null && session.taskId !== undefined ? session.taskId : "?"}`,
		      ),
		      pcElement("span", { className: "pc-session-title", title }, title),
		      pcElement(
		        "span",
		        { className: "pc-session-state" },
		        pcElement(PcDot, { tone: statusMeta.tone }),
		        statusMeta.label,
		        pcElement("span", { className: "pc-session-time" }, pcSessionTimeText(session, props.now)),
		      ),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-session-meta" },
		      pcElement("span", null, isLead ? "工程台" : project ? project.name : session.projectId || "—"),
		      pcElement("span", { className: "pc-mono" }, pcShortSession(session.id)),
		      session.hidden ? pcElement("span", { className: "pc-chip" }, "隐藏会话") : null,
		    ),
		    pcElement(
		      "div",
		      { className: "pc-session-event", title: eventText },
		      pcElement(PcIcon, { name: "terminal", size: 11, style: { opacity: 0.7 } }),
		      pcElement("span", { className: "pc-session-event-text" }, eventText),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-session-actions" },
		      isLead
		        ? pcElement(
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
		        : pcElement(
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
		        : pcElement(
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
		      pcElement(
		        "div",
		        { className: "pc-panel-empty", key: "empty" },
		        pcElement("div", { className: "pc-empty-icon pc-empty-icon--warn" }, pcElement(PcIcon, { name: "chat", size: 22 })),
		        pcElement("div", { className: "pc-empty-title", style: { fontSize: 14 } }, "宿主还没有提供会话列表"),
		        pcElement(
		          "div",
		          { className: "pc-empty-desc", style: { fontSize: 12 } },
		          "GET /state.sessions 为空或尚未提供。host 更新后这里会自动出现工程台会话与任务会话；任务会话是隐藏会话，左栏不再显示。",
		        ),
		        pcElement(PcButton, { variant: "secondary", size: "sm", icon: "refresh", onClick: props.onRefresh }, "刷新"),
		      ),
		    );
		  } else {
		    bodyChildren.push(
		      pcElement(
		        "div",
		        { className: "pc-session-list", key: "list" },
		        sessions.map((session) =>
		          pcElement(PcSessionRow, {
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
		      { className: "pc-drawer", "data-testid": "pc-sessions", role: "dialog", "aria-label": "会话", "aria-modal": "true" },
		      pcElement(
		        "div",
		        { className: "pc-drawer-head" },
		        pcElement(
		          "div",
		          { className: "pc-drawer-head-text" },
		          pcElement(
		            "div",
		            { className: "pc-drawer-eyebrow" },
		            pcElement(PcBadge, { tone: "busy", icon: "chat" }, "会话"),
		            leadSession ? pcElement(PcBadge, { tone: "idle", icon: "robot" }, "工程台会话已创建") : null,
		          ),
		          pcElement("div", { className: "pc-drawer-title" }, "工程台会话与任务会话"),
		          pcElement(
		            "div",
		            { className: "pc-drawer-sub" },
		            pcElement(
		              "span",
		              null,
		              `${sessions.length} 个会话${runningCount > 0 ? ` · ${runningCount} 个运行中` : ""} · 会话都是隐藏会话，只能从这里访问`,
		            ),
		          ),
		        ),
		        pcElement(
		          "button",
		          { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭", "aria-label": "关闭会话面板" },
		          pcElement(PcIcon, { name: "close", size: 15 }),
		        ),
		      ),
		      pcElement("div", { className: "pc-drawer-body" }, bodyChildren),
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
		  return pcElement(
		    "div",
		    { className: `pc-chat-msg pc-chat-msg--${role}`, "data-testid": "pc-transcript-msg" },
		    pcElement(
		      "div",
		      { className: "pc-chat-msg-head" },
		      pcElement("span", { className: `pc-chat-role pc-chat-role--${meta.tone}` }, meta.label),
		      message.time ? pcElement("span", { className: "pc-chat-time" }, pcFmtClock(message.time)) : null,
		      message.type ? pcElement("span", { className: "pc-chat-type", title: String(message.type) }, String(message.type)) : null,
		    ),
		    pcElement("div", { className: "pc-chat-text", title: isTool ? text : undefined }, text),
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
		      pcElement(
		        "div",
		        { className: "pc-run-tabs", key: "tabs" },
		        runs.map((run) =>
		          pcElement(
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
		      pcElement(
		        "div",
		        { className: "pc-error-box", key: "err" },
		        `读取会话记录失败：${payload.error.message}（隐藏会话记录来自 /task/transcript）`,
		      ),
		    );
		  }
		  bodyChildren.push(
		    pcElement(
		      "div",
		      { className: "pc-transcript-list", key: "list", ref: listRef },
		      messages.length === 0
		        ? pcElement(
		            "div",
		            { className: "pc-panel-empty pc-transcript-empty" },
		            pcElement("div", { className: "pc-empty-icon" }, pcElement(PcIcon, { name: "history", size: 20 })),
		            pcElement(
		              "div",
		              { className: "pc-empty-title", style: { fontSize: 13.5 } },
		              payload.phase === "loading" ? "正在读取会话记录…" : "这次 run 还没有可读消息",
		            ),
		            pcElement(
		              "div",
		              { className: "pc-empty-desc", style: { fontSize: 11.5 } },
		              payload.phase === "loading" ? "GET /task/transcript" : "会话是隐藏的（左栏不显示），记录仍在宿主里；换一个 run 或等任务跑起来再看。",
		            ),
		          )
		        : messages.map((message, index) =>
		            pcElement(PcTranscriptMessage, { key: `${activeRunId || "run"}-${index}`, message }),
		          ),
		    ),
		  );

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
		      { className: "pc-drawer pc-drawer--transcript", "data-testid": "pc-session-viewer", role: "dialog", "aria-label": "任务会话记录", "aria-modal": "true" },
		      pcElement(
		        "div",
		        { className: "pc-drawer-head" },
		        pcElement(
		          "div",
		          { className: "pc-drawer-head-text" },
		          pcElement(
		            "div",
		            { className: "pc-drawer-eyebrow" },
		            pcElement(PcBadge, { tone: "busy", icon: "history" }, "会话记录"),
		            pcElement(PcDot, { tone: runMeta.dot }),
		            pcElement("span", { className: "pc-hint" }, runMeta.label),
		            sessionId ? pcElement("span", { className: "pc-mono pc-hint" }, pcShortSession(sessionId)) : null,
		            latestRunning ? pcElement(PcChip, {}, "运行中 · 每 3s 刷新") : null,
		          ),
		          pcElement("div", { className: "pc-drawer-title" }, `任务 #${taskId} · 会话记录`),
		          pcElement(
		            "div",
		            { className: "pc-drawer-sub" },
		            task ? pcElement("span", null, task.title || "")
		            : null,
		            project ? pcElement("span", null, `· ${project.name}`) : null,
		            pcElement("span", null, `· ${runs.length} 个 run · ${messages.length} 条消息 · 只读`),
		          ),
		        ),
		        pcElement(
		          "button",
		          { type: "button", className: "pc-icon-btn", onClick: props.onClose, title: "关闭", "aria-label": "关闭会话记录" },
		          pcElement(PcIcon, { name: "close", size: 15 }),
		        ),
		      ),
		      pcElement("div", { className: "pc-drawer-body pc-transcript-body" }, bodyChildren),
		    ),
		  );
		}
		// ===== src/client/app.js =====
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
		  return pcElement(
		    "header",
		    { className: "pc-topbar" },
		    pcElement(
		      "div",
		      { className: "pc-brand" },
		      pcElement("div", { className: "pc-brand-icon" }, pcElement(PcIcon, { name: "board", size: 16 })),
		      pcElement(
		        "div",
		        { className: "pc-brand-text" },
		        pcElement("span", { className: "pc-brand-title" }, "工程台"),
		        pcElement(
		          "span",
		          { className: "pc-brand-sub" },
		          pcElement(PcDot, { tone: connDot, title: connLabel }),
		          connLabel,
		        ),
		      ),
		    ),
		    pcElement("div", { className: "pc-topbar-spacer" }),
		    pcElement(
		      "div",
		      { className: "pc-topbar-actions" },
		      pcElement(
		        PcSelect,
		        {
		          className: "pc-project-select",
		          testId: "pc-project-switcher",
		          value: props.selectedProject,
		          disabled: !ready,
		          onChange: props.onSelectProject,
		          title: "按项目筛选看板",
		        },
		        pcElement("option", { value: "" }, "全部项目"),
		        projects.map((project) =>
		          pcElement(
		            "option",
		            { key: project.id, value: project.id },
		            `${project.name}${pcReviewCountOf(value, project.id) > 0 ? `（验收中 ${pcReviewCountOf(value, project.id)}）` : ""}`,
		          ),
		        ),
		      ),
		      pcElement(
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
		          ? pcElement("span", { className: "pc-btn-count", "data-testid": "pc-btn-sessions-count" }, String(props.sessionsCount))
		          : null,
		      ),
		      pcElement(
		        PcButton,
		        { variant: "ghost", size: "sm", icon: "folder", disabled: !ready, onClick: props.onOpenProjects, testId: "pc-btn-projects", title: "项目管理：添加项目、删除项目（连带任务记录）" },
		        "项目",
		      ),
		      pcElement(
		        PcButton,
		        { variant: "primary", size: "sm", icon: "plus", disabled: !ready || projects.length === 0, onClick: props.onNewTask, testId: "pc-btn-new-task" },
		        "新需求",
		      ),
		      pcElement(
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
		      pcElement(
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
		      pcElement(
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
		      pcElement(
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
		        props.refreshing ? pcElement(PcSpinner, { size: 14 }) : pcElement(PcIcon, { name: "refresh", size: 15 }),
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
		  const fields = pcElement(
		    React.Fragment,
		    null,
		    pcElement(
		      "div",
		      { className: "pc-form-grid pc-form-grid--2" },
		      pcElement(
		        PcField,
		        { label: "项目名称", required: true },
		        pcElement(PcInput, { value: name, onChange: setName, placeholder: "例如 my-project", testId: "pc-input-project-name" }),
		      ),
		      pcElement(
		        PcField,
		        { label: "仓库绝对路径", required: true, hint: "必须是本机已存在的 Git 仓库" },
		        pcElement(PcInput, { value: repoPath, onChange: setRepoPath, placeholder: "例如 /path/to/your-repo", testId: "pc-input-project-repo" }),
		      ),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-form-grid pc-form-grid--2" },
		      pcElement(
		        PcField,
		        { label: "主干分支", hint: "集成完成后推送到这个分支（一般填 main）" },
		        pcElement(PcInput, { value: baseBranch, onChange: setBaseBranch, placeholder: "main" }),
		      ),
		      pcElement(
		        PcField,
		        { label: "任务会话权限", hint: "workspace-write 只能写 worktree；全权限适合依赖 home 缓存的视觉任务" },
		        pcElement(
		          PcSelect,
		          { value: workerFilePolicy, onChange: setWorkerFilePolicy, testId: "pc-select-project-worker-policy" },
		          pcElement("option", { value: "workspace-write" }, "只写 worktree（workspace-write，推荐）"),
		          pcElement("option", { value: "danger-full-access" }, "宿主全权限（danger-full-access，信任模式）"),
		        ),
		      ),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-empty-actions" },
		      pcElement(
		        PcButton,
		        { variant: "primary", size: "md", icon: "plus", loading: busy, onClick: submit, testId: "pc-btn-add-project-submit" },
		        "添加项目",
		      ),
		    ),
		  );
		  if (props.plain) return fields;
		  return pcElement("div", { className: "pc-empty-card" }, pcElement("div", { className: "pc-empty-card-title" }, pcElement(PcIcon, { name: "folder", size: 15 }), "添加项目"), fields);
		}

		/** 项目管理弹窗：列出全部项目（看板已归档的也列）+ 删除入口 + 添加项目表单。 */
		function PcProjectsDialog(props) {
		  const projects = Array.isArray(props.projects) ? props.projects : [];
		  return pcElement(
		    PcModal,
		    {
		      title: "项目",
		      subtitle: "工程台跟踪的仓库。删除项目会连它名下的任务记录一起删；仓库本身和已合并到主干分支的提交不动。",
		      width: 720,
		      onClose: props.onClose,
		      footer: pcElement(PcButton, { variant: "ghost", size: "md", onClick: props.onClose }, "关闭"),
		    },
		    pcElement(
		      "div",
		      { className: "pc-projects-section" },
		      pcElement(PcSectionTitle, { icon: "folder", right: `${projects.length} 个` }, "已登记的项目"),
		      projects.length === 0
		        ? pcElement("div", { className: "pc-note" }, "还没有项目。用下面的表单添加一个，工程台才能建需求、派任务。")
		        : pcElement(
		            "div",
		            { className: "pc-projects-list", "data-testid": "pc-projects-list" },
		            projects.map((project) => {
		              const counts = project.taskCounts || {};
		              const archived = Boolean(project.archivedAt);
		              return pcElement(
		                "div",
		                { key: project.id, className: "pc-projects-row", "data-testid": `pc-project-row-${project.id}` },
		                pcElement(
		                  "div",
		                  { className: "pc-projects-main" },
		                  pcElement(
		                    "div",
		                    { className: "pc-projects-name-row" },
		                    pcElement("span", { className: "pc-projects-name", title: project.repoPath }, project.name || project.id),
		                    pcElement(PcChip, { mono: true, title: "项目 id" }, project.id),
		                    archived ? pcElement(PcBadge, { tone: "idle" }, "已归档") : null,
		                  ),
		                  pcElement("div", { className: "pc-projects-repo", title: project.repoPath }, project.repoPath || "（未设置仓库路径）"),
		                  pcElement(
		                    "div",
		                    { className: "pc-projects-meta" },
		                    pcElement("span", null, `base ${project.baseBranch || "main"}`),
		                    pcElement("span", null, `待办 ${pcNum(counts.todo, 0)}`),
		                    pcElement("span", null, `进行中 ${pcNum(counts.running, 0)}`),
		                    pcElement("span", null, `验收中 ${pcNum(counts.review, 0)}`),
		                    pcElement("span", null, `已归档 ${pcNum(counts.done, 0)}`),
		                    pcElement("span", null, `槽位 ${pcNum(project.usedSlots, 0)}/${pcNum(project.slotBudget, 6)}`),
		                  ),
		                ),
		                pcElement(
		                  "div",
		                  { className: "pc-projects-policy" },
		                  pcElement("span", { className: "pc-field-label" }, "任务权限"),
		                  pcElement(
		                    PcSelect,
		                    {
		                      value: project.workerFilePolicy || (project.autonomy === "unleashed" ? "danger-full-access" : "workspace-write"),
		                      testId: `pc-select-project-policy-${project.id}`,
		                      onChange: (value) => props.onPolicyChange && props.onPolicyChange(project, value),
		                    },
		                    pcElement("option", { value: "workspace-write" }, "workspace-write"),
		                    pcElement("option", { value: "danger-full-access" }, "danger-full-access"),
		                  ),
		                ),
		                pcElement(
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
		    pcElement(
		      "div",
		      { className: "pc-projects-section" },
		      pcElement(PcSectionTitle, { icon: "plus" }, "添加项目"),
		      pcElement(PcAddProjectForm, {
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
		    modelControl = pcElement(
		      "div",
		      { className: "pc-settings-route" },
		      pcElement(PcInput, {
		        value: current.provider,
		        placeholder: "provider，如 mtcode",
		        disabled,
		        onChange: (next) => onChange({ key: next ? `${next}::${current.model}` : "", effort: value.effort }),
		      }),
		      pcElement(PcInput, {
		        value: current.model,
		        placeholder: "model，如 deepseek-flash",
		        disabled,
		        onChange: (next) => onChange({ key: next ? `${current.provider}::${next}` : "", effort: value.effort }),
		      }),
		    );
		    effortControl = pcElement(PcInput, {
		      value: currentEffort,
		      placeholder: "思考强度，如 max（可空）",
		      disabled,
		      onChange: (next) => onChange({ key: value.key, effort: next }),
		    });
		  } else {
		    modelControl = pcElement(
		      PcSelect,
		      {
		        value: value.key,
		        disabled,
		        onChange: (next) => onChange({ key: next, effort: "" }),
		        testId: `pc-settings-model-${testId}`,
		      },
		      pcElement("option", { value: "" }, "跟随项目 / 部署默认"),
		      value.key && !selected ? pcElement("option", { value: value.key }, `当前：${value.key.replace("::", " / ")}`) : null,
		      catalogView.groups.map((group) =>
		        pcElement(
		          "optgroup",
		          { key: group.id, label: group.name },
		          group.models.map((model) => pcElement("option", { key: model.key, value: model.key }, model.name)),
		        ),
		      ),
		    );
		    effortControl = pcElement(
		      PcSelect,
		      {
		        value: currentEffort,
		        disabled,
		        onChange: (next) => onChange({ key: value.key, effort: next }),
		        testId: `pc-settings-effort-${testId}`,
		      },
		      pcElement("option", { value: "" }, "模型默认"),
		      currentEffort && !knownEffort ? pcElement("option", { value: currentEffort }, `当前：${currentEffort}`) : null,
		      efforts.map((effort) => pcElement("option", { key: effort.id, value: effort.id }, effort.name || effort.id)),
		    );
		  }
		  return pcElement(
		    "div",
		    { className: "pc-settings-grid" },
		    pcElement(
		      "div",
		      { className: "pc-settings-cell" },
		      pcElement("span", { className: "pc-field-label" }, "模型"),
		      modelControl,
		    ),
		    pcElement(
		      "div",
		      { className: "pc-settings-cell" },
		      pcElement("span", { className: "pc-field-label" }, "思考强度"),
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
		    pcElement(
		      "div",
		      { key: tier, className: "pc-settings-tier" },
		      pcElement(
		        "div",
		        { className: "pc-settings-tier-head" },
		        pcElement("span", { className: "pc-settings-tier-name" }, `${label}工作量`),
		        pcElement("span", { className: "pc-settings-tier-sizes" }, `size ${PC_TIER_SIZE_HINT[tier] || ""}`),
		      ),
		      pcElement(PcSettingsModelPicker, {
		        value: draft.workload[tier],
		        catalogView,
		        catalogEmpty,
		        disabled: saving,
		        testId: tier,
		        onChange: (value) => setTier(tier, value),
		      }),
		    );

		  const renderProjectSlot = (project) =>
		    pcElement(
		      "div",
		      { key: project.id, className: "pc-settings-project" },
		      pcElement("span", { className: "pc-settings-project-name", title: project.repoPath }, project.name || project.id),
		      pcElement(PcInput, {
		        type: "number",
		        value: draft.projectSlots[project.id],
		        disabled: saving,
		        testId: `pc-settings-project-slot-${project.id}`,
		        onChange: (value) => setProjectSlot(project.id, value),
		      }),
		      pcElement("span", { className: "pc-settings-project-used" }, `占用 ${pcNum(project.usedSlots, 0)}`),
		    );

		  return pcElement(
		    PcModal,
		    {
		      title: "设置",
		      subtitle: "工作台自己的模型、低/中/高工作量派发用的模型、以及同时能跑多少任务（并发槽位）。",
		      width: 700,
		      onClose: saving ? undefined : props.onClose,
		      footer: pcElement(
		        React.Fragment,
		        null,
		        pcElement(PcButton, { variant: "ghost", size: "md", onClick: props.onClose, disabled: saving }, "取消"),
		        pcElement(
		          PcButton,
		          { variant: "primary", size: "md", icon: "check", loading: saving, onClick: submit, testId: "pc-settings-save" },
		          "保存配置",
		        ),
		      ),
		    },
		    catalog.phase === "loading" ? pcElement("div", { className: "pc-hint" }, "正在读取模型目录…") : null,
		    catalog.error
		      ? pcElement("div", { className: "pc-note" }, `模型目录读取失败（${catalog.error}），模型改成手填 provider / model。`)
		      : null,
		    pcElement(
		      "div",
		      { className: "pc-settings-section" },
		      pcElement(PcSectionTitle, { icon: "robot" }, "工作台模型"),
		      pcElement("div", { className: "pc-note" }, "工程台会话（和工程台聊的那位）和工作量判定都用它。留空 = 部署默认。"),
		      pcElement(PcSettingsModelPicker, {
		        value: draft.workbench,
		        catalogView,
		        catalogEmpty,
		        disabled: saving,
		        testId: "workbench",
		        onChange: setWorkbench,
		      }),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-settings-section" },
		      pcElement(PcSectionTitle, { icon: "zap" }, "工作量模型"),
		      pcElement(
		        "div",
		        { className: "pc-note" },
		        "任务派发时按工作量档位选模型；留空 = 跟随项目 workerModel / 部署默认。",
		      ),
		      PC_WORKLOAD_TIERS.map(renderTier),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-settings-section" },
		      pcElement(PcSectionTitle, { icon: "check" }, "验收与上下文"),
		      pcElement(
		        "div",
		        { className: "pc-note" },
		        "验收链路固定：一次性判定器 → need_info 时宿主复跑项目验证 → 仍缺证据时只读深审 → accept 前宿主再复跑一次项目验证。",
		      ),
		      pcElement(
		        "div",
		        { className: "pc-settings-grid" },
		        pcElement(
		          "div",
		          { className: "pc-settings-cell" },
		          pcElement("span", { className: "pc-field-label" }, "验收执行者"),
		          pcElement(
		            PcSelect,
		            {
		              value: draft.reviewMode,
		              disabled: saving,
		              testId: "pc-settings-review-mode",
		              onChange: (value) => setDraft((previous) => Object.assign({}, previous, { reviewMode: value })),
		            },
		            pcElement("option", { value: "reviewer" }, "一次性判定器（推荐）"),
		            pcElement("option", { value: "lead" }, "lead 自动验收（旧行为）"),
		            pcElement("option", { value: "off" }, "关闭自动验收（只人工）"),
		          ),
		        ),
		        pcElement(
		          "div",
		          { className: "pc-settings-cell" },
		          pcElement("span", { className: "pc-field-label" }, "lead 上下文轮换阈值（tokens）"),
		          pcElement(PcInput, {
		            type: "number",
		            value: draft.leadCtxLimitTokens,
		            disabled: saving,
		            testId: "pc-settings-lead-ctx",
		            onChange: (value) => setDraft((previous) => Object.assign({}, previous, { leadCtxLimitTokens: value })),
		          }),
		        ),
		      ),
		      pcElement(PcSettingsModelPicker, {
		        value: draft.reviewer,
		        catalogView,
		        catalogEmpty,
		        disabled: saving,
		        testId: "reviewer",
		        onChange: (value) => setDraft((previous) => Object.assign({}, previous, { reviewer: value })),
		      }),
		      pcElement(
		        "div",
		        { className: "pc-settings-slot-row" },
		        pcElement("span", { className: "pc-field-label" }, "最多内联图片数"),
		        pcElement(PcInput, {
		          type: "number",
		          value: draft.reviewImageMax,
		          disabled: saving,
		          testId: "pc-settings-review-image-max",
		          onChange: (value) => setDraft((previous) => Object.assign({}, previous, { reviewImageMax: value })),
		        }),
		        pcElement("span", { className: "pc-hint" }, "1–8；只对视觉类任务生效"),
		      ),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-settings-section" },
		      pcElement(PcSectionTitle, { icon: "layers" }, "调度"),
		      pcElement(
		        "label",
		        { className: "pc-check" },
		        pcElement("input", {
		          type: "checkbox",
		          checked: draft.autoDispatch,
		          disabled: saving,
		          "data-testid": "pc-settings-auto-dispatch",
		          onChange: (event) => setDraft((previous) => Object.assign({}, previous, { autoDispatch: event.target.checked })),
		        }),
		        "自动派发（待办任务排到就派发；关掉后只能在任务上手动点「派发」）",
		      ),
		      pcElement(
		        "div",
		        { className: "pc-settings-slot-row" },
		        pcElement("span", { className: "pc-field-label" }, "全局并发槽位"),
		        pcElement(PcInput, {
		          type: "number",
		          value: draft.globalSlotBudget,
		          disabled: saving,
		          testId: "pc-settings-global-slots",
		          onChange: (value) => setDraft((previous) => Object.assign({}, previous, { globalSlotBudget: value })),
		        }),
		        pcElement(
		          "span",
		          { className: "pc-hint" },
		          `当前占用 ${pcNum(stateValue.slots && stateValue.slots.used, 0)} / ${pcNum(settings.globalSlotBudget, 8)}`,
		        ),
		      ),
		      pcElement(
		        "div",
		        { className: "pc-note" },
		        "并发按槽位算：任务按工作量占槽（低 1、中 2、高 4、极大 6），全局和项目上限谁先满谁挡派发。改完对后续派发生效，不动运行中的任务。",
		      ),
		      projects.length > 0
		        ? pcElement(
		            "div",
		            { className: "pc-settings-projects" },
		            pcElement("div", { className: "pc-settings-project-head" }, "项目并发槽位"),
		            projects.map(renderProjectSlot),
		          )
		        : null,
		    ),
		  );
		}

		/** 宿主未就绪空状态。 */
		function PcHostDownEmpty(props) {
		  const error = props.state.error;
		  return pcElement(
		    PcEmpty,
		    {
		      icon: "alert",
		      tone: "danger",
		      title: "工程台宿主未就绪",
		      desc: "页面本身已加载，但读不到宿主状态接口 GET /project-console-api/state。host 半边可能还在实现、还没加载，或者 DSH 需要重启一次。UI 会在状态可用后自动出现看板，不用刷新页面。",
		    },
		    error
		      ? pcElement(
		          "div",
		          { className: "pc-error-box", style: { textAlign: "left" } },
		          `${error.message}${uiStatusHint(error)}`,
		        )
		      : null,
		    pcElement(
		      "div",
		      { style: { marginTop: 12, display: "flex", gap: 8 } },
		      pcElement(PcButton, { variant: "primary", size: "md", icon: "refresh", loading: props.refreshing, onClick: props.onRetry }, "重试"),
		    ),
		    pcElement("div", { className: "pc-hint", style: { marginTop: 10 } }, "排查：curl 同源 /project-console-api/ping 应返回 {ok:true}；/state 由 host 侧提供。"),
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
		  return pcElement(
		    PcEmpty,
		    {
		      icon: "folder",
		      title: "还没有项目，先添加一个",
		      desc: "工程台会把需求派发到项目仓库的独立 worktree 里执行，跑完在测试分支上集成测试，人工确认后再推送到主干分支。",
		    },
		    pcElement(PcAddProjectForm, { toast: props.toast, onCreated: props.onCreated }),
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
		  return pcElement(
		    PcModal,
		    {
		      title: "新建需求",
		      subtitle: "创建后进入「待办」列；确认规格后点「派发」，宿主会建 worktree + 会话并开始执行。截图会随任务简报一起交给执行会话。",
		      width: 640,
		      onClose: submitting ? undefined : props.onCancel,
		      footer: pcElement(
		        React.Fragment,
		        null,
		        pcElement(PcButton, { variant: "ghost", size: "md", onClick: props.onCancel, disabled: submitting }, "取消"),
		        pcElement(
		          PcButton,
		          { variant: "primary", size: "md", icon: "plus", loading: submitting, onClick: submit, testId: "pc-new-task-submit" },
		          uploadStep || "创建任务",
		        ),
		      ),
		    },
		    pcElement(
		      PcField,
		      { label: "项目", required: true },
		      pcElement(
		        PcSelect,
		        { value: form.projectId, onChange: (value) => set("projectId", value), disabled: submitting },
		        projects.map((project) => pcElement("option", { key: project.id, value: project.id }, project.name)),
		      ),
		    ),
		    pcElement(
		      PcField,
		      { label: "任务标题", required: true },
		      pcElement(PcInput, {
		        value: form.title,
		        onChange: (value) => set("title", value),
		        placeholder: "一句话说清要做什么，例如：给页面加一个深色模式开关",
		        disabled: submitting,
		        testId: "pc-new-task-title",
		      }),
		    ),
		    pcElement(
		      PcField,
		      { label: "需求原文 / 简报", required: true, hint: "可以粘贴 PRD、设计稿说明、验收要点；写给执行会话看" },
		      pcElement(PcTextarea, {
		        value: form.brief,
		        onChange: (value) => set("brief", value),
		        onPaste: handlePaste,
		        placeholder: "粘贴需求原文或 PRD 摘要…\n\n背景、目标、约束、参考文件路径都可以写在这里；截图可以直接 Ctrl+V 粘贴到这里。",
		        rows: 7,
		        disabled: submitting,
		        testId: "pc-new-task-brief",
		      }),
		    ),
		    pcElement(
		      "div",
		      { className: "pc-attach-field" },
		      pcElement(
		        "div",
		        { className: "pc-attach-head" },
		        pcElement("span", { className: "pc-field-label" }, "参考截图"),
		        pcElement("span", { className: "pc-attach-count" }, `${attachmentCount} / ${PC_ATTACHMENT_MAX}`),
		        pcElement(
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
		      pcElement(
		        "div",
		        { className: "pc-attach-hint" },
		        "也可以直接在「需求原文」输入框里 Ctrl+V 粘贴剪贴板截图。最多 6 张、单张不超过 8MB（PNG / JPEG / WebP / GIF）。",
		      ),
		      pcElement("input", {
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
		        ? pcElement(
		            "div",
		            { className: "pc-attach-list" },
		            attachments.map((item, index) =>
		              pcElement(
		                "div",
		                { key: item.key, className: "pc-attach-item", "data-testid": `pc-attachment-${index}` },
		                item.previewUrl
		                  ? pcElement("img", { className: "pc-attach-img", src: item.previewUrl, alt: item.name })
		                  : pcElement(PcIcon, { name: "file", size: 18 }),
		                pcElement(
		                  "div",
		                  { className: "pc-attach-meta" },
		                  pcElement("span", { className: "pc-attach-name", title: item.name }, item.name),
		                  pcElement("span", { className: "pc-attach-size" }, pcFmtFileSize(item.size)),
		                ),
		                pcElement(
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
		                  pcElement(PcIcon, { name: "close", size: 11 }),
		                ),
		              ),
		            ),
		          )
		        : null,
		      uploadStep ? pcElement("div", { className: "pc-hint" }, uploadStep) : null,
		    ),
		    pcElement(
		      "div",
		      { className: "pc-form-grid pc-form-grid--2" },
		      pcElement(
		        PcField,
		        { label: "类型" },
		        pcElement(
		          PcSelect,
		          { value: form.type, onChange: (value) => set("type", value), disabled: submitting },
		          PC_TASK_TYPES.map(([value, label]) => pcElement("option", { key: value, value }, label)),
		        ),
		      ),
		      pcElement(
		        PcField,
		        { label: "优先级", hint: "数字越大越先派发" },
		        pcElement(PcInput, {
		          type: "number",
		          value: form.priority,
		          onChange: (value) => set("priority", value),
		          disabled: submitting,
		        }),
		      ),
		    ),
		    pcElement(
		      PcField,
		      { label: "预计触及路径", hint: "逗号分隔；用于冲突域提示，可留空" },
		      pcElement(PcInput, {
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
		  return pcElement(
		    PcModal,
		    {
		      title: isRework ? `打回任务 #${task.id}` : `放弃任务 #${task.id}`,
		      subtitle: isRework ? "意见会 followup 回原任务会话，任务重新进入运行中。" : "放弃会清理 worktree 与任务分支，patch 会保留在任务记录里。",
		      width: 540,
		      onClose: props.busy ? undefined : props.onCancel,
		      footer: pcElement(
		        React.Fragment,
		        null,
		        pcElement(PcButton, { variant: "ghost", size: "md", onClick: props.onCancel, disabled: props.busy }, "取消"),
		        pcElement(
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
		    pcElement("div", { className: "pc-question-text" }, task.title || `任务 #${task.id}`),
		    pcElement(
		      PcField,
		      { label: isRework ? "返工意见" : "放弃原因", required: true },
		      pcElement(PcTextarea, {
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
		    content = pcElement(PcEmpty, {
		      icon: "history",
		      title: "正在连接工程台…",
		      desc: "读取 GET /project-console-api/state。",
		    });
		  } else if (state.phase === "error") {
		    content = pcElement(PcHostDownEmpty, {
		      state,
		      refreshing,
		      onRetry: manualRefresh,
		    });
		  } else if (!hasProjects) {
		    content = pcElement(PcNoProjectsEmpty, {
		      toast,
		      onCreated: load,
		    });
		  } else {
		    content = pcElement(PcBoard, {
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

		  return pcElement(
		    "div",
		    { className: "pc-root", "data-testid": "pc-root" },
		    pcElement(PcTopBar, {
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
		      ? pcElement(PcStatBar, { state: value, counters })
		      : null,
		    ready && hasProjects
		      ? pcElement(PcQuestionsZone, {
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
		      ? pcElement(PcDetailDrawer, {
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
		      ? pcElement(PcSessionViewerDrawer, {
		          state: value,
		          taskId: transcriptTarget.taskId,
		          now,
		          onClose: () => setTranscriptTarget(null),
		        })
		      : null,
		    sessionsOpen && ready
		      ? pcElement(PcSessionsDrawer, {
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
		      ? pcElement(PcLeadChatDrawer, {
		          state: value,
		          toast,
		          onClose: () => setLeadChatOpen(false),
		          onPrompted: load,
		        })
		      : null,
		    integrationOpen && ready
		      ? pcElement(PcIntegrationDrawer, {
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
		      ? pcElement(PcSettingsDialog, {
		          state,
		          toast,
		          onClose: () => setSettingsOpen(false),
		          onSaved: load,
		        })
		      : null,
		    cancelTarget
		      ? pcElement(
		          PcModal,
		          {
		            title: "取消任务",
		            width: 500,
		            onClose: canceling ? undefined : () => setCancelTarget(null),
		            footer: pcElement(
		              React.Fragment,
		              null,
		              pcElement(PcButton, { variant: "ghost", size: "md", onClick: () => setCancelTarget(null), disabled: canceling }, "不取消"),
		              pcElement(
		                PcButton,
		                { variant: "danger", size: "md", icon: "close", loading: canceling, onClick: confirmCancelTask, testId: "pc-btn-cancel-confirm" },
		                "确认取消",
		              ),
		            ),
		          },
		          pcElement(
		            "div",
		            { className: "pc-question-text" },
		            `取消任务 #${cancelTarget.id}？会终止会话并把任务标记为已取消，可之后在已归档里点「继续」重做。`,
		          ),
		          pcElement(
		            "div",
		            { className: "pc-note" },
		            `任务「${cancelTarget.title || "未命名"}」当前状态：${pcStatusMeta(cancelTarget.status).label}。取消后任务进入已归档（分类：操作员取消），需要时可以点「继续」重新排队。`,
		          ),
		        )
		      : null,
		    deleteTarget
		      ? pcElement(
		          PcModal,
		          {
		            title: "彻底删除任务",
		            width: 480,
		            onClose: deleting ? undefined : () => setDeleteTarget(null),
		            footer: pcElement(
		              React.Fragment,
		              null,
		              pcElement(PcButton, { variant: "ghost", size: "md", onClick: () => setDeleteTarget(null), disabled: deleting }, "取消"),
		              pcElement(
		                PcButton,
		                { variant: "danger", size: "md", icon: "trash", loading: deleting, onClick: confirmDeleteTask, testId: "pc-btn-delete-confirm" },
		                "彻底删除",
		              ),
		            ),
		          },
		          pcElement(
		            "div",
		            { className: "pc-question-text" },
		            `彻底删除任务 #${deleteTarget.id}？该操作不可恢复。`,
		          ),
		          pcElement(
		            "div",
		            { className: "pc-note" },
		            `任务「${deleteTarget.title || "未命名"}」当前状态：${pcStatusMeta(deleteTarget.status).label}。删除会同时移除运行记录、澄清问题和任务会话；已合并到 base 的提交不受影响。`,
		          ),
		        )
		      : null,
		    prompt
		      ? pcElement(PcPromptModal, {
		          prompt,
		          busy: Boolean(busy[`${prompt.kind}-${prompt.task.id}`]),
		          toast,
		          onCancel: () => setPrompt(null),
		          onConfirm: confirmPrompt,
		        })
		      : null,
		    newTaskOpen && ready
		      ? pcElement(PcNewTaskDialog, {
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
		      ? pcElement(PcProjectsDialog, {
		          projects,
		          toast,
		          onDelete: requestDeleteProject,
		          onPolicyChange: updateProjectPolicy,
		          onCreated: load,
		          onClose: () => setProjectsOpen(false),
		        })
		      : null,
		    projectDeleteTarget
		      ? pcElement(
		          PcModal,
		          {
		            title: "删除项目",
		            width: 560,
		            onClose: deletingProject ? undefined : () => setProjectDeleteTarget(null),
		            footer: pcElement(
		              React.Fragment,
		              null,
		              pcElement(
		                PcButton,
		                { variant: "ghost", size: "md", onClick: () => setProjectDeleteTarget(null), disabled: deletingProject },
		                "取消",
		              ),
		              pcElement(
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
		          pcElement(
		            "div",
		            { className: "pc-question-text" },
		            `彻底删除项目「${projectDeleteTarget.name || projectDeleteTarget.id}」？该操作不可恢复。`,
		          ),
		          pcElement(
		            "div",
		            { className: "pc-note" },
		            `会连带删除名下 ${projectDeleteTasks.length} 个任务记录` +
		              (projectDeleteTasks.length > 0
		                ? `（待办 ${projectDeleteTodo} / 进行中 ${projectDeleteBusy.length} / 验收中 ${projectDeleteReview} / 已归档 ${projectDeleteDone}）`
		                : "") +
		              `，以及它们的运行记录、待澄清问题和集成批次；worktree、任务分支、验收报告和证据归档会一并清理。仓库 ${projectDeleteTarget.repoPath || "目录"} 本身和已合并到主干分支的提交不受影响。`,
		          ),
		          projectDeleteBusy.length > 0
		            ? pcElement(
		                "div",
		                { className: "pc-error-box" },
		                `项目还有 ${projectDeleteBusy.length} 个任务在执行（${projectDeleteBusy.map((task) => `#${task.id}`).join("、")}），先取消或等它们结束后再删。`,
		              )
		            : null,
		        )
		      : null,
		    pcElement(PcToastStack, { toasts, onDismiss: dismissToast }),
		  );
		}
		// ===== src/client/entry.js =====
		/**
		 * 工程台 client：入口（左栏一行 + main 整页注册）。
		 *
		 * 依据 CONTRACT.md §0 与 API.md §3.2：
		 *   - 左栏 sidebar.panellist 的 id 必须等于 main 的 key（宿主点左栏自动 selectPanel）。
		 *   - main 的 inject 返回页面 props；这里只注入宿主 ctx（页面里惰性 get 服务）。
		 * 所有注册都包 try/catch：宿主版本漂移时不至于把整个 client 半边带崩。
		 */

		const PC_INJECT = ["slots", "locale"];

		function pcLogError(where, error) {
		  try {
		    console.error(`[dsh-project-console] ${where} failed:`, error);
		  } catch {
		    /* ignore */
		  }
		}

		function pcApply(ctx) {
		  try {
		    pcEnsureStyles();
		  } catch (error) {
		    pcLogError("inject styles", error);
		  }

		  try {
		    if (ctx.locale && typeof ctx.locale.register === "function") {
		      const applyLocale = () => ctx.locale.register(PC_I18N_NS, pcDictionaries());
		      if (typeof ctx.effect === "function") ctx.effect(applyLocale, "dsh-project-console: locale dictionaries");
		      else applyLocale();
		      pcSetLocale(ctx.locale);
		    }
		  } catch (error) {
		    pcLogError("register locale dictionaries", error);
		  }

		  try {
		    ctx.slots.inject("sidebar.panellist", () =>
		      ctx.slots.register(
		        {
		          name: "sidebar.panellist",
		          id: PC_PANEL_ID,
		          order: 20,
		          locale: PC_I18N_NS,
		          label: () => pcT("工程台"),
		        },
		        ProjectConsoleIcon,
		      ),
		    );
		  } catch (error) {
		    pcLogError("register sidebar.panellist", error);
		  }

		  try {
		    ctx.slots.inject("main", () =>
		      ctx.slots.register(
		        {
		          name: "main",
		          key: PC_PANEL_ID,
		          locale: PC_I18N_NS,
		          inject: () => ({ ctx }),
		        },
		        ProjectConsolePage,
		      ),
		    );
		  } catch (error) {
		    pcLogError("register main panel", error);
		  }
		}

		exports.apply = pcApply;
		exports.inject = PC_INJECT;

		return module.exports;
	}
});
