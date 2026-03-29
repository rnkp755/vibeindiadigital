import nodemailer from "nodemailer";


const SMTP_USER = process.env.SMTP_USER;
const GOOGLE_APP_PASSWORD = process.env.GOOGLE_APP_PASSWORD;

const FROM = process.env.SMTP_FROM_EMAIL ?? "noreply@vibeindia.digital";
const SUPPORT = process.env.SMTP_SUPPORT_EMAIL ?? "support@vibeindia.digital";
const ADMIN = process.env.ADMIN_EMAIL ?? "admin@vibeindia.digital";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (!SMTP_USER || !GOOGLE_APP_PASSWORD) {
    throw new Error(
      "Missing SMTP credentials. Set SMTP_USER and GOOGLE_APP_PASSWORD in the environment."
    );
  }

  cachedTransporter = nodemailer.createTransport({
		service: process.env.SMTP_SERVICE,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.GOOGLE_APP_PASSWORD, // The 16-character App Password
		},
  });

  return cachedTransporter;
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SupportEmailPayload {
  orderId: string;
  userEmail: string;
  userName: string;
  message: string;
}

export interface PaymentReviewEmailPayload {
  token: string;
  userEmail: string;
  planName: string;
  amount: number;
  extractedText: string;
  screenshotUrl?: string; // Cloudinary URL if uploaded
}

export interface PaymentConfirmedEmailPayload {
  userEmail: string;
  userName: string;
  planName: string;
  credits: number;
  amount: number;
  token: string;
}

export interface WelcomeEmailPayload {
  email: string;
  firstName?: string;
}

// â”€â”€â”€ Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function baseWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VibeIndia Digital</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#111111;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#FF1B6B22,#FF1B6B08);padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-flex;align-items:center;gap:8px;">
                      <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                        Vibe<span style="color:#FF1B6B;">India</span>
                      </span>
                      <span style="font-size:12px;color:#FF1B6B;background:rgba(255,27,107,0.12);padding:2px 8px;border-radius:999px;border:1px solid rgba(255,27,107,0.3);">
                        Digital
                      </span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);">
              <p style="margin:0;font-size:12px;color:#666666;text-align:center;line-height:1.6;">
                VibeIndia Digital &mdash; Music Distribution Platform<br/>
                If you have questions, reply to this email or contact
                <a href="mailto:${SUPPORT}" style="color:#FF1B6B;text-decoration:none;">${SUPPORT}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function badge(text: string, color = "#FF1B6B"): string {
  return `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.5px;">${text}</span>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="color:#888888;font-size:13px;">${label}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;">
        <span style="color:#ffffff;font-size:13px;font-weight:500;">${value}</span>
      </td>
    </tr>
  `;
}

// â”€â”€â”€ Email Senders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Sends a support email from a user about their order.
 * Goes to admin/support inbox.
 */
export async function sendSupportEmail(payload: SupportEmailPayload) {
  const { orderId, userEmail, userName, message } = payload;

  const html = baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      New Support Request
    </h2>
    <p style="margin:0 0 24px;color:#888888;font-size:14px;">
      A user submitted a support message for their order.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow("Order ID", `#${orderId}`)}
      ${infoRow("User Name", userName)}
      ${infoRow("User Email", userEmail)}
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#888888;font-weight:500;text-transform:uppercase;letter-spacing:1px;">
      Message
    </p>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px;">
      <p style="margin:0;font-size:15px;color:#dddddd;line-height:1.7;white-space:pre-wrap;">${message}</p>
    </div>

    <div style="margin-top:28px;">
      <a href="mailto:${userEmail}" style="display:inline-block;background:#FF1B6B;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Reply to User
      </a>
    </div>
  `);

  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM,
    to: ADMIN,
    replyTo: userEmail,
    subject: `[Support] Order #${orderId} â€” ${userName}`,
    html,
  });
}

/**
 * Sends an email to admin when a payment needs review (OCR mismatch / token not found).
 */
export async function sendPaymentReviewEmail(payload: PaymentReviewEmailPayload) {
  const { token, userEmail, planName, amount, extractedText, screenshotUrl } =
    payload;

  const html = baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      ${badge("Needs Review", "#F59E0B")} Payment Requires Manual Review
    </h2>
    <p style="margin:0 0 24px;color:#888888;font-size:14px;">
      A payment screenshot could not be automatically verified. Please review manually.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow("Token", token)}
      ${infoRow("User Email", userEmail)}
      ${infoRow("Plan", planName)}
      ${infoRow("Expected Amount", `â‚¹${amount.toFixed(2)}`)}
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#888888;font-weight:500;text-transform:uppercase;letter-spacing:1px;">
      OCR Extracted Text
    </p>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;margin-bottom:24px;max-height:200px;overflow:auto;">
      <pre style="margin:0;font-size:12px;color:#cccccc;line-height:1.6;white-space:pre-wrap;font-family:monospace;">${extractedText.slice(
        0,
        2000
      )}</pre>
    </div>

    ${
      screenshotUrl
        ? `
    <p style="margin:0 0 8px;font-size:13px;color:#888888;font-weight:500;text-transform:uppercase;letter-spacing:1px;">
      Screenshot
    </p>
    <div style="margin-bottom:24px;">
      <a href="${screenshotUrl}" style="display:inline-block;">
        <img src="${screenshotUrl}" alt="Payment Screenshot" style="max-width:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.1);" />
      </a>
    </div>
    `
        : ""
    }

    <div style="margin-top:8px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/payments" style="display:inline-block;background:#FF1B6B;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Review in Admin Dashboard
      </a>
    </div>
  `);

  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM,
    to: ADMIN,
    subject: `[Payment Review] Token ${token} â€” ${userEmail}`,
    html,
  });
}

/**
 * Sends a confirmation email to user when their payment is successfully verified.
 */
export async function sendPaymentConfirmedEmail(
  payload: PaymentConfirmedEmailPayload
) {
  const { userEmail, userName, planName, credits, amount, token } = payload;

  const html = baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      ${badge("Payment Confirmed", "#10B981")} Your Credits Are Ready!
    </h2>
    <p style="margin:0 0 24px;color:#888888;font-size:14px;">
      Hi ${userName ?? userEmail}, your payment has been verified and credits have been added to your account.
    </p>

    <div style="background:linear-gradient(135deg,rgba(255,27,107,0.12),rgba(255,27,107,0.04));border:1px solid rgba(255,27,107,0.2);border-radius:12px;padding:24px;margin-bottom:28px;text-align:center;">
      <p style="margin:0 0 4px;font-size:14px;color:#888888;">Credits Added</p>
      <p style="margin:0;font-size:48px;font-weight:800;color:#FF1B6B;">${credits}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#666666;">${planName} Plan</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${infoRow("Transaction Token", token)}
      ${infoRow("Plan", planName)}
      ${infoRow("Amount Paid", `â‚¹${amount.toFixed(2)}`)}
      ${infoRow("Credits Added", credits.toString())}
    </table>

    <p style="margin:0 0 20px;font-size:14px;color:#aaaaaa;line-height:1.6;">
      You can now use your credits to distribute your music tracks. Head to your dashboard to get started.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/create-order" style="display:inline-block;background:#FF1B6B;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Start Distributing â†’
    </a>
  `);

  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM,
    to: userEmail,
    subject: `âœ… Payment Confirmed â€” ${credits} Credits Added (${planName} Plan)`,
    html,
  });
}

/**
 * Sends a welcome email to a newly registered user.
 */
export async function sendWelcomeEmail(payload: WelcomeEmailPayload) {
  const { email, firstName } = payload;
  const name = firstName ?? email.split("@")[0];

  const html = baseWrapper(`
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
      Welcome to VibeIndia! ðŸŽµ
    </h2>
    <p style="margin:0 0 24px;color:#888888;font-size:15px;line-height:1.6;">
      Hey ${name}! We're thrilled to have you on board. VibeIndia Digital is your one-stop platform to distribute your music to all major streaming platforms worldwide.
    </p>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:28px;">
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#ffffff;">How to get started:</h3>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:28px;">
            <span style="display:inline-block;width:22px;height:22px;background:#FF1B6B;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#fff;">1</span>
          </td>
          <td style="padding:8px 0 8px 10px;">
            <span style="color:#dddddd;font-size:14px;line-height:1.5;">Buy Credits â€” choose a plan that suits your release needs</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:28px;">
            <span style="display:inline-block;width:22px;height:22px;background:#FF1B6B;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#fff;">2</span>
          </td>
          <td style="padding:8px 0 8px 10px;">
            <span style="color:#dddddd;font-size:14px;line-height:1.5;">Create an Order â€” upload your tracks and fill in your release details</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:28px;">
            <span style="display:inline-block;width:22px;height:22px;background:#FF1B6B;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#fff;">3</span>
          </td>
          <td style="padding:8px 0 8px 10px;">
            <span style="color:#dddddd;font-size:14px;line-height:1.5;">Track Progress â€” monitor your distribution status in real time</span>
          </td>
        </tr>
      </table>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#FF1B6B;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
      Go to Dashboard â†’
    </a>
  `);

  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Welcome to VibeIndia Digital, ${name}! ðŸŽµ`,
    html,
  });
}
