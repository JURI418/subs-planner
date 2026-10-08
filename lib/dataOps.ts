import { normalizeData, type AppData } from './types'
import { runScheduling } from './scheduling'

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
