const express = require("express");
const router = express.Router();

// Auth Middleware

const authMiddleware = require("../middlewares/authMiddleware");

// For multipart form data (images etc)
const multer = require("multer");

// Multer Configuration

const upload = multer({
    dest: "uploads/communities/"
})

const redisClient = require("../redis/redisClient");

// Utility Functions
const sendEmail = require("../services/sendEmail"); // Email Service
const deviceParser = require("../utils/deviceParser"); // Device User Agent Parsing
const cleanXSS = require("../utils/xssCleaner"); // To prevent XSS Attacks 
const { formatName } = require("../utils/commonHelpers"); // Common Helper Functions

// SQL Connection
const { pool } = require("../db/conn");

// Community Routes

router.post("/create", authMiddleware, upload.single("cIcon"), async function (req, res) {

    const connection = await pool.getConnection(); // Required for SQL Transaction

    try {
        console.log("[*] Inside Create Community Route");


        // Cleaned Body Request
        const cleanedBodyData = cleanXSS(req.body);

        // Formatting Community Name
        cleanedBodyData.cName = formatName(cleanedBodyData?.cName).trim() || "";
        cleanedBodyData.cDescription = cleanedBodyData.cDescription?.trim() || "";
        cleanedBodyData.cIcon = req.file?.path || null;
        cleanedBodyData.cSlug = cleanedBodyData.cSlug?.trim() || "";
        cleanedBodyData.cRules = cleanedBodyData.cRules?.trim() || "";

        console.log("[*] Community Slug Value ", cleanedBodyData.cSlug);
        console.log("[*] Community Name Value ", cleanedBodyData.cName);

        // User Id from Request Header
        const userId = req.user.id;


        // Member Count : 1 => Because an admin is the first member

        const member_count = 1;

        // Validations

        // Validating Slug/ Subcommunity
        if (!cleanedBodyData.cSlug) {
            return res.status(400).json({
                status: false,
                message: "Community slug is required"
            });
        }

        // Regex to validate slug
        const slugTestRegex = /^[A-Za-z][A-Za-z0-9_]*$/;

        // Normalized Community Name
        const normalizedCommunitySlug = cleanedBodyData.cSlug.trim().toLowerCase();

        if (!slugTestRegex.test(cleanedBodyData.cSlug)) {
            return res.status(400).json({
                status: false,
                message: "Community slug can only contain numbers, underscores and alphabets. Slug cannot start with number or underscore"
            });
        }

        // Validating Slug's uniqueness

        const [existingCommunitySlug] = await connection.query("SELECT community_id FROM communities WHERE normalized_slug =  ?", [normalizedCommunitySlug]);

        if (existingCommunitySlug.length > 0) {
            return res.status(400).json({
                status: false,
                message: "Community slug already exists. Please use a different slug"
            })
        }


        // Validating Name
        if (!cleanedBodyData.cName) {
            return res.status(400).json({
                status: false,
                message: "Community name is required"
            });
        }

        // Validating Description
        if (!cleanedBodyData.cDescription) {
            return res.status(400).json({
                status: false,
                message: "Community description is required"
            });
        }

        // Validating Rules
        if (!cleanedBodyData.cRules) {
            return res.status(400).json({
                status: false,
                message: "Community rules are required"
            });
        };

        // Registering Community

        await connection.beginTransaction(); // Starting Transaction

        const [insertCommunity] = await connection.query(
            `
        INSERT INTO communities
        (
        community_name,
        community_icon_url,
        community_rules,
        community_slug,
        normalized_slug,
        community_admin_id,
        community_description,
        member_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
                cleanedBodyData.cName,
                cleanedBodyData.cIcon,
                cleanedBodyData.cRules,
                cleanedBodyData.cSlug,
                normalizedCommunitySlug,
                userId,
                cleanedBodyData.cDescription,
                member_count
            ]
        );

        if (insertCommunity.affectedRows !== 1) {
            throw new Error("Community insert failed");
        }
        const communityId = insertCommunity.insertId;
        const role = "admin"; // Since only admin can create a group

        // Inserting User Id and Community Id in Junction Table

        const [community_user_membership] = await connection.query(`INSERT INTO community_members (user_id,community_id,role)
            VALUES(?,?,?)`, [
            userId,
            communityId,
            role
        ])

        if (community_user_membership.affectedRows !== 1) {
            throw new Error("Membership insert failed");
        }

        await connection.commit(); // SQL Transaction Completed

        return res.status(201).json({
            status: true,
            message: "Community created successfully",
            communityId,
            communitySlug: cleanedBodyData.cSlug
        });

    }
    catch (error) {

        await connection.rollback();

        res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }

    finally {
        connection.release();
    }
})

// List All Communities

router.get("/all", async function (req, res) {

    try {
        console.log("[*] Listing all communities");

        // Quering Page

        const page = parseInt(req.query.page) || 1;

        // Capping the limit to 50 
        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 20, 1),
            50
        );
        const offset = (page - 1) * limit;

        // Redis Cache Key
        const redisCacheKey = `all_communities:${page}:${limit}`;
        const cachedCommunities = await redisClient.get(redisCacheKey);

        if(cachedCommunities){

            console.log("REDIS CACHE HIT")
            return res.json(JSON.parse(cachedCommunities));
        }


        // Fetching Communities

        console.log("[*] No Redis Cache. Hitting DB");

        const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM communities`);

        const totalCommunities = countRows[0].total;

        console.log("[*] Total Communities Count ", totalCommunities);

        // Fetching communitites from database

        const [communities] = await pool.query(`SELECT * FROM communities ORDER BY community_id DESC LIMIT ? OFFSET ?`, [limit, offset]);

        // Calculating Total Pages

        const totalPages = Math.ceil(totalCommunities / limit);

        const response = {
            status: true,
            page,
            limit,
            totalCommunities,
            totalPages,
            data: communities
        }

        await redisClient.setex(redisCacheKey,1200,JSON.stringify(response))

        res.status(200).json(response)

    }
    catch (error) {

        console.log("[*] Error in /all community router ",error?.message || error)

        res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })

    }

})

// View Specific Community

router.get("/:communitySlug", authMiddleware, async function (req,res) {

    try {
        console.log("[*] Fetching Community Details");

        // Regex to validate slug
        const slugTestRegex = /^[A-Za-z][A-Za-z0-9_]*$/;


        const communitySlug = req.params?.communitySlug?.trim()?.toLowerCase();

        if(!communitySlug){
            return res.status(400).json({
                status: false,
                message: "Valid community name is required"
            })
        }

        console.log(`[*] Community Slug from backend `,communitySlug)
        if (!slugTestRegex.test(communitySlug)) {
            return res.status(400).json({
                status: false,
                message: "Community slug can only contain letters, numbers and underscores. First character can only be a letter"
            })
        }

        // Fetching Community Data from Redis 
        const communitySlugCacheKey = `communityDetails:${communitySlug}`;

        const cachedCommunityCache = await redisClient.get(communitySlugCacheKey);

        if(cachedCommunityCache){

            console.log("[*] Community Details Cache Hit")

            return res.json(JSON.parse(cachedCommunityCache))
        }

        const fetchCommunityQuery = `SELECT * FROM communities WHERE normalized_slug = ? LIMIT 1`;

        const [result] = await pool.execute(fetchCommunityQuery, [communitySlug]);

        console.log("[*] Result from SQL Query ",result)

        if (result.length === 0) {
            return res.status(404).json({
                status: false,
                message: "Community not found"
            })
        }
        const community = result[0];

        const response = {
             status: true,
            communityName: community.community_name,
            communityDescription: community.community_description,
            communityRules: community.community_rules,
            communityCoverImage: community.community_cover_url,
            communityIcon: community.community_icon_url,
            communityAdmin: community.community_admin_id,
            communitySlug: community.community_slug,
            memberCount: community.member_count,
            createdAt: community.created_at
        }

        console.log("[*] Community Details fetched from DB")
        await redisClient.setex(communitySlugCacheKey,7000,JSON.stringify(response));

        return res.status(200).json(response)
    }
    catch (error) {
        console.log("[*] Error in fetching community name ", error);

        console.log(`[*] Error in loading room ${error.message || error}`);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
    }

});

module.exports = router;