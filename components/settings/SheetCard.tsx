'use client'
import { useState } from 'react'
import { AlertTriangle, Check, Copy, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import type { AppData, SetData } from '@/lib/types'
import { SCRIPT_VERSION, appsScript, newKey, pingSheet, sheetIdFrom } from '@/lib/sheet'

type Health = { ok: boolean; text: string; old?: boolean } | null

/** 구글 시트 연결: 지정한 파일(ID)의 '보강' 탭에만 줄을 추가하는 Apps Script 웹 앱 */
export function SheetCard({ data, setData }: { data: AppData; setData: SetData }) {
  const s = data.settings
  const [key] = useState(() => s.sheetKey ?? newKey())
  const [sheetInput, setSheetInput] = useState(s.sheetId ? `https://docs.google.com/spreadsheets/d/${s.sheetId}/edit` : '')
  const sheetId = sheetIdFrom(sheetInput)
  const [url, setUrl] = useState(s.sheetUrl ?? '')
  const [copied, setCopied] = useState(false)
  const [health, setHealth] = useState<Health>(null)
  const [busy, setBusy] = useState(false)
  const setSettings = (patch: Partial<AppData['settings']>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  // 예전(v1) 연결: 파일 ID 없이 연결된 상태 → 코드 업데이트 필요
  const needsUpdate = !!s.sheetUrl && !s.sheetId

  const check = async (u: string) => {
    setBusy(true)
    const r = await pingSheet(u, key)
    setBusy(false)
    if (!r.ok) return { ok: false, text: r.error ?? '연결하지 못했습니다.' }
    if (r.v !== SCRIPT_VERSION)
      return { ok: false, old: true, text: '시트에 붙여넣은 코드가 예전 버전이에요. 아래 ①~③을 다시 해 주세요 (③은 ‘배포 관리 → 연필 → 새 버전’).' }
    if (sheetId && r.id !== sheetId)
      return { ok: false, text: `코드가 다른 파일(“${r.file}”)을 가리키고 있어요. ① 주소를 확인하고 코드를 다시 복사해 붙여넣으세요.` }
    return { ok: true, text: `연결 정상 · 파일 “${r.file}”의 “${r.sheet}” 탭에 기록합니다.`, file: r.file, id: r.id } as Health & {
      file?: string
      id?: string
    }
  }

  const connect = async () => {
    const u = url.trim()
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) {
      setHealth({ ok: false, text: '웹 앱 주소는 https://script.google.com/… 로 시작하고 /exec 로 끝납니다.' })
      return
    }
    const r = (await check(u)) as Health & { file?: string; id?: string }
    setHealth(r)
    if (r?.ok) setSettings({ sheetUrl: u, sheetKey: key, sheetId: r.id, sheetFile: r.file })
  }

  const steps = (
    <ol className="mt-4 flex list-none flex-col gap-4 text-[14px] leading-6">
      <li>
        <b>① 기록할 구글 시트 주소</b> — 보강 기록 시트를 열고 주소창의 주소를 그대로 붙여넣으세요. 코드가 <b>이 파일에만</b> 기록하도록 고정돼요.
        <input
          id="sheet-file"
          value={sheetInput}
          onChange={(e) => {
            setSheetInput(e.target.value)
            setCopied(false)
          }}
          placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          className="m3-field m3-field-sm mt-2 w-full"
        />
        {sheetInput && !sheetId && <span className="mt-1 block text-[12px] text-bad">구글 시트 주소가 아니에요 (…/spreadsheets/d/… 형식).</span>}
      </li>
      <li>
        <b>② 코드 복사 → 시트에 붙여넣기</b> — 시트에서 <b>확장 프로그램 → Apps Script</b>를 열고, 원래 내용을 모두 지운 뒤 붙여넣고 저장(💾)하세요.
        <div className="mt-2">
          <button
            disabled={!sheetId}
            onClick={() => {
              navigator.clipboard?.writeText(appsScript(key, sheetId!))
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
        <b>③ 배포</b> — 처음이면 <b>배포 → 새 배포</b> → 웹 앱 / 실행: <b>나</b> / 액세스: <b>모든 사용자</b> → 배포 → 권한 허용.
        <br />
        이미 배포했다면 <b>배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포</b>. 이렇게 하면 웹 앱 주소가 그대로 유지돼요.
      </li>
      <li>
        <b>④ 웹 앱 주소 연결</b> — 웹 앱 URL(…/exec)을 붙여넣고 연결하세요. 연결되면 어느 파일·탭에 기록하는지 이름으로 보여드려요.
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="sheet-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className="m3-field m3-field-sm min-w-0 flex-1"
          />
          <button onClick={connect} disabled={busy || !url.trim()} className="m3-btn m3-btn-sm m3-filled">
            {busy ? '확인 중…' : s.sheetUrl ? '다시 연결' : '연결'}
          </button>
        </div>
      </li>
    </ol>
  )

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-bold">구글 시트 연결</h2>
        {s.sheetUrl && !needsUpdate ? <Badge tone="green">연결됨</Badge> : needsUpdate ? <Badge tone="yellow">업데이트 필요</Badge> : <Badge>연결 안 됨</Badge>}
      </div>
      <p className="mt-2 text-[14px] leading-6 text-ink-2">
        <b>배정 확인</b>에서 체크하고 <b>‘구글 시트에 올리기’</b>를 누르면, 지정한 시트의 <b>‘보강’ 탭</b> 맨 아래에 한 줄씩 추가됩니다. (B 결강 교사 · C 보강 날짜(날짜 형식) · D 교시 · E 보강 교사 · F 대상 학급 · G 과목)
      </p>

      {s.sheetUrl && !needsUpdate && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border border-line bg-wash px-4 py-3 text-[14px]">
          <ShieldCheck size={18} className="text-ok" />
          <span>
            기록 위치: <b>“{s.sheetFile ?? '연결된 파일'}”</b> 파일의 <b>“보강”</b> 탭
          </span>
          <span className="ml-auto flex gap-1">
            <button onClick={async () => setHealth(await check(s.sheetUrl!))} disabled={busy} className="m3-btn m3-btn-sm m3-outlined">
              {busy ? '확인 중…' : '연결 확인'}
            </button>
            <button
              onClick={() => {
                if (confirm('구글 시트 연결을 끊습니다. 시트에 이미 올라간 내용은 그대로 남습니다.'))
                  setSettings({ sheetUrl: undefined, sheetId: undefined, sheetFile: undefined })
              }}
              className="m3-btn m3-btn-sm m3-text"
            >
              연결 끊기
            </button>
          </span>
        </div>
      )}

      {needsUpdate && (
        <p className="mt-4 flex gap-2 border border-warn/40 bg-warn-soft px-4 py-3 text-[14px] leading-6 text-warn">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>
            연결 코드가 새 버전으로 바뀌었어요. 이제 코드가 <b>지정한 파일에만</b> 기록하고, 날짜를 시트의 다른 줄처럼 <b>날짜 형식</b>으로 넣어요. 아래 ①~④를 한 번만 다시 해 주세요. (③은 ‘배포 관리 → 새 버전’이라 웹 앱 주소는 그대로예요)
          </span>
        </p>
      )}

      {(!s.sheetUrl || needsUpdate || health?.old || (health && !health.ok)) && steps}
      {s.sheetUrl && !needsUpdate && !(health && !health.ok) && (
        <details className="mt-3 text-[13px] text-subtle">
          <summary className="cursor-pointer">연결 코드 다시 설정하기</summary>
          {steps}
        </details>
      )}
      {health && <p className={`mt-3 text-sm font-bold ${health.ok ? 'text-ok' : 'text-bad'}`}>{health.text}</p>}
      <p className="mt-4 text-[12px] leading-5 text-subtle">
        웹 앱 주소와 비밀 키를 함께 알아야만 줄을 추가할 수 있고, 이 연결로는 시트 내용을 읽거나 지울 수 없어요. 시트 자체의 공유 설정은 바뀌지 않습니다.
      </p>
    </Card>
  )
}
