import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,                       // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a magic-link email to the user.
 *
 * @param {string} to        – recipient email
 * @param {string} magicLink – full URL the user clicks
 */
export async function sendMagicLinkEmail(to, magicLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from,
    to,
    subject: "Your sign-in link",
    text: `Click here to sign in:\n\n${magicLink}\n\nThis link expires in 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Sign in</h2>
        <p>Click the button below to sign in. This link expires in <strong>10 minutes</strong>.</p>
        <a href="${magicLink}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:600">
          Sign in
        </a>
        <p style="margin-top:24px;font-size:13px;color:#666">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[EMAIL] Magic link sent to ${to}`);
}
