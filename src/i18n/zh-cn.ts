import type { ReleaseFacts } from '../lib/site';
import type { Copy } from './types';

export default (r: ReleaseFacts): Copy => ({
  meta: {
    title: 'yomado 夜窗 — 给 Agent 一块屏幕',
    description:
      'yomado 在 Mac 上为 Codex 等视觉 Agent 开一块虚拟屏，让它们通过截图与键鼠操作 Blender、Marvelous Designer 等应用，无需应用专用 MCP。免费开源，实验版本。',
    ogAlt: 'yomado 夜窗 — 给 Agent 一块屏幕。',
  },
  skip: '跳到正文',
  nav: {
    label: '主导航',
    details: '详情',
    download: '下载',
    language: '语言',
    home: 'yomado 首页',
  },
  hero: {
    title: '给 Agent|一块屏幕。',
    sub: '为 Blender、Marvelous\u00a0Designer 等应用留一块虚拟屏。Codex 等 Agent 用截图与键鼠操作，无需应用专用 MCP。',
    cta: '下载 Mac 版',
    meta: `实验版本 · v${r.version} · Apple Silicon`,
    film: {
      label:
        '概念短片，16 秒，无声。Mac 显示器旁打开一块名为 Codex 的虚拟屏；一个三维应用移入其中，其他窗口原地不动；第二块名为 GrokBot 的屏幕带着自己的应用打开；夜幕降临，两块屏化作 yomado 的标志。',
      caption: '概念演示；实体屏关闭后的运行尚待实机验证。',
      play: '播放短片',
      pause: '暂停短片',
      replay: '重播短片',
      fallback: '你的浏览器无法播放此视频。',
    },
  },
  story: {
    label: '用法',
    acts: [
      { title: '开一块屏，|起个名字。', text: '新建一块虚拟屏，用将要使用它的 Agent 来命名。' },
      { title: '应用搬过去，|桌面留给你。', text: '只把 Agent 要用的应用送过去，其他窗口原地不动。' },
      { title: '每个 Agent，|各有一块屏。', text: 'Codex 一块，GrokBot 一块，各放各的应用。' },
    ],
  },
  panel: {
    title: '所有屏幕，|一个面板。',
    text: '按比例排开每块屏，应用就显示在它所在的屏上。',
    imageAlt: 'yomado 控制面板：两块 Studio Display 实体屏卡片和一块名为 Codex、分辨率 1920 × 1080 的虚拟屏卡片，各自显示其上应用的图标。',
    caption: '控制面板，示例显示器数据。界面语言为简体中文。',
  },
  finale: {
    title: '给 Agent|一扇|亮着的窗。',
    cta: '下载 Mac 版',
    meta: `实验版本 ${r.version} · Apple Silicon · macOS 14 及以上 · 免费开源`,
    details: '安装与校验',
    source: 'GitHub 源代码',
  },
  footer: {
    navLabel: '页脚',
    tagline: '为视觉 Agent 留一块工作屏。',
    details: '详情',
    releases: '发布版本',
    source: '应用源码',
    site: '网站源码',
    license: 'MIT 许可证',
    fine: '使用 macOS 私有 API 的实验软件。Codex、GrokBot 与 macOS 均属于各自的所有者，提及不代表背书。',
  },
  details: {
    meta: {
      title: `yomado ${r.version} — 安装、校验与系统要求`,
      description: `下载适用于 Apple Silicon Mac 的 yomado ${r.version}：系统要求、安装步骤、如何校验压缩包，以及哪些功能尚未验证。`,
    },
    eyebrow: '详情',
    title: `yomado ${r.version}`,
    lede: '适用于 Apple Silicon Mac 的实验版本，基于 MIT 许可证免费开源。',
    cta: '下载 Mac 版',
    ctaMeta: `${r.fileName} · ${r.size}`,
    specsTitle: '系统要求',
    specs: [
      { term: '版本', value: `${r.version}（build ${r.build}）· 预发布 · ${r.date}` },
      { term: 'Mac', value: 'Apple Silicon（arm64），不提供 Intel 版本。' },
      { term: 'macOS', value: '以 macOS 14 为部署目标，并非所有 14 及以上版本都经过测试。' },
      { term: '签名', value: 'ad hoc 签名，未经 Developer ID 签名或公证。' },
      { term: '界面语言', value: '简体中文' },
    ],
    installTitle: '安装',
    installHtml: [
      '解压后打开 <strong>Yomado.app</strong>。它常驻菜单栏，关闭面板不会退出应用。',
      '这个版本未经公证，macOS 可能会要求你确认。请按 Mac 的常规安全策略决定，或从源码自行编译。',
      '移动窗口需要辅助功能权限。点击面板中的锁形图标会打开系统设置中的对应页面，由你自己开启。',
    ],
    verifyTitle: '校验下载',
    verifyText: '把压缩包的 SHA-256 与下面的值比对：',
    hashLabel: 'SHA-256',
    copy: '复制',
    copied: '已复制',
    copyFallback: '已选中，按 ⌘C 复制',
    knowTitle: '需要知道',
    know: [
      'yomado 只提供显示屏，截图和键鼠输入由 Agent 自己的工具完成。',
      '虚拟屏属于当前登录会话，你和 Agent 共用同一套键盘、指针和焦点。',
      '退出 yomado 会关闭它的虚拟屏，重启后不会自动重建。',
      '尚未验证：实体显示器关闭后的 Agent 操作、节电效果和长时间无人值守运行。',
    ],
    links: { notes: '版本说明', checksums: '校验和文件', source: '应用源码', site: '网站源码' },
    back: '回到 yomado 首页',
  },
  notFound: {
    meta: '页面不存在 — yomado',
    title: '这扇窗暗着。',
    text: '这个地址没有内容。下载在首页。',
    home: '回到 yomado',
  },
});
