'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

import { apiUrl } from '../../lib/api';
import { authManager } from '../lib/auth';
import {
  BookIcon,
  ChatBubbleIcon,
  InfoIcon,
  LockIcon,
  ProvidersIcon,
  UserIcon,
} from '../../components/icons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProviderSummary {
  name: string;
  models: string[];
  available: boolean;
}

interface AuthData {
  user_type: 'system' | 'guest';
  config: Record<string, any>;
  providers: {
    llm_providers: ProviderSummary[];
    embedding_providers: ProviderSummary[];
  };
}

const quickPrompts = [
  {
    label: '总结最新文档',
    value: '请用 3 个要点总结最新上传的文档内容。',
    description: '快速了解最新知识库文件的核心观点。',
  },
  {
    label: '生成行动清单',
    value: '根据知识库内容，生成一份下一步行动清单。',
    description: '把复杂信息转换成可以立即执行的任务。',
  },
  {
    label: '润色回答',
    value: '请把上一条回答润色成更具 Apple 风格的表达。',
    description: '让回复语气更优雅、符合品牌调性。',
  },
];

const formatTimestamp = (date: Date) =>
  date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeComposer = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, 260);
    element.style.height = `${Math.max(nextHeight, 120)}px`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  useEffect(autoResizeComposer, [input]);

  useEffect(() => {
    if (!authManager.requireAuth(router)) {
      return;
    }

    const loadUserInfo = async () => {
      try {
        const response = await fetch(apiUrl('/auth/config'), {
          headers: authManager.getAuthHeader(),
        });

        if (response.status === 401) {
          authManager.logout(router);
          return;
        }

        if (!response.ok) {
          throw new Error('获取用户信息失败');
        }

        const data = await response.json();
        setAuthData({
          user_type: data.user_type,
          config: data.config,
          providers: data.providers,
        });
      } catch (err) {
        console.error(err);
        setError('无法加载用户配置，请稍后重试。');
      }
    };

    loadUserInfo();
  }, [router]);

  const providerBadges = useMemo(() => {
    if (!authData?.providers) return [];
    return authData.providers.llm_providers.map((provider) => ({
      label: provider.name.toUpperCase(),
      available: provider.available,
    }));
  }, [authData]);

  const handleQuickPrompt = (value: string) => {
    setInput(value);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      autoResizeComposer();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isStreaming) {
      return;
    }

    if (!authManager.isAuthenticated()) {
      authManager.logout(router);
      return;
    }

    setError(null);

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch(apiUrl(`/stream?question=${encodeURIComponent(userMessage.content)}`), {
        headers: authManager.getAuthHeader(),
      });

      if (response.status === 401) {
        authManager.logout(router);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error('网络请求失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      const assistantResponse: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantResponse]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (!payload.trim()) continue;

          try {
            const data = JSON.parse(payload);
            if (data.status === 'done') {
              continue;
            }
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.chunk) {
              assistantMessage += data.chunk;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === 'assistant') {
                  last.content = assistantMessage;
                }
                return next;
              });
            }
          } catch (err) {
            console.error('解析流式数据失败:', err);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '抱歉，处理您的请求时发生错误，请稍后再试。',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-page min-h-screen bg-apple-gradient text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="apple-glow apple-glow-1" />
        <div className="apple-glow apple-glow-2" />
      </div>

      <div className="relative flex h-screen flex-col px-4 py-6 sm:px-6 lg:px-12">
        <header className="glass-panel mb-6 flex items-center justify-between rounded-2xl border border-white/10 px-5 py-4 shadow-lg shadow-black/10">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold tracking-wide text-white/80 hover:text-white">
              RAG Knowledge Studio
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <Link href="/chat" className="nav-pill active">
                <ChatBubbleIcon className="h-4 w-4" />
                对话
              </Link>
              <Link href="/docs" className="nav-pill">
                <BookIcon className="h-4 w-4" />
                知识库
              </Link>
              <Link href="/providers" className="nav-pill">
                <ProvidersIcon className="h-4 w-4" />
                AI提供商
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
              {authData?.user_type === 'system' ? <LockIcon className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
              {authData?.user_type === 'system' ? '系统模式' : '游客模式'}
            </span>
            {providerBadges.length > 0 && (
              <div className="hidden items-center gap-2 md:flex">
                {providerBadges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${badge.available ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-white/60'}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="grid flex-1 gap-6 md:grid-cols-[minmax(0,2.1fr)_minmax(280px,1fr)]">
          <section className="glass-panel flex min-h-0 flex-col rounded-3xl border border-white/10 p-4 sm:p-6">
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
              <div className="flex flex-col gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-medium text-white/90">对话时间轴</h2>
                  <p className="text-sm text-white/60">借助知识库快速获得灵感与答案。</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    className="quick-action"
                    onClick={() => handleQuickPrompt(prompt.value)}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>

              <div className="custom-scrollbar mt-4 flex-1 space-y-6 overflow-y-auto pb-4 pr-0 sm:pr-2">
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-hero">
                      <div className="empty-hero-icon">
                        <ChatBubbleIcon className="h-5 w-5" />
                      </div>
                      <h3>准备好开始对话了吗？</h3>
                      <p>像在 ChatGPT 一样提出问题，系统会结合您的知识库作答。</p>
                      {authData?.user_type === 'guest' && (
                        <span className="empty-hero-badge">
                          <InfoIcon className="h-4 w-4" />
                          游客模式正在使用您的自定义 API 配置
                        </span>
                      )}
                    </div>
                    <div className="empty-grid">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={`empty-${prompt.label}`}
                          type="button"
                          className="empty-card"
                          onClick={() => handleQuickPrompt(prompt.value)}
                        >
                          <div className="empty-card-icon">
                            <ChatBubbleIcon className="h-4 w-4" />
                          </div>
                          <div className="empty-card-text">
                            <h4>{prompt.label}</h4>
                            <p>{prompt.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}-${message.timestamp.getTime()}`}
                      className={`message-row ${message.role === 'user' ? 'message-row-user' : 'message-row-assistant'}`}
                    >
                      <div className={`chat-avatar ${message.role === 'user' ? 'chat-avatar-user' : 'chat-avatar-assistant'}`}>
                        {message.role === 'user' ? '我' : 'R'}
                      </div>
                      <div
                        className={`chat-bubble ${
                          message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                        }`}
                      >
                        <div className="chat-bubble-meta">
                          <span>{message.role === 'user' ? '你' : 'RAG 助手'}</span>
                          <span>{formatTimestamp(message.timestamp)}</span>
                        </div>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-[15px] leading-relaxed">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isStreaming && (
                  <div className="message-row message-row-assistant">
                    <div className="chat-avatar chat-avatar-assistant">R</div>
                    <div className="chat-bubble chat-bubble-assistant">
                      <div className="chat-bubble-meta">
                        <span>RAG 助手</span>
                        <span>正在生成...</span>
                      </div>
                      <div className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="mt-4 sm:mt-6">
                <div className="glass-input flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-black/10">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="像在 ChatGPT 一样提问，但答案包含您的知识库..."
                    className="composer-textarea"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSubmit(event as unknown as React.FormEvent);
                      }
                    }}
                    disabled={isStreaming}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>⌘ + Enter 快速发送</span>
                      <span className="hidden md:inline">Shift + Enter 换行</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={`mobile-${prompt.label}`}
                          type="button"
                          className="quick-action md:hidden"
                          onClick={() => handleQuickPrompt(prompt.value)}
                        >
                          {prompt.label}
                        </button>
                      ))}
                      <button
                        type="submit"
                        disabled={!input.trim() || isStreaming}
                        className="send-button"
                      >
                        {isStreaming ? '发送中…' : '发送'}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-300/90">{error}</p>}
                </div>
              </form>

            </div>

          </section>

          <aside className="glass-panel hidden flex-col justify-between rounded-3xl border border-white/10 p-5 md:flex">
            <div>
              <h3 className="text-base font-semibold text-white/90">会话摘要</h3>
              <p className="mt-2 text-sm text-white/60">
                {messages.length === 0 ? '等待您的第一个问题。' : `已交换 ${messages.length} 条消息。`}
              </p>

              {authData?.config && (
                <div className="mt-6 space-y-4 text-sm text-white/70">
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-white/50">语言模型</h4>
                    <p className="mt-1 text-sm font-medium text-white/80">
                      {authData.config.llm_provider?.toUpperCase()} · {authData.config.llm_model}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-white/50">向量检索</h4>
                    <p className="mt-1 text-sm font-medium text-white/80">
                      {authData.config.embedding_provider?.toUpperCase()} · {authData.config.embedding_model}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                <InfoIcon className="h-4 w-4" />
                小贴士
              </h4>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/60">
                <li>• 使用自然语言与助手沟通，引用文档会自动匹配。</li>
                <li>• 可以通过快捷提示快速切换任务上下文。</li>
                <li>• 在知识库页面上传新文档，助手将即时学习。</li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
