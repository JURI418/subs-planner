'use client'
import { useState } from 'react'
import { Card } from '@/components/common/Card'
import { defaultSettings, type AppData, type SetData, type Settings } from '@/lib/types'
import { recomputeProposals } from '@/lib/dataOps'

type WeightKey = keyof Settings['weights']

const ITEMS: { key: WeightKey; label: string; help: (v: number) => string }[] = [
  {
    key: 'grade',
    label: '같은 학년 담당',
    help: (v) => `결강 수업과 같은 학년을 가르치는 교사에게 +${v}점`,
  },
  {
    key: 'daily',
    label: '당일 여유',
    help: (v) => `그날 수업이 1개 이하인 교사에게 +${v}점 (2개면 +5점)`,
  },
  {
    key: 'fairness',
    label: '보강 공평성',
    help: (v) => `누적 보강 0회면 +${v}점, 횟수가 늘수록 줄어 10회 이상이면 0점`,
  },
]

export function WeightsCard({ data, setData }: { data: AppData; setData: SetData }) {
  const [msg, setMsg] = useState<string | null>(null)
  const w = data.settings.weights
  const setWeight = (key: WeightKey, value: number) => {
    setMsg(null)
    setData((d) => ({ ...d, settings: { ...d.settings, weights: { ...d.settings.weights, [key]: value } } }))
  }
  const isDefault = ITEMS.every(({ key }) => w[key] === defaultSettings.weights[key])
  const pending = data.assignments.filter((a) => a.status !== '확정' && !a.isManual).length

  const recompute = () => {
    const { data: next, total, changed } = recomputeProposals(data)
    setData(next)
    setMsg(
      total
        ? `미확정 배정 ${total}건을 다시 추천했습니다. 보강 교사가 바뀐 건: ${changed}건`
        : '다시 추천할 미확정 배정이 없습니다.',
    )
  }

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">추천 가중치</h2>
          <p className="mt-1 text-xs text-subtle">
            점수가 높은 교사부터 보강 후보로 추천됩니다. 중요하게 여기는 항목의 점수를 높이세요.
          </p>
        </div>
        <button
          onClick={() => {
            setMsg(null)
            setData((d) => ({ ...d, settings: { ...d.settings, weights: { ...defaultSettings.weights } } }))
          }}
          disabled={isDefault}
          className="m3-btn m3-btn-sm m3-text"
        >
          기본값으로
        </button>
      </div>
      <div className="mt-5 grid gap-6 md:grid-cols-3">
        {ITEMS.map(({ key, label, help }) => (
          <label key={key} htmlFor={`weight-${key}`} className="flex flex-col gap-2 text-sm font-semibold">
            <span className="flex items-baseline justify-between">
              {label}
              <span className="text-lg font-bold tabular-nums text-iris-deep">{w[key]}점</span>
            </span>
            <input
              id={`weight-${key}`}
              type="range"
              min={0}
              max={50}
              step={5}
              value={w[key]}
              onChange={(e) => setWeight(key, Number(e.target.value))}
              className="w-full accent-iris"
            />
            <span className="text-xs font-normal leading-5 text-subtle">{help(w[key])}</span>
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-none bg-wash p-4">
        <p className="min-w-0 flex-1 text-xs leading-5 text-ink-2">
          바꾼 가중치는 앞으로 등록하는 결강부터 적용됩니다. 이미 만들어진 미확정 배정({pending}건)에도
          적용하려면 다시 추천하세요. 확정된 배정과 직접 고른 수동 배정은 바뀌지 않습니다.
        </p>
        <button
          onClick={recompute}
          disabled={pending === 0}
          className="m3-btn m3-filled"
        >
          미확정 배정 다시 추천
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-ok">{msg}</p>}
    </Card>
  )
}
