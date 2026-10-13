'use client'
import { useEffect, useRef, useState } from 'react'
import type { AppData, Assignment, SetData, Slot } from '@/lib/types'
import { postRows, sheetRow } from '@/lib/sheet'

export type SyncStatus = { ok: boolean; text: string } | null

/** 배정 확인 화면에서 체크한 배정을 구글 시트로 보낸다 ('sheet-send' 이벤트, detail = slotId 목록) */
export function useSheetSync(data: AppData, setData: SetData) {
  const [status, setStatus] = useState<SyncStatus>(null)
  const busy = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    const h = async (e: Event) => {
      const d = dataRef.current
      const { sheetUrl, sheetKey } = d.settings
      if (busy.current || !sheetUrl || !sheetKey) return
      const ids = new Set((e as CustomEvent<string[]>).detail)
      const list = d.assignments
        .filter((a) => ids.has(a.slotId) && a.substituteTeacherId)
        .map((a) => ({ a, s: d.slots.find((x) => x.id === a.slotId) }))
        .filter((x): x is { a: Assignment; s: Slot } => !!x.s)
        .sort((x, y) => x.s.date.localeCompare(y.s.date) || x.s.period - y.s.period)
      if (!list.length) return
      busy.current = true
      setStatus({ ok: true, text: `구글 시트에 ${list.length}건 올리는 중…` })
      try {
        const r = await postRows(sheetUrl, sheetKey, list.map(({ a, s }) => sheetRow(d, a, s)))
        if (!r.ok) {
          setStatus({ ok: false, text: `구글 시트로 보내지 못했어요: ${r.error ?? '알 수 없는 오류'}` })
          return
        }
        const sent = new Set(list.map(({ a }) => a.slotId))
        const now = new Date().toISOString()
        setData((x) => ({ ...x, assignments: x.assignments.map((a) => (sent.has(a.slotId) ? { ...a, sheetSent: now } : a)) }))
        setStatus({
          ok: true,
          text: `구글 시트에 ${r.added ?? list.length}건 올렸어요${r.skipped ? ` · 이미 있던 ${r.skipped}건은 건너뜀` : ''}`,
        })
      } catch {
        setStatus({ ok: false, text: '구글 시트에 연결하지 못했어요. 인터넷 연결이나 시트 연결 주소를 확인하세요.' })
      } finally {
        busy.current = false
      }
    }
    window.addEventListener('sheet-send', h)
    return () => window.removeEventListener('sheet-send', h)
  }, [setData])

  // 알림은 6초 뒤 사라짐 (올리는 중 표시는 결과가 나올 때까지 유지)
  useEffect(() => {
    if (!status || status.text.endsWith('…')) return
    const t = setTimeout(() => setStatus(null), 6000)
    return () => clearTimeout(t)
  }, [status])

  return { status }
}
