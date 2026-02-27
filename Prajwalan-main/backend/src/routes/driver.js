const express = require('express');
const { db } = require('../db/firebase');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateOptimalRoute } = require('../services/dijkstraService');
const { cityGraph, nodePositions, dijkstraFast, updateTraffic } = require('../services/dijkstraCity');

const router = express.Router();
router.use(authenticate, authorize('driver'));

// GET /api/driver/profile
router.get('/profile', async (req, res) => {
    try {
        const uDoc = await db.collection('users').doc(req.user.id).get();
        const dpDoc = await db.collection('driver_profiles').doc(req.user.id).get();

        if (!uDoc.exists || !dpDoc.exists) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        const profile = { ...uDoc.data(), ...dpDoc.data() };
        delete profile.password_hash;

        return res.json({ success: true, profile });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/driver/status - update driver status and location
router.patch('/status', async (req, res) => {
    const { status, current_lat, current_lng } = req.body;
    try {
        await db.collection('driver_profiles').doc(req.user.id).update({
            status,
            current_lat: current_lat || null,
            current_lng: current_lng || null,
            updated_at: new Date().toISOString()
        });
        return res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/driver/emergencies - available emergency requests
router.get('/emergencies', async (req, res) => {
    try {
        const snapshot = await db.collection('emergency_requests')
            .where('status', '==', 'requested')
            .get();

        const emergencies = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.driver_id) {
                let patientUser = {};
                if (data.patient_id) {
                    try {
                        patientUser = (await db.collection('users').doc(data.patient_id).get()).data() || {};
                    } catch (e) { console.error('Error fetching patient user:', e); }
                }
                emergencies.push({
                    ...data,
                    patient_name: patientUser.full_name || 'Unknown',
                    patient_mobile: patientUser.mobile || ''
                });
            }
        }
        return res.json({ success: true, emergencies });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/driver/emergencies/:id/accept
router.post('/emergencies/:id/accept', async (req, res) => {
    try {
        const dpDoc = await db.collection('driver_profiles').doc(req.user.id).get();
        if (!dpDoc.exists) return res.status(404).json({ success: false, message: 'Driver profile not found' });
        const driver = dpDoc.data();

        const erDoc = await db.collection('emergency_requests').doc(req.params.id).get();
        if (!erDoc.exists) return res.status(404).json({ success: false, message: 'Emergency not found' });
        const emergency = erDoc.data();

        // Calculate route using Dijkstra's
        const driverLoc = { lat: driver.current_lat || 12.9716, lng: driver.current_lng || 77.5946 };
        const patientLoc = { lat: parseFloat(emergency.pickup_lat) || 12.98, lng: parseFloat(emergency.pickup_lng) || 77.6 };
        const hospitalLoc = { lat: parseFloat(emergency.hospital_lat) || 12.9716, lng: parseFloat(emergency.hospital_lng) || 77.5946 };

        const route = calculateOptimalRoute(driverLoc, patientLoc, hospitalLoc);

        // Update emergency
        await db.collection('emergency_requests').doc(req.params.id).update({
            driver_id: req.user.id,
            status: 'accepted',
            route_data: JSON.stringify(route),
            updated_at: new Date().toISOString()
        });

        await db.collection('driver_profiles').doc(req.user.id).update({
            status: 'on_duty',
            updated_at: new Date().toISOString()
        });

        return res.json({
            success: true,
            message: 'Emergency accepted. Optimal route calculated.',
            route,
            emergency: { ...emergency, driver_id: req.user.id, status: 'accepted' },
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
        await db.collection('emergency_requests').doc(req.params.id).update({
            status,
            updated_at: new Date().toISOString()
        });

        if (status === 'completed') {
            await db.collection('driver_profiles').doc(req.user.id).update({
                status: 'available',
                updated_at: new Date().toISOString()
            });
        }
        return res.json({ success: true, message: `Status updated to ${status}` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/driver/my-emergencies - driver's history
router.get('/my-emergencies', async (req, res) => {
    try {
        const snapshot = await db.collection('emergency_requests')
            .where('driver_id', '==', req.user.id)
            .get();

        const emergencies = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            let patientUser = {};
            if (data.patient_id) {
                try {
                    patientUser = (await db.collection('users').doc(data.patient_id).get()).data() || {};
                } catch (e) { console.error('Error fetching patient user:', e); }
            }
            emergencies.push({
                ...data,
                patient_name: patientUser.full_name || 'Unknown',
                patient_mobile: patientUser.mobile || ''
            });
        }

        emergencies.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return res.json({ success: true, emergencies: emergencies.slice(0, 20) });
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

// GET /api/driver/city-graph
router.get('/city-graph', (req, res) => {
    res.json({ success: true, graph: cityGraph, positions: nodePositions });
});

// POST /api/driver/shortest-path
router.post('/shortest-path', (req, res) => {
    const { source, destination } = req.body;
    if (!cityGraph[source] || !cityGraph[destination]) {
        return res.status(400).json({ success: false, message: 'Invalid nodes' });
    }
    const result = dijkstraFast(cityGraph, source, destination);
    res.json({ success: true, ...result });
});

// POST /api/driver/update-traffic
router.post('/update-traffic', (req, res) => {
    const newGraph = updateTraffic();
    res.json({ success: true, graph: newGraph });
});

module.exports = router;

