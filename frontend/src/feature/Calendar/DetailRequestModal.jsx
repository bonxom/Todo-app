import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useGenerateTasksMutation } from '../../features/tasks/api/aiMutations';
import { formatDateTime } from '../../utils/dateTime';

const DetailRequestModal = ({ isOpen, onClose, selectedDate, onTasksGenerated }) => {
  const [userInput, setUserInput] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const generateTasksMutation = useGenerateTasksMutation();
  const isLoading = generateTasksMutation.isPending;

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

    // Format date
    const dateStr = selectedDate ? formatDateTime(selectedDate) : 'today';

    // Build request string
    let requestString = `In date ${dateStr}, I want: ${userInput.trim()}`;
    if (selectedTopics.length > 0) {
      requestString += `, ${selectedTopics.join(', ')}`;
    }

    try {
      const response = await generateTasksMutation.mutateAsync({ userRequirement: requestString });
      
      if (response.success && response.data) {
        if (onTasksGenerated) {
          onTasksGenerated();
        }
        
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
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="ui-modal-shell relative mx-4 w-full max-w-lg overflow-hidden">
        <div className="ui-modal-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Generate Tasks</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Create a short task list for the selected day.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button ui-focus-ring h-8 w-8"
            disabled={isLoading}
            aria-label="Close task generation modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-accent-soft)] border-t-[var(--color-accent)]" />
              <p className="font-medium text-[var(--color-text-muted)]">Generating tasks…</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ui-modal-body space-y-5">
          <div className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Generating tasks for</p>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {selectedDate 
                ? formatDateTime(selectedDate)
                : 'Today'}
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-[var(--color-text)]">
              Quick Topics (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ${
                    selectedTopics.includes(topic)
                      ? 'border-transparent bg-[var(--color-accent)] text-white shadow-[var(--shadow-xs)]'
                      : 'border-[var(--color-line)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="calendar-task-request" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              What do you want to accomplish?
            </label>
            <textarea
              id="calendar-task-request"
              name="taskRequest"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="E.g., Prepare dinner, exercise for 30 minutes, study React…"
              className="ui-input resize-none"
              rows="4"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary ui-focus-ring flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-btn-primary ui-focus-ring flex-1 disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)] disabled:shadow-none"
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
