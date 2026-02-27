const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../db/firebase');
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

// Helpers
const generateId = () => Math.random().toString(36).substr(2, 9);

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { full_name, email, mobile, password, role, ...extra } = req.body;

    try {
        // Check if email already exists
        const emailCheck = await db.collection('users').where('email', '==', email).get();
        if (!emailCheck.empty) {
            return res.status(409).json({ success: false, message: 'the email is already is registred' });
        }

        // Check if mobile already exists
        const mobileCheck = await db.collection('users').where('mobile', '==', mobile).get();
        if (!mobileCheck.empty) {
            return res.status(409).json({ success: false, message: 'Mobile number already registered' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        // Create user document
        const userRef = db.collection('users').doc();
        const userId = userRef.id;

        const userData = {
            id: userId,
            full_name,
            email,
            mobile,
            password_hash,
            role,
            is_verified: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await userRef.set(userData);

        // Create role-specific profile
        if (role === 'patient') {
            const { dob, gender, blood_group, address, emergency_contact_name, emergency_contact_phone } = extra;
            let age = null;
            if (dob) {
                const birthDate = new Date(dob);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            }

            await db.collection('patient_profiles').doc(userId).set({
                id: userId, // Using same ID as user for 1:1 mapping
                user_id: userId,
                dob: dob || null,
                age,
                gender: gender || null,
                blood_group: blood_group || null,
                address: address || null,
                emergency_contact_name: emergency_contact_name || null,
                emergency_contact_phone: emergency_contact_phone || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        } else if (role === 'doctor') {
            const { specialization, license_number, department, qualification, experience_years } = extra;
            await db.collection('doctor_profiles').doc(userId).set({
                id: userId,
                user_id: userId,
                specialization: specialization || 'General',
                license_number: license_number || `LIC-${Date.now()}`,
                department: department || null,
                qualification: qualification || null,
                experience_years: experience_years || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        } else if (role === 'driver') {
            const { vehicle_number, license_number } = extra;
            await db.collection('driver_profiles').doc(userId).set({
                id: userId,
                user_id: userId,
                vehicle_number: vehicle_number || `AMB-${Date.now()}`,
                license_number: license_number || `DL-${Date.now()}`,
                status: 'available',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        // Send welcome email (non-blocking)
        const tmpl = emailTemplates.welcomeIST(full_name, role);
        sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

        // Issue JWT
        const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        return res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome email sent.',
            token,
            user: { id: userId, full_name, email, role },
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
    console.log(`🔍 Login attempt for: ${email}`);

    try {
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            console.warn(`❌ User not found: ${email}`);
            return res.status(401).json({ success: false, message: 'wrong password or the email' });
        }

        const user = snapshot.docs[0].data();
        console.log(`✅ User found: ${user.email}, comparing password...`);

        if (!user.is_active) {
            console.warn(`⚠️ User inactive: ${email}`);
            return res.status(403).json({ success: false, message: 'Account is deactivated' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`⚖️ Password valid: ${isValid}`);

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'wrong password or the email' });
        }

        // Check if doctor has email verification enabled
        if (user.role === 'doctor') {
            const docProfile = await db.collection('doctor_profiles').doc(user.id).get();
            const profile = docProfile.data() || {};
            if (profile.email_enabled && profile.notification_email) {
                // Generate and send OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpHash = await bcrypt.hash(otp, 10);
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

                await db.collection('otp_store').doc(user.id).set({
                    otp_hash: otpHash,
                    expiresAt,
                    purpose: 'login',
                    email: profile.notification_email,
                    userId: user.id,
                    attempts: 0
                });

                const tmpl = emailTemplates.twoFactorOtp(user.full_name, otp, 'login');
                sendEmail({ to: profile.notification_email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

                return res.json({
                    success: true,
                    requires_2fa: true,
                    two_fa_email: profile.notification_email.replace(/(.{2})(.+)(@.+)/, '$1***$3'),
                    user_id: user.id,
                    message: `OTP sent to ${profile.notification_email.replace(/(.{2})(.+)(@.+)/, '$1***$3')}`
                });
            }
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

// POST /api/auth/verify-login-otp - verify OTP during login
router.post('/verify-login-otp', async (req, res) => {
    const { user_id, otp } = req.body;
    if (!user_id || !otp) return res.status(400).json({ success: false, message: 'user_id and otp required' });

    try {
        const otpDoc = await db.collection('otp_store').doc(user_id).get();
        if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'OTP expired or not found' });

        const stored = otpDoc.data();
        if (stored.purpose !== 'login') return res.status(400).json({ success: false, message: 'Invalid OTP purpose' });

        // Limit attempts (3 tries)
        if (stored.attempts >= 3) {
            await db.collection('otp_store').doc(user_id).delete();
            await db.collection('security_logs').add({
                userId: user_id, type: 'OTP_BRUTE_FORCE_PREVENTION',
                message: '3 failed OTP attempts during login',
                timestamp: new Date().toISOString()
            });
            return res.status(403).json({ success: false, message: 'Too many attempts. Please request a new code.' });
        }

        if (new Date() > new Date(stored.expiresAt)) {
            await db.collection('otp_store').doc(user_id).delete();
            return res.status(400).json({ success: false, message: 'OTP has expired. Please log in again.' });
        }

        const isMatch = await bcrypt.compare(otp.trim(), stored.otp_hash);
        if (!isMatch) {
            const newAttempts = (stored.attempts || 0) + 1;
            await db.collection('otp_store').doc(user_id).update({ attempts: newAttempts });

            if (newAttempts >= 3) {
                await db.collection('security_logs').add({
                    userId: user_id, type: 'SUSPICIOUS_LOGIN_ATTEMPT',
                    message: `3 failed OTP attempts from IP: ${req.ip}`,
                    timestamp: new Date().toISOString()
                });
            }
            return res.status(400).json({ success: false, message: `Incorrect OTP. ${3 - newAttempts} attempts left.` });
        }

        // OTP valid – delete it, return token
        await db.collection('otp_store').doc(user_id).delete();

        const userDoc = await db.collection('users').doc(user_id).get();
        const user = userDoc.data();

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        return res.json({
            success: true,
            token,
            user: { id: user.id, full_name: user.full_name, email: user.email, mobile: user.mobile, role: user.role },
        });
    } catch (err) {
        console.error('OTP verify error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/auth/send-enable-otp - doctor requests enable email OTP
router.post('/send-enable-otp', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    let decoded;
    try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET); }
    catch (e) { return res.status(401).json({ success: false, message: 'Invalid token' }); }

    if (decoded.role !== 'doctor') return res.status(403).json({ success: false, message: 'Only doctors can enable Email Verification' });

    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, message: 'Valid email required' });

    try {
        const userDoc = await db.collection('users').doc(decoded.id).get();
        if (!userDoc.exists) return res.status(404).json({ success: false, message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

        await db.collection('otp_store').doc(decoded.id).set({
            otp_hash: otpHash,
            expiresAt,
            purpose: 'enable_email',
            email,
            userId: decoded.id,
            attempts: 0
        });

        const tmpl = emailTemplates.twoFactorOtp(userDoc.data().full_name, otp, 'setup');
        const result = await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html });

        if (!result.success) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP email. Check email config.' });
        }

        return res.json({ success: true, message: `OTP sent to ${email}` });
    } catch (err) {
        console.error('Email enable setup error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/auth/verify-enable-otp - verify OTP and enable email
router.post('/verify-enable-otp', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    let decoded;
    try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET); }
    catch (e) { return res.status(401).json({ success: false, message: 'Invalid token' }); }

    if (decoded.role !== 'doctor') return res.status(403).json({ success: false, message: 'Only doctors can enable Email Verification' });

    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP required' });

    try {
        const otpDoc = await db.collection('otp_store').doc(decoded.id).get();
        if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'OTP not found or expired' });

        const stored = otpDoc.data();
        if (stored.purpose !== 'enable_email') return res.status(400).json({ success: false, message: 'Invalid OTP' });

        if (stored.attempts >= 3) {
            await db.collection('otp_store').doc(decoded.id).delete();
            return res.status(403).json({ success: false, message: 'Too many failed attempts. Try again later.' });
        }

        if (new Date() > new Date(stored.expiresAt)) {
            await db.collection('otp_store').doc(decoded.id).delete();
            return res.status(400).json({ success: false, message: 'OTP has expired. Please try again.' });
        }

        const isMatch = await bcrypt.compare(otp.trim(), stored.otp_hash);
        if (!isMatch) {
            const newAttempts = (stored.attempts || 0) + 1;
            await db.collection('otp_store').doc(decoded.id).update({ attempts: newAttempts });
            return res.status(400).json({ success: false, message: `Incorrect OTP. ${3 - newAttempts} attempts left.` });
        }

        // Enable Email Verification
        await db.collection('otp_store').doc(decoded.id).delete();
        await db.collection('doctor_profiles').doc(decoded.id).update({
            email_enabled: true,
            notification_email: stored.email,
            email_enabled_at: new Date().toISOString()
        });

        return res.json({ success: true, message: 'Email verification enabled successfully! 🎉' });
    } catch (err) {
        console.error('Email verify error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/auth/send-disable-otp - doctor requests OTP to disable email verification
router.post('/send-disable-otp', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    let decoded;
    try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET); }
    catch (e) { return res.status(401).json({ success: false, message: 'Invalid token' }); }

    try {
        const userDoc = await db.collection('users').doc(decoded.id).get();
        if (!userDoc.exists) return res.status(404).json({ success: false, message: 'User not found' });

        const docProfile = await db.collection('doctor_profiles').doc(decoded.id).get();
        const profile = docProfile.data() || {};
        if (!profile.email_enabled || !profile.notification_email) {
            return res.status(400).json({ success: false, message: 'Email Verification is not enabled' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await db.collection('otp_store').doc(decoded.id).set({
            otp_hash: otpHash,
            expiresAt,
            purpose: 'disable_email',
            email: profile.notification_email,
            userId: decoded.id,
            attempts: 0
        });

        const tmpl = emailTemplates.twoFactorOtp(userDoc.data().full_name, otp, 'disable');
        const result = await sendEmail({ to: profile.notification_email, subject: tmpl.subject, html: tmpl.html });

        if (!result.success) return res.status(500).json({ success: false, message: 'Failed to send OTP' });

        return res.json({ success: true, message: `Verification code sent to ${profile.notification_email.replace(/(.{2})(.+)(@.+)/, '$1***$3')}` });
    } catch (err) {
        console.error('Email disable otp error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/auth/verify-disable-otp - verify OTP and disable email verification
router.post('/verify-disable-otp', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    let decoded;
    try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET); }
    catch (e) { return res.status(401).json({ success: false, message: 'Invalid token' }); }

    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP required' });

    try {
        const otpDoc = await db.collection('otp_store').doc(decoded.id).get();
        if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'OTP not found' });

        const stored = otpDoc.data();
        if (stored.purpose !== 'disable_email') return res.status(400).json({ success: false, message: 'Invalid OTP' });

        if (stored.attempts >= 3) {
            await db.collection('otp_store').doc(decoded.id).delete();
            return res.status(403).json({ success: false, message: 'Too many attempts. Please request a new code.' });
        }

        if (new Date() > new Date(stored.expiresAt)) return res.status(400).json({ success: false, message: 'OTP expired' });

        const isMatch = await bcrypt.compare(otp.trim(), stored.otp_hash);
        if (!isMatch) {
            const newAttempts = (stored.attempts || 0) + 1;
            await db.collection('otp_store').doc(decoded.id).update({ attempts: newAttempts });
            return res.status(400).json({ success: false, message: `Incorrect OTP. ${3 - newAttempts} attempts left.` });
        }

        await db.collection('otp_store').doc(decoded.id).delete();
        await db.collection('doctor_profiles').doc(decoded.id).update({
            email_enabled: false,
            notification_email: null
        });

        return res.json({ success: true, message: 'Email Verification disabled successfully.' });
    } catch (err) {
        console.error('Email verify disable error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/auth/send-registration-otp
router.post('/send-registration-otp', async (req, res) => {
    // Implementing functionality per user logic requirements
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    try {
        const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (userSnapshot.empty) return res.status(404).json({ success: false, message: 'User not found' });

        const user = userSnapshot.docs[0].data();
        if (user.role !== 'doctor') return res.status(403).json({ success: false, message: 'Not a doctor' });

        const docProfile = await db.collection('doctor_profiles').doc(user.id).get();
        const profile = docProfile.data() || {};

        if (!profile.email_enabled || !profile.notification_email) {
            return res.status(400).json({ success: false, message: 'Email verification is not enabled' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await db.collection('otp_store').doc(user.id).set({
            otp_hash: otpHash,
            expiresAt,
            purpose: 'registration_login',
            email: profile.notification_email,
            userId: user.id,
            attempts: 0
        });

        const tmpl = emailTemplates.twoFactorOtp(user.full_name, otp, 'login');
        sendEmail({ to: profile.notification_email, subject: tmpl.subject, html: tmpl.html }).catch(console.error);

        return res.json({
            success: true,
            requires_2fa: true,
            notification_email: profile.notification_email.replace(/(.{2})(.+)(@.+)/, '$1***$3'),
            user_id: user.id,
            message: `OTP sent to ${profile.notification_email.replace(/(.{2})(.+)(@.+)/, '$1***$3')}`
        });

    } catch (err) {
        console.error('Send registration OTP error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/auth/verify-registration-otp
router.post('/verify-registration-otp', async (req, res) => {
    const { user_id, otp } = req.body;
    if (!user_id || !otp) return res.status(400).json({ success: false, message: 'user_id and otp required' });

    try {
        const otpDoc = await db.collection('otp_store').doc(user_id).get();
        if (!otpDoc.exists) return res.status(400).json({ success: false, message: 'OTP expired or not found' });

        const stored = otpDoc.data();
        if (stored.purpose !== 'registration_login') return res.status(400).json({ success: false, message: 'Invalid OTP purpose' });

        if (stored.attempts >= 3) {
            await db.collection('otp_store').doc(user_id).delete();
            return res.status(403).json({ success: false, message: 'Too many attempts. Please request a new code.' });
        }

        if (new Date() > new Date(stored.expiresAt)) {
            await db.collection('otp_store').doc(user_id).delete();
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        const isMatch = await bcrypt.compare(otp.trim(), stored.otp_hash);
        if (!isMatch) {
            const newAttempts = (stored.attempts || 0) + 1;
            await db.collection('otp_store').doc(user_id).update({ attempts: newAttempts });
            return res.status(400).json({ success: false, message: `Incorrect OTP. ${3 - newAttempts} attempts left.` });
        }

        await db.collection('otp_store').doc(user_id).delete();

        const userDoc = await db.collection('users').doc(user_id).get();
        const user = userDoc.data();

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        return res.json({
            success: true,
            token,
            user: { id: user.id, full_name: user.full_name, email: user.email, mobile: user.mobile, role: user.role },
        });
    } catch (err) {
        console.error('Verify registration OTP error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
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

        const userDoc = await db.collection('users').doc(decoded.id).get();

        if (!userDoc.exists) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'doctor') {
            const dp = await db.collection('doctor_profiles').doc(user.id).get();
            if (dp.exists) {
                user.email_enabled = dp.data().email_enabled || false;
            }
        }

        return res.json({ success: true, user });
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

module.exports = router;

