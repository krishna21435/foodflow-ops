import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCart, 
  Star, 
  Clock, 
  MapPin, 
  Search, 
  Heart, 
  Filter, 
  TrendingUp,
  Package,
  LogOut,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3005';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('browse'); // 'browse', 'restaurant', 'orders'
  const [showCart, setShowCart] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const [radius, setRadius] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect location on load
    handleGetLocation();
    fetchOrders();

    const socket = io(SOCKET_URL);
    socket.on('order_update', (data) => {
      fetchOrders();
    });

    return () => socket.disconnect();
  }, [user]);

  const handleGetLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          fetchRestaurants(loc, radius);
        },
        (err) => {
          console.error('Location denied', err);
          setLoading(false);
          fetchRestaurants(null);
        }
      );
    } else {
      setLoading(false);
      fetchRestaurants(null);
    }
  };

  const fetchRestaurants = async (loc = userLocation, r = radius) => {
    setLoading(true);
    try {
      if (!loc) throw new Error('Location missing');
      const res = await axios.get(`${API_URL}/api/restaurants/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=${r}`);
      
      if (res.data.length === 0) {
        try {
          await axios.post(`${API_URL}/api/restaurants/discover`, loc);
          const retryRes = await axios.get(`${API_URL}/api/restaurants/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=${r}`);
          setRestaurants(retryRes.data);
        } catch (e) {
          throw new Error('Discovery failed');
        }
      } else {
        setRestaurants(res.data);
      }
    } catch (err) {
      console.warn('Backend unreachable, using demo restaurants');
      setRestaurants([
        { id: 1, name: 'Gourmet Burger Bliss', cuisine: 'American • Burgers', rating: '4.8', distance: 1.2, address: 'Sector 4, HSR Layout', image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800', delivery_time_min: 25 },
        { id: 2, name: 'Sushi Samurai', cuisine: 'Japanese • Sushi', rating: '4.6', distance: 2.4, address: 'Indiranagar 100ft Rd', image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', delivery_time_min: 35 },
        { id: 3, name: 'Pasta Primavera', cuisine: 'Italian • Pasta', rating: '4.5', distance: 3.8, address: 'Koramangala 5th Block', image_url: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800', delivery_time_min: 30 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation) fetchRestaurants(userLocation, radius);
  }, [radius]);

  const handleSeedNearby = async () => {
    if (!userLocation) return alert('Please enable location access first.');
    try {
      await axios.post(`${API_URL}/api/restaurants/seed-nearby`, userLocation);
      fetchRestaurants();
    } catch (err) {
      console.error('Seeding failed', err);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/api/orders/customer/${user.id}`);
      setOrders(res.data);
    } catch (err) {
      console.warn('Backend unreachable, using demo orders');
      setOrders([
        { id: 1001, status: 'DELIVERED', total_amount: 549, created_at: new Date().toISOString() },
        { id: 1002, status: 'OUT_FOR_DELIVERY', total_amount: 890, created_at: new Date().toISOString() }
      ]);
    }
  };

  const selectRestaurant = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    try {
      const res = await axios.get(`${API_URL}/api/restaurants/${restaurant.id}/menu`);
      setMenu(res.data);
    } catch (err) {
      console.warn('Backend unreachable, using demo menu');
      setMenu([
        { id: 1, name: 'Signature Truffle Burger', description: 'Double wagyu beef with truffle aioli', price: 499 },
        { id: 2, name: 'Crispy Avocado Fries', description: 'Tempura battered with spicy mayo', price: 299 },
        { id: 3, name: 'Classic Belgian Waffles', description: 'With maple syrup and fresh berries', price: 349 }
      ]);
    }
    setView('restaurant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (item) => {
    setCart([...cart, { ...item, id: Date.now() }]);
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const placeOrder = async () => {
    const total_amount = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
    try {
      await axios.post(`${API_URL}/api/orders`, {
        customer_id: user.id,
        restaurant_id: selectedRestaurant.id,
        items: cart,
        total_amount,
        delivery_address: 'Home - B3, Silicon Heights'
      });
      setCart([]);
      setShowCart(false);
      setView('orders');
      fetchOrders();
    } catch (err) {
      alert('Failed to place order');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mesh-bg" />
      
      {/* Sidebar Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-surface/80 backdrop-blur-3xl border-r border-white/5 z-50 flex flex-col items-center md:items-start py-8 px-4">
        <div className="mb-12 md:px-4">
          <h1 className="text-xl font-black italic tracking-tighter text-emerald-500 hidden md:block uppercase">FOODFLOW</h1>
          <div className="w-10 h-10 rounded-xl gradient-button md:hidden flex items-center justify-center font-black">F</div>
        </div>

        <div className="flex-1 w-full space-y-2">
          <NavBtn icon={<TrendingUp size={20} />} label="Discover" active={view === 'browse'} onClick={() => setView('browse')} />
          <NavBtn icon={<Package size={20} />} label="My Orders" active={view === 'orders'} onClick={() => setView('orders')} />
          <NavBtn icon={<Heart size={20} />} label="Favorites" />
        </div>

        <div className="w-full pt-8 border-t border-white/5">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut size={20} />
            <span className="hidden md:block font-bold text-sm">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pl-20 md:pl-64 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-xl border-b border-white/5 px-8 py-6 flex justify-between items-center">
            <div>
               <h2 className="text-xl font-bold">Good Evening, {user?.name.split(' ')[0]} 👋</h2>
               <p className="text-xs text-white/40 font-medium">Ready for your favorite meal?</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative md:w-64 hidden md:block group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input type="text" placeholder="Search cravings..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm" />
               </div>
               <button 
                onClick={() => setShowCart(true)}
                className="relative p-3 glass-card hover:bg-white/10 transition-all"
               >
                  <ShoppingCart size={20} />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-[10px] flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30">
                      {cart.length}
                    </span>
                  )}
               </button>
               <div className="w-10 h-10 rounded-xl gradient-button flex items-center justify-center font-black">
                 {user?.name?.[0]}
               </div>
            </div>
        </header>

        <div className="p-8 pb-32">
          <AnimatePresence mode="wait">
            {view === 'browse' && (
              <motion.div 
                key="browse"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex justify-between items-end mb-8">
                  <div>
                     <h3 className="text-2xl font-black tracking-tight">Nearest Partners</h3>
                     <p className="text-sm text-white/40">{userLocation ? `Showing results within ${radius}KM` : 'Enabling location...'}</p>
                  </div>
                  <div className="flex gap-4">
                     <button 
                       onClick={() => setRadius(radius === 5 ? 10 : 5)}
                       className="px-4 py-2 glass-card text-xs font-bold uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 transition-all"
                     >
                       Scale Radius: {radius}KM
                     </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-white/20 uppercase tracking-widest">Discovering your neighborhood...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {restaurants.length === 0 ? (
                      <div className="col-span-full glass-card p-20 text-center flex flex-col items-center">
                        <MapPin size={48} className="text-white/10 mb-6" />
                        <h4 className="text-xl font-bold mb-2">No Partners Found</h4>
                        <p className="text-white/40 text-sm">Try increasing the radius or check your connection.</p>
                      </div>
                    ) : (
                      restaurants.map(rest => (
                        <RestaurantCard key={rest.id} rest={rest} onClick={() => selectRestaurant(rest)} />
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {view === 'restaurant' && selectedRestaurant && (
              <motion.div 
                key="restaurant"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-5xl"
              >
                 <button onClick={() => setView('browse')} className="mb-6 text-sm text-white/40 hover:text-white flex items-center gap-1 transition-colors group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to restaurants
                 </button>
                 
                 <div className="relative h-64 rounded-[32px] overflow-hidden mb-12 shadow-2xl">
                    <img src={selectedRestaurant.image_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-10 left-10">
                       <h2 className="text-4xl font-black mb-2">{selectedRestaurant.name}</h2>
                       <div className="flex items-center gap-4 text-sm font-medium text-white/60">
                          <div className="flex items-center gap-1"><MapPin size={16} className="text-emerald-500" /> {selectedRestaurant.address}</div>
                          <div className="flex items-center gap-1 font-bold text-emerald-400">OPEN</div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {menu.map(item => (
                       <MenuItem key={item.id} item={item} onAdd={() => addToCart(item)} />
                    ))}
                 </div>
              </motion.div>
            )}

            {view === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                  <h3 className="text-2xl font-black tracking-tight mb-8">Order History</h3>
                  <div className="grid gap-4">
                    {orders.length === 0 ? (
                       <div className="glass-card p-20 text-center text-white/20">No orders yet</div>
                    ) : (
                      orders.map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))
                    )}
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]" 
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-white/5 z-[70] p-8 flex flex-col"
            >
               <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black">Your Cart</h3>
                  <button onClick={() => setShowCart(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                     <X size={24} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto space-y-6">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                       <ShoppingCart size={48} />
                       <p>Your cart is empty</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center group">
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-emerald-400 font-bold text-sm">₹{item.price}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-xs text-white/20 hover:text-red-400 transition-colors">Remove</button>
                      </div>
                    ))
                  )}
               </div>

               {cart.length > 0 && (
                 <div className="pt-8 border-t border-white/5 space-y-6">
                   <div className="flex justify-between items-center text-lg font-black">
                      <span className="text-white/40">Total Amount</span>
                      <span className="text-emerald-400 text-2xl">₹{cart.reduce((s, i) => s + parseFloat(i.price), 0).toFixed(2)}</span>
                   </div>
                   <button 
                     onClick={placeOrder}
                     className="w-full premium-gradient py-5 rounded-2xl font-black text-center shadow-2xl shadow-emerald-500/20"
                   >
                     Checkout Now
                   </button>
                 </div>
               )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavBtn = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${active ? 'bg-emerald-500/10 text-emerald-500' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
  >
    <div className={`${active ? 'text-emerald-500' : 'group-hover:scale-110 transition-transform'}`}>{icon}</div>
    <span className="hidden md:block font-bold text-sm">{label}</span>
  </button>
);

const RestaurantCard = ({ rest, onClick }) => (
  <div onClick={onClick} className="glass-card group overflow-hidden cursor-pointer h-full flex flex-col relative">
    {/* Live Proximity Badge */}
    <div className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl border backdrop-blur-md text-[10px] font-black tracking-widest ${rest.distance <= 2 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/10 text-white/60 border-white/20'}`}>
       {rest.distance.toFixed(1)} KM AWAY
    </div>

    <div className="h-48 overflow-hidden relative">
      <img src={rest.image_url} alt={rest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute top-4 right-4 glass-card p-2 px-3 flex items-center gap-2 bg-black/40">
        <Star size={14} className="text-yellow-400 fill-yellow-400" />
        <span className="text-xs font-bold">{rest.rating || '4.2'}</span>
      </div>
    </div>
    <div className="p-6 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-1">
         <h4 className="text-lg font-black tracking-tight group-hover:text-emerald-400 transition-colors uppercase italic">{rest.name}</h4>
      </div>
      <p className="text-xs text-white/40 font-medium mb-6 uppercase tracking-wider">{rest.cuisine}</p>
      <div className="mt-auto flex items-center gap-6 border-t border-white/5 pt-5">
        <div className="flex items-center gap-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest">
          <Clock size={12} className="text-emerald-500" /> {rest.delivery_time_min || '30'} MIN
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest">
           <MapPin size={12} className="text-emerald-500" /> {rest.address.split(',')[0]}
        </div>
      </div>
    </div>
  </div>
);

const MenuItem = ({ item, onAdd }) => (
  <div className="glass-card p-5 flex justify-between items-center group">
    <div>
      <h4 className="font-bold mb-1">{item.name}</h4>
      <p className="text-xs text-white/40 mb-3">{item.description}</p>
      <span className="text-emerald-400 font-black">₹{item.price}</span>
    </div>
    <button 
      onClick={onAdd}
      className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all transform active:scale-95 shadow-lg group-hover:border-emerald-500/50"
    >
      <ShoppingCart size={18} />
    </button>
  </div>
);

const OrderCard = ({ order }) => (
  <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
    <div className="flex gap-6 items-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
        <Package size={24} />
      </div>
      <div>
        <h4 className="font-black text-lg mb-1 uppercase tracking-tight">Order #ORD-{order.id}</h4>
        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{new Date(order.created_at).toLocaleString()}</p>
      </div>
    </div>
    <div className="flex items-center gap-6 w-full md:w-auto">
       <div className="text-right hidden md:block">
          <p className="text-[10px] uppercase font-bold text-white/20 tracking-widest">Amount Paid</p>
          <p className="font-black text-emerald-400">₹{order.total_amount}</p>
       </div>
       <StatusBadge status={order.status} />
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
    const colors = {
        'ORDER_PLACED': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5',
        'PREPARING': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-yellow-500/5',
        'READY': 'bg-teal-500/10 text-teal-400 border-teal-500/20 shadow-teal-500/5',
        'OUT_FOR_DELIVERY': 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/5',
        'DELIVERED': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/5',
        'OPEN': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5',
    };
    const c = colors[status] || 'bg-white/5 text-white/40 border-white/10';
    return (
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border tracking-widest shadow-lg ${c} flex items-center gap-2`}>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'DELIVERED' ? 'bg-purple-400' : 'bg-current pulse'}`} />
        {status.replace(/_/g, ' ')}
      </span>
    );
};

export default CustomerDashboard;
