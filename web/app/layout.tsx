'use client';

import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authManager, isAuthenticated, getUserType, logout } from './lib/auth'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuth, setIsAuth] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      // 检查是否有token
      const token = authManager.getAccessToken()
      if (!token) {
        // 如果没有token，跳转到登录页
        router.push('/login')
        setIsLoading(false)
        return
      }

      // 验证token是否有效
      try {
        const response = await fetch('http://localhost:8001/auth/config', {
          headers: authManager.getAuthHeader()
        })

        if (response.ok) {
          const data = await response.json()
          setIsAuth(true)
          setUserType(data.user_type)
        } else {
          // token无效，清除并跳转到登录页
          authManager.clearAuth()
          router.push('/login')
        }
      } catch (error) {
        console.error('认证验证失败:', error)
        authManager.clearAuth()
        router.push('/login')
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  // 处理登出
  const handleLogout = () => {
    logout(router)
  }

  // 如果还在加载中，显示加载界面
  if (isLoading) {
    return (
      <html lang="zh">
        <body className={inter.className}>
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">正在验证登录状态...</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  // 如果未认证，只显示登录页面
  if (!isAuth) {
    return (
      <html lang="zh">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  // 已认证用户的主界面
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
                <span className="text-sm text-gray-500">
                  {userType === 'system' ? '🔐 系统用户' : '👤 游客用户'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  🚪 退出登录
                </button>
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
              <p className="mt-1">
                {userType === 'system' ? '系统模式 - 使用环境变量配置' : '游客模式 - 使用自定义API配置'}
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}