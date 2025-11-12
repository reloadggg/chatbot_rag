'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Provider {
  name: string;
  models: string[];
  available: boolean;
  description?: string;
}

interface ProvidersData {
  llm_providers: Provider[];
  embedding_providers: Provider[];
  current_config: {
    llm_provider: string;
    embedding_provider: string;
    llm_model: string;
    embedding_model: string;
  };
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProvidersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取提供商信息
  const fetchProviders = async () => {
    try {
      const response = await fetch('http://localhost:8001/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (error) {
      console.error('获取提供商信息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载提供商信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">AI提供商配置</h1>
          <p className="text-gray-600 mt-2">管理和配置不同的AI模型提供商</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {providers && (
          <div className="space-y-8">
            {/* 当前配置 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">当前配置</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">语言模型</h3>
                  <div className="p-3 bg-blue-50 rounded-lg border">
                    <p className="font-medium text-blue-900">{providers.current_config.llm_provider}</p>
                    <p className="text-sm text-blue-700">{providers.current_config.llm_model}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">嵌入模型</h3>
                  <div className="p-3 bg-green-50 rounded-lg border">
                    <p className="font-medium text-green-900">{providers.current_config.embedding_provider}</p>
                    <p className="text-sm text-green-700">{providers.current_config.embedding_model}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 语言模型提供商 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">语言模型提供商</h2>
              <div className="space-y-4">
                {providers.llm_providers.map((provider) => (
                  <div
                    key={provider.name}
                    className={`p-4 rounded-lg border ${
                      provider.available
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {provider.name === 'openai' ? 'OpenAI' : 'Google Gemini'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {provider.available
                            ? '已配置并可用'
                            : '需要配置API密钥'}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          provider.available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {provider.available ? '可用' : '未配置'}
                      </div>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">支持的模型：</h4>
                      <div className="flex flex-wrap gap-2">
                        {provider.models.map((model) => (
                          <span
                            key={model}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 嵌入模型提供商 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">嵌入模型提供商</h2>
              <div className="space-y-4">
                {providers.embedding_providers.map((provider) => (
                  <div
                    key={provider.name}
                    className={`p-4 rounded-lg border ${
                      provider.available
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {provider.name === 'openai' ? 'OpenAI' : 'Google Gemini'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {provider.available
                            ? '已配置并可用'
                            : '需要配置API密钥'}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          provider.available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {provider.available ? '可用' : '未配置'}
                      </div>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">支持的模型：</h4>
                      <div className="flex flex-wrap gap-2">
                        {provider.models.map((model) => (
                          <span
                            key={model}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gemini特色功能 */}
            {providers.llm_providers.find(p => p.name === 'gemini')?.available && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Google Gemini 特色功能</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border">
                    <h3 className="font-medium text-blue-900 mb-2">📝 文件搜索</h3>
                    <p className="text-sm text-blue-800">上传PDF、图片等文件，基于内容进行智能问答</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border">
                    <h3 className="font-medium text-green-900 mb-2">🎨 多模态处理</h3>
                    <p className="text-sm text-green-800">支持文本、图片、PDF等多种格式的智能处理</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border">
                    <h3 className="font-medium text-purple-900 mb-2">⚡ 高性能</h3>
                    <p className="text-sm text-purple-800">支持大文件处理，响应速度快</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border">
                    <h3 className="font-medium text-orange-900 mb-2">🛡️ 安全过滤</h3>
                    <p className="text-sm text-orange-800">内置内容安全过滤，确保输出质量</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link 
                    href="/providers/gemini"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔗 访问Gemini功能
                  </Link>
                </div>
              </div>
            )}

            {/* 配置说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">配置说明</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• 在服务器 .env 文件中配置相应的 API 密钥</p>
                <p>• 支持同时使用多个提供商</p>
                <p>• 系统会根据配置自动选择合适的模型</p>
                <p>• Gemini 需要单独配置 GEMINI_API_KEY</p>
              </div>
            </div>
          </div>
        )}

        {!providers && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">无法加载提供商信息</h3>
            <p className="text-gray-600">请确保后端服务正在运行</p>
          </div>
        )}
      </main>
    </div>
  );
}