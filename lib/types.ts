import type { Dispatch, SetStateAction } from 'react'
export type EmploymentType = '정규' | '시간강사'
export type PoolStatus = '기본' | '제외' | '추가포함'
export type Day = '월' | '화' | '수' | '목' | '금'
export type Teacher = {
  id: string
  name: string
  subject: string
  grades: number[]
  employmentType: EmploymentType
  poolStatus: PoolStatus
  totalAssignments: number
}
export type TimetableEntry = {
  id: string
  teacherId: string
  dayOfWeek: Day
  period: number
  grade: number
  room: string
  group?: string
  subject: string
}
export type Absence = {
  id: string
  teacherId: string
  startDate: string
  endDate: string
  mode: '종일' | '교시선택'
  periods?: number[]
  reason: string
}
export type Slot = {
  id: string
  absenceId: string
  date: string
  dayOfWeek: Day
  period: number
  grade: number
  room: string
  group?: string
  subject: string
  absentTeacherId: string
}
export type Assignment = {
  slotId: string
  substituteTeacherId: string | null
  status: '제안' | '확정' | '배정불가'
  isManual: boolean
  score: number
  reasons: string[]
  /** 보강 교사가 못 들어갈 때를 대비한 예비 교사 [예비1, 예비2] */
  backups: [string | null, string | null]
}
export type Settings = {
  semester: string
  startDate: string
  endDate: string
  periodCount: number
  breaks: string[]
  holidays: string[]
  maxDaily: number
  maxConsecutive: number
  recentDays: number
  weights: { grade: number; daily: number; fairness: number }
}
export type AppData = {
  teachers: Teacher[]
  timetable: TimetableEntry[]
  absences: Absence[]
  slots: Slot[]
  assignments: Assignment[]
  settings: Settings
  /** 학사일정 PDF에서 읽은 날짜별 행사 */
  events: CalendarEvent[]
}
export type EventKind = '공휴일' | '휴업일' | '방학' | '행사'
export type CalendarEvent = { date: string; title: string; kind: EventKind }
export const days: Day[] = ['월', '화', '수', '목', '금']
export const defaultSettings: Settings = {
  semester: '2026학년도 2학기',
  startDate: '2026-08-17',
  endDate: '2027-02-28',
  periodCount: 7,
  breaks: [
    '08:10~09:00',
    '09:10~10:00',
    '10:10~11:00',
    '11:10~12:00',
    '13:00~13:50',
    '14:00~14:50',
    '15:00~15:50',
  ],
  holidays: [],
  maxDaily: 4,
  maxConsecutive: 4,
  recentDays: 14,
  weights: { grade: 30, daily: 20, fairness: 15 },
}
export function dateDay(date: string): Day {
  const [y, m, d] = date.split('-').map(Number)
  return days[new Date(y, m - 1, d).getDay() - 1]
}
export function formatDate(date: string) {
  const [, m, d] = date.split('-')
  return `${m}. ${d}`
}
/** 로컬 기준 오늘 날짜 'YYYY-MM-DD' */
export function todayISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
/** '2026년 10월 8일 목요일' */
export function formatKoreanDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const day = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}년 ${m}월 ${d}일 ${day}요일`
}
/** '2026.10.08(목)' */
export function formatDotDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const day = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}(${day})`
}
/** 학기 시작일 기준 몇 주차인지 (시작 전이면 0) */
export function weekOfSemester(date: string, startDate: string) {
  const toTime = (x: string) => {
    const [y, m, d] = x.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  const diff = Math.round((toTime(date) - toTime(startDate)) / 86400000)
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1
}
export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
export function emptyData(): AppData {
  return {
    teachers: [],
    timetable: [],
    absences: [],
    slots: [],
    assignments: [],
    settings: defaultSettings,
    events: [],
  }
}
export function seedData(): AppData {
  // 샘플용 가상 이름 (실명 사용 안 함). 21번째 '가상E'는 자동 제외 규칙 확인용으로 유지
  const names = Array.from({ length: 24 }, (_, i) =>
    i === 20 ? '가상E' : `교사${String(i + 1).padStart(2, '0')}`,
  )
  const partTime = ['교사22', '교사23', '교사24'] // 시간강사 + 보강 후보 제외
  const extraPool = ['교사17', '교사19'] // 보강 후보 추가 포함
  const subjects = [
    '국어',
    '국어',
    '논술',
    '수학',
    '수학',
    '미적분',
    '미적분',
    '미적분',
    '기하',
    '수사통',
    '수사적',
    '수사적',
    '한국사',
    '한국사',
    '비문',
    '통사',
    '통사',
    '통사',
    '과탐실',
    '경제',
    '임시',
    '체육2',
    '영어',
    '체육2',
  ]
  const teachers: Teacher[] = names.map((name, i) => ({
    id: `t${i + 1}`,
    name,
    subject: subjects[i],
    grades: [(i % 3) + 1],
    employmentType: partTime.includes(name) ? '시간강사' : '정규',
    poolStatus:
      name.startsWith('가상') || partTime.includes(name)
        ? '제외'
        : extraPool.includes(name)
          ? '추가포함'
          : '기본',
    totalAssignments: i % 4,
  }))
  const timetable: TimetableEntry[] = []
  teachers.forEach((t, ti) => {
    for (let p = 1; p <= 7; p++) {
      const day = days[(ti + p) % 5]
      if ((ti + p) % 4 !== 0)
        timetable.push({
          id: uid('tt'),
          teacherId: t.id,
          dayOfWeek: day,
          period: p,
          grade: t.grades[0],
          room: `${t.grades[0]}0${(ti % 9) + 1}`,
          group: ti % 5 === 0 ? 'G' : undefined,
          subject: t.subject,
        })
    }
  })
  const absences: Absence[] = [
    {
      id: 'a1',
      teacherId: 't1',
      startDate: '2026-10-08',
      endDate: '2026-10-08',
      mode: '종일',
      reason: '병가',
    },
  ]
  const slots: Slot[] = [
    {
      id: 's1',
      absenceId: 'a1',
      date: '2026-10-08',
      dayOfWeek: '목',
      period: 2,
      grade: 1,
      room: '106',
      subject: '국어',
      absentTeacherId: 't1',
    },
  ]
  const assignments: Assignment[] = [
    {
      slotId: 's1',
      substituteTeacherId: 't2',
      status: '제안',
      isManual: false,
      score: 82,
      reasons: ['같은 학년 담당', '그날 수업 1개', '연속 1교시', '누적 보강 1회'],
      backups: ['t5', 't8'],
    },
  ]
  // 대시보드 예시용 행사 (실제 학사일정 PDF를 올리면 교체됨)
  const plus = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const events: CalendarEvent[] = [
    { date: plus(0), title: '교직원 회의 (예시)', kind: '행사' },
    { date: plus(2), title: '전국연합학력평가 (예시)', kind: '행사' },
    { date: plus(6), title: '재량휴업일 (예시)', kind: '휴업일' },
  ]
  return { teachers, timetable, absences, slots, assignments, settings: defaultSettings, events }
}

/** 예전 버전에서 저장된 데이터에 새 항목(학사일정 등)이 없으면 기본값으로 채운다 */
export function normalizeData(raw: Partial<AppData> & Record<string, unknown>): AppData {
  return {
    ...emptyData(),
    ...raw,
    settings: {
      ...defaultSettings,
      ...(raw.settings ?? {}),
      weights: { ...defaultSettings.weights, ...(raw.settings?.weights ?? {}) },
    },
    events: Array.isArray(raw.events) ? raw.events : [],
    // '기간제'는 근무 구분에서 빠졌으므로 정규로 본다
    teachers: (raw.teachers ?? []).map((t) =>
      t.employmentType === '시간강사' ? t : { ...t, employmentType: '정규' as const },
    ),
    assignments: (raw.assignments ?? []).map((a) => ({
      ...a,
      backups: Array.isArray(a.backups) ? a.backups : [null, null],
    })),
  } as AppData
}
export function parseTimetable(text: string, existing: Teacher[] = []) {
  const entries: TimetableEntry[] = []
  const errors: string[] = []
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
  // 기존 교사 목록에 없는 이름이면 새 교사로 만든다 (같은 이름은 한 번만)
  const newTeachers: Teacher[] = []
  let teacher: Teacher | undefined
  let p = 0
  for (const line of lines) {
    const cells = line.split(/\t| +(?=\d+\()/)
    if (line.includes('월') && line.includes('화')) {
      const name = cells[0].replace(/월.*/, '').trim()
      teacher = existing.find((t) => t.name === name) || newTeachers.find((t) => t.name === name)
      if (!teacher) {
        teacher = {
          id: uid('t'),
          name,
          subject: '미지정',
          grades: [],
          employmentType: '정규',
          poolStatus: name.startsWith('가상') ? '제외' : '기본',
          totalAssignments: 0,
        }
        newTeachers.push(teacher)
      }
      p = 0
      continue
    }
    if (/^\d+\(/.test(line) && teacher) {
      p = Number(line.match(/^(\d+)/)?.[1])
      const parts = line.split('\t').slice(1)
      parts.forEach((cell, i) => {
        const m = cell.match(/^(\d{3})(?:(\w)_)?.*$/)
        if (cell === '-' || !cell) return
        if (!m) {
          errors.push(`${teacher?.name} ${days[i]} ${p}교시: ${cell}`)
          return
        }
        const subject = cell.replace(/^\d{3}(?:\w_)?/, '')
        entries.push({
          id: uid('tt'),
          teacherId: teacher!.id,
          dayOfWeek: days[i],
          period: p,
          grade: Number(m[1][0]),
          room: m[1],
          group: m[2],
          subject,
        })
      })
    }
  }
  return { entries, errors, newTeachers }
}
/** 엑셀·나이스 붙여넣기용: 결강교사 / 날짜 / 교시 / 보강교사 (탭 구분, 날짜·교시 순) */
export function exportText(data: AppData) {
  return data.assignments
    .filter((a) => a.substituteTeacherId)
    .map((a) => ({ a, s: data.slots.find((x) => x.id === a.slotId) }))
    .filter((x): x is { a: Assignment; s: Slot } => !!x.s)
    .sort((x, y) => x.s.date.localeCompare(y.s.date) || x.s.period - y.s.period)
    .map(({ a, s }) => {
      const absent = data.teachers.find((t) => t.id === s.absentTeacherId)?.name
      const sub = data.teachers.find((t) => t.id === a.substituteTeacherId)?.name
      return [absent, formatDate(s.date), s.period, sub].join('\t')
    })
    .join('\n')
}
export const samplePaste = `교사샘플\t월\t화\t수\t목\t금\n1(08:10)\t303H_독토\t303독토\t\t301G_독토\t\n2(09:10)\t210문학\t210문학\t\t\t\n3(10:10)\t301G_독토\t\t303H_독토\t309I_독토\t\n4(11:10)\t209문학\t210문학\t301G_독토\t309독토\t\n5(13:00)\t309I_독토\t\t\t\t\n6(14:00)\t210문학\t\t\t\t\n7(15:00)\t-\t-\t-\t-\t-`

export type SetData = Dispatch<SetStateAction<AppData>>
