'use client'
import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import type { AppData, SetData } from '@/lib/types'
import { STORAGE_KEY } from '@/hooks/useAppData'
import { parseBackup } from '@/lib/dataOps'
import { WeightsCard } from '@/components/settings/WeightsCard'

export function SettingsPage({ data, setData }: { data: AppData; setData: SetData }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const importBackup = async (file: File) => {
    const result = parseBackup(await file.text())
    if (!result.data) {
      setImportMsg({ ok: false, text: result.error! })
      return
    }
    const b = result.data
    const summary = `교사 ${b.teachers.length}명 · 시간표 ${b.timetable.length}건 · 결강 ${b.absences.length}건 · 배정 ${b.assignments.length}건`
    if (
      !confirm(
        `현재 데이터를 백업 파일 내용으로 바꿉니다.\n${summary}\n현재 데이터는 사라집니다. 계속할까요?`,
      )
    )
      return
    setData(b)
    setImportMsg({ ok: true, text: `불러오기 완료: ${summary}` })
  }
  return (
    <>
      <PageHeader
        eyebrow="환경 설정"
        title="학기·교시·규칙 설정"
        desc="추천 알고리즘의 하드 제약과 점수를 조정합니다."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">학기 설정</h2>
          <div className="mt-5 flex flex-col gap-4">
            <label className="text-sm font-semibold">
              학기명
              <input
                value={data.settings.semester}
                onChange={(e) =>
                  setData((d) => ({ ...d, settings: { ...d.settings, semester: e.target.value } }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">
                시작일
                <input
                  type="date"
                  value={data.settings.startDate}
                  onChange={(e) =>
                    setData((d) => ({ ...d, settings: { ...d.settings, startDate: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>
              <label className="text-sm font-semibold">
                종료일
                <input
                  type="date"
                  value={data.settings.endDate}
                  onChange={(e) =>
                    setData((d) => ({ ...d, settings: { ...d.settings, endDate: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">
              휴업일은 결강 슬롯 자동 추출에서 제외됩니다. (다음 업데이트에서 관리 UI 제공)
            </p>
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">추천 규칙</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ['maxDaily', '일 최대 수업', '개'],
              ['maxConsecutive', '최대 연속 수업', '교시'],
              ['recentDays', '최근 보강 기간', '일'],
            ].map(([key, label, unit]) => (
              <label key={key} className="text-sm font-semibold">
                {label}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={(data.settings as any)[key]}
                    onChange={(e) =>
                      setData((d) => ({ ...d, settings: { ...d.settings, [key]: Number(e.target.value) } }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                  />
                  <span className="text-xs text-slate-400">{unit}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            하드 제약: 같은 시간 수업 없음 · 일 최대 수업 미만 · 연속 수업 제한
            <br />
            소프트 우선: 같은 학년 · 당일 부담 · 누적 보강 횟수
          </div>
        </Card>
      </div>
      <WeightsCard data={data} setData={setData} />
      <Card className="mt-6">
        <h2 className="font-bold">데이터 관리</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (!confirm('모든 데이터를 지우고 처음 상태로 되돌립니다. 되돌릴 수 없습니다. 계속할까요?'))
                return
              localStorage.removeItem(STORAGE_KEY)
              location.reload()
            }}
            className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600"
          >
            모든 데이터 초기화
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = '결보강-백업.json'
              a.click()
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
          >
            <Download />
            JSON 백업 내보내기
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
          >
            <Upload />
            JSON 백업 불러오기
          </button>
          <input
            id="backup-file"
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) importBackup(f)
            }}
          />
        </div>
        {importMsg && (
          <p className={`mt-3 text-sm ${importMsg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
            {importMsg.text}
          </p>
        )}
      </Card>
    </>
  )
}
