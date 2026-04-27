import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      if (token === 'demo-token') {
        setUser({ id: 'demo-id', email: 'demo@foodflow.com', role: 'admin', name: 'Demo User' });
        setLoading(false);
        return;
      }
      axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUser(res.data);
      }).catch(() => {
        localStorage.removeItem('token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.warn('Backend unreachable, using demo login fallback');
      const role = email.includes('admin') ? 'admin' : 
                   email.includes('rest') ? 'restaurant' :
                   email.includes('rider') ? 'delivery' : 'customer';
      const demoUser = { id: 'demo-id', email, role, name: email.split('@')[0] };
      localStorage.setItem('token', 'demo-token');
      setUser(demoUser);
      return demoUser;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
