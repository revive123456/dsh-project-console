/**
 * 工程台 host 半边 · 装配层（打进 lib/engine.mjs 单文件 bundle）。
 *
 * 为什么单独 build：dsh-hmr 对已链接包的替换只可靠地替换「被 loader 直接 import 的入口模块」，
 * 入口静态 import 的兄弟模块改动不一定被逐出（实测：改 service.js 后 tick 一直跑旧代码）。
 * 因此 build-host.mjs 把 core/git/service/http/tools 打成一个 no-relative-import 的
 * lib/engine.mjs，thin entry（src/index.js）用 ?v=<mtime> 动态 import —— 改任何 host 逻辑
 * 后重新 build + 触发 profile 重组即可整包换新，无需重启桌面版。
 */
export function mount(ctx) {
  const core = makeCore(ctx);
  core.log("工程台 host 半边启动", core.stateDir);

  // 状态先加载（异步，不阻塞注册；后续操作按需 await ensureState）。
  ensureState(core).then(
    async () => {
      core.log("状态就绪，项目数", core.state.projects.length, "任务数", core.state.tasks.length);
      try {
        await reclaimOrphanDispatches(core);
      } catch (error) {
        core.log("回收孤儿派发失败", String(error));
      }
    },
    (error) => core.log("状态加载失败", String(error)),
  );

  // ── HTTP 路由 ──────────────────────────────────────────────
  ctx.inject(["webServer"], (httpCtx) => {
    const handler = createHandler(core);
    httpCtx.effect(
      () => httpCtx.webServer.register({ kind: "prefix", path: ROUTE_PREFIX, handler }),
      "dsh-project-console: /project-console-api routes",
    );
    core.log("已注册路由", ROUTE_PREFIX);
  });

  core.log("apply: phase routes done");
  // ── 模型工具（lead super agent 用） ─────────────────────────
  try {
    ctx.inject(["tools"], (toolCtx) => {
      const dispose = registerTools(core, toolCtx);
      toolCtx.effect(() => dispose, "dsh-project-console: model tools");
    });
  } catch (error) {
    core.log("tools 注入失败（模型工具不可用）", String(error));
  }

  core.log("apply: phase tools done");
  // ── 内部 preset 不上架：工程台自己 resolve/mount，不进 DSH 的模式列表 ──
  hideInternalPresets(core);
  core.log("apply: phase preset-visibility done");
  // ── 会话事件观察：turn 结束 → 归集证据 ──────────────────────
  ctx.effect(() => {
    const off = ctx.on("session/event", (session, event) => {
      try {
        const sid = session?.id;
        if (sid) {
          const summary = summarizeEvent(event);
          if (summary) {
            if (!core.lastEvents) core.lastEvents = new Map();
            core.lastEvents.set(sid, summary);
            if (core.lastEvents.size > 400) {
              const first = core.lastEvents.keys().next().value;
              core.lastEvents.delete(first);
            }
          }
        }
        if (event?.type === "turn/end") {
          void handleTurnEnd(core, session, event).catch((error) => core.log("handleTurnEnd 失败", String(error)));
        } else if (event?.type === "agent/status" || event?.type === "turn/start") {
          const sessionId = session?.id;
          if (sessionId && core.state?.lead?.sessionId === sessionId) {
            core.state.settings.leadStatus = event.type === "turn/start" ? "running" : "idle";
          }
        }
      } catch (error) {
        core.log("session/event 处理失败", String(error));
      }
    });
    return () => { try { off?.(); } catch { /* ignore */ } };
  }, "dsh-project-console: evidence observer");

  core.log("apply: phase session-event done");
  // agent/status 的另一路（status: running/idle），用于 lead 状态显示。
  ctx.effect(() => {
    const off = ctx.on("agent/status", (payload) => {
      try {
        const sessionId = payload?.agent?.session?.id;
        if (!sessionId || !core.state) return;
        if (core.state.lead?.sessionId === sessionId) {
          core.state.settings.leadStatus = payload.status === "running" ? "running" : "idle";
        }
      } catch { /* ignore */ }
    });
    return () => { try { off?.(); } catch { /* ignore */ } };
  }, "dsh-project-console: agent status observer");

  core.log("apply: phase agent-status done");
  // ── 定时调度：队列泵 + 磁盘采样 ─────────────────────────────
  ctx.effect(() => {
    let busy = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      (async () => {
        try {
          await ensureState(core);
          await tick(core);
          await sampleDisk(core);
        } catch (error) {
          core.log("tick 失败", String(error));
        } finally {
          busy = false;
        }
      })();
    }, 5000);
    if (typeof timer.unref === "function") timer.unref();
    core.log("apply: scheduler tick installed");
    return () => clearInterval(timer);
  }, "dsh-project-console: scheduler tick");
  core.log("apply: phase timer done");
}

// loadState 保留导出便于调试/测试（避免打包器 tree-shake 提醒）。
export const __internals = { ensureState, saveNow };

/** 工程台内部使用、不该作为「模式」暴露给用户的 preset。 */
const INTERNAL_PRESET_IDS = ["project-lead"];

/**
 * 把工程台内部 preset 从 Agent 预设 roster 里摘掉。
 *
 * 这版 DSH 的 preset 定义没有「隐藏」字段：注册了就会出现在设置卡片和新任务的模式选择器里。
 * lead 会话走的是 agentPresets.resolve() + mount()，不经过 remoteExportList（客户端拿 roster
 * 的唯一出口），所以只包住这个方法——preset 照常注册、解析、挂载，工程台行为不变。
 * 升级后 DSH 若改了方法名，过滤会静默失效（列表里重新出现 project-lead），不影响会话创建。
 */
function hideInternalPresets(core) {
  const presets = svc(core, "agentPresets");
  if (presets === undefined || typeof presets.remoteExportList !== "function") {
    core.log("preset roster 过滤跳过：agentPresets 不可用");
    return;
  }
  const proto = Object.getPrototypeOf(presets);
  const original = proto?.remoteExportList;
  if (typeof original !== "function") {
    core.log("preset roster 过滤跳过：remoteExportList 不存在");
    return;
  }
  if (original.__projectConsoleHidden === true) return;
  const filtered = async function (...args) {
    const roster = await original.apply(this, args);
    if (!roster || !Array.isArray(roster.presets)) return roster;
    return { ...roster, presets: roster.presets.filter((row) => !INTERNAL_PRESET_IDS.includes(row?.id)) };
  };
  Object.defineProperty(filtered, "__projectConsoleHidden", { value: true });
  proto.remoteExportList = filtered;
  // 按客户端拿 roster 的同一条路径读一次：日志里能看到实际可见的 preset id。
  Promise.resolve(presets.remoteExportList()).then(
    (roster) => core.log("preset roster 可见项:", (roster?.presets ?? []).map((row) => row.id).join(",") || "(空)"),
    (error) => core.log("读取 preset roster 失败", String(error?.message ?? error)),
  );
}
