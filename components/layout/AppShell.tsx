'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, BookOpen, HardDriveDownload, MessageSquareText, ChevronRight, Copy, Menu, Pause, Play, Plus, RotateCcw, Settings, Sparkles, Users, X } from 'lucide-react'
import { formatDotDate, seedData, todayISO } from '@/lib/types'
import { daysSinceBackup, downloadBackup } from '@/lib/backup'
import { canOverwrite, chooseBackupFile, overwriteBackup } from '@/lib/fileBackup'
import { useAppData } from '@/hooks/useAppData'
import { useSheetSync } from '@/hooks/useSheetSync'
import { DashboardPage } from '@/components/pages/DashboardPage'
import { AbsencePage } from '@/components/pages/AbsencePage'
import { AssignmentsPage } from '@/components/pages/AssignmentsPage'
import { TimetablePage } from '@/components/pages/TimetablePage'
import { TeachersPage } from '@/components/pages/TeachersPage'
import { StatsPage } from '@/components/pages/StatsPage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { CalendarPage } from '@/components/pages/CalendarPage'
import { WeekPage } from '@/components/pages/WeekPage'
import { MessagesPage } from '@/components/pages/MessagesPage'
import { GuidePage } from '@/components/pages/GuidePage'

// 메뉴: 위쪽은 매일 쓰는 일(› 화살표 목록), 아래쪽은 관리 메뉴(아이콘 목록)
const primary = [
  ['/dashboard', '홈'],
  ['/absence', '결강 등록'],
  ['/assignments', '배정 확인'],
  ['/week', '이번 주 시간표'],
  ['/timetable', '시간표 올리기'],
  ['/calendar', '학사일정 올리기'],
] as const
const secondary = [
  ['/teachers', '교사 관리', Users],
  ['/stats', '결보강 통계', BarChart3],
  ['/messages', '시간강사 안내 문자', MessageSquareText],
  ['/guide', '사용법', BookOpen],
  ['/settings', '설정', Settings],
] as const

export function AppShell() {
  const path = usePathname()
  const router = useRouter()
  const { data, setData, ready } = useAppData()
  const sheet = useSheetSync(data, setData)
  // 매일 처음 열 때 백업 한 번: 정해 둔 파일에 덮어쓰기(크롬·엣지) 또는 새 파일로 내려받기
  const [autoSaved, setAutoSaved] = useState<string | null>(null)
  const [backupAsk, setBackupAsk] = useState<null | 'choose' | 'permit'>(null)
  const markSaved = (text: string) => {
    setData((d) => ({ ...d, settings: { ...d.settings, lastAutoBackup: todayISO(), lastBackupAt: new Date().toISOString() } }))
    setBackupAsk(null)
    setAutoSaved(text)
    setTimeout(() => setAutoSaved(null), 6000)
  }
  useEffect(() => {
    if (!ready) return
    const s = data.settings
    const sample = data.teachers.every((t) => /^교사\d{2}$|^가상E$/.test(t.name))
    if (s.autoBackup === false || !data.timetable.length || sample || s.lastAutoBackup === todayISO()) return
    ;(async () => {
      if (canOverwrite() && s.backupMode !== 'download') {
        const r = await overwriteBackup(data)
        if (r === 'saved') return markSaved(`오늘 백업을 ${s.backupFileName ?? '백업 파일'}에 덮어썼어요`)
        setBackupAsk(r === 'need-click' ? 'permit' : 'choose')
        return
      }
      downloadBackup(data)
      markSaved('오늘 백업 파일을 다운로드 폴더에 저장했어요')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  const [mobile, setMobile] = useState(false)
  const [noticeIdx, setNoticeIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setNoticeIdx((i) => i + 1), 4500)
    return () => clearInterval(t)
  }, [paused])
  if (!ready) return <div className="min-h-screen bg-paper" />
  const page = path.replace('/', '') || 'dashboard'

  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage data={data} setData={setData} />
      case 'absence':
        return <AbsencePage data={data} setData={setData} />
      case 'assignments':
        return <AssignmentsPage data={data} setData={setData} />
      case 'guide':
        return <GuidePage data={data} />
      case 'messages':
        return <MessagesPage data={data} setData={setData} />
      case 'week':
        return <WeekPage data={data} />
      case 'timetable':
        return <TimetablePage data={data} setData={setData} />
      case 'calendar':
        return <CalendarPage data={data} setData={setData} />
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

  const today = todayISO()
  const go = (href: string) => {
    router.push(href)
    setMobile(false)
  }
  const isActive = (href: string) => path === href || (href === '/dashboard' && page === 'dashboard')
  const home = page === 'dashboard'
  const backupNow = () => {
    downloadBackup(data)
    setData((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: new Date().toISOString() } }))
  }
  const snooze = () => {
    const t = new Date(Date.now() + 86400000)
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    setData((d) => ({ ...d, settings: { ...d.settings, backupSnoozeUntil: iso } }))
  }
  const backupDays = daysSinceBackup(data)
  const needBackup =
    data.timetable.length > 0 &&
    (backupDays === null || backupDays >= 7) &&
    !(data.settings.backupSnoozeUntil && data.settings.backupSnoozeUntil > today)
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const todayEvent = data.events.find((e) => e.date === today && e.kind !== '방학')
  const nextOff = data.events.find((e) => e.date > today && e.kind !== '행사' && e.kind !== '방학')
  const notices = [
    data.settings.holidays.includes(today)
      ? `오늘은 휴업일입니다${todayEvent ? ` · ${todayEvent.title}` : ''}`
      : `${formatDotDate(today)}${todayEvent ? ` · ${todayEvent.title}` : ''}`,
    pending ? `확정을 기다리는 배정 ${pending}건이 있습니다` : '모든 배정이 확정되었습니다',
    ...(Number(today.slice(8)) >= 24 && data.teachers.some((t) => t.employmentType === '시간강사')
      ? ['월말이에요 · 시간강사 선생님께 다음 달 안내 문자를 보내세요']
      : []),
    nextOff ? `다음 휴업일 ${formatDotDate(nextOff.date)} ${nextOff.title}` : '학사일정을 올리면 휴업일이 자동으로 반영됩니다',
  ]
  const notice = notices[noticeIdx % notices.length]

  const Logo = () => (
    <button onClick={() => go('/dashboard')} className="flex items-center gap-2.5 text-left" aria-label="첫 화면">
      <span className="grid size-9 place-items-center bg-point text-on-point">
        <Sparkles size={17} strokeWidth={1.75} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold">결보강 매니저</span>
        <span className="block text-[10px] font-bold tracking-[.22em] text-subtle">SUBS PLANNER</span>
      </span>
    </button>
  )

  const MenuBody = () => (
    <>
      <nav className="mt-10 flex flex-col" aria-label="주 메뉴">
        {primary.map(([href, label]) => (
          <button
            key={href}
            onClick={() => go(href)}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`group flex items-center justify-between py-3 text-left text-[16px] transition-colors ${isActive(href) ? 'font-extrabold text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            {label}
            {isActive(href) ? (
              <span className="mr-1.5 size-[9px] rounded-full bg-point ring-1 ring-ink/70" aria-hidden />
            ) : (
              <ChevronRight size={18} strokeWidth={1.5} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" />
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto flex flex-col">
        {secondary.map(([href, label, Icon]) => (
          <button
            key={href}
            onClick={() => go(href)}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`flex items-center gap-3 py-2.5 text-left text-[14px] ${isActive(href) ? 'font-extrabold text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            <Icon size={17} strokeWidth={1.5} />
            {label}
          </button>
        ))}
        <div className="my-4 border-t border-line" />
        <button
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(data))
            alert('JSON 데이터를 클립보드에 복사했습니다.')
          }}
          className="flex items-center gap-3 py-2 text-left text-[13px] text-subtle hover:text-ink"
        >
          <Copy size={15} strokeWidth={1.5} /> 백업 복사
        </button>
        <button
          onClick={() => {
            if (confirm('모든 데이터를 샘플 데이터로 덮어씁니다. 되돌릴 수 없습니다. 계속할까요?')) setData(seedData())
          }}
          className="flex items-center gap-3 py-2 text-left text-[13px] text-subtle hover:text-ink"
        >
          <RotateCcw size={15} strokeWidth={1.5} /> 샘플 데이터로 초기화
        </button>
        <p className="mt-3 text-[12px] text-faint">{data.settings.semester}</p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* 왼쪽 메뉴 (넓은 화면) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[300px] flex-col border-r border-line bg-surface px-7 py-7 lg:flex">
        <Logo />
        <MenuBody />
      </aside>

      {/* 휴대폰 메뉴: ✕ MENU */}
      {mobile && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex w-[300px] max-w-[85%] flex-col bg-surface px-6 py-6">
            <button onClick={() => setMobile(false)} className="flex items-center gap-2 text-[14px] font-bold">
              <X size={20} strokeWidth={1.5} /> MENU
            </button>
            <MenuBody />
          </div>
          <button aria-label="메뉴 닫기" onClick={() => setMobile(false)} className="flex-1 bg-ink/40" />
        </div>
      )}

      <div className="lg:pl-[300px]">
        {/* 안내 띠: 위아래 가는 줄 사이에 //Subs Planner · 안내 · 학기. 홈에서만 검정 바탕 */}
        <div className={`px-4 py-1.5 md:px-6 ${home ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>
          <div className={`grid h-9 grid-cols-[auto_1fr_auto] items-center gap-4 border-y ${home ? 'border-paper/30' : 'border-ink/25'} text-[12px] tracking-[.06em]`}>
            <span className={`font-extrabold tracking-[.18em] ${home ? 'text-point' : ''}`}>//Subs Planner</span>
            <p key={noticeIdx} className={`truncate text-center font-bold ${home ? 'text-paper/90' : 'text-ink-2'}`} aria-live="polite">
              {notice}
            </p>
            <span className={`flex items-center gap-2 ${home ? 'text-paper/70' : 'text-subtle'}`}>
              <span className="hidden tracking-[.12em] sm:inline">{data.settings.semester}</span>
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? '안내 넘기기 다시 시작' : '안내 넘기기 멈춤'}
                className={`grid size-7 place-items-center ${home ? 'text-paper/80 hover:text-paper' : 'text-subtle hover:text-ink'}`}
              >
                {paused ? <Play size={13} /> : <Pause size={13} />}
              </button>
            </span>
          </div>
        </div>

        {/* 휴대폰 상단 */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setMobile(true)} className="flex items-center gap-2 text-[14px] font-bold" aria-label="메뉴 열기">
            <Menu size={20} strokeWidth={1.5} /> MENU
          </button>
          <Logo />
          <span className="w-16" />
        </header>

        {/* 백업 알림: 7일마다 백업 파일 받기를 권한다 (홈에서는 검정 배너와 간격을 둔다) */}
        {needBackup && <BackupNotice home={home} days={backupDays} onBackup={backupNow} onSnooze={snooze} />}

        <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 md:px-10">{content}</main>
      </div>

      {/* 구글 시트 전송 결과 알림 */}
      {autoSaved && !sheet.status && (
        <div role="status" className="fixed bottom-24 right-6 z-30 max-w-[min(420px,calc(100vw-3rem))] bg-ink px-4 py-3 text-[14px] font-bold text-paper shadow-[0_8px_24px_rgb(0_0_0/.2)]">
          <span className="mr-2 text-point">●</span>
          {autoSaved}
        </div>
      )}
      {/* 오늘 백업: 저장 위치를 아직 안 정했거나(처음), 이번 방문에서 덮어쓰기 허락이 필요할 때 */}
      {backupAsk && (
        <div className="fixed bottom-24 right-6 z-30 w-[min(400px,calc(100vw-3rem))] bg-ink p-4 text-paper shadow-[0_8px_24px_rgb(0_0_0/.25)]">
          <p className="text-[14px] font-bold">
            {backupAsk === 'choose' ? '백업 파일 저장 위치를 한 번만 정해 주세요' : '오늘 백업을 덮어쓸까요?'}
          </p>
          <p className="mt-1 text-[12.5px] leading-5 text-paper/70">
            {backupAsk === 'choose'
              ? '정해 두면 매일 같은 파일 하나에 덮어써서 파일이 쌓이지 않아요.'
              : `${data.settings.backupFileName ?? '백업 파일'}에 오늘 내용을 덮어씁니다. 브라우저가 물으면 ‘방문할 때마다 허용’을 고르면 다음부터는 묻지 않아요.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  if (backupAsk === 'choose') {
                    const name = await chooseBackupFile(data)
                    if (!name) return
                    setData((d) => ({ ...d, settings: { ...d.settings, backupMode: 'overwrite', backupFileName: name } }))
                    markSaved(`${name}에 저장했어요. 내일부터 여기에 덮어써요`)
                  } else if ((await overwriteBackup(data, true)) === 'saved') {
                    markSaved(`오늘 백업을 ${data.settings.backupFileName ?? '백업 파일'}에 덮어썼어요`)
                  }
                } catch {
                  /* 저장 창을 닫은 경우 */
                }
              }}
              className="m3-btn m3-btn-sm bg-point text-on-point hover:brightness-95"
            >
              {backupAsk === 'choose' ? '저장 위치 정하기' : '덮어쓰기'}
            </button>
            {backupAsk === 'choose' && (
              <button
                onClick={() => {
                  setData((d) => ({ ...d, settings: { ...d.settings, backupMode: 'download' } }))
                  downloadBackup(data)
                  markSaved('오늘 백업 파일을 다운로드 폴더에 저장했어요')
                }}
                className="m3-btn m3-btn-sm border border-paper/40 text-paper"
              >
                매일 새 파일로 받기
              </button>
            )}
            <button onClick={() => setBackupAsk(null)} className="m3-btn m3-btn-sm text-paper/70 hover:text-paper">
              나중에
            </button>
          </div>
        </div>
      )}
      {sheet.status && (
        <div
          role="status"
          className={`fixed bottom-24 right-6 z-30 max-w-[min(420px,calc(100vw-3rem))] px-4 py-3 text-[14px] font-bold shadow-[0_8px_24px_rgb(0_0_0/.2)] ${sheet.status.ok ? 'bg-ink text-paper' : 'bg-bad text-white'}`}
        >
          {sheet.status.ok && <span className="mr-2 text-point">●</span>}
          {sheet.status.text}
        </div>
      )}

      {/* 오른쪽 아래 둥근 검정 버튼: 결강 등록 */}
      {page !== 'absence' && (
        <button
          onClick={() => go('/absence')}
          aria-label="결강 등록"
          title="결강 등록"
          className="fixed bottom-6 right-6 z-10 grid size-14 place-items-center rounded-full bg-point text-on-point shadow-[0_6px_20px_rgb(0_0_0/.25)] transition-transform hover:scale-105"
        >
          <Plus size={24} strokeWidth={1.75} />
        </button>
      )}
    </div>
  )
}

function BackupNotice({
  home,
  days,
  onBackup,
  onSnooze,
}: {
  home: boolean
  days: number | null
  onBackup: () => void
  onSnooze: () => void
}) {
  const title = days === null ? '아직 백업 파일을 받은 적이 없어요' : `마지막 백업이 ${days}일 전이에요`
  return (
    <div className={`mx-auto max-w-[1280px] px-5 pt-5 md:px-10 ${home ? 'pb-7' : ''}`}>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 border border-line border-l-4 border-l-point bg-surface px-5 py-3 shadow-[0_1px_3px_rgb(0_0_0/.06)]">
        <HardDriveDownload size={18} className="text-ink" />
        <span>
          <span className="block text-[14px] font-bold">{title}</span>
          <span className="block text-[12.5px] text-subtle">데이터는 이 브라우저에만 저장돼요. 일주일에 한 번 받아 두세요.</span>
        </span>
        <span className="ml-auto flex gap-1">
          <button onClick={onSnooze} className="m3-btn m3-btn-sm m3-text">내일 다시</button>
          <button onClick={onBackup} className="m3-btn m3-btn-sm m3-filled">백업 파일 받기</button>
        </span>
      </div>
    </div>
  )
}
