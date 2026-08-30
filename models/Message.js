const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.Mixed, required: true },
    content: { type: String, default: "" },
    chat: { type: String, required: true, index: true },
    chatObj: { type: mongoose.Schema.Types.Mixed },
    type: {
      type: String,
      default: "text",
    },
    messageType: { type: String },
    mediaUrl: { type: String },
    mediaName: { type: String },
    mediaSize: { type: String },
    mediaDuration: { type: Number },
    fileUrl: { type: String },
    audioUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: mongoose.Schema.Types.Mixed },
    fileType: { type: String },
    forwardedFrom: { type: mongoose.Schema.Types.Mixed },
    reactions: { type: mongoose.Schema.Types.Mixed, default: {} },
    pollData: { type: mongoose.Schema.Types.Mixed },
    locationData: { type: mongoose.Schema.Types.Mixed },
    location: { type: mongoose.Schema.Types.Mixed },
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: String }],
    deletedAt: { type: Date },
    isForwarded: { type: Boolean, default: false },
    isBroadcast: { type: Boolean, default: false },
    replyTo: { type: mongoose.Schema.Types.Mixed },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isPinned: { type: Boolean, default: false },
    isStarredBy: [{ type: String }],
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    _id: false,
    strict: false,
  }
);

messageSchema.index({ chat: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
module.exports = Message;
