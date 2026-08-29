const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, lowercase: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    password: { type: String, required: true },
    pic: {
      type: String,
      default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    },
    status: { type: String, default: "Available | 🔥 Agni Messenger" },
    token: { type: String },
    isAdmin: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["none", "pending", "verified", "rejected"],
      default: "none",
    },
    verificationType: { type: String, default: "individual" },
    verificationDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    customFolders: { type: Array, default: [] },
  },
  {
    timestamps: true,
    _id: false,
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ name: "text", email: "text", username: "text" });

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
