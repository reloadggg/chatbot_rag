'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '../../lib/api';
import { authManager, type AuthData } from '../lib/auth';
import { LockIcon, UserIcon, InfoIcon } from '../../components/icons';

interface AuthStatus {
  system_mode_enabled: boolean;
  auth_required: boolean;
  supported_modes: string[];
}

interface ProviderModel {
  name: string;
  models: string[];
  available: boolean;
}

interface ProvidersResponse {
  llm_providers: ProviderModel[];
  embedding_providers: ProviderModel[];
  current_config: {
    llm_provider: string;
    llm_model: string;
    embedding_provider: string;
    embedding_model: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [systemPassword, setSystemPassword] = useState('');
  const [guestSessionId, setGuestSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSystemLoading, setIsSystemLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, providersRes] = await Promise.all([
          fetch(apiUrl('/auth/status')),
          fetch(apiUrl('/providers')),
        ]);

        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
        if (providersRes.ok) {
          setProviders(await providersRes.json());
        }
      } catch (err) {
        console.error('加载登录上下文失败', err);
      }
    };

    load();
  }, []);

  const handleSystemLogin = async () => {
    if (!systemPassword) {
      setError('请输入系统密码');
      return;
    }

    setIsSystemLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: systemPassword, provider: 'env' }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || '系统登录失败');
      }

      const data = (await response.json()) as AuthData;
      authManager.setAuthData(data);
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || '系统登录失败');
    } finally {
      setIsSystemLoading(false);
    }
  };

  const handleGuestLogin = async (resumeSessionId?: string) => {
    setIsGuestLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = resumeSessionId ? { session_id: resumeSessionId.trim() } : {};
      const response = await fetch(apiUrl('/auth/guest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || '游客会话创建失败');
      }

      const data = (await response.json()) as AuthData;
      authManager.setAuthData(data);

      if (data.session_id) {
        try {
          await navigator.clipboard.writeText(data.session_id);
          setSuccess(`已为您复制临时会话 ID：${data.session_id}`);
        } catch (err) {
          setSuccess(`临时会话 ID：${data.session_id}`);
        }
      }

      router.push('/chat');
    } catch (err: any) {
      setError(err.message || '游客登录失败');
    } finally {
      setIsGuestLoading(false);
    }
  };

  const activeSessionId = authManager.getSessionId();
  const sessionExpiry = authManager.getSessionExpiry();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <span className="text-sm uppercase tracking-[0.4em] text-slate-500">RAG Workspace</span>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">登录到知识对话空间</h1>
          <p className="max-w-3xl text-base text-slate-400">
            系统用户可使用环境变量中的密码获得完全访问权限。未持有密码的访客可以申请 12 小时的临时会话，聊天与上传均会自动保存，可凭会话 ID 再次进入。
          </p>
        </header>

        {(error || success) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {error || success}
          </div>
        )}

        <main className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
              <LockIcon className="h-5 w-5 text-sky-400" />
              <span>系统密码登录</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">拥有运维密码？</h2>
            <p className="mt-2 text-sm text-slate-400">
              输入部署时在 <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-slate-200">.env</code> 中设置的 <code>AUTH_PASSWORD</code> 即可获得完整的知识库和模型权限。
            </p>
            {status && (
              <p className="mt-2 text-xs text-slate-500">
                {status.system_mode_enabled
                  ? '系统模式已启用，验证成功后可管理模型与知识库。'
                  : '尚未配置系统密码，目前仅支持临时会话模式。'}
              </p>
            )}

            <label className="mt-6 block text-sm font-medium text-slate-200">系统密码</label>
            <input
              type="password"
              value={systemPassword}
              onChange={(event) => setSystemPassword(event.target.value)}
              placeholder="请输入系统密码"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none ring-0 transition focus:border-sky-400 focus:bg-white/10"
            />

            <button
              onClick={handleSystemLogin}
              disabled={isSystemLoading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-base font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-500/50"
            >
              {isSystemLoading ? '登录中…' : '进入管理控制台'}
            </button>

            {providers && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-sm font-semibold text-slate-200">模型概览</h3>
                <p className="mt-1 text-xs text-slate-400">以下列表来自最新的提供商接口。</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {providers.llm_providers.map((provider) => (
                    <div key={provider.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span className="font-semibold uppercase tracking-wide text-slate-200">{provider.name}</span>
                        <span className={provider.available ? 'text-emerald-300' : 'text-slate-500'}>
                          {provider.available ? '已配置' : '待配置'}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-1 text-xs text-slate-400">
                        {provider.models.slice(0, 6).map((model) => (
                          <li key={model} className="truncate">{model}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-8 shadow-2xl shadow-black/40 backdrop-blur">
            <div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                <UserIcon className="h-5 w-5 text-emerald-400" />
                <span>游客模式</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">无需密码，快速体验</h2>
              <p className="mt-2 text-sm text-slate-400">
                游客会话保存 12 小时，允许上传不超过 50 MB 的文件。复制会话 ID 可以在有效期内重新进入对话。
              </p>

              <div className="mt-6 space-y-4">
                <button
                  onClick={() => handleGuestLogin()}
                  disabled={isGuestLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-base font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/50"
                >
                  {isGuestLoading ? '生成会话中…' : '生成新的临时会话'}
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">已有会话 ID？</label>
                  <div className="mt-2 flex flex-col gap-3 md:flex-row">
                    <input
                      type="text"
                      value={guestSessionId}
                      onChange={(event) => setGuestSessionId(event.target.value)}
                      placeholder="输入 36 位会话 ID"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:bg-white/10"
                    />
                    <button
                      onClick={() => handleGuestLogin(guestSessionId)}
                      disabled={!guestSessionId || isGuestLoading}
                      className="inline-flex items-center justify-center rounded-xl border border-emerald-400/50 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:border-emerald-400/20 disabled:text-emerald-200/50"
                    >
                      恢复会话
                    </button>
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                    <InfoIcon className="mt-0.5 h-4 w-4 text-emerald-300" />
                    如果浏览器已保存临时会话，将自动填充并续期，无需再次复制。
                  </p>
                </div>
              </div>
            </div>

            {(activeSessionId || sessionExpiry) && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-200">当前临时会话</h3>
                {activeSessionId && (
                  <p className="mt-2 break-all text-xs text-emerald-100/90">{activeSessionId}</p>
                )}
                {sessionExpiry && (
                  <p className="mt-1 text-xs text-emerald-200/70">有效期至：{new Date(sessionExpiry).toLocaleString()}</p>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
