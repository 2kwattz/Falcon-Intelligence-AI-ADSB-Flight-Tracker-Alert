const express = require("express"); // Express Instance
const router = express.Router();
const cleanXSS = require("../utils/xssCleaner") // To prevent XSS Attacks 
const crypto = require("crypto"); // For security & cryptographic operations
const authMiddleware = require("../middlewares/authMiddleware");


// Cross Platform Chatroom Routes

// Create Chatroom

router.post("/create", authMiddleware,async function (req, res) {
    try {
        const cleanedBodyData = cleanXSS(req.body);

        // Destructuring Chatroom Creation Request
        const { chatroomName, chatroomDescription, chatroomIcon } = cleanedBodyData;

        // Chatroom name and description validations

        if (!chatroomName || chatroomName.trim() === "") {
            return res.status(400).json({
                status: false,
                message: "Chatroom Name is required"
            });
        }

        if (chatroomName < 6) {
            return res.status(400).json({
                status: false,
                message: "Chatroom Name should be atleast 6 characters"
            });
        }

        if (!chatroomDescription || chatroomDescription.trim() === "") {
            return res.status(400).json({
                status: false,
                message: "Chatroom Description is required"
            });
        }
        if (chatroomDescription.length < 6) {
            return res.status(400).json({
                status: false,
                message: "Chatroom Description should be atleast 6 characters"
            });
        }

        // Generating random UUID corresponding to each chatroom
        const roomUUID = crypto.randomUUID();

        // After storing in database
        return res.status(201).json({
            status: true,
            message: "Chatroom Created Successfully",
            roomUUID
        });

    }
    catch (error) {
        console.error(`[*] Error in creating chatroom ${error.message || error}`);
        return res.status(500).json({
                status: false,
                message: "Internal Server Error"
            });
    }
})

// Fetch All Chatrooms

router.get("/all",authMiddleware, async function (req, res) {
    try {
        console.log("[*] Fetching all chatrooms")

    }
    catch (error) {
        console.log(`[*] Error in Fetching all chatrooms ${error.message || error}`);
         return res.status(500).json({
         status:false,
         message:"Internal Server Error"
      });
    }
})

module.exports = router;
