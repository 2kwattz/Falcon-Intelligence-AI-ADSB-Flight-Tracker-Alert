const express = require("express"); // Node Framework
const bodyParser = require("body-parser"); // Req.Body Parser
const cluster = require("cluster"); // Horizontal Scaling
const os = require("os"); // CPU/Os Info

const PORT = process.env.PORT || 3000;

// Worker Restart Config
const MAX_WORKER_RESTARTS = 5;
const WORKER_RESTART_WINDOW_MS = 60_000; // 1 minute

let workerRestartLogs = [];
let nextAllowedRestartAt = 0; // time-based gating (no flag)

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;

    console.log(`[*] Master PID ${process.pid} running on ${numCPUs} cores`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`[*] Worker ${worker.id} (PID: ${worker.process.pid}) died`);
        console.log(`[*] Exit code: ${code}, Signal: ${signal}`);

        const now = Date.now();

        const graceful = worker.exitedAfterDisconnect === true;
        const abnormal = code !== 0 && !graceful;

        if (!abnormal) {
            console.log("[*] Graceful shutdown. No restart\n");
            return;
        }

        console.log("[*] Worker crashed\n");

        // Track crash timestamps
        workerRestartLogs.push(now);

        // Keep only last 60 seconds
        workerRestartLogs = workerRestartLogs.filter(function (t) {
            return now - t < WORKER_RESTART_WINDOW_MS;
        });

        // Too many crashes - cooldown (no flags)
        if (workerRestartLogs.length > MAX_WORKER_RESTARTS) {

            // Already in cooldown → do nothing
            if (now < nextAllowedRestartAt) {
                return;
            }

            console.log("[*] Too many crashes. Cooling down for 1 minute...");

            nextAllowedRestartAt = now + WORKER_RESTART_WINDOW_MS;

            setTimeout(() => {
                console.log("[*] Cooldown over. Restarting worker...");

                const w = cluster.fork();
                console.log("[*] Forked after cooldown:", w.process.pid);

            }, WORKER_RESTART_WINDOW_MS);

            return;
        }

        // Exponential backoff
        const delay = Math.min(
            1000 * 2 ** (workerRestartLogs.length - 1),
            30_000
        );

        setTimeout(() => {
            const w = cluster.fork();
            console.log("[*] Restarted worker after delay:", delay, "PID:", w.process.pid);
        }, delay);
    });

} else {

    const app = express();

    // Middlewares
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Dummy route
    app.get("/", (req, res) => {
        res.send(`Handled by worker ${process.pid}`);
    });

    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} started on port ${PORT}`);
    });
}