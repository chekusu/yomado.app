import type { GuideCopy } from '../../lib/guides';
import type { ReleaseFacts } from '../../lib/site';

const SKILL = '<a href="https://github.com/chekusu/yomado/tree/main/skills/yomado">skills/yomado</a>';

export default (r: ReleaseFacts): GuideCopy => ({
  label: '指南',
  cta: '下载 Mac 版',
  ctaMeta: `免费开源 · v${r.version} · Apple Silicon · macOS 14 及以上`,
  updated: '核对于 {date}',
  guides: {
    compare: {
      linkText: 'Agent 屏幕方案对比',
      navText: '方案对比',
      meta: {
        title: 'Mac 上给 AI Agent 用的虚拟显示器：yomado、SpaceO、BetterDisplay、HDMI 欺骗器和虚拟机对比',
        description:
          '在 Mac 上给 Codex 等 computer use Agent 一块单独的屏幕、不再占用你的主屏，有几种做法：Agent 专用虚拟屏应用（yomado、SpaceO）、显示器工具、HDMI 欺骗器、macOS 虚拟机和后台输入。各自给 Agent 什么，什么时候该选哪个。',
      },
      eyebrow: '对比',
      title: '给 Agent|一块自己的屏。',
      lede: 'computer use Agent 靠截图、指针和键盘工作，它的应用总得显示在某块屏幕上。如果那块屏是你的，它就会盖住你正在做的事。下面是在 Mac 上给它一块单独屏幕的几种方法，以及各自需要你付出什么。',
      sections: [
        {
          id: 'short-answer',
          title: '简短回答',
          html: [
            '如果 Agent 要用你已经装好的应用、在你自己的登录会话里工作，就给它一块虚拟显示器：<strong>yomado</strong> 或 <strong>SpaceO</strong>。如果它完全不能碰你的文件、应用和账号，就让它在 <strong>macOS 虚拟机</strong>里运行。显示器工具或 HDMI 欺骗器也能多出一块屏，但给屏命名、把对的窗口放上去、再拿回来，都得你自己来。',
          ],
        },
        {
          id: 'at-a-glance',
          title: '一览',
          table: {
            caption: '在 Mac 上给 computer use Agent 一块单独屏幕的方法',
            head: ['', 'Agent 得到什么', '应用和文件', '截图和输入', '费用'],
            rows: [
              ['yomado', '命名的虚拟屏，每个 Agent 一块；任务窗口移进去，做完移回来', '你的会话和你已装的应用', 'Agent 自己的 computer use 工具；共用一套指针和键盘', '免费，MIT'],
              ['SpaceO', '每个 Agent 会话一块虚拟屏，带一个查看器，可以旁观和接管', '你的会话；原生应用和 Chromium', '它自带的 MCP 服务器和命令行', '免费，MIT'],
              ['显示器工具（BetterDisplay、BetterDummy）', '额外的虚拟显示器，为人设计', '你的会话', 'Agent 用什么就是什么', '基础虚拟屏免费，更多功能付费'],
              ['HDMI 或 USB-C 欺骗器', '每个插头一块固定的假显示器', '你的会话', 'Agent 用什么就是什么', '几十元，占一个接口'],
              ['macOS 虚拟机（terminal-mac、Tart、Lume）', '一台有自己桌面的独立 Mac', '分开：应用要在虚拟机里重新安装和登录', '虚拟机里或外的工具', '工具免费；更占内存和 CPU'],
            ],
          },
          after: ['SpaceO 的信息来自它的 Product Hunt 页面。各项目的最新情况请以项目本身为准。'],
        },
        {
          id: 'yomado-or-spaceo',
          title: 'yomado 还是 SpaceO',
          html: [
            '两者都在你自己的会话里为 Agent 添加虚拟显示器，都免费、采用 MIT 许可证，都需要 macOS 14 及以上的 Apple Silicon Mac。区别在于 Agent 的“眼睛和手”从哪里来。',
            'SpaceO 自带一套：能读屏、点击、输入和截图的 MCP 服务器与命令行，以及一个旁观并接管会话的查看器。yomado 只提供屏幕。Agent 继续用它已有的 computer use 工具，比如 Codex computer use；yomado skill 教它建一块以自己命名的屏，只把本次任务的窗口移过去，做完再放回来。',
            '想要一个连操作应用都包办的整套方案，选 SpaceO。如果 Agent 已经有你信得过的 computer use 工具，又希望在一个面板里看到并调整各块命名的屏，选 yomado。',
          ],
        },
        {
          id: 'display-utilities',
          title: '显示器工具和 HDMI 欺骗器',
          html: [
            'BetterDisplay（前身是 BetterDummy）和 HDMI 或 USB-C 欺骗器都能让 macOS 认为接了另一台显示器。对无头 Mac mini 或合盖使用来说这就够了。但用于 Agent 工作时，其余的都要你自己安排：哪些应用放过去、怎么拿回来、哪块屏归哪个 Agent。',
            'yomado 负责的正是这部分。每块屏都带着 Agent 的名字，控制面板显示每块屏和上面的应用，关闭一块屏时会先把它的窗口送回你的显示器。',
          ],
        },
        {
          id: 'virtual-machines',
          title: '虚拟机',
          html: [
            'terminal-mac、Tart 和 Lume 运行一个独立的 macOS 客户机。这是真正的隔离：Agent 看不到你的文件、窗口和账号。代价是多了一台要照看的 Mac：应用要在里面重新安装和登录，更占内存和 CPU，而且一台 Mac 同时最多运行两台 macOS 虚拟机。',
            'Agent 必须远离你的会话时，用虚拟机。目的是让它用你已有的应用干活时，用虚拟显示器。',
          ],
        },
        {
          id: 'background-input',
          title: '后台输入',
          html: [
            '有些 Agent 工具（比如 Codex computer use）可以在后台操作应用，不移动你的指针。这样它不会抢你的鼠标，但应用窗口还是摆在你的屏幕上。虚拟显示器把它们挪开。两者可以一起用：应用支持时用后台输入，Agent 的窗口放在它自己的屏上。',
          ],
        },
        {
          id: 'limits',
          title: 'yomado 不做什么',
          items: [
            '它不是沙箱。Agent 在你的登录会话里、以你的身份工作。',
            '你和 Agent 共用同一套指针、键盘和焦点。',
            '它是实验软件，使用 macOS 私有 API，系统更新可能导致它失效。',
            '关闭实体显示器后的 Agent 工作尚未验证。',
            '它的界面是简体中文。',
          ],
        },
      ],
      faq: {
        title: '常见问题',
        items: [
          {
            q: '在 Mac 上给 AI Agent 一块独立的虚拟显示器，最好的办法是什么？',
            a: '用一款为 Agent 添加虚拟显示器的应用，比如 yomado 或 SpaceO。Agent 的应用显示在那块屏上，你的应用留在你的显示器上。如果必须让 Agent 完全碰不到你的文件和应用，改用 macOS 虚拟机。',
          },
          {
            q: 'yomado 能替代 SpaceO 吗？',
            a: '就屏幕本身而言可以。两者都在你的会话里给 Agent 一块自己的虚拟显示器，都免费开源。yomado 把截图和输入交给 Agent 已有的 computer use 工具；SpaceO 为此自带 MCP 服务器和命令行。',
          },
          {
            q: '给 Agent 一块屏，需要 HDMI 欺骗器吗？',
            a: '不需要。yomado 用软件创建屏幕。欺骗器仍是让无头 Mac 以为接了显示器的简单办法，但每个插头只有一块固定的屏，也管不了哪些窗口放上去。',
          },
          {
            q: '有了虚拟显示器，Agent 就不会占用我的屏幕了吗？',
            a: '它让 Agent 的窗口离开你的屏幕。输入仍然是共用的：一个登录会话只有一套指针和键盘，所以在应用允许时，优先用能在后台操作的 Agent 工具。',
          },
        ],
      },
    },
    codexBlender: {
      linkText: '让 Codex 用 Blender',
      navText: 'Codex + Blender',
      meta: {
        title: 'Codex computer use 操作 Blender：给它一块单独的虚拟屏（Mac）',
        description:
          '在 Apple Silicon Mac 上用 yomado 给 Codex 一块操作 Blender 的虚拟屏：需要准备什么、怎么安装 skill、该怎么跟 Codex 说，以及 3D 视口和共用指针要注意什么。',
      },
      eyebrow: '指南',
      title: 'Codex 用 Blender，|在自己的屏上。',
      lede: '当 Blender 任务要用到视口、菜单或对话框，或者没有现成的 MCP 工具时，Codex 就像你一样操作它：截图、指针和按键。给它一块虚拟屏来做这些事，你自己的窗口就能留在原处。',
      sections: [
        {
          id: 'what-you-need',
          title: '需要准备',
          items: [
            'macOS 14 及以上的 Apple Silicon Mac。',
            'yomado，并开启辅助功能权限，让它能移动窗口。',
            '配置好 computer use 的 Codex：安装 Computer Use 插件，并授予屏幕录制和辅助功能权限。',
            'Blender，以及要让 Codex 处理的文件。',
          ],
        },
        {
          id: 'set-up',
          title: '设置',
          steps: [
            '下载 yomado，解压后打开 <strong>Yomado.app</strong>。点击面板中的锁形图标，在系统设置里为它开启辅助功能。',
            `把 yomado 仓库里的 ${SKILL} 文件夹放到 <code>$CODEX_HOME/skills</code>（默认为 <code>~/.codex/skills</code>），下一轮对话 Codex 就能用。`,
            '打开 Blender 和你的文件。',
            '然后这样告诉 Codex：',
          ],
          request: '用 $yomado 为这次任务准备一块名为“Codex · Blender”的虚拟屏。只移动本次任务的窗口，确认你能看到并操作它们，完成后把它们恢复原位。',
        },
        {
          id: 'what-codex-does',
          title: 'Codex 会做什么',
          html: [
            '有了 skill，Codex 会通过 yomado 自己的面板操作：建一块以自己命名的屏，只把 Blender 的窗口移过去，截一张新图并试一个可撤销的操作，确认能看到也能操作，然后开始任务。做完后它会把窗口移回来，或者关闭这块屏，关闭时会先把窗口送回去。',
            '你也可以手动完成：在 yomado 面板里点「＋ 新建屏幕」，命名为 Codex，选 1920 × 1080 或 2560 × 1440，再把 Blender 移过去。',
          ],
        },
        {
          id: 'blender-tips',
          title: '用 Blender 时的建议',
          items: [
            '在视口里旋转、平移视图和使用模态工具，需要真实的指针和键盘事件，而你的登录会话只有一个指针。Codex 在视口里操作时，别动鼠标。',
            '先用 1920 × 1080。HiDPI 会让长宽各翻一倍，屏幕要截取的像素变成四倍。',
            '每次加屏、关屏或窗口移动后，先让 Codex 重新截图再点击：之前的坐标已经对不上了。',
            '保持 Mac 登录且未锁屏，并保持 yomado 运行：退出 yomado 会关闭它的屏。',
          ],
        },
        {
          id: 'other-apps',
          title: '其他应用',
          html: ['同样的步骤也适用于 Marvelous Designer，以及其他 Codex 通过截图和点击操作的桌面应用。给每个 Agent 一块自己命名的屏，上面只放它这次任务的应用。'],
        },
        {
          id: 'verified',
          title: '已经验证了什么',
          items: [
            'yomado 的影片展示了 Codex 操作 Blender，但那是模拟演示，不是 Agent 实际工作的录像。',
            '在一次实机测试中，计算器被移到虚拟屏上，新截图显示它在那里，输入 2 + 3 再按回车得到 5，之后它回到了原来的位置和大小。',
            '关闭实体显示器后的 Agent 工作，以及长时间无人值守运行，都还没有验证。',
          ],
        },
      ],
      faq: {
        title: '常见问题',
        items: [
          {
            q: 'Codex 需要 Blender 的 MCP 服务器吗？',
            a: '不需要。用 computer use 时，Codex 通过截图、指针和键盘工作。yomado 只添加屏幕，不需要应用专用的 MCP 集成。',
          },
          {
            q: 'Codex 会抢走我的鼠标吗？',
            a: '它的窗口留在它自己的屏上。输入是共用的：当 Codex 发送真实的指针事件（Blender 视口需要这样）时，它移动的就是你用的那个指针，所以那时请别动鼠标。',
          },
          {
            q: 'Codex 用 Blender 时，我还能继续工作吗？',
            a: '可以，在你显示器上的自己的窗口里。Codex 在视口里操作时别碰指针和键盘，并让 Mac 保持唤醒、登录且未锁屏。',
          },
        ],
      },
    },
  },
});
