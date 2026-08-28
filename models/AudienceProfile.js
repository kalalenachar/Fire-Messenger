const mongoose = require("mongoose");

const audienceProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    mode: { type: String, enum: ["whitelist", "blacklist"], default: "whitelist" },
    isDefault: { type: Boolean, default: false },
    memberIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
    _id: false,
  }
);

const AudienceProfile =
  mongoose.models.AudienceProfile || mongoose.model("AudienceProfile", audienceProfileSchema);
module.exports = AudienceProfile;
