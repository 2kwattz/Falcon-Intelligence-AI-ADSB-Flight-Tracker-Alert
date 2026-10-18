const CITY_ALERT_NOTIFICATION_TIME_ZONE = "Asia/Kolkata";
const CITY_ALERT_NOTIFICATION_START_HOUR = 8;
const CITY_ALERT_NOTIFICATION_END_HOUR = 2;

function getHourInNotificationTimeZone(date = new Date()) {
    const hour = new Intl.DateTimeFormat("en-US", {
        timeZone: CITY_ALERT_NOTIFICATION_TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23"
    }).format(date);

    return Number(hour);
}

function areCityAlertNotificationsEnabled(date = new Date()) {
    const hour = getHourInNotificationTimeZone(date);

    // The schedule crosses midnight: 08:00 through 01:59 IST is active.
    return hour >= CITY_ALERT_NOTIFICATION_START_HOUR ||
        hour < CITY_ALERT_NOTIFICATION_END_HOUR;
}

module.exports = {
    CITY_ALERT_NOTIFICATION_TIME_ZONE,
    CITY_ALERT_NOTIFICATION_START_HOUR,
    CITY_ALERT_NOTIFICATION_END_HOUR,
    areCityAlertNotificationsEnabled
};
