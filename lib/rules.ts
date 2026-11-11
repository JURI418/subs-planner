import type { Slot, Teacher } from './types'

/** 보강 추천 조건 (켜진 것만, 순서대로 점수가 매겨짐) */
export type RuleKey = 'homeroom' | 'grade' | 'subject' | 'fairness' | 'daily' | 'run' | 'homeroomLast' | 'age'
export type PresetKey = 'homeroom' | 'fair' | 'subject' | 'free'
/** 연령순 방향: young = 나이 적은 교사 우선, old = 나이 많은 교사 우선 */
export type AgeDir = 'young' | 'old'
export type RuleSettings = { preset: PresetKey | 'custom'; order: RuleKey[]; on: RuleKey[]; ageDir?: AgeDir }
export const AGE_DIR_LABEL: Record<AgeDir, string> = { young: '나이 적은 교사 우선', old: '나이 많은 교사 우선' }

export const RULES: Record<RuleKey, { label: string; desc: string }> = {
  homeroom: { label: '해당 학급 담임', desc: '결강 수업 학급의 담임 교사' },
  grade: { label: '동일 학년 담당', desc: '결강 수업과 같은 학년을 가르치는 교사 (‘추가포함’ 교사 포함)' },
  subject: { label: '동일 교과', desc: '결강 수업과 같은 교과를 가르치는 교사' },
  fairness: { label: '누적 보강 적음', desc: '지금까지 맡은 보강이 적은 교사 우선 (0회 만점, 10회 이상 0점)' },
  daily: { label: '당일 수업 여유', desc: '보강을 포함한 당일 수업이 2시간 이하 (3시간이면 4분의 1 반영)' },
  run: { label: '연속 수업 부담 적음', desc: '보강을 포함한 연속 수업이 2교시 이하' },
  homeroomLast: { label: '담임 교사 후순위', desc: '담임 교사는 가급적 나중에 배정 (해당 학급 담임 제외)' },
  age: { label: '연령순', desc: '교사 관리의 출생 연도 기준 (입력하지 않은 교사는 중간으로 계산)' },
}
export const ALL_RULES = Object.keys(RULES) as RuleKey[]

export const PRESETS: Record<PresetKey, { label: string; desc: string; on: RuleKey[] }> = {
  homeroom: { label: '담임·학년 우선', desc: '해당 학급 담임과 동일 학년 교사 우선', on: ['homeroom', 'grade', 'daily', 'fairness', 'run'] },
  fair: { label: '균등 배정 우선', desc: '누적 보강이 적은 교사 우선', on: ['fairness', 'daily', 'grade', 'run'] },
  subject: { label: '동일 교과 우선', desc: '같은 교과 교사가 수업 진행 (자습 대신)', on: ['subject', 'grade', 'fairness', 'daily', 'run'] },
  free: { label: '당일 여유 우선', desc: '당일 수업이 적은 교사 우선 (시험 기간 등)', on: ['daily', 'run', 'fairness', 'grade'] },
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
  return { preset, order, on, ageDir: r.ageDir === 'old' ? 'old' : 'young' }
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
  ctx: {
    t: Teacher
    slot: Slot
    absentSubject?: string
    dayCount: number
    maxRun: number
    /** 출생 연도를 넣은 교사들의 가장 이른·늦은 해 */
    years?: [number, number]
    ageDir?: AgeDir
  },
): { ratio: number; reason?: string } {
  const { t, slot } = ctx
  const cls = slotClass(slot)
  switch (key) {
    case 'homeroom':
      return t.homeroom && cls && t.homeroom === cls ? { ratio: 1, reason: `${classLabel(cls)} 담임` } : { ratio: 0 }
    case 'grade':
      if (t.grades.includes(slot.grade)) return { ratio: 1, reason: '동일 학년 담당' }
      return t.poolStatus === '추가포함' ? { ratio: 1, reason: '추가 포함 후보' } : { ratio: 0 }
    case 'subject': {
      const subj = [slot.subject, ctx.absentSubject].filter(Boolean)
      return subj.includes(t.subject) ? { ratio: 1, reason: '동일 교과' } : { ratio: 0 }
    }
    case 'fairness':
      return { ratio: Math.max(0, 10 - t.totalAssignments) / 10 }
    case 'daily':
      return { ratio: ctx.dayCount <= 2 ? 1 : ctx.dayCount === 3 ? 0.25 : 0 }
    case 'run':
      return { ratio: ctx.maxRun <= 2 ? 1 : 0 }
    case 'homeroomLast':
      return !t.homeroom || t.homeroom === cls ? { ratio: 1 } : { ratio: 0, reason: '담임 교사 후순위' }
    case 'age': {
      // 나이는 근거 문구에 드러내지 않는다 (개인정보)
      const [lo, hi] = ctx.years ?? [0, 0]
      if (!t.birthYear || hi <= lo) return { ratio: t.birthYear || hi > lo ? 0.5 : 0 }
      const young = (t.birthYear - lo) / (hi - lo) // 늦게 태어날수록 1
      return { ratio: ctx.ageDir === 'old' ? 1 - young : young }
    }
  }
}

/**
 * 담임 명단 붙여넣기 읽기: 한 줄에서 반(1-1, 1학년 1반, 엑셀의 '1 [탭] 1')과 교사 이름을 찾는다.
 * 이름은 등록된 교사 이름과 그대로 맞는 것만 (긴 이름부터 찾아 '교사1'과 '교사13' 같은 혼동을 막음)
 */
export function parseHomerooms(text: string, teachers: Pick<Teacher, 'id' | 'name'>[]) {
  const names = [...teachers].filter((t) => !t.name.startsWith('가상')).sort((a, b) => b.name.length - a.name.length)
  const found: { teacherId: string; cls: string }[] = []
  const missed: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m =
      line.match(/([1-3])\s*학년\s*(\d{1,2})\s*반/) ??
      line.match(/(?<!\d)([1-3])\s*-\s*(\d{1,2})(?!\d)/) ??
      line.match(/^\s*([1-3])\s*[\t,]\s*(\d{1,2})(?!\d)/)
    const n = m ? Number(m[2]) : 0
    const t = names.find((x) => line.includes(x.name))
    if (!m || n < 1 || n > 12 || !t) {
      // 머리글 줄(학년, 반, 담임 ...)은 조용히 건너뜀
      if (!/학년|반|담임|성명|이름/.test(line) || m || t) missed.push(line)
      continue
    }
    const cls = `${m[1]}-${n}`
    const prev = found.findIndex((f) => f.teacherId === t.id)
    if (prev >= 0) found.splice(prev, 1)
    found.push({ teacherId: t.id, cls })
  }
  return { found, missed }
}

/**
 * 출생 연도 붙여넣기 읽기: 한 줄에서 교사 이름과 출생 연도(1985, 1985.03.02, 850302)를 찾는다.
 * 연도만 저장한다 (생일 날짜는 버림)
 */
export function parseBirthYears(text: string, teachers: Pick<Teacher, 'id' | 'name'>[]) {
  const names = [...teachers].filter((t) => !t.name.startsWith('가상')).sort((a, b) => b.name.length - a.name.length)
  const found: { teacherId: string; year: number }[] = []
  const missed: string[] = []
  const now = new Date().getFullYear()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const t = names.find((x) => line.includes(x.name))
    const rest = t ? line.replace(t.name, ' ') : line
    let year = 0
    const y4 = rest.match(/(?<!\d)(19[4-9]\d|20[0-1]\d)(?!\d)/) ?? rest.match(/(?<!\d)(19[4-9]\d|20[0-1]\d)[.\-/년]/)
    if (y4) year = Number(y4[1])
    else {
      const y6 = rest.match(/(?<!\d)(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/)
      if (y6) year = 1900 + Number(y6[1]) < now - 80 ? 2000 + Number(y6[1]) : 1900 + Number(y6[1])
    }
    if (!t || !year || year > now - 18) {
      if (!/성명|이름|생년|출생|연도/.test(line) || t || year) missed.push(line)
      continue
    }
    const prev = found.findIndex((f) => f.teacherId === t.id)
    if (prev >= 0) found.splice(prev, 1)
    found.push({ teacherId: t.id, year })
  }
  return { found, missed }
}
