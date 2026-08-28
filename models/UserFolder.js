const mongoose = require("mongoose");

const userFolderSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // userId
    folders: [{ type: mongoose.Schema.Types.Mixed }],
  },
  {
    timestamps: true,
    _id: false,
  }
);

const UserFolder =
  mongoose.models.UserFolder || mongoose.model("UserFolder", userFolderSchema);
module.exports = UserFolder;
