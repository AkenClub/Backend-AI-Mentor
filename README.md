<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Backend AI Mentor - AI-Powered Backend Development Assistant

## English Version

### Overview
Backend AI Mentor is an intelligent development assistant that provides expert guidance on backend technologies including Java, Spring Boot, C#, .NET, and Python. Unlike Google AI Studio, our application offers enhanced file handling capabilities with support for folder uploads and multiple file types.

### Key Features
- **📁 Folder Upload Support**: Upload entire project directories while maintaining the folder structure
- **📄 Multiple File Types**: Support for various programming languages (not limited to .txt files)
- **🖼️ Image Analysis**: Visual context understanding and discussion
- **💬 AI-Powered Mentorship**: Get expert guidance on backend development
- **🌍 Bilingual Support**: Seamlessly switch between English and Chinese
- **⚡ Real-time Streaming**: Instant responses with streaming support

### Supported File Types
- **Text Files**: .txt, .md, .json, .xml, .html, .css, .sql, .yaml, .sh
- **Code Files**: .java, .py, .js, .ts, .cs, .csharp
- **Images**: All common image formats (JPG, PNG, GIF, etc.)

### Advantages over Google AI Studio
Feature | Backend AI Mentor | Google AI Studio |
|---------|------------------|------------------|
Folder Upload | ✅ Full support | ❌ Limited support |
Multiple File Types | ✅ Extensive support | ❌ Limited to text |
Project Context | ✅ Complete directory structure | ❌ Single file only |
Bilingual Support | ✅ Seamless switching | ❌ Language dependent |

### Quick Start
**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

### Deploy to Cloudflare Pages

**Build Command:**
```bash
npm run build
```

**Build Output Directory:**
```
dist
```

**Environment Variables:**
- Name: `GEMINI_API_KEY`
- Value: Get your API key from https://aistudio.google.com/apikey

**Steps to deploy:**
1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your repository to Cloudflare Pages
3. Set the environment variables as specified above
4. Deploy with the build configuration provided

---

## 中文版本

### 概述
Backend AI Mentor 是一个智能开发助手，为后端技术（包括 Java、Spring Boot、C#、.NET 和 Python）提供专业指导。与 Google AI Studio 相比，我们的应用提供了增强的文件处理功能，支持文件夹上传和多种文件类型。

### 主要功能
- **📁 文件夹上传支持**：上传整个项目目录，保持文件夹结构完整
- **📄 多种文件类型**：支持各种编程语言文件（不限于 .txt 文件）
- **🖼️ 图片分析**：视觉上下文理解和讨论
- **💬 AI 导师指导**：获得后端开发的专家指导
- **🌍 双语支持**：可在中英文之间无缝切换
- **⚡ 实时流式响应**：即时响应，支持流式传输

### 支持的文件类型
- **文本文件**：.txt, .md, .json, .xml, .html, .css, .sql, .yaml, .sh
- **代码文件**：.java, .py, .js, .ts, .cs, .csharp
- **图片文件**：所有常见图片格式（JPG、PNG、GIF 等）

### 相比 Google AI Studio 的优势
功能 | Backend AI Mentor | Google AI Studio |
|------|------------------|------------------|
文件夹上传 | ✅ 完全支持 | ❌ 支持有限 |
多种文件类型 | ✅ 广泛支持 | ❌ 仅限文本 |
项目上下文 | ✅ 完整目录结构 | ❌ 仅单个文件 |
双语支持 | ✅ 无缝切换 | ❌ 依赖语言 |

### 快速开始
**前置要求**：Node.js

1. 安装依赖：
   `npm install`
2. 在 [.env.local](.env.local) 中设置您的 Gemini API 密钥作为 `GEMINI_API_KEY`
3. 运行应用：
   `npm run dev`

### 部署到 Cloudflare Pages

**构建命令：**
```bash
npm run build
```

**构建输出目录：**
```
dist
```

**环境变量：**
- 名称：`GEMINI_API_KEY`
- 值：从 https://aistudio.google.com/apikey 获取您的 API 密钥

**部署步骤：**
1. 将您的代码推送到 Git 仓库（GitHub、GitLab 或 Bitbucket）
2. 将您的仓库连接到 Cloudflare Pages
3. 按照上述说明设置环境变量
4. 使用提供的构建配置进行部署
