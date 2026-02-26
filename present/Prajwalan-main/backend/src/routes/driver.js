const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateOptimalRoute } = require('../services/dijkstraService');
const { sendTelegramMessage, telegramMessages } = require('../services/telegramService');

const router = express.Router();
router.use(authenticate, authorize('driver'));

// GET /api/driver/profile
router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.mobile,
              dp.vehicle_number, dp.vehicle_type, dp.license_number, dp.status,
              dp.current_lat, dp.current_lng
       FROM users u JOIN driver_profiles dp ON u.id = dp.user_id
       WHERE u.id = $1`,
            [req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });
        return res.json({ success: true, profile: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/driver/status - update driver status and location
router.patch('/status', async (req, res) => {
    const { status, current_lat, current_lng } = req.body;
    try {
        await pool.query(
            `UPDATE driver_profiles SET status=$1, current_lat=$2, current_lng=$3, updated_at=NOW()
       WHERE user_id=$4`,
            [status, current_lat || null, current_lng || null, req.user.id]
        );
        return res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/driver/emergencies - available emergency requests
router.get('/emergencies', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT er.*, u.full_name as patient_name, u.mobile as patient_mobile
       FROM emergency_requests er
       LEFT JOIN patient_profiles pp ON er.patient_id = pp.id
       LEFT JOIN users u ON pp.user_id = u.id
       WHERE er.status = 'requested' AND er.driver_id IS NULL
       ORDER BY er.created_at ASC`
        );
        return res.json({ success: true, emergencies: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/driver/emergencies/:id/accept
router.post('/emergencies/:id/accept', async (req, res) => {
    try {
        const dpRes = await pool.query('SELECT * FROM driver_profiles WHERE user_id=$1', [req.user.id]);
        if (!dpRes.rows.length) return res.status(404).json({ success: false, message: 'Driver profile not found' });
        const driver = dpRes.rows[0];

        const erRes = await pool.query('SELECT * FROM emergency_requests WHERE id=$1', [req.params.id]);
        if (!erRes.rows.length) return res.status(404).json({ success: false, message: 'Emergency not found' });
        const emergency = erRes.rows[0];

        // Calculate route using Dijkstra's
        const driverLoc = { lat: driver.current_lat || 12.9716, lng: driver.current_lng || 77.5946 };
        const patientLoc = { lat: parseFloat(emergency.pickup_lat) || 12.9800, lng: parseFloat(emergency.pickup_lng) || 77.6000 };
        const hospitalLoc = { lat: parseFloat(emergency.hospital_lat) || 12.9716, lng: parseFloat(emergency.hospital_lng) || 77.5946 };

        const route = calculateOptimalRoute(driverLoc, patientLoc, hospitalLoc);

        // Update emergency
        await pool.query(
            `UPDATE emergency_requests SET driver_id=$1, status='accepted', route_data=$2, updated_at=NOW() WHERE id=$3`,
            [driver.id, JSON.stringify(route), req.params.id]
        );
        await pool.query(
            `UPDATE driver_profiles SET status='on_duty', updated_at=NOW() WHERE id=$1`,
            [driver.id]
        );

        return res.json({
            success: true,
            message: 'Emergency accepted. Optimal route calculated.',
            route,
            emergency: { ...emergency, driver_id: driver.id },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/driver/emergencies/:id/status - en_route, picked_up, at_hospital, completed
router.patch('/emergencies/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query(
            `UPDATE emergency_requests SET status=$1, updated_at=NOW() WHERE id=$2`,
            [status, req.params.id]
        );
        if (status === 'completed') {
            await pool.query(
                `UPDATE driver_profiles SET status='available', updated_at=NOW() WHERE user_id=$1`,
                [req.user.id]
            );
        }
        return res.json({ success: true, message: `Status updated to ${status}` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/driver/my-emergencies - driver's history
router.get('/my-emergencies', async (req, res) => {
    try {
        const dpRes = await pool.query('SELECT id FROM driver_profiles WHERE user_id=$1', [req.user.id]);
        if (!dpRes.rows.length) return res.json({ success: true, emergencies: [] });

        const result = await pool.query(
            `SELECT er.*, u.full_name as patient_name, u.mobile as patient_mobile
       FROM emergency_requests er
       LEFT JOIN patient_profiles pp ON er.patient_id = pp.id
       LEFT JOIN users u ON pp.user_id = u.id
       WHERE er.driver_id=$1 ORDER BY er.created_at DESC LIMIT 20`,
            [dpRes.rows[0].id]
        );
        return res.json({ success: true, emergencies: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/driver/calculate-route - on-demand Dijkstra route calculation
router.post('/calculate-route', async (req, res) => {
    const { driver_lat, driver_lng, patient_lat, patient_lng, hospital_lat, hospital_lng, waypoints } = req.body;
    try {
        const route = calculateOptimalRoute(
            { lat: parseFloat(driver_lat), lng: parseFloat(driver_lng) },
            { lat: parseFloat(patient_lat), lng: parseFloat(patient_lng) },
            { lat: parseFloat(hospital_lat), lng: parseFloat(hospital_lng) },
            waypoints || []
        );
        return res.json({ success: true, route });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Route calculation failed' });
    }
});

module.exports = router;
