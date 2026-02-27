const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/patient/appointments',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', data));
});
req.on('error', console.error);
req.write(JSON.stringify({ doctor_id: 'test', appointment_date: '2026-03-02', appointment_time: '14:00 PM', reason: 'Fever' }));
req.end();
