const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    reporterUser: { type: mongoose.Schema.Types.Mixed, required: true },
    targetObj: { type: mongoose.Schema.Types.Mixed, required: true },
    reason: { type: String, required: true },
    details: { type: String, default: "" },
    status: { type: String, enum: ["pending", "resolved", "dismissed"], default: "pending" },
    adminNotes: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    _id: false,
  }
);

reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);
module.exports = Report;
