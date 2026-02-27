const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'nirvana',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function seedQueue() {
    try {
        const patientRes = await pool.query("SELECT id FROM patient_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'nandikahasini@gmail.com' LIMIT 1)");
        const doctorRes = await pool.query("SELECT id FROM doctor_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'doctor@qnirvana.com' LIMIT 1)");

        if (patientRes.rows.length && doctorRes.rows.length) {
            const pid = patientRes.rows[0].id;
            const did = doctorRes.rows[0].id;

            // 1. Create an appointment
            const apptRes = await pool.query(`
                INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, priority, reason)
                VALUES ($1, $2, CURRENT_DATE, '10:00:00', 'scheduled', 'general', 'Regular checkup for persistent cough')
                RETURNING id
            `, [pid, did]);

            const aid = apptRes.rows[0].id;

            // 2. Put in queue
            await pool.query(`
                INSERT INTO patient_queue (appointment_id, doctor_id, patient_id, status, position, priority_score)
                VALUES ($1, $2, $3, 'waiting', 1, 65)
            `, [aid, did, pid]);

            console.log('✅ Sample patient added to queue');
        } else {
            console.log('❌ Could not find test patient or doctor');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error seeding queue:', err.message);
        process.exit(1);
    }
}

seedQueue();
