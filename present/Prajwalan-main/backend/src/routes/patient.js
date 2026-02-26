const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { calculatePriority, estimateWaitTime } = require('../services/priorityQueue');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { sendTelegramMessage, telegramMessages } = require('../services/telegramService');

const router = express.Router();
router.use(authenticate, authorize('patient'));

// GET /api/patient/profile
router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.mobile, u.telegram_chat_id,
              pp.dob, pp.age, pp.gender, pp.blood_group, pp.address,
              pp.emergency_contact_name, pp.emergency_contact_phone,
              pp.allergies, pp.chronic_conditions
       FROM users u JOIN patient_profiles pp ON u.id = pp.user_id
       WHERE u.id = $1`,
            [req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });
        return res.json({ success: true, profile: result.rows[0] });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/doctors - list available doctors
router.get('/doctors', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT dp.id, u.full_name, u.email,
              dp.specialization, dp.department, dp.qualification,
              dp.experience_years, dp.consultation_fee, dp.is_available, dp.rating
       FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id
       WHERE u.is_active = TRUE AND u.role = 'doctor'
       ORDER BY dp.is_available DESC, dp.rating DESC`
        );
        return res.json({ success: true, doctors: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/appointments - book OPD
router.post('/appointments', async (req, res) => {
    const { doctor_id, appointment_date, appointment_time, reason, is_emergency, is_maternity } = req.body;
    try {
        // Get patient profile
        const patientRes = await pool.query(
            'SELECT id, age, gender FROM patient_profiles WHERE user_id = $1', [req.user.id]
        );
        if (!patientRes.rows.length) return res.status(404).json({ success: false, message: 'Patient profile not found' });
        const patient = patientRes.rows[0];

        // Calculate priority
        const { priority, score } = calculatePriority({
            age: patient.age || 30,
            gender: patient.gender,
            is_emergency: is_emergency || false,
            is_maternity: is_maternity || false,
        });

        // Count current queue for position
        const queueCount = await pool.query(
            `SELECT COUNT(*) FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND status IN ('scheduled','in_queue')`,
            [doctor_id, appointment_date]
        );
        const queuePosition = parseInt(queueCount.rows[0].count) + 1;
        const estimatedWait = estimateWaitTime(queuePosition);

        // Create appointment
        const apptResult = await pool.query(
            `INSERT INTO appointments
          (patient_id, doctor_id, appointment_date, appointment_time, reason,
           priority, priority_score, queue_position, estimated_wait_minutes,
           is_emergency, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'scheduled')
        RETURNING *`,
            [patient.id, doctor_id, appointment_date, appointment_time, reason,
                priority, score, queuePosition, estimatedWait, is_emergency || false]
        );
        const appt = apptResult.rows[0];

        // Add to queue
        await pool.query(
            `INSERT INTO patient_queue (appointment_id, doctor_id, patient_id, priority, priority_score, position)
        VALUES ($1,$2,$3,$4,$5,$6)`,
            [appt.id, doctor_id, patient.id, priority, score, queuePosition]
        );

        // Trigger real-time update for Admin
        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'appointments' });
        }

        // Get doctor name for email
        const doctorRes = await pool.query(
            'SELECT u.full_name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = $1',
            [doctor_id]
        );
        const doctorName = doctorRes.rows[0]?.full_name || 'your doctor';

        // Send confirmation email
        const tmpl = emailTemplates.appointmentConfirmation(
            req.user.full_name, doctorName, appointment_date, appointment_time, queuePosition
        );
        sendEmail({ to: req.user.email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

        return res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            appointment: { ...appt, queue_position: queuePosition, estimated_wait_minutes: estimatedWait },
        });
    } catch (err) {
        console.error('Booking error:', err);
        return res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

// GET /api/patient/appointments - my appointments
router.get('/appointments', async (req, res) => {
    try {
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
        if (!patientRes.rows.length) return res.json({ success: true, appointments: [] });

        const result = await pool.query(
            `SELECT a.*, u.full_name as doctor_name, dp.specialization, dp.department
       FROM appointments a
       JOIN doctor_profiles dp ON a.doctor_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [patientRes.rows[0].id]
        );
        return res.json({ success: true, appointments: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/queue-status/:appointmentId
router.get('/queue-status/:appointmentId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT pq.position, pq.status, pq.checked_in_at,
              a.estimated_wait_minutes, a.priority, a.appointment_time,
              u.full_name as doctor_name
       FROM patient_queue pq
       JOIN appointments a ON pq.appointment_id = a.id
       JOIN doctor_profiles dp ON pq.doctor_id = dp.id
       JOIN users u ON dp.user_id = u.id
       WHERE pq.appointment_id = $1`,
            [req.params.appointmentId]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Queue entry not found' });
        const entry = result.rows[0];

        // Count how many ahead
        const aheadResult = await pool.query(
            `SELECT COUNT(*) FROM patient_queue
       WHERE doctor_id = (SELECT doctor_id FROM patient_queue WHERE appointment_id = $1)
       AND priority_score > (SELECT priority_score FROM patient_queue WHERE appointment_id = $1)
       AND status = 'waiting'`,
            [req.params.appointmentId]
        );
        const patientsAhead = parseInt(aheadResult.rows[0].count);

        // Trigger SMS alert when 2 ahead (check telegram_chat_id)
        if (patientsAhead === 2) {
            const userRes = await pool.query('SELECT telegram_chat_id FROM users WHERE id = $1', [req.user.id]);
            if (userRes.rows[0]?.telegram_chat_id) {
                sendTelegramMessage(
                    userRes.rows[0].telegram_chat_id,
                    telegramMessages.queueAlert2Ahead(req.user.full_name, entry.doctor_name)
                ).catch(console.error);
            }
            // Also send email alert
            const tmpl = emailTemplates.queueAlert(req.user.full_name, 20);
            sendEmail({ to: req.user.email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);
        }

        return res.json({
            success: true,
            queueStatus: { ...entry, patients_ahead: patientsAhead, estimated_wait_minutes: patientsAhead * 10 },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/beds - check bed availability
router.get('/beds', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT bed_type, COUNT(*) as total,
              COUNT(CASE WHEN status='available' THEN 1 END) as available,
              COUNT(CASE WHEN status='occupied' THEN 1 END) as occupied
       FROM hospital_beds GROUP BY bed_type`
        );
        const beds = await pool.query(
            `SELECT id, ward_name, room_number, bed_number, bed_type, floor_number, status, charge_per_day, o2_cylinder_assigned
       FROM hospital_beds WHERE status = 'available' ORDER BY ward_name, room_number`
        );
        return res.json({ success: true, summary: result.rows, available_beds: beds.rows, beds: beds.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/book-bed - book a bed/admission
router.post('/book-bed', async (req, res) => {
    const { bed_id, assign_o2, notes } = req.body;
    try {
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
        if (!patientRes.rows.length) return res.status(404).json({ success: false, message: 'Patient profile not found' });
        const patientId = patientRes.rows[0].id;

        // Check if bed is still available
        const bedCheck = await pool.query('SELECT status, ward_name FROM hospital_beds WHERE id = $1', [bed_id]);
        if (!bedCheck.rows.length) return res.status(404).json({ success: false, message: 'Bed not found' });
        if (bedCheck.rows[0].status !== 'available') return res.status(400).json({ success: false, message: 'Bed is no longer available' });

        // Update bed status
        await pool.query(
            `UPDATE hospital_beds SET 
                status = 'occupied', 
                patient_id = $1, 
                admitted_at = NOW(), 
                o2_cylinder_assigned = $2,
                specialty_equipment = $3,
                updated_at = NOW() 
            WHERE id = $4`,
            [patientId, assign_o2 || false, notes ? JSON.stringify({ notes }) : null, bed_id]
        );

        // Notify Admin
        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'beds' });
        }

        return res.json({
            success: true,
            message: `Bed in ${bedCheck.rows[0].ward_name} booked successfully. Please proceed to the hospital for admission.`
        });
    } catch (err) {
        console.error('Bed booking error:', err);
        return res.status(500).json({ success: false, message: 'Server error during bed booking' });
    }
});

// GET /api/patient/blood-bank
router.get('/blood-bank', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM blood_bank ORDER BY blood_group');
        return res.json({ success: true, bloodBank: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/patient/blood-request
router.post('/blood-request', async (req, res) => {
    const { blood_group, units_needed, urgency, notes } = req.body;
    try {
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
        const result = await pool.query(
            `INSERT INTO blood_requests (patient_id, requested_by, blood_group, units_needed, urgency, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [patientRes.rows[0]?.id, req.user.id, blood_group, units_needed || 1, urgency || 'normal', notes]
        );
        // Trigger real-time update for Admin
        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'blood_bank' });
        }
        return res.status(201).json({ success: true, request: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/medical-history (and alias /history)
router.get(['/medical-history', '/history'], async (req, res) => {
    try {
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
        if (!patientRes.rows.length) return res.json({ success: true, medicalRecords: [] });

        const result = await pool.query(
            `SELECT mr.*, u.full_name as doctor_name, dp.specialization, dp.department
       FROM medical_records mr
       LEFT JOIN doctor_profiles dp ON mr.doctor_id = dp.id
       LEFT JOIN users u ON dp.user_id = u.id
       WHERE mr.patient_id = $1
       ORDER BY mr.record_date DESC`,
            [patientRes.rows[0].id]
        );
        return res.json({ success: true, medicalRecords: result.rows, records: result.rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/stats
router.get('/stats', async (req, res) => {
    try {
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
        if (!patientRes.rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });
        const patientId = patientRes.rows[0].id;

        const lastConsultResult = await pool.query(
            "SELECT TO_CHAR(record_date, 'DD Mon YYYY') as last_date FROM medical_records WHERE patient_id = $1 ORDER BY record_date DESC LIMIT 1",
            [patientId]
        );

        const totalConsults = await pool.query(
            "SELECT COUNT(*) FROM appointments WHERE patient_id = $1 AND status = 'completed'",
            [patientId]
        );

        return res.json({
            success: true,
            summary: {
                last_consultation: lastConsultResult.rows[0]?.last_date || 'None',
                total_consultations: parseInt(totalConsults.rows[0].count),
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
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
        const result = await pool.query(
            `INSERT INTO family_access (patient_id, family_member_name, family_member_email, relation)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [patientRes.rows[0].id, family_member_name, family_member_email, relation]
        );
        return res.status(201).json({ success: true, access: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/family-access
router.get('/family-access', async (req, res) => {
    try {
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);
        const result = await pool.query(
            'SELECT * FROM family_access WHERE patient_id = $1 ORDER BY granted_at DESC',
            [patientRes.rows[0]?.id]
        );
        return res.json({ success: true, familyAccess: result.rows });
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
        const patientRes = await pool.query('SELECT id FROM patient_profiles WHERE user_id = $1', [req.user.id]);

        const result = await pool.query(
            `INSERT INTO emergency_requests (patient_id, pickup_address, pickup_lat, pickup_lng, hospital_lat, hospital_lng, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [patientRes.rows[0]?.id, pickup_address, pickup_lat, pickup_lng, hospital_lat, hospital_lng, description]
        );

        // Trigger real-time update for Admin
        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'emergencies' });
        }

        const tmpl = emailTemplates.emergencyAlert(req.user.full_name, 'general');
        sendEmail({ to: req.user.email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

        return res.status(201).json({ success: true, emergency: result.rows[0], message: 'Emergency request raised. Ambulance dispatched!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/shared-with-me - medical records shared with this patient (as family)
router.get('/shared-with-me', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT fa.id as access_id, fa.relation, fa.granted_at,
               u.full_name as patient_name, u.email as patient_email,
               pp.id as patient_profile_id, pp.blood_group, pp.age,
               mr.diagnosis, mr.prescription, mr.record_date,
               du.full_name as doctor_name
        FROM family_access fa
        JOIN patient_profiles pp ON fa.patient_id = pp.id
        JOIN users u ON pp.user_id = u.id
        LEFT JOIN medical_records mr ON pp.id = mr.patient_id
        LEFT JOIN doctor_profiles dp ON mr.doctor_id = dp.id
        LEFT JOIN users du ON dp.user_id = du.id
        WHERE fa.family_member_email = $1 AND fa.is_active = TRUE
        ORDER BY mr.record_date DESC`,
            [req.user.email]
        );

        // Group by patient
        const sharedData = result.rows.reduce((acc, row) => {
            const pId = row.patient_profile_id;
            if (!acc[pId]) {
                acc[pId] = {
                    patient_name: row.patient_name,
                    patient_email: row.patient_email,
                    relation: row.relation,
                    age: row.age,
                    blood_group: row.blood_group,
                    records: []
                };
            }
            if (row.diagnosis) {
                acc[pId].records.push({
                    diagnosis: row.diagnosis,
                    prescription: row.prescription,
                    date: row.record_date,
                    doctor: row.doctor_name
                });
            }
            return acc;
        }, {});

        return res.json({ success: true, sharedData: Object.values(sharedData) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/patient/notifications
router.get('/notifications', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50',
            [req.user.id]
        );
        return res.json({ success: true, notifications: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
