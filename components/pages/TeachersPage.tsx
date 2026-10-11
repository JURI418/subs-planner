'use client'
import { useState } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { formatDate, type AppData, type SetData, type Teacher } from '@/lib/types'
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
                <th className="p-3 text-right">누적 보강</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr className="border-b border-line" key={t.id}>
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
                  <td className="p-3 text-right font-semibold">{t.totalAssignments}회</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
