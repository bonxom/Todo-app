import { useState, useMemo } from 'react';
import ProfileHeader from './components/ProfileHeader';
import ProfileInfo from './components/ProfileInfo';
import ProfileStats from './components/ProfileStats';
import ProfileActions from './components/ProfileActions';
import EditProfileModal from './components/EditProfileModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import { useCurrentUserQuery } from './api/userQueries';
import { useTasksQuery } from '@/features/tasks/api/taskQueries';
import { useCategoriesQuery } from '@/features/categories/api/categoryQueries';
import {
  useChangePasswordMutation,
  useUpdateProfileMutation,
} from './api/userMutations';
import { getApiErrorMessage } from '@/shared/services/apiError';

const ProfilePage = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const userQuery = useCurrentUserQuery();
  const tasksQuery = useTasksQuery({ pageSize: 100 });
  const categoriesQuery = useCategoriesQuery();

  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const user = userQuery.data || null;

  const stats = useMemo(() => {
    const tasks = (Array.isArray(tasksQuery.data) ? tasksQuery.data : tasksQuery.data?.data) || [];
    const categories = categoriesQuery.data || [];
    const completedTasks = tasks.filter((task) => task.status === 'completed').length;
    const inProgressTasks = tasks.filter((task) => task.status === 'in-progress').length;

    return {
      totalTasks: tasks.length,
      completedTasks,
      inProgressTasks,
      totalCategories: categories.length,
    };
  }, [tasksQuery.data, categoriesQuery.data]);

  const isLoading = userQuery.isLoading;

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (formData) => {
    try {
      await updateProfileMutation.mutateAsync(formData);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(getApiErrorMessage(error, 'Failed to update profile. Please try again.'));
    }
  };

  const handleChangePassword = () => {
    setIsPasswordModalOpen(true);
  };

  const handleSavePassword = async (passwordData) => {
    try {
      await changePasswordMutation.mutateAsync(passwordData);
      setIsPasswordModalOpen(false);
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert(getApiErrorMessage(error, 'Failed to change password. Please try again.'));
    }
  };

  if (isLoading) {
    return (
      <div className="ui-page-shell">
        <section className="ui-section-card ui-card-padding" aria-live="polite">
          <p className="m-0 text-sm text-[var(--color-text-muted)]">Loading profile…</p>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ui-page-shell">
        <section className="ui-section-card ui-card-padding">
          <p className="m-0 text-sm font-medium text-[var(--color-danger)]">
            Failed to load profile details.
          </p>
        </section>
      </div>
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

      <div className="ui-page-shell">
        <header className="ui-page-header">
          <p className="ui-page-kicker">Account</p>
          <h1 className="ui-page-title">Account Settings</h1>
          <p className="ui-page-description">
            Review your profile details, keep account information current, and manage
            the credentials you use to sign in.
          </p>
        </header>

        <ProfileHeader
          user={user}
          onAvatarUpdate={() => {
            userQuery.refetch();
          }}
        />

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
    </>
  );
};

export default ProfilePage;
