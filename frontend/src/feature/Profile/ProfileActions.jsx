import { Edit, Lock } from 'lucide-react';

const ProfileActions = ({ onEditProfile, onChangePassword }) => {
  const actions = [
    {
      label: 'Edit Profile',
      icon: Edit,
      onClick: onEditProfile,
      color: 'from-blue-600 to-purple-600',
    },
    {
      label: 'Change Password',
      icon: Lock,
      onClick: onChangePassword,
      color: 'from-purple-600 to-pink-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 mx-15 cursor-default select-none">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            type="button"
            onClick={action.onClick}
            className="relative flex items-center justify-center gap-2 overflow-hidden rounded-lg px-6 py-4 font-semibold text-white shadow-md transition-shadow duration-300 hover:shadow-lg"
          >
            <span className={`absolute inset-0 bg-gradient-to-r ${action.color} transition-opacity duration-500 opacity-100 hover:opacity-0`} />
            <span className={`absolute inset-0 bg-gradient-to-l ${action.color} transition-opacity duration-500 opacity-0 hover:opacity-100`} />
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ProfileActions;
