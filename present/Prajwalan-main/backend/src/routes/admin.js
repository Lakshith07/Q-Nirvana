const express = require('express');
const pool = require('../db');
const { authenticate, authorize, auditLog } = require('../middleware/auth');
const { sendTelegramMessage, telegramMessages } = require('../services/telegramService');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/dashboard - summary stats
router.get('/dashboard', async (req, res) => {
    try {
        const [patients, doctors, drivers, beds, emergencies, appointments, bloodBank, o2Stats] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users WHERE role='patient' AND is_active=TRUE"),
            pool.query("SELECT COUNT(*) FROM users WHERE role='doctor' AND is_active=TRUE"),
            pool.query("SELECT COUNT(*) FROM users WHERE role='driver' AND is_active=TRUE"),
            pool.query("SELECT status, COUNT(*) FROM hospital_beds GROUP BY status"),
            pool.query("SELECT status, COUNT(*) FROM emergency_requests GROUP BY status"),
            pool.query("SELECT status, COUNT(*) FROM appointments WHERE appointment_date=CURRENT_DATE GROUP BY status"),
            pool.query("SELECT blood_group, units_available FROM blood_bank ORDER BY units_available ASC LIMIT 3"),
            pool.query("SELECT COUNT(*) FROM hospital_beds WHERE o2_cylinder_assigned=TRUE")
        ]);
        return res.json({
            success: true,
            dashboard: {
                total_patients: parseInt(patients.rows[0].count),
                total_doctors: parseInt(doctors.rows[0].count),
                total_drivers: parseInt(drivers.rows[0].count),
                beds: beds.rows,
                emergencies: emergencies.rows,
                today_appointments: appointments.rows,
                low_blood_stock: bloodBank.rows,
                o2_in_use: parseInt(o2Stats.rows[0].count),
                floor_density: [
                    { floor: 1, count: 24, capacity: 50, status: 'Normal' },
                    { floor: 2, count: 42, capacity: 45, status: 'Crowded' },
                    { floor: 3, count: 12, capacity: 30, status: 'Stable' }
                ]
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/users?role=patient|doctor|driver
router.get('/users', async (req, res) => {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    try {
        let query = `SELECT u.id, u.full_name, u.email, u.mobile, u.role, u.is_active, u.created_at FROM users u WHERE 1=1`;
        const params = [];
        if (role) { params.push(role); query += ` AND u.role = $${params.length}`; }
        query += ` ORDER BY u.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
        const result = await pool.query(query, params);
        const countResult = await pool.query(`SELECT COUNT(*) FROM users WHERE 1=1${role ? " AND role=$1" : ''}`, role ? [role] : []);
        return res.json({ success: true, users: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page) });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/doctors - doctors with workload
router.get('/doctors', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, dp.specialization, dp.department,
              dp.is_available, dp.rating,
              COUNT(a.id) FILTER (WHERE a.appointment_date = CURRENT_DATE) as today_load,
              COUNT(pq.id) FILTER (WHERE pq.status = 'waiting') as queue_size
       FROM users u
       JOIN doctor_profiles dp ON u.id = dp.user_id
       LEFT JOIN appointments a ON dp.id = a.doctor_id
       LEFT JOIN patient_queue pq ON dp.id = pq.doctor_id
       WHERE u.role = 'doctor' AND u.is_active = TRUE
       GROUP BY u.id, u.full_name, u.email, dp.id, dp.specialization, dp.department, dp.is_available, dp.rating
       ORDER BY today_load DESC`
        );
        return res.json({ success: true, doctors: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/beds
router.get('/beds', async (req, res) => {
    try {
        const summary = await pool.query(
            `SELECT bed_type, floor_number, ward_name,
              COUNT(*) as total,
              COUNT(CASE WHEN status='available' THEN 1 END) as available,
              COUNT(CASE WHEN status='occupied' THEN 1 END) as occupied,
              COUNT(CASE WHEN status='maintenance' THEN 1 END) as maintenance
       FROM hospital_beds GROUP BY bed_type, floor_number, ward_name ORDER BY floor_number, ward_name`
        );
        const all = await pool.query('SELECT * FROM hospital_beds ORDER BY ward_name, room_number');
        return res.json({ success: true, summary: summary.rows, beds: all.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/admin/beds - add bed
router.post('/beds', auditLog('ADD_BED'), async (req, res) => {
    const { ward_name, room_number, bed_number, bed_type, floor_number, charge_per_day } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO hospital_beds (ward_name, room_number, bed_number, bed_type, floor_number, charge_per_day)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [ward_name, room_number, bed_number, bed_type, floor_number || 1, charge_per_day || 0]
        );
        return res.status(201).json({ success: true, bed: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error or duplicate bed' });
    }
});

// PATCH /api/admin/beds/:id - update bed status
router.patch('/beds/:id', auditLog('UPDATE_BED'), async (req, res) => {
    const { status, patient_id } = req.body;
    try {
        await pool.query(
            `UPDATE hospital_beds SET status=$1, patient_id=$2, 
       admitted_at = CASE WHEN $1='occupied' THEN NOW() ELSE NULL END,
       updated_at=NOW() WHERE id=$3`,
            [status, patient_id || null, req.params.id]
        );
        return res.json({ success: true, message: 'Bed updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/blood-bank
router.get('/blood-bank', async (req, res) => {
    try {
        const stock = await pool.query('SELECT * FROM blood_bank ORDER BY blood_group');
        const requests = await pool.query(
            `SELECT br.*, u.full_name as patient_name, pu.full_name as requested_by_name
       FROM blood_requests br
       LEFT JOIN patient_profiles pp ON br.patient_id = pp.id
       LEFT JOIN users u ON pp.user_id = u.id
       LEFT JOIN users pu ON br.requested_by = pu.id
       WHERE br.status = 'pending' ORDER BY br.created_at DESC`
        );
        return res.json({ success: true, stock: stock.rows, pending_requests: requests.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/admin/blood-bank/:bloodGroup - update stock
router.patch('/blood-bank/:bloodGroup', auditLog('UPDATE_BLOOD_BANK'), async (req, res) => {
    const { units_available } = req.body;
    try {
        await pool.query(
            `UPDATE blood_bank SET units_available=$1, last_updated=NOW() WHERE blood_group=$2`,
            [units_available, req.params.bloodGroup]
        );
        return res.json({ success: true, message: 'Blood stock updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/admin/blood-requests/:id - approve/reject
router.patch('/blood-requests/:id', auditLog('BLOOD_REQUEST_UPDATE'), async (req, res) => {
    const { status } = req.body; // approved | rejected
    try {
        await pool.query(
            `UPDATE blood_requests SET status=$1, approved_by=$2, approved_at=NOW() WHERE id=$3`,
            [status, req.user.id, req.params.id]
        );
        if (status === 'approved') {
            const reqData = await pool.query('SELECT * FROM blood_requests WHERE id=$1', [req.params.id]);
            const r = reqData.rows[0];
            await pool.query(
                `UPDATE blood_bank SET units_available = units_available - $1 WHERE blood_group = $2 AND units_available >= $1`,
                [r.units_needed, r.blood_group]
            );
        }
        return res.json({ success: true, message: `Blood request ${status}` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/emergencies
router.get('/emergencies', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT er.*, u.full_name as patient_name, u.mobile as patient_mobile,
              du.full_name as driver_name, dp.vehicle_number
       FROM emergency_requests er
       LEFT JOIN patient_profiles pp ON er.patient_id = pp.id
       LEFT JOIN users u ON pp.user_id = u.id
       LEFT JOIN driver_profiles dp ON er.driver_id = dp.id
       LEFT JOIN users du ON dp.user_id = du.id
       ORDER BY er.created_at DESC LIMIT 50`
        );
        return res.json({ success: true, emergencies: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT al.*, u.full_name as admin_name
       FROM audit_logs al LEFT JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC LIMIT 100`
        );
        return res.json({ success: true, logs: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/admin/users/:id/toggle - activate/deactivate user
router.patch('/users/:id/toggle', auditLog('TOGGLE_USER'), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE users SET is_active = NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING id, full_name, is_active`,
            [req.params.id]
        );
        return res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/admin/assign-opd - reassign OPD to another doctor
router.post('/assign-opd', auditLog('REASSIGN_OPD'), async (req, res) => {
    const { appointment_id, new_doctor_id } = req.body;
    try {
        await pool.query('UPDATE appointments SET doctor_id=$1, updated_at=NOW() WHERE id=$2', [new_doctor_id, appointment_id]);
        await pool.query('UPDATE patient_queue SET doctor_id=$1 WHERE appointment_id=$2', [new_doctor_id, appointment_id]);
        return res.json({ success: true, message: 'OPD reassigned successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/queue - full hospital queue overview
router.get('/queue', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT pq.*, u.full_name as patient_name, pp.age, pp.gender,
              du.full_name as doctor_name, dp.department,
              a.appointment_time, a.is_emergency
       FROM patient_queue pq
       JOIN patient_profiles pp ON pq.patient_id = pp.id
       JOIN users u ON pp.user_id = u.id
       JOIN doctor_profiles dp ON pq.doctor_id = dp.id
       JOIN users du ON dp.user_id = du.id
       JOIN appointments a ON pq.appointment_id = a.id
       WHERE pq.status IN ('waiting','called')
       ORDER BY pq.priority_score DESC, pq.checked_in_at ASC`
        );
        return res.json({ success: true, queue: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
