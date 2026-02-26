const jwt = require('jsonwebtoken');
const pool = require('../db');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1',
            [decoded.id]
        );
        if (!result.rows.length || !result.rows[0].is_active) {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }
        req.user = result.rows[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${roles.join(' or ')}`,
        });
    }
    next();
};

const auditLog = (action) => async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        try {
            await pool.query(
                `INSERT INTO audit_logs (admin_id, action, ip_address) VALUES ($1, $2, $3)`,
                [req.user.id, action, req.ip || req.connection.remoteAddress]
            );
        } catch (e) { /* non-blocking */ }
    }
    next();
};

module.exports = { authenticate, authorize, auditLog };
