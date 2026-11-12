# dsh-project-console（工程台）

工程台是 DeepSeek Harness Web 的多需求工作台。你写需求，工程台在仓库外为每条需求开一个独立 worktree，起一个 agent 会话自己改、自己跑测试、自己交证据；验收通过后进集成，人工确认后再推进本地主干分支。

你要做的主要是三件事：写需求、看结果、确认推送。

## 适合什么场景

- 同一个仓库上并行推进多条需求，改动互不污染。
- 想让 agent 自己写、自己测，但验收前要有人把关。
- 改动要能追溯：diff、自测命令、证据截图、验收记录都挂在任务上。
- 不想每条需求都手动开分支、拷目录、清现场。

## 功能

- **并行需求**：每条需求有自己的 worktree 和 agent 会话，互不覆盖。
- **自动验收**：任务跑完自动检查证据和项目验证命令，通过后进已验收，不通过自动返工或转人工。
- **人工把关**：可以自己看 diff 和证据验收，也可以打回、补指令、放弃或继续。
- **集成批次**：把已验收任务攒成一批，先跑集成测试；通过后人工确认，才推进本地主干分支。
- **可回滚**：推送后可回滚到合并前，任务回到已验收，可以重新集成。
- **待澄清**：需求有歧义时，工程台把问题放到看板，你回答后任务继续。
- **会话面板**：任务会话收在工程台里，不占左侧栏。
- **验收报告**：已验收任务可下载单文件 HTML，证据截图内联，离线可看，也能打印成 PDF。
- **参考截图**：提需求时可以贴截图，任务会话能直接查看。

## 安装

### 前置要求

- Node.js `^22.19` 或 `>=24`
- pnpm（`dsh plugin` 会把命令转发给 pnpm；可用 `npm i -g pnpm` 或 `corepack enable`）
- 已能运行 DSH Web（桌面版或浏览器版）

### 安装步骤

```bash
git clone https://github.com/revive123456/dsh-project-console.git
cd dsh-project-console
dsh plugin --profile desktop add "$PWD"
```

- `desktop` 是桌面版常见的 profile 名；浏览器版通常是 `web`。不确定时看 `~/.dsh/profiles` 下的目录名。
- 仓库已经带上 `lib/` 构建产物，直接 `add` 即可；改了 `src/` 再执行 `npm run build` 和 `npm run build:host`。
- 装好后重启 DSH Web 或桌面版，左栏出现「工程台」。

升级：

```bash
cd dsh-project-console
git pull
npm run build
npm run build:host
```

然后重启 DSH Web / 桌面版。

## 使用

### 添加项目

顶栏「项目」→ 添加：填仓库路径、主干分支、worktree 根目录、验证命令等。字段说明见下面「项目配置」。

### 提需求

点「新建需求」，写标题和需求原文，可以贴参考截图。工作量（xs/s/m/l/xl）由 AI 判定，不用手选；判断不合适可以在任务详情里重估。

### 任务自己跑

派发后，工程台在 worktree 里起会话来干活。这些会话不占左侧栏，入口在顶栏「会话」。

任务状态依次是：待办 → 运行中 → 验收中 → 已验收 → 已合并，另外还有待澄清、失败、已放弃。

- 需求有歧义时，工程台会把问题放进「待澄清」，你回答后任务继续。
- 自测失败会自动返工；也可以手动打回或继续。
- 已验收但还没合并的任务，改动在任务分支上；想保留就先进集成批次。

### 验收

任务跑完进入验收。默认由工程台看 diff、自测命令和证据，给通过、返工或要补充证据；判定通过前还会在 worktree 里复跑项目验证命令，失败自动打回。

也可以自己看 diff 和证据人工验收。验收完成的任务能下载验收报告：单文件 HTML，证据截图内联，离线可看，浏览器打印就是 PDF。

### 集成与推送

把待集成的任务攒成一批，点顶部「集成」：从主干建测试分支，逐任务合并，跑集成测试，出批次结果。

结果没问题再人工确认「推送到 main」：本地 fast-forward，不推远端仓库。出问题可以回滚，回滚后任务回到已验收，可以重新集成。

### 设置

顶栏「设置」：

- 工作台模型：工程台会话和工作量判定用哪个模型。
- 工作量模型：低 / 中 / 高各自派发用哪个模型。
- 调度：自动派发、全局和项目并发槽位。
- 验收：验收方式、判定器模型、最多内联图片数等。

## 项目配置

```jsonc
{
  "name": "my-project",
  "repoPath": "/abs/path/to/repo",
  "baseBranch": "main",
  "worktreeRoot": "/abs/worktree/root",
  "slotBudget": 8,                       // 项目并发槽位
  "workerFilePolicy": "workspace-write", // 只允许写 worktree；信任模式用 danger-full-access
  "workerModel": {"provider": "mtcode", "model": "deepseek-flash", "reasoningEffort": "max"},
  "setup": {"copy": [], "commands": ["cp -a /repo/node_modules ./node_modules"]},
  "verify": {"commands": ["npm run typecheck", "npx vitest run --silent"]},
  "integrationTests": {"commands": ["npm run typecheck", "npx vitest run --silent"]}
}
```

`repoPath`、`baseBranch`、`worktreeRoot` 必填。`verify.commands` 是验收前工程台复跑的命令，建议配上；`integrationTests.commands` 是集成批次里跑的命令，留空则跳过。`setup.commands` 在派发前于 worktree 里执行，用来拷依赖；`workerModel` 是档位模型没配时的兜底。

## 安全边界

- 工程台在本机以你的用户权限运行 git 和 shell 命令。只对可信仓库、可信需求使用。
- `workspace-write` 限制任务会话写 worktree，不限制读取。不要把凭据放在 agent 能读到的位置；需要完整信任时才会用 `danger-full-access`。
- 工程台 API 挂在 DSH Web 服务上，默认只监听本机；写请求有同源挡板，但不是身份认证。不要把 DSH Web 端口暴露到公网。
- 删除项目、删除任务、回滚、推送到主干都是强操作。删除项目会连带删除任务分支和 worktree；已验收但未合并的改动也会一起清掉，先集成或先确认不再需要。
- 任务会话的执行时间、上下文和 token 消耗由 DSH 管理；长任务或大仓库会明显更慢、更贵。

## 开发与测试

```bash
npm test          # 构建 host/client，然后跑回归探针
npm run build     # 只构建 client
npm run build:host
```

回归探针在 `probe/`，覆盖回滚、验收门禁、状态机、路径守卫、HTTP 请求体等边界。

## 代码结构

```
src/index.js      host 入口
src/core.js       状态、路径、shell
src/git.js        worktree / 分支 / 集成批次 / 推送到主干
src/service.js    项目、任务、派发、证据、验收、调度
src/report.js     验收报告（单文件 HTML）
src/http.js       /project-console-api 路由
src/tools.js      project_* 模型工具
src/mount.js      装配层
src/client/       前端看板
lib/engine.mjs    host 构建产物
lib/client.js     client 构建产物
build-host.mjs    host 构建脚本
build.mjs         client 构建脚本
probe/            回归探针
```

## License

[MIT](LICENSE)
