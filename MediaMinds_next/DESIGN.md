# MediaMinds 前端设计规范 · Brutalism（粗野主义）

> 参考 **UI/UX Pro Max** 的 `brutalism` 风格条目 + `Kinetic Brutalism (Space Grotesk)` 字体搭配。
> 本文件是页面改版的唯一视觉依据，新增页面请遵循。

---

## 1. 核心原则：裸露结构，拒绝修饰

粗野主义是**反设计**取向。它不追求「精致」，而是把结构直接暴露出来：

| 做法 | 规定 |
| --- | --- |
| 圆角 | **一律 0px**，不允许任何圆角 |
| 阴影 | **一律取消**，层次由 **3px 实心描边** 表达 |
| 过渡动画 | **禁止**（`transition: none`），状态瞬时切换 |
| 背景 | 铺 **可见网格线**，结构不隐藏 |
| 色彩 | 纯原色（蓝 `#0000FF` / 红 `#FF0000` / 黄 `#FFFF00`）+ 黑白 |
| 字重 | 700–900，标题可用 `uppercase` + 负字距 |

---

## 2. 设计令牌

### 2.1 CSS 变量（`globals.css`，由 `<html data-theme>` 切换）

| 变量 | 用途 |
| --- | --- |
| `--mm-bg` | 页面底色（白 / 黑） |
| `--mm-sunken` | 灰底色块：引用、代码、图片占位、凹陷区 |
| `--mm-text` / `--mm-text-2` / `--mm-text-3` | 正文 / 次要 / 弱化 |
| `--mm-border-color` | 描边色（浅色=黑，深色=白） |
| `--mm-grid` | 背景网格线颜色 |
| `--mm-accent` | 主操作色（纯蓝） |
| `--mm-accent-text` | 蓝色**作为文字**时使用（已保证 4.5:1） |
| `--mm-accent-contrast` | 蓝底上的文字色 |
| `--mm-red` / `--mm-yellow` / `--mm-blue` | 纯原色填充 |
| `--mm-raised-sm` / `--mm-raised` / `--mm-raised-lg` / `--mm-raised-xl` | **外描边**（2/3/4/5px 环） |
| `--mm-sunken-sm` / `--mm-sunken` / `--mm-sunken-lg` | **内描边**（2/3/4px 环） |
| `--mm-float` | 浮层：外描边 + 硬偏移块 |

> ⚠️ `--mm-raised-*` / `--mm-sunken-*` 这套名字是历史遗留（早期新拟态版本），
> **现在它们不是阴影，而是描边环**。用 `box-shadow` 画环的好处：不占盒模型、不造成布局位移。

在 JS 里取色用 `const { mm } = useTheme()`，例如 `mm.info`、`mm.accentText`、`mm.text`。

### 2.2 两套配色

| | 浅色（默认） | 深色 |
| --- | --- | --- |
| 底色 | `#FFFFFF` | `#000000` |
| 描边 | `#000000` | `#FFFFFF` |
| 主操作 | `#0000FF` | `#2B2BFF` |
| 强调色（文字） | `#0000FF` | `#8C8CFF` |

> 深色模式下**纯原色不可读**（`#0000FF` 在黑底上对比度仅 2.4:1），
> 因此文字用色单独给了一组提亮变体（`accentText` / `info` / `success` / `warning` / `danger`），
> **填充色仍是纯原色**。

### 2.3 字体

**Space Grotesk**（拉丁 + 数字）+ 系统黑体回落（中文）：`PingFang SC / Microsoft YaHei / Noto Sans SC`。
字体栈已内置在 MUI `typography.fontFamily`，组件里**不要**再指定 `fontFamily`。

---

## 3. 元素语义（必须一致）

| 元素 | 表达方式 |
| --- | --- |
| 卡片 | 白底 + **3px 外描边**，圆角 0 |
| 卡片悬停 | **瞬时**换成灰底（`--mm-sunken`），不做位移、不加投影 |
| 主按钮 | 纯蓝填充 + 白字；按下 `translate(3px,3px)` 且描边消失 |
| 次按钮（outlined） | 白底 + 描边；悬停变灰底 |
| 图标按钮 | 白底 + 2px 描边；按下位移 |
| 输入框 | 白底 + 2px 描边；聚焦时描边换成主操作色 |
| 分段控件 | 整体一个框，格与格之间 1px 分隔；**选中格整体反白** |
| 导航项 | **选中项整体反白**（黑底白字 / 白底黑字）+ 方块指示器 |
| 表格 | 表头反白（黑底白字），行悬停变灰底 |
| 弹窗 / 菜单 | 外描边 + **硬偏移块**（`10px 10px 0`），这是唯一允许的「投影」 |
| 图片上的浮层控件 | 白/黑底 + 描边，**不要**半透明 |
| 圆形 | **不允许**。头像、播放按钮、徽章一律方形 |

**MUI 主题已覆盖**：Button / IconButton / Card / Paper / TextField / Select / Tabs / Tab /
ToggleButton(Group) / Chip / Avatar / Dialog / Menu / MenuItem / Tooltip / Drawer / Slider /
Switch / LinearProgress / Skeleton / Table / Accordion / Alert / ListItemButton。

> 页面里**尽量不要再写 `boxShadow`**——直接用主题效果。只有特殊构件（封面浮层、色块选择器）才手写。

---

## 4. 布局约定

- **页面标题由 `AppShell` 统一渲染**（`UserLayout` 的 `META` 表）。页面内**不要再放 `PageHeader`**。
- 顶栏右侧固定顺序：`headerActions` → `ThemeToggle` → 用户菜单。
- 内容区左右留白：`px: { xs: 2, md: 3.5 }`，由 AppShell 提供。
- 栅格用 `@/components/common/AutoGrid`（`minWidth` 控制最小列宽）。
- **播放器在侧边栏内**（导航与用户名片之间），占正常文档流，**不是浮层**，因此永远不会遮挡页面内容。
  内容：44px 专辑框 + 上一首/播放暂停/下一首，单行。音频元素在 `AudioEngine`（全局唯一），
  播放器 UI 无状态、可复用——移动端（无侧边栏）复用它渲染为贴底条，此时 AppShell 自动给内容区加底部留白。
- 侧边栏、内容区都是**实心面板 + 描边**，不透明；背景网格只在缝隙里透出来。

---

## 5. 无障碍红线

1. **正文对比度 ≥ 4.5:1**：强调色当文字用 `--mm-accent-text` / `mm.accentText`，不要用 `--mm-accent`。
2. **焦点可见**：全局 `*:focus-visible` 已有 3px 主色描边，**不要 `outline: none`**。
3. **点击目标 ≥ 44×44px**。
4. **图标一律用 MUI SVG 图标，不用 emoji**。
5. **不要只靠颜色传达状态**：选中项除反白外还有方块指示器 / 更粗描边 / 文字标签。
6. **阅读页夜间底色**必须同时切换文字色（见 `book/read/[id]` 的 `THEMES[key].fg`），否则黑底黑字。

---

## 6. 常用片段

```tsx
// 描边卡片（悬停瞬时变灰底）
<Card className="mm-hover-lift" sx={{ p: 3 }}>…</Card>

// 灰底色块（引用、说明、危险区）
<Box sx={{ p: 2.5, bgcolor: 'var(--mm-sunken)', boxShadow: 'var(--mm-sunken-sm)' }}>…</Box>

// 反白选中态
sx={{ bgcolor: active ? 'var(--mm-text)' : 'transparent', color: active ? 'var(--mm-bg)' : 'var(--mm-text-2)' }}

// 取色
const { mm } = useTheme();
```

---

## 7. 反模式（评审时直接打回）

- 任何非 0 的 `borderRadius`（含 `'50%'`）
- 任何柔和/模糊阴影（`box-shadow` 只允许「描边环」或「硬偏移块」）
- 任何 `transition` / 入场动画（骨架屏与加载指示除外）
- 渐变背景（`linear-gradient` / `radial-gradient`）
- 写死颜色——一律走令牌
- 页面内重复渲染标题（`PageHeader` 已废弃）
- 用 emoji 当图标
- 移除焦点环
