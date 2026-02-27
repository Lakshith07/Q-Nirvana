import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import BookOPD from './pages/patient/BookOPD';
import QueueStatus from './pages/patient/QueueStatus';
import BloodBank from './pages/patient/BloodBank';
import Beds from './pages/patient/Beds';
import MedicalHistory from './pages/patient/MedicalHistory';
import Emergency from './pages/patient/Emergency';
import FamilyAccess from './pages/patient/FamilyAccess';
import HospitalBlueprint from './pages/patient/HospitalBlueprint';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorQueue from './pages/doctor/DoctorQueue';
import Consultation from './pages/doctor/Consultation';
import MyPatients from './pages/doctor/MyPatients';
import WorkSchedule from './pages/doctor/WorkSchedule';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBeds from './pages/admin/Beds';
import AdminBloodBank from './pages/admin/BloodBank';
import UserManagement from './pages/admin/UserManagement';
import AdminDoctors from './pages/admin/Doctors';
import AdminEmergencies from './pages/admin/Emergencies';
import AuditLogs from './pages/admin/AuditLogs';
import QueueOverview from './pages/admin/QueueOverview';
import AdminReports from './pages/admin/Reports';

// Driver Pages
import DriverDashboard from './pages/driver/DriverDashboard';
import EmergencyAlerts from './pages/driver/EmergencyAlerts';
import NavigationMap from './pages/driver/NavigationMap';
import DriverHistory from './pages/driver/DriverHistory';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Patient Routes */}
          <Route path="/patient" element={
            <ProtectedRoute role="patient">
              <DashboardLayout title="Patient Portal" subtitle="Your health at your fingertips" />
            </ProtectedRoute>
          }>
            <Route index element={<PatientDashboard />} />
            <Route path="book-opd" element={<BookOPD />} />
            <Route path="queue" element={<QueueStatus />} />
            <Route path="beds" element={<Beds />} />
            <Route path="blood-bank" element={<BloodBank />} />
            <Route path="history" element={<MedicalHistory />} />
            <Route path="family" element={<FamilyAccess />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="blueprint" element={<HospitalBlueprint />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Doctor Routes */}
          <Route path="/doctor" element={
            <ProtectedRoute role="doctor">
              <DashboardLayout title="Doctor Dashboard" />
            </ProtectedRoute>
          }>
            <Route index element={<DoctorDashboard />} />
            <Route path="queue" element={<DoctorQueue />} />
            <Route path="consultation" element={<Consultation />} />
            <Route path="patients" element={<MyPatients />} />
            <Route path="schedule" element={<WorkSchedule />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <DashboardLayout title="Admin Panel" />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="beds" element={<AdminBeds />} />
            <Route path="blood-bank" element={<AdminBloodBank />} />
            <Route path="queue" element={<QueueOverview />} />
            <Route path="emergencies" element={<AdminEmergencies />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Driver Routes */}
          <Route path="/driver" element={
            <ProtectedRoute role="driver">
              <DashboardLayout title="Ambulance Dispatch" />
            </ProtectedRoute>
          }>
            <Route index element={<DriverDashboard />} />
            <Route path="emergencies" element={<EmergencyAlerts />} />
            <Route path="route" element={<NavigationMap />} />
            <Route path="history" element={<DriverHistory />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
