import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type SupportedLanguage = 'zh' | 'en'

export type TranslationDescriptor =
  | string
  | {
      zh: string
      en: string
    }

interface LocalizationContextValue {
  language: SupportedLanguage
  availableLanguages: Array<{ code: SupportedLanguage; label: string }>
  setLanguage: (language: SupportedLanguage) => void
  t: (message: TranslationDescriptor, values?: Record<string, string | number>) => string
}

const AVAILABLE_LANGUAGES: Array<{ code: SupportedLanguage; label: string }> = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
]

const LocalizationContext = createContext<LocalizationContextValue>({
  language: 'zh',
  availableLanguages: AVAILABLE_LANGUAGES,
  setLanguage: () => undefined,
  t: (message) => (typeof message === 'string' ? message : message.zh),
})

const STORAGE_KEY = 'agentrix_language'

const formatTemplate = (template: string, values?: Record<string, string | number>) => {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key]
    if (value === undefined || value === null) return ''
    return String(value)
  })
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('zh')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const stored = window.localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null
    if (stored) {
      setLanguageState(stored)
      return
    }
    const browserLang = navigator.language?.toLowerCase() || 'zh'
    if (browserLang.startsWith('en')) {
      setLanguageState('en')
    }
  }, [])

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang)
    }
  }, [])

  const t = useCallback(
    (message: TranslationDescriptor, values?: Record<string, string | number>) => {
      if (typeof message === 'string') {
        return formatTemplate(message, values)
      }
      const template = message[language] ?? message.zh ?? message.en ?? ''
      return formatTemplate(template, values)
    },
    [language],
  )

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      availableLanguages: AVAILABLE_LANGUAGES,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  )

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}

export function useLocalization(): LocalizationContextValue {
  return useContext(LocalizationContext)
}


