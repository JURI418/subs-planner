import { days, uid, type Teacher, type TimetableEntry } from '../types'
import type { PdfPages, TextItem } from './types'

const WEEKDAYS = ['월', '화', '수', '목', '금']
const PERIOD_LABEL = /^(\d{1,2})\(\d{1,2}:\d{2}\)$/
const cx = (i: TextItem) => i.x + i.w / 2

type Block = { name: string; y: number; centers: number[]; left: number; right: number }

/**
 * 한글에서 PDF로 저장한 교사 시간표(한 쪽에 교사 여러 명)를 읽는다.
 * 교사 이름 + '월 화 수 목 금' 머리줄을 찾고, 각 칸의 반 번호(303)와 과목(H_독토)을
 * 가장 가까운 요일 열·교시 줄에 배정한다.
 */
export function parseTimetablePdf(pages: PdfPages, existing: Teacher[] = []) {
  const entries: TimetableEntry[] = []
  const errors: string[] = []
  const newTeachers: Teacher[] = []
  const teacherFor = (name: string) => {
    let t = existing.find((x) => x.name === name) ?? newTeachers.find((x) => x.name === name)
    if (!t) {
      t = {
        id: uid('t'),
        name,
        subject: '미지정',
        grades: [],
        employmentType: '정규',
        poolStatus: name.startsWith('가상') ? '제외' : '기본',
        totalAssignments: 0,
      }
      newTeachers.push(t)
    }
    return t
  }

  for (const page of pages) {
    const items = page.filter((i) => i.s.trim()).map((i) => ({ ...i, s: i.s.trim() }))
    const blocks: Block[] = []
    for (const mon of items.filter((i) => i.s === '월')) {
      const row = items.filter((i) => Math.abs(i.y - mon.y) <= 2)
      const cols = WEEKDAYS.map(
        (d) => row.filter((i) => i.s === d && i.x >= mon.x - 1 && i.x < mon.x + 260).sort((a, b) => a.x - b.x)[0],
      )
      if (cols.some((c) => !c)) continue
      const nameParts = row
        .filter((i) => i.x < mon.x && i.x > mon.x - 110 && !WEEKDAYS.includes(i.s))
        .sort((a, b) => a.x - b.x)
      if (!nameParts.length) continue
      blocks.push({
        name: nameParts.map((i) => i.s).join(''),
        y: mon.y,
        centers: cols.map(cx),
        left: nameParts[0].x - 15,
        right: cols[4].x + cols[4].w + 25,
      })
    }

    for (const b of blocks) {
      const below = blocks
        .filter((o) => o !== b && o.y < b.y - 5 && Math.abs(o.left - b.left) < 60)
        .sort((x, y) => y.y - x.y)[0]
      const bottom = below ? below.y + 3 : -Infinity
      const inside = items.filter((i) => i.y < b.y - 2 && i.y > bottom && cx(i) >= b.left && cx(i) <= b.right)
      const periods = inside
        .filter((i) => PERIOD_LABEL.test(i.s))
        .map((i) => ({ p: Number(i.s.match(PERIOD_LABEL)![1]), y: i.y }))
      if (!periods.length) continue
      const teacher = teacherFor(b.name)
      const cells = new Map<string, TextItem[]>()
      for (const it of inside) {
        if (PERIOD_LABEL.test(it.s) || it.s === '-') continue
        const per = periods.reduce((a, c) => (Math.abs(c.y - it.y) < Math.abs(a.y - it.y) ? c : a))
        if (Math.abs(per.y - it.y) > 14) continue
        const dayIdx = b.centers.reduce((best, c, i) => (Math.abs(c - cx(it)) < Math.abs(b.centers[best] - cx(it)) ? i : best), 0)
        if (Math.abs(b.centers[dayIdx] - cx(it)) > 20) continue
        const key = `${dayIdx}-${per.p}`
        cells.set(key, [...(cells.get(key) ?? []), it])
      }
      for (const [key, parts] of cells) {
        const [dayIdx, period] = key.split('-').map(Number)
        const sorted = parts.sort((a, c) => c.y - a.y || a.x - c.x)
        const room = sorted.find((i) => /^\d{3,4}$/.test(i.s))?.s
        const rest = sorted.filter((i) => i.s !== room).map((i) => i.s).join('')
        if (!room) {
          errors.push(`${b.name} ${days[dayIdx]} ${period}교시: 반 번호 없음 (${rest})`)
          continue
        }
        const m = rest.match(/^([A-Za-z])_(.+)$/)
        entries.push({
          id: uid('tt'),
          teacherId: teacher.id,
          dayOfWeek: days[dayIdx],
          period,
          grade: Number(room[0]),
          room,
          group: m?.[1],
          subject: (m ? m[2] : rest) || '미지정',
        })
      }
    }
  }
  return { entries, errors, newTeachers }
}
