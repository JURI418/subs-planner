import type { Slot, Teacher } from './types'

/** 보강 추천 조건 (켜진 것만, 순서대로 점수가 매겨짐) */
export type RuleKey = 'homeroom' | 'grade' | 'subject' | 'fairness' | 'daily' | 'run' | 'homeroomLast'
export type PresetKey = 'homeroom' | 'fair' | 'subject' | 'free'
export type RuleSettings = { preset: PresetKey | 'custom'; order: RuleKey[]; on: RuleKey[] }

export const RULES: Record<RuleKey, { label: string; desc: string }> = {
  homeroom: { label: '그 반 담임', desc: '결강 수업 반의 담임 선생님' },
  grade: { label: '같은 학년', desc: '결강 수업과 같은 학년을 가르치는 선생님 (‘추가포함’ 교사도 포함)' },
  subject: { label: '같은 교과', desc: '결강 수업과 같은 과목 선생님' },
  fairness: { label: '보강 적게 한 사람', desc: '누적 보강이 적을수록 (0회면 만점, 10회 이상이면 0점)' },
  daily: { label: '그날 여유', desc: '보강을 넣어도 그날 수업이 2개 이하 (3개면 4분의 1)' },
  run: { label: '연속 부담 적음', desc: '보강을 넣어도 연속 수업이 2교시 이하' },
  homeroomLast: { label: '담임은 뒤로', desc: '담임 선생님은 되도록 나중에 (그 반 담임은 예외)' },
}
export const ALL_RULES = Object.keys(RULES) as RuleKey[]

export const PRESETS: Record<PresetKey, { label: string; desc: string; on: RuleKey[] }> = {
  homeroom: { label: '담임·학년 우선', desc: '그 반 담임, 같은 학년 선생님 먼저', on: ['homeroom', 'grade', 'daily', 'fairness', 'run'] },
  fair: { label: '공평 우선', desc: '보강을 적게 한 선생님 먼저', on: ['fairness', 'daily', 'grade', 'run'] },
  subject: { label: '같은 교과 우선', desc: '같은 과목 선생님 먼저 (자습 대신 수업 진행)', on: ['subject', 'grade', 'fairness', 'daily', 'run'] },
  free: { label: '여유 우선', desc: '그날 수업이 적은 선생님 먼저 (시험 기간 등)', on: ['daily', 'run', 'fairness', 'grade'] },
}
export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[]

/** 방식을 고르면: 켜진 조건이 앞에 그 순서대로, 나머지는 뒤에 꺼진 채로 */
export function presetRule(key: PresetKey): RuleSettings {
  const on = PRESETS[key].on
  return { preset: key, on: [...on], order: [...on, ...ALL_RULES.filter((r) => !on.includes(r))] }
}
export const defaultRule = presetRule('homeroom')

/** 저장된 값이 깨졌거나 예전 버전이면 기본값으로 */
export function normalizeRule(raw: unknown): RuleSettings {
  const r = raw as Partial<RuleSettings> | undefined
  if (!r || !Array.isArray(r.order) || !Array.isArray(r.on)) return presetRule('homeroom')
  const order = [...r.order.filter((k) => ALL_RULES.includes(k)), ...ALL_RULES.filter((k) => !r.order!.includes(k))]
  const on = r.on.filter((k) => ALL_RULES.includes(k))
  const preset = r.preset && (r.preset === 'custom' || PRESET_KEYS.includes(r.preset)) ? r.preset : 'custom'
  return { preset, order, on }
}

/** 켜진 조건의 점수: 1번이 가장 높고 10점씩 줄어듦 (4개면 40·30·20·10) */
export function rulePoints(rule: RuleSettings): Partial<Record<RuleKey, number>> {
  const active = rule.order.filter((k) => rule.on.includes(k))
  return Object.fromEntries(active.map((k, i) => [k, (active.length - i) * 10]))
}

/** 지금 방식 이름: 고른 방식이 있으면 그 이름, 아니면 '직접 설정' */
export function ruleLabel(rule: RuleSettings) {
  return rule.preset === 'custom' ? '직접 설정' : PRESETS[rule.preset].label
}

/** 고른 방식과 순서·켜짐이 같은지 */
export function samePreset(rule: RuleSettings, key: PresetKey) {
  const p = presetRule(key)
  const active = (r: RuleSettings) => r.order.filter((k) => r.on.includes(k)).join(',')
  return active(p) === active(rule)
}

/** 교실 번호(106, 210 ...)에서 학급 '1-6', '2-10' */
export function slotClass(s: Pick<Slot, 'room'>) {
  const m = s.room.match(/^([1-3])(\d{2})/)
  const n = m ? Number(m[2]) : 0
  return m && n >= 1 && n <= 15 ? `${m[1]}-${n}` : ''
}

/** 담임 반 선택 목록: 1-1 ~ 3-12 */
export const CLASS_OPTIONS = [1, 2, 3].flatMap((g) => Array.from({ length: 12 }, (_, i) => `${g}-${i + 1}`))
export const classLabel = (c: string) => {
  const [g, n] = c.split('-')
  return `${g}학년 ${n}반`
}

/** 조건별로 얼마나 해당하는지 (0~1)와 근거 문구 */
export function ruleMatch(
  key: RuleKey,
  ctx: { t: Teacher; slot: Slot; absentSubject?: string; dayCount: number; maxRun: number },
): { ratio: number; reason?: string } {
  const { t, slot } = ctx
  const cls = slotClass(slot)
  switch (key) {
    case 'homeroom':
      return t.homeroom && cls && t.homeroom === cls ? { ratio: 1, reason: `${classLabel(cls)} 담임` } : { ratio: 0 }
    case 'grade':
      if (t.grades.includes(slot.grade)) return { ratio: 1, reason: '같은 학년 담당' }
      return t.poolStatus === '추가포함' ? { ratio: 1, reason: '추가 포함 후보' } : { ratio: 0 }
    case 'subject': {
      const subj = [slot.subject, ctx.absentSubject].filter(Boolean)
      return subj.includes(t.subject) ? { ratio: 1, reason: '같은 교과' } : { ratio: 0 }
    }
    case 'fairness':
      return { ratio: Math.max(0, 10 - t.totalAssignments) / 10 }
    case 'daily':
      return { ratio: ctx.dayCount <= 2 ? 1 : ctx.dayCount === 3 ? 0.25 : 0 }
    case 'run':
      return { ratio: ctx.maxRun <= 2 ? 1 : 0 }
    case 'homeroomLast':
      return !t.homeroom || t.homeroom === cls ? { ratio: 1 } : { ratio: 0, reason: '담임이라 뒤로' }
  }
}
