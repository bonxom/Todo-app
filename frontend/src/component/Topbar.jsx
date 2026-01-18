import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft } from 'lucide-react';

const Topbar = () => {
  const navigate = useNavigate();

  return (
    <header
      className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 z-40 flex items-center justify-between px-6"
      style={{ left: "var(--sidebar-w)" }}
    >
      <div className="flex items-center gap-3">
        <ArrowLeft 
          onClick={() => navigate(-1)}
          className="cursor-pointer"
        />
      </div>  
      
      <button
        onClick={() => navigate('/profile')}
        className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 transition-colors"
        aria-label="Go to profile"
      >
        <User className="w-5 h-5" />
      </button>
    </header>
  );
};

export default Topbar;
