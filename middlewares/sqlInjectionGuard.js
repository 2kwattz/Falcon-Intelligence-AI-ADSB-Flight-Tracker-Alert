// This middleware is an extra defence layer and does not compromise with parameterized queries & validations
// for attacks like SQL Injection. It also shows a message "SQL Injection was detected and blocked" along with
// user's ip address

const sqlInjectionGuard = (req,res,next) =>{

    // Fetching Attacker's IP Address

    const ip =
   req.headers["x-forwarded-for"] ||
   req.socket.remoteAddress ||
   req.ip;

    const data = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
   });

   const sqlPattern = /(\%27)|(\')|(\-\-)|(\b(OR|AND)\b.*=)|(\bUNION\b.*\bSELECT\b)/i;

    if (sqlPattern.test(data)) {

      return res.status(403).json({

         success: false,
         ip,
         message:"SQL Injection was Detected and Blocked"});
   }

   next();

};

module.exports = sqlInjectionGuard;