'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { authManager, getAuthHeader } from '../lib/auth';
import { apiUrl } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { BookIcon, ChatBubbleIcon, InfoIcon, LockIcon, ProvidersIcon, UserIcon } from '../../components/icons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AuthData {
  access_token: string;
  token_type: string;
  user_type: 'system' | 'guest';
  config: Record<string, any>;
  providers: {
    llm_providers: Array<{
      name: string;
      models: string[];
      available: boolean;
    }>;
    embedding_providers: Array<{
      name: string;
      models: string[];
      available: boolean;
    }>;
  };
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [userConfig, setUserConfig] = useState<Record<string, any> | null>(null);
  const [providers, setProviders] = useState<AuthData['providers'] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // 获取用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await fetch(apiUrl('/auth/config'), {
          headers: authManager.getAuthHeader()
        });

        if (response.ok) {
          const data = await response.json();
          setUserType(data.user_type);
          setUserConfig(data.config);
          setProviders(data.providers);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    loadUserInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch(
        apiUrl(`/stream?question=${encodeURIComponent(input)}`),
        {
          headers: authManager.getAuthHeader()
        }
      );

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      const assistantResponse: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantResponse]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  assistantMessage += data.chunk;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                      lastMessage.content = assistantMessage;
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('解析数据失败:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('请求失败:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                RAG知识库机器人
              </Link>
              <div className="flex space-x-6">
                <Link
                  href="/chat"
                  className="text-blue-600 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-600 inline-flex items-center gap-2"
                >
                  <ChatBubbleIcon className="h-4 w-4 text-blue-500" />
                  智能问答
                </Link>
                <Link
                  href="/docs"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <BookIcon className="h-4 w-4 text-gray-500" />
                  知识库管理
                </Link>
                <Link
                  href="/providers"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <ProvidersIcon className="h-4 w-4 text-gray-500" />
                  AI提供商
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 inline-flex items-center gap-2">
                {userType === 'system' ? (
                  <LockIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <UserIcon className="h-4 w-4 text-gray-500" />
                )}
                {userType === 'system' ? '系统用户' : '游客用户'}
              </span>
              {userConfig && (
                <span className="text-xs text-gray-400">
                  {userConfig.llm_provider} / {userConfig.embedding_provider}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">开始对话</h3>
              <p className="text-gray-600">在下方输入您的问题，我将为您提供智能回答。</p>
              {userType === 'guest' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800 inline-flex items-center gap-2 justify-center">
                  <InfoIcon className="h-4 w-4 text-blue-600" />
                  您正在使用游客模式，基于您的自定义API配置进行问答。
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl rounded-lg px-4 py-2 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                      <span className="text-gray-600 text-sm">思考中...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入您的问题..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStreaming ? '发送中...' : '发送'}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
