const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { sendEmail, emailTemplates } = require('../services/emailService');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('full_name').trim().isLength({ min: 2 }).withMessage('Full name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('mobile').matches(/^[0-9+]{10,15}$/).withMessage('Valid mobile number required (10-15 digits)'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
    body('role').isIn(['patient', 'doctor', 'admin', 'driver']).withMessage('Invalid role'),
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
];

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { full_name, email, mobile, password, role, ...extra } = req.body;

    try {
        // Check if email or mobile already exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR mobile = $2',
            [email, mobile]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Email or mobile already registered' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        // Insert user
        const userResult = await pool.query(
            `INSERT INTO users (full_name, email, mobile, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role`,
            [full_name, email, mobile, password_hash, role]
        );
        const user = userResult.rows[0];

        // Create role-specific profile
        if (role === 'patient') {
            const { dob, gender, blood_group, address, emergency_contact_name, emergency_contact_phone } = extra;
            // Calculate age from dob
            let age = null;
            if (dob) {
                const birthDate = new Date(dob);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            }
            await pool.query(
                `INSERT INTO patient_profiles (user_id, dob, age, gender, blood_group, address, emergency_contact_name, emergency_contact_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [user.id, dob || null, age, gender || null, blood_group || null, address || null,
                emergency_contact_name || null, emergency_contact_phone || null]
            );
        } else if (role === 'doctor') {
            const { specialization, license_number, department, qualification, experience_years } = extra;
            await pool.query(
                `INSERT INTO doctor_profiles (user_id, specialization, license_number, department, qualification, experience_years)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [user.id, specialization || 'General', license_number || `LIC-${Date.now()}`,
                department || null, qualification || null, experience_years || 0]
            );
        } else if (role === 'driver') {
            const { vehicle_number, license_number } = extra;
            await pool.query(
                `INSERT INTO driver_profiles (user_id, vehicle_number, license_number)
         VALUES ($1, $2, $3)`,
                [user.id, vehicle_number || `AMB-${Date.now()}`, license_number || `DL-${Date.now()}`]
            );
        }

        // Send welcome email (non-blocking)
        const tmpl = emailTemplates.welcome(full_name);
        sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

        // Issue JWT
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        return res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome email sent.',
            token,
            user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT id, full_name, email, mobile, password_hash, role, is_active FROM users WHERE email = $1',
            [email]
        );
        if (!result.rows.length) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Account is deactivated' });
        }
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        return res.json({
            success: true,
            token,
            user: { id: user.id, full_name: user.full_name, email: user.email, mobile: user.mobile, role: user.role },
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT id, full_name, email, mobile, role, is_verified, created_at FROM users WHERE id = $1',
            [decoded.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
        return res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

module.exports = router;
