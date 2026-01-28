import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { Briefcase, ArrowRight, Loader2, Sparkles, AlertCircle, Heart } from 'lucide-react';

interface AuthPageProps {
  onSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let user: User;
      if (isLogin) {
        user = await authService.login(email, password);
      } else {
        if (!name.trim()) throw new Error("Name is required");
        user = await authService.signup(name, email, password);
      }
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row relative">
      
      {/* 1. Brand Section (Top on mobile, Left on desktop) */}
      <div className="w-full md:w-1/2 bg-[#F5F5F7] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden h-[30vh] md:h-auto">
         {/* Animated Background Blob */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full blur-[80px] opacity-60 animate-float pointer-events-none"></div>

         <div className="relative z-10 flex items-center gap-2">
            <div className="p-2 bg-black text-white rounded-xl">
               <Briefcase size={24} />
            </div>
            <span className="font-serif font-bold text-2xl tracking-tight text-gray-900">Suitcase</span>
         </div>

         <div className="relative z-10 hidden md:block">
            <h1 className="text-5xl lg:text-7xl font-serif font-bold text-gray-900 mb-6 leading-[1.1]">
              Pack your <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">imagination.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-md leading-relaxed">
              Your intelligent travel companion for literary journeys. Discover, read, and collect books with smart insights.
            </p>
         </div>

         {/* Mobile-only condensed headline */}
         <div className="relative z-10 md:hidden mt-4">
            <h1 className="text-3xl font-serif font-bold text-gray-900">
               Your literary journey starts here.
            </h1>
         </div>

         <div className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
            <Sparkles size={16} className="text-yellow-500" />
            <span>Next Gen Library</span>
         </div>
      </div>

      {/* 2. Form Section (Bottom on mobile, Right on desktop) */}
      <div className="w-full md:w-1/2 p-8 md:p-20 flex flex-col justify-center bg-white -mt-6 md:mt-0 rounded-t-[2rem] md:rounded-none shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] md:shadow-none z-20">
         <div className="max-w-md w-full mx-auto">
            <div className="mb-8">
               <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                 {isLogin ? "Welcome back" : "Create account"}
               </h2>
               <p className="text-gray-500">
                 {isLogin ? "Enter your details to access your library." : "Start building your digital suitcase today."}
               </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
               {!isLogin && (
                 <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
                   <label className="text-xs font-bold uppercase text-gray-400 tracking-wider ml-1">Full Name</label>
                   <input 
                     type="text" 
                     value={name}
                     onChange={e => setName(e.target.value)}
                     className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-5 py-4 text-gray-900 font-medium outline-none transition-all"
                     placeholder="Ernest Hemingway"
                   />
                 </div>
               )}

               <div className="space-y-1">
                 <label className="text-xs font-bold uppercase text-gray-400 tracking-wider ml-1">Email Address</label>
                 <input 
                   type="email" 
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-5 py-4 text-gray-900 font-medium outline-none transition-all"
                   placeholder="reader@example.com"
                   autoComplete="email"
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-bold uppercase text-gray-400 tracking-wider ml-1">Password</label>
                 <input 
                   type="password" 
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-5 py-4 text-gray-900 font-medium outline-none transition-all"
                   placeholder="••••••••"
                   autoComplete="current-password"
                 />
               </div>

               <button 
                 type="submit" 
                 disabled={loading}
                 className="w-full bg-black text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 shadow-xl shadow-gray-200"
               >
                 {loading ? <Loader2 className="animate-spin" /> : (
                   <>
                     {isLogin ? "Sign In" : "Create Account"} <ArrowRight size={20} />
                   </>
                 )}
               </button>
            </form>

            <div className="mt-8 text-center">
               <button 
                 onClick={() => { setIsLogin(!isLogin); setError(null); }}
                 className="text-sm font-semibold text-gray-500 hover:text-black transition-colors"
               >
                 {isLogin ? "New to Suitcase? Create an account" : "Already have an account? Log in"}
               </button>
            </div>
         </div>
      </div>
      
      {/* Attribution Footer */}
      <div className="absolute bottom-4 right-8 z-30 hidden md:block">
         <p className="text-xs font-medium text-gray-400 flex items-center gap-1">
            Crafted with <Heart size={10} className="fill-red-400 text-red-400"/> by Yashraj Pardeshi (@incyashraj)
         </p>
      </div>
    </div>
  );
};