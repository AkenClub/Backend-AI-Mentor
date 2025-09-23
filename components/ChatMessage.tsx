import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChatMessage, MessageRole, Language, t, ModelName } from '../types';
import { UserIcon, BotIcon, CopyIcon, CheckIcon, FileIcon, FolderIcon, ExpandIcon, XIcon, DownloadIcon } from './Icons';

// Add this to inform TypeScript about the global objects from script tags
declare global {
  interface Window {
    hljs: {
      highlightElement: (element: HTMLElement) => void;
    };
    mermaid: {
      render: (id: string, source: string) => Promise<{ svg: string }>;
    };
  }
}

const DiagramModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  svgContent: string;
}> = ({ isOpen, onClose, svgContent }) => {
  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Effect to lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Effect to handle Escape key press for closing the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  
  const resetTransform = (duration = 300) => {
    const content = contentRef.current;
    if (!content) return;

    transformRef.current = { scale: 1, x: 0, y: 0 };
    
    content.style.transition = `transform ${duration}ms ease-out`;
    content.style.transform = `translate(0px, 0px) scale(1)`;

    setTimeout(() => {
        if (content) {
            content.style.transition = '';
        }
    }, duration);
  };
  
  // Main effect for pan and zoom interactions
  useEffect(() => {
    if (!isOpen) return;

    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    // Initialize position
    transformRef.current = { scale: 1, x: 0, y: 0 };
    content.style.transform = `translate(0px, 0px) scale(1)`;
    content.style.transition = '';
    
    const throttle = (func: (...args: any[]) => void, limit: number) => {
        let inThrottle: boolean;
        return function(this: any, ...args: any[]) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // --- Wheel/Zoom Logic ---
    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        const oldScale = transformRef.current.scale;
        const scaleRatio = 1.1; // Consistent zoom step
        const newScale = e.deltaY < 0 ? oldScale * scaleRatio : oldScale / scaleRatio;
        const clampedScale = Math.min(Math.max(0.2, newScale), 10);

        if (clampedScale === oldScale) return;
        
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const dx = (mouseX - transformRef.current.x) * (1 - clampedScale / oldScale);
        const dy = (mouseY - transformRef.current.y) * (1 - clampedScale / oldScale);

        transformRef.current.scale = clampedScale;
        transformRef.current.x += dx;
        transformRef.current.y += dy;

        requestAnimationFrame(() => {
            if(content) {
              content.style.transform = `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.scale})`;
            }
        });
    };
    const throttledWheel = throttle(handleWheel, 16);


    // --- Pan Logic ---
    let startPoint = { x: 0, y: 0 };
    let startTransform = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        const dx = e.clientX - startPoint.x;
        const dy = e.clientY - startPoint.y;
        
        transformRef.current.x = startTransform.x + dx;
        transformRef.current.y = startTransform.y + dy;

        requestAnimationFrame(() => {
            if (content) {
                content.style.transform = `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.scale})`;
            }
        });
    };
    
    const throttledMouseMove = throttle(handleMouseMove, 16);

    const handleMouseUp = () => {
        viewport.style.cursor = 'grab';
        document.body.style.userSelect = 'auto';
        document.removeEventListener('mousemove', throttledMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        startPoint = { x: e.clientX, y: e.clientY };
        startTransform = { x: transformRef.current.x, y: transformRef.current.y };

        viewport.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', throttledMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    viewport.addEventListener('wheel', throttledWheel, { passive: false });
    viewport.addEventListener('mousedown', handleMouseDown);
    
    return () => {
        viewport.removeEventListener('wheel', throttledWheel);
        viewport.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', throttledMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="relative bg-slate-100 p-6 rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
            <button
                onClick={() => resetTransform()}
                className="bg-slate-200 text-slate-700 rounded-md p-1.5 hover:bg-slate-300 transition-colors"
                aria-label="Reset view"
                title="Reset view"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10V3m0 7v7m-7-7h7m7 0h-7" /></svg>
            </button>
            <button 
              onClick={onClose} 
              className="bg-slate-200 text-slate-700 rounded-full p-1 hover:bg-slate-300 transition-colors"
              aria-label="Close diagram"
            >
              <XIcon className="w-5 h-5" />
            </button>
        </div>
        
        <div
          ref={viewportRef}
          className="flex-1 w-full h-full overflow-hidden"
          style={{ cursor: 'grab' }}
          onDoubleClick={() => resetTransform()}
        >
          <div
            ref={contentRef}
            className="w-full h-full flex justify-center"
            style={{ transformOrigin: '0 0' }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>
    </div>
  );
};


const MermaidDiagram: React.FC<{ chart: string; uiLanguage: Language }> = ({ chart, uiLanguage }) => {
  const [svg, setSvg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const renderDiagram = async () => {
      try {
        if (chart && window.mermaid) {
          const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
          const { svg: rawSvg } = await window.mermaid.render(id, chart);

          const tempContainer = document.createElement('div');
          tempContainer.innerHTML = rawSvg;
          const svgElement = tempContainer.querySelector('svg');

          if (svgElement) {
            svgElement.removeAttribute('height');
            svgElement.removeAttribute('width');
            svgElement.removeAttribute('style');
            svgElement.classList.add('max-w-full');

            if (isMounted) {
              setSvg(svgElement.outerHTML);
            }
          } else if (isMounted) {
            setSvg(rawSvg); 
          }
        }
      } catch (error) {
        console.error("Mermaid rendering failed:", error);
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setSvg(`<div class="p-4 text-red-500 bg-red-100 rounded-md"><strong>Diagram Error:</strong><br/><pre class="whitespace-pre-wrap text-xs">${errorMessage}</pre></div>`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!svg || !svg.trim().startsWith('<svg')) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const id = `mermaid-diagram-${Date.now()}`;
    link.download = `${id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const isRenderSuccess = svg.trim().startsWith('<svg');

  return (
    <>
      <div
        className="relative group mermaid-diagram-container"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-slate-500">
            <div className="w-6 h-6 animate-spin rounded-full border-4 border-slate-300 border-t-slate-500 mr-3"></div>
            <span>Rendering Diagram...</span>
          </div>
        ) : (
          <div 
            className={`w-full flex justify-center ${isRenderSuccess ? 'cursor-pointer' : ''}`}
            onClick={() => isRenderSuccess && setIsModalOpen(true)}
            dangerouslySetInnerHTML={{ __html: svg }} 
          />
        )}
        
        {!isLoading && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm p-1.5 rounded-md">
                <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                    title={copied ? t('copied', uiLanguage) : t('copy', uiLanguage)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 rounded"
                >
                    {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                </button>

                {isRenderSuccess && (
                  <>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                        title={t('download', uiLanguage)}
                        className="p-1.5 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 rounded"
                    >
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                        title={t('expand', uiLanguage)}
                        className="p-1.5 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 rounded"
                    >
                        <ExpandIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
            </div>
        )}
      </div>

      <DiagramModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        svgContent={svg}
      />
    </>
  );
};
const MemoizedMermaidDiagram = React.memo(MermaidDiagram);


interface CodeBlockProps {
  language: string;
  code: string;
  uiLanguage: Language;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, uiLanguage }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = codeRef.current;
    if (element && window.hljs) {
      // Ensure the content is reset before highlighting. This makes the effect
      // safe to run multiple times, which can happen in React's StrictMode.
      element.textContent = code;
      window.hljs.highlightElement(element);
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-slate-900 rounded-lg my-4 text-base">
      <div className="flex justify-between items-center px-4 py-2 bg-slate-700/50 rounded-t-lg">
        <span className="font-sans text-slate-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center font-sans text-slate-400 hover:text-white transition-colors"
          aria-label={t(copied ? 'copied' : 'copy', uiLanguage)}
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 mr-1" /> {t('copied', uiLanguage)}
            </>
          ) : (
            <>
              <CopyIcon className="w-4 h-4 mr-1" /> {t('copy', uiLanguage)}
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code ref={codeRef} className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

const MemoizedCodeBlock = React.memo(CodeBlock);

const FormattedContent: React.FC<{ content: string; uiLanguage: Language }> = ({ content, uiLanguage }) => {
  // Split the content by code blocks. The delimiter (```...```) is included in the result.
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.filter(part => part?.trim()).map((part, index) => {
        const codeBlockMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
        
        if (codeBlockMatch) {
          const [, language, code] = codeBlockMatch;
          
          if (language.toLowerCase() === 'mermaid') {
            // It's a mermaid diagram, render the MermaidDiagram component
            return <MemoizedMermaidDiagram key={index} chart={code.trim()} uiLanguage={uiLanguage} />;
          } else {
            // It's a standard code block, render the interactive CodeBlock component
            return <MemoizedCodeBlock key={index} language={language} code={code.trim()} uiLanguage={uiLanguage} />;
          }
        } else {
          // It's a markdown text part. Parse, sanitize, and render.
          const rawHtml = marked.parse(part.trim(), { gfm: true, breaks: true });
          const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
          return (
            <div
              key={index}
              className="prose-styles"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }
      })}
    </>
  );
};


const MemoizedFormattedContent = React.memo(FormattedContent);

const ModelChip: React.FC<{ model: ModelName }> = ({ model }) => {
  const modelDisplayName = model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash';
  const chipColor = model === 'gemini-2.5-pro' ? 'bg-purple-800/50 text-purple-300' : 'bg-sky-800/50 text-sky-300';
  
  return (
    <div className={`text-xs font-mono px-2 py-0.5 rounded-full inline-block mb-2 ${chipColor}`}>
      {modelDisplayName}
    </div>
  )
}

export const ChatMessageComponent: React.FC<{ message: ChatMessage, language: Language }> = ({ message, language }) => {
  const isUser = message.role === MessageRole.USER;
  const isModel = message.role === MessageRole.MODEL;
  const [copied, setCopied] = useState(false);

  const handleCopyContent = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`flex items-start gap-4 my-6 ${isUser ? 'justify-end' : ''}`}>
      {isModel && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <BotIcon className="w-6 h-6 text-emerald-400" />
        </div>
      )}

      {isModel ? ( 
        <div className="max-w-6xl w-full">
          {message.model && <ModelChip model={message.model} />}
          <div className="p-4 rounded-xl shadow-md bg-slate-700 text-slate-200 rounded-bl-none">
            <MemoizedFormattedContent content={message.content} uiLanguage={language} />
          </div>
          {message.content && (
            <div className="mt-2 flex justify-start">
              <button
                onClick={handleCopyContent}
                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title={t(copied ? 'copied' : 'copy', language)}
                aria-label={t(copied ? 'copied' : 'copy', language)}
              >
                {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      ) : ( // isUser
        <div className="flex flex-col items-end">
          <div
            className={`p-4 rounded-xl shadow-md max-w-2xl bg-blue-600 text-white rounded-br-none`}
          >
            <div>
              {message.attachment && (() => {
                  const { dataUrl, name, type } = message.attachment;
                  if (type.startsWith('image/')) {
                      return (
                          <img
                              src={dataUrl}
                              alt={name}
                              className="rounded-lg mb-2 max-w-xs max-h-64 object-contain"
                          />
                      );
                  } else {
                      return (
                          <div className="flex items-center gap-3 p-2 bg-blue-700/50 rounded-lg mb-2 max-w-xs">
                              <FileIcon className="w-10 h-10 text-blue-200 flex-shrink-0" />
                              <div className="text-sm text-blue-100 truncate">
                                  <p className="font-medium">{name}</p>
                                  <p className="text-blue-300">{type || 'file'}</p>
                              </div>
                          </div>
                      );
                  }
              })()}
              {message.folder && (
                <div className="flex items-center gap-3 p-2 bg-blue-700/50 rounded-lg mb-2 max-w-xs">
                    <FolderIcon className="w-10 h-10 text-blue-200 flex-shrink-0" />
                    <div className="text-sm text-blue-100 truncate">
                        <p className="font-medium">{message.folder.name}</p>
                        <p className="text-blue-300">{message.folder.fileCount} files</p>
                    </div>
                </div>
              )}
              {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
             </div>
          </div>
          {message.content && (
            <div className="mt-2 flex justify-end">
                <button
                    onClick={handleCopyContent}
                    className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    title={t(copied ? 'copied' : 'copy', language)}
                    aria-label={t(copied ? 'copied' : 'copy', language)}
                >
                    {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                </button>
            </div>
          )}
        </div>
      )}
      
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-slate-400" />
        </div>
      )}
    </div>
  );
};