const nodemailer = require("nodemailer");

async function sendAdminReportAlertEmail(reportData) {
  const adminEmail = process.env.ADMIN_EMAIL || "kalalenachar@gmail.com";
  console.log(`📧 Dispatching Instant Admin Email Alert to: ${adminEmail}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  const reporterName = reportData.reporterUser?.name || reportData.reporterUser?.email || "User";
  const reporterEmail = reportData.reporterUser?.email || "Unknown Email";
  const targetTitle = reportData.targetObj?.name || reportData.targetObj?.chatName || reportData.targetObj?._id || "Target";
  const targetType = reportData.targetObj?.isGroupChat ? "Group Chat" : reportData.targetObj?.name ? "User Profile" : "Message / Conversation";
  const reasonText = reportData.reason || "Unspecified Reason";
  const detailsText = reportData.details ? reportData.details : "No additional comments provided.";
  const timestamp = new Date(reportData.createdAt || Date.now()).toLocaleString();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold;">🚨 URGENT: Agni Messenger Safety Report</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">High Priority Moderation Alert for Admin Review</p>
      </div>

      <div style="padding: 24px; color: #333333; font-size: 14px; line-height: 1.6;">
        <p style="font-size: 15px; font-weight: bold; color: #111827; margin-top: 0;">
          Attention Admin,
        </p>
        <p>A new user/content report was submitted on <strong>Agni Messenger</strong> and requires your immediate attention to react:</p>

        <div style="background: #f8fafc; border-left: 4px solid #e11d48; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 140px; color: #64748b;">Reported By:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${reporterName} (${reporterEmail})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #64748b;">Target Item:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${targetTitle} (${targetType})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #64748b;">Report Category:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #e11d48;">⚠️ ${reasonText}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #64748b;">Date & Time:</td>
              <td style="padding: 6px 0; color: #475569;">${timestamp}</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 14px; color: #0f172a; margin-bottom: 6px;">Reporter's Additional Comments:</h3>
        <blockquote style="margin: 0; padding: 12px 16px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; font-style: italic; color: #9f1239;">
          "${detailsText}"
        </blockquote>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <div style="text-align: center;">
          <a href="https://agni.run.place" style="display: inline-block; background: #00a884; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; font-size: 14px;">
            Open Agni Messenger Admin Portal
          </a>
        </div>
      </div>

      <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
        Agni Messenger Real-Time Automated Safety System &bull; Admin Instant Alert Service
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Agni Messenger Safety" <no-reply@agnimessenger.io>`,
      to: adminEmail,
      subject: `🚨 [URGENT REPORT] ${reasonText} reported by ${reporterName}`,
      text: `Urgent Report Alert:\n\nReporter: ${reporterName} (${reporterEmail})\nTarget: ${targetTitle}\nReason: ${reasonText}\nComments: ${detailsText}\nTime: ${timestamp}`,
      html: htmlContent,
    });
    console.log(`✅ Admin Instant Email Alert dispatched to ${adminEmail}! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`⚠️ Primary SMTP notice: ${error.message}. Generating test account preview...`);
    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const testInfo = await testTransporter.sendMail({
        from: `"Agni Messenger Safety" <no-reply@agnimessenger.io>`,
        to: adminEmail,
        subject: `🚨 [URGENT REPORT] ${reasonText} reported by ${reporterName}`,
        html: htmlContent,
      });
      console.log(`✅ Admin Instant Email Alert preview generated! URL: ${nodemailer.getTestMessageUrl(testInfo)}`);
      return { success: true, previewUrl: nodemailer.getTestMessageUrl(testInfo) };
    } catch (e) {
      console.error("Could not send email alert:", e);
      return { success: false, error: e.message };
    }
  }
}

module.exports = {
  sendAdminReportAlertEmail,
};
