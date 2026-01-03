const ProfileInfo = ({ user }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Personal Information</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Full Name</span>
          <span className="text-gray-900">{user?.name || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Email</span>
          <span className="text-gray-900">{user?.email || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Role</span>
          <span className="text-gray-900">{user?.role || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Birthday</span>
          <span className="text-gray-900">
            {user?.dob ? new Date(user.dob).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        {/* <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Nationality</span>
          <span className="text-gray-900">{user?.nationality || 'N/A'}</span>
        </div> */}
        <div className="flex items-center justify-between py-3">
          <span className="text-gray-600 font-medium">Member Since</span>
          <span className="text-gray-900">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
