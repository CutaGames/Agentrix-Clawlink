import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react'

export type AgentMode = 'personal' | 'merchant' | 'developer'

interface AgentModeContextValue {
  mode: AgentMode
  setMode: Dispatch<SetStateAction<AgentMode>>
  currentAgentId?: string
  setCurrentAgentId: Dispatch<SetStateAction<string | undefined>>
}

const AgentModeContext = createContext<AgentModeContextValue | null>(null)

export function AgentModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AgentMode>('personal')
  const [currentAgentId, setCurrentAgentId] = useState<string | undefined>(undefined)

  const value = useMemo(
    () => ({
      mode,
      setMode,
      currentAgentId,
      setCurrentAgentId,
    }),
    [mode, currentAgentId]
  )

  return <AgentModeContext.Provider value={value}>{children}</AgentModeContext.Provider>
}

export function useAgentMode() {
  const context = useContext(AgentModeContext)
  if (!context) {
    throw new Error('useAgentMode must be used within an AgentModeProvider')
  }
  return context
}

