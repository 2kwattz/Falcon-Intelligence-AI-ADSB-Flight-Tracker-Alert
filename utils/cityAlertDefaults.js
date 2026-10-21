const CONFIGURABLE_CITY_IDS = ["bangalore", "delhi", "hyderabad"];
const DEFAULT_RADIUS_MILES = 100;

// Remote airspace tracking is opt-in per city. Keep Hyderabad running during
// the rollout; Bangalore and Delhi remain dormant until enabled from the
// dashboard. Vadodara deliberately is not included because it uses local SDR.
const DEFAULT_CITY_ALERT_ENABLED = Object.freeze({
    bangalore: false,
    delhi: false,
    hyderabad: true
});

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
    DEFAULT_CITY_ALERT_ENABLED,
    DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS
};
