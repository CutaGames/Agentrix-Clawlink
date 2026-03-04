import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { User, UserRole, KYCLevel } from '../types/user'

interface UserContextType {
  user: User | null
  currentRole: UserRole
  isAuthenticated: boolean
  isLoading: boolean
  login: (userData: Partial<User>) => void
  logout: () => void
  switchRole: (role: UserRole) => void
  registerRole: (role: 'merchant' | 'agent' | 'developer', data?: any) => Promise<void>
  updateKYC: (kycLevel: KYCLevel, status: 'pending' | 'approved' | 'rejected') => void
  updateUser: (userData: Partial<User>) => void
}

const UserContext = createContext<UserContextType | null>(null)

function generateAgentrixId(): string {
  const prefix = 'AX'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole>('user')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initUser = async () => {
      const savedUser = localStorage.getItem('agentrix_user')
      const savedRole = localStorage.getItem('agentrix_current_role') as UserRole
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        setCurrentRole(savedRole || parsedUser.role || 'user')
        
        // 🔄 从后端重新获取用户信息以同步roles
        try {
          const { apiClient } = await import('../lib/api/client')
          const response = await apiClient.get<{ user: any }>('/users/profile')
          if (response && response.user && response.user.roles) {
            const updatedUser: User = {
              ...parsedUser,
              roles: response.user.roles as UserRole[],
              email: response.user.email || parsedUser.email,
              nickname: response.user.nickname || parsedUser.nickname,
            }
            console.log('✅ Synced user roles from backend:', updatedUser.roles)
            setUser(updatedUser)
            localStorage.setItem('agentrix_user', JSON.stringify(updatedUser))
          }
        } catch (err) {
          console.warn('Failed to sync user info from backend, using cached data:', err)
        }
      }
      setIsLoading(false)
    }
    
    initUser()
  }, [])

  const login = (userData: Partial<User>) => {
    const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('agentrix_user') : null
    const savedUser = savedUserStr ? (JSON.parse(savedUserStr) as User) : null
    const existingUser = userData.agentrixId ? null : user || savedUser

    const resolvedRoles =
      (userData.roles as UserRole[] | undefined) ||
      existingUser?.roles ||
      ['user']

    const primaryRole =
      (userData.role as UserRole | undefined) ||
      resolvedRoles[0] ||
      existingUser?.role ||
      'user'

    const newUser: User = {
      id: userData.id || existingUser?.id || 'user_' + Date.now(),
      agentrixId: userData.agentrixId || existingUser?.agentrixId || generateAgentrixId(),
      role: primaryRole,
      roles: resolvedRoles as UserRole[],
      email: userData.email ?? existingUser?.email,
      walletAddress: userData.walletAddress ?? existingUser?.walletAddress,
      kycLevel: userData.kycLevel || existingUser?.kycLevel || 'none',
      kycStatus: userData.kycStatus || existingUser?.kycStatus || 'none',
      createdAt: userData.createdAt || existingUser?.createdAt || new Date().toISOString()
    }

    setUser(newUser)
    setCurrentRole(primaryRole)
    localStorage.setItem('agentrix_user', JSON.stringify(newUser))
    localStorage.setItem('agentrix_current_role', primaryRole)
  }

  const logout = async () => {
    // 清除API token
    try {
      const { authApi } = await import('../lib/api/auth.api')
      authApi.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    }
    
    // 清除用户状态
    setUser(null)
    setCurrentRole('user')
    localStorage.removeItem('agentrix_user')
    localStorage.removeItem('agentrix_current_role')
    
    // 清除所有钱包连接数据（确保完全登出）
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agentrix_wallets')
      localStorage.removeItem('agentrix_default_wallet')
    }
    
    // 注意：Web3断开需要在组件中调用，因为不能在context中调用hook
  }

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      setCurrentRole(role)
      localStorage.setItem('agentrix_current_role', role)
    }
  }

  const registerRole = async (role: 'merchant' | 'agent' | 'developer', data?: any) => {
    if (!user) return

    try {
      // 获取推广 ID
      const referralId = typeof window !== 'undefined' ? localStorage.getItem('agentrix_referral_id') : null;

      // 调用后端API注册角色
      const { apiClient } = await import('../lib/api/client')
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        user: {
          id: string;
          agentrixId: string;
          roles: string[];
          email?: string;
          nickname?: string;
        };
      }>('/users/register-role', { 
        role, 
        referralId,
        ...data 
      })

      if (response?.success && response?.user) {
        console.log('✅ Backend role registration success:', response.user);
        // 使用后端返回的用户数据更新本地状态
        const updatedUser: User = {
          ...user,
          role: role as UserRole, // 设置为当前新注册的角色
          roles: response.user.roles as UserRole[],
          email: response.user.email || user.email,
        }
        
        console.log('🔄 Updating user state with roles:', updatedUser.roles);
        setUser(updatedUser)
        localStorage.setItem('agentrix_user', JSON.stringify(updatedUser))
        
        setCurrentRole(role as UserRole)
        localStorage.setItem('agentrix_current_role', role)
      } else {
        throw new Error('角色注册失败')
      }
    } catch (error: any) {
      console.error('注册角色失败:', error)
      
      // 如果后端API失败，降级为本地更新（确保用户体验）
      const updatedRoles = user.roles.includes(role as UserRole) ? user.roles : [...user.roles, role as UserRole]
      const updatedUser: User = {
        ...user,
        role: role as UserRole, // 设置为当前新注册的角色
        roles: updatedRoles
      }

      console.log('🔄 Fallback: Updating user state with roles:', updatedUser.roles);
      setUser(updatedUser)
      localStorage.setItem('agentrix_user', JSON.stringify(updatedUser))

      setCurrentRole(role as UserRole)
      localStorage.setItem('agentrix_current_role', role)
      
      // 不抛出错误，让用户继续使用
      console.warn('后端注册失败，使用本地状态更新')
    }
  }

  const updateKYC = (kycLevel: KYCLevel, status: 'pending' | 'approved' | 'rejected') => {
    if (!user) return

    const updatedUser: User = {
      ...user,
      kycLevel,
      kycStatus: status
    }

    setUser(updatedUser)
    localStorage.setItem('agentrix_user', JSON.stringify(updatedUser))
  }

  const updateUser = (userData: Partial<User>) => {
    if (!user) return

    const updatedUser: User = {
      ...user,
      ...userData
    }

    setUser(updatedUser)
    localStorage.setItem('agentrix_user', JSON.stringify(updatedUser))
  }

  return (
    <UserContext.Provider
      value={{
        user,
        currentRole,
        isAuthenticated: !!user && !!(typeof window !== 'undefined' && localStorage.getItem('access_token')),
        isLoading,
        login,
        logout,
        switchRole,
        registerRole,
        updateKYC,
        updateUser
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
