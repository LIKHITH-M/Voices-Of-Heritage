const nodemailer = require('nodemailer');

// Cache the dev test account so we only create it once per process
let _devTransporter = null;

const getTransporter = async () => {
    if (process.env.NODE_ENV !== 'production') {
        if (!_devTransporter) {
            const testAccount = await nodemailer.createTestAccount();
            _devTransporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log('[Email] Ethereal test account:', testAccount.user);
        }
        return _devTransporter;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@voicesofheritage.in';

/**
 * Send an email verification link.
 */
const sendVerificationEmail = async (to, name, token) => {
    const transporter = await getTransporter();
    const link = `${FRONTEND_URL}/auth/verify-email?token=${token}`;

    const info = await transporter.sendMail({
        from: `"Voices of Heritage" <${FROM_EMAIL}>`,
        to,
        subject: '✉️ Verify your email — Voices of Heritage',
        html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f1a;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#f59e0b;margin-bottom:8px;">🏛️ Voices of Heritage</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thanks for joining! Please verify your email address to get started.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#f59e0b;color:#0f0f1a;text-decoration:none;border-radius:8px;font-weight:bold;">
          Verify Email
        </a>
        <p style="font-size:13px;color:#94a3b8;">This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
      </div>
    `,
    });

    console.log('[Email] Verification sent to', to, '— Preview:', nodemailer.getTestMessageUrl(info));
    return info;
};

/**
 * Send a password reset link.
 */
const sendPasswordResetEmail = async (to, name, token) => {
    const transporter = await getTransporter();
    const link = `${FRONTEND_URL}/auth/reset-password?token=${token}`;

    const info = await transporter.sendMail({
        from: `"Voices of Heritage" <${FROM_EMAIL}>`,
        to,
        subject: '🔐 Reset your password — Voices of Heritage',
        html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f1a;color:#e2e8f0;border-radius:12px;">
        <h1 style="color:#f59e0b;margin-bottom:8px;">🏛️ Voices of Heritage</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to proceed.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#f59e0b;color:#0f0f1a;text-decoration:none;border-radius:8px;font-weight:bold;">
          Reset Password
        </a>
        <p style="font-size:13px;color:#94a3b8;">This link expires in 1 hour. If you didn't request a reset, please ignore this email.</p>
      </div>
    `,
    });

    console.log('[Email] Password reset sent to', to, '— Preview:', nodemailer.getTestMessageUrl(info));
    return info;
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
