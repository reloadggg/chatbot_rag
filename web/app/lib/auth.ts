// 认证状态管理工具

export interface UserConfig {
  llm_provider: string;
  llm_model: string;
  llm_api_key: string;
  llm_base_url?: string;
  embedding_provider: string;
  embedding_model: string;
  embedding_api_key: string;
  embedding_base_url?: string;
}

export interface AuthData {
  access_token: string;
  token_type: string;
  user_type: 'system' | 'guest';
  config: UserConfig;
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

class AuthManager {
  private static instance: AuthManager;
  private accessToken: string | null = null;
  private userType: 'system' | 'guest' | null = null;
  private userConfig: UserConfig | null = null;
  private providers: AuthData['providers'] | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // 从localStorage加载数据
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.userType = localStorage.getItem('user_type') as 'system' | 'guest' | null;
      
      const configStr = localStorage.getItem('user_config');
      if (configStr) {
        try {
          this.userConfig = JSON.parse(configStr);
        } catch (e) {
          console.error('解析用户配置失败:', e);
          this.userConfig = null;
        }
      }

      const providersStr = localStorage.getItem('providers');
      if (providersStr) {
        try {
          this.providers = JSON.parse(providersStr);
        } catch (e) {
          console.error('解析提供商信息失败:', e);
          this.providers = null;
        }
      }
    }
  }

  // 保存到localStorage
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      if (this.accessToken) {
        localStorage.setItem('access_token', this.accessToken);
      } else {
        localStorage.removeItem('access_token');
      }

      if (this.userType) {
        localStorage.setItem('user_type', this.userType);
      } else {
        localStorage.removeItem('user_type');
      }

      if (this.userConfig) {
        localStorage.setItem('user_config', JSON.stringify(this.userConfig));
      } else {
        localStorage.removeItem('user_config');
      }

      if (this.providers) {
        localStorage.setItem('providers', JSON.stringify(this.providers));
      } else {
        localStorage.removeItem('providers');
      }
    }
  }

  // 设置认证数据
  public setAuthData(data: AuthData): void {
    this.accessToken = data.access_token;
    this.userType = data.user_type;
    this.userConfig = data.config;
    this.providers = data.providers;
    this.saveToStorage();
  }

  // 清除认证数据
  public clearAuth(): void {
    this.accessToken = null;
    this.userType = null;
    this.userConfig = null;
    this.providers = null;
    this.saveToStorage();
  }

  // 获取访问令牌
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  // 获取用户类型
  public getUserType(): 'system' | 'guest' | null {
    return this.userType;
  }

  // 获取用户配置
  public getUserConfig(): UserConfig | null {
    return this.userConfig;
  }

  // 获取提供商信息
  public getProviders(): AuthData['providers'] | null {
    return this.providers;
  }

  // 检查是否已登录
  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // 检查是否为系统用户
  public isSystemUser(): boolean {
    return this.userType === 'system';
  }

  // 检查是否为游客用户
  public isGuestUser(): boolean {
    return this.userType === 'guest';
  }

  // 获取认证头
  public getAuthHeader(): Record<string, string> {
    if (this.accessToken) {
      return {
        'Authorization': `Bearer ${this.accessToken}`
      };
    }
    return {};
  }

  // 验证并跳转到登录页面
  public requireAuth(router: any): boolean {
    if (!this.isAuthenticated()) {
      router.push('/login');
      return false;
    }
    return true;
  }

  // 获取当前用户的API配置
  public getCurrentApiConfig(): Record<string, any> | null {
    return this.userConfig;
  }

  // 获取当前用户的LLM提供商
  public getCurrentLLMProvider(): string {
    return this.userConfig?.llm_provider || 'openai';
  }

  // 获取当前用户的嵌入模型提供商
  public getCurrentEmbeddingProvider(): string {
    return this.userConfig?.embedding_provider || 'openai';
  }

  // 检查特定提供商是否可用
  public isProviderAvailable(providerType: 'llm' | 'embedding', providerName: string): boolean {
    if (!this.providers) return false;
    
    const providers = providerType === 'llm' ? this.providers.llm_providers : this.providers.embedding_providers;
    const provider = providers.find(p => p.name === providerName);
    return provider?.available || false;
  }

  // 登出
  public logout(router: any): void {
    this.clearAuth();
    router.push('/login');
  }

  // 检查token是否过期（简单检查）
  public isTokenExpired(): boolean {
    // 这里可以实现更复杂的token过期检查
    // 目前只是检查是否存在token
    return !this.isAuthenticated();
  }

  // 刷新用户信息（从localStorage重新加载）
  public refresh(): void {
    this.loadFromStorage();
  }
}

// 导出单例实例
export const authManager = AuthManager.getInstance();

// 便捷函数
export const isAuthenticated = (): boolean => authManager.isAuthenticated();
export const getAccessToken = (): string | null => authManager.getAccessToken();
export const getUserType = (): 'system' | 'guest' | null => authManager.getUserType();
export const getAuthHeader = (): Record<string, string> => authManager.getAuthHeader();
export const logout = (router: any): void => authManager.logout(router);

// 默认导出
export default authManager;