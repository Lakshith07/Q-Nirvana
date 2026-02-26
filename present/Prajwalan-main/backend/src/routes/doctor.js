const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { sortQueue } = require('../services/priorityQueue');

const router = express.Router();
router.use(authenticate, authorize('doctor'));

// GET /api/doctor/profile
router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.mobile,
              dp.specialization, dp.license_number, dp.department,
              dp.qualification, dp.experience_years, dp.consultation_fee,
              dp.is_available, dp.rating
       FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id
       WHERE u.id = $1`,
            [req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });
        return res.json({ success: true, profile: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/doctor/availability
router.patch('/availability', async (req, res) => {
    const { is_available } = req.body;
    try {
        await pool.query(
            `UPDATE doctor_profiles SET is_available = $1, updated_at = NOW()
       WHERE user_id = $2`,
            [is_available, req.user.id]
        );

        // If doctor goes unavailable, reassign waiting patients
        if (!is_available) {
            const dpRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
            if (dpRes.rows.length) {
                // Find available doctors in same department
                const dpId = dpRes.rows[0].id;
                const dept = await pool.query('SELECT department FROM doctor_profiles WHERE id = $1', [dpId]);
                const altDoc = await pool.query(
                    `SELECT id FROM doctor_profiles WHERE department = $1 AND is_available = TRUE AND id != $2 LIMIT 1`,
                    [dept.rows[0]?.department, dpId]
                );
                if (altDoc.rows.length) {
                    await pool.query(
                        `UPDATE patient_queue SET doctor_id = $1
             WHERE doctor_id = $2 AND status = 'waiting'`,
                        [altDoc.rows[0].id, dpId]
                    );
                }
            }
        }

        return res.json({ success: true, message: `Status updated to ${is_available ? 'Available' : 'Unavailable'}` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/queue - prioritized patient queue
router.get('/queue', async (req, res) => {
    try {
        const dpRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
        if (!dpRes.rows.length) return res.json({ success: true, queue: [] });
        const doctorProfileId = dpRes.rows[0].id;

        const result = await pool.query(
            `SELECT pq.id as queue_id, pq.position, pq.priority, pq.priority_score,
              pq.status, pq.checked_in_at,
              u.full_name as patient_name, u.email as patient_email,
              pp.age, pp.gender, pp.blood_group, pp.allergies, pp.chronic_conditions,
              a.id as appointment_id, a.appointment_time, a.reason, a.is_emergency
       FROM patient_queue pq
       JOIN patient_profiles pp ON pq.patient_id = pp.id
       JOIN users u ON pp.user_id = u.id
       JOIN appointments a ON pq.appointment_id = a.id
       WHERE pq.doctor_id = $1 AND pq.status IN ('waiting', 'called')
       ORDER BY pq.priority_score DESC, pq.checked_in_at ASC`,
            [doctorProfileId]
        );

        const sortedQueue = sortQueue(result.rows.map((r) => ({ ...r, priority_score: r.priority_score })));
        return res.json({ success: true, queue: sortedQueue });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/doctor/queue/:queueId - update status
router.patch('/queue/:queueId', async (req, res) => {
    const { status } = req.body; // waiting | called | completed | skipped
    try {
        await pool.query(
            `UPDATE patient_queue SET status = $1,
       called_at = CASE WHEN $1 = 'called' THEN NOW() ELSE called_at END,
       completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $2`,
            [status, req.params.queueId]
        );
        // Also update appointment status
        await pool.query(
            `UPDATE appointments SET status = CASE
         WHEN $1 = 'called' THEN 'in_progress'
         WHEN $1 = 'completed' THEN 'completed'
         ELSE status END,
       updated_at = NOW()
       WHERE id = (SELECT appointment_id FROM patient_queue WHERE id = $2)`,
            [status, req.params.queueId]
        );

        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'queue' });
        }

        return res.json({ success: true, message: 'Queue status updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/doctor/queue/:queueId/call
router.post('/queue/:queueId/call', async (req, res) => {
    try {
        await pool.query(
            `UPDATE patient_queue SET status = 'called', called_at = NOW() WHERE id = $1`,
            [req.params.queueId]
        );
        await pool.query(
            `UPDATE appointments SET status = 'in_progress', updated_at = NOW()
             WHERE id = (SELECT appointment_id FROM patient_queue WHERE id = $1)`,
            [req.params.queueId]
        );
        return res.json({ success: true, message: 'Patient called' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/patient/:patientId - view patient details
router.get('/patient/:patientId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.full_name, u.email, u.mobile,
              pp.*, 
              JSON_AGG(mr.* ORDER BY mr.record_date DESC) FILTER (WHERE mr.id IS NOT NULL) as medical_records
       FROM patient_profiles pp
       JOIN users u ON pp.user_id = u.id
       LEFT JOIN medical_records mr ON pp.id = mr.patient_id
       WHERE pp.id = $1
       GROUP BY u.full_name, u.email, u.mobile, pp.id`,
            [req.params.patientId]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Patient not found' });
        return res.json({ success: true, patient: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/doctor/consultation - save consultation notes
router.post('/consultation', async (req, res) => {
    const { appointment_id, patient_id, diagnosis, prescription, notes, billing_amount, lab_results } = req.body;
    try {
        const dpRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
        const doctorProfileId = dpRes.rows[0].id;

        // Save medical record
        await pool.query(
            `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, prescription, lab_results, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [patient_id, doctorProfileId, appointment_id, diagnosis, prescription, lab_results, notes]
        );

        // Update appointment
        await pool.query(
            `UPDATE appointments SET status = 'completed', diagnosis = $1, prescription = $2,
       notes = $3, billing_amount = $4, updated_at = NOW()
       WHERE id = $5`,
            [diagnosis, prescription, notes, billing_amount || 0, appointment_id]
        );

        // Also update queue status
        await pool.query(
            `UPDATE patient_queue SET status = 'completed', completed_at = NOW()
             WHERE appointment_id = $1`,
            [appointment_id]
        );

        // Trigger real-time update for Admin
        if (req.app.locals.broadcastAll) {
            req.app.locals.broadcastAll({ type: 'UPDATE_DASHBOARD', section: 'consultations' });
        }

        return res.json({ success: true, message: 'Consultation saved and patient record updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/schedule
router.get('/schedule', async (req, res) => {
    try {
        const dpRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
        if (!dpRes.rows.length) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

        const schedule = await pool.query(
            'SELECT * FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week, start_time',
            [dpRes.rows[0].id]
        );
        return res.json({ success: true, schedule: schedule.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/doctor/schedule
router.post('/schedule', async (req, res) => {
    const { day_of_week, start_time, end_time, max_patients } = req.body;
    try {
        const dpRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
        const dpId = dpRes.rows[0].id;

        await pool.query(
            `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, max_patients)
             VALUES ($1, $2, $3, $4, $5)`,
            [dpId, day_of_week, start_time, end_time, max_patients || 20]
        );
        return res.json({ success: true, message: 'Schedule updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/doctor/schedule/:id
router.delete('/schedule/:id', async (req, res) => {
    try {
        const dpRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
        await pool.query('DELETE FROM doctor_availability WHERE id = $1 AND doctor_id = $2', [req.params.id, dpRes.rows[0].id]);
        return res.json({ success: true, message: 'Slot removed' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/doctor/stats
router.get('/stats', async (req, res) => {
    try {
        const dpRes = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
        if (!dpRes.rows.length) return res.json({ success: true, stats: {} });
        const dpId = dpRes.rows[0].id;

        const today = new Date().toISOString().split('T')[0];
        const [total, todayCount, pending, completed] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM appointments WHERE doctor_id = $1', [dpId]),
            pool.query('SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date = $2', [dpId, today]),
            pool.query('SELECT COUNT(*) FROM patient_queue WHERE doctor_id = $1 AND status = $2', [dpId, 'waiting']),
            pool.query('SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = $2', [dpId, 'completed']),
        ]);
        return res.json({
            success: true,
            stats: {
                total_patients: parseInt(total.rows[0].count),
                today_appointments: parseInt(todayCount.rows[0].count),
                waiting_queue: parseInt(pending.rows[0].count),
                completed_today: parseInt(completed.rows[0].count),
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
