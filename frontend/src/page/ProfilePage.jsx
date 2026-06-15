import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../layout/MainLayout';
import ProfileHeader from '../feature/Profile/ProfileHeader';
import ProfileInfo from '../feature/Profile/ProfileInfo';
import ProfileStats from '../feature/Profile/ProfileStats';
import ProfileActions from '../feature/Profile/ProfileActions';
import EditProfileModal from '../feature/Profile/EditProfileModal';
import ChangePasswordModal from '../feature/Profile/ChangePasswordModal';
import ChatBubble from '../component/ChatBuble';
import { authService, taskService, categoryService } from '../api/apiService';
import { useAuth } from '../context/useAuth';

const ProfilePage = () => {
  const { syncUser } = useAuth();
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

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch user info
      const userData = await authService.getMe();
      setUser(userData);
      syncUser(userData);
      
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
  }, [syncUser]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (formData) => {
    try {
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
        <div className="ui-page-shell">
          <section className="ui-section-card ui-card-padding" aria-live="polite">
            <p className="m-0 text-sm text-[var(--color-text-muted)]">Loading profile…</p>
          </section>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="ui-page-shell">
          <section className="ui-section-card ui-card-padding">
            <p className="m-0 text-sm font-medium text-[var(--color-danger)]">
              Failed to load profile details.
            </p>
          </section>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      <EditProfileModal
        key={`edit-profile-${isEditModalOpen ? 'open' : 'closed'}-${user?.id ?? user?.email ?? 'user'}-${user?.updatedAt ?? ''}`}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={handleSaveProfile}
      />

      <ChangePasswordModal
        key={`change-password-${isPasswordModalOpen ? 'open' : 'closed'}`}
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSave={handleSavePassword}
      />

      <MainLayout>
        <div className="ui-page-shell">
          <header className="ui-page-header">
            <p className="ui-page-kicker">Account</p>
            <h1 className="ui-page-title">Account Settings</h1>
            <p className="ui-page-description">
              Review your profile details, keep account information current, and manage
              the credentials you use to sign in.
            </p>
          </header>

          <ProfileHeader user={user} onAvatarUpdate={fetchUserData} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.95fr)] xl:items-start">
            <div className="space-y-6">
              <ProfileActions
                onEditProfile={handleEditProfile}
                onChangePassword={handleChangePassword}
              />
              <ProfileInfo user={user} />
            </div>

            <div className="space-y-6">
              <ProfileStats stats={stats} />
            </div>
          </div>
        </div>
      </MainLayout>

      <ChatBubble />
    </>
  );
};

export default ProfilePage;
