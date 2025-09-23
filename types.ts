import { Chat } from "@google/genai";

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Attachment {
  dataUrl: string;
  name: string;
  type: string;
}

export interface Folder {
  name: string;
  fileCount: number;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  attachment?: Attachment;
  folder?: Folder;
}


// === I18N CONTENT ===
export const translations = {
  en: {
    title: "Backend AI Mentor",
    initialGreeting: "Hello! I'm your Backend AI Mentor. How can I help you with your backend learning journey today? I can assist with Java, Spring Boot, C#, .NET, Python, and more.",
    inputPlaceholder: "Ask about backend topics like Spring Boot, .NET, Django...",
    thinking: "Thinking...",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    expand: "Expand",
  },
  zh: {
    title: "后端 AI 导师",
    initialGreeting: "你好！我是你的后端AI导师。今天我能如何帮助你的后端学习之旅？我可以协助有关Java、Spring Boot、C#、.NET、Python等技术。",
    inputPlaceholder: "询问有关Spring Boot、.NET、Django等后端主题的问题...",
    thinking: "思考中...",
    copy: "复制",
    copied: "已复制",
    download: "下载",
    expand: "展开",
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export const t = (key: TranslationKey, lang: Language): string => {
  return translations[lang][key];
}