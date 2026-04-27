import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, LogIn } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      if (user.role === 'customer') navigate('/customer');
      else if (user.role === 'restaurant') navigate('/restaurant');
      else if (user.role === 'delivery') navigate('/delivery');
      else if (user.role === 'admin') navigate('/ops');
    } catch (err) {
      alert('Login failed. For demo, try creating an account or check backend.');
    }
  };

  const handleQuickLogin = (email, pass, target) => {
    setEmail(email);
    setPassword(pass);
    // Note: This relies on the backend having these users, otherwise it will fail.
    // I can add a registration function call here too for first time setup.
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0b]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl mb-6">
            <Shield className="text-emerald-500 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-white/40">Enter your credentials to access FoodFlow</p>
        </div>

        <div className="glass p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit" className="w-full gradient-button py-4 rounded-2xl flex items-center justify-center gap-2 group">
              Sign In
              <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-center mb-6">Quick Demo Logins</p>
            <div className="grid grid-cols-2 gap-3">
              <DemoBtn label="Customer" onClick={() => { setEmail('cust@foodflow.com'); setPassword('123456'); }} />
              <DemoBtn label="Restaurant" onClick={() => { setEmail('rest@foodflow.com'); setPassword('123456'); }} />
              <DemoBtn label="Rider" onClick={() => { setEmail('rider@foodflow.com'); setPassword('123456'); }} />
              <DemoBtn label="Admin" onClick={() => { setEmail('admin@foodflow.com'); setPassword('123456'); }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DemoBtn = ({ label, onClick }) => (
  <button onClick={onClick} className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium transition-colors">
    {label}
  </button>
);

export default LoginPage;
