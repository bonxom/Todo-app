import { useState } from 'react';
import { X, Minimize2, MessageSquare, Sparkles } from 'lucide-react';
import ChatField from './ChatField';
import { aiService } from '../../api/apiService';
import { useTaskRefresh } from '../../context/TaskRefreshContext';

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
        
        if (response.data) {
          const botResponse = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: response.data,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botResponse]);
        } else {
          throw new Error('No response from AI');
        }
      } else {
        // Task Assistant mode - generate tasks
        const response = await aiService.generateTasks({ userRequirement: text });
        
        if (response.success && response.data) {
          const tasksText = `Great! I've created **3 tasks** for you:\n\n${response.data.map((task, index) => 
            `**${index + 1}. ${task.title}**\n${task.description || ''}\nPriority: ${task.priority || 'Medium'}${task.dueDate ? `\nDue: ${new Date(task.dueDate).toLocaleDateString()}` : ''}`
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
          const errorResponse = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: 'Sorry, I couldn\'t generate tasks. Please try again with a different description.',
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorResponse]);
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Sorry bro, I don\'t get it. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <h3 className="font-semibold text-sm">
              {mode === 'chat' ? 'Chat Assistant' : 'Task Assistant'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              aria-label="Minimize chat"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 px-4 pb-3">
          <button
            onClick={() => handleModeChange('chat')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'chat'
                ? 'bg-white text-purple-600 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => handleModeChange('taskAssistant')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'taskAssistant'
                ? 'bg-white text-purple-600 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Tasks
          </button>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
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
