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
