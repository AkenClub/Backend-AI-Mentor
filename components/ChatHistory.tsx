import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, Language, t, MessageRole } from '../types';
import { ChatMessageComponent } from './ChatMessage';
import { ArrowDownIcon } from './Icons';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading: boolean;
  language: Language;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading, language }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Effect to perform scrolling
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    // Case 1: A new message from the user was just added.
    // We always want to scroll to the bottom. Use a timeout to ensure scrolling
    // happens after the layout has adjusted to the (potentially resized) input box.
    if (lastMessage?.role === MessageRole.USER) {
      shouldAutoScroll.current = true;
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
      return;
    }

    // Case 2: An AI message is streaming in.
    // We only scroll if the user hasn't scrolled up to read previous content.
    if (shouldAutoScroll.current) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Event handler to check the user's scroll position
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      // Use a tolerance to show the button before the user is scrolled very far up.
      const scrollThreshold = 50; 
      const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + scrollThreshold;
      shouldAutoScroll.current = isAtBottom;
      setShowScrollButton(!isAtBottom);
    }
  };

  const handleScrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative flex-1">
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto p-6 space-y-4"
      >
        {messages.map((msg, index) => (
          <ChatMessageComponent key={index} message={msg} language={language} />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
           <div className="flex items-start gap-4 my-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <div className="w-6 h-6 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent"></div>
              </div>
              <div className="max-w-2xl p-4 rounded-xl shadow-md bg-slate-700 text-slate-400 rounded-bl-none">
                  {t('thinking', language)}...
              </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      {showScrollButton && (
        <button
          onClick={handleScrollToBottom}
          className="absolute bottom-6 right-6 z-10 bg-slate-700 text-emerald-400 rounded-full p-3 shadow-lg hover:bg-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};