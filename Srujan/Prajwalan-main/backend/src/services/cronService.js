const cron = require('node-cron');
const moment = require('moment-timezone');
const { db } = require('../db/firebase');
const { sendEmail, emailTemplates } = require('./emailService');

const startCronJobs = () => {
  console.log('⏳ Starting background cron jobs...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Find appointments starting exactly 20 minutes from now
      // We'll search between now + 20 minutes and now + 21 minutes
      const now = moment.utc();
      const targetMin = now.clone().add(20, 'minutes');
      const targetMax = now.clone().add(21, 'minutes');

      const startUTCStr = targetMin.toISOString();
      const maxUTCStr = targetMax.toISOString();

      const snapshot = await db.collection('appointments')
        .where('status', '==', 'scheduled')
        .where('start_time_utc', '>=', startUTCStr)
        .where('start_time_utc', '<', maxUTCStr)
        .get();

      if (snapshot.empty) return;

      for (const doc of snapshot.docs) {
        const appt = doc.data();

        // Prevent duplicate emails using a subcollection or field
        if (appt.reminder_sent) continue;

        const ppDoc = await db.collection('users').doc(appt.patient_id).get();
        const dpDoc = await db.collection('users').doc(appt.doctor_id).get();

        if (ppDoc.exists && dpDoc.exists) {
          const patient = ppDoc.data();
          const doctor = dpDoc.data();

          const template = emailTemplates.appointmentReminder(
            patient.full_name,
            doctor.full_name,
            appt.appointment_date,
            appt.start_time_utc
          );

          sendEmail({
            to: patient.email,
            subject: template.subject,
            html: template.html
          });

          // Mark as sent
          await db.collection('appointments').doc(doc.id).update({
            reminder_sent: true
          });
          console.log(`✅ Sent 20-min reminder email to patient: ${patient.email}`);
        }
      }
    } catch (error) {
      console.error('❌ Error processing appointment reminders:', error);
    }
  });
};

module.exports = { startCronJobs };
