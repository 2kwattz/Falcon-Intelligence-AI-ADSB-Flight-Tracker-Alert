const CONFIGURABLE_CITY_IDS = ["bangalore", "delhi", "hyderabad"];
const DEFAULT_RADIUS_MILES = 100;

const DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS = Object.freeze({
    bangalore: Object.freeze([
        "roshan.bhatia.blueera@gmail.com",
        "prakashbhatia1970@gmail.com"
    ]),
    delhi: Object.freeze([
        "roshan.bhatia.blueera@gmail.com",
        "prakashbhatia1970@gmail.com"
    ]),
    hyderabad: Object.freeze([
        "roshan.bhatia.blueera@gmail.com",
        "prakashbhatia1970@gmail.com",
        "lokeshvarma211@gmail.com"
    ])
});

module.exports = {
    CONFIGURABLE_CITY_IDS,
    DEFAULT_RADIUS_MILES,
    DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS
};
