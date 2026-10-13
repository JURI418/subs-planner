'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppData, SetData } from '@/lib/types'
import { postRows, sheetRow, unsent } from '@/lib/sheet'

export type SyncStatus = { ok: boolean; text: string; at: number } | null

/** 확정된 배정을 구글 시트로 보낸다. 자동 전송이 켜져 있으면 확정 직후 잠깐 기다렸다가 모아서 보낸다 */
export function useSheetSync(data: AppData, setData: SetData, ready: boolean) {
  const [status, setStatus] = useState<SyncStatus>(null)
  const busy = useRef(false)
  const pending = unsent(data)
  const { sheetUrl, sheetKey, sheetAuto } = data.settings

  const send = useCallback(async () => {
    if (busy.current || !sheetUrl || !sheetKey) return
    const list = unsent(data)
    if (!list.length) return
    busy.current = true
    try {
      const r = await postRows(sheetUrl, sheetKey, list.map(({ a, s }) => sheetRow(data, a, s)))
      if (!r.ok) {
        setStatus({ ok: false, text: `구글 시트로 보내지 못했어요: ${r.error ?? '알 수 없는 오류'}`, at: Date.now() })
        return
      }
      const ids = new Set(list.map(({ a }) => a.slotId))
      const now = new Date().toISOString()
      setData((d) => ({
        ...d,
        assignments: d.assignments.map((a) => (ids.has(a.slotId) && a.status === '확정' ? { ...a, sheetSent: now } : a)),
      }))
      setStatus({
        ok: true,
        text: `구글 시트에 ${r.added ?? list.length}건 올렸어요${r.skipped ? ` (이미 있던 ${r.skipped}건은 건너뜀)` : ''}`,
        at: Date.now(),
      })
    } catch {
      setStatus({ ok: false, text: '구글 시트에 연결하지 못했어요. 인터넷 연결이나 시트 연결 주소를 확인하세요.', at: Date.now() })
    } finally {
      busy.current = false
    }
  }, [data, setData, sheetUrl, sheetKey])

  // 자동 전송: 확정이 생기면 1.5초 뒤 한 번에 보냄 (연달아 확정해도 한 번만)
  const key = pending.map(({ a }) => a.slotId).join(',')
  useEffect(() => {
    if (!ready || !sheetAuto || !sheetUrl || !key) return
    const t = setTimeout(send, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, sheetAuto, sheetUrl])

  // 배정 확인 화면의 '시트로 보내기' 버튼
  useEffect(() => {
    const h = () => send()
    window.addEventListener('sheet-sync', h)
    return () => window.removeEventListener('sheet-sync', h)
  }, [send])

  // 알림은 6초 뒤 사라짐
  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(null), 6000)
    return () => clearTimeout(t)
  }, [status])

  return { status, pendingCount: pending.length, connected: !!(sheetUrl && sheetKey) }
}
