'use client'
import { useState } from 'react'
import { ArrowRight, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDate, type AppData, type SetData } from '@/lib/types'
import { recomputeProposals } from '@/lib/dataOps'
import { PRESETS, PRESET_KEYS, presetRule, ruleLabel, slotClass, type PresetKey } from '@/lib/rules'

/** 배정 확인 위: 추천 방식을 바로 바꾸고, 바뀌는 배정을 먼저 보여 준 뒤 적용 */
export function RuleSwitch({ data, setData }: { data: AppData; setData: SetData }) {
  const router = useRouter()
  const rule = data.settings.rule
  const [ask, setAsk] = useState<PresetKey | null>(null)
  const pending = data.assignments.filter((a) => a.status !== '확정' && !a.isManual).length
  const name = (id: string | null) => data.teachers.find((t) => t.id === id)?.name ?? '없음'

  const preview = ask ? recomputeProposals(data, { ...presetRule(ask), ageDir: rule.ageDir }) : null
  const choose = (k: string) => {
    if (k === rule.preset) return
    if (k === 'custom') return router.push('/settings')
    const key = k as PresetKey
    // 다시 추천할 배정이 없으면 바로 바꾼다
    if (pending === 0) {
      setData((d) => ({ ...d, settings: { ...d.settings, rule: { ...presetRule(key), ageDir: d.settings.rule.ageDir } } }))
      return
    }
    setAsk(key)
  }
  const apply = () => {
    if (!preview) return
    setData(preview.data)
    setAsk(null)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 border border-line bg-surface px-4 py-2.5">
        <label htmlFor="rule-switch" className="text-[12px] font-bold text-subtle">
          추천 방식
        </label>
        <select
          id="rule-switch"
          value={rule.preset}
          onChange={(e) => choose(e.target.value)}
          className="m3-field m3-field-sm min-w-44 font-bold"
        >
          {PRESET_KEYS.map((k) => (
            <option key={k} value={k}>
              {PRESETS[k].label}
            </option>
          ))}
          <option value="custom">{rule.preset === 'custom' ? '직접 설정' : '직접 설정… (설정으로 이동)'}</option>
        </select>
        <span className="hidden text-[12px] text-subtle sm:inline">
          {rule.preset === 'custom' ? '설정에서 조건과 순서를 직접 정한 방식' : PRESETS[rule.preset].desc}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="border border-line bg-wash px-2 py-0.5 text-[11.5px] font-bold text-ink-2">확정 전 {pending}건</span>
          <button onClick={() => router.push('/settings')} className="m3-btn m3-btn-sm m3-text" aria-label="추천 조건 자세히 설정">
            <Settings2 size={15} /> 조건 설정
          </button>
        </span>
      </div>

      {ask && preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rule-dlg-title"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setAsk(null)}
        >
          <div className="w-full max-w-lg bg-surface p-5 shadow-[0_16px_40px_rgb(0_0_0/.25)]">
            <h3 id="rule-dlg-title" className="text-[17px] font-bold">
              ‘{PRESETS[ask].label}’으로 바꿀까요?
            </h3>
            <p className="mt-1.5 text-[13px] leading-5 text-ink-2">
              확정 전 배정 {preview.total}건을 새 방식으로 다시 추천해요. 보강 교사가 바뀌는 건{' '}
              <b className="text-ink">{preview.changed}건</b>이에요. 확정된 배정과 직접 고른 배정은 그대로예요.
            </p>
            <ul className="mt-3 max-h-72 overflow-y-auto border-t border-line text-[13px]">
              {preview.diffs.map(({ slot, from, to }) => (
                <li key={slot.id} className="flex items-center justify-between gap-3 border-b border-line py-2">
                  <span className="text-ink-2">
                    {formatDate(slot.date)} {slot.dayOfWeek} {slot.period}교시 · {slotClass(slot) || slot.room}
                  </span>
                  {from === to ? (
                    <span className="text-subtle">{name(to)} 그대로</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="text-subtle">{name(from)}</span>
                      <ArrowRight size={13} className="text-subtle" />
                      <b>{name(to)}</b>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-subtle">지금 방식: {ruleLabel(rule)}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAsk(null)} className="m3-btn m3-outlined">
                취소
              </button>
              <button onClick={apply} className="m3-btn bg-point font-bold text-on-point hover:brightness-95">
                바꾸기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
