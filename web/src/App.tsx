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
  { to: '/research', label: '研究成果' },
]

const REPO_URL = 'https://github.com/zuemen/ChainLens'

export default function App() {
  // 冷啟動實測約 5 秒；趁使用者讀首頁時背景喚醒，按鈕按下去時函式已是熱的。
  useEffect(warmUp, [])

  // 首頁的深色主視覺要滿版，其餘頁面維持置中的閱讀寬度
  const isLanding = useLocation().pathname === '/'

  return (
    <div className="flex min-h-screen flex-col bg-base text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-base"
      >
        跳至主要內容
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-base">
        <nav className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2.5 md:gap-x-8 md:py-3.5">
          <NavLink to="/" className="flex items-baseline gap-2" aria-label="鏈鏡 ChainLens 首頁">
            <span className="font-serif text-xl font-black tracking-wider">鏈鏡</span>
            <span className="tabular text-xs text-muted">ChainLens</span>
          </NavLink>
          <div className="order-last flex w-full gap-5 text-sm md:order-none md:w-auto md:gap-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                // 目前位置不只靠顏色標示，同時加粗、加底線並提供 aria-current
                className={({ isActive }) =>
                  isActive
                    ? 'border-b-2 border-signal pb-0.5 font-bold text-ink'
                    : 'border-b-2 border-transparent pb-0.5 text-muted hover:text-ink'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <NavLink
            to="/screening?auto=1"
            className="ml-auto bg-ink px-4 py-1.5 text-sm font-bold text-base hover:bg-signal-ink"
          >
            看 Demo
          </NavLink>
        </nav>
      </header>

      <main id="main" className={isLanding ? 'flex-1' : 'mx-auto w-full max-w-6xl 2xl:max-w-7xl flex-1 px-6 py-10'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/screening" element={<Screening />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/research" element={<Research />} />
        </Routes>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-6 text-sm text-muted">
          <span>研究用途，非投資或法律建議</span>
          <span>Demo 情境為合成劇本資料</span>
          <span className="ml-auto flex gap-6">
            <a href={REPO_URL} className="underline underline-offset-4 hover:text-ink">
              GitHub 原始碼
            </a>
            <a href={API_DOCS_URL} className="underline underline-offset-4 hover:text-ink">
              API 文件
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
