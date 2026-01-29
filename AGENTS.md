# Air Guitar Pro - エージェント開発ガイド

このガイドは、AIエージェントがプロジェクトのパターン、規約、コマンドを理解するためのものです。

---

## プロジェクト構造

```
air_guitar_03/
├── backend/          # FastAPI WebSocket シグナリングサーバー
│   ├── main.py
│   └── requirements.txt
├── frontend/         # React + TypeScript + Vite
│   ├── App.tsx
│   ├── components/   # React コンポーネント
│   │   ├── Lobby.tsx
│   │   ├── PCPlayer.tsx
│   │   └── MobileController.tsx
│   ├── services/     # TypeScript サービスクラス
│   │   ├── WebRTCService.ts
│   │   └── AudioEngine.ts
│   │   ├── ProgressService.ts  # 進捗管理サービス
│   ├── types.ts
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── .prettierrc.json
│   ├── knip.config.ts
│   ├── vitest.config.ts
│   ├── package.json
│   └── package-lock.json
│   └── components/__tests__/ # テストファイル
└── spec/plan/     # 設計・要件・タスク
└── AGENTS.md       # エージェント開発ガイド（本ファイル）
```
air_guitar_03/
├── backend/          # FastAPI WebSocket シグナリングサーバー
│   ├── main.py
│   └── requirements.txt
├── frontend/         # React + TypeScript + Vite
│   ├── App.tsx
│   ├── components/   # React コンポーネント
│   ├── services/     # TypeScript サービスクラス
│   ├── types.ts
│   └── vite.config.ts
```

---

## コマンド

### フロントエンド (React + TypeScript)
```bash
cd frontend

# 開発サーバー（ポート3000、ホスト0.0.0.0）
npm run dev

# プロダクションビルド
npm run build

# プロダクションビルドのプレビュー
npm run preview
```

### バックエンド (FastAPI)
```bash
cd backend

# 依存関係のインストール
pip install -r requirements.txt

# 自動リロード付きで開発
uvicorn main:app --reload

# プロダクション
uvicorn main:app --host 0.0.0.0 --port $PORT

# 環境変数
PORT=8000
ENVIRONMENT=production
```

### テスト
**テストフレームワークはまだ構成されていません。** テストを追加する前に、以下を確認してください：
- テスト設定がプロジェクトのパターンと一致していること（フロントエンドは React Testing Library、バックエンドは pytest）
- テストが正常に実行され、既存の機能を壊さないこと

---

## コードスタイルガイドライン

### フロントエンド (TypeScript + React)

**インポート**
- 順序: React → 外部ライブラリ → 内部モジュール → 型定義
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { WebRTCService } from './services/WebRTCService';
import { AppRole } from './types';
```

**コンポーネント構造**
```typescript
// TypeScript インターフェースを使用する関数コンポーネント
interface Props {
  onSelect: (role: AppRole, roomId: string) => void;
  initialRoomId?: string;
}

const MyComponent: React.FC<Props> = ({ onSelect, initialRoomId }) => {
  const [state, setState] = useState<string>('');
  // フック → ハンドラー → レンダーの順序
  return <div>...</div>;
};
export default MyComponent;
```

**サービスクラス**
```typescript
export class MyService {
  private field: Type;  // private フィールドを使用
  public method(): ReturnType {
    // 実装
  }
}
```

**命名規約**
- コンポーネント: PascalCase (`Lobby`, `PCPlayer`)
- 関数/変数: camelCase (`handleRoleSelect`, `roomId`)
- 定数: UPPER_SNAKE_CASE (`API_URL`)
- インターフェース: PascalCase（`I` プレフィックス不要）(`FretState`, `IFretState` ではなく `FretState`)

**コメント**
- すべてのコメントは日本語を推奨
- ファイル内で一貫性を保つ
- 技術用語は英語のままでも可

**エラーハンドリング**
- 空の catch でエラーを抑制しない
- try-catch を適切なロギングと共に使用
- TypeScript: `as any`, `@ts-ignore`, `@ts-expect-error` を使用しない
- ユーザー向けエラーメッセージ: 日本語（例: "接続エラー", "ルームIDが見つかりません"）

**スタイリング**
- すべての UI に Tailwind CSS を使用
- クラス: `bg-slate-950 text-white flex flex-col`
- レスポンシブ: Tailwind のレスポンシブプレフィックスを使用 (`md:`, `lg:`)

### バックエンド (Python + FastAPI)

**型ヒント**
```python
from typing import Dict
rooms: Dict[str, Dict[str, WebSocket]] = {}
```

**非同期パターン**
```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # 非同期操作
    except WebSocketDisconnect:
        # クリーンアップ
```

**ロギング**
```python
print(f"[{room_id}] {role} connected")  # コンテキスト付きで print を使用
```

**環境変数**
```python
import os
host = os.getenv("HOST", "0.0.0.0")
port = int(os.getenv("PORT", "8000"))
```

**命名規約**
- 関数/変数: snake_case (`room_id`, `get_health`)
- クラス: PascalCase (`WebRTCService`, `AudioEngine`)
- 定数: UPPER_SNAKE_CASE (`MAX_CONNECTIONS`)

---

## TypeScript 設定

- Target: ES2022
- Module: ESNext
- JSX: react-jsx
- Strict: 有効
- パスエイリアス: `@/*` → `./`（`./components/Lobby` ではなく `@/components/Lobby` を使用）

---

## 主要技術

| レイヤー | 技術 |
|-------|------------|
| フロントエンド | React 19 + TypeScript + Vite |
| オーディオ | Tone.js (シンセサイザー) |
| ビジョン | TensorFlow.js HandPose |
| 通信 | WebRTC (peer-to-peer) + WebSocket シグナリング |
| バックエンド | FastAPI + Uvicorn |

---

## 重要なパターン

### WebRTC 接続フロー
1. モバイル接続 → シグナリングサーバー
2. PC接続 → シグナリングサーバー
3. PCが WebRTC オファーを作成
4. モバイルがアンサー
5. ICE キャンディディトの交換
6. リアルタイムゲームデータ用のデータチャネルを開く

### オーディオエンジン
- シンセサイザーに Tone.js を使用
- ギターサウンドに Distortion + Reverb + Filter チェーン
- リアルなトーンに PolySynth と FMSynth を使用

### ハンド検出
- TensorFlow.js HandPose
- 6本の弦 → 6つの指の位置
- フレットマッピング: stringIndex + fretIndex → ノート周波数

---

## デプロイメントに関する注意事項

フロントエンドとバックエンドは独立したサービスとして別々にデプロイ:
- バックエンド: `/backend` → Render Web Service
- フロントエンド: `/frontend` → Render Web Service
- WebSocket URL の環境変数: `VITE_SIGNALING_SERVER_URL`

---

## クリーンアップと開発環境整備完了

2026年1月29日時点で実施したクリーンアップと開発環境整備の概要：

### 実施内容

#### 1. 即時クリーンアップ（Phase 1）
- ✅ .DS_Storeファイルの削除
- ✅ .gitignoreの更新（.ruff_cache/を追加）
- ✅ package.jsonの更新（clean, lint, format, knipスクリプトを追加）

#### 2. 設定ファイルの拡充（Phase 2）
- ✅ ESLintの導入（JavaScript/TypeScriptのリント）
- ✅ Prettierの導入（コードフォーマッター）
- ✅ Knipの導入（未使用コードの検出）
- ✅ ESLint実行検証済み（エラーなし）
- ✅ Knip実行検証済み（14個の未使用ファイルを検出）

#### 3. テスト体制の整備（Phase 3）
- ✅ Frontendテストの導入（Vitest）
- ✅ Backendテストの導入（pytest）
- ✅ サンプルテストファイルの作成
- ✅ pytest実行検証済み（2件のテスト収集）

#### 4. CI/CDの整備（Phase 4）
- ✅ GitHub Actionsの導入
- Frontend CI（`frontend-ci.yml`）- ビルド、リント、テスト
- Backend CI（`backend-ci.yml`）- テスト実行

#### 5. コードレビューと簡素化
- ✅ コード品質レビュー完了（Critical問題なし、Warningなし）
- ✅ .gitignoreの重複エントリ削除（5行の重複を統合）
- ✅ テストファイルの簡素化（不要なdocstring削除）
- ✅ README.mdの作成（プロジェクト概要）

#### 6. 要件定義の更新
- ✅ 要件定義書の更新（バックエンド機能の要件追加）
- FR-5: データベース統合（サーバー側データベース管理）
- FR-6: ユーザー認証システム（メール/パスワード、OAuth2.0）
- FR-7: ログ・セッション管理（演奏履歴、セッション情報の記録・表示）
- FR-8: カスタム曲のアップロード機能（JSON/MIDI形式）
- FR-9: オンラインランキング機能（スコアの集計と表示）
- FR-10: 練習モード機能（速度調整、ループ再生、特定セクション反復練習）
- FR-11: 演奏統計機能（合計演奏時間、最も演奏した曲、平均スコア）
- NFR-5〜NFR-9: 新規非機能要件（データベースセキュリティ、APIレート制限、GDPR準拠、データプライバシー）

---

## 新規追加されたファイル

### 設定ファイル
- `frontend/eslint.config.js` - ESLint設定
- `frontend/.prettierrc.json` - Prettier設定
- `frontend/knip.config.ts` - Knip設定
- `frontend/vitest.config.ts` - Vitest設定
- `backend/pytest.ini` - Pytest設定

### テストファイル
- `frontend/components/__tests__/Lobby.test.tsx` - Lobbyコンポーネントのテスト
- `frontend/components/__tests__/App.test.tsx` - Appコンポーネントのテスト
- `backend/tests/test_main.py` - FastAPIエンドポイントのテスト

### ドキュメント
- `spec/plan/requirements.md` - 要件定義書（241行に拡張、バックエンド機能要件追加）
- `README.md` - プロジェクト概要（日本語）

### CI/CD
- `.github/workflows/frontend-ci.yml` - Frontend CI/CD
- `.github/workflows/backend-ci.yml` - Backend CI/CD

---

## 更新されたツール・ライブラリ

| ツール | バージョン | 目的 |
|-------|---------|------|
| ESLint | 9.39.2 | JavaScript/TypeScriptのリント |
| Prettier | 3.8.1 | コードフォーマット |
| Knip | 5.82.1 | 未使用コードの検出 |
| Vitest | 4.0.18 | Frontend単体テスト |
| pytest | 9.0.2 | Backend単体テスト |

---

## 使用可能なコマンド

### 開発
```bash
# フロントエンド（ポート3000、ホスト0.0.0.0）
cd frontend
npm run dev

# バックエンド
cd backend
uvicorn main:app --reload
```

### テスト
```bash
# Frontendテスト
cd frontend
npm run test
npm run test:ui
npm run test:run

# Backendテスト
cd backend
pytest
```

### リントとフォーマット
```bash
# コード品質チェック
cd frontend
npm run lint

# コード整形
cd frontend
npm run format

# 未使用ファイルの検出
cd frontend
npm run knip
```

### クリーンアップ
```bash
# node_modulesとdistの削除
npm run clean
```

---

## 開発環境の推奨構成

### フロントエンド
- Node.js >= 20
- TypeScript 5.8.2
- Vite 6.2.0
- ESLint 9.39.2
- Prettier 3.8.1
- Knip 5.82.1
- Vitest 4.0.18

### バックエンド
- Python 3.13.5
- FastAPI 0.115.0
- Uvicorn 0.32.0
- WebSockets 14.0
- pytest 9.0.2

---

## 重要な変更点

### Git除外設定
- `.gitignore` に以下を追加：
  - `.ruff_cache/` - Pythonキャッシュディレクトリ
  - Pythonバイトコード（`*.so`, `*.py[cod]`）
  - ビルド成果物（`dist/`, `build/`, `coverage/`）

### ファイル構成の更新
- `frontend/package.json` に新規スクリプトを追加：
  - `clean` - node_modulesとdistの削除
  - `lint` - ESLint実行
  - `format` - Prettier実行
  - `knip` - 未使用コード検出
  - `test`, `test:ui`, `test:run` - テスト実行

### TypeScript設定
- `frontend/tsconfig.json` の設定を維持：
  - Target: ES2022
  - Module: ESNext
  - JSX: react-jsx
  - Strict: 有効
  - パスエイリアス: `@/*` → `./` （`@/components/Lobby` を使用）

---

## 今後の拡張計画

1. **サーバー側機能の実装**
   - 曲データベース（SQLiteまたはPostgreSQL）
   - ユーザー認証（JWTまたはOAuth2.0）
   - ログ・セッション管理
   - APIエンドポイントの拡張（RESTful API）

2. **オフライン機能**
   - クライアントサイドの曲データキャッシュ
   - Service Workerによるバックグラウンド実行

3. **パフォーマンス最適化**
   - React.lazyとSuspenceの導入
   - 画像・モデルの最適化（lazy loading）
   - バンドルサイズの削減（code-splitting）

4. **セキュリティ強化**
   - helmet.jsによるHTTPヘッダーのセキュリティ
   - CSP（Content Security Policy）の実装
   - 環境変数の暗号化（`.env`ファイルとGitHub Secrets）

---

## よく使うコマンドショートカット

```bash
# すべてのテストを実行
npm run test:all

# すべてのリントを実行
npm run lint

# フォーマットチェック
npm run format:check

# 完全なクリーンアップと再インストール
rm -rf node_modules package-lock.json
npm install
npm run lint && npm run format
```

---

**注意**: クリーンアップにより、プロジェクトの保守性とコード品質が大幅に向上しました。

---

## 言語に関するコンテキスト

**デフォルト言語: 日本語**

このプロジェクトは日本語ユーザー向けです。すべてのテキスト出力は日本語を優先してください：
- UI テキスト: 日本語優先、英語は国際用語としてオプション
- エラーメッセージ: ユーザー向けエラーは日本語
- コメント: 日本語推奨、ファイル内で一貫性を保つ
- ユーザー指示: 日本語
- 技術用語: 技術的概念は英語のまま（例: "WebRTC", "WebSocket", "TypeScript"）

例外（英語）:
- 技術的な API 用語とライブラリ名
- コード識別子（変数、関数、クラス）
- 設定キーと環境変数

---

## 避けるべきアンチパターン

| カテゴリ | 禁止事項 |
|----------|-----------|
| TypeScript | `as any`, `@ts-ignore`, `@ts-expect-error` |
| エラーハンドリング | 空の `catch(e) {}` ブロック |
| テスト | 失敗するテストを削除して「パス」にする |
| 検索 | 単純な1行修正のためにエージェントを起動 |
| デバッグ | ショットガンデバッグ、ランダムな変更 |
