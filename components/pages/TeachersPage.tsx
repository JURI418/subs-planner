'use client'
import { useState } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import type { AppData, SetData } from '@/lib/types'

export function TeachersPage({ data, setData }: { data: AppData; setData: SetData }) {
  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('all')
  const list = data.teachers.filter(
    (t) => t.name.includes(q) && (grade === 'all' || t.grades.includes(Number(grade))),
  )
  return (
    <>
      <PageHeader
        eyebrow="인력 관리"
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
                        setData((d) => ({
                          ...d,
                          teachers: d.teachers.map((x) =>
                            // 시간강사는 보강 후보에서 빠지는 것이 기본, 정규로 돌리면 다시 후보에 넣는다
                            x.id === t.id
                              ? e.target.value === '시간강사'
                                ? { ...x, employmentType: '시간강사', poolStatus: '제외' }
                                : {
                                    ...x,
                                    employmentType: '정규',
                                    poolStatus: x.poolStatus === '제외' ? '기본' : x.poolStatus,
                                  }
                              : x,
                          ),
                        }))
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
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          teachers: d.teachers.map((x) =>
                            x.id === t.id ? { ...x, poolStatus: e.target.value as any } : x,
                          ),
                        }))
                      }
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
