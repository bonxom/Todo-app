import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const getAvatarUrl = (user) => {
  const avatarFields = [
    user?.avatarUrl,
    user?.avatar,
    user?.photoURL,
    user?.image,
    user?.profilePicture,
  ];

  return avatarFields.find((value) => typeof value === 'string' && value.trim()) ?? '';
};

const Topbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const avatarUrl = getAvatarUrl(user);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState('');
  const showAvatar = Boolean(avatarUrl) && brokenAvatarUrl !== avatarUrl;

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
        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 overflow-hidden touch-manipulation bg-white/80 shadow-sm ring-1 ring-transparent transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-white hover:shadow-md hover:ring-violet-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:shadow-md motion-reduce:transform-none"
        aria-label="Go to profile"
        type="button"
      >
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt={user?.name ? `${user.name} avatar` : 'User avatar'}
            className="w-full h-full rounded-full object-cover"
            width={40}
            height={40}
            onError={() => setBrokenAvatarUrl(avatarUrl)}
          />
        ) : (
          <User className="w-5 h-5" aria-hidden="true" />
        )}
      </button>
    </header>
  );
};

export default Topbar;
