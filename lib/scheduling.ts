import type { Absence, AppData, Assignment, Slot, Teacher, TimetableEntry } from './types'

/** 해당 교사가 그 날짜·교시에 결강 중인지 */
export function isAbsentAt(teacherId: string, date: string, period: number, absences: Absence[]) {
  return absences.some(
    (a) =>
      a.teacherId === teacherId &&
      a.startDate <= date &&
      date <= a.endDate &&
      (a.mode === '종일' || (a.periods ?? []).includes(period)),
  )
}

type Scored = { t: Teacher; score: number; reasons: string[] }

export function recommend(slot: Slot, data: AppData, prior: Assignment[] = data.assignments) {
  const tts = data.timetable
  const candidates = data.teachers.filter(
    (t) => t.id !== slot.absentTeacherId && t.poolStatus !== '제외' && !t.name.startsWith('가상'),
  )
  const reasonsById = new Map<string, string[]>()

  const scored: Scored[] = candidates
    .map((t) => {
      const dayEntries = tts.filter((e) => e.teacherId === t.id && e.dayOfWeek === slot.dayOfWeek)
      const samePeriod = dayEntries.some((e) => e.period === slot.period)
      // 같은 날 이미 맡은 보강
      const assigned = prior
        .filter((a) => a.substituteTeacherId === t.id)
        .map((a) => data.slots.find((s) => s.id === a.slotId))
        .filter((s): s is Slot => !!s && s.date === slot.date)
      const sameAssigned = assigned.some((s) => s.period === slot.period)
      const absent = isAbsentAt(t.id, slot.date, slot.period, data.absences)

      const occupied = dayEntries.map((e) => e.period).concat(assigned.map((s) => s.period))
      const dayCount = occupied.length + 1
      const periods = occupied.concat(slot.period).sort((a, b) => a - b)
      let run = 1
      let maxRun = 1
      for (let i = 1; i < periods.length; i++) {
        if (periods[i] === periods[i - 1] + 1) run++
        else run = 1
        maxRun = Math.max(maxRun, run)
      }

      const reasons: string[] = []
      if (absent) reasons.push('해당 일자 결강')
      if (samePeriod) reasons.push('해당 교시 수업 있음')
      if (sameAssigned) reasons.push('해당 교시 다른 보강 있음')
      if (dayCount >= data.settings.maxDaily) reasons.push(`그날 수업 ${dayCount}개`)
      if (maxRun >= data.settings.maxConsecutive) reasons.push(`연속 ${maxRun}교시 초과`)
      reasonsById.set(t.id, reasons)
      if (reasons.length) return { t, score: -999, reasons }

      const sameGrade = t.grades.includes(slot.grade) || t.poolStatus === '추가포함'
      const w = data.settings.weights
      const score =
        (sameGrade ? w.grade : 0) +
        (dayCount <= 2 ? w.daily : dayCount === 3 ? 5 : 0) +
        (Math.max(0, 10 - t.totalAssignments) * w.fairness) / 10 +
        (maxRun <= 2 ? 10 : 0) -
        assigned.length * 5
      return {
        t,
        score,
        reasons: [
          sameGrade ? '같은 학년 담당' : '추가 포함 후보',
          `그날 수업 ${dayCount - 1}개`,
          `연속 ${maxRun}교시`,
          `누적 보강 ${t.totalAssignments}회`,
        ],
      }
    })
    .filter((x) => x.score > -999)
    .sort((a, b) => b.score - a.score)

  return {
    winner: scored[0] as Scored | undefined,
    top: scored.slice(0, 3),
    ranked: scored,
    blocked: [...reasonsById.entries()].filter(([, r]) => r.length).map(([id, reasons]) => ({ id, reasons })),
  }
}

/** 슬롯 순서대로 자동 배정. 다른 슬롯의 기존 배정(제안·확정)은 그대로 두고 부담 계산에 반영 */
export function runScheduling(data: AppData, slots: Slot[]) {
  const targetIds = new Set(slots.map((s) => s.id))
  const assignments = data.assignments.filter((a) => !targetIds.has(a.slotId))
  for (const slot of [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period)) {
    assignments.push(autoAssign(slot, { ...data, assignments }, assignments))
  }
  return assignments
}

/** 슬롯 하나에 대한 자동 추천 결과를 Assignment로 만든다 */
export function autoAssign(slot: Slot, data: AppData, prior: Assignment[]): Assignment {
  const result = recommend(slot, data, prior)
  return {
    slotId: slot.id,
    substituteTeacherId: result.winner?.t.id ?? null,
    status: result.winner ? '제안' : '배정불가',
    isManual: false,
    score: result.winner?.score ?? 0,
    reasons: result.winner?.reasons ?? ['조건을 만족하는 후보 없음'],
    backups: [result.top[1]?.t.id ?? null, result.top[2]?.t.id ?? null],
  }
}

/** 수동 배정 검증: 위반 사유 목록을 반환 (문제 없으면 빈 배열) */
export function validateAssignment(slot: Slot, teacherId: string, data: AppData): string[] {
  const teacher = data.teachers.find((t) => t.id === teacherId)
  if (!teacher) return ['존재하지 않는 교사']
  const reasons: string[] = []
  if (teacherId === slot.absentTeacherId) reasons.push('결강 교사 본인')
  if (teacher.poolStatus === '제외') reasons.push('보강 후보 제외 교사')
  const prior = data.assignments.filter((a) => a.slotId !== slot.id)
  const blocked = recommend(slot, data, prior).blocked.find((b) => b.id === teacherId)
  if (blocked) reasons.push(...blocked.reasons)
  else if (isAbsentAt(teacherId, slot.date, slot.period, data.absences)) reasons.push('해당 일자 결강')
  return [...new Set(reasons)]
}

export function gridForTeacher(teacherId: string, day: string, data: AppData) {
  return data.timetable
    .filter((e) => e.teacherId === teacherId && e.dayOfWeek === day)
    .sort((a, b) => a.period - b.period)
}

export type Parsed = { entries: TimetableEntry[]; errors: string[] }

export function makeSlots(
  absenceId: string,
  teacherId: string,
  start: string,
  end: string,
  data: AppData,
  periods?: number[],
) {
  const out: Slot[] = []
  for (let cur = start; cur <= end; cur = nextDate(cur)) {
    const day = data.settings.holidays.includes(cur) ? null : dayOf(cur)
    if (!day) continue
    data.timetable
      .filter(
        (e) => e.teacherId === teacherId && e.dayOfWeek === day && (!periods || periods.includes(e.period)),
      )
      .forEach((e) =>
        out.push({
          id: `s-${absenceId}-${cur}-${e.period}-${e.teacherId}`,
          absenceId,
          date: cur,
          dayOfWeek: day,
          period: e.period,
          grade: e.grade,
          room: e.room,
          group: e.group,
          subject: e.subject,
          absentTeacherId: teacherId,
        }),
      )
  }
  return out
}

function nextDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  const n = new Date(y, m - 1, day + 1)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function dayOf(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, day).getDay()] as any
}

export type DayCell = { period: number; kind: 'class' | 'cover' | 'this' | 'free'; label: string }

/**
 * 보강 교사 후보의 그날 하루: 교시별로 자기 수업 / 다른 보강 / 이번 보강 / 빈 시간.
 * 추천 근거(그날 수업 수, 연속 교시, 누적 보강)를 눈으로 확인하는 데 쓴다.
 */
export function teacherDay(teacherId: string, slot: Slot, data: AppData) {
  const prior = data.assignments.filter((a) => a.slotId !== slot.id)
  const own = data.timetable.filter((e) => e.teacherId === teacherId && e.dayOfWeek === slot.dayOfWeek)
  const covers = prior
    .filter((a) => a.substituteTeacherId === teacherId)
    .map((a) => data.slots.find((s) => s.id === a.slotId))
    .filter((s): s is Slot => !!s && s.date === slot.date)
  const cells: DayCell[] = Array.from({ length: data.settings.periodCount }, (_, i) => {
    const p = i + 1
    if (p === slot.period) return { period: p, kind: 'this', label: `${slot.room} 보강` }
    const c = own.find((e) => e.period === p)
    if (c) return { period: p, kind: 'class', label: `${c.room}${c.group ?? ''}` }
    const v = covers.find((x) => x.period === p)
    if (v) return { period: p, kind: 'cover', label: `${v.room} 보강` }
    return { period: p, kind: 'free', label: '' }
  })
  let run = 0
  let maxRun = 0
  for (const c of cells) {
    run = c.kind === 'free' ? 0 : run + 1
    maxRun = Math.max(maxRun, run)
  }
  const teacher = data.teachers.find((t) => t.id === teacherId)
  return {
    cells,
    classes: own.length,
    covers: covers.length,
    total: cells.filter((c) => c.kind !== 'free').length,
    maxRun,
    totalAssignments: teacher?.totalAssignments ?? 0,
    clash: own.some((e) => e.period === slot.period) || covers.some((x) => x.period === slot.period),
  }
}
