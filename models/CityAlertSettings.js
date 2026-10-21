const mongoose = require("mongoose");
const {
  DEFAULT_RADIUS_MILES,
  DEFAULT_CITY_ALERT_ENABLED,
  DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS
} = require("../utils/cityAlertDefaults");

const cityAlertSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: "remote-city-alert-settings"
    },
    radii: {
      bangalore: { type: Number, default: DEFAULT_RADIUS_MILES, min: 1, max: 1000 },
      delhi: { type: Number, default: DEFAULT_RADIUS_MILES, min: 1, max: 1000 },
      hyderabad: { type: Number, default: DEFAULT_RADIUS_MILES, min: 1, max: 1000 }
    },
    enabled: {
      bangalore: { type: Boolean, default: DEFAULT_CITY_ALERT_ENABLED.bangalore },
      delhi: { type: Boolean, default: DEFAULT_CITY_ALERT_ENABLED.delhi },
      hyderabad: { type: Boolean, default: DEFAULT_CITY_ALERT_ENABLED.hyderabad }
    },
    emailRecipients: {
      bangalore: { type: [String], default: () => [...DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS.bangalore] },
      delhi: { type: [String], default: () => [...DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS.delhi] },
      hyderabad: { type: [String], default: () => [...DEFAULT_CITY_ALERT_EMAIL_RECIPIENTS.hyderabad] }
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("CityAlertSettings", cityAlertSettingsSchema);
