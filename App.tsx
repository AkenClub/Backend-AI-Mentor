import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, MessageRole, t, Language, Attachment, Folder } from './types';
import { ChatHistory } from './components/ChatHistory';
import { ChatInput } from './components/ChatInput';
import { startChat } from './services/geminiService';
import type { Chat } from '@google/genai';

// Helper to convert data URL to a Part object for the API
const fileToPart = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const [_, mimeType, base64Data] = match;
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

interface ProcessedFolder extends Folder {
  content: string;
}

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    // Initialize or re-initialize chat when language changes
    chatRef.current = startChat(language);
    // Reset conversation with the greeting in the new language
    setMessages([
      {
        role: MessageRole.MODEL,
        content: t('initialGreeting', language),
      }
    ]);
  }, [language]);

  const handleSendMessage = useCallback(async (prompt: string, attachment?: Attachment, folder?: ProcessedFolder) => {
    if (!chatRef.current) return;
    setIsLoading(true);
    setError(null);

    const userMessage: ChatMessage = { 
      role: MessageRole.USER, 
      content: prompt, 
      attachment,
      folder: folder ? { name: folder.name, fileCount: folder.fileCount } : undefined,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      let finalPrompt = prompt;

      // Prepend folder context if it exists
      if (folder) {
        finalPrompt = `${folder.content}\n\nBased on the folder context above, here is the user's request:\n\n${prompt}`;
      }
      
      // Prepend single text file context if it exists
      if (attachment?.textContent) {
        const lang = attachment.name.split('.').pop() || '';
        const fileContext = `User has uploaded a file named "${attachment.name}". Here is its content:\n\`\`\`${lang}\n${attachment.textContent}\n\`\`\``;
        finalPrompt = `${fileContext}\n\nBased on the file content above, here is the user's request:\n\n${prompt}`;
      }
      
      const messageParts: (string | { inlineData: { data: string; mimeType: string } })[] = [finalPrompt];
      
      // Add image part if it's an image attachment
      if (attachment?.dataUrl) {
        try {
          messageParts.unshift(fileToPart(attachment.dataUrl));
        } catch (e) {
          setError(`Error processing image attachment: ${e instanceof Error ? e.message : 'Unknown error'}`);
          setIsLoading(false);
          return;
        }
      }
      
      const stream = await chatRef.current.sendMessageStream({ message: messageParts });
      
      let modelResponse = '';
      setMessages((prevMessages) => [...prevMessages, { role: MessageRole.MODEL, content: modelResponse }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages[newMessages.length - 1] = { role: MessageRole.MODEL, content: modelResponse };
            return newMessages;
        });
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error(e);
      setError(`Error: ${errorMessage}`);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: MessageRole.MODEL,
          content: `Sorry, I encountered an error. Please try again. Details: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col font-sans">
      <header className="relative py-3 px-4 border-b border-slate-700 shadow-md bg-slate-800/50 backdrop-blur-sm flex items-center justify-center">
        <h1 className="text-xl font-bold text-emerald-400">{t('title', language)}</h1>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="flex bg-slate-700 rounded-md p-1">
                <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 text-sm rounded ${language === 'en' ? 'bg-emerald-600' : 'hover:bg-slate-600'} transition-colors`}
                    aria-label="Switch to English"
                >
                    EN
                </button>
                <button 
                    onClick={() => setLanguage('zh')}
                    className={`px-3 py-1 text-sm rounded ${language === 'zh' ? 'bg-emerald-600' : 'hover:bg-slate-600'} transition-colors`}
                    aria-label="切换到中文"
                >
                    中文
                </button>
            </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatHistory messages={messages} isLoading={isLoading} language={language} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={t('inputPlaceholder', language)} />
      </main>
    </div>
  );
};

export default App;