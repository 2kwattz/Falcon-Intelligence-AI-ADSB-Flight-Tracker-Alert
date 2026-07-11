const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
    try {
        console.log("[*] Authenticating User ")

          // Fetch token from cookies

        const token = req.cookies.token;

        console.log("[*] TOKEN ",token)

        // If JWT Token is missing
        if (!token) {
            return res.status(401).json({
                status: false,
                message: "Token missing"
            });

        }

        console.log("[*] Verifying Token Signature ")
        // Verifying JWT Token Signature
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY
        );

        // Appending user details in Request object
        req.user = decoded;

        console.log("[*] REQ.USER Value ",req.user);

        console.log("[*] User Authenticated")
        next();


    }
    catch (error) {
        console.log(`[*] Error in Auth Middleware ${error.message || error} `);
        return res.status(401).json({
            status: false,
            message:"Invalid or Expired Token"
        })
    }
}

module.exports = authMiddleware;