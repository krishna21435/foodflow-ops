import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { 
  BarChart3, 
  Clock, 
  Package, 
  CheckCircle2, 
  Activity, 
  ChevronRight,
  TrendingUp,
  MapPin,
  Shield,
  Bell,
  LogOut,
  Zap,
  LayoutDashboard,
  Search,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3005';

const OpsDashboard = () => {
  const { user, logout } = useAuth();
  const [liveOrders, setLiveOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [riderLocations, setRiderLocations] = useState({}); // orderId -> { lat, lng, progress }

  useEffect(() => {
    fetchStats();
    fetchLiveOrders();

    const socket = io(SOCKET_URL);
    socket.on('order_update', (data) => {
      console.log('Ops update received:', data);
      fetchLiveOrders();
      fetchStats();
      if (selectedOrder && (selectedOrder.order_id === data.orderId || selectedOrder.id === data.orderId)) {
        fetchTimeline(data.orderId);
      }
    });

    socket.on('rider_location', (data) => {
      setRiderLocations(prev => ({
        ...prev,
        [data.order_id]: data
      }));
    });

    return () => socket.disconnect();
  }, [selectedOrder]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/ops/stats`);
      setStats(res.data);
    } catch (err) { 
      console.warn('Backend unreachable, using demo stats');
      setStats({ totalOrders: 1248, activeOrders: 42, avgDeliveryTime: '24 min' });
    }
  };

  const fetchLiveOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/ops/live-orders`);
      setLiveOrders(res.data);
    } catch (err) { 
      console.warn('Backend unreachable, using demo live orders');
      setLiveOrders([
        { order_id: 101, last_status: 'PREPARING', updated_at: new Date().toISOString() },
        { order_id: 102, last_status: 'OUT_FOR_DELIVERY', updated_at: new Date().toISOString() }
      ]);
    }
  };

  const fetchTimeline = async (orderId) => {
    try {
      const res = await axios.get(`${API_URL}/api/ops/timeline/${orderId}`);
      setTimeline(res.data);
    } catch (err) { 
      console.warn('Backend unreachable, using demo timeline');
      setTimeline([
        { id: 1, event_type: 'order.placed', created_at: new Date().toISOString() },
        { id: 2, event_type: 'restaurant.accepted', created_at: new Date().toISOString() },
        { id: 3, event_type: 'restaurant.ready', created_at: new Date().toISOString() }
      ]);
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    fetchTimeline(order.order_id || order.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mesh-bg" />
      
      {/* Ops Nav */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-surface/80 backdrop-blur-3xl border-r border-white/5 z-50 flex flex-col py-8 px-4">
        <div className="mb-12 flex items-center gap-3 px-4">
           <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield size={24} className="text-white" />
           </div>
           <h1 className="text-xl font-black tracking-tight hidden md:block uppercase italic">Ops<span className="text-blue-500">Center</span></h1>
        </div>

        <div className="flex-1 space-y-2">
           <SidebarLink icon={<LayoutDashboard size={20} />} label="Overview" active />
           <SidebarLink icon={<BarChart3 size={20} />} label="Analytics" />
           <SidebarLink icon={<Activity size={20} />} label="Live Monitor" />
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all mt-auto"
        >
          <LogOut size={20} />
          <span className="hidden md:block font-bold text-sm">Sign Out</span>
        </button>
      </nav>

      <header className="fixed top-0 right-0 left-20 md:left-64 h-24 bg-background/60 backdrop-blur-xl border-b border-white/5 z-40 px-8 flex justify-between items-center">
         <div>
            <h2 className="text-xl font-black tracking-tight text-gradient">Platform Command</h2>
            <p className="text-xs text-blue-500 font-black uppercase tracking-widest flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live Monitoring Active
            </p>
         </div>
         <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-4 border-r border-white/5 pr-8">
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">System Load</p>
                  <p className="font-bold text-sm">Optimal (12ms)</p>
               </div>
            </div>
            <button className="p-3 glass-card hover:bg-white/10">
               <Bell size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black shadow-lg">
               {user?.name?.[0]}
            </div>
         </div>
      </header>

      <main className="pl-20 md:pl-64 pt-32 pb-32 px-8">
         <div className="max-w-[1600px] mx-auto">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard title="Total Volume" value={stats.totalOrders} icon={<Package className="text-blue-400" />} trend="+12.5%" />
              <StatCard title="Active Flux" value={stats.activeOrders} icon={<Zap className="text-emerald-400" />} trend="-4.2%" />
              <StatCard title="Success Rate" value="99.9%" icon={<CheckCircle2 className="text-purple-400" />} trend="+0.1%" />
              <StatCard title="Avg Latency" value={stats.avgDeliveryTime} icon={<Clock className="text-yellow-400" />} trend="Stable" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               {/* Live Order Stream */}
               <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-end mb-6 px-2">
                     <div>
                        <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                           <Activity size={24} className="text-emerald-500" /> Live Stream
                        </h3>
                        <p className="text-white/40 font-medium text-sm">Real-time order lifecycle events</p>
                     </div>
                     <div className="relative w-64 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input type="text" placeholder="Filter stream..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:ring-1 focus:ring-blue-500/50 outline-none" />
                     </div>
                  </div>

                  <div className="glass-card overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                           <tr>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Order Reference</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Lifecycle Status</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Timestamp</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           <AnimatePresence mode="popLayout">
                              {liveOrders.map((order) => (
                                 <motion.tr 
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    key={order.order_id} 
                                    onClick={() => handleOrderClick(order)}
                                    className={`hover:bg-white/[0.04] cursor-pointer transition-colors ${selectedOrder?.order_id === order.order_id ? 'bg-blue-600/10' : ''}`}
                                 >
                                    <td className="px-8 py-6">
                                       <div className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                          <span className="font-mono font-black text-sm tracking-tighter">#ORD-{order.order_id}</span>
                                       </div>
                                    </td>
                                    <td className="px-8 py-6">
                                       <StatusBadge status={order.last_status} />
                                    </td>
                                    <td className="px-8 py-6 text-right text-xs font-bold text-white/20 tracking-widest">
                                       {new Date(order.updated_at).toLocaleTimeString()}
                                    </td>
                                 </motion.tr>
                              ))}
                           </AnimatePresence>
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Timeline Console */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6 px-2">
                     <Clock size={24} className="text-white/40" />
                     <h3 className="text-2xl font-black tracking-tight">Event Console</h3>
                  </div>

                  <div className="glass-card p-8 min-h-[500px] border-white/10 relative">
                     {!selectedOrder ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 text-center p-12">
                           <LayoutDashboard size={80} className="mb-6" />
                           <p className="font-black text-lg">SELECT A STREAM TO INITIALIZE INSPECTION</p>
                        </div>
                     ) : (
                        <div className="space-y-12">
                           {/* Rider Progress Simulation */}
                           {riderLocations[selectedOrder.order_id || selectedOrder.id] && (
                             <div className="mb-8 p-6 glass-card border-blue-500/20 bg-blue-500/5">
                                <div className="flex justify-between items-center mb-4">
                                   <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                                      <Navigation size={14} className="animate-pulse" /> Live Tracking Active
                                   </p>
                                   <p className="text-xs font-bold text-white/60">{Math.round(riderLocations[selectedOrder.order_id || selectedOrder.id].progress)}% Complete</p>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                   <motion.div 
                                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${riderLocations[selectedOrder.order_id || selectedOrder.id].progress}%` }}
                                   />
                                </div>
                                <div className="mt-4 flex justify-between text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                                   <span>Kitchen</span>
                                   <span>Destination</span>
                                </div>
                             </div>
                           )}

                           <div className="space-y-12 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                            <AnimatePresence initial={false}>
                               {timeline.map((event, idx) => (
                                  <motion.div 
                                     initial={{ opacity: 0, x: 20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     key={event.id} 
                                     className="relative pl-10"
                                  >
                                     <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-background z-10 ${idx === timeline.length - 1 ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'bg-white/20'}`} />
                                     <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${idx === timeline.length - 1 ? 'text-blue-400' : 'text-white/60'}`}>
                                        {event.event_type.replace(/_/g, ' ').replace(/\./g, ' ')}
                                     </h4>
                                     <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                                        {new Date(event.created_at).toLocaleString()}
                                     </p>
                                  </motion.div>
                               ))}
                            </AnimatePresence>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
};

const SidebarLink = ({ icon, label, active }) => (
   <button className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${active ? 'bg-blue-500/10 text-blue-500 shadow-inner' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="hidden md:block font-bold text-sm">{label}</span>
   </button>
);

const StatCard = ({ title, value, icon, trend }) => (
  <div className="glass-card p-8 group overflow-hidden relative">
    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-150 transition-transform duration-700">
       {icon}
    </div>
    <div className="flex justify-between items-start mb-6">
       <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-blue-600/10 transition-colors">{icon}</div>
       <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          {trend}
       </span>
    </div>
    <div className="text-4xl font-black mb-1 text-gradient group-hover:translate-x-1 transition-transform">{value || '0'}</div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{title}</p>
  </div>
);

const StatusBadge = ({ status }) => {
    const colors = {
        'DELIVERED': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'ORDER_PLACED': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'OUT_FOR_DELIVERY': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        'PREPARING': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };
    const c = colors[status] || 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return (
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border tracking-widest ${c} flex items-center gap-2 shadow-lg`}>
        <div className={`w-1.5 h-1.5 rounded-full bg-current pulse`} />
        {status.replace(/_/g, ' ')}
      </span>
    );
};

export default OpsDashboard;
