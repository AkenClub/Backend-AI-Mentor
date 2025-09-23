import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, MessageRole, t, Language, Attachment, Folder, ModelName } from './types';
import { ChatHistory } from './components/ChatHistory';
import { ChatInput } from './components/ChatInput';
import { ai, getSystemInstruction } from './services/geminiService';
import type { Content, Part } from '@google/genai';

// Helper to convert data URL to a Part object for the API
const fileToPart = (dataUrl: string): Part => {
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
  const [selectedModel, setSelectedModel] = useState<ModelName>('gemini-2.5-pro');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize or reset chat when language changes
    setMessages([
      {
        role: MessageRole.MODEL,
        content: t('initialGreeting', language),
        model: selectedModel,
      }
    ]);
  }, [language]);

  const handleSendMessage = useCallback(async (prompt: string, attachment?: Attachment, folder?: ProcessedFolder) => {
    setIsLoading(true);
    setError(null);

    const userMessage: ChatMessage = { 
      role: MessageRole.USER, 
      content: prompt, 
      attachment,
      folder: folder,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      // Reconstruct history from state, excluding the initial greeting.
      const history: Content[] = messages
        .slice(1)
        .map((msg): Content => {
          const parts: Part[] = [];
          let textContent = msg.content;
          
          // For user messages, we need to reconstruct the full context that was sent,
          // including file or folder contents.
          if (msg.role === MessageRole.USER) {
            if (msg.folder?.content) {
                textContent = `${msg.folder.content}\n\nBased on the folder context above, here is the user's request:\n\n${msg.content}`;
            } else if (msg.attachment?.textContent) {
              const lang = msg.attachment.name.split('.').pop() || '';
              const fileContext = `User has uploaded a file named "${msg.attachment.name}". Here is its content:\n\`\`\`${lang}\n${msg.attachment.textContent}\n\`\`\``;
              textContent = `${fileContext}\n\nBased on the file content above, here is the user's request:\n\n${msg.content}`;
            }
          }
          
          // Add image part first if it exists
          if (msg.attachment?.dataUrl) {
            parts.push(fileToPart(msg.attachment.dataUrl));
          }
          
          parts.push({ text: textContent });

          return { role: msg.role, parts };
      });

      // Construct the current message to be sent
      let finalPrompt = prompt;
      if (folder) {
        finalPrompt = `${folder.content}\n\nBased on the folder context above, here is the user's request:\n\n${prompt}`;
      } else if (attachment?.textContent) {
        const lang = attachment.name.split('.').pop() || '';
        const fileContext = `User has uploaded a file named "${attachment.name}". Here is its content:\n\`\`\`${lang}\n${attachment.textContent}\n\`\`\``;
        finalPrompt = `${fileContext}\n\nBased on the file content above, here is the user's request:\n\n${prompt}`;
      }
      
      const currentMessageParts: Part[] = [];
      if (attachment?.dataUrl) {
        currentMessageParts.push(fileToPart(attachment.dataUrl));
      }
      currentMessageParts.push({ text: finalPrompt });

      const contents: Content[] = [ ...history, { role: 'user', parts: currentMessageParts } ];

      const stream = await ai.models.generateContentStream({
        model: selectedModel,
        contents,
        config: {
          systemInstruction: getSystemInstruction(language),
        }
      });
      
      let modelResponse = '';
      setMessages((prevMessages) => [...prevMessages, { role: MessageRole.MODEL, content: modelResponse, model: selectedModel }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages[newMessages.length - 1] = { role: MessageRole.MODEL, content: modelResponse, model: selectedModel };
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
          model: selectedModel,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedModel, language]);
  
  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col font-sans">
      <header className="relative py-3 px-4 border-b border-slate-700 shadow-md bg-slate-800/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex bg-slate-700 rounded-md p-1 text-sm">
            <button 
                onClick={() => setSelectedModel('gemini-2.5-pro')}
                className={`px-3 py-1 rounded ${selectedModel === 'gemini-2.5-pro' ? 'bg-slate-900 text-emerald-400 font-semibold' : 'hover:bg-slate-600'} transition-colors`}
                aria-label="Switch to Gemini 2.5 Pro"
            >
                Pro
            </button>
            <button 
                onClick={() => setSelectedModel('gemini-2.5-flash')}
                className={`px-3 py-1 rounded ${selectedModel === 'gemini-2.5-flash' ? 'bg-slate-900 text-emerald-400 font-semibold' : 'hover:bg-slate-600'} transition-colors`}
                aria-label="Switch to Gemini 2.5 Flash"
            >
                Flash
            </button>
        </div>

        <h1 className="text-xl font-bold text-emerald-400 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{t('title', language)}</h1>
        
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
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatHistory messages={messages} isLoading={isLoading} language={language} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={t('inputPlaceholder', language)} />
      </main>
    </div>
  );
};

export default App;