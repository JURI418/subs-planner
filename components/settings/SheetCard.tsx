'use client'
import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import type { AppData, SetData } from '@/lib/types'
import { appsScript, newKey, pingSheet } from '@/lib/sheet'

/** 구글 시트 연결: Apps Script 웹 앱을 통해 확정된 보강을 '보강' 탭 아래에 한 줄씩 추가 */
export function SheetCard({ data, setData }: { data: AppData; setData: SetData }) {
  const s = data.settings
  const [key] = useState(() => s.sheetKey ?? newKey())
  const [url, setUrl] = useState(s.sheetUrl ?? '')
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const setSettings = (patch: Partial<AppData['settings']>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))

  const connect = async () => {
    const u = url.trim()
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) {
      setMsg({ ok: false, text: '웹 앱 주소는 https://script.google.com/… 로 시작하고 /exec 로 끝납니다.' })
      return
    }
    setTesting(true)
    const r = await pingSheet(u, key)
    setTesting(false)
    if (!r.ok) {
      setMsg({ ok: false, text: r.error ?? '연결하지 못했습니다.' })
      return
    }
    setData((d) => ({
      ...d,
      settings: { ...d.settings, sheetUrl: u, sheetKey: key },
    }))
    setMsg({ ok: true, text: `연결됐어요 · "${r.sheet}" 탭에 올라갑니다.` })
  }

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold">구글 시트 연결</h2>
        {s.sheetUrl ? <Badge tone="green">연결됨</Badge> : <Badge>연결 안 됨</Badge>}
      </div>
      <p className="mt-2 text-[14px] leading-6 text-ink-2">
        <b>배정 확인</b>에서 보낼 배정을 체크하고 <b>‘구글 시트에 올리기’</b>를 누르면, 내 구글 시트의 <b>‘보강’ 탭</b> 맨 아래에 한 줄씩 추가됩니다. (결강 교사 · 보강 날짜 · 보강 교시 · 보강 교사 · 대상 학급 · 과목 → B~G열)
      </p>

      {s.sheetUrl ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="break-all text-[12px] text-subtle">연결 주소: {s.sheetUrl}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                const r = await pingSheet(s.sheetUrl!, s.sheetKey!)
                setMsg(r.ok ? { ok: true, text: `연결 정상 · "${r.sheet}" 탭` } : { ok: false, text: r.error ?? '연결 실패' })
              }}
              className="m3-btn m3-btn-sm m3-outlined"
            >
              연결 확인
            </button>
            <button
              onClick={() => {
                if (confirm('구글 시트 연결을 끊습니다. 시트에 이미 올라간 내용은 그대로 남습니다.'))
                  setSettings({ sheetUrl: undefined })
              }}
              className="m3-btn m3-btn-sm m3-text"
            >
              연결 끊기
            </button>
          </div>
        </div>
      ) : (
        <ol className="mt-4 flex list-none flex-col gap-4 text-[14px] leading-6">
          <li>
            <b>① 코드 복사</b> — 이 컴퓨터 전용 비밀 키가 들어 있는 코드예요.
            <div className="mt-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(appsScript(key))
                  setCopied(true)
                  setSettings({ sheetKey: key })
                }}
                className={`m3-btn m3-btn-sm ${copied ? 'm3-tonal' : 'm3-filled'}`}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? '복사됨' : 'Apps Script 코드 복사'}
              </button>
            </div>
          </li>
          <li>
            <b>② 시트에 붙여넣기</b> — 구글 시트에서 <b>확장 프로그램 → Apps Script</b>를 열고, 원래 있던 내용을 지운 뒤 붙여넣고
            저장(💾)하세요.
          </li>
          <li>
            <b>③ 배포</b> — 오른쪽 위 <b>배포 → 새 배포</b> → 톱니바퀴에서 <b>웹 앱</b> 선택 → 다음 사용자 인증 정보로 실행: <b>나</b>,
            액세스 권한: <b>모든 사용자</b> → 배포 → 권한 허용(내 구글 계정 선택 → 고급 → 이동 → 허용).
          </li>
          <li>
            <b>④ 주소 붙여넣기</b> — 배포 후 나오는 <b>웹 앱 URL</b>(…/exec)을 아래에 붙여넣고 연결하세요.
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id="sheet-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/…/exec"
                className="m3-field m3-field-sm min-w-0 flex-1"
              />
              <button onClick={connect} disabled={testing} className="m3-btn m3-btn-sm m3-filled">
                {testing ? '확인 중…' : '연결'}
              </button>
            </div>
          </li>
        </ol>
      )}
      {msg && <p className={`mt-3 text-sm font-bold ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.text}</p>}
      <p className="mt-4 flex items-start gap-1.5 text-[12px] leading-5 text-subtle">
        <ExternalLink size={13} className="mt-0.5 shrink-0" />
        웹 앱 주소와 비밀 키를 아는 경우에만 시트에 줄을 추가할 수 있어요. 시트 자체의 공유 설정은 바뀌지 않습니다.
      </p>
    </Card>
  )
}
