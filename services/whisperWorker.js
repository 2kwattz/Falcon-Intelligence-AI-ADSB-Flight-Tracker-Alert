const { parentPort } = require("worker_threads");

// TODO:
// Load whisper.cpp ONCE here.
// Keep the model in memory.
// Never reload it.

parentPort.on("message", async (pcmBuffer) => {

    const text = await transcribe(pcmBuffer);

    parentPort.postMessage(text);

});