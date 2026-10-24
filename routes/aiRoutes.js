const express = require("express"); // NodeJs Framework
const router = express.Router(); // Express Router

const authMiddleware = require("../middlewares/authMiddleware"); // Auth Middleware
const aiRateLimiting = require("../middlewares/aiRateLimiting");

const { askGemini, GeminiRequestError } = require("../llmClient/geminiService");
const cleanXSS = require("../utils/xssCleaner");

const MAX_PROMPT_CHARACTERS = 8000;

/*
 * Legacy local Qwen/Ollama integration — deliberately retained for an easy
 * rollback. The complete implementation remains in llmClient/ollamaService.js.
 *
 * const { askQwen2 } = require("../llmClient/ollamaService");
 *
 * // Inside the handler, replace the Gemini call with:
 * const response = await askQwen2(query);
 *
 * // Original Qwen response fields:
 * return res.status(200).json({
 *     status: true,
 *     message: response.response,
 *     model: response.model,
 *     createdAt: response.created_at,
 *     loadDuration: response.load_duration,
 *     totalDuration: response.totalDuration,
 *     promptEvalDuration: response.prompt_eval_duration,
 *     eval_duration: response.eval_duration
 * });
 */

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
        const submittedQuery = req.body?.query;

        if (typeof submittedQuery !== "string") {
            return res.status(400).json({
                status: false,
                message: "Invalid Query"
            });
        }

        const query = cleanXSS({ query: submittedQuery }).query;

        if(!query){
            return res.status(400).json({
                status: false,
                message: "Invalid Query"
            })
        }

        if (query.length > MAX_PROMPT_CHARACTERS) {
            return res.status(400).json({
                status: false,
                message: `Query must be ${MAX_PROMPT_CHARACTERS} characters or fewer`
            });
        }

        if(isPromptInjection(query)){
            return res.status(400).json({
                status:false,
                message: "Prompt Injection was detected and blocked"
            });
        }

        // Legacy local-model alternative (kept commented intentionally):
        // const response = await askQwen2(query);
        const response = await askGemini(query);

        if(!response?.response || typeof response?.response !== "string" ){
            return res.status(502).json({
                    status:false,
                    message: "Ai Service returned invalid response"
            });
        }

        return res.status(200).json({
            status:true,
            message:response.response,
            model: response.model,
            createdAt: response.createdAt,
            usageMetadata: response.usageMetadata
        });
    }
    catch(error){
        const statusCode = error instanceof GeminiRequestError ? error.statusCode : 500;
        console.error("Gemini request failed:", error.message);
        return res.status(statusCode).json({
                status:false,
                message: statusCode === 500 ? "Internal Server Error" : error.message
        });
    }
})

module.exports = router;
