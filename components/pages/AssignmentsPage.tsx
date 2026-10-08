'use client'
import { Fragment, useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { AssignmentDetail, type DetailActions } from '@/components/assignments/AssignmentDetail'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { exportText, formatDate, type AppData, type Assignment, type SetData } from '@/lib/types'
import { validateAssignment } from '@/lib/scheduling'
import { cancelConfirm } from '@/lib/dataOps'

export function AssignmentsPage({ data, setData }: { data: AppData; setData: SetData }) {
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const rows = data.assignments.filter((a) => filter === 'all' || a.status === filter)
  const confirmOne = (id: string) =>
    setData((d) => {
      const target = d.assignments.find((x) => x.slotId === id)
      // 보강 교사가 없거나 이미 확정된 건은 확정하지 않음
      if (!target || !target.substituteTeacherId || target.status !== '제안') return d
      return {
        ...d,
        assignments: d.assignments.map((a) => (a.slotId === id ? { ...a, status: '확정' } : a)),
        teachers: d.teachers.map((t) =>
          t.id === target.substituteTeacherId ? { ...t, totalAssignments: t.totalAssignments + 1 } : t,
        ),
      }
    })
  const update = (slotId: string, patch: Partial<Assignment>) =>
    setData((d) => ({
      ...d,
      assignments: d.assignments.map((x) => (x.slotId === slotId ? { ...x, ...patch } : x)),
    }))
  const changeSubstitute = (a: Assignment, teacherId: string) => {
    if (!teacherId) {
      update(a.slotId, {
        substituteTeacherId: null,
        status: '배정불가',
        isManual: true,
        reasons: ['수동으로 배정 해제'],
      })
      return
    }
    const slot = data.slots.find((s) => s.id === a.slotId)
    if (!slot) return
    const problems = validateAssignment(slot, teacherId, data)
    if (problems.length && !window.confirm(`제약 조건 위반: ${problems.join(', ')}. 그래도 배정할까요?`))
      return
    update(a.slotId, {
      substituteTeacherId: teacherId,
      status: '제안',
      isManual: true,
      reasons: ['수동 배정', ...problems],
      // 예비 교사로 지정돼 있던 교사를 보강으로 고르면 예비에서는 뺀다
      backups: a.backups.map((b) => (b === teacherId ? null : b)) as Assignment['backups'],
    })
  }
  const nameOf = (id: string | null) => data.teachers.find((t) => t.id === id)?.name ?? ''
  const actionsFor = (a: Assignment): DetailActions => ({
    setMain: (id) => changeSubstitute(a, id),
    setBackup: (i, id) => {
      if (id && id === a.substituteTeacherId) return
      const slot = data.slots.find((s) => s.id === a.slotId)
      if (id && slot) {
        const problems = validateAssignment(slot, id, data)
        if (
          problems.length &&
          !window.confirm(`제약 조건 위반: ${problems.join(', ')}. 그래도 예비${i + 1}로 지정할까요?`)
        )
          return
      }
      const next = [...a.backups] as Assignment['backups']
      if (id) next[i === 0 ? 1 : 0] = next[i === 0 ? 1 : 0] === id ? null : next[i === 0 ? 1 : 0]
      next[i] = id
      update(a.slotId, { backups: next })
    },
    promote: (i) => {
      const id = a.backups[i]
      if (!id) return
      const msg =
        `예비${i + 1} ${nameOf(id)} 선생님을 보강 교사로 올립니다.` +
        (a.status === '확정'
          ? `\n확정된 ${nameOf(a.substituteTeacherId)} 선생님의 확정은 취소되고, 새 배정은 '제안' 상태가 됩니다.`
          : '') +
        ' 계속할까요?'
      if (!window.confirm(msg)) return
      setData((prev) => {
        const d = a.status === '확정' ? cancelConfirm(prev, a.slotId) : prev
        const rest: Assignment['backups'] = i === 0 ? [a.backups[1], null] : [a.backups[0], null]
        return {
          ...d,
          assignments: d.assignments.map((x) =>
            x.slotId === a.slotId
              ? {
                  ...x,
                  substituteTeacherId: id,
                  status: '제안',
                  isManual: true,
                  reasons: [`예비${i + 1}에서 보강으로 변경`],
                  backups: rest,
                }
              : x,
          ),
        }
      })
    },
  })
  const copy = () => {
    const text = exportText(data)
    if (!text) return alert('복사할 배정이 없습니다.')
    navigator.clipboard?.writeText(text)
    alert('엑셀·나이스 붙여넣기 형식으로 복사했습니다.')
  }
  return (
    <>
      <PageHeader
        eyebrow="배정 관리"
        title="배정 확인"
        desc="추천 근거를 확인한 뒤 개별 또는 일괄 확정하세요."
        action={
          <div className="flex gap-2">
            <button onClick={copy} className="m3-btn m3-outlined">
              <Copy size={16} strokeWidth={1.5} />
              복사
            </button>
            <button
              onClick={() =>
                data.assignments
                  .filter((a) => a.status === '제안' && a.substituteTeacherId)
                  .forEach((a) => confirmOne(a.slotId))
              }
              className="m3-btn m3-filled"
            >
              제안 전체 확정
            </button>
          </div>
        }
      />
      <div className="mb-4 flex gap-2">
        {[
          ['all', '전체'],
          ['제안', '제안'],
          ['확정', '확정'],
          ['배정불가', '배정불가'],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`m3-chip ${filter === v ? 'm3-chip-on' : ''}`}
            aria-pressed={filter === v}
          >
            {filter === v && <Check size={16} strokeWidth={2} />}
            {l}
          </button>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-subtle">
                <th className="p-3">일자</th>
                <th className="p-3">수업</th>
                <th className="p-3">결강 교사</th>
                <th className="p-3">보강 교사</th>
                <th className="p-3">추천 근거</th>
                <th className="p-3">상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const s = data.slots.find((x) => x.id === a.slotId)
                const isOpen = open.has(a.slotId)
                return (
                  <Fragment key={a.slotId}>
                    <tr className={isOpen ? '' : 'border-b border-line'}>
                      <td className="p-3 font-semibold">
                        {formatDate(s?.date || '')}
                        <br />
                        <span className="text-xs text-subtle">
                          {s?.dayOfWeek} {s?.period}교시
                        </span>
                      </td>
                      <td className="p-3">
                        {s?.grade}학년 {s?.room}
                        <br />
                        <span className="text-xs text-subtle">
                          {s?.group || '일반'} · {s?.subject}
                        </span>
                      </td>
                      <td className="p-3">{data.teachers.find((t) => t.id === s?.absentTeacherId)?.name}</td>
                      <td className="p-3">
                        <select
                          disabled={a.status === '확정'}
                          value={a.substituteTeacherId || ''}
                          onChange={(e) => changeSubstitute(a, e.target.value)}
                          className="m3-field m3-field-sm"
                        >
                          <option value="">배정불가</option>
                          {data.teachers
                            .filter((t) => t.poolStatus !== '제외')
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                        {(a.backups[0] || a.backups[1]) && (
                          <span className="mt-1.5 block text-xs leading-5 text-subtle">
                            {a.backups[0] && <>예비1 {nameOf(a.backups[0])}</>}
                            {a.backups[0] && a.backups[1] && ' · '}
                            {a.backups[1] && <>예비2 {nameOf(a.backups[1])}</>}
                          </span>
                        )}
                      </td>
                      <td className="max-w-64 p-3 text-xs text-subtle">
                        {a.reasons.join(' · ')}
                        {s && (
                          <button
                            onClick={() => toggle(a.slotId)}
                            aria-expanded={isOpen}
                            className="m3-btn m3-btn-sm m3-text -ml-3 mt-1 flex"
                          >
                            근거·시간표 {isOpen ? '접기' : '보기'}
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          tone={a.status === '확정' ? 'green' : a.status === '배정불가' ? 'red' : 'yellow'}
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {a.status === '제안' && a.substituteTeacherId && (
                          <button onClick={() => confirmOne(a.slotId)} className="m3-btn m3-btn-sm m3-tonal">
                            확정
                          </button>
                        )}
                        {a.status === '확정' && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  '확정을 취소하고 제안 상태로 되돌립니다. 누적 보강 횟수도 1 줄어듭니다. 계속할까요?',
                                )
                              )
                                setData((d) => cancelConfirm(d, a.slotId))
                            }}
                            className="m3-btn m3-btn-sm m3-text"
                          >
                            확정 취소
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && s && (
                      <tr className="border-b border-line">
                        <td colSpan={7} className="px-1 pb-4">
                          <AssignmentDetail a={a} slot={s} data={data} actions={actionsFor(a)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
