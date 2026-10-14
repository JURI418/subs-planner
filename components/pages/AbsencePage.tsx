'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { dateDay, formatDate, isVirtual, todayISO, uid, type Absence, type AppData, type SetData, type Slot } from '@/lib/types'
import { autoAssign, isAbsentAt, makeSlots, runScheduling } from '@/lib/scheduling'
import { absenceSummary, deleteAbsence } from '@/lib/dataOps'

/** 나이스 복무 근무상황 종류 (교원 휴가에 관한 예규 기준) */
const reasonGroups: [string, string[]][] = [
  ['휴가', ['연가', '병가', '공가', '특별휴가']],
  ['근무', ['국내출장', '국외출장', '41조 연수']],
  ['시간 단위', ['외출', '조퇴', '지각']],
  ['그 밖', ['결근', '기타']],
]
const specialLeaves = [
  '경조사',
  '출산',
  '배우자 출산',
  '유산·사산',
  '임신검진',
  '모성보호시간',
  '육아시간',
  '여성보건',
  '난임치료',
  '가족돌봄',
  '자녀돌봄',
  '수업',
  '재해구호',
  '포상',
  '장기재직',
]

/** [5,6,7] → '5~7교시', [1,3] → '1·3교시' */
function periodLabel(ps: number[]) {
  const sorted = [...ps].sort((a, b) => a - b)
  const run = sorted.every((p, i) => i === 0 || p === sorted[i - 1] + 1)
  return run && sorted.length > 1 ? `${sorted[0]}~${sorted[sorted.length - 1]}교시` : `${sorted.join('·')}교시`
}

export function AbsencePage({ data, setData }: { data: AppData; setData: SetData }) {
  const router = useRouter()
  const [teacherId, setTeacherId] = useState(data.teachers.find((t) => !isVirtual(t))?.id || '')
  const [start, setStart] = useState(todayISO)
  const [end, setEnd] = useState(todayISO)
  const [kind, setKind] = useState('병가')
  const [detail, setDetail] = useState('')
  const reason = [kind, detail.trim()].filter(Boolean).join(' · ')
  // 결강 범위: 하루 전체 또는 교시 선택 (조퇴·외출·지각은 교시 선택이 기본)
  const [scope, setScope] = useState<'day' | 'periods'>('day')
  const [periods, setPeriods] = useState<number[]>([])
  const allPeriods = Array.from({ length: data.settings.periodCount }, (_, i) => i + 1)
  const togglePeriod = (p: number) =>
    setPeriods((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p].sort((a, b) => a - b)))
  const dayTeaching =
    start === end && teacherId
      ? new Set(data.timetable.filter((e) => e.teacherId === teacherId && e.dayOfWeek === dateDay(start)).map((e) => e.period))
      : null
  const [preview, setPreview] = useState<Slot[]>([])
  const [selected, setSelected] = useState<string[]>([])
  // 미리보기 때 만든 결강 id를 저장해 두었다가 저장할 때 그대로 사용 (슬롯의 absenceId와 일치시키기 위함)
  const [absenceId, setAbsenceId] = useState<string | null>(null)
  const make = () => {
    if (!teacherId) return alert('결강 교사를 선택하세요.')
    if (end < start) return alert('종료일이 시작일보다 빠릅니다.')
    const id = uid('a')
    if (scope === 'periods' && periods.length === 0) return alert('결강할 교시를 고르세요.')
    const slots = makeSlots(id, teacherId, start, end, data, scope === 'periods' ? periods : undefined)
    setAbsenceId(id)
    setPreview(slots)
    setSelected(slots.map((s) => s.id))
  }
  const execute = () => {
    if (!absenceId) return
    const absence: Absence = {
      id: absenceId,
      teacherId,
      startDate: start,
      endDate: end,
      mode: scope === 'periods' ? '교시선택' : '종일',
      ...(scope === 'periods' ? { periods } : {}),
      reason,
    }
    const slots = preview.filter((s) => selected.includes(s.id))
    const base: AppData = {
      ...data,
      absences: [...data.absences, absence],
      slots: [...data.slots, ...slots],
    }
    const slotOf = (id: string) => base.slots.find((s) => s.id === id)

    // 이번 결강 교사가 이미 다른 결강의 보강 교사로 잡혀 있는 배정 찾기
    const affected = base.assignments.filter((a) => {
      const s = slotOf(a.slotId)
      return a.substituteTeacherId === teacherId && !!s && isAbsentAt(teacherId, s.date, s.period, [absence])
    })
    let assignments = base.assignments
    for (const a of affected.filter((x) => x.status === '제안')) {
      const prior = assignments.filter((x) => x.slotId !== a.slotId)
      const redo = autoAssign(slotOf(a.slotId)!, { ...base, assignments: prior }, prior)
      assignments = assignments.map((x) => (x.slotId === a.slotId ? redo : x))
    }
    const conflicts = affected.filter((x) => x.status === '확정')

    // 새 결강 슬롯 자동 배정
    const scheduled = runScheduling({ ...base, assignments }, slots)
    const newIds = new Set(slots.map((s) => s.id))
    setData((d) => ({
      ...d,
      absences: base.absences,
      slots: base.slots,
      assignments: [...assignments, ...scheduled.filter((a) => newIds.has(a.slotId))],
    }))
    if (conflicts.length) {
      const list = conflicts
        .map((c) => {
          const s = slotOf(c.slotId)!
          return `${formatDate(s.date)} ${s.period}교시 ${s.grade}학년 ${s.room}`
        })
        .join('\n')
      alert(`확정된 보강 ${conflicts.length}건의 보강 교사가 결강입니다:\n${list}`)
    }
    router.push('/assignments')
  }
  const remove = (a: Absence) => {
    const name = data.teachers.find((t) => t.id === a.teacherId)?.name ?? '알 수 없음'
    const { slots, confirmed } = absenceSummary(data, a.id)
    const detail = confirmed ? ` (확정 ${confirmed}건 포함, 누적 보강 횟수에서도 빠집니다)` : ''
    if (
      !confirm(
        `${name} 선생님 결강(${formatDate(a.startDate)}~${formatDate(a.endDate)})을 삭제합니다.\n보강 배정 ${slots}건도 함께 삭제됩니다${detail}. 계속할까요?`,
      )
    )
      return
    setData((d) => deleteAbsence(d, a.id))
  }
  const registered = [...data.absences].sort(
    (x, y) => y.startDate.localeCompare(x.startDate) || y.endDate.localeCompare(x.endDate),
  )
  return (
    <>
      <PageHeader
        eyebrow="Absence"
        title="결강 등록"
        desc="날짜와 교사를 입력하면 시간표에서 결강 슬롯을 자동으로 찾습니다."
      />
      <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <Card>
          <h2 className="font-display text-lg font-semibold">결강 기본 정보</h2>
          <div className="mt-5 flex flex-col gap-4">
            <label className="text-sm font-semibold">
              결강 교사
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="m3-field mt-2 w-full"
              >
                <option value="">선택</option>
                {data.teachers.filter((t) => !isVirtual(t)).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.subject}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">
                시작일
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="m3-field mt-2 w-full"
                />
              </label>
              <label className="text-sm font-semibold">
                종료일
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="m3-field mt-2 w-full"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">
                사유 (나이스 근무상황)
                <select
                  id="absence-kind"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value)
                    setDetail('')
                    if (['조퇴', '외출', '지각'].includes(e.target.value)) setScope('periods')
                  }}
                  className="m3-field mt-2 w-full"
                >
                  {reasonGroups.map(([group, items]) => (
                    <optgroup key={group} label={group}>
                      {items.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                {kind === '특별휴가' ? '특별휴가 종류' : '세부 사유 (선택)'}
                {kind === '특별휴가' ? (
                  <select id="absence-detail" value={detail} onChange={(e) => setDetail(e.target.value)} className="m3-field mt-2 w-full">
                    <option value="">선택 안 함</option>
                    {specialLeaves.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="absence-detail"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder={kind === '국내출장' ? '예: 교육청 회의' : kind === '국외출장' ? '예: 해외 연수' : kind === '기타' ? '직접 입력' : '예: 진료'}
                    className="m3-field mt-2 w-full"
                  />
                )}
              </label>
            </div>
            <div className="text-sm font-semibold">
              결강 범위
              <div className="mt-2 inline-flex border border-line bg-surface p-0.5" role="radiogroup">
                {(
                  [
                    ['day', '하루 전체'],
                    ['periods', '교시 선택'],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    role="radio"
                    aria-checked={scope === v}
                    onClick={() => setScope(v)}
                    className={`px-4 py-1.5 text-[14px] ${scope === v ? 'bg-ink font-bold text-paper' : 'font-normal text-ink-2 hover:bg-wash'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {scope === 'periods' && (
                <div className="mt-3 font-normal">
                  <div className="flex flex-wrap gap-1.5">
                    {allPeriods.map((p) => {
                      const on = periods.includes(p)
                      const teach = dayTeaching?.has(p)
                      return (
                        <button
                          key={p}
                          onClick={() => togglePeriod(p)}
                          aria-pressed={on}
                          aria-label={`${p}교시`}
                          className={`relative grid h-10 w-11 place-items-center rounded-md text-[14px] font-bold transition-colors ${
                            on ? 'bg-ink text-paper' : 'border border-line bg-surface text-ink-2 hover:border-ink'
                          }`}
                        >
                          {p}
                          {teach && <span className={`absolute bottom-1 size-1 rounded-full ${on ? 'bg-point' : 'bg-ink/50'}`} aria-hidden />}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                    <button onClick={() => setPeriods(allPeriods.filter((p) => p <= 4))} className="m3-btn m3-btn-sm m3-text h-7 px-2">
                      오전 1~4
                    </button>
                    <button onClick={() => setPeriods(allPeriods.filter((p) => p >= 5))} className="m3-btn m3-btn-sm m3-text h-7 px-2">
                      오후 5~{data.settings.periodCount}
                    </button>
                    <button onClick={() => setPeriods([])} className="m3-btn m3-btn-sm m3-text h-7 px-2">
                      지우기
                    </button>
                    {dayTeaching && <span className="text-subtle">· 점은 그날 수업 있는 교시</span>}
                  </div>
                </div>
              )}
            </div>
            <button onClick={make} className="m3-btn m3-filled">
              슬롯 미리보기
            </button>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">결강 슬롯 미리보기</h2>
              <p className="mt-1 text-xs text-subtle">수업을 제외하려면 체크를 해제하세요.</p>
            </div>
            {preview.length > 0 && (
              <Badge>
                {selected.length}/{preview.length}건 선택
              </Badge>
            )}
          </div>
          {preview.length === 0 ? (
            <div className="grid min-h-64 place-items-center text-center text-sm text-subtle">
              <div>
                <CalendarDays className="mx-auto mb-3" size={20} strokeWidth={1.5} />
                <p>결강 정보를 입력하고 미리보기를 생성하세요.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 flex flex-col gap-2">
                {preview.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded-none border border-line px-4 py-3 hover:bg-wash"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={(e) =>
                        setSelected((x) => (e.target.checked ? [...x, s.id] : x.filter((id) => id !== s.id)))
                      }
                    />
                    <span className="w-14 text-sm font-semibold">
                      {formatDate(s.date)} {s.dayOfWeek}
                    </span>
                    <Badge>{s.period}교시</Badge>
                    <span className="text-sm">
                      {s.grade}학년 {s.room} · {s.subject}
                    </span>
                  </label>
                ))}
              </div>
              <button
                onClick={execute}
                className="m3-btn m3-filled mt-5 w-full"
              >
                배정 실행
              </button>
            </>
          )}
        </Card>
      </div>
      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">등록된 결강</h2>
            <p className="mt-1 text-xs text-subtle">
              결강을 삭제하면 그 결강의 보강 배정도 함께 삭제됩니다.
            </p>
          </div>
          <Badge>{registered.length}건</Badge>
        </div>
        {registered.length === 0 ? (
          <p className="mt-5 text-sm text-subtle">등록된 결강이 없습니다.</p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-line">
            {registered.map((a) => {
              const { slots, confirmed } = absenceSummary(data, a.id)
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-20 text-sm font-semibold">
                    {data.teachers.find((t) => t.id === a.teacherId)?.name ?? '알 수 없음'}
                  </span>
                  <span className="text-sm text-ink-2">
                    {formatDate(a.startDate)}
                    {a.endDate !== a.startDate && ` ~ ${formatDate(a.endDate)}`}
                    {a.mode === '교시선택' && a.periods?.length ? ` · ${periodLabel(a.periods)}` : ''}
                  </span>
                  <span className="text-sm text-subtle">{a.reason}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <Badge>보강 {slots}건</Badge>
                    {confirmed > 0 && <Badge tone="green">확정 {confirmed}</Badge>}
                    <button
                      onClick={() => remove(a)}
                      className="m3-btn m3-btn-sm m3-danger"
                    >
                      삭제
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}
