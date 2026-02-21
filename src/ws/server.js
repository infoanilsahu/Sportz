import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set())
    }

    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribes = matchSubscribers.get(matchId)

    if(!subscribes) return;

    subscribes.delete(socket)

    if (subscribes.size === 0) {
        matchSubscribers.delete(matchId)
    }
}

function cleanupSubscriptions(socket) {
    if(!socket.subscriptions) return;

    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket)
    }
}


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

        if(client.readyState === WebSocket.OPEN) {
            SendJson(client, payload)
        }

    }
}

function broadCastToMatch(matchId, payload) {
    const subscribes = matchSubscribers.get(matchId);

    if(!subscribes || subscribes.size === 0) return;

    const message = JSON.stringify(payload)

    for (const client of subscribes) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function handleMessage(socket, data) {
    let message;

    try {
        message = JSON.parse(data.toString())
    } catch (err) {
        SendJson(socket, { type: "error", message: "Invalid JSON" })
        return ;
    }

    const matchId = Number(message.matchId);

    if (message?.type === "subscribe" && Number.isInteger(matchId)) {
            subscribe(matchId, socket);
            socket.subscriptions.add(matchId);
            
        SendJson(socket, { type: "subscribed", matchId: matchId })
        return;
    }
    
    if (message?.type === "unsubscribe" && Number.isInteger(matchId)) {
        unsubscribe(matchId, socket)
        socket.subscriptions?.delete(matchId)
        SendJson(socket, { type: "unsubscribed", matchId: matchId })
        return
    }
}

export function attachWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true, path: '/ws', maxPayload: 1024*1024 })

    server.on("upgrade", async (req, socket, head) => {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`)

        if(pathname !== '/ws') {
            socket.destroy();
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);
    
                if (decision.isDenied()) {
                    if (decision.reason.isRateLimit()) {
                        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n')
                    } else {
                        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
                    }
                    socket.destroy()
                    return;
                }
                
            } catch (error) {
                console.error("ws upgrade protection error", error);
                socket.write('HTTP/1.1 500 Internal server error\r\n\r\n')
                socket.destroy();
                return ;         
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection",ws,req)
        })
        
    })

    wss.on('connection', async (socket, req) => {

        socket.isAlive = true;
        socket.on("pong", () => { socket.isAlive = true })
        
        socket.subscriptions = new Set();

        SendJson(socket, { type: "welcome" });

        socket.on("message", (data) => {
            handleMessage(socket, data)
        })

        socket.on("error", (err) => {
            console.error("ws error : ", err)
            socket.terminate()
        })

        socket.on("close", () => {
            cleanupSubscriptions(socket)
        })

    });

    const interval = setInterval( () => {
        wss.clients.forEach( (ws) => {
            if(ws.isAlive === false) {
                cleanupSubscriptions(ws);
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        })
    }, 30000);

    wss.on("close", () => clearInterval(interval));


    function broadCastMatchCreated(match) {
        broadCastToAll(wss,{ type: 'match_created', data: match})
    }

    function broadCastCommentary(matchId, comment) {
        broadCastToMatch(matchId, { type: "commentary", data: comment})
    }

    return { broadCastMatchCreated, broadCastCommentary }
}


