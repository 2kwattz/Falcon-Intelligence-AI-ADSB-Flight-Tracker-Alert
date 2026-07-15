const { spawn } = require("child_process");

function startRTL({
    frequency,
    modulation = "am",
    sampleRate = 16000
}) {

    return spawn("D:\\rtlSdr\\rtl_fm.exe", [
        "-f", frequency,
        "-M", modulation,

        // output sample rate
        "-r", sampleRate.toString(),

        // internal demod sample rate
        "-s", "240000",

        "-E", "dc",
        "-E", "deemp",

        "-"
    ], {
        stdio: ["ignore", "pipe", "pipe"]
    });

}

module.exports = { startRTL };