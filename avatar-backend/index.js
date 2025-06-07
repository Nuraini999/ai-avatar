// Final index.js - Ollama + gTTS + ffmpeg + Rhubarb lipsync
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { exec } from "child_process";
import { writeFile } from "fs/promises";
import { promises as fs } from "fs";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const port = 3000;

// Endpoint untuk chat via Ollama + TTS (gTTS) + lipsync
app.post("/chat-ollama", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    // 1. Kirim ke LLM (Ollama)
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        messages: [{ role: "user", content: message }],
      }),
    });

    const body = await response.text();
    const messages = body
      .split("\n")
      .map(line => {
        try {
          return JSON.parse(line.trim());
        } catch {
          return null;
        }
      })
      .filter(msg => msg && msg.message && msg.message.content);

    const fullContent = messages.map(m => m.message.content).join(" ").trim();

    if (!fullContent) {
      console.error("Ollama reply empty or invalid:", body);
      return res.status(500).json({ error: "Empty response from LLM" });
    }

    // 2. Panggil Python TTS (gTTS) untuk buat generated.mp3
    await new Promise((resolve, reject) => {
      exec(`py tts.py "${fullContent}"`, (err, stdout, stderr) => {
        if (err) {
          console.error("Python TTS Error:", stderr);
          return reject("TTS failed");
        }
        console.log("Python TTS OK:", stdout);
        resolve();
      });
    });

    // 3. Konversi ke WAV pakai ffmpeg
    await execPromise(`ffmpeg -y -i \"concat:audios/sentence_0.mp3|audios/sentence_1.mp3\" -acodec copy audios/generated.mp3
`);
// 3.1 Konversi ke WAV (untuk Rhubarb)
await execPromise(`ffmpeg -y -i audios/generated.mp3 audios/generated.wav`);

    // 4. Generate lipsync JSON pakai Rhubarb
   await execPromise(`..\\Rhubarb-Lip-Sync\\bin\\rhubarb.exe -f json -o audios\\generated.json audios\\generated.wav -r phonetic`);



    // 5. Baca audio dan lipsync
    const audioBuffer = await fs.readFile("audios/generated.mp3");
    const audioBase64 = audioBuffer.toString("base64");
    const lipsyncJson = await fs.readFile("audios/generated.json", "utf-8");

    res.json({
      reply: fullContent,
      audio: audioBase64,
      lipsync: JSON.parse(lipsyncJson),
    });
  } catch (err) {
    const errorMsg = Buffer.isBuffer(err?.response?.data)
      ? err.response.data.toString()
      : err?.response?.data || err.message;
    console.error("TTS or LLM ERROR:", errorMsg);
    res.status(500).json({ error: "Failed to process request", details: errorMsg });
  }
});

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Exec error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Endpoint prediksi gesture sederhana
app.post("/gesture", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  let gesture = "neutral";
  if (message.includes("senang") || message.includes("baik")) gesture = "smile";
  else if (message.includes("sedih")) gesture = "sad";
  else if (message.includes("jelaskan") || message.includes("materi")) gesture = "explain";

  res.json({ gesture });
});

app.listen(port, () => {
  console.log(`Teacher AI listening on port ${port}`);
});
