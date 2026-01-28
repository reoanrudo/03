# Render デプロイ設定

プロジェクトが `backend/` と `frontend/` に分割され、別々にデプロイできます。

---

## リポジトリ構造

```
air_guitar_03/
├── backend/                    # FastAPI シグナリングサーバー
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/                  # React アプリ
    ├── App.tsx
    ├── components/
    ├── services/
    ├── package.json
    └── vite.config.ts
```

---

## デプロイ手順

### サービス 1: Backend（FastAPI）

1. Render ダッシュボード →「New +」→「Web Service」
2. 同じリポジトリを選択
3. 以下の設定:

| 設定 | 値 |
|-------|-----|
| **Name** | `air-guitar-pro-backend` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

4. Environment Variables:

| Key | Value |
|-----|-------|
| `PORT` | `10000` |
| `ENVIRONMENT` | `production` |

---

### サービス 2: Frontend（React）

1. Render ダッシュボード →「New +」→「Web Service」
2. 同じリポジトリを選択
3. 以下の設定:

| 設定 | 値 |
|-------|-----|
| **Name** | `air-guitar-pro-frontend` |
| **Root Directory** | `frontend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run preview` |
| **Instance Type** | `Free` |

4. Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_SIGNALING_SERVER_URL` | `wss://air-guitar-pro-backend.onrender.com/ws` |
| `GEMINI_API_KEY` | `PLACEHOLDER_API_KEY` |

---

## デプロイ後の URL

| サービス | URL |
|---------|-----|
| Backend（シグナリング） | `https://air-guitar-pro-backend.onrender.com` |
| Frontend（React） | `https://air-guitar-pro-frontend.onrender.com` |

---

## 環境変数の更新

Frontend デプロイ後、Frontend の Environment Variables に:

```env
VITE_SIGNALING_SERVER_URL=wss://air-guitar-pro-backend.onrender.com/ws
```

---

## アクセス手順

| デバイス | URL |
|---------|-----|
| PC（ローカル開発用） | `http://localhost:3000` |
| スマホ | `https://air-guitar-pro-frontend.onrender.com` |

---

## ヘルスチェック

デプロイ後、以下の URL で動作確認:

```
https://air-guitar-pro-backend.onrender.com/health
```

期待されるレスポンス:
```json
{"status": "ok"}
```

---

## トラブルシューティング

### デプロイが失敗する場合

| エラー | 解決策 |
|--------|---------|
| `uvicorn: command not found` | `Root Directory` が `backend` に設定されているか確認 |
| `npm run build failed` | `Root Directory` が `frontend` に設定されているか確認 |

### スマホから接続できない場合

1. Frontend の `VITE_SIGNALING_SERVER_URL` が正しいか確認
2. Backend が稼働中か確認
3. CORS 設定が有効になっているか確認
