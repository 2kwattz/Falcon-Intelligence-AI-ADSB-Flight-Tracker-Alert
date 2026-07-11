const fakeServerHeaders = (
   req,
   res,
   next
) => {

   // Remove revealing headers
   res.removeHeader("X-Powered-By");

   // Fake server identity
   res.set({

      "Server":
         "Apache/2.4.41 (Ubuntu)",

      "X-Powered-By":
         "PHP/7.4.3",

      "X-AspNet-Version":
         "4.0.30319",

      "X-Frame-Options":
         "SAMEORIGIN"

   });

   next();

};

module.exports = fakeServerHeaders;