import json
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Air Guitar Pro Signaling Server")

rooms: Dict[str, Dict[str, WebSocket]] = {}
connections: Dict[WebSocket, str] = {}
roles: Dict[WebSocket, str] = {}


@app.get("/")
async def get():
    return {"message": "Air Guitar Pro Signaling Server"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        initial_msg = await websocket.receive_text()
        data = json.loads(initial_msg)

        if data.get("type") != "JOIN":
            await websocket.close()
            return

        room_id = data.get("roomId", "").upper()
        role = data.get("role", "")

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

            msg_type = message.get("type")

            if msg_type in ["OFFER", "ANSWER", "ICE_CANDIDATE"]:
                for r, ws in rooms[room_id].items():
                    if r != role:
                        await ws.send_text(json.dumps(message))

            elif msg_type == "FRET_UPDATE":
                for r, ws in rooms[room_id].items():
                    if r != role:
                        await ws.send_text(json.dumps(message))

            elif msg_type == "STRUM_EVENT":
                for r, ws in rooms[room_id].items():
                    if r != role:
                        await ws.send_text(json.dumps(message))

    except WebSocketDisconnect:
        if websocket in connections:
            room_id = connections[websocket]
            role = roles[websocket]

            if room_id in rooms and role in rooms[room_id]:
                del rooms[room_id][role]

                if not rooms[room_id]:
                    del rooms[room_id]

            del connections[websocket]
            del roles[websocket]

            print(f"[{room_id}] {role} disconnected")

            if room_id in rooms and rooms[room_id]:
                for r, ws in rooms[room_id].items():
                    await ws.send_text(
                        json.dumps({"type": "PEER_DISCONNECTED", "payload": {}})
                    )

    except Exception as e:
        print(f"Error: {e}")
        if websocket in connections:
            room_id = connections[websocket]
            role = roles[websocket]

            if room_id in rooms and role in rooms[room_id]:
                del rooms[room_id][role]
                if not rooms[room_id]:
                    del rooms[room_id]

            del connections[websocket]
            del roles[websocket]


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
