const jwt = require('jsonwebtoken');
const { db } = require('../db/firebase');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const userDoc = await db.collection('users').doc(decoded.id).get();

        if (!userDoc.exists || !userDoc.data().is_active) {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        req.user = userDoc.data();
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
            await db.collection('audit_logs').add({
                admin_id: req.user.id,
                action,
                ip_address: req.ip || req.connection.remoteAddress,
                created_at: new Date().toISOString()
            });
        } catch (e) { /* non-blocking */ }
    }
    next();
};

module.exports = { authenticate, authorize, auditLog };


module.exports = { authenticate, authorize, auditLog };
