import { CheckSquare } from 'lucide-react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[50%] h-[50%] bg-pink-300 rounded-full blur-[100px] opacity-30" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-purple-500 rounded-full blur-[100px] opacity-20" />
      </div>

      {/* Main Card */}
      <div className="relative bg-white rounded-4xl shadow-2xl w-full max-w-[1000px] min-h-[650px] overflow-hidden flex flex-col md:flex-row z-10">
        
        {/* Mobile Header */}
        <div className="md:hidden p-6 pb-0 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-2">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-blue-600">TodoApp</h1>
        </div>

        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
