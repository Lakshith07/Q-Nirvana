import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('qnirvana_user');
        const token = localStorage.getItem('qnirvana_token');
        if (stored && token) {
            setUser(JSON.parse(stored));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, user: u } = res.data;
        localStorage.setItem('qnirvana_token', token);
        localStorage.setItem('qnirvana_user', JSON.stringify(u));
        setUser(u);
        return u;
    };

    const register = async (formData) => {
        const res = await api.post('/auth/register', formData);
        const { token, user: u } = res.data;
        localStorage.setItem('qnirvana_token', token);
        localStorage.setItem('qnirvana_user', JSON.stringify(u));
        setUser(u);
        return u;
    };

    const logout = () => {
        localStorage.removeItem('qnirvana_token');
        localStorage.removeItem('qnirvana_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
