const { spawn } = require("child_process");

const youtubeUrl = "https://www.youtube.com/watch?v=VPxGoebF0bk";
import "../whisper.cpp/build/bin/Release/"

const ytdlp = spawn("yt-dlp", [



    "-f",
    "bestaudio",
    "-o",
    "-",
    youtubeUrl
]);

const ffmpeg = spawn("ffmpeg", [
    "-i",
    "pipe:0",
    "-f",
    "s16le",
    "-ac",
    "1",
    "-ar",
    "16000",
    "pipe:1"
]);

const whisper = spawn("./build/bin/Release/whisper-stream.exe", [
    "-m",
    "./models/ggml-base.en.bin"
]);

ytdlp.stdout.pipe(ffmpeg.stdin);
ffmpeg.stdout.pipe(whisper.stdin);

whisper.stdout.setEncoding("utf8");

whisper.stdout.on("data", (data) => {
    process.stdout.write(data);
});

whisper.stderr.on("data", (data) => {
    console.error(data.toString());
});