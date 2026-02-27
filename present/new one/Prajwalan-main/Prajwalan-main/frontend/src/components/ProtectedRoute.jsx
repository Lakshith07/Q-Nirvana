import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-dark" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role && user.role !== role) {
        const fallback = { patient: '/patient', doctor: '/doctor', admin: '/admin', driver: '/driver' };
        return <Navigate to={fallback[user.role] || '/'} replace />;
    }

    return children;
}
