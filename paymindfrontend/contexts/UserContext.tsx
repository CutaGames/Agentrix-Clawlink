import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { User, UserRole, KYCLevel } from '../types/user'

interface UserContextType {
  user: User | null
  currentRole: UserRole
  isAuthenticated: boolean
  login: (userData: Partial<User>) => void
  logout: () => void
  switchRole: (role: UserRole) => void
  registerRole: (role: 'merchant' | 'agent') => Promise<void>
  updateKYC: (kycLevel: KYCLevel, status: 'pending' | 'approved' | 'rejected') => void
  updateUser: (userData: Partial<User>) => void
}

const UserContext = createContext<UserContextType | null>(null)

function generatePayMindId(): string {
  const prefix = 'PM'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole>('user')

  useEffect(() => {
    const savedUser = localStorage.getItem('paymind_user')
    const savedRole = localStorage.getItem('paymind_current_role') as UserRole
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      setCurrentRole(savedRole || parsedUser.role || 'user')
    }
  }, [])

  const login = (userData: Partial<User>) => {
    const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('paymind_user') : null
    const savedUser = savedUserStr ? (JSON.parse(savedUserStr) as User) : null
    const existingUser = userData.paymindId ? null : user || savedUser

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
      paymindId: userData.paymindId || existingUser?.paymindId || generatePayMindId(),
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
    localStorage.setItem('paymind_user', JSON.stringify(newUser))
    localStorage.setItem('paymind_current_role', primaryRole)
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
    localStorage.removeItem('paymind_user')
    localStorage.removeItem('paymind_current_role')
    
    // 清除所有钱包连接数据（确保完全登出）
    if (typeof window !== 'undefined') {
      localStorage.removeItem('paymind_wallets')
      localStorage.removeItem('paymind_default_wallet')
    }
    
    // 注意：Web3断开需要在组件中调用，因为不能在context中调用hook
  }

  const switchRole = (role: UserRole) => {
    if (user && user.roles.includes(role)) {
      setCurrentRole(role)
      localStorage.setItem('paymind_current_role', role)
    }
  }

  const registerRole = async (role: 'merchant' | 'agent') => {
    if (!user) return

    await new Promise(resolve => setTimeout(resolve, 1500))

    const updatedRoles = [...user.roles, role]
    const updatedUser: User = {
      ...user,
      roles: updatedRoles
    }

    setUser(updatedUser)
    localStorage.setItem('paymind_user', JSON.stringify(updatedUser))

    setCurrentRole(role)
    localStorage.setItem('paymind_current_role', role)
  }

  const updateKYC = (kycLevel: KYCLevel, status: 'pending' | 'approved' | 'rejected') => {
    if (!user) return

    const updatedUser: User = {
      ...user,
      kycLevel,
      kycStatus: status
    }

    setUser(updatedUser)
    localStorage.setItem('paymind_user', JSON.stringify(updatedUser))
  }

  const updateUser = (userData: Partial<User>) => {
    if (!user) return

    const updatedUser: User = {
      ...user,
      ...userData
    }

    setUser(updatedUser)
    localStorage.setItem('paymind_user', JSON.stringify(updatedUser))
  }

  return (
    <UserContext.Provider
      value={{
        user,
        currentRole,
        isAuthenticated: !!user,
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
