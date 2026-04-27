import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  PackageCheck, 
  CheckCircle2, 
  Bell, 
  Settings, 
  LogOut,
  Map as MapIcon,
  Route,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3005';

const DeliveryDashboard = () => {
  const { user, logout } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [progress, setProgress] = useState({}); // orderId -> progress percentage
  const riderId = user?.id;

  useEffect(() => {
    fetchDeliveries();
    
    const socket = io(SOCKET_URL);
    socket.on('order_update', (data) => {
      console.log('Rider received update:', data);
      fetchDeliveries();
    });

    socket.on('rider_location', (data) => {
      setProgress(prev => ({
        ...prev,
        [data.order_id]: data.progress
      }));
    });

    return () => socket.disconnect();
  }, [riderId]);

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/delivery/rider/${riderId}`);
      setDeliveries(res.data);
    } catch (err) { 
      console.warn('Backend unreachable, using demo deliveries');
      setDeliveries([
        { id: 1, order_id: 101, status: 'PARTNER_ASSIGNED', rider_id: riderId },
        { id: 2, order_id: 102, status: 'OUT_FOR_DELIVERY', rider_id: riderId }
      ]);
    }
  };

  const updateStatus = async (orderId, status) => {
    await axios.post(`${API_URL}/api/delivery/${orderId}/status`, { status });
    fetchDeliveries();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mesh-bg" />
      
      {/* Rider Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-surface/80 backdrop-blur-3xl border-r border-white/5 z-50 flex flex-col py-8 px-4">
        <div className="mb-12 flex items-center gap-3 px-4">
           <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Truck size={24} className="text-white" />
           </div>
           <h1 className="text-xl font-black tracking-tight hidden md:block uppercase italic">Rider<span className="text-emerald-500">Flow</span></h1>
        </div>

        <div className="flex-1 space-y-2">
           <SidebarLink icon={<Route size={20} />} label="Active Deliveries" active />
           <SidebarLink icon={<MapIcon size={20} />} label="Map View" />
           <SidebarLink icon={<Activity size={20} />} label="Earnings" />
           <SidebarLink icon={<Settings size={20} />} label="Profile" />
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all mt-auto"
        >
          <LogOut size={20} />
          <span className="hidden md:block font-bold text-sm">Go Offline</span>
        </button>
      </nav>

      {/* Header */}
      <header className="fixed top-0 right-0 left-20 md:left-64 h-24 bg-background/60 backdrop-blur-xl border-b border-white/5 z-40 px-8 flex justify-between items-center">
         <div>
            <h2 className="text-xl font-black tracking-tight">Welcome, {user?.name.split(' ')[0]}</h2>
            <p className="text-xs text-emerald-500 font-black uppercase tracking-widest flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online • Ready for Duty
            </p>
         </div>
         <div className="flex items-center gap-4">
            <button className="p-3 glass-card hover:bg-white/10">
               <Bell size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl gradient-button flex items-center justify-center font-black shadow-lg">
               {user?.name?.[0]}
            </div>
         </div>
      </header>

      {/* Main Content */}
      <main className="pl-20 md:pl-64 pt-32 pb-32 px-8">
         <div className="max-w-4xl mx-auto">
            <div className="mb-10">
               <h3 className="text-3xl font-black tracking-tighter mb-2 text-gradient">Route Overview</h3>
               <p className="text-white/40 text-sm">You have {deliveries.filter(d => d.status !== 'DELIVERED').length} active tasks today</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
               <AnimatePresence mode="popLayout">
                  {deliveries.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card p-32 text-center flex flex-col items-center opacity-20 border-dashed border-2"
                    >
                       <Navigation size={48} className="mb-4 animate-bounce" />
                       <p className="font-bold uppercase tracking-widest text-xs">Waiting for assignments...</p>
                    </motion.div>
                  ) : (
                    deliveries.map(del => (
                      <DeliveryTask 
                        key={del.id} 
                        delivery={del} 
                        progress={progress[del.order_id]}
                        onStatusUpdate={(status) => updateStatus(del.order_id, status)} 
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

const DeliveryTask = ({ delivery, onStatusUpdate, progress }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    className="glass-card overflow-hidden group"
  >
     <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-4">
           <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <PackageCheck size={20} />
           </div>
           <div>
              <p className="font-black tracking-tight text-lg uppercase italic">Trip #DEL-{delivery.order_id}</p>
           </div>
        </div>
        <StatusBadge status={delivery.status} />
     </div>

     <div className="p-8">
        <div className="space-y-10 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
           <div className="relative pl-12">
              <div className="absolute left-0 top-0 w-[40px] h-[40px] rounded-full bg-surface border border-white/10 flex items-center justify-center z-10">
                 <div className="w-2 h-2 rounded-full bg-white/40" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Pick up point</p>
              <p className="font-bold">Gourmet Burger Bliss Main Kitchen</p>
              <p className="text-xs text-white/40 italic">Wait until order is marked READY</p>
           </div>

           <div className="relative pl-12">
              <div className="absolute left-0 top-0 w-[40px] h-[40px] rounded-full bg-surface border border-emerald-500/30 flex items-center justify-center z-10 shadow-lg shadow-emerald-500/10">
                 <MapPin className="text-emerald-500" size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Destination</p>
              <p className="font-bold">Building 4A, Silicon Heights, Central Park</p>
              <p className="text-xs text-white/40 italic mt-1">Contact: +91 98765 43210</p>
           </div>
        </div>

        {/* Live Progress Bar */}
        {delivery.status === 'OUT_FOR_DELIVERY' && progress && (
           <div className="mt-10">
              <div className="flex justify-between items-center mb-2">
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Transit Progress</p>
                 <p className="text-[10px] font-black text-white/40">{Math.round(progress)}%</p>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                 <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                 />
              </div>
           </div>
        )}

        <div className="mt-12 flex gap-4">
           {delivery.status === 'PARTNER_ASSIGNED' && (
              <button 
                onClick={() => onStatusUpdate('PICKED_UP')}
                className="w-full premium-gradient py-5 rounded-2xl font-black shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all text-center"
              >
                Confirm Pickup
              </button>
           )}
           {delivery.status === 'PICKED_UP' && (
              <button 
                onClick={() => onStatusUpdate('OUT_FOR_DELIVERY')}
                className="w-full bg-blue-600 py-5 rounded-2xl font-black shadow-2xl shadow-blue-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-3"
              >
                <Navigation size={20} /> Starting Transit
              </button>
           )}
           {delivery.status === 'OUT_FOR_DELIVERY' && (
              <button 
                onClick={() => onStatusUpdate('DELIVERED')}
                className="w-full bg-purple-600 py-5 rounded-2xl font-black shadow-2xl shadow-purple-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-3"
              >
                <CheckCircle2 size={20} /> Mark as Delivered
              </button>
           )}
           {delivery.status === 'DELIVERED' && (
              <div className="w-full py-5 text-center text-emerald-500 font-black italic flex items-center justify-center gap-3 glass-card bg-emerald-500/5 select-none">
                 <CheckCircle2 size={20} /> Delivery Successful
              </div>
           )}
        </div>
     </div>
  </motion.div>
);

const StatusBadge = ({ status }) => {
    const colors = {
        'PARTNER_ASSIGNED': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'PICKED_UP': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'OUT_FOR_DELIVERY': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        'DELIVERED': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    const c = colors[status] || 'bg-white/5 text-white/40 border-white/10';
    return (
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border tracking-widest ${c} flex items-center gap-2 shadow-lg`}>
        <div className={`w-1.5 h-1.5 rounded-full bg-current pulse`} />
        {status.replace(/_/g, ' ')}
      </span>
    );
};

export default DeliveryDashboard;
