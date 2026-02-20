import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

function SendJson(socket, payload) {
    if(socket.readyState !== WebSocket.OPEN) return;

    try {
        socket.send(JSON.stringify(payload), (err) => {
            if(err) console.error("ws send failed", err)
        });
    } catch (error) {
        console.error("ws send failed", error)
    }
}


function broadCastToAll(wss, payload) {
    for (const client of wss.clients) {
        SendJson(client, payload)
    }
}


export function attachWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024*1024 })

    wss.on('connection', async (socket, req) => {

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reson = decision.reason.isRateLimit() ? "Rate limit exceeded" : "Access denied";

                    socket.close(code,reson)
                    return;
                }
                
            } catch (error) {
                console.error("ws connaction error", error);
                socket.close(1011, 'server security error');
                return ;         
            }
        }


        socket.isAlive = true;
        socket.on("pong", () => { socket.isAlive = true })


        SendJson(socket, { type: "welcome" });

        socket.on("error", console.error)
    });

    const interval = setInterval( () => {
        wss.clients.forEach( (ws) => {
            if(ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        })
    }, 30000);

    wss.on("close", () => clearInterval(interval));


    function broadCastMatchCreated(match) {
        broadCastToAll(wss,{ type: 'match_created', data: match})
    }

    return { broadCastMatchCreated }
}


