'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../lib/api';

interface Document {
  file_id: string;
  filename: string;
  file_size: number;
  created_at: number;
  status: string;
  text_length?: number;
  chunks_count?: number;
}

interface DocumentStats {
  total_files: number;
  total_size: number;
  vector_db_stats: {
    document_count: number;
    vector_db: string;
    embedding_model: string;
    status: string;
  };
  files: Document[];
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  // 支持的文件类型
  const supportedTypes = ['.pdf', '.txt', '.md', '.json'];

  // 获取文档列表
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/documents'));
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('获取文档列表失败:', error);
    }
  }, []);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/documents/stats'));
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchDocuments(), fetchStats()]);
    setIsLoading(false);
  }, [fetchDocuments, fetchStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件类型
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!supportedTypes.includes(fileExtension)) {
        alert(`不支持的文件类型。支持的类型: ${supportedTypes.join(', ')}`);
        return;
      }

      // 检查文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小超过10MB限制');
        return;
      }

      setSelectedFile(file);
    }
  };

  // 文件上传处理
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('请选择要上传的文件');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (description.trim()) {
        formData.append('description', description);
      }
      formData.append('process', 'true');

      const response = await fetch(apiUrl('/upload'), {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`文件上传成功！\n文件名: ${result.filename}\n文本长度: ${result.text_length}字符\n分块数: ${result.chunks_count}`);
        
        // 刷新数据
        await loadData();
        
        // 重置表单
        setSelectedFile(null);
        setDescription('');
      } else {
        const error = await response.json();
        alert(`上传失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请检查网络连接');
    } finally {
      setIsUploading(false);
    }
  };

  // 删除文档
  const handleDelete = async (fileId: string, filename: string) => {
    if (!confirm(`确定要删除文件 "${filename}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/documents/${fileId}`), {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('文件删除成功');
        await loadData();
      } else {
        const error = await response.json();
        alert(`删除失败: ${error.detail}`);
      }
    } catch (error) {
      console.error('文件删除失败:', error);
      alert('文件删除失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载知识库...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">知识库管理</h1>
          <p className="text-gray-600 mt-2">上传和管理您的文档，构建智能知识库</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">文档数量</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_files}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总大小</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatFileSize(stats.total_size)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">向量文档</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.vector_db_stats.document_count}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 文件上传区域 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">上传文档</h2>
            
            <div className="space-y-4">
              {/* 文件选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择文件
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.txt,.md,.json"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    border border-gray-300 rounded-lg cursor-pointer"
                  disabled={isUploading}
                />
                <p className="mt-1 text-sm text-gray-500">
                  支持的格式: {supportedTypes.join(', ')} (最大10MB)
                </p>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文档描述（可选）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简要描述这个文档的内容..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isUploading}
                />
              </div>

              {/* 选中的文件信息 */}
              {selectedFile && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900">已选择文件:</h3>
                  <p className="text-blue-800">{selectedFile.name}</p>
                  <p className="text-sm text-blue-600">大小: {formatFileSize(selectedFile.size)}</p>
                </div>
              )}

              {/* 上传按钮 */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    上传中...
                  </>
                ) : (
                  '开始上传'
                )}
              </button>
            </div>
          </div>

          {/* 文档列表 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">已上传文档</h2>
            
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">暂无上传的文档</p>
                <p className="text-sm text-gray-400 mt-1">上传您的第一个文档开始构建知识库</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.file_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.filename}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.file_id, doc.filename)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除文档"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使用说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">支持的文件格式:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>PDF - 支持文本提取</li>
                <li>TXT - 纯文本文件</li>
                <li>MD - Markdown格式</li>
                <li>JSON - JSON数据文件</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">上传说明:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>单个文件最大10MB</li>
                <li>文件会自动分块处理</li>
                <li>支持添加描述信息</li>
                <li>上传后立即添加到知识库</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
