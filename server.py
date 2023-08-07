from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import uvicorn

app = FastAPI()
mgr = socketio.AsyncManager() 
sio = socketio.AsyncServer(
    async_mode="asgi", cors_allowed_origins="*", client_manager=mgr
)
sio_asgi_app = socketio.ASGIApp(socketio_server=sio, other_asgi_app=app)

app.add_route("/socket.io/", route=sio_asgi_app, methods=["GET", "POST"])
app.add_websocket_route("/socket.io/", sio_asgi_app)

rooms = {}

@sio.event
async def joinRoom(id,roomid,userid):
    sio.enter_room(id,roomid)

    message = userid + " has joined the room : "+roomid

    if roomid not in rooms:
        rooms[roomid] = {}
    
    rooms[roomid][userid] = id
    print(list(rooms[roomid].keys()))
    await sio.emit("userList",message,room=roomid)

@sio.event
async def signalingMessage(sid,message,roomid):
    if(roomid):
        await sio.emit('signalingMessage',[message,roomid],room=roomid,skip_sid=sid)

@sio.on('disconnect')
async def handle_disconnect(sid):
    print(f"disconnected {sid}")
    roomid = ""
    userid = ""
    for outerKey,outerDict in rooms.items():
        for innerKey, innervalue in outerDict.items():
            if innervalue == sid:
                del rooms[outerKey][innerKey]
                roomid = outerKey
                userid = innerKey
                print("deleted - ",innerKey)
                break
    
    message = userid + " has left the room."
    await sio.emit("userList",message,room=roomid)

@app.get('/')
def index():
    return "This is a server"

if __name__ == "__main__":
    uvicorn.run('app:app', host=ENV.HOST, port=8000,reload=True)
