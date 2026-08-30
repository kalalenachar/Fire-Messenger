const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: mongoose.Schema.Types.Mixed }],
    latestMessage: { type: mongoose.Schema.Types.Mixed, default: null },
    groupAdmin: { type: mongoose.Schema.Types.Mixed, default: null },
    pinned: { type: Boolean, default: false },
    pinnedMessage: { type: mongoose.Schema.Types.Mixed, default: null },
    disappearingTimer: { type: Number, default: 0 }, // 0 = off, seconds otherwise
    isMuted: { type: Boolean, default: false },
    wallpaper: { type: String, default: "" },
    isArchived: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    unread: { type: Number, default: 0 },
    category: { type: String, default: "Personal" },
    isSavedMessages: { type: Boolean, default: false },
    platform: { type: String, enum: ["agni", "whatsapp", "telegram"], default: "agni" },
    platformChatId: { type: String, default: "" },
    platformMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    _id: false,
    strict: false,
  }
);

chatSchema.index({ "users._id": 1 });
chatSchema.index({ updatedAt: -1 });

const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
module.exports = Chat;
