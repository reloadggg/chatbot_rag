import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          RAG知识库机器人
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          基于检索增强生成技术的智能问答系统，支持文档上传和知识库管理
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/chat"
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            💬 智能问答
          </Link>
          
          <Link 
            href="/docs"
            className="inline-flex items-center px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg text-lg font-medium hover:bg-blue-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            📚 知识库管理
          </Link>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">智能问答</h3>
            </div>
            <p className="text-gray-600">基于RAG技术，结合知识库内容提供准确、实时的智能问答服务</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">文档管理</h3>
            </div>
            <p className="text-gray-600">支持PDF、TXT、MD等多种格式文档上传，自动分块处理，构建专属知识库</p>
          </div>
        </div>
      </div>
    </main>
  )
}