const ProfileHeader = ({ user }) => {
  return (
    <div className="mb-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-24 h-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
        {user?.name || 'User Profile'}
      </h1>
      <p className="text-gray-500 mb-2">{user?.email || 'user@example.com'}</p>
      <div className="flex justify-center gap-2 text-sm text-gray-500">
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
          {user?.role || 'USER'}
        </span>
      </div>
    </div>
  );
};

export default ProfileHeader;
