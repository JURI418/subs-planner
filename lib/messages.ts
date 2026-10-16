import { formatDotDate, type AppData, type Day, type EventKind } from './types'

/** 안내 문자에 넣을 수 있는 날(또는 기간) */
export type OffItem = {
  key: string
  start: string
  end: string
  title: string
  kind: EventKind
  /** 기간 안의 평일 날짜들 (선생님 수업 요일과 겹치는지 볼 때 사용) */
  dates: string[]
}

const DAY: Day[] = ['월', '화', '수', '목', '금']
const dayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
const shortDate = (iso: string) => formatDotDate(iso).slice(5) // 11.06(금)
const nextDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const n = new Date(y, m - 1, d + 1)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** 그 달(평일)의 휴업일·방학·공휴일·행사를 모은다. 같은 이름이 이어지는 날(방학 등)은 기간 하나로 묶는다 */
export function monthOffItems(data: AppData, ym: string): OffItem[] {
  const inMonth = data.events
    .filter((e) => e.date.startsWith(ym) && dayOf(e.date) > 0 && dayOf(e.date) < 6)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
  // 휴업일로 등록됐지만 일정 이름이 없는 날
  const named = new Set(inMonth.filter((e) => e.kind !== '행사').map((e) => e.date))
  const extra = data.settings.holidays
    .filter((d) => d.startsWith(ym) && !named.has(d) && dayOf(d) > 0 && dayOf(d) < 6)
    .map((date) => ({ date, title: '휴업일', kind: '휴업일' as EventKind }))
  const all = [...inMonth, ...extra].sort((a, b) => a.date.localeCompare(b.date))

  const items: OffItem[] = []
  for (const e of all) {
    // 직전 항목과 이름·종류가 같고 날짜가 이어지면(주말 건너뛰기 포함) 기간으로 합친다
    const last = [...items].reverse().find((x) => x.title === e.title && x.kind === e.kind)
    if (last && e.kind !== '행사') {
      let d = nextDay(last.end)
      while (dayOf(d) === 0 || dayOf(d) === 6) d = nextDay(d)
      if (d === e.date) {
        last.end = e.date
        last.dates.push(e.date)
        continue
      }
    }
    if (items.some((x) => x.start === e.date && x.title === e.title)) continue
    items.push({ key: `${e.date}-${e.title}`, start: e.date, end: e.date, title: e.title, kind: e.kind, dates: [e.date] })
  }
  return items
}

export function itemLine(it: OffItem) {
  const when = it.start === it.end ? shortDate(it.start) : `${shortDate(it.start)}~${shortDate(it.end)}`
  return `· ${when} ${it.title}${it.kind === '행사' ? ' (수업 없음)' : ''}`
}

/** 선생님이 수업하는 요일과 겹치는 항목만 (기간은 겹치는 날이 하루라도 있으면 포함) */
export function itemsForTeacher(items: OffItem[], data: AppData, teacherId: string) {
  const teach = new Set(data.timetable.filter((e) => e.teacherId === teacherId).map((e) => e.dayOfWeek))
  return items.filter((it) => it.dates.some((d) => teach.has(DAY[dayOf(d) - 1])))
}

export const DEFAULT_SMS_HEADER = '[학교 안내]'
export const DEFAULT_SMS_FOOTER = '일정이 바뀌면 다시 안내드리겠습니다. 감사합니다.'

/** months: 문자에 넣을 달 번호들 (예: [10, 11] → '10, 11월') */
export function buildMessage(opts: { months: number[]; items: OffItem[]; name?: string; header: string; footer: string }) {
  const { months, items, name, header, footer } = opts
  if (!months.length) return '(위에서 문자에 넣을 달을 먼저 골라 주세요)'
  const month = months.join(', ')
  const lines: string[] = []
  if (header.trim()) lines.push(header.trim())
  if (name) lines.push(`${name} 선생님, 안녕하세요.`)
  if (items.length) {
    lines.push(`${month}월 학사일정 중 출근하지 않으셔도 되는 날을 안내드립니다.`, '')
    lines.push(...items.map(itemLine))
  } else {
    lines.push(`${month}월에는 수업이 없는 날이 없습니다. 평소대로 출근해 주세요.`)
  }
  if (footer.trim()) lines.push('', footer.trim())
  return lines.join('\n')
}

/** 선생님 주간 수업 요약: '월 1·3교시 · 수 2교시' */
export function weekSummary(data: AppData, teacherId: string) {
  const own = data.timetable.filter((e) => e.teacherId === teacherId)
  return DAY.map((d) => {
    const ps = [...new Set(own.filter((e) => e.dayOfWeek === d).map((e) => e.period))].sort((a, b) => a - b)
    return ps.length ? `${d} ${ps.join('·')}교시` : null
  })
    .filter(Boolean)
    .join(' · ')
}
