import { useState, useEffect } from 'react';
import MainLayout from '../layout/MainLayout';
import ProfileHeader from '../feature/Profile/ProfileHeader';
import ProfileInfo from '../feature/Profile/ProfileInfo';
import ProfileStats from '../feature/Profile/ProfileStats';
import ProfileActions from '../feature/Profile/ProfileActions';
import EditProfileModal from '../feature/Profile/EditProfileModal';
import ChangePasswordModal from '../feature/Profile/ChangePasswordModal';
import AvatarUpload from '../feature/Profile/AvtUpload';
import ChatBubble from '../component/ChatBuble';
import { authService, taskService, categoryService } from '../api/apiService';

const ProfilePage = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalCategories: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user info
      const userData = await authService.getMe();
      setUser(userData);
      
      // Fetch tasks and categories for stats
      const [tasks, categories] = await Promise.all([
        taskService.getAllTasks(),
        categoryService.getAllCategories()
      ]);
      
      // Calculate stats
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
      
      setStats({
        totalTasks: tasks.length,
        completedTasks,
        inProgressTasks,
        totalCategories: categories.length,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (formData) => {
    try {
      console.log('Save profile:', formData);
      await authService.updateInfo(formData);
      
      // Refresh user data
      await fetchUserData();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleChangePassword = () => {
    setIsPasswordModalOpen(true);
  };

  const handleSavePassword = async (passwordData) => {
    try {
      console.log('Change password:', passwordData);
      await authService.changePassword(passwordData);
      setIsPasswordModalOpen(false);
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.message || 'Failed to change password. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-full">
          <div className="text-gray-500">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-full">
          <div className="text-red-500">Failed to load user data</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={handleSaveProfile}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSave={handleSavePassword}
      />

      <MainLayout>
        <div className="flex justify-center items-start min-h-full p-6 cursor-default select-none">
          <div className="w-full max-w-4xl mx-auto bg-gray-100/50 backdrop-blur-sm rounded-xl shadow-lg p-8">
            <ProfileHeader user={user} onAvatarUpdate={fetchUserData} />
            <ProfileStats stats={stats} />
            
            <ProfileActions
              onEditProfile={handleEditProfile}
              onChangePassword={handleChangePassword}
            />
            
            <ProfileInfo user={user} />
          </div>
        </div>
      </MainLayout>

      <ChatBubble />
    </>
  );
};

export default ProfilePage;
