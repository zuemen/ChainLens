import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { API_DOCS_URL, warmUp } from './api/client'
import Landing from './pages/Landing'
import Research from './pages/Research'
import Screening from './pages/Screening'
import Workbench from './pages/Workbench'

const NAV = [
  { to: '/', label: '首頁' },
  { to: '/screening', label: '出金審查' },
  { to: '/workbench', label: '金流圖譜' },
  { to: '/research', label: '模型研究' },
]

const REPO_URL = 'https://github.com/zuemen/ChainLens'

/** 標誌：一條被追溯出的資金路徑，終點是審查目標 */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <rect width="32" height="32" fill="var(--color-brand)" />
      <path d="M7 10 L15 16 L25 22" stroke="var(--color-gold-on-dark)" strokeWidth="2.5" fill="none" />
      <circle cx="7" cy="10" r="2.5" fill="#B7C4D6" />
      <circle cx="15" cy="16" r="3" fill="var(--color-gold-on-dark)" />
      <circle cx="25" cy="22" r="3.2" fill="var(--color-brand)" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  )
}

export default function App() {
  // 冷啟動實測約 5 秒；趁使用者讀首頁時背景喚醒，按鈕按下去時函式已是熱的。
  useEffect(warmUp, [])

  // 首頁的深色主視覺要滿版，其餘頁面維持置中的閱讀寬度
  const isLanding = useLocation().pathname === '/'

  return (
    <div className="flex min-h-screen flex-col bg-base text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        跳至主要內容
      </a>

      {/* 頂部識別列：作品出處一眼可見 */}
      <div className="bg-brand text-on-dark-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-6 py-1.5 text-xs 2xl:max-w-7xl">
          <span>2026 台北金融科技獎｜金融創新獎—校園組 決賽作品</span>
          <span className="hidden sm:inline">國立政治大學資訊管理學系</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-panel">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 px-6 py-2.5 md:py-3 2xl:max-w-7xl">
          <NavLink to="/" className="flex items-center gap-3" aria-label="鏈鏡 ChainLens 首頁">
            <Mark />
            <span className="leading-tight">
              <span className="block font-serif text-lg font-black tracking-wider text-brand">鏈鏡 ChainLens</span>
              <span className="block text-[11px] text-muted">虛擬資產詐騙金流偵測平台</span>
            </span>
          </NavLink>
          <div className="order-last flex w-full gap-6 text-[15px] md:order-none md:ml-6 md:w-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                // 目前位置不只靠顏色標示，同時加粗、加底線並提供 aria-current
                className={({ isActive }) =>
                  isActive
                    ? 'border-b-2 border-gold py-1 font-bold text-brand'
                    : 'border-b-2 border-transparent py-1 text-muted hover:text-brand'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <NavLink
            to="/screening?auto=1"
            className="ml-auto bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover"
          >
            看即時審查 Demo
          </NavLink>
        </nav>
      </header>

      <main id="main" className={isLanding ? 'flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-6 py-10 2xl:max-w-7xl'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/screening" element={<Screening />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/research" element={<Research />} />
        </Routes>
      </main>

      <footer className="border-t border-dark-line bg-[#071D35] text-on-dark-muted">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 text-sm md:grid-cols-[1fr_auto] 2xl:max-w-7xl">
          <div className="space-y-1">
            <div className="font-serif text-base font-bold text-white">鏈鏡 ChainLens</div>
            <p>NewJeans always five｜國立政治大學資訊管理學系</p>
            <p>研究用途，非投資或法律建議。出金審查 Demo 情境為合成劇本資料；實際案例均附公開來源。</p>
          </div>
          <div className="flex items-end gap-6">
            <a href={REPO_URL} className="underline underline-offset-4 hover:text-white">
              GitHub 原始碼
            </a>
            <a href={API_DOCS_URL} className="underline underline-offset-4 hover:text-white">
              API 文件
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
