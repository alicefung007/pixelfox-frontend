# pixelfox

[English](README.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

PixelFox は、React、TypeScript、shadcn/ui で構築されたモダンなピクセルアート / アイロンビーズ図案エディタです（[pixelfox.art](https://pixelfox.art)）。

## ビジネス概要

現在の PixelFox は、クライアントサイドだけで動作する図案編集ワークスペースです。主なワークフローは次の通りです。

1. 空のキャンバスを作成する、または画像をアップロードする。
2. 画像を指定パレットに制限されたピクセル / ビーズグリッドへ変換する、または手動で描画・編集する。
3. システムパレット、キャンバス使用色、色の置換、色の削除で図案の色を管理する。
4. 作品をプレビューし、ブランド情報と使用色統計付きの PNG 図案をエクスポートする、または組み立てモードで色ごとに手順を進める。

現在のコードベースにはバックエンドの業務 API はありません。キャンバスデータ、エディタ設定、パレット設定、エクスポート設定、組み立て進捗はすべてブラウザの `localStorage` に保存されます。

## 技術スタック

- **フレームワーク**: React 19
- **ビルドツール**: Vite
- **言語**: TypeScript
- **スタイル**: Tailwind CSS v4
- **コンポーネント**: shadcn/ui (Radix UI)
- **状態管理**: Zustand
- **ルーティング**: React Router v7
- **i18n**: i18next
- **3D プレビュー**: Three.js, React Three Fiber, drei

## ルート構成

- `/`: メインエディタページ。キャンバス、サイドバー、パレットパネル、アップロードダイアログ、3D プレビュー、エクスポート、色置換ダイアログを含みます。
- `/assembly`: 独立した組み立てページ。組み立てフローをフルスクリーンで開き、閉じると `/` に戻ります。

`AppLayout` はアプリケーションシェルです。ナビゲーションバーとグローバル toast を描画し、アップロード、エクスポート、画像生成などの共有状態を React Router outlet context 経由でページへ渡します。

## コア業務ロジック

### キャンバス編集

キャンバス状態は `src/store/useEditorStore.ts` に集約されています。

- `pixels` は確定済みのピクセルマップです。key は `"x,y"`、value は hex 色です。
- `pixelBuffer` は高頻度描画向けの `Uint32Array` です。ブラシと消しゴムはまず buffer に書き込み、`saveHistory()` が buffer を `pixels` に同期します。
- キャンバスの初期サイズは `30 x 30` で、幅と高さはどちらも `1..200` ビーズセルに制限されます。
- undo / redo 履歴は `{ pixels, width, height }` のスナップショットを保存し、メモリ上で最大 30 件保持します。
- 現在のキャンバススナップショットは `pixelfox-editor-canvas-storage` に保存されます。大きなキャンバスで重い `localStorage` 書き込みを避けるため、完全な履歴永続化はデフォルトで無効です。
- 現在のツール、メイン色、背景色、ズームなどのエディタ設定は `pixelfox-editor-storage` に保存されます。

キャンバス描画と操作は `src/components/editor/PixelCanvas.tsx` と `src/components/editor/pixel-canvas/` 配下の hooks が連携して処理します。

- ブラシと消しゴムはポインタ移動を補間し、高速ドラッグ時の途切れを防ぎます。
- バケツは flood fill を使い、同色領域または連続した空白セルを塗りつぶします。
- スポイトは現在のピクセル色を取得し、自動でブラシに戻ります。
- 魔法の杖は連続した同色領域を選択し、削除 / 置換操作を提供します。
- 手のひらツール、ホイール、ピンチ操作、ツールバーでパンとズームを行えます。
- キャンバス端のリサイズハンドルで指定方向からサイズを変更し、既存ピクセルを移動または切り抜きます。

### 画像アップロードとピクセル化

アップロードフローは `src/components/editor/UploadPhotoDialog.tsx` と `src/lib/image-processor.ts` で実装されています。

ユーザーは画像をアップロードし、出力サイズ、アスペクト比の固定 / 解除、反転 / 回転、背景端のトリミング、システムパレット、色結合の強さを設定できます。

`convertImageToPixelArt()` の変換手順:

1. 元画像をオフスクリーン canvas に読み込む。
2. 目標ビーズサイズへリサイズする。
3. `poolSize` に従って局所ピクセルをプールし、各プールで最も多い可視色を採用する。
4. RGB を Lab 色空間へ変換する。
5. CIEDE2000 色差と k-d tree で最も近いパレット色を探す。
6. 色結合しきい値が 0 より大きい場合、BFS で隣接かつ色差が近い領域を結合し、領域の主色へ統一する。
7. `ImageData`、幅、高さ、ビーズ数、パレット id を返す。

`AppLayout.handleGenerate()` は変換結果を受け取り、非透明ピクセルをエディタ状態へ書き込み、キャンバスサイズを調整し、現在のシステムパレットを切り替え、現在の描画色を対象パレットの最近色へ再マッピングし、履歴を保存し、「使用色」タブを強調表示します。

### パレットと色管理

パレット状態は `src/store/usePaletteStore.ts` に集約されています。

- `currentPaletteId` は `src/lib/palettes/` のシステムパレットを指します。
- `usedColors` と `recentColors` は永続化され、件数上限があります。
- `activeTab` はパレットパネルで全色を表示するかキャンバス使用色を表示するかを制御します。
- `selectedUsedColor` は置換または削除対象として選択された使用色です。

`src/components/palette/PalettePanel.tsx` は主要なパレットワークフローを担当します。

- 「全色」タブは現在のシステムパレットの全スウォッチを表示します。
- 「使用色」タブは現在のキャンバススナップショットから色と数量を計算します。
- スウォッチをクリックするとエディタのメイン色が更新されます。
- 使用色を削除すると、キャンバス内の一致する全ピクセルを削除して履歴を保存します。
- ある使用色を別の使用色へドラッグすると、元色の全ピクセルを対象色へ置換します。
- 現在のキャンバス色を含まないパレットへ切り替える場合は確認ダイアログを表示し、続行するとキャンバスを消去してから切り替えます。

色置換ロジックは `src/lib/palette-replace.ts` に集約されています。hex 色の正規化、選択ピクセル範囲への限定、キャンバス更新、履歴保存、必要に応じた置換後色の選択を行います。

### 図案エクスポート

`src/components/editor/ExportPatternDialog.tsx` は現在のキャンバスをブランド付き PNG 図案としてエクスポートします。

エクスポート設定:

- 非空ピクセル領域への自動クロップ
- 白背景または透明背景
- メジャー / マイナーグリッド線
- グリッド間隔と色
- 座標軸
- セルごとの色番号
- ミラー反転
- 色番号と使用統計から近白色を除外

エクスポートレンダラーは次の内容を含む canvas 画像を生成します。

- ピクセルグリッド本体
- 任意の座標軸とグリッド線
- `public/logo_with_name.png` または `public/logo.png` を使ったブランドヘッダー
- パレット、サイズ、ビーズ数、サイトドメインなどの概要情報
- 使用数順の色統計バッジ

キャンバスが空の場合、サイドバーのエクスポート入口は無効になります。

### 組み立てモード

`src/components/editor/AssemblyDialog.tsx` は現在の図案を色ごとに組み立てるためのステップガイドを提供します。

- キャンバスピクセルを正規化色ごとに集計します。
- 各色を現在のパレットラベルへマッピングし、ラベルが存在しない場合はフォールバックラベルを使います。
- ステップはビーズ数の降順、次にラベル順で並びます。
- プレビューは現在ステップの色だけを強調し、他の色を淡く表示します。
- ユーザーは色の完了、ステップ移動、プレビューのズーム / パン、ミラー反転、グリッド / 座標軸 / 色番号表示、近白背景などの色除外を行えます。
- 進捗は図案署名ごとに永続化されます。署名はパレット id、キャンバスサイズ、ピクセル内容の hash から作られるため、現在の具体的な図案にだけ紐づきます。
- 除外されていない全色が完了すると、完了ダイアログを表示し confetti 演出を実行します。

### 3D プレビュー

`src/components/editor/Preview3DDialog.tsx` は Three.js を使って現在のピクセルグリッドを 3D ビーズプレビューとして描画します。ビーズ形状の定数は `src/lib/constants.ts` の `PREVIEW_3D_CONFIG` に定義されています。

### 国際化とテーマ

- i18n 設定は `src/i18n/config.ts` にあります。
- 翻訳ファイルは `src/i18n/locales/` にあり、現在は英語、中国語、韓国語、日本語に対応しています。
- テーマ切り替えは `src/components/theme-provider.tsx` が管理し、ナビゲーションバーから操作できます。

## 重要ファイル

- `src/App.tsx`: ルート定義。
- `src/components/layout/AppLayout.tsx`: アプリケーションシェルと画像生成結果の受け渡し。
- `src/pages/Editor.tsx`: メインエディタの構成。
- `src/pages/Assembly.tsx`: 独立組み立てルート。
- `src/store/useEditorStore.ts`: キャンバス、ツール、履歴、永続化、ダイアログ状態。
- `src/store/usePaletteStore.ts`: パレット、最近 / 使用色、パレットパネル UI 状態。
- `src/lib/image-processor.ts`: 画像ピクセル化とパレットマッチング。
- `src/lib/palettes/`: 内蔵パレット定義。
- `src/components/editor/PixelCanvas.tsx`: キャンバス描画と操作の統合。
- `src/components/palette/PalettePanel.tsx`: パレットタブ、使用色操作、パレット切り替え。
- `src/components/editor/ExportPatternDialog.tsx`: 図案画像の描画とダウンロード。
- `src/components/editor/AssemblyDialog.tsx`: 色ごとの組み立てフロー。

## ローカル起動

1. リポジトリをクローンします。
2. 依存関係をインストールします。

   ```bash
   pnpm install
   ```

3. 開発サーバーを起動します。

   ```bash
   pnpm dev
   ```

## 開発コマンド

- `pnpm dev`: 開発サーバーを起動。
- `pnpm build`: 本番ビルド。
- `pnpm lint`: ESLint を実行。
- `pnpm format`: Prettier でコードを整形。
- `pnpm typecheck`: TypeScript 型チェックを実行。
