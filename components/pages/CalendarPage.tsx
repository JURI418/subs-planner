'use client'
import { useMemo, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { FileDrop } from '@/components/common/FileDrop'
import { formatDotDate, todayISO, type AppData, type CalendarEvent, type SetData } from '@/lib/types'
import { readPdfText } from '@/lib/import/pdfText'
import { parseCalendar } from '@/lib/import/calendar'

type Parsed = ReturnType<typeof parseCalendar>
/** 미리보기에서 체크할 단위: 하루짜리 휴일, 또는 이어진 방학 기간 */
type Group = { key: string; label: string; kind: string; dates: string[] }

const KIND_TONE: Record<string, string> = { 공휴일: 'red', 휴업일: 'yellow', 방학: 'blue', 행사: 'slate' }

function dayDiff(a: string, b: string) {
  const t = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  return Math.round((t(b) - t(a)) / 86400000)
}

function groupHolidays(p: Parsed): Group[] {
  const out: Group[] = []
  const holidaySet = new Set(p.holidays)
  for (const e of p.events.filter((x) => x.kind === '공휴일' || x.kind === '휴업일')) {
    if (!holidaySet.has(e.date) || out.some((g) => g.dates[0] === e.date)) continue
    out.push({ key: e.date, label: e.title, kind: e.kind, dates: [e.date] })
  }
  // 방학은 주말을 사이에 둔 연속 평일을 한 기간으로 묶는다
  const vac = p.events.filter((x) => x.kind === '방학').map((x) => x.date)
  let cur: string[] = []
  const flush = () => cur.length && out.push({ key: `v-${cur[0]}`, label: '방학', kind: '방학', dates: cur })
  for (const d of vac) {
    if (cur.length && dayDiff(cur[cur.length - 1], d) > 3) {
      flush()
      cur = []
    }
    cur.push(d)
  }
  flush()
  return out.sort((a, b) => a.dates[0].localeCompare(b.dates[0]))
}

export function CalendarPage({ data, setData }: { data: AppData; setData: SetData }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [off, setOff] = useState<Set<string>>(new Set()) // 체크 해제한 그룹
  const groups = useMemo(() => (parsed ? groupHolidays(parsed) : []), [parsed])
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')

  const onPdf = async (file: File) => {
    setBusy(true)
    setMsg(null)
    try {
      const result = parseCalendar(await readPdfText(file))
      if (!result.events.length) {
        setMsg({ ok: false, text: '이 PDF에서 학사일정을 찾지 못했습니다. "3(화) 입학식"처럼 날짜와 요일이 적힌 학사일정인지 확인하세요.' })
        return
      }
      setParsed(result)
      setOff(new Set())
    } catch {
      setMsg({ ok: false, text: 'PDF를 읽지 못했습니다. 글자를 선택할 수 있는 PDF인지 확인하세요. (스캔한 이미지 PDF는 읽을 수 없습니다)' })
    } finally {
      setBusy(false)
    }
  }

  const apply = () => {
    if (!parsed) return
    if (data.events.length && !confirm('이미 등록된 학사일정을 새 파일 내용으로 바꿉니다. 계속할까요?')) return
    const holidays = groups.filter((g) => !off.has(g.key)).flatMap((g) => g.dates)
    const offDates = new Set(groups.filter((g) => off.has(g.key)).flatMap((g) => g.dates))
    // 체크 해제한 방학 날짜는 행사 목록에서도 빼고, 해제한 휴일은 '행사'로 남긴다
    const events: CalendarEvent[] = parsed.events
      .filter((e) => !(e.kind === '방학' && offDates.has(e.date)))
      .map((e) => (offDates.has(e.date) && e.kind !== '행사' ? { ...e, kind: '행사' as const } : e))
    const hit = data.slots.filter((s) => holidays.includes(s.date)).length
    setData((d) => ({ ...d, events, settings: { ...d.settings, holidays: [...new Set(holidays)].sort() } }))
    setParsed(null)
    setMsg({
      ok: true,
      text:
        `${parsed.year}학년도 학사일정을 적용했습니다. 휴업일 ${new Set(holidays).size}일은 결강 수업 계산에서 빠집니다.` +
        (hit ? ` 이미 등록된 결강 중 ${hit}개 수업이 휴업일에 걸려 있으니 결강 목록을 확인하세요.` : ''),
    })
  }

  const labelOf = (date: string) =>
    data.events.find((e) => e.date === date && e.kind !== '행사')?.title ?? '휴업일'
  const removeHolidays = (dates: string[]) => {
    const drop = new Set(dates)
    setData((d) => ({
      ...d,
      settings: { ...d.settings, holidays: d.settings.holidays.filter((x) => !drop.has(x)) },
      // 해제한 날의 공휴일·휴업일 표시는 일반 행사로 남기고, 방학 표시는 지운다
      events: d.events
        .filter((e) => !(drop.has(e.date) && e.kind === '방학'))
        .map((e) => (drop.has(e.date) && e.kind !== '행사' ? { ...e, kind: '행사' as const } : e)),
    }))
  }
  const addHoliday = () => {
    if (!newDate) return
    setData((d) => ({
      ...d,
      settings: { ...d.settings, holidays: [...new Set([...d.settings.holidays, newDate])].sort() },
      events: [...d.events, { date: newDate, title: newName.trim() || '휴업일', kind: '휴업일' as const }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }))
    setNewDate('')
    setNewName('')
  }

  const months = [...new Set(data.events.map((e) => e.date.slice(0, 7)))].sort()
  const monthEvents = data.events.filter((e) => e.date.startsWith(month) && e.kind !== '방학')
  // 등록된 휴업일: 이어진 방학 날짜는 한 줄(기간)로 묶어 보여준다
  const holidayRows: { label: string; dates: string[] }[] = []
  for (const d of [...data.settings.holidays].sort()) {
    const label = labelOf(d)
    const last = holidayRows[holidayRows.length - 1]
    if (last && label === '방학' && last.label === '방학' && dayDiff(last.dates[last.dates.length - 1], d) <= 3)
      last.dates.push(d)
    else holidayRows.push({ label, dates: [d] })
  }

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="학사일정"
        desc="학사일정 PDF를 올리면 공휴일·재량휴업일·방학을 찾아 결강 수업 계산에서 자동으로 뺍니다."
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <h2 className="font-display text-lg font-semibold">학사일정 PDF 올리기</h2>
          <p className="mt-1 text-[13px] text-subtle">
            구글 시트·엑셀·한글에서 PDF로 저장한 학사일정 (예: &ldquo;3(화) 입학식&rdquo; 형식)
          </p>
          <div className="mt-4">
            <FileDrop
              id="calendar-pdf"
              title="학사일정 PDF를 끌어다 놓거나 눌러서 고르세요"
              hint="파일은 이 브라우저 안에서만 읽고, 서버로 보내지 않습니다."
              busy={busy}
              onFile={onPdf}
            />
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.text}</p>}

          {parsed && (
            <div className="mt-5 rounded-xl bg-wash p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 font-semibold">{parsed.year}학년도 학사일정</p>
                <Badge>행사 {parsed.events.filter((e) => e.kind === '행사').length}건</Badge>
                <Badge tone="red">공휴일 {groups.filter((g) => g.kind === '공휴일').length}일</Badge>
                <Badge tone="yellow">휴업일 {groups.filter((g) => g.kind === '휴업일').length}일</Badge>
                <Badge tone="blue">방학 {groups.filter((g) => g.kind === '방학').length}기간</Badge>
              </div>
              <p className="mt-3 text-[13px] leading-5 text-subtle">
                아래 날짜를 휴업일로 등록합니다. 수업이 있는 날이면 체크를 해제하세요.
              </p>
              <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-xl bg-surface">
                {groups.map((g) => {
                  const on = !off.has(g.key)
                  return (
                    <li key={g.key}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-wash">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setOff((s) => {
                              const n = new Set(s)
                              if (n.has(g.key)) n.delete(g.key)
                              else n.add(g.key)
                              return n
                            })
                          }
                          className="accent-iris"
                        />
                        <span className="w-44 shrink-0 font-mono text-[13px] text-ink">
                          {formatDotDate(g.dates[0])}
                          {g.dates.length > 1 && ` ~ ${formatDotDate(g.dates[g.dates.length - 1]).slice(5)}`}
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${on ? '' : 'text-faint line-through'}`}>
                          {g.label}
                          {g.dates.length > 1 && <span className="text-subtle"> (평일 {g.dates.length}일)</span>}
                        </span>
                        <Badge tone={KIND_TONE[g.kind]}>{g.kind}</Badge>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={apply} className="m3-btn m3-filled">
                  <Check size={18} /> 학사일정 적용
                </button>
                <button onClick={() => setParsed(null)} className="m3-btn m3-text">
                  취소
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">등록된 휴업일</h2>
            <Badge>{data.settings.holidays.length}일</Badge>
          </div>
          <p className="mt-1 text-[13px] text-subtle">이 날짜의 수업은 결강 슬롯을 만들 때 자동으로 빠집니다.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              id="holiday-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="m3-field m3-field-sm"
              aria-label="추가할 휴업일 날짜"
            />
            <input
              id="holiday-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름 (예: 재량휴업일)"
              className="m3-field m3-field-sm min-w-0 flex-1"
            />
            <button onClick={addHoliday} disabled={!newDate} className="m3-btn m3-btn-sm m3-tonal">
              <Plus size={16} /> 추가
            </button>
          </div>
          {holidayRows.length === 0 ? (
            <p className="mt-6 text-sm text-subtle">아직 등록된 휴업일이 없습니다. 학사일정 PDF를 올리거나 직접 추가하세요.</p>
          ) : (
            <ul className="mt-4 max-h-[26rem] divide-y divide-line overflow-y-auto">
              {holidayRows.map((r) => {
                const first = r.dates[0]
                const last = r.dates[r.dates.length - 1]
                return (
                  <li key={first} className={`flex items-center gap-3 py-2 ${last < todayISO() ? 'opacity-50' : ''}`}>
                    <span className="w-44 shrink-0 font-mono text-[13px]">
                      {formatDotDate(first)}
                      {r.dates.length > 1 && ` ~ ${formatDotDate(last).slice(5)}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-2">
                      {r.label}
                      {r.dates.length > 1 && <span className="text-subtle"> (평일 {r.dates.length}일)</span>}
                    </span>
                    <button
                      onClick={() => removeHolidays(r.dates)}
                      aria-label={`${formatDotDate(first)} 휴업일 해제`}
                      className="grid size-8 place-items-center rounded-full text-subtle hover:bg-ink/[.08] hover:text-ink"
                    >
                      <X size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">월별 학사일정</h2>
          {months.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  aria-pressed={month === m}
                  className={`m3-chip ${month === m ? 'm3-chip-on' : ''}`}
                >
                  {Number(m.slice(5))}월
                </button>
              ))}
            </div>
          )}
        </div>
        {data.events.length === 0 ? (
          <p className="mt-6 text-sm text-subtle">학사일정 PDF를 올리면 여기에 월별 행사가 나옵니다.</p>
        ) : monthEvents.length === 0 ? (
          <p className="mt-6 text-sm text-subtle">이 달에는 등록된 행사가 없습니다.</p>
        ) : (
          <ul className="mt-4 grid gap-x-8 md:grid-cols-2">
            {monthEvents.map((e, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-line py-2.5">
                <span
                  className={`w-24 shrink-0 font-mono text-[13px] ${e.date === todayISO() ? 'font-semibold text-iris' : 'text-ink'}`}
                >
                  {formatDotDate(e.date).slice(5)}
                </span>
                <span className="min-w-0 flex-1 text-sm">{e.title}</span>
                {e.kind !== '행사' && <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
