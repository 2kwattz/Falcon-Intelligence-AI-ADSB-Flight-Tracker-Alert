const { spawn } = require("child_process");
const { startRTL } = require("./rtlSdr");

const whisper = spawn("./whisper-stream.exe", [
    "-m", "./models/ggml-base.en.bin",
    "--window-ms", "3000",
    "--step-ms", "1000",
    "-l", "en"
]);

const rtl = startRTL({
    frequency: "127.900M"
});

console.log("Listening...");

rtl.stdout.pipe(whisper.stdin);

whisper.stdout.setEncoding("utf8");

let buffer = "";

whisper.stdout.on("data", (chunk) => {
    buffer += chunk;

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
        const text = line.trim();

        if (!text) continue;

        console.log("[TEXT]", text);
    }
});

rtl.stderr.on("data", d => {
    console.log("[RTL]", d.toString());
});

whisper.stderr.on("data", d => {
    console.log("[WHISPER]", d.toString());
});

rtl.on("close", code => {
    console.log("RTL exited:", code);
});

whisper.on("close", code => {
    console.log("Whisper exited:", code);
});