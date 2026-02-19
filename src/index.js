import express from 'express';
import http from 'http'
import 'dotenv/config';
import { db } from './db/db.js';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

app.use(express.json());

import { matchRouter } from "./router/route.js";
import { attachWebSocket } from './ws/server.js';

app.use("/matches", matchRouter)

const { broadCastMatchCreated } = attachWebSocket(server)
app.locals.broadCastMatchCreated = broadCastMatchCreated

server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`
  console.log(`server is running on ${baseUrl}`);
  console.log(`websocket server is running on ${baseUrl.replace('http', 'ws')}/ws`);
  
});
