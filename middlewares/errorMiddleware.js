
const errorMiddleware = function(err,req,res,next){

    let errorMessage = err?.message || "Internal Server Error";
    let errorCode = err?.statusCode || 500;

    console.error(`[*] Internal Server Error \n ${err.stack}`)

        res.status(errorCode).json({
            status:false,
            errorCode: errorCode,
            errorMessage: errorMessage,
            errorStack: process.env.NODE_ENV === "development"? err.stack : undefined
        })
    }

module.exports = errorMiddleware;