'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/common/Card'
import type { AppData, SetData } from '@/lib/types'
import { recomputeProposals } from '@/lib/dataOps'
import {
  PRESETS,
  PRESET_KEYS,
  RULES,
  presetRule,
  rulePoints,
  samePreset,
  type PresetKey,
  type RuleKey,
  type RuleSettings,
} from '@/lib/rules'

/** 설정 > 보강 추천 방식: 방식 고르기 + 조건 켜고 끄기·순서 바꾸기 */
export function RuleCard({ data, setData }: { data: AppData; setData: SetData }) {
  const [msg, setMsg] = useState<string | null>(null)
  const rule = data.settings.rule
  const points = rulePoints(rule)
  const pending = data.assignments.filter((a) => a.status !== '확정' && !a.isManual).length
  const homerooms = data.teachers.filter((t) => t.homeroom).length

  const save = (next: RuleSettings) => {
    setMsg(null)
    // 직접 바꾼 결과가 어떤 방식과 똑같으면 그 방식으로 표시
    const match = PRESET_KEYS.find((k) => samePreset(next, k))
    setData((d) => ({ ...d, settings: { ...d.settings, rule: { ...next, preset: match ?? 'custom' } } }))
  }
  const pick = (k: PresetKey) => save(presetRule(k))
  const toggle = (k: RuleKey) => {
    const on = rule.on.includes(k) ? rule.on.filter((x) => x !== k) : [...rule.on, k]
    // 새로 켠 조건은 켜진 것들 맨 뒤로
    const order = rule.on.includes(k)
      ? [...rule.order.filter((x) => x !== k && on.includes(x)), k, ...rule.order.filter((x) => x !== k && !on.includes(x))]
      : [...rule.order.filter((x) => on.includes(x) && x !== k), k, ...rule.order.filter((x) => !on.includes(x))]
    save({ ...rule, on, order })
  }
  const move = (k: RuleKey, dir: -1 | 1) => {
    const order = [...rule.order]
    const i = order.indexOf(k)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    // 켜진 조건이 항상 위에 오도록 정리
    save({ ...rule, order: [...order.filter((x) => rule.on.includes(x)), ...order.filter((x) => !rule.on.includes(x))] })
  }
  const recompute = () => {
    const { data: next, total, changed } = recomputeProposals(data)
    setData(next)
    setMsg(total ? `확정 전 배정 ${total}건을 다시 추천했어요. 보강 교사가 바뀐 건: ${changed}건` : '다시 추천할 확정 전 배정이 없어요.')
  }
  const onCount = rule.on.length

  return (
    <Card className="mt-6">
      <h2 className="font-display text-lg font-semibold">보강 추천 방식</h2>
      <p className="mt-1 text-xs text-subtle">
        방식을 고르면 아래 조건이 그 방식대로 바뀌어요. 조건을 직접 켜고 끄거나 순서를 바꾸면 ‘직접 설정’이 돼요.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {PRESET_KEYS.map((k) => {
          const on = rule.preset === k
          return (
            <button
              key={k}
              onClick={() => pick(k)}
              aria-pressed={on}
              className={`border p-3 text-left transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/50'}`}
            >
              <span className="flex items-center gap-1.5 text-[14px] font-bold">
                {on && <span className="size-2 rounded-full bg-point" aria-hidden />}
                {PRESETS[k].label}
              </span>
              <span className={`mt-1 block text-[11.5px] leading-4 ${on ? 'text-paper/70' : 'text-subtle'}`}>{PRESETS[k].desc}</span>
            </button>
          )
        })}
        <div
          className={`border border-dashed p-3 ${rule.preset === 'custom' ? 'border-ink bg-ink text-paper' : 'border-line text-subtle'}`}
        >
          <span className="flex items-center gap-1.5 text-[14px] font-bold">
            {rule.preset === 'custom' && <span className="size-2 rounded-full bg-point" aria-hidden />}
            직접 설정
          </span>
          <span className={`mt-1 block text-[11.5px] leading-4 ${rule.preset === 'custom' ? 'text-paper/70' : ''}`}>
            아래에서 조건을 바꾸면 자동으로 선택돼요
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-wash text-left text-[11px] font-bold text-subtle">
              <th className="w-14 px-3 py-2">순서</th>
              <th className="w-16 px-2 py-2">사용</th>
              <th className="px-2 py-2">조건</th>
              <th className="w-20 px-2 py-2 text-right">점수</th>
              <th className="w-24 px-3 py-2 text-right">순서 바꾸기</th>
            </tr>
          </thead>
          <tbody>
            {rule.order.map((k, i) => {
              const on = rule.on.includes(k)
              const rank = on ? i + 1 : null
              return (
                <tr key={k} className={`border-t border-line ${on ? 'bg-surface' : 'bg-wash/50 text-faint'}`}>
                  <td className="px-3 py-2.5">
                    <span
                      className={`grid size-6 place-items-center rounded-full text-[12px] font-bold ${on ? 'bg-point text-on-point' : 'bg-wash text-faint'}`}
                    >
                      {rank ?? '–'}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      role="switch"
                      aria-checked={on}
                      aria-label={`${RULES[k].label} ${on ? '끄기' : '켜기'}`}
                      onClick={() => toggle(k)}
                      className={`relative h-[22px] w-10 rounded-full transition-colors ${on ? 'bg-ink' : 'bg-line'}`}
                    >
                      <span
                        className={`absolute top-[3px] size-4 rounded-full transition-all ${on ? 'right-[3px] bg-point' : 'left-[3px] bg-white'}`}
                      />
                    </button>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className={`block text-[14px] font-bold ${on ? 'text-ink' : ''}`}>{RULES[k].label}</span>
                    <span className="block text-[12px] text-subtle">{RULES[k].desc}</span>
                    {on && (k === 'homeroom' || k === 'homeroomLast') && homerooms === 0 && (
                      <span className="mt-0.5 block text-[12px] font-bold text-warn">
                        교사 관리에서 담임 반을 넣어야 적용돼요
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {on ? (
                      <span className="text-[15px] font-bold tabular-nums text-ink">+{points[k]}</span>
                    ) : (
                      <span className="text-[12px]">사용 안 함</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex justify-end gap-1">
                      <button
                        onClick={() => move(k, -1)}
                        disabled={!on || i === 0}
                        aria-label={`${RULES[k].label} 위로`}
                        className="grid size-7 place-items-center rounded-full border border-line text-ink-2 hover:border-ink disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => move(k, 1)}
                        disabled={!on || i === onCount - 1}
                        aria-label={`${RULES[k].label} 아래로`}
                        className="grid size-7 place-items-center rounded-full border border-line text-ink-2 hover:border-ink disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-subtle">
        켜진 조건에 순서대로 점수가 매겨져요 (1번이 가장 높고 10점씩 줄어듦). 같은 날 이미 맡은 보강이 있으면 1건마다 −5점.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 bg-wash p-4">
        <p className="min-w-0 flex-1 text-xs leading-5 text-ink-2">
          바꾼 방식은 앞으로 등록하는 결강부터 적용돼요. 이미 만들어진 확정 전 배정({pending}건)에도 적용하려면 다시
          추천하세요. 확정된 배정과 직접 고른 배정은 바뀌지 않아요.
        </p>
        <button onClick={recompute} disabled={pending === 0} className="m3-btn m3-filled">
          확정 전 배정 다시 추천
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-ok">{msg}</p>}
    </Card>
  )
}
