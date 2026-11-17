import { dateDay, uid, type AppData, type Assignment, type Slot, type Teacher } from './types'

/** 구글 시트 ‘보강’ 탭의 한 줄: 결강 교사, 보강 날짜, 보강 교시, 보강 교사, 대상 학급, 과목 */
export type CoverRow = {
  absent: string
  date: string
  period: number
  sub: string
  grade: number
  room: string
  subject: string
}

const cleanName = (s: string) => s.replace(/\(.*?\)/g, '').replace(/\s+/g, '').trim()
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 시트에서 복사한 표(탭 구분) 또는 CSV를 읽는다.
 * 열 순서: 순번, 결강 교사, 보강 날짜(03. 12), 보강 교시(6교시), 보강 교사, 대상 학급(2-4 또는 204), 과목
 * 날짜의 연도는 시트에 없어서 year(학년도 시작 연도)로 정하고, 1~2월은 다음 해로 본다.
 */
export function parseCoverText(text: string, year: number) {
  const rows: CoverRow[] = []
  const noSub: number[] = []
  const changed: number[] = []
  const bad: string[] = []
  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const f = (raw.includes('\t') ? raw.split('\t') : raw.split(',')).map((x) => x.trim())
    const dm = (f[2] ?? '').match(/^(\d{1,2})\s*[.\-/]\s*(\d{1,2})$/)
    const pm = (f[3] ?? '').match(/^(\d)\s*교시?$/)
    if (!dm || !pm) {
      if (!/결강\s*교사|보강\s*날짜|순번/.test(line)) bad.push(line)
      return
    }
    const m = Number(dm[1])
    const d = Number(dm[2])
    const y = m <= 2 ? year + 1 : year
    const date = `${y}-${pad(m)}-${pad(d)}`
    const probe = new Date(y, m - 1, d)
    const dow = probe.getDay()
    const absent = cleanName(f[1] ?? '')
    if (probe.getMonth() !== m - 1 || dow === 0 || dow === 6 || !absent) {
      bad.push(line)
      return
    }
    const subRaw = (f[4] ?? '').trim()
    if (/수업\s*변경/.test(subRaw)) return void changed.push(i)
    const sub = cleanName(subRaw)
    if (!sub) return void noSub.push(i)
    const cls = (f[5] ?? '').trim()
    let grade = 0
    let room = ''
    let c = cls.match(/^([1-3])\s*-\s*(\d{1,2})$/)
    if (c) {
      grade = Number(c[1])
      room = `${c[1]}${pad(Number(c[2]))}`
    } else if ((c = cls.match(/^([1-3])\d{2}$/))) {
      grade = Number(c[1])
      room = cls
    }
    rows.push({ absent, date, period: Number(pm[1]), sub, grade, room, subject: (f[6] ?? '').trim() })
  })
  return { rows, noSub: noSub.length, changed: changed.length, bad }
}

/** 읽은 줄을 지난 ‘확정’ 보강으로 추가한다. 같은 결강 교사·날짜·교시가 이미 있으면 건너뛴다 */
export function applyCoverRows(data: AppData, rows: CoverRow[]) {
  const teachers: Teacher[] = [...data.teachers]
  const byName = new Map(teachers.filter((t) => !t.name.startsWith('가상')).map((t) => [t.name, t]))
  const created: string[] = []
  const teacherOf = (name: string) => {
    let t = byName.get(name)
    if (!t) {
      // 시간표에 없는 선생님은 통계용으로만 추가 (보강 후보에서는 제외)
      t = { id: uid('t'), name, subject: '', grades: [], employmentType: '정규', poolStatus: '제외', totalAssignments: 0 }
      byName.set(name, t)
      teachers.push(t)
      created.push(name)
    }
    return t
  }
  const seen = new Set(data.slots.map((s) => `${s.absentTeacherId}|${s.date}|${s.period}`))
  const absences = [...data.absences]
  const slots: Slot[] = []
  const assignments: Assignment[] = []
  const bumps = new Map<string, number>()
  let skipped = 0
  for (const r of rows) {
    const abs = teacherOf(r.absent)
    const key = `${abs.id}|${r.date}|${r.period}`
    if (seen.has(key)) {
      skipped++
      continue
    }
    seen.add(key)
    const sub = teacherOf(r.sub)
    let ab = absences.find((a) => a.teacherId === abs.id && a.startDate === r.date && a.endDate === r.date)
    if (!ab) {
      ab = { id: uid('a'), teacherId: abs.id, startDate: r.date, endDate: r.date, mode: '교시선택', periods: [], reason: '기록 가져옴' }
      absences.push(ab)
    }
    if (ab.mode === '교시선택') ab.periods = [...new Set([...(ab.periods ?? []), r.period])].sort((x, y) => x - y)
    const slot: Slot = {
      id: uid('s'),
      absenceId: ab.id,
      date: r.date,
      dayOfWeek: dateDay(r.date),
      period: r.period,
      grade: r.grade,
      room: r.room,
      subject: r.subject,
      absentTeacherId: abs.id,
    }
    slots.push(slot)
    assignments.push({
      slotId: slot.id,
      substituteTeacherId: sub.id,
      status: '확정',
      isManual: true,
      score: 0,
      reasons: ['지난 기록 가져옴'],
      backups: [null, null],
      sheetSent: 'skip',
    })
    bumps.set(sub.id, (bumps.get(sub.id) ?? 0) + 1)
  }
  const next: AppData = {
    ...data,
    teachers: teachers.map((t) => (bumps.has(t.id) ? { ...t, totalAssignments: t.totalAssignments + bumps.get(t.id)! } : t)),
    absences,
    slots: [...data.slots, ...slots],
    assignments: [...data.assignments, ...assignments],
  }
  return { data: next, added: slots.length, skipped, created }
}
