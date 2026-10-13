'use client'
import { Fragment, useState } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { days, formatDate, type AppData, type Day, type SetData, type Teacher } from '@/lib/types'
import { excludeTeacher } from '@/lib/dataOps'

export function TeachersPage({ data, setData }: { data: AppData; setData: SetData }) {
  // 교사 정보 변경. 보강 후보에서 빠지게 되면 이미 만든 배정도 다시 추천한다
  const updateTeacher = (id: string, patch: Partial<Teacher>) => {
    const before = data.teachers.find((x) => x.id === id)
    let next: AppData = { ...data, teachers: data.teachers.map((x) => (x.id === id ? { ...x, ...patch } : x)) }
    if (before && before.poolStatus !== '제외' && patch.poolStatus === '제외') {
      const r = excludeTeacher(next, id)
      next = r.data
      const lines = [`${before.name} 선생님을 보강 후보에서 뺐습니다.`]
      if (r.replaced) lines.push(`확정 전 배정 ${r.replaced}건을 다른 교사로 다시 추천했습니다.`)
      if (r.conflicts.length)
        lines.push(
          `이미 확정된 보강 ${r.conflicts.length}건은 그대로 두었습니다. 배정 확인에서 직접 바꿔 주세요:\n` +
            r.conflicts.map((s) => `${formatDate(s.date)} ${s.period}교시 ${s.room}`).join('\n'),
        )
      if (r.replaced || r.conflicts.length) alert(lines.join('\n'))
    }
    setData(next)
  }

  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  // 보강 불가 시간 저장: 그 시간에 이미 들어가 있는 확정 전 배정은 다시 추천
  const saveBlocked = (id: string, blocked: { day: Day; period: number }[], note: string) => {
    const t = data.teachers.find((x) => x.id === id)
    let next: AppData = {
      ...data,
      teachers: data.teachers.map((x) => (x.id === id ? { ...x, blocked, blockedNote: note.trim() || undefined } : x)),
    }
    const hit = (s: { dayOfWeek: Day; period: number }) => blocked.some((b) => b.day === s.dayOfWeek && b.period === s.period)
    const r = excludeTeacher(next, id, hit)
    next = r.data
    const lines = [`${t?.name} 선생님의 보강 불가 시간을 저장했습니다 (${blocked.length}칸).`]
    if (r.replaced) lines.push(`그 시간에 잡혀 있던 확정 전 배정 ${r.replaced}건을 다른 교사로 다시 추천했습니다.`)
    if (r.conflicts.length)
      lines.push(
        `이미 확정된 보강 ${r.conflicts.length}건은 그대로 두었습니다:\n` +
          r.conflicts.map((s) => `${formatDate(s.date)} ${s.period}교시 ${s.room}`).join('\n'),
      )
    if (r.replaced || r.conflicts.length) alert(lines.join('\n'))
    setData(next)
  }
  const list = data.teachers.filter(
    (t) => t.name.includes(q) && (grade === 'all' || t.grades.includes(Number(grade))),
  )
  return (
    <>
      <PageHeader
        eyebrow="Faculty"
        title="교사 관리"
        desc="시간표에서 담당 학년을 자동으로 계산합니다."
        action={
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름 검색"
              className="m3-field m3-field-sm w-36"
            />
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="m3-field m3-field-sm">
              <option value="all">전체 학년</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
        }
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-subtle">
                <th className="p-3">이름</th>
                <th className="p-3">교과</th>
                <th className="p-3">담당 학년</th>
                <th className="p-3">근무 구분</th>
                <th className="p-3">보강 후보</th>
                <th className="p-3">보강 불가 시간</th>
                <th className="p-3 text-right">누적 보강</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <Fragment key={t.id}>
                <tr className="border-b border-line">
                  <td className="p-3 font-semibold">
                    {t.name}
                    {t.name.startsWith('가상') && <Badge tone="red">임시</Badge>}
                  </td>
                  <td className="p-3 text-subtle">{t.subject}</td>
                  <td className="p-3">
                    {t.grades.map((g) => (
                      <Badge key={g} tone="blue">
                        {g}학년
                      </Badge>
                    ))}
                  </td>
                  <td className="p-3">
                    <select
                      value={t.employmentType}
                      onChange={(e) =>
                        // 시간강사는 보강 후보에서 빠지는 것이 기본, 정규로 돌리면 다시 후보에 넣는다
                        updateTeacher(
                          t.id,
                          e.target.value === '시간강사'
                            ? { employmentType: '시간강사', poolStatus: '제외' }
                            : { employmentType: '정규', poolStatus: t.poolStatus === '제외' ? '기본' : t.poolStatus },
                        )
                      }
                      className="m3-field m3-field-sm"
                    >
                      <option>정규</option>
                      <option>시간강사</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={t.poolStatus}
                      onChange={(e) => updateTeacher(t.id, { poolStatus: e.target.value as Teacher['poolStatus'] })}
                      className="m3-field m3-field-sm"
                    >
                      <option>기본</option>
                      <option>제외</option>
                      <option>추가포함</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setOpenId(openId === t.id ? null : t.id)}
                      aria-expanded={openId === t.id}
                      className={`m3-btn m3-btn-sm ${t.blocked?.length ? 'border border-plum text-plum' : 'm3-outlined'}`}
                    >
                      {t.blocked?.length ? `${t.blocked.length}칸${t.blockedNote ? ` · ${t.blockedNote}` : ''}` : '설정'}
                    </button>
                  </td>
                  <td className="p-3 text-right font-semibold">{t.totalAssignments}회</td>
                </tr>
                {openId === t.id && (
                  <tr className="border-b border-line bg-wash">
                    <td colSpan={7} className="p-4">
                      <BlockedEditor
                        teacher={t}
                        periodCount={data.settings.periodCount}
                        own={data.timetable.filter((e) => e.teacherId === t.id)}
                        onCancel={() => setOpenId(null)}
                        onSave={(blocked, note) => {
                          saveBlocked(t.id, blocked, note)
                          setOpenId(null)
                        }}
                      />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/** 요일 × 교시 칸을 눌러 보강 불가 시간을 고른다. 자기 수업 칸은 원래 보강이 안 되므로 회색으로 표시 */
function BlockedEditor({
  teacher,
  periodCount,
  own,
  onSave,
  onCancel,
}: {
  teacher: Teacher
  periodCount: number
  own: { dayOfWeek: Day; period: number }[]
  onSave: (blocked: { day: Day; period: number }[], note: string) => void
  onCancel: () => void
}) {
  const [sel, setSel] = useState(() => new Set((teacher.blocked ?? []).map((b) => `${b.day}-${b.period}`)))
  const [note, setNote] = useState(teacher.blockedNote ?? '')
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1)
  const toggle = (k: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  const toggleDay = (d: Day) =>
    setSel((s) => {
      const keys = periods.map((p) => `${d}-${p}`)
      const all = keys.every((k) => s.has(k))
      const n = new Set(s)
      keys.forEach((k) => (all ? n.delete(k) : n.add(k)))
      return n
    })
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div>
        <p className="mb-2 text-[13px] text-subtle">
          <b className="text-ink">{teacher.name}</b> 선생님이 보강에 들어갈 수 없는 칸을 눌러 고르세요. 요일 이름을 누르면
          하루 전체가 선택됩니다.
        </p>
        <table className="border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="w-10 p-1 text-xs font-normal text-subtle">교시</th>
              {days.map((d) => (
                <th key={d} className="p-1">
                  <button onClick={() => toggleDay(d)} className="w-14 rounded-md py-1 font-bold hover:bg-ink/[.06]">
                    {d}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <td className="p-1 text-center text-xs text-subtle">{p}</td>
                {days.map((d) => {
                  const k = `${d}-${p}`
                  const on = sel.has(k)
                  const cls = own.some((e) => e.dayOfWeek === d && e.period === p)
                  return (
                    <td key={k} className="p-1">
                      <button
                        onClick={() => toggle(k)}
                        aria-pressed={on}
                        aria-label={`${d} ${p}교시`}
                        className={`h-8 w-14 rounded-md text-[11px] transition-colors ${
                          on
                            ? 'bg-plum font-bold text-white'
                            : cls
                              ? 'bg-iris-soft text-subtle'
                              : 'border border-dashed border-line bg-surface hover:border-plum'
                        }`}
                      >
                        {on ? '불가' : cls ? '수업' : ''}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-w-60 flex-col gap-3">
        <label className="text-sm font-semibold">
          메모 (선택)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 부장 회의, 육아시간"
            className="m3-field m3-field-sm mt-2 w-full"
          />
        </label>
        <p className="text-[12px] leading-5 text-subtle">
          선택한 칸에는 보강이 추천되지 않습니다. 이미 그 시간에 잡힌 확정 전 배정은 저장할 때 다른 선생님으로 바뀝니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              onSave(
                [...sel].map((k) => {
                  const [day, p] = k.split('-')
                  return { day: day as Day, period: Number(p) }
                }),
                note,
              )
            }
            className="m3-btn m3-btn-sm m3-filled"
          >
            저장
          </button>
          {sel.size > 0 && (
            <button onClick={() => setSel(new Set())} className="m3-btn m3-btn-sm m3-outlined">
              모두 지우기
            </button>
          )}
          <button onClick={onCancel} className="m3-btn m3-btn-sm m3-text">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
