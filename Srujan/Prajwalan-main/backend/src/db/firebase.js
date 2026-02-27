const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Optional: Enable offline persistence if it was a frontend, but this is backend.
// We can also export admin.auth() if needed for authentication instead of custom JWT.

module.exports = {
  db,
  admin,
  auth: admin.auth()
};
