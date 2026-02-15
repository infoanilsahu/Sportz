import { Router } from 'express'

const matchRouter = Router();

matchRouter.get("/", (req,res) => {
    res.status(200).json({Message: "maatch started"})
})

export {matchRouter};