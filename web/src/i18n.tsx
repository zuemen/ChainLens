import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * 中英切換。介面文字以 t(中文, English) 就地成對撰寫，不另建字典檔：
 * 譯文緊貼原文，改中文時一眼看得到英文要不要跟著改。
 * 後端回傳的敘事欄位成對提供（*_zh／*_en），舊版 API 沒有 *_en 時退回中文。
 *
 * 初始語言：網址 ?lang=en|zh ＞ 上次選擇（localStorage）＞ 瀏覽器語言（任一偏好為中文即中文，否則英文）。
 */
export type Lang = 'zh' | 'en'

const STORAGE_KEY = 'chainlens.lang'

const TITLE: Record<Lang, string> = {
  zh: '鏈鏡 ChainLens — 虛擬資產詐騙金流偵測平台',
  en: 'ChainLens — Graph-evidence screening for crypto fraud flows',
}

function initialLang(): Lang {
  try {
    const param = new URLSearchParams(window.location.search).get('lang')
    if (param === 'en' || param === 'zh') return param
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'zh') return stored
  } catch {
    // localStorage 被封鎖（無痕視窗、第三方 iframe）時照常用瀏覽器語言
  }
  // 單元測試以中文介面為準（jsdom 預設 en-US）
  if (import.meta.env.MODE === 'test') return 'zh'
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
  return preferred.some((tag) => /^zh/i.test(tag)) ? 'zh' : 'en'
}

/** 目前語言：供非元件程式（錯誤訊息等）讀取；由 LangProvider 同步 */
let current: Lang = 'zh'

export function getLang(): Lang {
  return current
}

interface LangValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** 依目前語言二選一；en 缺值（舊版 API 未帶 *_en）時退回中文 */
  t: <T,>(zh: T, en?: T | null) => T
}

const LangContext = createContext<LangValue>({
  lang: 'zh',
  setLang: () => undefined,
  t: (zh) => zh,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  current = lang

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant'
    document.title = TITLE[lang]
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // 存不了就只在本次瀏覽有效
    }
  }, [lang])

  const value = useMemo<LangValue>(
    () => ({
      lang,
      setLang,
      t: (zh, en) => (lang === 'en' && en !== undefined && en !== null ? en : zh),
    }),
    [lang],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangValue {
  return useContext(LangContext)
}
