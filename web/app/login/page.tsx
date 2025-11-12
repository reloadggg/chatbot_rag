'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuthResponse {
  access_token: string;
  token_type: string;
  user_type: string;
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

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'system' | 'guest'>('guest');
  const [systemPassword, setSystemPassword] = useState('');
  const [provider, setProvider] = useState('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [authStatus, setAuthStatus] = useState<any>(null);

  // 游客模式配置
  const [guestConfig, setGuestConfig] = useState({
    llm_provider: 'openai',
    llm_model: 'gpt-4o-mini',
    llm_api_key: '',
    llm_base_url: '',
    embedding_provider: 'openai',
    embedding_model: 'text-embedding-3-small',
    embedding_api_key: '',
    embedding_base_url: ''
  });

  // 获取认证状态
  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:8001/auth/status');
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
        
        // 根据系统模式设置默认认证模式
        if (data.system_mode_enabled) {
          setAuthMode('system');
        } else {
          setAuthMode('guest');
        }
      }
    } catch (error) {
      console.error('获取认证状态失败:', error);
    }
  };

  const handleSystemLogin = async () => {
    if (!systemPassword) {
      setError('请输入系统密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: systemPassword,
          provider: provider
        }),
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        
        // 保存token到localStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_type', data.user_type);
        localStorage.setItem('user_config', JSON.stringify(data.config));
        
        // 跳转到主页
        router.push('/');
      } else {
        const error = await response.json();
        setError(error.detail || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError('网络连接失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    // 验证配置
    const errors = validateGuestConfig();
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8001/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guestConfig),
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        
        // 保存token到localStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_type', data.user_type);
        localStorage.setItem('user_config', JSON.stringify(data.config));
        localStorage.setItem('providers', JSON.stringify(data.providers));
        
        // 跳转到主页
        router.push('/');
      } else {
        const error = await response.json();
        setError(error.detail || '登录失败');
      }
    } catch (error) {
      console.error('游客登录失败:', error);
      setError('网络连接失败');
    } finally {
      setIsLoading(false);
    }
  };

  const validateGuestConfig = (): string[] => {
    const errors: string[] = [];

    // 验证LLM配置
    if (!guestConfig.llm_api_key) {
      errors.push('请输入LLM API密钥');
    }
    if (guestConfig.llm_provider === 'openai' && !guestConfig.llm_api_key.startsWith('sk-')) {
      errors.push('OpenAI API密钥格式不正确');
    }
    if (guestConfig.llm_base_url && !guestConfig.llm_base_url.startsWith('http')) {
      errors.push('LLM BaseURL格式不正确');
    }

    // 验证嵌入模型配置
    if (!guestConfig.embedding_api_key) {
      errors.push('请输入嵌入模型API密钥');
    }
    if (guestConfig.embedding_provider === 'openai' && !guestConfig.embedding_api_key.startsWith('sk-')) {
      errors.push('OpenAI嵌入API密钥格式不正确');
    }
    if (guestConfig.embedding_base_url && !guestConfig.embedding_base_url.startsWith('http')) {
      errors.push('嵌入模型BaseURL格式不正确');
    }

    return errors;
  };

  const handleProviderChange = (provider: string, field: string, value: string) => {
    const config = { ...guestConfig };
    
    if (field === 'llm_provider') {
      config.llm_provider = provider;
      config.llm_model = provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-exp';
      config.llm_base_url = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com/v1beta';
    } else if (field === 'embedding_provider') {
      config.embedding_provider = provider;
      config.embedding_model = provider === 'openai' ? 'text-embedding-3-small' : 'models/embedding-001';
      config.embedding_base_url = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com/v1beta';
    }
    
    setGuestConfig(config);
  };

  const handleInputChange = (field: string, value: string) => {
    setGuestConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAuthModeChange = (mode: 'system' | 'guest') => {
    setAuthMode(mode);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">RAG知识库机器人</h1>
              <p className="text-gray-600 mt-1">智能问答系统</p>
            </div>
            <Link 
              href="/"
              className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              ← 返回主页
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">系统登录</h2>

          {/* 认证模式选择 */}
          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleAuthModeChange('system')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  authMode === 'system'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔐 系统登录
              </button>
              <button
                onClick={() => handleAuthModeChange('guest')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  authMode === 'guest'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👤 游客登录
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* 系统登录模式 */}
          {authMode === 'system' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统密码
                </label>
                <input
                  type="password"
                  value={systemPassword}
                  onChange={(e) => setSystemPassword(e.target.value)}
                  placeholder="请输入系统密码"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  默认提供商
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="env">环境变量配置</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              <button
                onClick={handleSystemLogin}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '登录中...' : '系统登录'}
              </button>
            </div>
          )}

          {/* 游客登录模式 */}
          {authMode === 'guest' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">游客模式说明</h3>
                <p className="text-sm text-blue-800">
                  游客模式下，您需要自行提供AI提供商的API密钥。系统不会保存您的密钥，所有配置仅在当前会话中有效。
                </p>
              </div>

              {/* LLM配置 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">语言模型配置</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      提供商
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleProviderChange('openai', 'llm_provider', 'openai')}
                        className={`px-4 py-2 rounded-lg border ${
                          guestConfig.llm_provider === 'openai'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        OpenAI
                      </button>
                      <button
                        onClick={() => handleProviderChange('gemini', 'llm_provider', 'gemini')}
                        className={`px-4 py-2 rounded-lg border ${
                          guestConfig.llm_provider === 'gemini'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Google Gemini
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型
                    </label>
                    <select
                      value={guestConfig.llm_model}
                      onChange={(e) => handleInputChange('llm_model', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {guestConfig.llm_provider === 'openai' ? (
                        <>
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </>
                      ) : (
                        <>
                          <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API 密钥 {guestConfig.llm_provider === 'openai' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      value={guestConfig.llm_api_key}
                      onChange={(e) => handleInputChange('llm_api_key', e.target.value)}
                      placeholder={guestConfig.llm_provider === 'openai' ? 'sk-...' : '输入Gemini API密钥'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base URL（可选）
                    </label>
                    <input
                      type="text"
                      value={guestConfig.llm_base_url}
                      onChange={(e) => handleInputChange('llm_base_url', e.target.value)}
                      placeholder={guestConfig.llm_provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com/v1beta'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 嵌入模型配置 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">嵌入模型配置</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      提供商
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleProviderChange('openai', 'embedding_provider', 'openai')}
                        className={`px-4 py-2 rounded-lg border ${
                          guestConfig.embedding_provider === 'openai'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        OpenAI
                      </button>
                      <button
                        onClick={() => handleProviderChange('gemini', 'embedding_provider', 'gemini')}
                        className={`px-4 py-2 rounded-lg border ${
                          guestConfig.embedding_provider === 'gemini'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Google Gemini
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型
                    </label>
                    <select
                      value={guestConfig.embedding_model}
                      onChange={(e) => handleInputChange('embedding_model', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {guestConfig.embedding_provider === 'openai' ? (
                        <>
                          <option value="text-embedding-3-small">Text Embedding 3 Small</option>
                          <option value="text-embedding-3-large">Text Embedding 3 Large</option>
                        </>
                      ) : (
                        <>
                          <option value="models/embedding-001">Embedding 001</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API 密钥 {guestConfig.embedding_provider === 'openai' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      value={guestConfig.embedding_api_key}
                      onChange={(e) => handleInputChange('embedding_api_key', e.target.value)}
                      placeholder={guestConfig.embedding_provider === 'openai' ? 'sk-...' : '输入Gemini API密钥'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base URL（可选）
                    </label>
                    <input
                      type="text"
                      value={guestConfig.embedding_base_url}
                      onChange={(e) => handleInputChange('embedding_base_url', e.target.value)}
                      placeholder={guestConfig.embedding_provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com/v1beta'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* 快速配置按钮 */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setGuestConfig({
                    llm_provider: 'openai',
                    llm_model: 'gpt-4o-mini',
                    llm_api_key: '',
                    llm_base_url: 'https://api.openai.com/v1',
                    embedding_provider: 'openai',
                    embedding_model: 'text-embedding-3-small',
                    embedding_api_key: '',
                    embedding_base_url: 'https://api.openai.com/v1'
                  })}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  OpenAI 默认配置
                </button>
                <button
                  onClick={() => setGuestConfig({
                    llm_provider: 'gemini',
                    llm_model: 'gemini-2.0-flash-exp',
                    llm_api_key: '',
                    llm_base_url: 'https://generativelanguage.googleapis.com/v1beta',
                    embedding_provider: 'gemini',
                    embedding_model: 'models/embedding-001',
                    embedding_api_key: '',
                    embedding_base_url: 'https://generativelanguage.googleapis.com/v1beta'
                  })}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  Gemini 默认配置
                </button>
              </div>

              <button
                onClick={handleGuestLogin}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '登录中...' : '游客登录'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}