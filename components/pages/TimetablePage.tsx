'use client'
import { useState } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { days, parseTimetable, samplePaste, type AppData, type SetData } from '@/lib/types'

type Preview = ReturnType<typeof parseTimetable>

export function TimetablePage({ data, setData }: { data: AppData; setData: SetData }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selected, setSelected] = useState(data.teachers[0]?.id || '')
  const selectedEntries = data.timetable.filter((e) => e.teacherId === selected)
  const periods = Array.from({ length: data.settings.periodCount }, (_, i) => i + 1)

  const register = () => {
    if (!preview) return
    const ids = [...new Set(preview.entries.map((e) => e.teacherId))]
    // 이미 시간표가 있는 교사는 확인 후 기존 시간표를 새 시간표로 교체
    const replaced = ids
      .map((id) => ({
        name: [...data.teachers, ...preview.newTeachers].find((t) => t.id === id)?.name,
        count: data.timetable.filter((e) => e.teacherId === id).length,
      }))
      .filter((x) => x.count > 0)
    if (replaced.length) {
      const names = replaced.map((x) => x.name).join(', ')
      const total = replaced.reduce((n, x) => n + x.count, 0)
      if (!confirm(`${names} 선생님의 기존 시간표 ${total}건을 새 시간표로 교체합니다. 계속할까요?`)) return
    }
    const idSet = new Set(ids)
    setData((d) => {
      const timetable = [...d.timetable.filter((e) => !idSet.has(e.teacherId)), ...preview.entries]
      const teachers = [...d.teachers, ...preview.newTeachers].map((t) => {
        if (!idSet.has(t.id)) return t
        // 담당 학년·교과를 시간표에서 계산 (교과는 '미지정'일 때만)
        const mine = timetable.filter((e) => e.teacherId === t.id)
        const grades = [...new Set(mine.map((e) => e.grade))].sort((a, b) => a - b)
        let subject = t.subject
        if (subject === '미지정' && mine.length) {
          const count = new Map<string, number>()
          mine.forEach((e) => count.set(e.subject, (count.get(e.subject) ?? 0) + 1))
          subject = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0]
        }
        return { ...t, grades, subject }
      })
      return { ...d, timetable, teachers }
    })
    if (ids[0]) setSelected(ids[0])
    setPreview(null)
    alert('시간표를 등록했습니다.')
  }
  return (
    <>
      <PageHeader
        eyebrow="시간표"
        title="시간표 등록·조회"
        desc="한글 파일은 표를 복사해서 붙여넣거나, 엑셀로 저장한 뒤 복사해 주세요."
        action={
          <button
            onClick={() => setText(samplePaste)}
            className="m3-btn m3-outlined"
          >
            샘플 데이터 불러오기
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">붙여넣기</h2>
            <Badge>TSV / 표</Badge>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'교사명\t월\t화\t수\t목\t금\n1(08:10)\t209문학\t…'}
            className="m3-field mt-4 h-80 w-full resize-none p-4 font-mono text-xs leading-6"
          />
          <button
            onClick={() => setPreview(parseTimetable(text, data.teachers))}
            className="m3-btn m3-filled mt-3 w-full"
          >
            미리보기 생성
          </button>
          {preview && (
            <div className="mt-4 rounded-xl bg-wash p-4 text-sm">
              <p className="font-semibold">{preview.entries.length}개 수업 파싱됨</p>
              {preview.newTeachers.length > 0 && (
                <p className="mt-2 text-iris-deep">
                  새 교사 {preview.newTeachers.length}명: {preview.newTeachers.map((t) => t.name).join(', ')}
                </p>
              )}
              {preview.errors.length > 0 && (
                <>
                  <p className="mt-2 text-bad">파싱 실패 {preview.errors.length}건</p>
                  <ul className="mt-1 max-h-32 overflow-y-auto rounded-lg bg-surface p-2 font-mono text-xs text-bad">
                    {preview.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </>
              )}
              <button
                onClick={register}
                disabled={preview.entries.length === 0}
                className="m3-btn m3-btn-sm m3-filled mt-3"
              >
                등록
              </button>
            </div>
          )}
        </Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">등록 시간표</h2>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="m3-field m3-field-sm"
            >
              {data.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.subject}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-subtle">
                  <th className="p-3">교시</th>
                  {days.map((d) => (
                    <th key={d} className="p-3">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr className="border-b border-line" key={p}>
                    <td className="p-3 font-semibold text-subtle">{p}</td>
                    {days.map((day) => {
                      const e = selectedEntries.find((x) => x.period === p && x.dayOfWeek === day)
                      return (
                        <td className="p-2" key={day}>
                          {e ? (
                            <div className="rounded-lg bg-iris-soft px-2.5 py-2 text-xs text-on-iris-container">
                              <b>
                                {e.room}
                                {e.group ? e.group : ''}
                              </b>
                              <br />
                              {e.subject}
                            </div>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
