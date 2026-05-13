// ── FILE: server/src/services/emailService.js ──
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendResultEmail(user, test, result) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'noreply@ieltsplatform.com') {
    console.log('[Email] Would send result email to:', user.email);
    return;
  }
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Your IELTS Mock Test Results are Ready</h2>
      <p>Dear ${user.name},</p>
      <p>Your results for <strong>${test.title}</strong> have been released.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Overall Band: ${result.overallBand || 'N/A'}</h3>
        <p>Listening: ${result.listeningBand || 'Pending'}</p>
        <p>Reading: ${result.readingBand || 'Pending'}</p>
        <p>Writing: ${result.writingBand || 'Pending'}</p>
        <p>Speaking: ${result.speakingBand || 'Pending'}</p>
      </div>
      <p>Log in to your account to view detailed feedback and analysis.</p>
      <a href="${process.env.CLIENT_URL}/results" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Results</a>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: 'Your IELTS Mock Test Results are Ready',
      html
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

async function sendLoginCredentials(email, password) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'noreply@ieltsplatform.com') {
    console.log('[Email] Would send credentials to:', email);
    return;
  }
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Your IELTS Platform Account</h2>
      <p>Your account has been created.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <a href="${process.env.CLIENT_URL}/login" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login Now</a>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Your IELTS Platform Account',
      html
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

module.exports = { sendResultEmail, sendLoginCredentials };