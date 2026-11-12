/**
 * 工程台 client：入口（左栏一行 + main 整页注册）。
 *
 * 依据 CONTRACT.md §0 与 API.md §3.2：
 *   - 左栏 sidebar.panellist 的 id 必须等于 main 的 key（宿主点左栏自动 selectPanel）。
 *   - main 的 inject 返回页面 props；这里只注入宿主 ctx（页面里惰性 get 服务）。
 * 所有注册都包 try/catch：宿主版本漂移时不至于把整个 client 半边带崩。
 */

const PC_INJECT = ["slots"];

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
    ctx.slots.inject("sidebar.panellist", () =>
      ctx.slots.register(
        {
          name: "sidebar.panellist",
          id: PC_PANEL_ID,
          order: 20,
          label: () => "工程台",
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
