-- Q Nirvana Hospital Management System
-- PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM types
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin', 'driver');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE bed_type AS ENUM ('general', 'icu', 'ventilated', 'ac', 'non_ac');
CREATE TYPE bed_status AS ENUM ('available', 'occupied', 'maintenance');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_queue', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE queue_priority AS ENUM ('emergency', 'maternity', 'old_age', 'child_under_2', 'general');
CREATE TYPE emergency_status AS ENUM ('requested', 'accepted', 'en_route', 'picked_up', 'at_hospital', 'completed');
CREATE TYPE driver_status AS ENUM ('available', 'on_duty', 'offline');

-- Users table (base for all roles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  profile_image TEXT,
  telegram_chat_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Patient profiles
CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  dob DATE,
  age INTEGER,
  gender gender_type,
  blood_group blood_group,
  address TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  allergies TEXT,
  chronic_conditions TEXT,
  insurance_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Doctor profiles
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  specialization VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE NOT NULL,
  department VARCHAR(255),
  qualification VARCHAR(500),
  experience_years INTEGER DEFAULT 0,
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Doctor availability slots
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_patients INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT TRUE
);

-- Driver profiles
CREATE TABLE driver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number VARCHAR(50) UNIQUE NOT NULL,
  vehicle_type VARCHAR(100) DEFAULT 'ambulance',
  license_number VARCHAR(100) UNIQUE NOT NULL,
  status driver_status DEFAULT 'available',
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hospital rooms/beds
CREATE TABLE hospital_beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_name VARCHAR(100) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  bed_number VARCHAR(20) NOT NULL,
  bed_type bed_type NOT NULL,
  floor_number INTEGER DEFAULT 1,
  status bed_status DEFAULT 'available',
  patient_id UUID REFERENCES patient_profiles(id),
  admitted_at TIMESTAMP,
  charge_per_day DECIMAL(10,2) DEFAULT 0,
  o2_cylinder_assigned BOOLEAN DEFAULT FALSE,
  specialty_equipment JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_number, bed_number)
);

-- OPD Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  priority queue_priority DEFAULT 'general',
  priority_score INTEGER DEFAULT 50,
  reason TEXT,
  diagnosis TEXT,
  prescription TEXT,
  notes TEXT,
  queue_position INTEGER,
  estimated_wait_minutes INTEGER,
  is_emergency BOOLEAN DEFAULT FALSE,
  billing_amount DECIMAL(10,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Queue management
CREATE TABLE patient_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  priority queue_priority NOT NULL DEFAULT 'general',
  priority_score INTEGER NOT NULL DEFAULT 50,
  position INTEGER,
  status VARCHAR(50) DEFAULT 'waiting',
  checked_in_at TIMESTAMP DEFAULT NOW(),
  called_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT
);

-- Blood bank
CREATE TABLE blood_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blood_group blood_group NOT NULL UNIQUE,
  units_available INTEGER DEFAULT 0,
  units_reserved INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Blood bank requests
CREATE TABLE blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id),
  requested_by UUID REFERENCES users(id),
  blood_group blood_group NOT NULL,
  units_needed INTEGER NOT NULL DEFAULT 1,
  urgency VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Emergency requests
CREATE TABLE emergency_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id),
  driver_id UUID REFERENCES driver_profiles(id),
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  hospital_lat DECIMAL(10,8),
  hospital_lng DECIMAL(11,8),
  status emergency_status DEFAULT 'requested',
  priority_override BOOLEAN DEFAULT TRUE,
  description TEXT,
  route_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Medical records
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctor_profiles(id),
  appointment_id UUID REFERENCES appointments(id),
  record_type VARCHAR(100) DEFAULT 'consultation',
  diagnosis TEXT,
  prescription TEXT,
  lab_results TEXT,
  notes TEXT,
  attachments JSONB,
  record_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  channel VARCHAR(50) DEFAULT 'email',
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Family access
CREATE TABLE family_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  family_member_name VARCHAR(255) NOT NULL,
  family_member_email VARCHAR(255),
  relation VARCHAR(100),
  access_token UUID DEFAULT uuid_generate_v4(),
  is_active BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Admin audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  target_table VARCHAR(100),
  target_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed blood bank initial data
INSERT INTO blood_bank (blood_group, units_available) VALUES
  ('A+', 25), ('A-', 10), ('B+', 30), ('B-', 8),
  ('AB+', 15), ('AB-', 5), ('O+', 40), ('O-', 12);

-- Indexes for performance
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_queue_doctor ON patient_queue(doctor_id);
CREATE INDEX idx_queue_priority ON patient_queue(priority_score DESC);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
