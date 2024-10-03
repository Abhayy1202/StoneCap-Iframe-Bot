import express from "express";
import cors from "cors";
import path from 'path'
import { communicator } from "./chatCommunicator.js";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });


const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));

//Routes
app.post("/clear", async (req, res) => {
  await communicator("clear-chat");
  res.status(200).json({ message: "chat-cleared" });
});


app.post("/chat-bot", async (req, res) => {
  const { query } = req.body;
  if (typeof query === "string") {
    const response = await communicator(query); // Pass the count from front end
    return res.status(200).json({ data: response });
  } else {
    return res.status(400).json({ error: "Invalid query format" });
  }})


app.listen(process.env.PORT || 8000, () => {
  console.log(`Server is running at port:${process.env.PORT}`);
});

export { app };
