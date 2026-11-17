'use client'
import { useMemo, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Card } from '@/components/common/Card'
import type { AppData, SetData } from '@/lib/types'
import { applyCoverRows, parseCoverText } from '@/lib/importCovers'

/** 통계 > 지난 보강 기록 가져오기: 구글 시트 ‘보강’ 탭을 붙여넣거나 CSV로 올려 통계에 반영 */
export function ImportCard({ data, setData }: { data: AppData; setData: SetData }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [year, setYear] = useState(Number(data.settings.startDate.slice(0, 4)) || new Date().getFullYear())
  const [done, setDone] = useState<string | null>(null)
  const parsed = useMemo(() => parseCoverText(text, year), [text, year])
  const plan = useMemo(() => (parsed.rows.length ? applyCoverRows(data, parsed.rows) : null), [parsed, data])

  const run = () => {
    if (!plan) return
    setData(plan.data)
    setDone(`${plan.added}건을 가져왔어요.${plan.skipped ? ` 이미 있던 ${plan.skipped}건은 건너뛰었어요.` : ''}`)
    setText('')
  }

  return (
    <Card className="mt-6">
      <h2 className="font-display text-lg font-semibold">지난 보강 기록 가져오기</h2>
      <p className="mt-2 text-[0.8235rem] leading-6 text-ink-2">
        구글 시트 ‘보강’ 탭의 표(순번, 결강 교사, 보강 날짜, 보강 교시, 보강 교사, 대상 학급, 과목)를 복사해 붙여넣거나 CSV 파일로 올리면, 지난 확정 보강으로 추가돼 위 통계에 반영돼요.
        같은 결강 교사, 날짜, 교시는 다시 넣어도 중복되지 않아요.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">
          3월이 속한 해
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="m3-field m3-field-sm mt-2 block w-28" />
        </label>
        <button onClick={() => fileRef.current?.click()} className="m3-btn m3-btn-sm m3-outlined">
          <Upload size={15} strokeWidth={1.5} /> CSV 파일 올리기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) setText(await f.text())
          }}
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setDone(null)
        }}
        rows={5}
        placeholder="여기에 시트의 ‘보강’ 탭 표를 붙여넣으세요 (머리글 줄은 있어도 돼요)"
        className="m3-field mt-3 w-full font-mono text-[0.75rem]"
      />
      {parsed.rows.length > 0 && plan && (
        <div className="mt-3 bg-wash p-4 text-[0.8235rem] leading-6 text-ink-2">
          <p>
            읽은 보강 <b className="text-ink">{parsed.rows.length}건</b> 중 <b className="text-ink">{plan.added}건</b>을 새로 추가해요.
            {plan.skipped > 0 && ` 이미 있는 ${plan.skipped}건은 건너뛰어요.`}
          </p>
          {(parsed.noSub > 0 || parsed.changed > 0) && (
            <p>
              보강 교사가 비어 있는 {parsed.noSub}줄과 ‘수업 변경’ {parsed.changed}줄은 보강이 아니라서 빼요.
            </p>
          )}
          {plan.created.length > 0 && (
            <p>
              시간표에 없는 선생님 <b className="text-ink">{plan.created.length}명</b>은 통계용으로만 추가돼요(보강 후보에서는 제외): {plan.created.join(', ')}
            </p>
          )}
          {parsed.bad.length > 0 && <p className="text-bad">읽지 못한 줄 {parsed.bad.length}개: {parsed.bad.slice(0, 3).join(' / ')}{parsed.bad.length > 3 ? ' …' : ''}</p>}
          <button onClick={run} disabled={plan.added === 0} className="m3-btn m3-filled mt-3">
            {plan.added}건 가져오기
          </button>
        </div>
      )}
      {done && <p className="mt-3 text-sm text-ok">{done}</p>}
    </Card>
  )
}
