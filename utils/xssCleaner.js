const xss = require("xss"); // Cross Site Scripting Prevention
// 
// XSS Cleaned Value Helper Function
const cleanXSS = (obj) => {

    const cleaned = {};

    const excludedFields = [
        "password",
        "confirmPassword"
    ];

    for (let key in obj) {
        if (
            typeof obj[key] === "string" &&
            !excludedFields.includes(key)
        ) {

            cleaned[key] = xss(obj[key].trim());
        } else {

            cleaned[key] = obj[key];

        }
    }
    return cleaned;
};

module.exports = cleanXSS;