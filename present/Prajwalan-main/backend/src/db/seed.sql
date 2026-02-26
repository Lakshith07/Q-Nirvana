-- Seed users for Q Nirvana
-- Passwords are 'password123' hashed with bcrypt (salt rounds 10)
-- Hash: $2b$10$wE0.Fk0O5.WJp0Vp0Vp0V.WJp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0V

INSERT INTO users (full_name, email, mobile, password_hash, role, is_verified) VALUES
('Admin User', 'admin@qnirvana.com', '9999999999', '$2b$10$wE0.Fk0O5.WJp0Vp0Vp0V.WJp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0V', 'admin', true),
('Dr. Smith', 'doctor@qnirvana.com', '8888888888', '$2b$10$wE0.Fk0O5.WJp0Vp0Vp0V.WJp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0V', 'doctor', true),
('Ambulance John', 'driver@qnirvana.com', '7777777777', '$2b$10$wE0.Fk0O5.WJp0Vp0Vp0V.WJp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0V', 'driver', true),
('Test Patient', 'patient@qnirvana.com', '6666666666', '$2b$10$wE0.Fk0O5.WJp0Vp0Vp0V.WJp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0Vp0V', 'patient', true);

-- Profiles
INSERT INTO doctor_profiles (user_id, specialization, license_number, department, consultation_fee)
SELECT id, 'Cardiology', 'DOC-12345', 'Cardiology Dept', 500 FROM users WHERE email = 'doctor@qnirvana.com';

INSERT INTO driver_profiles (user_id, vehicle_number, license_number, status)
SELECT id, 'KA-01-AM-1234', 'DL-987654321', 'available' FROM users WHERE email = 'driver@qnirvana.com';

INSERT INTO patient_profiles (user_id, dob, gender, blood_group, address)
SELECT id, '1990-01-01', 'male', 'O+', '123 Tech Park, Bangalore' FROM users WHERE email = 'patient@qnirvana.com';

-- Sample Beds
INSERT INTO hospital_beds (ward_name, room_number, bed_number, bed_type, floor_number, charge_per_day) VALUES
('ICU-A', '301', 'B1', 'icu', 3, 5000),
('General-1', '101', 'B5', 'general', 1, 800),
('AC-Private', '205', 'B1', 'ac', 2, 2500);
