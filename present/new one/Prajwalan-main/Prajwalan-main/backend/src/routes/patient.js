const express = require('express');
const { db } = require('../db/firebase');
const { authenticate, authorize } = require('../middleware/auth');
const { calculatePriority, estimateWaitTime } = require('../services/priorityQueue');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { sendTelegramMessage, telegramMessages } = require('../services/telegramService');

const router = express.Router();
router.use(authenticate, authorize('patient'));

// GET /api/patient/profile
router.get('/profile', async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.id).get();
        const profileDoc = await db.collection('patient_profiles').doc(req.user.id).get();

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

// GET /api/patient/doctors - list available doctors
router.get('/doctors', async (req, res) => {
    try {
        const doctorsSnapshot = await db.collection('doctor_profiles').get();
        const doctors = [];

        for (const doc of doctorsSnapshot.docs) {
            const profile = doc.data();
            const userDoc = await db.collection('users').doc(profile.user_id).get();
            if (userDoc.exists && userDoc.data().is_active) {
                const scheduleSnapshot = await db.collection('doctor_availability').where('doctor_id', '==', profile.user_id).get();
                const schedule = scheduleSnapshot.docs.map(s => s.data());

                doctors.push({
                    ...profile,
                    full_name: userDoc.data().full_name,
                    email: userDoc.data().email,
                    schedule
                });
            }
        }

        // Custom sort equivalent to ORDER BY dp.is_available DESC, dp.rating DESC
        doctors.sort((a, b) => {
            if (a.is_available !== b.is_available) return b.is_available ? 1 : -1;
            return (b.rating || 0) - (a.rating || 0);
        });

        return res.json({ success: true, doctors });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/appointments - book OPD
router.post('/appointments', async (req, res) => {
    const { doctor_id, appointment_date, appointment_time, reason, is_emergency, is_maternity } = req.body;
    try {
        const profileDoc = await db.collection('patient_profiles').doc(req.user.id).get();
        if (!profileDoc.exists) return res.status(404).json({ success: false, message: 'Patient profile not found' });
        const patient = profileDoc.data();

        const { priority, score } = calculatePriority({
            age: patient.age || 30,
            gender: patient.gender,
            is_emergency: is_emergency || false,
            is_maternity: is_maternity || false,
        });

        const apptsRef = db.collection('appointments');
        const queueCount = (await apptsRef
            .where('doctor_id', '==', doctor_id)
            .where('appointment_date', '==', appointment_date)
            .get()).size;

        const queuePosition = queueCount + 1;
        const estimatedWait = estimateWaitTime(queuePosition);

        const apptRef = apptsRef.doc();
        const apptData = {
            id: apptRef.id,
            patient_id: patient.id,
            doctor_id,
            appointment_date,
            appointment_time,
            reason,
            priority,
            priority_score: score,
            queue_position: queuePosition,
            estimated_wait_minutes: estimatedWait,
            is_emergency: is_emergency || false,
            status: 'scheduled',
            created_at: new Date().toISOString()
        };

        await apptRef.set(apptData);

        await db.collection('patient_queue').doc(apptRef.id).set({
            id: apptRef.id,
            appointment_id: apptRef.id,
            doctor_id,
            patient_id: patient.id,
            priority,
            priority_score: score,
            position: queuePosition,
            status: 'waiting',
            checked_in_at: new Date().toISOString()
        });

        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'appointments' });
        }

        const doctorProfile = (await db.collection('doctor_profiles').doc(doctor_id).get()).data();
        const doctorUser = (await db.collection('users').doc(doctorProfile.user_id).get()).data();
        const doctorName = doctorUser?.full_name || 'your doctor';

        const tmpl = emailTemplates.appointmentConfirmation(
            req.user.full_name, doctorName, appointment_date, appointment_time, queuePosition
        );
        sendEmail({ to: req.user.email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

        return res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            appointment: apptData,
        });
    } catch (err) {
        console.error('Booking error:', err);
        return res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

// GET /api/patient/appointments - my appointments
router.get('/appointments', async (req, res) => {
    try {
        const patientDoc = await db.collection('patient_profiles').doc(req.user.id).get();
        if (!patientDoc.exists) return res.json({ success: true, appointments: [] });

        const snapshot = await db.collection('appointments')
            .where('patient_id', '==', req.user.id)
            .get();

        const appointments = [];
        for (const doc of snapshot.docs) {
            const appt = doc.data();
            const doctorProfile = (await db.collection('doctor_profiles').doc(appt.doctor_id).get()).data();
            const doctorUser = (await db.collection('users').doc(doctorProfile.user_id).get()).data();
            appointments.push({
                ...appt,
                doctor_name: doctorUser.full_name,
                specialization: doctorProfile.specialization,
                department: doctorProfile.department
            });
        }

        appointments.sort((a, b) => new Date(b.appointment_date + ' ' + b.appointment_time) - new Date(a.appointment_date + ' ' + a.appointment_time));

        return res.json({ success: true, appointments });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/queue-status/:appointmentId
router.get('/queue-status/:appointmentId', async (req, res) => {
    try {
        const queueDoc = await db.collection('patient_queue').doc(req.params.appointmentId).get();
        if (!queueDoc.exists) return res.status(404).json({ success: false, message: 'Queue entry not found' });
        const entry = queueDoc.data();

        const apptDoc = await db.collection('appointments').doc(entry.appointment_id).get();
        const appt = apptDoc.data();

        const doctorProfile = (await db.collection('doctor_profiles').doc(entry.doctor_id).get()).data();
        const doctorUser = (await db.collection('users').doc(doctorProfile.user_id).get()).data();

        const aheadSnapshot = await db.collection('patient_queue')
            .where('doctor_id', '==', entry.doctor_id)
            .where('priority_score', '>', entry.priority_score)
            .where('status', '==', 'waiting')
            .get();
        const patientsAhead = aheadSnapshot.size;

        if (patientsAhead === 2) {
            if (req.user.telegram_chat_id) {
                sendTelegramMessage(
                    req.user.telegram_chat_id,
                    telegramMessages.queueAlert2Ahead(req.user.full_name, doctorUser.full_name)
                ).catch(console.error);
            }
            const tmpl = emailTemplates.queueAlert(req.user.full_name, 20);
            sendEmail({ to: req.user.email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);
        }

        return res.json({
            success: true,
            queueStatus: {
                position: entry.position,
                status: entry.status,
                checked_in_at: entry.checked_in_at,
                estimated_wait_minutes: appt.estimated_wait_minutes,
                priority: appt.priority,
                appointment_time: appt.appointment_time,
                doctor_name: doctorUser.full_name,
                patients_ahead: patientsAhead,
                estimated_wait_minutes_actual: patientsAhead * 10
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/beds - check bed availability
router.get('/beds', async (req, res) => {
    try {
        const snapshot = await db.collection('hospital_beds').get();
        const beds = snapshot.docs.map(doc => doc.data());

        const summary = beds.reduce((acc, bed) => {
            const type = bed.bed_type;
            if (!acc[type]) acc[type] = { bed_type: type, total: 0, available: 0, occupied: 0 };
            acc[type].total++;
            if (bed.status === 'available') acc[type].available++;
            if (bed.status === 'occupied') acc[type].occupied++;
            return acc;
        }, {});

        const available_beds = beds.filter(b => b.status === 'available');

        return res.json({ success: true, summary: Object.values(summary), available_beds, beds: available_beds });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/book-bed - book a bed/admission
router.post('/book-bed', async (req, res) => {
    const { bed_id, assign_o2, notes } = req.body;
    try {
        const bedRef = db.collection('hospital_beds').doc(bed_id);
        const bedDoc = await bedRef.get();

        if (!bedDoc.exists) return res.status(404).json({ success: false, message: 'Bed not found' });
        if (bedDoc.data().status !== 'available') return res.status(400).json({ success: false, message: 'Bed is no longer available' });

        await bedRef.update({
            status: 'occupied',
            patient_id: req.user.id,
            admitted_at: new Date().toISOString(),
            o2_cylinder_assigned: assign_o2 || false,
            specialty_equipment: notes ? { notes } : null,
            updated_at: new Date().toISOString()
        });

        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'beds' });

            // Broadcast emergency/bed notification to all active dashboards
            req.app.locals.broadcastAll({
                type: 'NEW_NOTIFICATION',
                role: 'doctor', // frontend will filter
                notification: {
                    id: Date.now(),
                    type: 'warning',
                    title: 'New Bed Booked',
                    sub: `Patient ${req.user.full_name} reserved a bed in ${bedDoc.data().ward_name}`
                }
            });
        }

        return res.json({
            success: true,
            message: `Bed in ${bedDoc.data().ward_name} booked successfully. Please proceed to the hospital for admission.`
        });
    } catch (err) {
        console.error('Bed booking error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/blood-bank
router.get('/blood-bank', async (req, res) => {
    try {
        const snapshot = await db.collection('blood_bank').get();
        const bloodBank = snapshot.docs.map(doc => doc.data());
        bloodBank.sort((a, b) => a.blood_group.localeCompare(b.blood_group));
        return res.json({ success: true, bloodBank });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/blood-request
router.post('/blood-request', async (req, res) => {
    const { blood_group, units_needed, urgency, notes } = req.body;
    try {
        const reqRef = db.collection('blood_requests').doc();
        const requestData = {
            id: reqRef.id,
            patient_id: req.user.id,
            requested_by: req.user.id,
            blood_group,
            units_needed: units_needed || 1,
            urgency: urgency || 'normal',
            status: 'pending',
            notes,
            created_at: new Date().toISOString()
        };
        await reqRef.set(requestData);

        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'blood_bank' });
        }
        return res.status(201).json({ success: true, request: requestData });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/medical-history (and alias /history)
router.get(['/medical-history', '/history'], async (req, res) => {
    try {
        const snapshot = await db.collection('medical_records')
            .where('patient_id', '==', req.user.id)
            .get();

        const records = [];
        for (const doc of snapshot.docs) {
            const record = doc.data();
            let doctor_name = 'Unknown';
            let specialization = '';
            let department = '';

            if (record.doctor_id) {
                const docProf = (await db.collection('doctor_profiles').doc(record.doctor_id).get()).data();
                if (docProf) {
                    const docUser = (await db.collection('users').doc(docProf.user_id).get()).data();
                    doctor_name = docUser?.full_name || 'Unknown';
                    specialization = docProf.specialization;
                    department = docProf.department;
                }
            }

            records.push({ ...record, doctor_name, specialization, department });
        }

        records.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));

        return res.json({ success: true, medicalRecords: records, records });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/stats
router.get('/stats', async (req, res) => {
    try {
        const recordsSnapshot = await db.collection('medical_records')
            .where('patient_id', '==', req.user.id)
            .get();

        const allRecords = recordsSnapshot.docs.map(d => d.data());
        allRecords.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
        const last_date = allRecords.length === 0 ? 'None' : allRecords[0].record_date;

        const consults = await db.collection('appointments')
            .where('patient_id', '==', req.user.id)
            .where('status', '==', 'completed')
            .get();

        return res.json({
            success: true,
            summary: {
                last_consultation: last_date,
                total_consultations: consults.size,
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/family-access - grant family access
router.post('/family-access', async (req, res) => {
    const { family_member_name, family_member_email, relation } = req.body;
    try {
        const ref = db.collection('family_access').doc();
        const data = {
            id: ref.id,
            patient_id: req.user.id,
            family_member_name,
            family_member_email,
            relation,
            is_active: true,
            granted_at: new Date().toISOString()
        };
        await ref.set(data);
        return res.status(201).json({ success: true, access: data });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/family-access
router.get('/family-access', async (req, res) => {
    try {
        const snapshot = await db.collection('family_access')
            .where('patient_id', '==', req.user.id)
            .get();
        const familyAccess = snapshot.docs.map(doc => doc.data());
        familyAccess.sort((a, b) => new Date(b.granted_at) - new Date(a.granted_at));
        return res.json({ success: true, familyAccess });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/emergency - emergency bypass
router.post('/emergency', async (req, res) => {
    const { description, pickup_address, pickup_lat, pickup_lng } = req.body;
    try {
        const hospital_lat = 12.9716;
        const hospital_lng = 77.5946;

        const ref = db.collection('emergency_requests').doc();
        const data = {
            id: ref.id,
            patient_id: req.user.id,
            pickup_address,
            pickup_lat,
            pickup_lng,
            hospital_lat,
            hospital_lng,
            description,
            status: 'requested',
            created_at: new Date().toISOString()
        };

        await ref.set(data);

        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'emergencies' });
        }

        const tmpl = emailTemplates.emergencyAlert(req.user.full_name, 'general');
        sendEmail({ to: req.user.email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

        return res.status(201).json({ success: true, emergency: data, message: 'Emergency request raised. Ambulance dispatched!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/shared-with-me - medical records shared with this patient (as family)
router.get('/shared-with-me', async (req, res) => {
    try {
        const snapshot = await db.collection('family_access')
            .where('family_member_email', '==', req.user.email)
            .where('is_active', '==', true)
            .get();

        const sharedData = [];
        for (const faDoc of snapshot.docs) {
            const fa = faDoc.data();
            const patientUser = (await db.collection('users').doc(fa.patient_id).get()).data();
            const patientProfile = (await db.collection('patient_profiles').doc(fa.patient_id).get()).data();

            const recordsSnapshot = await db.collection('medical_records')
                .where('patient_id', '==', fa.patient_id)
                .get();

            const records = [];
            for (const mrDoc of recordsSnapshot.docs) {
                const mr = mrDoc.data();
                let docName = 'Unknown';
                if (mr.doctor_id) {
                    const dProf = (await db.collection('doctor_profiles').doc(mr.doctor_id).get()).data();
                    if (dProf) {
                        const dUser = (await db.collection('users').doc(dProf.user_id).get()).data();
                        docName = dUser?.full_name || 'Unknown';
                    }
                }
                records.push({
                    diagnosis: mr.diagnosis,
                    prescription: mr.prescription,
                    date: mr.record_date,
                    doctor: docName
                });
            }

            sharedData.push({
                patient_name: patientUser.full_name,
                patient_email: patientUser.email,
                relation: fa.relation,
                age: patientProfile.age,
                blood_group: patientProfile.blood_group,
                records
            });
        }

        return res.json({ success: true, sharedData });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/notifications
router.get('/notifications', async (req, res) => {
    try {
        const snapshot = await db.collection('notifications')
            .where('user_id', '==', req.user.id)
            .orderBy('sent_at', 'desc')
            .limit(50)
            .get();
        return res.json({ success: true, notifications: snapshot.docs.map(doc => doc.data()) });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

