'use client'
import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { isVirtual, todayISO, type AppData, type SetData } from '@/lib/types'
import {
  DEFAULT_SMS_FOOTER,
  DEFAULT_SMS_HEADER,
  buildMessage,
  itemLine,
  itemsForTeacher,
  monthOffItems,
} from '@/lib/messages'

const KIND_TONE: Record<string, string> = { 휴업일: 'red', 방학: 'blue', 공휴일: 'slate', 행사: 'yellow' }

/** 시간강사 선생님께 보낼 다음 달 '출근하지 않아도 되는 날' 안내 문자 */
export function MessagesPage({ data, setData }: { data: AppData; setData: SetData }) {
  const today = todayISO()
  // 기본은 다음 달
  const [ym, setYm] = useState(() => {
    const [y, m] = today.split('-').map(Number)
    return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
  })
  const ymKey = `${ym.y}-${String(ym.m).padStart(2, '0')}`
  const items = useMemo(() => monthOffItems(data, ymKey), [data, ymKey])
  // 휴업일·방학은 기본 선택, 공휴일·행사는 골라서 넣기
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const isOnIn = (key: string, k: string, kind: string) => picked[`${key}|${k}`] ?? (kind === '휴업일' || kind === '방학')
  const isOn = (k: string, kind: string) => isOnIn(ymKey, k, kind)
  // 문자에 넣을 달 (여러 달을 모아 한 번에 보내기). 기본은 처음 보이는 달 하나
  const [months, setMonths] = useState<string[]>(() => [ymKey])
  const included = months.includes(ymKey)
  const toggleMonth = (key: string) =>
    setMonths((ms) => (ms.includes(key) ? ms.filter((x) => x !== key) : [...ms, key].sort()))
  const sortedMonths = [...months].sort()
  const chosen = sortedMonths.flatMap((key) => monthOffItems(data, key).filter((it) => isOnIn(key, it.key, it.kind)))
  const monthNums = sortedMonths.map((k) => Number(k.slice(5)))
  const [perTeacher, setPerTeacher] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const header = data.settings.smsHeader ?? DEFAULT_SMS_HEADER
  const footer = data.settings.smsFooter ?? DEFAULT_SMS_FOOTER
  const setSetting = (k: 'smsHeader' | 'smsFooter', v: string) =>
    setData((d) => ({ ...d, settings: { ...d.settings, [k]: v } }))

  const lecturers = data.teachers.filter((t) => t.employmentType === '시간강사' && !isVirtual(t))
  const common = buildMessage({ months: monthNums, items: chosen, header, footer })

  const copy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600)
  }
  const move = (n: number) =>
    setYm(({ y, m }) => {
      const t = m + n
      return t < 1 ? { y: y - 1, m: 12 } : t > 12 ? { y: y + 1, m: 1 } : { y, m: t }
    })

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="시간강사 안내 문자"
        desc="학사일정에서 다음 달 휴업일·방학·행사를 골라, 시간강사 선생님께 보낼 문자를 만듭니다. 매월 말에 복사해서 보내세요."
      />

      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">1. 안내할 날짜</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => move(-1)} aria-label="이전 달" className="grid size-9 place-items-center rounded-full hover:bg-ink/[.06]">
                  <ChevronLeft size={18} />
                </button>
                <span className="min-w-24 text-center text-[16px] font-bold tabular-nums">
                  {ym.y}년 {ym.m}월
                </span>
                <button onClick={() => move(1)} aria-label="다음 달" className="grid size-9 place-items-center rounded-full hover:bg-ink/[.06]">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            {/* 문자에 넣을 달: 여러 달을 모아 한 문자로 */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border border-line bg-wash px-3 py-2.5">
              <span className="text-[13px] font-bold">문자에 넣을 달</span>
              {sortedMonths.length === 0 && <span className="text-[13px] text-subtle">없음</span>}
              {sortedMonths.map((k) => (
                <span key={k} className={`flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-[13px] font-bold ${k === ymKey ? 'bg-ink text-paper' : 'border border-ink/30 bg-surface'}`}>
                  {Number(k.slice(5))}월
                  <button onClick={() => toggleMonth(k)} aria-label={`${Number(k.slice(5))}월 빼기`} className="grid size-5 place-items-center rounded-full opacity-70 hover:opacity-100">
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => toggleMonth(ymKey)}
                className={`m3-btn m3-btn-sm ml-auto h-8 ${included ? 'm3-text' : 'm3-filled'}`}
              >
                {included ? `${ym.m}월 빼기` : `+ ${ym.m}월도 넣기`}
              </button>
            </div>
            {!included && (
              <p className="mt-2 text-[12px] text-warn">지금 보는 {ym.m}월은 문자에 들어가지 않아요. ‘+ {ym.m}월도 넣기’를 누르면 함께 들어가요.</p>
            )}
            {items.length === 0 ? (
              <p className="mt-5 text-sm text-subtle">
                {data.events.length
                  ? `${ym.m}월 평일에는 휴업일·행사가 없습니다.`
                  : '학사일정이 없습니다. 왼쪽 메뉴의 ‘학사일정 올리기’에서 먼저 올려 주세요.'}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {items.map((it) => {
                  const on = isOn(it.key, it.kind)
                  return (
                    <li key={it.key}>
                      <label className="flex cursor-pointer items-center gap-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => setPicked((p) => ({ ...p, [`${ymKey}|${it.key}`]: e.target.checked }))}
                          className="size-4 accent-ink"
                        />
                        <span className={`flex-1 text-[14px] ${on ? 'text-ink' : 'text-subtle'}`}>{itemLine(it).slice(2).replace(' (수업 없음)', '')}</span>
                        <Badge tone={KIND_TONE[it.kind]}>{it.kind}</Badge>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-3 text-[12px] leading-5 text-subtle">
              휴업일·방학은 기본으로 선택돼요. 체육대회처럼 수업이 없는 행사는 직접 체크하세요. 행사에는 ‘(수업 없음)’이 붙어요.
              ‹ › 로 다른 달로 넘겨 ‘+ 이 달도 넣기’를 누르면 여러 달을 한 문자로 모을 수 있어요.
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-extrabold">2. 문자 앞뒤 문구</h2>
            <label className="mt-4 block text-sm font-semibold">
              머리말
              <input
                id="sms-header"
                value={header}
                onChange={(e) => setSetting('smsHeader', e.target.value)}
                placeholder="예: [○○고 교무부]"
                className="m3-field m3-field-sm mt-2 w-full"
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              맺음말
              <textarea
                value={footer}
                onChange={(e) => setSetting('smsFooter', e.target.value)}
                rows={2}
                className="m3-field mt-2 w-full resize-y text-[14px]"
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={perTeacher} onChange={(e) => setPerTeacher(e.target.checked)} className="size-4 accent-ink" />
              선생님별로 <b>수업 있는 요일의 날만</b> 넣기
            </label>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">3. 완성된 문자</h2>
              <Badge>시간강사 {lecturers.length}명</Badge>
            </div>

            <MessageBox
              title="공통 문자 (단체방·전체 발송용)"
              text={common}
              copied={copied === 'common'}
              onCopy={() => copy('common', common)}
            />

            {lecturers.length === 0 ? (
              <p className="mt-5 text-sm text-subtle">
                시간강사로 등록된 선생님이 없습니다. ‘교사 관리’에서 근무 구분을 시간강사로 바꾸면 선생님별 문자가 만들어집니다.
              </p>
            ) : (
              <div className="mt-2 flex flex-col">
                {lecturers.map((t) => {
                  const mine = perTeacher ? itemsForTeacher(chosen, data, t.id) : chosen
                  const text = buildMessage({ months: monthNums, items: mine, name: t.name, header, footer })
                  return (
                    <MessageBox
                      key={t.id}
                      title={`${t.name} 선생님`}
                      sub={`${t.subject} · ${mine.length}건`}
                      text={text}
                      copied={copied === t.id}
                      onCopy={() => copy(t.id, text)}
                    />
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

function MessageBox({
  title,
  sub,
  text,
  copied,
  onCopy,
}: {
  title: string
  sub?: string
  text: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-bold">{title}</span>
        {sub && <span className="text-[13px] text-subtle">{sub}</span>}
        <button onClick={onCopy} className={`m3-btn m3-btn-sm ml-auto ${copied ? 'm3-tonal' : 'm3-outlined'}`}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-md bg-wash p-3.5 font-sans text-[13.5px] leading-6 text-ink-2">{text}</pre>
    </div>
  )
}
