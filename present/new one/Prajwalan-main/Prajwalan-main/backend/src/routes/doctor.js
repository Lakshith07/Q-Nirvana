const express = require('express');
const { db } = require('../db/firebase');
const { authenticate, authorize } = require('../middleware/auth');
const { sortQueue } = require('../services/priorityQueue');

const { sendEmail, emailTemplates } = require('../services/emailService');

function parseApptIST(dateStr, timeStr) {
    if (!timeStr) return new Date(8640000000000000);
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return new Date(8640000000000000);
    let [, h, m, mod] = match;
    let hours = parseInt(h);
    if (mod.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (mod.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${m.padStart(2, '0')}:00+05:30`);
}

const router = express.Router();
router.use(authenticate, authorize('doctor'));

// GET /api/doctor/profile
router.get('/profile', async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.id).get();
        const profileDoc = await db.collection('doctor_profiles').doc(req.user.id).get();

        if (!userDoc.exists || !profileDoc.exists) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        const profile = { ...userDoc.data(), ...profileDoc.data() };
        delete profile.password_hash;

        return res.json({ success: true, profile });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/doctor/availability
router.patch('/availability', async (req, res) => {
    const { is_available } = req.body;
    try {
        await db.collection('doctor_profiles').doc(req.user.id).update({
            is_available,
            updated_at: new Date().toISOString()
        });

        if (!is_available) {
            const dpDoc = await db.collection('doctor_profiles').doc(req.user.id).get();
            const dept = dpDoc.data().department;

            const altDocs = await db.collection('doctor_profiles')
                .where('department', '==', dept)
                .where('is_available', '==', true)
                .limit(2)
                .get();

            const altDoc = altDocs.docs.find(d => d.id !== req.user.id);
            if (altDoc) {
                const waitingPatients = await db.collection('patient_queue')
                    .where('doctor_id', '==', req.user.id)
                    .where('status', '==', 'waiting')
                    .get();

                const batch = db.batch();
                waitingPatients.docs.forEach(doc => {
                    batch.update(doc.ref, { doctor_id: altDoc.id });
                });
                await batch.commit();
            }
        }

        return res.json({ success: true, message: `Status updated to ${is_available ? 'Available' : 'Unavailable'} ` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/queue - prioritized patient queue
router.get('/queue', async (req, res) => {
    try {
        const snapshot = await db.collection('patient_queue')
            .where('doctor_id', '==', req.user.id)
            .get();

        const queue = [];
        const nowIST = new Date();
        let changed = false;

        const docUser = await db.collection('users').doc(req.user.id).get();
        const docName = docUser.exists ? docUser.data().full_name : 'your doctor';

        for (const doc of snapshot.docs) {
            const entry = { id: doc.id, ...doc.data() }; // Include Firestore doc ID
            if (entry.status) {
                const ppDoc = await db.collection('patient_profiles').doc(entry.patient_id).get();
                const uDoc = await db.collection('users').doc(entry.patient_id).get();
                const aDoc = await db.collection('appointments').doc(entry.appointment_id).get();

                if (ppDoc.exists && uDoc.exists && aDoc.exists) {
                    const appt = aDoc.data();
                    const appTimeObj = parseApptIST(appt.appointment_date, appt.appointment_time);

                    if (entry.status === 'waiting' && nowIST >= appTimeObj) {
                        try {
                            await db.collection('patient_queue').doc(entry.id).update({ status: 'called', called_at: nowIST.toISOString() });
                            await db.collection('appointments').doc(appt.id).update({ status: 'in_progress', updated_at: nowIST.toISOString() });
                            entry.status = 'called';
                            changed = true;

                            const tmpl = emailTemplates.queueAlert(uDoc.data().full_name, 0);
                            tmpl.subject = `Dr. ${docName} is ready for you now`;
                            tmpl.html = `<div style="font-family: sans-serif; padding: 20px;">
                                <h2 style="color: #0ea5e9;">It's time!</h2>
                                <p>Hi ${uDoc.data().full_name},</p>
                                <p>Based on our real-time tracking, your scheduled time slot has arrived. <strong>Dr. ${docName}</strong> is ready for you.</p>
                                <p>Please head inside the consultation cabin immediately if you haven't already.</p>
                                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                                <p style="font-size: 12px; color: #64748b;">This automatic alert was triggered by Q Nirvana's live-queue manager ensuring real-time synchronized appointments.</p>
                            </div>`;
                            sendEmail({ to: uDoc.data().email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);
                        } catch (e) { console.error('Queue update fail:', e); }
                    }

                    queue.push({
                        ...ppDoc.data(),
                        ...appt,
                        ...entry,
                        patient_name: uDoc.data().full_name,
                        patient_email: uDoc.data().email,
                        queue_id: entry.id,
                        status: entry.status,
                        sortTime: appTimeObj.getTime()
                    });
                }
            }
        }

        // Sort by Indian Standard Time representation
        queue.sort((a, b) => a.sortTime - b.sortTime);

        if (changed && req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'queue' });
        }

        return res.json({ success: true, queue });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/doctor/queue/:queueId - update status
router.patch('/queue/:queueId', async (req, res) => {
    const { status } = req.body; // waiting | called | completed | skipped
    try {
        const updateData = { status };
        if (status === 'called') updateData.called_at = new Date().toISOString();
        if (status === 'completed') updateData.completed_at = new Date().toISOString();

        const qRef = db.collection('patient_queue').doc(req.params.queueId);
        await qRef.update(updateData);

        const qDoc = await qRef.get();
        const apptId = qDoc.data().appointment_id;

        let apptStatus = status;
        if (status === 'called') apptStatus = 'in_progress';
        if (status === 'completed') apptStatus = 'completed';

        await db.collection('appointments').doc(apptId).update({
            status: apptStatus,
            updated_at: new Date().toISOString()
        });

        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'queue' });
        }

        return res.json({ success: true, message: 'Queue status updated' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/patients - view all patients assigned/visited
router.get('/patients', async (req, res) => {
    try {
        const apptsSnapshot = await db.collection('appointments')
            .where('doctor_id', '==', req.user.id)
            .get();

        const uniquePatientIds = [...new Set(apptsSnapshot.docs.map(d => d.data().patient_id))];
        const patients = [];

        for (const pid of uniquePatientIds) {
            const uDoc = await db.collection('users').doc(pid).get();
            if (uDoc.exists) {
                const ppDoc = await db.collection('patient_profiles').doc(pid).get();
                const patientAppts = apptsSnapshot.docs.filter(d => d.data().patient_id === pid);
                patientAppts.sort((a, b) => new Date(b.data().appointment_date) - new Date(a.data().appointment_date));
                const lastVisit = patientAppts.length > 0 ? patientAppts[0].data().appointment_date : null;
                const condition = patientAppts.length > 0 ? patientAppts[0].data().reason : 'General Follow-up';

                patients.push({
                    id: pid,
                    name: uDoc.data().full_name,
                    ...ppDoc.data(),
                    last_visit: lastVisit,
                    condition: condition,
                    visits: patientAppts.length
                });
            }
        }

        return res.json({ success: true, patients });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/patient/:patientId - view patient details
router.get('/patient/:patientId', async (req, res) => {
    try {
        // Assuming patientId in URL is the user_id for the patient
        const uDoc = await db.collection('users').doc(req.params.patientId).get();
        const ppDoc = await db.collection('patient_profiles').doc(req.params.patientId).get();

        if (!uDoc.exists || !ppDoc.exists) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const mrSnapshot = await db.collection('medical_records')
            .where('patient_id', '==', req.params.patientId) // Assuming patient_id in medical_records is the user_id
            .get();

        const medical_records = mrSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        medical_records.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));

        return res.json({
            success: true,
            patient: {
                ...uDoc.data(),
                ...ppDoc.data(),
                medical_records
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/doctor/consultation - save consultation notes
router.post('/consultation', async (req, res) => {
    const { appointment_id, patient_id, diagnosis, prescription, notes, billing_amount, lab_results } = req.body;
    try {
        const mrRef = db.collection('medical_records').doc();
        await mrRef.set({
            id: mrRef.id,
            patient_id,
            doctor_id: req.user.id, // Assuming doctor_id is the user_id
            appointment_id,
            diagnosis,
            prescription,
            lab_results,
            notes,
            record_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            created_at: new Date().toISOString()
        });

        await db.collection('appointments').doc(appointment_id).update({
            status: 'completed',
            diagnosis,
            prescription,
            notes,
            billing_amount: billing_amount || 0,
            updated_at: new Date().toISOString()
        });

        const qSnapshot = await db.collection('patient_queue')
            .where('appointment_id', '==', appointment_id)
            .get();

        if (!qSnapshot.empty) {
            await qSnapshot.docs[0].ref.update({
                status: 'completed',
                completed_at: new Date().toISOString()
            });
        }

        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'consultations' });
        }

        return res.json({ success: true, message: 'Consultation saved and patient record updated' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/schedule
router.get('/schedule', async (req, res) => {
    try {
        const snapshot = await db.collection('doctor_availability')
            .where('doctor_id', '==', req.user.id)
            .get();
        const schedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Include Firestore doc ID
        schedule.sort((a, b) => {
            if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
            return a.start_time.localeCompare(b.start_time);
        });
        return res.json({ success: true, schedule });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/doctor/schedule
router.post('/schedule', async (req, res) => {
    const { day_of_week, start_time, end_time, max_patients } = req.body;
    try {
        const ref = db.collection('doctor_availability').doc();
        await ref.set({
            id: ref.id,
            doctor_id: req.user.id,
            day_of_week,
            start_time,
            end_time,
            max_patients: max_patients || 20,
            is_active: true // Assuming a default active status for new schedules
        });
        return res.json({ success: true, message: 'Schedule updated' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/doctor/schedule/:id
router.delete('/schedule/:id', async (req, res) => {
    try {
        // In Firestore, you can directly delete by ID if you know the ID.
        // No need to verify doctor_id here if the ID is unique and secure.
        // If security is a concern, add a check:
        const scheduleDoc = await db.collection('doctor_availability').doc(req.params.id).get();
        if (!scheduleDoc.exists || scheduleDoc.data().doctor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this schedule slot' });
        }
        await db.collection('doctor_availability').doc(req.params.id).delete();
        return res.json({ success: true, message: 'Slot removed' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/stats
router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        const totalCount = (await db.collection('appointments').where('doctor_id', '==', req.user.id).get()).size;
        const todayCount = (await db.collection('appointments')
            .where('doctor_id', '==', req.user.id)
            .where('appointment_date', '==', today).get()).size;
        const waitingCount = (await db.collection('patient_queue')
            .where('doctor_id', '==', req.user.id)
            .where('status', '==', 'waiting').get()).size;
        const completedCount = (await db.collection('appointments')
            .where('doctor_id', '==', req.user.id)
            .where('status', '==', 'completed').get()).size;

        return res.json({
            success: true,
            stats: {
                total_patients: totalCount,
                today_appointments: todayCount,
                waiting_queue: waitingCount,
                completed_today: completedCount,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
