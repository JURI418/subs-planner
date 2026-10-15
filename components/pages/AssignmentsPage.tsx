'use client'
import { Fragment, useState } from 'react'
import { CheckCheck, ChevronDown, Copy, Sheet, Trash2, X } from 'lucide-react'
import { AssignmentDetail, type DetailActions } from '@/components/assignments/AssignmentDetail'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { exportText, formatDate, isVirtual, type AppData, type Assignment, type SetData } from '@/lib/types'
import { validateAssignment } from '@/lib/scheduling'
import { cancelConfirm, confirmMany, deleteSlots } from '@/lib/dataOps'

/** 추천 근거 칩 색: 좋은 점은 초록, 문제는 빨강, 수동 변경은 자주, 나머지는 회색 */
function reasonTone(r: string) {
  if (/위반|수업 있음|다른 보강|결강|초과|불가|제외|후보 없음|본인/.test(r)) return 'bg-bad-soft text-bad'
  if (/수동|예비.*변경/.test(r)) return 'bg-plum-soft text-plum'
  if (/같은 학년|추가 포함/.test(r)) return 'bg-ok-soft text-ok'
  if (/연속/.test(r)) return 'bg-sky-soft text-sky'
  return 'bg-wash text-ink-2'
}

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
  // 체크 선택 (보이는 목록 기준)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const visibleIds = rows.map((a) => a.slotId)
  const sel = visibleIds.filter((id) => picked.has(id))
  const allOn = visibleIds.length > 0 && sel.length === visibleIds.length
  const pick = (id: string, on: boolean) =>
    setPicked((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })
  const pickAll = (on: boolean) => setPicked(on ? new Set(visibleIds) : new Set())
  const selRows = data.assignments.filter((a) => sel.includes(a.slotId))
  const selProposed = selRows.filter((a) => a.status === '제안' && a.substituteTeacherId)
  const selNoTeacher = selRows.filter((a) => !a.substituteTeacherId)

  const confirmSelected = () => {
    setData((d) => confirmMany(d, selProposed.map((a) => a.slotId)))
    setPicked(new Set())
  }
  const deleteSelected = () => {
    const confirmed = selRows.filter((a) => a.status === '확정').length
    if (
      !window.confirm(
        `선택한 ${sel.length}건을 삭제합니다.` +
          (confirmed ? `\n확정된 ${confirmed}건은 누적 보강 횟수에서도 빠집니다.` : '') +
          '\n구글 시트에 이미 올린 줄은 지워지지 않습니다. 계속할까요?',
      )
    )
      return
    setData((d) => deleteSlots(d, sel))
    setPicked(new Set())
  }
  const sendSelected = () => {
    if (!data.settings.sheetUrl) {
      alert('먼저 설정 > 구글 시트 연결에서 시트를 연결하세요.')
      return
    }
    let ids = selRows.filter((a) => a.substituteTeacherId).map((a) => a.slotId)
    if (selProposed.length) {
      const ok = window.confirm(
        `아직 확정 전인 배정이 ${selProposed.length}건 있습니다.\n[확인] 확정하고 함께 올리기\n[취소] 확정된 것만 올리기`,
      )
      if (ok) setData((d) => confirmMany(d, selProposed.map((a) => a.slotId)))
      else ids = selRows.filter((a) => a.status === '확정').map((a) => a.slotId)
    }
    if (!ids.length) {
      alert('올릴 배정이 없습니다. 보강 교사가 정해진 배정만 올릴 수 있어요.')
      return
    }
    window.dispatchEvent(new CustomEvent('sheet-send', { detail: ids }))
    setPicked(new Set())
  }
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
        eyebrow="Assignments"
        title="배정 확인"
        desc="추천 근거를 확인한 뒤 개별 또는 일괄 확정하세요."
        action={
          <div className="flex flex-wrap gap-2">
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
            onClick={() => {
              setFilter(v)
              setPicked(new Set())
            }}
            className={`m3-chip ${filter === v ? 'm3-chip-on' : ''}`}
            aria-pressed={filter === v}
          >
                        {l}
          </button>
        ))}
      </div>
      {/* 선택 도구 막대: 체크한 것이 있을 때만 */}
      {sel.length > 0 && (
        <div className="sticky top-16 z-[5] mb-3 flex flex-wrap items-center gap-2 bg-ink px-4 py-2.5 text-paper shadow-[0_6px_18px_rgb(0_0_0/.18)] lg:top-3">
          <span className="mr-2 text-[14px] font-bold">
            <span className="text-point">{sel.length}건</span> 선택
          </span>
          {selProposed.length > 0 && (
            <button onClick={confirmSelected} className="m3-btn m3-btn-sm border border-paper/40 text-paper hover:bg-paper hover:text-ink">
              <CheckCheck size={15} /> 선택 확정 · {selProposed.length}
            </button>
          )}
          <button onClick={sendSelected} className="m3-btn m3-btn-sm bg-point text-on-point hover:brightness-95">
            <Sheet size={15} /> 구글 시트에 올리기
          </button>
          <button onClick={deleteSelected} className="m3-btn m3-btn-sm border border-paper/40 text-paper hover:border-bad hover:bg-bad">
            <Trash2 size={15} /> 선택 삭제
          </button>
          {selNoTeacher.length > 0 && (
            <span className="text-[12px] text-paper/60">보강 교사 없는 {selNoTeacher.length}건은 확정·올리기에서 빠져요</span>
          )}
          <button onClick={() => pickAll(false)} aria-label="선택 해제" className="ml-auto grid size-8 place-items-center rounded-full text-paper/70 hover:text-paper">
            <X size={17} />
          </button>
        </div>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-subtle">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allOn}
                    ref={(el) => {
                      if (el) el.indeterminate = sel.length > 0 && !allOn
                    }}
                    onChange={(e) => pickAll(e.target.checked)}
                    className="size-4 accent-ink"
                  />
                </th>
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
                    <tr className={`${isOpen ? '' : 'border-b border-line'} ${picked.has(a.slotId) ? 'bg-point/15' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={`${formatDate(s?.date || '')} ${s?.period}교시 선택`}
                          checked={picked.has(a.slotId)}
                          onChange={(e) => pick(a.slotId, e.target.checked)}
                          className="size-4 accent-ink"
                        />
                      </td>
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
                            .filter((t) => t.poolStatus !== '제외' && !isVirtual(t))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                        {(a.backups[0] || a.backups[1]) && (
                          <span className="mt-1.5 block text-xs leading-5 text-subtle">
                            {a.backups[0] && <><b className="font-bold text-plum">예비1</b> {nameOf(a.backups[0])}</>}
                            {a.backups[0] && a.backups[1] && ' · '}
                            {a.backups[1] && <><b className="font-bold text-plum">예비2</b> {nameOf(a.backups[1])}</>}
                          </span>
                        )}
                      </td>
                      <td className="max-w-72 p-3 text-xs text-subtle">
                        <span className="flex flex-wrap gap-1">
                          {a.reasons.map((r) => (
                            <span key={r} className={`rounded-full px-2 py-0.5 text-[11.5px] leading-5 ${reasonTone(r)}`}>
                              {r}
                            </span>
                          ))}
                        </span>
                        {s && (
                          <button
                            onClick={() => toggle(a.slotId)}
                            aria-expanded={isOpen}
                            className="m3-btn m3-btn-sm m3-text -ml-3 mt-1 flex"
                          >
                            시간표 {isOpen ? '접기' : '보기'}
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
                        {data.settings.sheetUrl && a.sheetSent && a.sheetSent !== 'skip' && (
                          <span className="mt-1 block text-[11px] font-bold text-ok" title="구글 시트에 올림">시트 ✓</span>
                        )}
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
                        <td colSpan={8} className="px-1 pb-4">
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
