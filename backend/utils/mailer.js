import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('[mailer] SMTP environment variables are missing.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },

    // Helps prevent the connection from hanging for too long.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return transporter;
};

/**
 * Verify the SMTP connection.
 */
export const verifyMailer = async () => {
  const client = getTransporter();

  if (!client) {
    return false;
  }

  try {
    await client.verify();

    console.log('[mailer] SMTP connection successful.');
    console.log(`[mailer] SMTP user: ${process.env.SMTP_USER}`);

    return true;
  } catch (error) {
    console.error('[mailer] SMTP connection failed.');
    console.error('[mailer] Error:', error);

    return false;
  }
};

/**
 * Send an email.
 */
export const sendMail = async ({ to, subject, html }) => {
  if (!to) {
    console.warn('[mailer] No recipient email provided.');
    return false;
  }

  const client = getTransporter();

  if (!client) {
    console.error(`[mailer] SMTP is not configured. Email skipped: ${to}`);

    return false;
  }

  try {
    const info = await client.sendMail({
      from: process.env.SMTP_FROM || `RentEase <${process.env.SMTP_USER}>`,

      to,
      subject,
      html,
    });

    console.log('[mailer] Email sent successfully.');
    console.log('[mailer] To:', to);
    console.log('[mailer] Subject:', subject);
    console.log('[mailer] Message ID:', info.messageId);

    return true;
  } catch (error) {
    console.error('[mailer] Failed to send email.');
    console.error('[mailer] To:', to);
    console.error('[mailer] Subject:', subject);
    console.error('[mailer] Error:', error);

    return false;
  }
};

export default sendMail;
