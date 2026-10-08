'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { seedData } from '@/lib/types'
import { useAppData } from '@/hooks/useAppData'
import { DashboardPage } from '@/components/pages/DashboardPage'
import { AbsencePage } from '@/components/pages/AbsencePage'
import { AssignmentsPage } from '@/components/pages/AssignmentsPage'
import { TimetablePage } from '@/components/pages/TimetablePage'
import { TeachersPage } from '@/components/pages/TeachersPage'
import { StatsPage } from '@/components/pages/StatsPage'
import { SettingsPage } from '@/components/pages/SettingsPage'

const nav = [
  ['/dashboard', '대시보드', LayoutDashboard],
  ['/absence', '결강 등록', CalendarDays],
  ['/assignments', '배정 확인', ClipboardCheck],
  ['/timetable', '시간표', BookOpen],
  ['/teachers', '교사 관리', Users],
  ['/stats', '통계', ClipboardList],
  ['/settings', '설정', Settings],
] as const

export function AppShell() {
  const path = usePathname()
  const router = useRouter()
  const { data, setData, ready } = useAppData()
  const [mobile, setMobile] = useState(false)
  if (!ready) return <div className="min-h-screen bg-wash" />
  const page = path.replace('/', '') || 'dashboard'

  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage data={data} />
      case 'absence':
        return <AbsencePage data={data} setData={setData} />
      case 'assignments':
        return <AssignmentsPage data={data} setData={setData} />
      case 'timetable':
        return <TimetablePage data={data} setData={setData} />
      case 'teachers':
        return <TeachersPage data={data} setData={setData} />
      case 'stats':
        return <StatsPage data={data} />
      case 'settings':
        return <SettingsPage data={data} setData={setData} />
      default:
        return null
    }
  })()
  return (
    <div className="min-h-screen bg-paper text-ink">
      {mobile && (
        <button
          aria-label="메뉴 닫기"
          onClick={() => setMobile(false)}
          className="fixed inset-0 z-10 bg-ink/20 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-line bg-surface px-5 py-6 transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-sm bg-iris-deep font-display text-lg font-semibold text-paper">
              결
            </div>
            <div>
              <p className="font-display text-[17px] font-semibold leading-tight">결보강 매니저</p>
              <p className="mt-0.5 text-xs text-subtle">{data.settings.semester}</p>
            </div>
          </div>
          <button className="text-subtle lg:hidden" aria-label="메뉴 닫기" onClick={() => setMobile(false)}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <nav className="mt-10 flex flex-col gap-0.5">
          {nav.map(([href, label, Icon]) => {
            const active = path === href || (href === '/dashboard' && page === 'dashboard')
            return (
              <button
                key={href}
                onClick={() => {
                  router.push(href)
                  setMobile(false)
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-iris-soft font-semibold text-iris-deep' : 'text-ink-2 hover:bg-wash'}`}
              >
                <Icon size={18} strokeWidth={1.5} />
                {label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto hidden border-t border-line pt-4 text-xs leading-5 text-subtle lg:block">
          <p className="font-semibold text-ink-2">운영 원칙</p>
          <p className="mt-1">보강 횟수와 당일 부담을 함께 고려해 공정하게 추천합니다.</p>
        </div>
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-[5] flex h-14 items-center justify-between border-b border-line bg-paper/90 px-5 backdrop-blur lg:px-10">
          <button className="text-ink-2 lg:hidden" aria-label="메뉴 열기" onClick={() => setMobile(true)}>
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <div className="hidden text-xs tracking-wide text-subtle lg:block">{data.settings.semester}</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              title="샘플 데이터로 초기화"
              aria-label="샘플 데이터로 초기화"
              onClick={() => {
                if (confirm('모든 데이터를 샘플 데이터로 덮어씁니다. 되돌릴 수 없습니다. 계속할까요?')) setData(seedData())
              }}
              className="rounded-sm p-2 text-subtle hover:bg-wash-2 hover:text-ink"
            >
              <RotateCcw size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(data))
                alert('JSON 데이터를 클립보드에 복사했습니다.')
              }}
              className="hidden rounded-sm border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface sm:block"
            >
              백업
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10 lg:py-10">{content}</div>
      </main>
    </div>
  )
}
