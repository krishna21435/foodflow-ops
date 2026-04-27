import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { 
  ChefHat, 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  Package, 
  Settings, 
  Bell,
  LogOut,
  TrendingUp,
  Activity,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3005';

const RestaurantDashboard = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const restaurantId = user?.id;

  useEffect(() => {
    fetchOrders();
    
    const socket = io(SOCKET_URL);
    socket.on('order_update', (data) => {
      console.log('Restaurant received update:', data);
      fetchOrders();
    });

    return () => socket.disconnect();
  }, [restaurantId]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/restaurants/${restaurantId}/orders`);
      setOrders(res.data);
    } catch (err) { 
      console.warn('Backend unreachable, using demo kitchen orders');
      setOrders([
        { id: 1, order_id: 101, status: 'PENDING_ACCEPTANCE', created_at: new Date().toISOString(), items: JSON.stringify([{name: 'Truffle Burger'}, {name: 'Avocado Fries'}]) },
        { id: 2, order_id: 102, status: 'ACCEPTED', created_at: new Date().toISOString(), items: JSON.stringify([{name: 'Samurai Sushi Set'}]) }
      ]);
    }
  };

  const acceptOrder = async (orderId) => {
    await axios.post(`${API_URL}/api/restaurants/orders/${orderId}/accept`);
    fetchOrders();
  };

  const markReady = async (orderId) => {
    await axios.post(`${API_URL}/api/restaurants/orders/${orderId}/ready`);
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mesh-bg" />
      
      {/* Side Nav */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-surface/80 backdrop-blur-3xl border-r border-white/5 z-50 flex flex-col py-8 px-4">
        <div className="mb-12 flex items-center gap-3 px-4">
           <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ChefHat size={24} className="text-white" />
           </div>
           <h1 className="text-xl font-black tracking-tight hidden md:block">KITCHEN<span className="text-emerald-500">PRO</span></h1>
        </div>

        <div className="flex-1 space-y-2">
           <SidebarLink icon={<ClipboardList size={20} />} label="Active Orders" active />
           <SidebarLink icon={<TrendingUp size={20} />} label="Analytics" />
           <SidebarLink icon={<Settings size={20} />} label="Kitchen Settings" />
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all mt-auto"
        >
          <LogOut size={20} />
          <span className="hidden md:block font-bold text-sm">Sign Out</span>
        </button>
      </nav>

      {/* Header */}
      <header className="fixed top-0 right-0 left-20 md:left-64 h-24 bg-background/60 backdrop-blur-xl border-b border-white/5 z-40 px-8 flex justify-between items-center">
         <div>
            <h2 className="text-xl font-black tracking-tight">Main Kitchen</h2>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Connected • Live Terminal</p>
         </div>
         <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-8 mr-8 border-r border-white/5 pr-8">
               <Stat label="Live" value={orders.length} color="text-emerald-500" />
               <Stat label="Ready" value={orders.filter(o => o.status === 'READY').length} color="text-teal-400" />
            </div>
            <button className="p-3 glass-card hover:bg-white/10 relative">
               <Bell size={20} />
               <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
            <div className="w-10 h-10 rounded-xl gradient-button flex items-center justify-center font-black">
               {user?.name?.[0]}
            </div>
         </div>
      </header>

      {/* Main Content */}
      <main className="pl-20 md:pl-64 pt-32 pb-32 px-8">
         <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-3xl font-black tracking-tighter">Kitchen Portal</h3>
                  <p className="text-white/40 text-sm mt-1">Manage incoming tickets and status updates</p>
               </div>
               <div className="flex gap-4">
                  <button className="px-4 py-2 glass-card text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                     <Filter size={14} /> Filter
                  </button>
                  <button className="px-4 py-2 glass-card text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                     <Activity size={14} /> Stats
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
               <AnimatePresence mode="popLayout">
                  {orders.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card p-32 text-center flex flex-col items-center opacity-30"
                    >
                       <Package size={48} className="mb-4" />
                       <p className="font-bold">No active tickets</p>
                    </motion.div>
                  ) : (
                    orders.map(order => (
                      <KitchenTicket 
                        key={order.id} 
                        order={order} 
                        onAccept={() => acceptOrder(order.order_id)} 
                        onReady={() => markReady(order.order_id)} 
                      />
                    ))
                  )}
               </AnimatePresence>
            </div>
         </div>
      </main>
    </div>
  );
};

const SidebarLink = ({ icon, label, active }) => (
   <button className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${active ? 'bg-emerald-500/10 text-emerald-500 shadow-inner' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="hidden md:block font-bold text-sm">{label}</span>
   </button>
);

const Stat = ({ label, value, color }) => (
   <div className="text-right">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
   </div>
);

const KitchenTicket = ({ order, onAccept, onReady }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="glass-card overflow-hidden"
  >
     <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-white/50 border border-white/5">
              #{order.order_id}
           </div>
           <div>
              <p className="text-xs font-black text-white/20 uppercase tracking-widest">Received</p>
              <p className="font-bold text-sm tracking-tighter">{new Date(order.created_at).toLocaleTimeString()}</p>
           </div>
        </div>
        <StatusBadge status={order.status} />
     </div>
     <div className="p-8 grid md:grid-cols-2 gap-12">
        <div>
           <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-6 flex items-center gap-2">
              <ClipboardList size={12} /> Items to Prepare
           </p>
           <div className="space-y-3">
              {JSON.parse(order.items || '[]').map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                   <span className="font-bold">{item.name}</span>
                   <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-black">x1</span>
                </div>
              ))}
           </div>
        </div>

        <div className="flex flex-col justify-between items-end">
           <div className="text-right mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Kitchen Status</p>
              <p className="font-bold text-white/60">
                {order.status === 'PENDING_ACCEPTANCE' ? 'New Incoming Ticket' : 
                 order.status === 'ACCEPTED' ? 'Currently Under Preparation' : 
                 'Awaiting Pickup'}
              </p>
           </div>

           <div className="flex gap-4 w-full">
              {order.status === 'PENDING_ACCEPTANCE' && (
                <button 
                  onClick={onAccept}
                  className="flex-1 premium-gradient py-5 rounded-2xl font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform"
                >
                  Start Preparation
                </button>
              )}
              {order.status === 'ACCEPTED' && (
                <button 
                  onClick={onReady}
                  className="flex-1 bg-teal-500/20 border border-teal-500/30 text-teal-400 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-teal-500 hover:text-white transition-all shadow-xl shadow-teal-500/10"
                >
                  <CheckCircle size={20} /> Ready for Pickup
                </button>
              )}
              {order.status === 'READY' && (
                <div className="flex-1 glass-card bg-emerald-500/5 py-5 rounded-2xl flex items-center justify-center gap-3 opacity-60 italic font-bold">
                   <Clock size={20} /> Waiting for Partner Assignment
                </div>
              )}
           </div>
        </div>
     </div>
  </motion.div>
);

const StatusBadge = ({ status }) => {
    const colors = {
        'PENDING_ACCEPTANCE': 'bg-red-500/10 text-red-400 border-red-500/20',
        'ACCEPTED': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        'READY': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };
    const c = colors[status] || 'bg-white/5 text-white/40 border-white/10';
    return (
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border tracking-widest ${c} flex items-center gap-2`}>
        <div className={`w-1.5 h-1.5 rounded-full bg-current pulse`} />
        {status.replace(/_/g, ' ')}
      </span>
    );
};

export default RestaurantDashboard;
