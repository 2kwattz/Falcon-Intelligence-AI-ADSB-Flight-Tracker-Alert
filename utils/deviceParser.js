const UAParser = require("ua-parser-js");

module.exports = (userAgent) => {

    return new UAParser(userAgent).getResult();

};