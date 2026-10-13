import { normalizeData, type AppData, type Slot } from './types'
import { autoAssign, runScheduling } from './scheduling'

/** 확정 취소: 상태를 '제안'으로 되돌리고 보강 교사의 누적 보강 횟수를 1 줄인다 */
export function cancelConfirm(d: AppData, slotId: string): AppData {
  const target = d.assignments.find((a) => a.slotId === slotId)
  if (!target || target.status !== '확정') return d
  return {
    ...d,
    assignments: d.assignments.map((a) => (a.slotId === slotId ? { ...a, status: '제안' } : a)),
    teachers: d.teachers.map((t) =>
      t.id === target.substituteTeacherId
        ? { ...t, totalAssignments: Math.max(0, t.totalAssignments - 1) }
        : t,
    ),
  }
}

/** 결강 하나가 가진 슬롯 수와 확정된 보강 수 */
export function absenceSummary(d: AppData, absenceId: string) {
  const slotIds = new Set(d.slots.filter((s) => s.absenceId === absenceId).map((s) => s.id))
  const confirmed = d.assignments.filter((a) => slotIds.has(a.slotId) && a.status === '확정').length
  return { slots: slotIds.size, confirmed }
}

/** 결강 삭제: 결강과 그 슬롯·배정을 지우고, 확정됐던 보강은 누적 횟수에서 뺀다 */
export function deleteAbsence(d: AppData, absenceId: string): AppData {
  const slotIds = new Set(d.slots.filter((s) => s.absenceId === absenceId).map((s) => s.id))
  const minus = new Map<string, number>()
  d.assignments
    .filter((a) => slotIds.has(a.slotId) && a.status === '확정' && a.substituteTeacherId)
    .forEach((a) => minus.set(a.substituteTeacherId!, (minus.get(a.substituteTeacherId!) ?? 0) + 1))
  return {
    ...d,
    absences: d.absences.filter((a) => a.id !== absenceId),
    slots: d.slots.filter((s) => !slotIds.has(s.id)),
    assignments: d.assignments.filter((a) => !slotIds.has(a.slotId)),
    teachers: d.teachers.map((t) =>
      minus.has(t.id) ? { ...t, totalAssignments: Math.max(0, t.totalAssignments - minus.get(t.id)!) } : t,
    ),
  }
}

/** 백업 JSON을 검사해서 AppData로 바꾼다. 형식이 틀리면 error에 이유를 담는다 */
export function parseBackup(text: string): { data?: AppData; error?: string } {
  let raw: any
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'JSON 형식이 아닙니다. 이 앱에서 내보낸 백업 파일인지 확인하세요.' }
  }
  if (!raw || typeof raw !== 'object') return { error: '백업 내용이 비어 있습니다.' }
  const lists = ['teachers', 'timetable', 'absences', 'slots', 'assignments'] as const
  const missing = lists.filter((k) => !Array.isArray(raw[k]))
  if (missing.length) return { error: `백업 파일에 필요한 항목이 없습니다: ${missing.join(', ')}` }
  const badTeacher = raw.teachers.find(
    (t: any) => !t || typeof t.id !== 'string' || typeof t.name !== 'string',
  )
  if (badTeacher) return { error: '교사 정보 형식이 올바르지 않습니다.' }
  return { data: normalizeData(raw) }
}

/**
 * 가중치 등을 바꾼 뒤, 자동으로 추천된 미확정 배정(제안·배정불가)을 현재 설정으로 다시 추천한다.
 * 확정된 배정과 사람이 직접 고른 수동 배정은 건드리지 않는다.
 */
export function recomputeProposals(d: AppData): { data: AppData; total: number; changed: number } {
  const targets = d.assignments.filter((a) => a.status !== '확정' && !a.isManual)
  const targetIds = new Set(targets.map((a) => a.slotId))
  const slots = d.slots.filter((s) => targetIds.has(s.id))
  if (!slots.length) return { data: d, total: 0, changed: 0 }
  const result = runScheduling(d, slots)
  const redone = new Map(result.filter((a) => targetIds.has(a.slotId)).map((a) => [a.slotId, a]))
  const changed = targets.filter(
    (a) => redone.get(a.slotId)?.substituteTeacherId !== a.substituteTeacherId,
  ).length
  return {
    data: { ...d, assignments: d.assignments.map((a) => redone.get(a.slotId) ?? a) },
    total: slots.length,
    changed,
  }
}

/**
 * 교사가 보강 후보에서 빠졌을 때(시간강사로 변경, 후보 '제외') 이미 만들어진 배정에 반영한다.
 * - 확정 전 배정: 그 교사가 보강·예비로 들어가 있으면 다시 추천
 * - 확정된 배정: 예비에서만 빼고(빈자리는 다시 추천), 보강 교사인 경우는 목록으로 알려 준다
 */
export function excludeTeacher(d: AppData, teacherId: string, onlySlot?: (s: Slot) => boolean) {
  let assignments = d.assignments
  let replaced = 0
  const conflicts: Slot[] = []
  for (const a of d.assignments) {
    const slot = d.slots.find((s) => s.id === a.slotId)
    if (!slot || (onlySlot && !onlySlot(slot))) continue
    const involved = a.substituteTeacherId === teacherId || a.backups.includes(teacherId)
    if (!involved) continue
    const prior = assignments.filter((x) => x.slotId !== a.slotId)
    const redo = autoAssign(slot, { ...d, assignments: prior }, prior)
    let next = redo
    if (a.status === '확정') {
      if (a.substituteTeacherId === teacherId) conflicts.push(slot)
      const keep = a.backups.filter((b) => b && b !== teacherId) as string[]
      const fill = [redo.substituteTeacherId, ...redo.backups].filter(
        (x): x is string => !!x && x !== a.substituteTeacherId && !keep.includes(x),
      )
      const backups = [...keep, ...fill].slice(0, 2)
      next = { ...a, backups: [backups[0] ?? null, backups[1] ?? null] }
    } else replaced++
    assignments = assignments.map((x) => (x.slotId === a.slotId ? next : x))
  }
  return { data: { ...d, assignments }, replaced, conflicts }
}

/** 저장된 데이터에서 보강 후보 '제외' 교사가 배정(보강·예비)에 남아 있으면 정리한다 */
export function cleanExcluded(d: AppData): AppData {
  const excluded = new Set(d.teachers.filter((t) => t.poolStatus === '제외').map((t) => t.id))
  const stuck = new Set<string>()
  for (const a of d.assignments) {
    const slot = d.slots.find((s) => s.id === a.slotId)
    if (!slot) continue
    for (const id of [a.status === '확정' ? null : a.substituteTeacherId, ...a.backups])
      if (id && excluded.has(id)) stuck.add(id)
  }
  return [...stuck].reduce((acc, id) => excludeTeacher(acc, id).data, d)
}
