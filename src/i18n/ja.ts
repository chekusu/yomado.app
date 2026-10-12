import type { ReleaseFacts } from '../lib/site';
import type { Copy } from './types';

// The site is in Japanese; the app itself is not. Its interface is Simplified Chinese only, and
// the copy says so wherever the interface comes up.
export default (r: ReleaseFacts): Copy => ({
  meta: {
    title: 'yomado 夜窗 — エージェントに、専用の画面を',
    description:
      'yomado は Mac に仮想の作業画面を追加します。Codex などのエージェントがスクリーンショットとクリック・入力で Blender や Marvelous Designer などのアプリを操作でき、アプリ専用 MCP は不要です。無料・オープンソースの実験版です。',
    ogAlt: 'yomado 夜窗 — エージェントに、専用の画面を。',
  },
  skip: '本文へ移動',
  nav: {
    label: 'メイン',
    details: '詳細',
    download: 'ダウンロード',
    language: '言語',
    home: 'yomado ホーム',
  },
  hero: {
    title: 'エージェントに、|専用の画面を。',
    sub: 'Blender や Marvelous\u00a0Designer に、仮想の作業画面を。Codex などのエージェントがスクリーンショットを見て、クリック・入力。アプリ専用 MCP は不要です。',
    cta: 'Mac 版をダウンロード',
    meta: `実験版 · v${r.version} · Apple シリコン`,
    film: {
      label:
        'コンセプト映像、16 秒、音声なし。Mac のディスプレイの横に、Codex という名前の仮想画面が開きます。3D アプリがそこへ移り、ほかのウィンドウはそのまま。2 つ目の画面 GrokBot が自分のアプリとともに開きます。やがて夜になり、2 つの画面が yomado のマークに変わります。',
      caption: 'コンセプト映像です。実際のディスプレイを消した状態での動作は、実機ではまだ検証していません。',
      play: '映像を再生',
      pause: '映像を一時停止',
      replay: '映像をもう一度再生',
      fallback: 'お使いのブラウザではこの動画を再生できません。',
    },
  },
  story: {
    label: '使い方',
    acts: [
      { title: '画面をつくる。|名前を付ける。', text: '仮想ディスプレイを追加して、使うエージェントの名前を付けます。' },
      { title: '必要なアプリだけ、|エージェントの|画面へ。', text: 'エージェントが使うアプリだけを送ります。ほかのウィンドウは元の場所のまま。' },
      { title: 'エージェントごとに、|ひとつの画面。', text: 'Codex にひとつ、GrokBot にもひとつ。それぞれ自分のアプリを置けます。' },
    ],
  },
  panel: {
    title: 'すべての画面を、|ひとつのパネルで。',
    text: 'ディスプレイを実際の比率で並べ、アプリはそれぞれが置かれた画面に表示します。',
    imageAlt:
      'yomado のコントロールパネル。Studio Display 2 台のカードと、1920 × 1080 の仮想画面「Codex」のカード。各カードに、その画面にあるアプリのアイコンが並んでいます。',
    caption: 'サンプルのディスプレイ情報を表示したコントロールパネル。アプリの表示言語は簡体字中国語です。',
  },
  finale: {
    title: '灯りのともる窓を、|エージェントに。',
    cta: 'Mac 版をダウンロード',
    meta: `実験版 ${r.version} · Apple シリコン · macOS 14 以降 · 無料・オープンソース`,
    details: 'インストールと検証',
    source: 'GitHub のソースコード',
  },
  footer: {
    navLabel: 'フッター',
    tagline: 'エージェントのための作業画面。',
    details: '詳細',
    releases: 'リリース',
    source: 'アプリのソースコード',
    site: 'ウェブサイトのソースコード',
    license: 'MIT ライセンス',
    fine: 'macOS のプライベート API を使う実験的なソフトウェアです。Codex、GrokBot、macOS はそれぞれの所有者に帰属し、名称の記載は推奨を意味するものではありません。',
  },
  details: {
    meta: {
      title: `yomado ${r.version} — インストール、チェックサム、動作環境`,
      description: `Apple シリコン搭載 Mac 向け yomado ${r.version} のダウンロード。動作環境、インストール手順、アーカイブの検証方法、まだ検証していない点をまとめています。`,
    },
    eyebrow: '詳細',
    title: `yomado ${r.version}`,
    lede: 'Apple シリコン搭載 Mac 向けの実験版。MIT ライセンスの無料オープンソースです。',
    cta: 'Mac 版をダウンロード',
    ctaMeta: `${r.fileName} · ${r.size}`,
    specsTitle: '動作環境',
    specs: [
      { term: 'バージョン', value: `${r.version}（ビルド ${r.build}）· プレリリース · ${r.date}` },
      { term: 'Mac', value: 'Apple シリコン（arm64）。Intel 版はありません。' },
      { term: 'macOS', value: 'macOS 14 以降を対象にビルドしています。すべてのバージョンでテストしたわけではありません。' },
      { term: '署名', value: 'CHEKUSU の Developer ID で署名し、Apple の公証を受けています。' },
      { term: '表示言語', value: '簡体字中国語のみ' },
    ],
    installTitle: 'インストール',
    installHtml: [
      'zip を展開して <strong>Yomado.app</strong> を開きます。メニューバーに常駐し、パネルを閉じても終了しません。',
      'アプリには Apple の公証チケットを添付しています。ダウンロードしたアプリを初めて開く際、macOS が確認を求めることがあります。',
      'ウィンドウの移動にはアクセシビリティの許可が必要です。パネルの鍵アイコンからシステム設定の該当ページが開くので、ご自身でオンにしてください。',
    ],
    verifyTitle: 'ダウンロードを検証',
    verifyText: 'アーカイブの SHA-256 が次の値と一致することを確認してください：',
    hashLabel: 'SHA-256',
    copy: 'コピー',
    copied: 'コピーしました',
    copyFallback: '選択しました。⌘C でコピーできます',
    knowTitle: '知っておきたいこと',
    know: [
      'yomado が用意するのはディスプレイだけです。スクリーンショットの取得と入力は、エージェント自身のツールで行います。',
      '仮想画面はログイン中のセッションの一部なので、キーボード、ポインタ、フォーカスはあなたとエージェントで共有します。',
      'yomado を終了すると仮想画面は閉じ、再起動しても自動では作り直されません。',
      'まだ検証していないこと：物理ディスプレイを消した状態でのエージェントの操作、省電力効果、長時間の無人運用。',
    ],
    links: { notes: 'リリースノート', checksums: 'チェックサムファイル', source: 'アプリのソースコード', site: 'ウェブサイトのソースコード' },
    back: 'yomado のトップに戻る',
  },
  notFound: {
    meta: 'ページが見つかりません — yomado',
    title: 'この窓は暗いままです。',
    text: 'このアドレスには何もありません。ダウンロードはトップページから。',
    home: 'yomado のトップへ',
  },
});
