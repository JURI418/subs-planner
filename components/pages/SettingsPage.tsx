'use client'
import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { todayISO, type AppData, type SetData } from '@/lib/types'
import { STORAGE_KEY } from '@/hooks/useAppData'
import { parseBackup } from '@/lib/dataOps'
import { WeightsCard } from '@/components/settings/WeightsCard'
import { SheetCard } from '@/components/settings/SheetCard'
import { daysSinceBackup, downloadBackup } from '@/lib/backup'
import { canOverwrite, chooseBackupFile, forgetBackupFile } from '@/lib/fileBackup'

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
        eyebrow="Settings"
        title="학기·교시·규칙 설정"
        desc="추천 알고리즘의 하드 제약과 점수를 조정합니다."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold">학기 설정</h2>
          <div className="mt-5 flex flex-col gap-4">
            <label className="text-sm font-semibold">
              학기명
              <input
                value={data.settings.semester}
                onChange={(e) =>
                  setData((d) => ({ ...d, settings: { ...d.settings, semester: e.target.value } }))
                }
                className="m3-field mt-2 w-full"
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
                  className="m3-field mt-2 w-full"
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
                  className="m3-field mt-2 w-full"
                />
              </label>
            </div>
            <p className="text-xs text-subtle">
              휴업일은 결강 슬롯 자동 추출에서 제외됩니다. 휴업일은 학사일정 메뉴에서 관리합니다.
            </p>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">추천 규칙</h2>
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
                    className="m3-field w-full"
                  />
                  <span className="text-xs text-subtle">{unit}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 rounded-none bg-iris-soft p-4 text-sm leading-6 text-iris-deep">
            하드 제약: 같은 시간 수업 없음 · 일 최대 수업 미만 · 연속 수업 제한
            <br />
            소프트 우선: 같은 학년 · 당일 부담 · 누적 보강 횟수
          </div>
        </Card>
      </div>
      <WeightsCard data={data} setData={setData} />
      <SheetCard data={data} setData={setData} />
      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">데이터 관리</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (!confirm('모든 데이터를 지우고 처음 상태로 되돌립니다. 되돌릴 수 없습니다. 계속할까요?'))
                return
              localStorage.removeItem(STORAGE_KEY)
              location.reload()
            }}
            className="m3-btn m3-danger"
          >
            모든 데이터 초기화
          </button>
          <button
            onClick={() => {
              downloadBackup(data)
              setData((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: new Date().toISOString() } }))
            }}
            className="m3-btn m3-outlined"
          >
            <Download size={16} strokeWidth={1.5} />
            JSON 백업 내보내기
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="m3-btn m3-outlined"
          >
            <Upload size={16} strokeWidth={1.5} />
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
        <label className="mt-4 flex items-center gap-2 text-[14px]">
          <input
            type="checkbox"
            checked={data.settings.autoBackup !== false}
            onChange={(e) => setData((d) => ({ ...d, settings: { ...d.settings, autoBackup: e.target.checked } }))}
            className="size-4 accent-ink"
          />
          매일 처음 사이트를 열 때 백업 파일을 자동으로 내려받기
          <span className="text-subtle">
            {data.settings.lastAutoBackup ? `(마지막 자동 저장 ${data.settings.lastAutoBackup.replaceAll('-', '.')})` : ''}
          </span>
        </label>
        {data.settings.autoBackup !== false && canOverwrite() && (
          <div className="ml-6 mt-2 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-subtle">저장 방식</span>
            <button
              onClick={async () => {
                try {
                  const name = await chooseBackupFile(data)
                  if (name)
                    setData((d) => ({ ...d, settings: { ...d.settings, backupMode: 'overwrite', backupFileName: name, lastAutoBackup: todayISO(), lastBackupAt: new Date().toISOString() } }))
                } catch {
                  /* 저장 창을 닫음 */
                }
              }}
              className={`m3-btn m3-btn-sm ${data.settings.backupMode !== 'download' && data.settings.backupFileName ? 'm3-filled' : 'm3-outlined'}`}
            >
              {data.settings.backupMode !== 'download' && data.settings.backupFileName
                ? `같은 파일에 덮어쓰기 · ${data.settings.backupFileName} (위치 바꾸기)`
                : '같은 파일에 덮어쓰기 (위치 정하기)'}
            </button>
            <button
              onClick={async () => {
                await forgetBackupFile()
                setData((d) => ({ ...d, settings: { ...d.settings, backupMode: 'download', backupFileName: undefined } }))
              }}
              className={`m3-btn m3-btn-sm ${data.settings.backupMode === 'download' ? 'm3-filled' : 'm3-outlined'}`}
            >
              매일 새 파일로 받기
            </button>
          </div>
        )}
        {(() => {
          const days = daysSinceBackup(data)
          return (
            <p className={`mt-3 text-sm ${days === null || days >= 7 ? 'font-bold text-warn' : 'text-subtle'}`}>
              {days === null
                ? '아직 백업 파일을 받은 적이 없습니다. 데이터는 이 브라우저에만 저장되니 꼭 받아 두세요.'
                : `마지막 백업: ${data.settings.lastBackupAt!.slice(0, 10).replaceAll('-', '.')} (${days === 0 ? '오늘' : `${days}일 전`})`}
            </p>
          )
        })()}
        {importMsg && (
          <p className={`mt-3 text-sm ${importMsg.ok ? 'text-ok' : 'text-bad'}`}>
            {importMsg.text}
          </p>
        )}
      </Card>
    </>
  )
}
