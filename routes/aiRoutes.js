const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router

const redisClient = require("../redis/redisClient"); // Caching
const authMiddleware = require("../middlewares/authMiddleware"); // Auth Middleware
const aiRateLimiting = require("../middlewares/aiRateLimiting");

const {askQwen2} = require("../llmClient/ollamaService");
const cleanXSS = require("../utils/xssCleaner");

function isPromptInjection(text) {
    const patterns = [
        /\b(ignore|disregard|forget|override)\b.{0,80}\b(instruction|system|prompt)\b/i,

        /\b(you are now|act as|pretend to be|roleplay as)\b/i,

        /\b(jailbreak|developer mode|DAN mode|unrestricted mode)\b/i,

        /\b(do not follow|stop following)\b.{0,50}\b(rules|instructions)\b/i
    ];

    return patterns.some(p => p.test(text));
}

// Routes

router.post("/askllm",aiRateLimiting, authMiddleware,async function(req,res){

    try{
        console.log("[*] Request Sent to QWEN2.5 7B Model");
        let query = req.body.query;

        query = query.toLowerCase().trim();

        if(!query){
            return res.status(400).json({
                status: false,
                message: "Invalid Query"
            })
        }

        if(isPromptInjection(query)){
            return res.status(400).json({
                status:false,
                message: "Prompt Injection was detected and blocked",
                ipAddress: req.ip

            })}

        const response = await askQwen2(query);

        if(!response?.response || typeof response?.response !== "string" ){
            return res.status(500).json({
                    status:false,
                    message: "Ai Service returned invalid response"
                })
            }

        if(response?.response){
            return res.status(200).json({
                status:true,
                message:response.response,
                model: response.model,
                createdAt: response.created_at,
                loadDuration: response.load_duration,
                totalDuration: response.totalDuration,
                promptEvalDuration: response.prompt_eval_duration,
                eval_duration: response.eval_duration

            })
        }
        
        else{
            return res.status(500).json({
                status:false,
                message:"Internal Server Error"
            })
        }
    }
    catch(error){
         console.log("[*] Error sending request to QWEN2.5 7B Model", error);
           return res.status(500).json({
                status:false,
                message:"Internal Server Error"
            })
    }
})

module.exports = router;