const express = require("express");
const path = require("path");

const router = express.Router();

router.get("/explore", (req, res) => {
    return res.sendFile(path.join(__dirname, "../public/explore.html"));
});

module.exports = router;
