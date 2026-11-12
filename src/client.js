/**
 * dsh-project-console 的 client 入口说明（本文件不参与构建）。
 *
 * 真正的入口源在 src/client/ 下，`node build.mjs` 按下列固定顺序拼进
 * window.__ModuleLoader__.load({ id: "dsh-project-console", factory(require) {...} })
 * 的闭包里，产出 lib/client.js；dsh-client-hmr 每 500ms 轮询该产物，
 * 已打开的页面会自动换新（无需刷新，React 状态会丢）。
 *
 *   src/client/util.js         状态/时间/错误文案等纯函数、图标路径表
 *   src/client/api.js          同源 fetch 封装（/project-console-api）
 *   src/client/css.js          全量样式字符串 + 注入 style 标签
 *   src/client/components.js   PcButton / PcBadge / PcModal / PcIcon 等通用件
 *   src/client/board.js        统计条、待澄清区、四列看板与任务卡片
 *   src/client/detail.js       任务详情抽屉（520px，轮询 GET /task）
 *   src/client/integration.js  集成与合并抽屉（发集成 / 批次报告 / 推送到 main / 回滚）
 *   src/client/app.js          整页状态机：轮询 /state、顶栏、弹窗、空状态、Toast
 *   src/client/entry.js        左栏一行 + main 整页的 slot 注册（apply/inject）
 *
 * 约束：不能用 JSX、不能 import npm 包、React 用 factory 闭包里的 require("react")。
 * 接口契约见工程台 host 路由与 client 模块注释。
 */
