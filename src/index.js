import express from 'express';
import 'dotenv/config';
import { db } from './db/db.js';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

import { matchRouter } from "./router/route.js";

app.use("/matches", matchRouter)

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Express server listening on http://localhost:${PORT}`);
});
