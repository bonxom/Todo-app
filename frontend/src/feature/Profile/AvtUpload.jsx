import { useState } from 'react';
import { Camera } from 'lucide-react';
import { authService } from '../../api/apiService';

const AvatarUpload = ({ onUploadSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!avatarUrl.trim()) return;

    setIsUploading(true);
    try {
      await authService.updateInfo({ avatarUrl });
      alert('Avatar updated successfully!');
      setIsOpen(false);
      setAvatarUrl('');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Error updating avatar: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    setIsOpen(true);
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        className="absolute bottom-0 right-0 bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-full shadow-lg transition-colors"
        title="Upload avatar"
      >
        <Camera size={20} />
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Avatar URL</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Enter image URL (e.g., https://example.com/avatar.jpg)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                disabled={isUploading}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setAvatarUrl('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AvatarUpload; 