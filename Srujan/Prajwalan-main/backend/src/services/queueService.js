const Queue = require('bull');
const moment = require('moment-timezone');
const { db } = require('../db/firebase');
const { sendEmail, emailTemplates } = require('./emailService');

// Redis config
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Queue Setup
const reminderQueue = new Queue('appointment-reminders', {
  redis: redisConfig,
  settings: {
    maxStalledCount: 1,
  }
});

// Redis health check and logging
reminderQueue.on('ready', () => {
  console.log('✅ Redis connected');
  console.log('✅ Worker started - queue is ready');
});

reminderQueue.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    // If Redis is missing locally, silently ignore it so the server stays up
    console.warn('⚠️ Redis not detected locally. Bull Jobs will suspend until Redis boots safely.');
  } else {
    console.error('❌ Redis connection failed');
    console.error(`[QUEUE ERROR]\nError stack: ${error.stack}`);
  }
});

reminderQueue.on('failed', (job, err) => {
  console.error(`[QUEUE ERROR]\nError stack: ${err.stack}\nAppointment ID: ${job.data?.appointmentId || 'N/A'}`);
});

reminderQueue.on('completed', (job, result) => {
  console.log(`[REMINDER SENT]\nAppointment ID: ${job.data?.appointmentId}\nExecution Time UTC: ${moment.utc().toISOString()}\nExecution Time IST: ${moment.tz('Asia/Kolkata').format()}`);
});

reminderQueue.on('active', (job) => {
  console.log(`▶️ Job received:\nAppointment ID: ${job.data?.appointmentId}`);
});

// Worker Processor
reminderQueue.process(async (job) => {
  const { appointmentId, patientId, doctorId, startTimeUTC, appointmentDate } = job.data;

  const pUser = await db.collection('users').doc(patientId).get();
  const dUser = await db.collection('users').doc(doctorId).get();
  const apptDoc = await db.collection('appointments').doc(appointmentId).get();

  if (!pUser.exists || !dUser.exists || !apptDoc.exists) {
    throw new Error('Required documents not found. Patient, Doctor, or Appointment is missing.');
  }

  const patient = pUser.data();
  const doctor = dUser.data();
  const appt = apptDoc.data();

  // Check status logic
  if (appt.status !== 'scheduled' && appt.status !== 'waiting') {
    return Promise.resolve(`Skipped - Appointment status is ${appt.status}`);
  }

  if (appt.reminder_sent) {
    return Promise.resolve('Skipped - Reminder already sent previously');
  }

  const template = emailTemplates.appointmentReminder(
    patient.full_name,
    doctor.full_name,
    appointmentDate,
    startTimeUTC
  );

  // Assuming sendEmail returns a promise
  await sendEmail({
    to: patient.email,
    subject: template.subject,
    html: template.html
  });

  await db.collection('appointments').doc(appointmentId).update({
    reminder_sent: true
  });

  return Promise.resolve('Success');
});

const scheduleReminder = async (appointment) => {
  try {
    if (appointment.status !== 'scheduled' && appointment.status !== 'waiting') {
      console.log('Skipping scheduling, not scheduled or waiting');
      return;
    }

    const apptTimeUTC = moment.utc(appointment.start_time_utc);
    const nowUTC = moment.utc();

    const delayMs = apptTimeUTC.valueOf() - nowUTC.valueOf() - (20 * 60 * 1000);
    const jobId = `${appointment.id}-reminder`;

    // Validation Before Scheduling Job
    const existingJob = await reminderQueue.getJob(jobId);
    if (existingJob) {
      console.log(`Job already exists for ${jobId}`);
      return;
    }

    if (delayMs <= 0) {
      // Delay < 0 -> Send immediately
      console.log(`[REMINDER SCHEDULED]\nAppointment ID: ${appointment.id}\nUTC Time: ${apptTimeUTC.toISOString()}\nIST Time: ${apptTimeUTC.tz('Asia/Kolkata').format()}\nDelay: 0`);
      await reminderQueue.add({
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        startTimeUTC: appointment.start_time_utc,
        appointmentDate: appointment.appointment_date,
      }, {
        jobId,
        attempts: 3,
        backoff: 5000,
      });
    } else {
      // Normal delay
      console.log(`[REMINDER SCHEDULED]\nAppointment ID: ${appointment.id}\nUTC Time: ${apptTimeUTC.toISOString()}\nIST Time: ${apptTimeUTC.tz('Asia/Kolkata').format()}\nDelay: ${delayMs}`);
      await reminderQueue.add({
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        startTimeUTC: appointment.start_time_utc,
        appointmentDate: appointment.appointment_date,
      }, {
        jobId,
        delay: delayMs,
        attempts: 3,
        backoff: 5000,
      });
    }
  } catch (err) {
    console.error(`Failed to schedule reminder for ${appointment.id}: ${err.message}`);
  }
};

const cleanQueueOnStartup = async () => {
  try {
    await reminderQueue.clean(0, 'failed');
    await reminderQueue.clean(0, 'wait');
    await reminderQueue.clean(0, 'active');
    await reminderQueue.clean(0, 'completed');
    await reminderQueue.clean(0, 'delayed');
    console.log('🧹 Queue cleared on startup');
  } catch (e) {
    console.error('Error cleaning queue:', e);
  }
};

module.exports = { scheduleReminder, cleanQueueOnStartup, reminderQueue };
