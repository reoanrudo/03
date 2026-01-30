import json
import os
import secrets
from datetime import datetime
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Air Guitar Pro Signaling Server")

# 環境変数から許可オリジンを読み取り
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3003").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# セキュリティヘッダーミドルウェア
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ルームアクセストークン保存（メモリ上、本番ではRedis等を使用）
room_tokens: Dict[str, Dict[str, str]] = {}  # {room_id: {token: created_at}}
rooms: Dict[str, Dict[str, WebSocket]] = {}
connections: Dict[WebSocket, str] = {}
roles: Dict[WebSocket, str] = {}


def generate_room_id() -> str:
    """安全なルームIDを生成（8文字）"""
    return secrets.token_urlsafe(6)[:8].upper()


def generate_access_token() -> str:
    """アクセストークンを生成"""
    return secrets.token_urlsafe(32)


def validate_token(room_id: str, token: str) -> bool:
    """トークンを検証"""
    if room_id not in room_tokens:
        return False
    return token in room_tokens[room_id]


def sanitize_room_id(room_id: str) -> str:
    """ルームIDをサニタイズ（英数字のみ、大文字、最大8文字）"""
    sanitized = ''.join(c for c in room_id.upper() if c.isalnum())
    return sanitized[:8]


@app.get("/")
async def get():
    return {"message": "Air Guitar Pro Signaling Server", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


class CreateRoomRequest(BaseModel):
    preferred_room_id: str | None = None


class CreateRoomResponse(BaseModel):
    room_id: str
    access_token: str
    expires_in: int


@app.post("/api/rooms", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest | None = None):
    """ルームを作成し、アクセストークンを発行"""
    # ユーザー希望のルームIDがある場合はサニタイズして使用
    if request and request.preferred_room_id:
        room_id = sanitize_room_id(request.preferred_room_id)
        if not room_id:
            room_id = generate_room_id()
    else:
        room_id = generate_room_id()

    access_token = generate_access_token()

    # トークンを保存（1時間有効）
    if room_id not in room_tokens:
        room_tokens[room_id] = {}
    room_tokens[room_id][access_token] = datetime.now().isoformat()

    return CreateRoomResponse(
        room_id=room_id,
        access_token=access_token,
        expires_in=3600
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        initial_msg = await websocket.receive_text()
        data = json.loads(initial_msg)

        if data.get("type") != "JOIN":
            await websocket.close()
            return

        room_id = sanitize_room_id(data.get("roomId", ""))
        role = data.get("role", "")
        token = data.get("token", "")

        # トークン検証（開発モードではスキップ可能）
        is_dev = os.getenv("ENVIRONMENT", "development") == "development"
        if not is_dev:
            if not validate_token(room_id, token):
                await websocket.send_text(
                    json.dumps(
                        {"type": "ERROR", "payload": {"message": "Unauthorized: Invalid token"}}
                    )
                )
                await websocket.close(code=1008, reason="Unauthorized")
                return

        if not room_id or role not in ["PC_PLAYER", "MOBILE_CONTROLLER"]:
            await websocket.send_text(
                json.dumps(
                    {"type": "ERROR", "payload": {"message": "Invalid room or role"}}
                )
            )
            await websocket.close()
            return

        if room_id not in rooms:
            rooms[room_id] = {}

        if role in rooms[room_id]:
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "ERROR",
                        "payload": {"message": "Role already taken in this room"},
                    }
                )
            )
            await websocket.close()
            return

        # Join room
        rooms[room_id][role] = websocket
        connections[websocket] = room_id
        roles[websocket] = role

        print(f"[{room_id}] {role} connected")

        await websocket.send_text(
            json.dumps({"type": "JOINED", "payload": {"roomId": room_id, "role": role}})
        )

        if len(rooms[room_id]) == 2:
            for r, ws in rooms[room_id].items():
                await ws.send_text(
                    json.dumps({"type": "READY", "payload": {"roomId": room_id}})
                )

        while True:
            message_text = await websocket.receive_text()
            message = json.loads(message_text)

            # メッセージタイプの検証
            msg_type = message.get("type")
            if not msg_type:
                continue

            # 許可されたメッセージタイプのみ転送
            allowed_types = ["OFFER", "ANSWER", "ICE_CANDIDATE", "FRET_UPDATE", "STRUM_EVENT"]
            if msg_type in allowed_types:
                for r, ws in rooms[room_id].items():
                    if r != role and ws in rooms[room_id]:
                        try:
                            await ws.send_text(json.dumps(message))
                        except:
                            pass

    except WebSocketDisconnect:
        if websocket in connections:
            room_id = connections[websocket]
            role = roles[websocket]

            if room_id in rooms and role in rooms[room_id]:
                del rooms[room_id][role]

                if not rooms[room_id]:
                    del rooms[room_id]
                    if room_id in room_tokens:
                        del room_tokens[room_id]

            del connections[websocket]
            del roles[websocket]

            print(f"[{room_id}] {role} disconnected")

            if room_id in rooms and rooms[room_id]:
                for r, ws in rooms[room_id].items():
                    try:
                        await ws.send_text(
                            json.dumps({"type": "PEER_DISCONNECTED", "payload": {"role": role}})
                        )
                    except:
                        pass

    except Exception as e:
        print(f"Error: {e}")
        if websocket in connections:
            room_id = connections[websocket]
            role = roles[websocket]

            if room_id in rooms and role in rooms[room_id]:
                del rooms[room_id][role]
                if not rooms[room_id]:
                    del rooms[room_id]
                    if room_id in room_tokens:
                        del room_tokens[room_id]

            del connections[websocket]
            del roles[websocket]


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("ENVIRONMENT") != "production"
    uvicorn.run("main:app", host=host, port=port, reload=reload)
