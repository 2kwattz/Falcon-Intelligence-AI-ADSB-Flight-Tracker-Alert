const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
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
        files: 5
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

router.get("/falcon-video-generator", (req, res) => {
    return res.sendFile(path.join(__dirname, "../public/falcon-video-generator.html"));
});

router.post("/api/ai-video/upload", upload.array("referenceImages", 5), (req, res) => {
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

    if (!Array.isArray(referenceImages) || referenceImages.length > 5 || !referenceImages.every(hasStoredReferenceImage)) {
        return res.status(400).json({
            status: false,
            message: "One or more reference images are unavailable. Please upload them again."
        });
    }

    return res.status(202).json({
        status: true,
        message: "Passcode accepted. Your video request is authorized for processing.",
        request: {
            id: crypto.randomUUID(),
            model: videoModel,
            referenceImageCount: referenceImages.length
        }
    });
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
            message: "You can upload up to 5 reference images at a time."
        });
    }

    return res.status(400).json({
        status: false,
        message: "Only JPEG, PNG, WebP, and GIF images are supported."
    });
});

module.exports = router;
