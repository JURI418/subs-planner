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
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { formatKoreanDate, seedData, todayISO } from '@/lib/types'
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
  if (!ready) return <div className="min-h-screen bg-slate-50" />
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
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 border-r border-slate-200 bg-white p-5 transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
              <Sparkles />
            </div>
            <div>
              <p className="font-bold">결보강 매니저</p>
              <p className="text-xs text-slate-500">{data.settings.semester}</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          {nav.map(([href, label, Icon]) => (
            <button
              key={href}
              onClick={() => {
                router.push(href)
                setMobile(false)
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${path === href ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden rounded-xl bg-slate-50 p-3 text-xs text-slate-500 lg:block">
          <p className="font-semibold text-slate-700">운영 원칙</p>
          <p className="mt-1 leading-5">보강 횟수와 당일 부담을 함께 고려해 공정하게 추천합니다.</p>
        </div>
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">
            {data.settings.semester} <span className="mx-2">/</span> 오늘은 {formatKoreanDate(todayISO())}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              title="샘플 데이터로 초기화"
              onClick={() => {
                if (confirm('모든 데이터를 샘플 데이터로 덮어씁니다. 되돌릴 수 없습니다. 계속할까요?')) setData(seedData())
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <RotateCcw />
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(data))
                alert('JSON 데이터를 클립보드에 복사했습니다.')
              }}
              className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold sm:block"
            >
              백업
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
          {content}
        </div>
      </main>
    </div>
  )
}
