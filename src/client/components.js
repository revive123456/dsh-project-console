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
