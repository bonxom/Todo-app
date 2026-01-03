import { UserPlus, Lock } from 'lucide-react';

const AuthOverlay = ({ mode, onSwitchMode }) => {
  return (
    <div 
      className={`hidden md:block absolute top-0 h-full w-[55%] transition-all duration-700 ease-in-out z-20 shadow-2xl text-white overflow-hidden
      ${mode === 'login' 
        ? 'left-1/2' // Login Mode: Overlay on the right
        : '-left-[5%]' // Register Mode: Overlay on the left
      }`}
      style={{
        background: 'linear-gradient(135deg, #db8beaff 0%, #7c3aed 100%)',
        clipPath: mode === 'login' 
          ? 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' // Left edge slanted
          : 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)'    // Right edge slanted
      }}
    >
      {/* Overlay Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      {/* CONTENT: Switch to Register (Shows when in Login mode) */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center transition-all duration-700 px-20
        ${mode === 'login' ? 'opacity-100 translate-x-0 delay-100 pointer-events-auto' : 'opacity-0 translate-x-[20%] pointer-events-none'}
      `}>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md mb-6 border border-white/20 shadow-lg">
          <UserPlus className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl font-bold mb-4 text-white">New Here?</h2>
        <p className="text-blue-100 mb-8 text-lg">Create an account and start organizing your tasks today!</p>
        
        <button 
          onClick={() => onSwitchMode('register')}
          className="relative z-50 bg-white text-blue-600 hover:bg-blue-50 rounded-full px-10 py-3 font-bold text-lg shadow-lg transform transition hover:scale-105 cursor-pointer"
        >
          Sign Up Now
        </button>
      </div>

      {/* CONTENT: Switch to Login (Shows when in Register mode) */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center transition-all duration-700 px-20
        ${mode === 'register' ? 'opacity-100 translate-x-0 delay-100 pointer-events-auto' : 'opacity-0 -translate-x-[20%] pointer-events-none'}
      `}>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md mb-6 border border-white/20 shadow-lg">
          <Lock className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl font-bold mb-4 text-white">Welcome Back!</h2>
        <p className="text-blue-100 mb-8 text-lg">Already have an account? Sign in to continue.</p>
        
        <button 
          onClick={() => onSwitchMode('login')}
          className="relative z-50 bg-white text-blue-600 hover:bg-blue-50 rounded-full px-10 py-3 font-bold text-lg shadow-lg transform transition hover:scale-105 cursor-pointer"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default AuthOverlay;
