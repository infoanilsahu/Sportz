import { Router } from 'express'

const matchRouter = Router();

matchRouter.get("/", (req,res) => {
    res.status(200).json({message: "match started"});
})

export {matchRouter};