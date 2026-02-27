const express = require('express');
const { db } = require('../db/firebase');
const { authenticate, authorize, auditLog } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/dashboard - summary stats
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [patientsCount, doctorsCount, driversCount, bedsSnapshot, emergenciesSnapshot, apptsSnapshot, bloodBankSnapshot, o2Snapshot] = await Promise.all([
            db.collection('users').where('role', '==', 'patient').where('is_active', '==', true).get(),
            db.collection('users').where('role', '==', 'doctor').where('is_active', '==', true).get(),
            db.collection('users').where('role', '==', 'driver').where('is_active', '==', true).get(),
            db.collection('hospital_beds').get(),
            db.collection('emergency_requests').get(),
            db.collection('appointments').where('appointment_date', '==', today).get(),
            db.collection('blood_bank').orderBy('units_available', 'asc').limit(3).get(),
            db.collection('hospital_beds').where('o2_cylinder_assigned', '==', true).get()
        ]);

        const bedStats = bedsSnapshot.docs.reduce((acc, doc) => {
            const status = doc.data().status;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const emergencyStats = emergenciesSnapshot.docs.reduce((acc, doc) => {
            const status = doc.data().status;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const apptStats = apptsSnapshot.docs.reduce((acc, doc) => {
            const status = doc.data().status;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return res.json({
            success: true,
            dashboard: {
                total_patients: patientsCount.size,
                total_doctors: doctorsCount.size,
                total_drivers: driversCount.size,
                beds: Object.entries(bedStats).map(([status, count]) => ({ status, count })),
                emergencies: Object.entries(emergencyStats).map(([status, count]) => ({ status, count })),
                today_appointments: Object.entries(apptStats).map(([status, count]) => ({ status, count })),
                low_blood_stock: bloodBankSnapshot.docs.map(doc => doc.data()),
                o2_in_use: o2Snapshot.size,
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
    const { role, limit = 20 } = req.query;
    try {
        let query = db.collection('users').orderBy('created_at', 'desc');
        if (role) query = query.where('role', '==', role);

        const snapshot = await query.limit(parseInt(limit)).get();
        const users = snapshot.docs.map(doc => doc.data());

        return res.json({
            success: true,
            users,
            total: snapshot.size,
            page: 1
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/doctors - doctors with workload
router.get('/doctors', async (req, res) => {
    try {
        const doctorsSnapshot = await db.collection('doctor_profiles').get();
        const doctors = [];
        const today = new Date().toISOString().split('T')[0];

        for (const doc of doctorsSnapshot.docs) {
            const profile = doc.data();
            const userDoc = await db.collection('users').doc(profile.user_id).get();

            if (userDoc.exists && userDoc.data().is_active) {
                const todayLoad = (await db.collection('appointments')
                    .where('doctor_id', '==', doc.id)
                    .where('appointment_date', '==', today)
                    .get()).size;

                const queueSize = (await db.collection('patient_queue')
                    .where('doctor_id', '==', doc.id)
                    .where('status', '==', 'waiting')
                    .get()).size;

                doctors.push({
                    id: userDoc.id,
                    full_name: userDoc.data().full_name,
                    email: userDoc.data().email,
                    ...profile,
                    today_load: todayLoad,
                    queue_size: queueSize
                });
            }
        }

        doctors.sort((a, b) => b.today_load - a.today_load);
        return res.json({ success: true, doctors });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/beds
router.get('/beds', async (req, res) => {
    try {
        const snapshot = await db.collection('hospital_beds').get();
        const beds = snapshot.docs.map(doc => doc.data());

        const summary = beds.reduce((acc, bed) => {
            const key = `${bed.floor_number}-${bed.ward_name}-${bed.bed_type}`;
            if (!acc[key]) {
                acc[key] = {
                    bed_type: bed.bed_type,
                    floor_number: bed.floor_number,
                    ward_name: bed.ward_name,
                    total: 0, available: 0, occupied: 0, maintenance: 0
                };
            }
            acc[key].total++;
            acc[key][bed.status]++;
            return acc;
        }, {});

        return res.json({ success: true, summary: Object.values(summary), beds });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/admin/beds - add bed
router.post('/beds', auditLog('ADD_BED'), async (req, res) => {
    const { ward_name, room_number, bed_number, bed_type, floor_number, charge_per_day } = req.body;
    try {
        const ref = db.collection('hospital_beds').doc();
        const bedData = {
            id: ref.id,
            ward_name,
            room_number,
            bed_number,
            bed_type,
            floor_number: floor_number || 1,
            charge_per_day: charge_per_day || 0,
            status: 'available',
            created_at: new Date().toISOString()
        };
        await ref.set(bedData);
        return res.status(201).json({ success: true, bed: bedData });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/admin/beds/:id - update bed status
router.patch('/beds/:id', auditLog('UPDATE_BED'), async (req, res) => {
    const { status, patient_id } = req.body;
    try {
        const updateData = {
            status,
            patient_id: patient_id || null,
            updated_at: new Date().toISOString()
        };
        if (status === 'occupied') updateData.admitted_at = new Date().toISOString();
        else updateData.admitted_at = null;

        await db.collection('hospital_beds').doc(req.params.id).update(updateData);
        return res.json({ success: true, message: 'Bed updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/blood-bank
router.get('/blood-bank', async (req, res) => {
    try {
        const stockSnapshot = await db.collection('blood_bank').get();
        const requestsSnapshot = await db.collection('blood_requests')
            .where('status', '==', 'pending')
            .get();

        const pending_requests = [];
        for (const doc of requestsSnapshot.docs) {
            const data = doc.data();
            const patientUser = (await db.collection('users').doc(data.patient_id).get()).data();
            const requestedBy = (await db.collection('users').doc(data.requested_by).get()).data();
            pending_requests.push({
                ...data,
                patient_name: patientUser?.full_name || 'Unknown',
                requested_by_name: requestedBy?.full_name || 'Unknown'
            });
        }

        return res.json({
            success: true,
            stock: stockSnapshot.docs.map(doc => doc.data()),
            pending_requests
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/admin/blood-bank/:bloodGroup - update stock
router.patch('/blood-bank/:bloodGroup', auditLog('UPDATE_BLOOD_BANK'), async (req, res) => {
    const { units_available } = req.body;
    try {
        await db.collection('blood_bank').doc(req.params.bloodGroup).update({
            units_available,
            last_updated: new Date().toISOString()
        });
        return res.json({ success: true, message: 'Blood stock updated' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/admin/blood-requests/:id - approve/reject
router.patch('/blood-requests/:id', auditLog('BLOOD_REQUEST_UPDATE'), async (req, res) => {
    const { status } = req.body; // approved | rejected
    try {
        const reqRef = db.collection('blood_requests').doc(req.params.id);
        const reqDoc = await reqRef.get();
        const r = reqDoc.data();

        await reqRef.update({
            status,
            approved_by: req.user.id,
            approved_at: new Date().toISOString()
        });

        if (status === 'approved') {
            const bankRef = db.collection('blood_bank').doc(r.blood_group);
            const bankDoc = await bankRef.get();
            const current = bankDoc.data().units_available;
            if (current >= r.units_needed) {
                await bankRef.update({ units_available: current - r.units_needed });
            }
        }
        return res.json({ success: true, message: `Blood request ${status}` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/emergencies
router.get('/emergencies', async (req, res) => {
    try {
        const snapshot = await db.collection('emergency_requests')
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();

        const emergencies = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const patientUser = (await db.collection('users').doc(data.patient_id).get()).data();
            let driverName = 'Not Assigned';
            let vehicleNum = '';

            if (data.driver_id) {
                const driverUser = (await db.collection('users').doc(data.driver_id).get()).data();
                const driverProfile = (await db.collection('driver_profiles').doc(data.driver_id).get()).data();
                driverName = driverUser?.full_name || 'Unknown';
                vehicleNum = driverProfile?.vehicle_number || '';
            }

            emergencies.push({
                ...data,
                patient_name: patientUser?.full_name || 'Unknown',
                patient_mobile: patientUser?.mobile || '',
                driver_name: driverName,
                vehicle_number: vehicleNum
            });
        }
        return res.json({ success: true, emergencies });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
    try {
        const snapshot = await db.collection('audit_logs')
            .orderBy('created_at', 'desc')
            .limit(100)
            .get();

        const logs = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const adminUser = (await db.collection('users').doc(data.admin_id).get()).data();
            logs.push({ ...data, admin_name: adminUser?.full_name || 'System' });
        }
        return res.json({ success: true, logs });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH /api/admin/users/:id/toggle - activate/deactivate user
router.patch('/users/:id/toggle', auditLog('TOGGLE_USER'), async (req, res) => {
    try {
        const userRef = db.collection('users').doc(req.params.id);
        const userDoc = await userRef.get();
        const newState = !userDoc.data().is_active;

        await userRef.update({
            is_active: newState,
            updated_at: new Date().toISOString()
        });

        return res.json({
            success: true,
            user: { id: req.params.id, full_name: userDoc.data().full_name, is_active: newState }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/admin/assign-opd - reassign OPD to another doctor
router.post('/assign-opd', auditLog('REASSIGN_OPD'), async (req, res) => {
    const { appointment_id, new_doctor_id } = req.body;
    try {
        await db.collection('appointments').doc(appointment_id).update({
            doctor_id: new_doctor_id,
            updated_at: new Date().toISOString()
        });

        const qSnapshot = await db.collection('patient_queue')
            .where('appointment_id', '==', appointment_id)
            .get();
        if (!qSnapshot.empty) {
            await qSnapshot.docs[0].ref.update({ doctor_id: new_doctor_id });
        }

        return res.json({ success: true, message: 'OPD reassigned successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/admin/queue - full hospital queue overview
router.get('/queue', async (req, res) => {
    try {
        const snapshot = await db.collection('patient_queue').get();
        const queue = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.status) {
                const patientUser = (await db.collection('users').doc(data.patient_id).get()).data() || {};
                const patientProfile = (await db.collection('patient_profiles').doc(data.patient_id).get()).data() || {};
                const doctorUser = (await db.collection('users').doc(data.doctor_id).get()).data() || {};
                const doctorProfile = (await db.collection('doctor_profiles').doc(data.doctor_id).get()).data() || {};
                const apptDoc = (await db.collection('appointments').doc(data.appointment_id).get()).data() || {};

                queue.push({
                    ...data,
                    patient_name: patientUser.full_name || 'Unknown',
                    age: patientProfile.age || 'N/A',
                    gender: patientProfile.gender || 'N/A',
                    doctor_name: doctorUser.full_name || 'Unknown',
                    department: doctorProfile.department || 'General',
                    appointment_time: apptDoc.appointment_time || 'N/A',
                    is_emergency: apptDoc.is_emergency || false
                });
            }
        }

        queue.sort((a, b) => b.priority_score - a.priority_score);
        return res.json({ success: true, queue });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

