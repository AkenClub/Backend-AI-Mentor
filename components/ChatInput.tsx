import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendIcon, PaperclipIcon, XIcon, FileIcon, FolderIcon } from './Icons';
import { Attachment, Folder } from '../types';

interface ProcessedFolder extends Folder {
  content: string;
}

interface ChatInputProps {
  onSendMessage: (message: string, attachment?: Attachment, folder?: ProcessedFolder) => void;
  isLoading: boolean;
  placeholder: string;
}

const MAX_FILE_SIZE_MB = 4;
const MAX_TOTAL_FOLDER_SIZE_MB = 10;
const MAX_INDIVIDUAL_FILE_IN_FOLDER_KB = 100;

// Helper to generate a tree string from a list of file paths
const generateTree = (paths: string[]): string => {
    const root: any = {};
    paths.forEach(path => {
        path.split('/').reduce((acc, name) => {
            if (!name) return acc;
            acc[name] = acc[name] || {};
            return acc[name];
        }, root);
    });

    const buildTreeString = (node: any, prefix = ''): string => {
        let result = '';
        const entries = Object.entries(node);
        entries.forEach(([name, child], index) => {
            const isLast = index === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            const isDirectory = Object.keys(child as object).length > 0;
            result += `${prefix}${connector}${name}${isDirectory ? '/' : ''}\n`;
            if (isDirectory) {
                result += buildTreeString(child, newPrefix);
            }
        });
        return result;
    }
    // The first level is the folder name itself, so we start from its children.
    const folderName = Object.keys(root)[0];
    return `${folderName}/\n${buildTreeString(root[folderName])}`;
};


export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, placeholder }) => {
  const [input, setInput] = useState('');
  const [fileData, setFileData] = useState<Attachment | null>(null);
  const [folderData, setFolderData] = useState<ProcessedFolder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Fix: Set non-standard `webkitdirectory` and `directory` attributes imperatively
  // to allow folder selection while avoiding TypeScript errors in JSX.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, fileData, folderData]);

  const resetAttachments = () => {
    setFileData(null);
    setFolderData(null);
    setError(null);
  }

  const processFile = (file: File) => {
    resetAttachments();
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileData({
        dataUrl: reader.result as string,
        name: file.name,
        type: file.type,
      });
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsDataURL(file);
  };

  const processFolder = async (files: File[]) => {
    resetAttachments();
    if (!files.length) return;

    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > MAX_TOTAL_FOLDER_SIZE_MB * 1024 * 1024) {
        setError(`Folder is too large. Maximum total size is ${MAX_TOTAL_FOLDER_SIZE_MB}MB.`);
        return;
    }

    const paths = files.map(f => f.webkitRelativePath);
    const tree = generateTree(paths);
    
    const fileReadPromises = files.map(file => {
        return new Promise<({ path: string, content: string }) | null>((resolve) => {
            const isText = /text\/|application\/(json|javascript|xml)/.test(file.type) || !file.type && file.size > 0;
            const isSmall = file.size < MAX_INDIVIDUAL_FILE_IN_FOLDER_KB * 1024;
            
            if (!isText || !isSmall || file.size === 0) {
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => resolve({ path: file.webkitRelativePath, content: reader.result as string });
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
        });
    });

    try {
        const fileContents = (await Promise.all(fileReadPromises)).filter((c): c is { path: string, content: string } => c !== null);
        
        let formattedContent = `User has uploaded a folder. Here is the directory structure:\n\`\`\`\n${tree}\n\`\`\`\n\nHere are the contents of the relevant files:\n\n`;
        fileContents.forEach(file => {
            const lang = file.path.split('.').pop() || '';
            formattedContent += `--- File: ${file.path} ---\n\`\`\`${lang}\n${file.content}\n\`\`\`\n\n`;
        });

        const folderName = files[0]?.webkitRelativePath.split('/')[0] || 'folder';
        setFolderData({
            name: folderName,
            fileCount: files.length,
            content: formattedContent
        });
    } catch (e) {
        setError("Failed to process folder.");
        console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value immediately to prevent browser quirks and potential race conditions.
    e.target.value = ''; 
    if (file) {
      processFile(file);
    }
  };
  
  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    // Reset input value immediately.
    e.target.value = ''; 
    if (files && files.length > 0) {
        // Immediately convert FileList to an array to avoid issues with the reference
        // becoming invalid after the event handler completes.
        processFolder(Array.from(files));
    }
  };
  
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.items).find(item => item.kind === 'file')?.getAsFile();
    if (file) {
        e.preventDefault();
        processFile(file);
    }
  }, []);

  const performSubmit = () => {
    if ((input.trim() || fileData || folderData) && !isLoading) {
      onSendMessage(input.trim(), fileData || undefined, folderData || undefined);
      setInput('');
      resetAttachments();
    }
  };

  const hasAttachment = !!fileData || !!folderData;

  return (
    <div className="bg-slate-800/50 border-t border-slate-700">
      {error && (
        <div className="px-4 pt-2 text-red-400 text-sm">
          {error}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          performSubmit();
        }}
        className="p-4 flex items-end gap-3"
      >
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          disabled={isLoading || hasAttachment}
          className="w-12 h-12 flex-shrink-0 text-slate-400 hover:text-emerald-500 rounded-full flex items-center justify-center disabled:text-slate-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          aria-label="Attach folder"
        >
          <FolderIcon className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || hasAttachment}
          className="w-12 h-12 flex-shrink-0 text-slate-400 hover:text-emerald-500 rounded-full flex items-center justify-center disabled:text-slate-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          aria-label="Attach file"
        >
          <PaperclipIcon className="w-6 h-6" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        <input type="file" ref={folderInputRef} onChange={handleFolderChange} style={{ display: 'none' }} />

        <div className="relative flex-1">
          {hasAttachment && (
            <div className="relative mb-2 p-2 bg-slate-700 rounded-lg max-w-xs">
              {fileData ? (
                fileData.type.startsWith('image/') ? (
                  <img src={fileData.dataUrl} alt="Preview" className="max-h-24 rounded-md" />
                ) : (
                  <div className="flex items-center gap-3 p-2">
                      <FileIcon className="w-10 h-10 text-slate-400 flex-shrink-0" />
                      <div className="text-sm text-slate-200 truncate">
                          <p className="font-medium">{fileData.name}</p>
                          <p className="text-slate-400">{fileData.type || 'file'}</p>
                      </div>
                  </div>
                )
              ) : folderData ? (
                <div className="flex items-center gap-3 p-2">
                    <FolderIcon className="w-10 h-10 text-slate-400 flex-shrink-0" />
                    <div className="text-sm text-slate-200 truncate">
                        <p className="font-medium">{folderData.name}</p>
                        <p className="text-slate-400">{folderData.fileCount} files</p>
                    </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={resetAttachments}
                className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                aria-label="Remove attachment"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                performSubmit();
              }
            }}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full bg-slate-700 text-slate-200 placeholder-slate-400 rounded-lg p-3 resize-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow max-h-48"
            rows={1}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !hasAttachment)}
          className="w-12 h-12 flex-shrink-0 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </form>
    </div>
  );
};