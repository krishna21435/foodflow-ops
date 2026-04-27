import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CustomerDashboard from './pages/CustomerDashboard';
import RestaurantDashboard from './pages/RestaurantDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import OpsDashboard from './pages/OpsDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Customer Routes */}
            <Route path="/customer/*" element={
              <ProtectedRoute role="customer">
                <CustomerDashboard />
              </ProtectedRoute>
            } />

            {/* Restaurant Routes */}
            <Route path="/restaurant" element={
              <ProtectedRoute role="restaurant">
                <RestaurantDashboard />
              </ProtectedRoute>
            } />

            {/* Delivery Routes */}
            <Route path="/delivery" element={
              <ProtectedRoute role="delivery">
                <DeliveryDashboard />
              </ProtectedRoute>
            } />

            {/* Admin/Ops Routes */}
            <Route path="/ops" element={
              <ProtectedRoute role="admin">
                <OpsDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
