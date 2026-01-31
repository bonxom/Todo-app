import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { aiService } from '../../api/apiService';

const DetailRequestModal = ({ isOpen, onClose, selectedDate, onTasksGenerated }) => {
  const [userInput, setUserInput] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const topics = [
    'Cooking',
    'Work-out',
    'Game',
    'Learning',
    'Coding',
    'Reading',
    'Shopping',
    'Meeting',
  ];

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userInput.trim() && selectedTopics.length === 0) {
      alert('Please enter your request or select at least one topic');
      return;
    }

    setIsLoading(true);

    // Format date
    const dateStr = selectedDate 
      ? selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'today';

    // Build request string
    let requestString = `In date ${dateStr}, I want: ${userInput.trim()}`;
    if (selectedTopics.length > 0) {
      requestString += `, ${selectedTopics.join(', ')}`;
    }

    try {
      const response = await aiService.generateTasks({ userRequirement: requestString });
      
      if (response.success && response.data) {
        // Call callback to refresh tasks
        if (onTasksGenerated) {
          onTasksGenerated();
        }
        
        // Reset form and close
        setUserInput('');
        setSelectedTopics([]);
        onClose();
        
        alert(`Successfully generated ${response.data.length} tasks! Check your tasks list.`);
      } else {
        alert('Sorry, I couldn\'t generate tasks. Please try again with a different description.');
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      alert('Failed to generate tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Generate Tasks with AI</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-gray-600 font-medium">Generating tasks...</p>
            </div>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Date Display */}
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Generating tasks for:</p>
            <p className="text-lg font-semibold text-purple-700">
              {selectedDate 
                ? selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })
                : 'Today'}
            </p>
          </div>

          {/* Quick Topics */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quick Topics (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    selectedTopics.includes(topic)
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* User Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What do you want to accomplish?
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="E.g., Prepare dinner, exercise for 30 minutes, study React..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
              rows="4"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Generate Tasks
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DetailRequestModal;
