# Modern Todo Dashboard (Vanilla JS)

[한국어](README.md) | [English](README.en.md) | [日本語](README.ja.md)

`HTML + CSS + Vanilla JavaScript`で作成したTodoダッシュボードです。  
ユーザー別Todo保存、リアルタイム時計、背景ローテーション、位置情報ベースの天気表示を1画面で提供します。

## 主な機能

### 1) ログインとアクセス制御
- 名前（2〜20文字）でログインし、`localStorage`に保存
- 再訪問時にログイン状態を自動復元
- ログイン前はTodo入力・フィルター・各種操作をロック
- `Change user`ボタンでログアウトしてユーザー切替
- 認証状態に応じて挨拶文と背景シャッフルボタンを表示制御

### 2) Todo管理
- Todo追加、完了/未完了切替、削除
- インライン編集対応（`Enter`で保存、`Escape`でキャンセル）
- 重複防止（大文字小文字を区別しない）と空白の正規化
- 入力長制限（最大80文字）
- フィルター: `All` / `Active` / `Done`
- `Clear completed`で完了Todoを一括削除
- ドラッグ＆ドロップで`Active` Todoの順序変更
- 集計表示: `active · done · total`

### 3) ユーザー別データ保存
- ユーザーごとにTodo保存キーを分離
- 保存キー: `todo.items:<normalized_username>`
- 初回ログイン時に旧キー`todo.items`から1回だけ移行
- 主な`localStorage`キー
  - `todo.username`
  - `todo.items:<username>`
  - `todo.lastBg`

### 4) 背景システム
- ダーク/ライトのテクスチャ画像プールからランダム選択
- アプリ起動時にランダム背景を適用
- 2分ごとに自動ローテーション
- `Shuffle background`で即時変更
- 2レイヤーのクロスフェード遷移
- 背景トーン（light/dark）に応じてUIクラスを自動切替

### 5) 時計・日付・挨拶
- リアルタイム時計（1秒ごと更新）
- 日付表示（`ko-KR`フォーマット）
- 時間帯ベースの挨拶表示
  - morning / afternoon / evening / night

### 6) 位置情報ベースの天気
- Geolocationで現在地を取得
- OpenWeather APIを呼び出し（摂氏・韓国語説明）
- 10分ごとに自動更新
- 権限拒否/ネットワーク/API失敗時は案内メッセージを表示

### 7) モジュール読み込み失敗時のフォールバック
- モジュールスクリプト失敗時でもログインフォームの基本動作を維持
- 最低限、ユーザー名保存と再読み込みの導線を確保

## 実行方法

1. ブラウザで`index.html`を直接開く
2. 位置情報の許可ダイアログが出たら許可する（天気機能を使う場合）
