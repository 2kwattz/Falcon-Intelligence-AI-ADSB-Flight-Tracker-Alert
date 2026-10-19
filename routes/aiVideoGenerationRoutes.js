const crypto = require("crypto");
const axios = require("axios");
const express = require("express");
const fs = require("fs");
const FormData = require("form-data");
const multer = require("multer");
const path = require("path");
const aiRateLimiting = require("../middlewares/aiRateLimiting");

const router = express.Router();
const clientImagesDirectory = path.resolve(__dirname, "../resources/clientImages");
const maxImageSize = 20 * 1024 * 1024;
const supportedImageTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
};
const videoModel = "wan-2-2-ti2v-5b";
const videoGeneratorPasscode = process.env.VIDEO_GENERATOR_PASSCODE || "blueera";
const storedImageFilenamePattern = /^\d{13}-[a-f0-9]{24}\.(jpg|png|webp|gif)$/;
const comfyUiBaseUrl = (process.env.COMFYUI_BASE_URL || "http://192.168.0.199:8188").replace(/\/+$/, "");
const comfyUiTimeoutMs = 30_000;
const comfyJobs = new Map();

fs.mkdirSync(clientImagesDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, clientImagesDirectory),
    filename: (req, file, callback) => {
        const extension = supportedImageTypes[file.mimetype];
        callback(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: maxImageSize,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        if (!supportedImageTypes[file.mimetype]) {
            return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "referenceImages"));
        }

        return callback(null, true);
    }
});

function hasValidPasscode(passcode) {
    if (typeof passcode !== "string") return false;

    const supplied = Buffer.from(passcode);
    const expected = Buffer.from(videoGeneratorPasscode);

    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function hasStoredReferenceImage(filename) {
    if (typeof filename !== "string" || !storedImageFilenamePattern.test(filename)) {
        return false;
    }

    return fs.existsSync(path.join(clientImagesDirectory, filename));
}

function buildWan22Workflow({ prompt, seed, startImageName, requestId }) {
    const latentInputs = {
        vae: ["3", 0],
        width: 832,
        height: 480,
        length: 49,
        batch_size: 1
    };

    if (startImageName) {
        latentInputs.start_image = ["7", 0];
    }

    const workflow = {
        "1": {
            class_type: "UNETLoader",
            inputs: {
                unet_name: "wan2.2_ti2v_5B_fp16.safetensors",
                weight_dtype: "default"
            }
        },
        "2": {
            class_type: "CLIPLoader",
            inputs: {
                clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
                type: "wan",
                device: "default"
            }
        },
        "3": {
            class_type: "VAELoader",
            inputs: {
                vae_name: "wan2.2_vae.safetensors"
            }
        },
        "4": {
            class_type: "ModelSamplingSD3",
            inputs: {
                model: ["1", 0],
                shift: 8
            }
        },
        "5": {
            class_type: "CLIPTextEncode",
            inputs: {
                text: prompt,
                clip: ["2", 0]
            }
        },
        "6": {
            class_type: "CLIPTextEncode",
            inputs: {
                text: "low quality, blurry, distorted, flickering, deformed, watermark, text",
                clip: ["2", 0]
            }
        },
        "8": {
            class_type: "Wan22ImageToVideoLatent",
            inputs: latentInputs
        },
        "9": {
            class_type: "KSampler",
            inputs: {
                model: ["4", 0],
                seed,
                steps: 30,
                cfg: 5,
                sampler_name: "uni_pc",
                scheduler: "simple",
                positive: ["5", 0],
                negative: ["6", 0],
                latent_image: ["8", 0],
                denoise: 1
            }
        },
        "10": {
            class_type: "VAEDecode",
            inputs: {
                samples: ["9", 0],
                vae: ["3", 0]
            }
        },
        "11": {
            class_type: "SaveWEBM",
            inputs: {
                images: ["10", 0],
                filename_prefix: `falcon-video/${requestId}`,
                codec: "vp9",
                fps: 24,
                crf: 24
            }
        }
    };

    if (startImageName) {
        workflow["7"] = {
            class_type: "LoadImage",
            inputs: { image: startImageName }
        };
    }

    return workflow;
}

async function uploadImageToComfyUi(filename) {
    const imagePath = path.join(clientImagesDirectory, filename);
    const form = new FormData();
    form.append("image", fs.createReadStream(imagePath), { filename });
    form.append("overwrite", "false");

    const response = await axios.post(`${comfyUiBaseUrl}/upload/image`, form, {
        headers: form.getHeaders(),
        maxBodyLength: maxImageSize,
        timeout: comfyUiTimeoutMs
    });

    const uploadedName = response.data?.name;
    if (typeof uploadedName !== "string" || uploadedName !== filename) {
        throw new Error("ComfyUI did not confirm the uploaded reference image.");
    }

    return uploadedName;
}

async function getComfyJobHistory(promptId) {
    const response = await axios.get(`${comfyUiBaseUrl}/history/${encodeURIComponent(promptId)}`, {
        timeout: comfyUiTimeoutMs
    });

    return response.data?.[promptId] || null;
}

function collectComfyOutputFiles(value, files = []) {
    if (Array.isArray(value)) {
        value.forEach((item) => collectComfyOutputFiles(item, files));
    } else if (value && typeof value === "object") {
        if (typeof value.filename === "string") {
            files.push(value);
        }

        Object.values(value).forEach((item) => collectComfyOutputFiles(item, files));
    }

    return files;
}

function getComfyVideoOutput(historyEntry) {
    const files = collectComfyOutputFiles(historyEntry?.outputs || {});
    return files.find((file) => /\.(webm|mp4|mkv|mov|avi|gif)$/i.test(file.filename)) || null;
}

function getComfyError(historyEntry) {
    const messages = historyEntry?.status?.messages;
    if (!Array.isArray(messages)) return null;

    const errorMessage = messages.find(([type]) => type === "execution_error");
    return errorMessage?.[1]?.exception_message || errorMessage?.[1]?.exception_type || null;
}

router.get("/falcon-video-generator", (req, res) => {
    return res.sendFile(path.join(__dirname, "../public/falcon-video-generator.html"));
});

router.post("/api/ai-video/upload", upload.array("referenceImages", 1), (req, res) => {
    const files = (req.files || []).map((file) => ({
        filename: file.filename,
        originalName: path.basename(file.originalname),
        size: file.size,
        mimeType: file.mimetype
    }));

    if (!files.length) {
        return res.status(400).json({
            status: false,
            message: "Choose at least one image to upload."
        });
    }

    return res.status(201).json({
        status: true,
        message: `${files.length} image${files.length === 1 ? "" : "s"} uploaded successfully.`,
        files
    });
});

router.delete("/api/ai-video/upload/:filename", (req, res) => {
    const { filename } = req.params;
    if (typeof filename !== "string" || !storedImageFilenamePattern.test(filename)) {
        return res.status(400).json({
            status: false,
            message: "The image identifier is invalid."
        });
    }

    const imagePath = path.join(clientImagesDirectory, filename);
    return fs.unlink(imagePath, (error) => {
        if (error && error.code === "ENOENT") {
            return res.status(404).json({
                status: false,
                message: "The uploaded image is no longer available."
            });
        }

        if (error) {
            return res.status(500).json({
                status: false,
                message: "The uploaded image could not be removed."
            });
        }

        return res.status(200).json({
            status: true,
            message: "Reference image removed."
        });
    });
});

router.post("/api/ai-video/generate", aiRateLimiting, (req, res) => {
    const { passcode, prompt, model, referenceImages = [] } = req.body || {};

    // Do not validate or start handling a generation request until it is authorised.
    if (!hasValidPasscode(passcode)) {
        return res.status(403).json({
            status: false,
            message: "The passcode is incorrect."
        });
    }

    const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!normalizedPrompt || normalizedPrompt.length > 2000) {
        return res.status(400).json({
            status: false,
            message: "Enter a video prompt of up to 2,000 characters."
        });
    }

    if (model !== videoModel) {
        return res.status(400).json({
            status: false,
            message: "The selected video model is not available."
        });
    }

    if (!Array.isArray(referenceImages) || referenceImages.length > 1 || !referenceImages.every(hasStoredReferenceImage)) {
        return res.status(400).json({
            status: false,
            message: "The optional start image is unavailable. Please upload it again."
        });
    }

    const requestId = crypto.randomUUID();
    const seed = crypto.randomInt(0, 2 ** 31);

    return (async () => {
        try {
            const startImageName = referenceImages[0]
                ? await uploadImageToComfyUi(referenceImages[0])
                : null;
            const workflow = buildWan22Workflow({
                prompt: normalizedPrompt,
                seed,
                startImageName,
                requestId
            });
            const response = await axios.post(`${comfyUiBaseUrl}/prompt`, {
                prompt: workflow,
                client_id: requestId
            }, { timeout: comfyUiTimeoutMs });
            const promptId = response.data?.prompt_id;

            if (typeof promptId !== "string" || !promptId) {
                throw new Error("ComfyUI did not return a generation job ID.");
            }

            comfyJobs.set(requestId, { promptId, createdAt: Date.now() });
            return res.status(202).json({
                status: true,
                message: "Wan 2.2 video queued. Generation can take several minutes.",
                job: {
                    id: requestId,
                    model: videoModel,
                    startImageUsed: Boolean(startImageName)
                }
            });
        } catch (error) {
            const comfyMessage = error.response?.data?.error?.message
                || error.response?.data?.message
                || error.message;
            return res.status(502).json({
                status: false,
                message: `ComfyUI could not queue this video: ${comfyMessage}`
            });
        }
    })();
});

router.get("/api/ai-video/jobs/:jobId", async (req, res) => {
    const job = comfyJobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ status: false, message: "The video job was not found." });
    }

    try {
        const historyEntry = await getComfyJobHistory(job.promptId);
        if (!historyEntry) {
            return res.json({ status: true, job: { state: "queued" } });
        }

        const executionError = getComfyError(historyEntry);
        if (executionError) {
            return res.json({ status: true, job: { state: "failed", error: executionError } });
        }

        const video = getComfyVideoOutput(historyEntry);
        if (video) {
            return res.json({
                status: true,
                job: {
                    state: "completed",
                    outputUrl: `/api/ai-video/jobs/${encodeURIComponent(req.params.jobId)}/output`
                }
            });
        }

        if (["error", "success"].includes(historyEntry.status?.status)) {
            return res.json({ status: true, job: { state: "failed", error: "ComfyUI stopped without producing a video." } });
        }

        return res.json({ status: true, job: { state: "running" } });
    } catch (error) {
        return res.status(502).json({
            status: false,
            message: `Could not read the ComfyUI job: ${error.message}`
        });
    }
});

router.get("/api/ai-video/jobs/:jobId/output", async (req, res) => {
    const job = comfyJobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ status: false, message: "The video job was not found." });
    }

    try {
        const historyEntry = await getComfyJobHistory(job.promptId);
        const video = getComfyVideoOutput(historyEntry);
        if (!video) {
            return res.status(409).json({ status: false, message: "The video is not ready yet." });
        }

        const response = await axios.get(`${comfyUiBaseUrl}/view`, {
            params: {
                filename: video.filename,
                subfolder: video.subfolder || "",
                type: video.type || "output"
            },
            responseType: "stream",
            timeout: comfyUiTimeoutMs
        });
        res.set("Cache-Control", "no-store");
        res.type(path.extname(video.filename));
        return response.data.pipe(res);
    } catch (error) {
        return res.status(502).json({
            status: false,
            message: `Could not retrieve the ComfyUI video: ${error.message}`
        });
    }
});

router.use((error, req, res, next) => {
    if (!(error instanceof multer.MulterError)) {
        return next(error);
    }

    if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            status: false,
            message: "Each reference image must be 20 MB or smaller."
        });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
            status: false,
            message: "You can upload one start image at a time."
        });
    }

    return res.status(400).json({
        status: false,
        message: "Only JPEG, PNG, WebP, and GIF images are supported."
    });
});

module.exports = router;
