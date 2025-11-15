'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { apiUrl } from '../../lib/api';
import authManager, { type AuthData } from '../lib/auth';
import { ChatBubbleIcon, LogoutIcon } from '../../components/icons';

interface ConversationSummary {
  session_id: string;
  title: string;
  user_type: string;
  created_at: number;
  updated_at: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

interface AuthConfigResponse {
  user_type: 'system' | 'guest';
  config: Record<string, any>;
  providers: AuthData['providers'];
  session?: {
    session_id: string;
    expires_at: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  streaming?: boolean;
}

const formatTime = (timestamp: Date) =>
  timestamp.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatRelativeTime = (epochSeconds: number) => {
  const diff = Date.now() - epochSeconds * 1000;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return new Date(epochSeconds * 1000).toLocaleDateString();
};

const createEmptyMessage = (role: 'user' | 'assistant', content: string): Message => ({
  id: `${role}-${crypto.randomUUID()}`,
  role,
  content,
  createdAt: new Date(),
});

export default function ChatPage() {
  const router = useRouter();
  const [authInfo, setAuthInfo] = useState<AuthConfigResponse | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventSourceRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const autoResizeComposer = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 120), 260)}px`;
  }, []);

  useEffect(autoResizeComposer, [input, autoResizeComposer]);

  useEffect(() => {
    if (!authManager.requireAuth(router)) {
      return;
    }

    const loadInitial = async () => {
      try {
        const response = await fetch(apiUrl('/auth/config'), {
          headers: authManager.getAuthHeader(),
        });
        if (response.status === 401) {
          authManager.logout(router);
          return;
        }
        if (!response.ok) {
          throw new Error('无法获取用户配置');
        }
        const data = (await response.json()) as AuthConfigResponse;
        setAuthInfo(data);
      } catch (err) {
        console.error(err);
        setError('加载用户配置失败，请稍后再试。');
      }
    };

    const loadConversations = async () => {
      try {
        const response = await fetch(apiUrl('/sessions'), {
          headers: authManager.getAuthHeader(),
        });
        if (response.status === 401) {
          authManager.logout(router);
          return;
        }
        if (!response.ok) {
          throw new Error('获取会话列表失败');
        }
        const data = (await response.json()) as ConversationSummary[];
        setConversations(data);
      } catch (err) {
        console.error(err);
        setError('无法加载会话列表');
      }
    };

    loadInitial().then(loadConversations);
  }, [router]);

  useEffect(() => {
    if (!authInfo) return;
    if (authInfo.session?.session_id) {
      setActiveSession(authInfo.session.session_id);
    } else if (!activeSession && conversations.length === 0) {
      setActiveSession(crypto.randomUUID());
    }
  }, [authInfo, conversations, activeSession]);

  const fetchMessages = useCallback(
    async (sessionId: string) => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(apiUrl(`/sessions/${sessionId}/messages`), {
          headers: authManager.getAuthHeader(),
        });
        if (response.status === 401) {
          authManager.logout(router);
          return;
        }
        if (!response.ok) {
          throw new Error('加载历史记录失败');
        }
        const history = (await response.json()) as ConversationMessage[];
        const formatted = history.map((item) => ({
          id: `${item.role}-${item.created_at}`,
          role: item.role,
          content: item.content,
          createdAt: new Date(item.created_at * 1000),
        }));
        setMessages(formatted);
      } catch (err) {
        console.error(err);
        setError('加载对话历史时出错');
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!activeSession) return;
    if (conversations.some((item) => item.session_id === activeSession)) {
      fetchMessages(activeSession);
    } else if (authInfo?.session?.session_id === activeSession) {
      fetchMessages(activeSession);
    } else {
      setMessages([]);
    }
  }, [activeSession, conversations, authInfo, fetchMessages]);

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/sessions'), {
        headers: authManager.getAuthHeader(),
      });
      if (response.ok) {
        const data = (await response.json()) as ConversationSummary[];
        setConversations(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isStreaming) return;
    if (!authManager.isAuthenticated()) {
      authManager.logout(router);
      return;
    }

    setError(null);
    const sessionId = activeSession ?? crypto.randomUUID();
    if (!activeSession) {
      setActiveSession(sessionId);
    }

    const userMessage = createEmptyMessage('user', input);
    setMessages((prev) => [...prev, userMessage, createEmptyMessage('assistant', '')]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch(
        apiUrl(`/stream?question=${encodeURIComponent(userMessage.content)}&session_id=${sessionId}`),
        {
          headers: authManager.getAuthHeader(),
        }
      );
      if (response.status === 401) {
        authManager.logout(router);
        return;
      }
      if (!response.body || !response.ok) {
        throw new Error('网络请求失败');
      }
      const reader = response.body.getReader();
      eventSourceRef.current = reader;
      const decoder = new TextDecoder();
      let assistantContent = '';

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
            if (data.status === 'done') continue;
            if (data.error) throw new Error(data.error);
            if (data.chunk) {
              assistantContent += data.chunk;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === 'assistant') {
                  last.content = assistantContent;
                  last.createdAt = new Date();
                }
                return next;
              });
            }
          } catch (err) {
            console.error('解析流式响应失败', err);
          }
        }
      }

      await refreshConversations();
      fetchMessages(sessionId);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        createEmptyMessage('assistant', '抱歉，生成回复时出现问题，请稍后再试。'),
      ]);
    } finally {
      setIsStreaming(false);
      eventSourceRef.current = null;
    }
  };

  const handleNewConversation = () => {
    if (!authManager.isSystemUser()) {
      setError('游客模式暂不支持多会话');
      return;
    }
    const newId = crypto.randomUUID();
    const now = Date.now() / 1000;
    setConversations((prev) => [
      { session_id: newId, title: '新的对话', user_type: 'system', created_at: now, updated_at: now },
      ...prev,
    ]);
    setActiveSession(newId);
    setMessages([]);
  };

  const handleRename = async (conversation: ConversationSummary) => {
    const title = prompt('新的会话标题', conversation.title);
    if (!title) return;
    try {
      const response = await fetch(apiUrl(`/sessions/${conversation.session_id}/rename`), {
        method: 'POST',
        headers: {
          ...authManager.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      if (response.ok) {
        await refreshConversations();
      }
    } catch (err) {
      console.error(err);
      setError('重命名会话失败');
    }
  };

  const handleDelete = async (conversation: ConversationSummary) => {
    if (!confirm(`确定删除会话「${conversation.title}」吗？`)) return;
    try {
      const response = await fetch(apiUrl(`/sessions/${conversation.session_id}`), {
        method: 'DELETE',
        headers: authManager.getAuthHeader(),
      });
      if (response.ok) {
        await refreshConversations();
        if (activeSession === conversation.session_id) {
          setActiveSession(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error(err);
      setError('删除会话失败');
    }
  };

  const activeConversation = conversations.find((conv) => conv.session_id === activeSession);

  const sessionInfo = authInfo?.session;

  const providerBadges = useMemo(() => {
    if (!authInfo?.providers) return [] as { name: string; available: boolean }[];
    return authInfo.providers.llm_providers.map((provider) => ({
      name: provider.name,
      available: provider.available,
    }));
  }, [authInfo]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-72 flex-col border-r border-white/10 bg-slate-900/60 p-5 md:flex">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.3em] text-slate-300">
            RAG LAB
          </Link>
          <button
            onClick={() => authManager.logout(router)}
            className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="退出登录"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleNewConversation}
          className="mt-6 flex items-center justify-center rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700/80"
        >
          新建对话
        </button>
        <div className="mt-6 flex-1 space-y-2 overflow-y-auto pr-1">
          {conversations.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-slate-400">
              尚未生成任何对话，发送第一条消息后会自动创建。
            </div>
          )}
          {conversations.map((conversation) => {
            const isActive = conversation.session_id === activeSession;
            return (
              <div
                key={conversation.session_id}
                className={`group rounded-xl border px-3 py-2 text-sm transition ${
                  isActive
                    ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                    : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <button
                  onClick={() => setActiveSession(conversation.session_id)}
                  className="flex w-full flex-col text-left"
                >
                  <span className="line-clamp-1 font-medium">{conversation.title || '新的对话'}</span>
                  <span className="text-xs text-slate-400">
                    {formatRelativeTime(conversation.updated_at || conversation.created_at)}
                  </span>
                </button>
                {authManager.isSystemUser() && (
                  <div className="mt-2 hidden items-center justify-end gap-2 text-xs text-slate-400 group-hover:flex">
                    <button
                      onClick={() => handleRename(conversation)}
                      className="rounded border border-white/10 px-2 py-0.5 hover:border-white/30 hover:text-white"
                    >
                      重命名
                    </button>
                    <button
                      onClick={() => handleDelete(conversation)}
                      className="rounded border border-white/10 px-2 py-0.5 hover:border-red-400 hover:text-red-300"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {authInfo?.user_type === 'guest' && (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
            <p>游客模式已启用，单个文件上传上限 50 MB。</p>
            {sessionInfo && (
              <p className="mt-2 break-all text-emerald-200/80">
                会话 ID：{sessionInfo.session_id}
                <br />有效期至：{new Date(sessionInfo.expires_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-white/10 bg-slate-900/60 px-6 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">知识库对话</h1>
              <p className="text-sm text-slate-400">
                {authInfo?.user_type === 'system' ? '系统模式 · 完全访问权限' : '临时访客模式 · 有效期 12 小时'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              {providerBadges.map((badge) => (
                <span
                  key={badge.name}
                  className={`rounded-full px-3 py-1 ${
                    badge.available ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {badge.name.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <section className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              {isLoadingHistory && messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
                  正在加载历史对话…
                </div>
              ) : messages.length === 0 ? (
                <div className="mt-20 flex flex-col items-center gap-4 text-center text-slate-400">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] p-4 text-slate-200">
                    <ChatBubbleIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">开始新的对话</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      结合知识库提出问题，支持 Markdown 和代码渲染。
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={`${message.id}-${index}`} className="mb-6 flex gap-4">
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        message.role === 'user'
                          ? 'bg-sky-500/80 text-white'
                          : 'bg-emerald-500/20 text-emerald-200'
                      }`}
                    >
                      {message.role === 'user' ? '我' : 'R'}
                    </div>
                    <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{message.role === 'user' ? '你' : '知识助手'}</span>
                        <span>{formatTime(message.createdAt)}</span>
                      </div>
                      <div className="prose prose-invert prose-sm mt-2 max-w-none">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isStreaming && (
                <div className="mb-6 flex gap-4">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                    R
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>知识助手</span>
                      <span>正在生成</span>
                    </div>
                    <div className="mt-3 flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 bg-slate-900/80 px-4 py-4 sm:px-8">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-black/40">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="提出你的问题，Shift + Enter 换行"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSubmit(event as unknown as React.FormEvent);
                    }
                  }}
                  rows={4}
                  className="w-full resize-none border-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>当前会话：{activeConversation?.title || '新的对话'}</span>
                  <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-500/40"
                  >
                    发送
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>

      <aside className="hidden w-80 flex-col border-l border-white/10 bg-slate-900/60 p-6 xl:flex">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-slate-200">提供商状态</h2>
          <div className="mt-3 space-y-3 text-xs text-slate-400">
            {authInfo?.providers.llm_providers.map((provider) => (
              <div key={provider.name} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-medium uppercase text-slate-100">{provider.name}</span>
                  <span className={provider.available ? 'text-emerald-300' : 'text-slate-500'}>
                    {provider.available ? '可用' : '未配置'}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                  {provider.models.slice(0, 5).map((model) => (
                    <li key={model}>{model}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs text-slate-400">
          <h2 className="text-sm font-semibold text-slate-200">知识库操作</h2>
          <p className="mt-2">
            上传或管理文档请前往 <Link href="/docs" className="text-sky-300 hover:text-sky-200">知识库页面</Link>。
          </p>
          <p className="mt-2">
            查看模型可用性请访问 <Link href="/providers" className="text-sky-300 hover:text-sky-200">提供商配置</Link>。
          </p>
        </div>
      </aside>
    </div>
  );
}
