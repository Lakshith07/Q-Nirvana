const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

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

const sendEmail = async ({ to, subject, html, attachments }, retryCount = 0) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Failed to send email: Missing EMAIL_USER or EMAIL_PASS environment variables.');
    return { success: false, error: 'Email configuration is missing' };
  }

  // Fire and forget mechanism to prevent blocking user flow
  const attemptSend = async () => {
    try {
      const mailOptions = {
        from: `"Q Nirvana Hospital" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      };
      if (attachments) {
        mailOptions.attachments = attachments;
      }
      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Email send error (Attempt ${retryCount + 1}):`, err.message);
      if (retryCount < 2) {
        console.log(`⏳ Retrying email to ${to} in 5 seconds...`);
        await new Promise(res => setTimeout(res, 5000));
        return sendEmail({ to, subject, html }, retryCount + 1);
      } else {
        // Log to database on final failure
        try {
          const { db } = require('../db/firebase');
          await db.collection('email_failures').add({
            to,
            subject,
            error: err.message,
            failed_at: new Date().toISOString(),
          });
          console.log(`📝 Logged email failure to database for ${to}`);
        } catch (dbErr) {
          console.error('❌ Failed to log email error to DB:', dbErr.message);
        }
        return { success: false, error: err.message };
      }
    }
  };

  if (retryCount === 0) {
    // Return immediately to not block user flow, but run the promise
    attemptSend().catch(console.error);
    return { success: true, message: 'Email queued for sending' };
  } else {
    // Being called from a retry, return the promise
    return attemptSend();
  }
};


const emailTemplates = {
  welcomeIST: (name, role) => {
    const timeIST = moment().tz('Asia/Kolkata').format('DD MMM YYYY, hh:mm A');
    return {
      subject: 'Welcome to Q Nirvana Hospital Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1e40af;">Welcome, ${name}! 🎉</h2>
          <p>Your account has been successfully created.</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Registration Date & Time (IST):</strong> ${timeIST}</p>
          <p>Thank you for joining Q Nirvana!</p>
        </div>
      `,
    };
  },

  appointmentReminder: (name, doctorName, date, timeUTC) => {
    // Time must be IST
    const timeIST = moment(timeUTC).tz('Asia/Kolkata').format('hh:mm A');
    return {
      subject: '⏳ Appointment Reminder - Q Nirvana',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #f59e0b;">Upcoming Appointment!</h2>
          <p>Dear ${name}, this is a reminder that your appointment starts in 20 minutes.</p>
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${timeIST} (IST)</p>
          <p>Please log in to your dashboard to join the meeting or check hospital details.</p>
        </div>
      `,
    };
  },

  doctorDeclined: (name, doctorName, date, timeUTC, reason) => {
    return {
      subject: '❌ Appointment Declined - Q Nirvana',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #dc2626;">Appointment Declined</h2>
          <p>Dear ${name}, Dr. ${doctorName} has declined your appointment originally scheduled for ${date}.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please log in to your dashboard to rebook the appointment with another available slot or doctor.</p>
        </div>
      `,
    };
  },

  appointmentCompleted: (name, doctorName, timeUTC) => {
    const timeIST = moment(timeUTC).tz('Asia/Kolkata').format('DD MMM YYYY, hh:mm A');
    return {
      subject: '✅ Appointment Completed - Q Nirvana',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #10b981;">Appointment Completed</h2>
          <p>Dear ${name}, your appointment with Dr. ${doctorName} is now complete.</p>
          <p><strong>Completed At (IST):</strong> ${timeIST}</p>
          <p>If the doctor provided a prescription, you can download it from your dashboard.</p>
          <p>We'd love to hear your feedback! <a href="http://localhost:5173/patient/settings">Click here to submit feedback</a>.</p>
        </div>
      `,
    };
  },

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
        </div>
      </div>
    `,
  }),

  appointmentConfirmation: (name, doctorName, date, time, queueNumber, qrCodeBase64) => ({
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
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #1e293b; font-weight: bold;">Present this QR at appointment time.</p>
            ${qrCodeBase64 ? `<img src="${qrCodeBase64}" alt="Appointment QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;" />` : ''}
          </div>
        </div>
      </div>
    `,
  }),

  queueAlert: (name, minutesLeft) => ({
    subject: `⏰ Your Turn in ${minutesLeft} Minutes - Q Nirvana`,
    html: `<p>Almost Your Turn, ${name}!</p>`,
  }),

  emergencyAlert: (name, type) => ({
    subject: '🚨 Emergency Alert - Q Nirvana',
    html: `<p>Emergency declared for ${name}.</p>`,
  }),

  twoFactorOtp: (name, otp, purpose) => ({
    subject: `🔐 Your Q Nirvana Verification Code: ${otp}`,
    html: `<p>Code: ${otp}</p>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
