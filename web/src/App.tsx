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
      <rect width="32" height="32" fill="var(--color-surface-2)" />
      <path d="M7 10 L15 16 L25 22" stroke="var(--color-signal)" strokeWidth="2.5" fill="none" />
      <circle cx="7" cy="10" r="2.5" fill="var(--color-node-other)" />
      <circle cx="15" cy="16" r="3" fill="var(--color-signal)" />
      <circle cx="25" cy="22" r="3.2" fill="var(--color-ink)" stroke="var(--color-text)" strokeWidth="2" />
    </svg>
  )
}

export default function App() {
  // 冷啟動實測約 5 秒；趁使用者讀首頁時背景喚醒，按鈕按下去時函式已是熱的。
  useEffect(warmUp, [])

  // 首頁的主視覺要滿版，其餘頁面維持置中的閱讀寬度
  const isLanding = useLocation().pathname === '/'

  return (
    <div className="flex min-h-screen flex-col bg-ink text-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-signal focus:px-4 focus:py-2 focus:text-ink"
      >
        跳至主要內容
      </a>

      {/* 頂部識別列：作品出處一眼可見 */}
      <div className="border-b border-line bg-surface text-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 py-1.5 text-xs md:px-6 2xl:max-w-7xl">
          <span>2026 台北金融科技獎｜金融創新獎—校園組 決賽作品</span>
          <span className="hidden sm:inline">國立政治大學資訊管理學系</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 px-4 py-2.5 md:px-6 md:py-3 2xl:max-w-7xl">
          <NavLink to="/" className="flex items-center gap-3" aria-label="鏈鏡 ChainLens 首頁">
            <Mark />
            <span className="leading-tight">
              <span className="block text-lg font-black tracking-wide">鏈鏡 ChainLens</span>
              <span className="block text-[11px] text-muted">雙引擎虛擬資產出金審查</span>
            </span>
          </NavLink>
          <div className="order-last flex w-full gap-5 text-[15px] md:order-none md:ml-6 md:w-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                // 目前位置不只靠顏色標示，同時加粗、加底線並提供 aria-current
                className={({ isActive }) =>
                  isActive
                    ? 'border-b-2 border-signal py-1 font-bold text-text'
                    : 'border-b-2 border-transparent py-1 text-muted hover:text-text'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <NavLink
            to="/screening?auto=1"
            className="ml-auto bg-signal px-4 py-2 text-sm font-bold text-ink hover:opacity-90"
          >
            看即時審查 Demo
          </NavLink>
        </nav>
      </header>

      <main id="main" className={isLanding ? 'flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10 2xl:max-w-7xl'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/screening" element={<Screening />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/research" element={<Research />} />
        </Routes>
      </main>

      <footer className="border-t border-line bg-surface text-muted">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm md:grid-cols-[1fr_auto] md:px-6 2xl:max-w-7xl">
          <div className="space-y-1">
            <div className="text-base font-bold text-text">鏈鏡 ChainLens</div>
            <p>NewJeans always five｜國立政治大學資訊管理學系</p>
            <p>研究用途，非投資或法律建議。出金審查 Demo 情境為合成劇本資料；結構模型尚未用真實標註資料驗證；尚無商業客戶。</p>
          </div>
          <div className="flex items-end gap-6">
            <a href={REPO_URL} className="underline underline-offset-4 hover:text-text">
              GitHub 原始碼
            </a>
            <a href={API_DOCS_URL} className="underline underline-offset-4 hover:text-text">
              API 文件
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
