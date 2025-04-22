import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promises as fs } from "fs";
import gTTS from "gtts";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

// ✅ Helper function to execute shell commands
const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

// ✅ Generate lipsync data using Rhubarb
const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);

  // Convert MP3 to WAV for Rhubarb processing
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);

  // Generate lip-sync JSON with Rhubarb
  await execCommand(
    `C:\\rhubarb\\rhubarb.exe -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

// ✅ TTS using gTTS
const ttsGtts = async (text, outputFile) => {
  return new Promise((resolve, reject) => {
    const gtts = new gTTS(text, "en");
    gtts.save(outputFile, (err) => {
      if (err) {
        console.error("Error generating speech:", err);
        reject(err);
      } else {
        console.log(`Generated speech: ${outputFile}`);
        resolve(outputFile);
      }
    });
  });
};

// ✅ Endpoint to handle chat requests
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }

  // ✅ Create message data
  const messages = [
    {
      text: userMessage,
      facialExpression: "default",
      animation: "Talking_1",
    },
  ];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const fileNameMp3 = `audios/message_${i}.mp3`;

    // ✅ Generate speech using gTTS
    await ttsGtts(message.text, fileNameMp3);

    // ✅ Generate lip-sync data
    await lipSyncMessage(i);

    // ✅ Add audio and lipsync data to response
    message.audio = await audioFileToBase64(fileNameMp3);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

// ✅ Read lip-sync JSON transcript
const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

// ✅ Convert audio file to Base64
const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

// ✅ Server listening
app.listen(port, () => {
  console.log(`Virtual Teacher listening on port ${port}`);
});
