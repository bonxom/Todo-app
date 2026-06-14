import { useState } from 'react';
import { X, Minimize2, MessageSquare, Sparkles } from 'lucide-react';
import ChatField from './ChatField';
import { aiService } from '../../api/apiService';
import { useTaskRefresh } from '../../context/useTaskRefresh';
import { formatDateTime } from '../../utils/dateTime';

const SmallChat = ({ onClose, onMinimize }) => {
  const { triggerRefresh } = useTaskRefresh();
  const [mode, setMode] = useState('chat'); // 'chat' or 'taskAssistant'
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello! How can I help you today?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Reset messages with appropriate welcome message
    const welcomeMessage = newMode === 'chat'
      ? 'Hello! How can I help you today?'
      : 'Hi! Tell me what you want to accomplish, and I\'ll generate 3 tasks for you!';
    
    setMessages([
      {
        id: '1',
        sender: 'bot',
        text: welcomeMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSendMessage = async (text) => {
    const newMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);

    setIsTyping(true);
    try {
      if (mode === 'chat') {
        // Chat mode - normal conversation
        const response = await aiService.getChatResponse({ userInput: text });
        
        // Check if response exists and has data
        if (response && response.data && typeof response.data === 'string' && response.data.trim()) {
          const botResponse = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: response.data,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botResponse]);
        } else {
          // If no valid data, show a specific error message
          const errorResponse = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: 'I received your message but couldn\'t generate a proper response. Please try rephrasing your question.',
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorResponse]);
        }
      } else {
        // Task Assistant mode - generate tasks
        const response = await aiService.generateTasks({ userRequirement: text });
        
        console.log('AI generateTasks response:', response);
        
        // Validate response structure before processing
        // Response from apiService already contains the full backend response
        if (response && response.success === true && Array.isArray(response.data) && response.data.length > 0) {
          const tasksText = `Great! I've created **${response.data.length} task${response.data.length > 1 ? 's' : ''}** for you:\n\n${response.data.map((task, index) => 
            `**${index + 1}. ${task.title}**\n${task.description || ''}\nPriority: ${task.priority || 'Medium'}${task.dueDate ? `\nDue: ${formatDateTime(task.dueDate)}` : ''}`
          ).join('\n\n')}\n\nCheck your todo list to see them!`;
          
          const botResponse = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: tasksText,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botResponse]);
          
          // Trigger refresh on all pages
          triggerRefresh();
        } else {
          // More specific error message for task generation
          console.log('Task generation failed. Response:', response);
          const errorMessage = response && response.message 
            ? response.message 
            : 'Sorry, I couldn\'t generate tasks from your description. Please try to be more specific about what you want to accomplish.';
          
          const errorResponse = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: errorMessage,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorResponse]);
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Provide more helpful error messages based on error type
      let errorMessage = 'Sorry, something went wrong. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'The request took too long. Please try again with a shorter message.';
      } else if (error.response) {
        // Server responded with error
        if (error.response.status === 500) {
          errorMessage = 'The AI service is having issues. Please try again in a moment.';
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication error. Please log in again.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to the AI service. Please check your internet connection.';
      }
      
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="ui-assistant-panel animate-fadeIn">
      <div className="ui-assistant-header">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="ui-assistant-status">
            <div className="ui-assistant-status-dot" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {mode === 'chat' ? 'Assistant' : 'Task assistant'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {mode === 'chat'
                  ? 'Ask questions and get planning help'
                  : 'Describe a goal and generate tasks'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMinimize}
              className="ui-icon-button ui-focus-ring h-8 w-8"
              aria-label="Minimize chat"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-button ui-focus-ring h-8 w-8"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="ui-assistant-toggle" role="group" aria-label="Assistant mode">
          <button
            type="button"
            onClick={() => handleModeChange('chat')}
            className="ui-assistant-toggle-button ui-focus-ring"
            data-active={mode === 'chat'}
            aria-pressed={mode === 'chat'}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('taskAssistant')}
            className="ui-assistant-toggle-button ui-focus-ring"
            data-active={mode === 'taskAssistant'}
            aria-pressed={mode === 'taskAssistant'}
          >
            <Sparkles className="h-4 w-4" />
            Tasks
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[var(--color-canvas)]">
        <ChatField
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />
      </div>
    </div>
  );
};

export default SmallChat;
