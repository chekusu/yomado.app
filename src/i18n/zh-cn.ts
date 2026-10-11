import type { ReleaseFacts } from '../lib/site';
import type { Copy } from './types';

export default (r: ReleaseFacts): Copy => ({
  meta: {
    title: 'yomado 夜窗 — 为视觉 Agent 准备的 macOS 虚拟屏',
    description:
      'yomado 在 Mac 上为 Codex 等视觉 Agent 创建虚拟屏，让它们通过截图与键鼠操作桌面软件，无需应用专用 MCP。实验版本，免费开源。',
    ogAlt: 'yomado 夜窗 — 给 Agent 一扇亮着的窗。',
  },
  skip: '跳到正文',
  nav: {
    label: '主导航',
    how: '工作方式',
    faq: '常见问题',
    github: 'GitHub',
    download: '下载',
    switchText: 'EN',
    switchLabel: 'English',
    home: 'yomado 首页',
  },
  hero: {
    eyebrow: '为视觉 Agent 准备的 macOS 虚拟屏',
    titleHtml: '给 Agent 一扇|<em>亮着的窗</em>。',
    lede: '为 Codex 等视觉 Agent 创建虚拟屏，让它们通过截图与键鼠操作桌面软件，无需应用专用 MCP。',
    aside: '只把 Agent 需要的窗口移过去，你的窗口留在你的屏幕上。',
    cta: '下载 macOS 实验版',
    ctaMeta: `v${r.version} · Apple Silicon · ${r.size}`,
    secondary: '在 GitHub 查看',
    fineHtml: '实验版本：ad hoc 签名，未经 Apple 公证，仅支持 Apple Silicon。<a href="#download">详细说明</a>',
    figTitle: 'yomado 的工作方式',
    figDesc: 'Agent 的应用窗口从你的显示器移入一块名为 Codex、亮着的虚拟屏。你的显示器暗下来休息，Agent 在自己的窗口里截图并点击。',
    labelVirtual: '虚拟屏 · Codex',
    labelPhysical: '你的显示器',
    caption: '示意图。关闭显示器后继续运行是设计目标，仍在验证中。',
    replay: '重播',
  },
  why: {
    kicker: '为什么需要它',
    title: '视觉 Agent|也需要一块屏幕。',
    paragraphs: [
      'Codex 等 Agent 可以像人一样工作：看截图、找到控件，再点击和输入。这样它们能直接使用 Blender、Marvelous Designer 等桌面软件的原生界面——适合缺少合适的应用专用 MCP，或需要操作三维视图、菜单和对话框的工作。',
      '但应用只会把界面画在显示器上，截图也需要能截取的画面。只为让后台 Agent 看得见就一直亮着实体显示器，并不划算。yomado 用纯软件为 Agent 的窗口提供一块专属屏幕：不需要显卡欺骗器，也不需要付费显示器软件。',
    ],
    roles: [
      { name: '你的 Agent', text: '看截图、做判断、移动指针和输入，用的是你已有的工具。' },
      { name: 'yomado', text: '提供显示桌面：可命名的虚拟屏，用来放 Agent 需要的窗口。' },
      { name: '你', text: '自己的窗口继续留在实体屏上。' },
    ],
    sharedTitle: '同一个桌面，共用输入。',
    sharedText: '虚拟屏属于当前登录会话。你和 Agent 共用同一套键盘、指针和焦点——它不是另一台电脑、另一个用户，也不是输入隔离环境。',
    notHtml: 'yomado 不是 Agent，|不是远程桌面，|也不替代 MCP。|<em>它只负责提供显示桌面。</em>',
    plateAlt: '概念示意：夜晚书桌上两台熄屏的显示器和一台保持运行的 Mac，旁边漂浮着一块虚拟屏，显示 Blender 和服装设计窗口以及 Agent 的光标。',
    plateCaption: '概念示意，AI 生成。关闭显示器后继续运行是设计目标，尚未完成验证。',
  },
  how: {
    kicker: '工作方式',
    title: '命名一块屏，|移入窗口，|交给 Agent。',
    steps: [
      {
        title: '创建命名虚拟屏',
        textHtml:
          '点 <kbd>+</kbd> 新建虚拟屏或启动已保存的屏幕，再按使用它的 Agent 命名，比如「Codex」「GrokBot」。可选 1920 × 1080 或 2560 × 1440，以及 HiDPI。新屏幕会排在现有布局的右侧。',
      },
      {
        title: '只移入它需要的应用',
        textHtml:
          '从这块屏的 <kbd>+</kbd> 菜单选择应用，或把应用图标拖进来，它的窗口就会移过去，其他窗口原地不动。把图标拖回或使用返回操作即可归还；回到原来那块显示器时，窗口会恢复原来的位置和大小。',
      },
      {
        title: '交给现有的 Agent',
        textHtml:
          '让 Codex 或其他视觉 Agent 使用这块虚拟屏。截图和键鼠输入由它自己的工具完成，yomado 只负责让这块屏一直在。正式交给任务之前，先确认一次新截图和一次可撤销的输入。',
      },
    ],
    noteTitle: '需要知道',
    noteText: '登录或重启后，虚拟屏不会自动重建。关闭一块虚拟屏时，会先把窗口送回实体屏；无法确认恢复时会保留这块屏。退出 yomado 会关闭全部虚拟屏。',
  },
  app: {
    kicker: '应用本身',
    title: '一个小面板，|看清|每块屏上有什么。',
    textHtml:
      'yomado 是原生 AppKit 菜单栏应用。面板按桌面顺序、按比例排列实体屏和虚拟屏，应用图标就显示在它所在的屏幕里。悬停可查看应用名和窗口数；<kbd>+</kbd> 新建或重新启动屏幕，<kbd>…</kbd> 用于重命名或关闭。虚拟屏存在期间，yomado 会请求系统和图形桌面保持唤醒。',
    imageAlt: 'yomado 控制面板：两块 Studio Display 实体屏卡片和一块名为 Codex、分辨率 1920 × 1080 的虚拟屏卡片，各自显示应用图标。',
    caption: '控制面板由应用使用示例显示器数据渲染。界面语言为简体中文。',
    testedTitle: '已在 Apple Silicon 上验证',
    tested: [
      '原生 Apple Silicon 构建。',
      '通过面板的应用菜单，把计算器从实体屏移入名为 Codex 的虚拟屏，再转到名为 GrokBot 的虚拟屏。',
      '在 GrokBot 上重新截图可以看到计算器；键入 2 + 3 并回车，得到 5。',
      '把计算器送回后，恢复了原来的位置和大小。',
      '关闭单块虚拟屏时，先送回计算器，再移除这块屏。',
    ],
    pendingTitle: '尚未验证',
    pending: ['实体显示器真正关闭后的 Agent 操作', '节电效果', '长时间无人值守运行', '直接拖动图标移屏，以及关闭一块屏同时保留另一块'],
    sourceHtml: `更多细节与测试记录见<a href="${r.appRepository}/blob/main/README.zh-CN.md">项目说明</a>。`,
  },
  download: {
    kicker: '下载',
    title: `yomado ${r.version}`,
    lede: '适用于 Apple Silicon Mac 的实验版本，基于 MIT 许可证免费开源。',
    cta: '下载 macOS 实验版',
    ctaMeta: `${r.fileName} · ${r.size}`,
    specs: [
      { term: '版本', value: `${r.version}（build ${r.build}）· 预发布 · ${r.date}` },
      { term: 'Mac', value: 'Apple Silicon（arm64），不提供 Intel 版本。' },
      { term: 'macOS', value: '以 macOS 14 为部署目标，并非所有 14 及以上版本都经过测试。' },
      { term: '签名', value: 'ad hoc 签名，未经 Developer ID 签名或公证。' },
      { term: '界面语言', value: '简体中文' },
    ],
    hashLabel: 'SHA-256',
    copy: '复制',
    copied: '已复制',
    copyFallback: '已选中，按 ⌘C 复制',
    notes: '版本说明',
    checksums: '校验和',
    source: '源代码',
    firstRunTitle: '首次打开',
    firstRunHtml: [
      '解压后打开 <strong>Yomado.app</strong>。它常驻菜单栏，关闭面板不会退出应用。',
      '这个版本未经公证，macOS 可能会要求你确认。请按 Mac 的常规安全策略决定，或从源码自行编译。',
      '移动窗口需要辅助功能权限。点击面板中的锁形图标会打开系统设置中的对应页面，由你自己开启。',
    ],
    verifyTitle: '校验文件',
  },
  faq: {
    kicker: '常见问题',
    title: '几个问题，|直接回答。',
    items: [
      {
        q: 'yomado 是 Agent 吗？',
        aHtml: '不是。它不看屏幕、不做判断，也不按键。这些由 Codex 或其他视觉 Agent 用自己的截图和输入工具完成；yomado 提供这些应用运行所需的显示屏。',
      },
      {
        q: '它是远程桌面或 MCP 服务器吗？',
        aHtml: '都不是。它不传输你的桌面画面，也不提供 API。如果应用有好用的 MCP 集成，请直接使用；yomado 面向的是 Agent 需要通过应用原生界面工作的时候。',
      },
      {
        q: 'Agent 会有独立的键盘和鼠标吗？',
        aHtml: '不会。虚拟屏属于当前登录会话，你和 Agent 共用同一套键盘、指针和焦点，使用桌面前请先协调好。',
      },
      {
        q: 'Agent 工作时可以关掉显示器吗？',
        aHtml:
          '这是 yomado 的设计目标，但尚未验证：实体显示器真正关闭后的 Agent 操作、节电效果和长时间无人值守运行都还没有结论。yomado 也无法关闭显示器电源或测量功耗。',
      },
      {
        q: '支持哪些 Mac？',
        aHtml: 'Apple Silicon 构建已验证。macOS 14 是部署目标，不代表所有 macOS 14 及以上版本都经过测试。目前不提供 Intel 版本。',
      },
      {
        q: '为什么打开时 macOS 会提示警告？',
        aHtml: '应用采用 ad hoc 签名，没有经过 Apple 公证。请按 Mac 的常规安全策略决定，或从源码自行编译。',
      },
      {
        q: '它会改动我的 Mac 吗？',
        aHtml:
          '它会创建和移除虚拟屏，并移动你选择的窗口；不会改动密码、锁屏、屏幕保护程序或登录设置，保持唤醒的请求也不会解锁你的 Mac。它依赖 macOS 私有 API，系统更新可能导致它失效。',
      },
      {
        q: '它开源吗？',
        aHtml: `开源，采用 MIT 许可证。应用与发布版本位于 <a href="${r.appRepository}">github.com/chekusu/yomado</a>，本网站源码位于 <a href="${r.siteRepository}">github.com/chekusu/yomado.dev</a>。`,
      },
    ],
  },
  footer: {
    navLabel: '页脚',
    tagline: '为视觉 Agent 留一块工作屏。',
    releases: '发布版本',
    license: 'MIT 许可证',
    fine: '使用 macOS 私有 API 的实验软件。Codex、GrokBot、Blender、Marvelous Designer 与 macOS 均属于各自的所有者，提及不代表背书。',
  },
  notFound: {
    meta: '页面不存在 — yomado',
    title: '这扇窗暗着。',
    text: '这个地址没有内容。下载和其他信息都在首页。',
    home: '回到 yomado',
  },
});
