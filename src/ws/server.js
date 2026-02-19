import { WebSocket, WebSocketServer } from "ws";

function SendJson(socket, payload) {
    if(socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}


function broadCastToAll(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload))
    }
}


export function attachWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024*1024 })

    wss.on('connection', (socket) => {
        SendJson(socket, { type: "welcome" });

        socket.on("error", console.error)
    })


    function broadCastMatchCreated(match) {
        broadCastToAll(wss,{ type: 'match_created', data: match})
    }

    return { broadCastMatchCreated }
}


