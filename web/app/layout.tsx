import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'RAG知识库机器人',
  description: '智能问答助手',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
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
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    💬 智能问答
                  </Link>
                  <Link 
                    href="/docs" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    📚 知识库管理
                  </Link>
                  <Link 
                    href="/providers" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    ⚙️ AI提供商
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">智能问答助手</span>
              </div>
            </div>
          </div>
        </nav>
        
        {/* 主要内容 */}
        <main className="min-h-screen">
          {children}
        </main>
        
        {/* 页脚 */}
        <footer className="bg-white border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="text-center text-gray-500 text-sm">
              <p>© 2024 RAG知识库机器人 - 基于检索增强生成技术</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}