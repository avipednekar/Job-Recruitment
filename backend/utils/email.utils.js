import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a 6-digit numeric OTP.
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send a verification OTP email.
 */
export const sendOTPEmail = async (email, otp, name = "") => {
  const greeting = name ? `Hi ${name},` : "Hi,";

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #2176FF; color: white; padding: 10px 20px; border-radius: 12px; font-size: 18px; font-weight: 700;">
          RecruitAI
        </div>
      </div>
      <div style="background: white; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${greeting}</p>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">
          Your email verification code is:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: #f1f5f9; border: 2px solid #2176FF; color: #1e293b; font-size: 32px; font-weight: 800; letter-spacing: 12px; padding: 16px 28px; border-radius: 12px; font-family: 'Courier New', monospace;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 24px 0 0; text-align: center;">
          This code expires in <strong>10 minutes</strong>.<br/>
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">
        © ${new Date().getFullYear()} RecruitAI • AI-Powered Recruitment Platform
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"RecruitAI" <${process.env.SMTP_USER || "noreply@recruitai.com"}>`,
    to: email,
    subject: `${otp} is your RecruitAI verification code`,
    html,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[Email] OTP sent to ${email}`);
};
