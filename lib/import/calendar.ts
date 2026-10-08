import type { CalendarEvent, EventKind } from '../types'
import { groupLines, joinLine, type PdfPages } from './types'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const DATE_HEAD = /^(\d{1,2})\(([월화수목금토일])\)\s*/
// 수업이 없는 날로 볼 행사 이름 (학생회장 '선거' 같은 행사는 제외되도록 구체적으로 적음)
const PUBLIC_HOLIDAY =
  /공휴일|어린이날|노동절|근로자의\s?날|현충일|광복절|개천절|한글날|성탄절|신정|설\s?연휴|설날|추석|삼일절|3\.1절|부처님\s?오신\s?날|지방선거|대통령선거|국회의원선거|선거일/
const SCHOOL_CLOSED = /재량휴업|휴업일|개교기념일/
const VACATION_START = /방학식|종업식/
const VACATION_END = /개학식|입학식/

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * 학사일정 PDF에서 '3(화) 입학식' 같은 줄을 찾아 날짜별 행사로 만든다.
 * 월 표시가 줄마다 있지 않아서, 3월부터 차례로 내려가며 '일자와 요일이 맞는 가장 가까운 날'로 날짜를 정한다.
 */
export function parseCalendar(pages: PdfPages): { year: number; events: CalendarEvent[]; holidays: string[] } {
  const lines = pages.flatMap((p) => groupLines(p))
  const all = lines.map(joinLine).join('\n')
  const year = Number(all.match(/(\d{4})\s*학년도/)?.[1] ?? new Date().getFullYear())

  // 행사 칸이 시작되는 x 위치: 날짜로 시작하는 조각들의 가장 왼쪽
  const starts = lines.flatMap((l) => l.filter((it) => /^\d{1,2}\(([월화수목금토일]\)?)?$/.test(it.s.trim()) && /\(/.test(it.s)))
  const eventX = starts.length ? Math.min(...starts.map((it) => it.x)) - 4 : 0

  const raw: { day: number; week: string; text: string }[] = []
  for (const line of lines) {
    const text = joinLine(line.filter((it) => it.x >= eventX))
    if (!text) continue
    const m = text.match(DATE_HEAD)
    if (m) raw.push({ day: Number(m[1]), week: m[2], text: text.slice(m[0].length) })
    else if (raw.length && line[0].x >= eventX && !/^\d+$/.test(text) && !/교무운영부|학사 일정은|\d{4}\.\s?\d/.test(text))
      raw[raw.length - 1].text += ' ' + text // 다음 줄로 넘어간 긴 행사 이름
  }

  const events: CalendarEvent[] = []
  let cursor = new Date(year, 2, 1) // 학년도는 3월에 시작
  for (const r of raw) {
    let found: Date | null = null
    for (let i = 0; i < 80; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i)
      if (d.getDate() === r.day && WEEK[d.getDay()] === r.week) {
        found = d
        break
      }
    }
    if (!found) continue
    cursor = found
    for (const title of splitTitles(r.text)) {
      const kind: EventKind = SCHOOL_CLOSED.test(title) ? '휴업일' : PUBLIC_HOLIDAY.test(title) ? '공휴일' : '행사'
      events.push({ date: iso(found), title, kind })
    }
  }

  // 방학: 방학식(종업식) 다음 날부터 다음 개학식(입학식) 전날까지의 평일
  const vacation: CalendarEvent[] = []
  events.forEach((e, i) => {
    if (!VACATION_START.test(e.title) || /방과후/.test(e.title)) return
    const end = events.slice(i + 1).find((x) => VACATION_END.test(x.title))
    const [y, m, d] = e.date.split('-').map(Number)
    const stop = end ? end.date : `${year + 1}-02-28`
    for (let k = 1; k < 120; k++) {
      const day = new Date(y, m - 1, d + k)
      const s = iso(day)
      if (s >= stop) break
      // 졸업식·등교일처럼 일부 학년이 등교하는 날은 방학에서 뺀다
      if (day.getDay() > 0 && day.getDay() < 6 && !events.some((x) => x.date === s && (x.kind !== '행사' || /등교|졸업/.test(x.title))))
        vacation.push({ date: s, title: '방학', kind: '방학' })
    }
  })

  const merged = [...events, ...vacation].sort((a, b) => a.date.localeCompare(b.date))
  const holidays = [...new Set(merged.filter((e) => e.kind !== '행사').map((e) => e.date))].filter((s) => {
    const [y, m, d] = s.split('-').map(Number)
    const wd = new Date(y, m - 1, d).getDay()
    return wd > 0 && wd < 6
  })
  return { year, events: merged, holidays }
}

/** '전국연합학력평가 (1,2학년), 수능모의평가 (3학년)'처럼 쉼표로 이어진 행사를 나눈다 (괄호 안 쉼표는 유지) */
function splitTitles(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    // '1,2학년'처럼 숫자 사이의 쉼표는 나누지 않는다
    const betweenDigits = /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')
    if (ch === ',' && depth === 0 && !betweenDigits) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((t) => t.replace(/\s+/g, ' ').replace(/\s+([),.])/g, '$1').trim()).filter(Boolean)
}
