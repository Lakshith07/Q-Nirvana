const nodemailer = require('nodemailer');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ CRITICAL ERROR: EMAIL_USER or EMAIL_PASS environment variables are missing.');
  console.error('❌ Email service cannot be initialized. Add them to your .env file.');
  // Failing safely - Do not interrupt app startup, but warn loudly that emails will fail
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log(`📧 Email service initialized for: ${process.env.EMAIL_USER || 'MISSING_USER'}`);

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Failed to send email: Missing EMAIL_USER or EMAIL_PASS environment variables.');
    return { success: false, error: 'Email configuration is missing' };
  }
  try {
    const info = await transporter.sendMail({
      from: `"Q Nirvana Hospital" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Email send error:', err.message);
    return { success: false, error: err.message };
  }
};

const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Q Nirvana Hospital Management System',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🏥 Q Nirvana</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Hospital Management System</p>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b; margin: 0 0 16px;">Welcome, ${name}! 🎉</h2>
          <p style="color: #475569; line-height: 1.6;">Your account has been successfully created. You now have access to our comprehensive hospital management platform.</p>
          <div style="background: #eff6ff; border-left: 4px solid #1e40af; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0; font-weight: 600;">🔒 Your account is secured with industry-standard encryption.</p>
          </div>
          <p style="color: #475569;">If you have any questions, please contact our support team.</p>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">© 2026 Q Nirvana Hospital Management System</p>
        </div>
      </div>
    `,
  }),

  appointmentConfirmation: (name, doctorName, date, time, queueNumber) => ({
    subject: 'OPD Appointment Confirmed - Q Nirvana',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🏥 Q Nirvana</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b; margin: 0 0 8px;">Appointment Confirmed ✅</h2>
          <p style="color: #475569;">Dear <strong>${name}</strong>, your OPD appointment has been booked.</p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div><span style="color: #6b7280;">Doctor:</span> <strong style="color: #1e293b;">Dr. ${doctorName}</strong></div>
              <div><span style="color: #6b7280;">Date:</span> <strong style="color: #1e293b;">${date}</strong></div>
              <div><span style="color: #6b7280;">Time:</span> <strong style="color: #1e293b;">${time}</strong></div>
              <div><span style="color: #6b7280;">Queue Number:</span> <strong style="color: #1e40af; font-size: 20px;">#${queueNumber}</strong></div>
            </div>
          </div>
          <p style="color: #475569; font-size: 14px;">You will receive an SMS alert when 2 people are ahead of you in the queue.</p>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">© 2026 Q Nirvana Hospital Management System</p>
        </div>
      </div>
    `,
  }),

  queueAlert: (name, minutesLeft) => ({
    subject: `⏰ Your Turn in ${minutesLeft} Minutes - Q Nirvana`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Queue Alert</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px;">
          <h2 style="color: #1e293b;">Almost Your Turn, ${name}!</h2>
          <p style="color: #475569;">Your consultation is estimated to begin in approximately <strong style="color: #ef4444; font-size: 20px;">${minutesLeft} minutes</strong>.</p>
          <p style="color: #475569;">Please proceed to the OPD waiting area.</p>
        </div>
      </div>
    `,
  }),

  emergencyAlert: (name, type) => ({
    subject: '🚨 Emergency Alert - Q Nirvana',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #9f1239 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px;">
          <h2 style="color: #dc2626;">Emergency Case Registered</h2>
          <p style="color: #475569;">Dear <strong>${name}</strong>, an emergency ${type} case has been registered and is being handled with highest priority.</p>
          <p style="color: #475569;">Our medical team has been notified and an ambulance is on the way.</p>
        </div>
      </div>
    `,
  }),

  twoFactorOtp: (name, otp, purpose) => ({
    subject: `🔐 Your Q Nirvana Verification Code: ${otp}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0d9488 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🏥 Q Nirvana</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Two-Factor Authentication</p>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b; margin: 0 0 12px;">Hello, Dr. ${name} 👋</h2>
          <p style="color: #475569; line-height: 1.6;">${purpose === 'setup' ? 'You are setting up Two-Factor Authentication for your doctor account.' : 'A login attempt was detected for your account. Use the code below to verify your identity.'}</p>
          <div style="background: #eff6ff; border: 2px dashed #1e40af; border-radius: 12px; padding: 28px; text-align: center; margin: 28px 0;">
            <p style="color: #6b7280; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your One-Time Password</p>
            <div style="font-size: 48px; font-weight: 900; letter-spacing: 16px; color: #1e40af; font-family: 'Courier New', monospace;">${otp}</div>
          </div>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 13px;">⚠️ This OTP is valid for <strong>10 minutes</strong> and can only be used once. Do NOT share this code with anyone.</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you did not request this code, please ignore this email. © 2026 Q Nirvana Hospital</p>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
