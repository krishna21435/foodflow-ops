import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, MapPin, Star, Heart } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mesh-bg" />
      
      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-black tracking-tighter text-emerald-500 italic">FOODFLOW</h1>
        <div className="flex items-center gap-8">
          <button className="text-sm font-bold text-white/60 hover:text-white transition-colors">Restaurants</button>
          <button className="text-sm font-bold text-white/60 hover:text-white transition-colors">Track Order</button>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 glass-card text-sm font-bold hover:bg-white/10 transition-all"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
            <Zap size={14} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Fastest Delivery in Town</span>
          </div>
          <h2 className="text-6xl md:text-7xl font-black mb-8 leading-[0.9] tracking-tighter text-gradient">
            Dining <br />
            Redefined.
          </h2>
          <p className="text-lg text-white/40 mb-10 max-w-lg leading-relaxed">
            Experience the future of food delivery. Real-time tracking, lightning fast assignment, and gourmet flavors delivered to your doorstep in minutes.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="premium-gradient px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-emerald-500/20"
            >
              Order Now <ArrowRight size={20} />
            </button>
            <button className="px-10 py-5 glass-card font-bold text-lg flex items-center gap-3 hover:bg-white/10 transition-all">
              See Menu
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse-soft" />
          <div className="relative glass-card p-4 overflow-hidden border-white/20">
            <img 
              src="/hero.png" 
              alt="Gourmet Burger" 
              className="w-full h-auto rounded-xl shadow-2xl group-hover:scale-105 transition-transform duration-700"
            />
            {/* Floating Info */}
            <div className="absolute bottom-10 left-10 glass-card p-4 flex items-center gap-4 bg-black/40 backdrop-blur-2xl">
               <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Star fill="white" size={18} />
               </div>
               <div>
                  <p className="text-xs font-bold uppercase tracking-tighter text-white/40">Highly Rated</p>
                  <p className="font-bold">4.9/5 Average Rating</p>
               </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats/Trust Section */}
      <section className="relative z-10 px-8 pb-32 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <StatItem label="Active Users" value="50k+" />
        <StatItem label="Restaurants" value="2.5k+" />
        <StatItem label="Deliveries" value="1.2M+" />
        <StatItem label="Rating" value="4.8/5" />
      </section>

      {/* Featured Restaurant Card (Teaser) */}
      <section className="relative z-10 px-8 pb-32 max-w-7xl mx-auto">
         <h3 className="text-2xl font-black mb-10 tracking-tight">Top Rated This Week</h3>
         <div className="grid md:grid-cols-3 gap-8">
            <RestaurantCard 
              name="Gourmet Burger Bliss" 
              image="https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&q=80&w=600"
              price="₹799"
              cuisine="American • Burgers"
            />
            <RestaurantCard 
              name="Truffle & Tide" 
              image="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=600"
              price="₹1,249"
              cuisine="Italian • Seafood"
            />
            <RestaurantCard 
              name="Basanti Kitchen" 
              image="https://images.unsplash.com/photo-1517248135467-4c7ed9d42339?auto=format&fit=crop&q=80&w=600"
              price="₹549"
              cuisine="North Indian • Classics"
            />
         </div>
      </section>
    </div>
  );
};

const StatItem = ({ label, value }) => (
  <div className="glass-card p-8 text-center">
    <p className="text-4xl font-black mb-2 text-gradient">{value}</p>
    <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{label}</p>
  </div>
);

const RestaurantCard = ({ name, image, price, cuisine }) => (
  <div className="glass-card group overflow-hidden cursor-pointer">
    <div className="h-48 overflow-hidden relative">
      <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-4 right-4 glass-card p-2 px-3 flex items-center gap-1 bg-black/40">
        <Heart size={14} className="text-emerald-500" />
      </div>
    </div>
    <div className="p-6">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-lg leading-tight">{name}</h4>
        <span className="text-emerald-400 font-black">{price}</span>
      </div>
      <p className="text-xs text-white/40 font-medium mb-4">{cuisine}</p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-[10px] font-bold text-white/40 uppercase tracking-tighter">
          <MapPin size={12} className="text-emerald-500" /> 1.2 KM
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-white/40 uppercase tracking-tighter">
          <Zap size={12} className="text-yellow-500" /> 20 MIN
        </div>
      </div>
    </div>
  </div>
);

export default LandingPage;
