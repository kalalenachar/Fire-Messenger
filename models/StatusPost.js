const mongoose = require("mongoose");

const statusPostSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    author: { type: mongoose.Schema.Types.Mixed, required: true },
    type: { type: String, enum: ["text", "image", "video"], default: "text" },
    content: { type: String, default: "" },
    caption: { type: String, default: "" },
    bgColor: { type: String, default: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)" },
    fontStyle: { type: String, default: "sans-serif" },
    audienceProfileIds: { type: [String], default: ["ALL"] },
    viewers: [
      {
        userId: String,
        name: String,
        pic: String,
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Auto-deletes on expiry
  },
  {
    timestamps: true,
    _id: false,
  }
);

const StatusPost = mongoose.models.StatusPost || mongoose.model("StatusPost", statusPostSchema);
module.exports = StatusPost;
