import type { AppData, Assignment, Slot } from './types'

/** 시트 연결 코드 버전. 코드가 바뀌면 올리고, 예전 코드로는 보내지 않는다 */
export const SCRIPT_VERSION = 2

/**
 * 시트에 쓸 한 줄: 결강 교사 | 보강 날짜(YYYY-MM-DD, 시트에서 날짜로 바꿈) | 보강 교시 | 보강 교사 | 대상 학급 | 과목 (B~G열)
 * 대상 학급은 '참고' 탭 목록 형식(2-10)에 맞을 때만 넣고, 아니면 비워 둔다
 */
export function sheetRow(data: AppData, a: Assignment, s: Slot): string[] {
  const name = (id?: string | null) => data.teachers.find((t) => t.id === id)?.name ?? ''
  const num = s.room.match(/^([1-3])(\d{2})/)
  const n = num ? Number(num[2]) : 0
  const cls = num && n >= 1 && n <= 10 ? `${num[1]}-${n}` : ''
  return [name(s.absentTeacherId), s.date, `${s.period}교시`, name(a.substituteTeacherId), cls, s.subject]
}

/** 구글 시트 주소에서 파일 ID 꺼내기 */
export function sheetIdFrom(url: string) {
  return url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/)?.[1] ?? null
}

/** 아직 시트로 보내지 않은 확정 배정 (날짜·교시 순) */
export function unsent(data: AppData) {
  return data.assignments
    .filter((a) => a.status === '확정' && a.substituteTeacherId && !a.sheetSent)
    .map((a) => ({ a, s: data.slots.find((x) => x.id === a.slotId) }))
    .filter((x): x is { a: Assignment; s: Slot } => !!x.s)
    .sort((x, y) => x.s.date.localeCompare(y.s.date) || x.s.period - y.s.period)
}

type Reply = { ok: boolean; added?: number; skipped?: number; error?: string; sheet?: string; file?: string; id?: string; v?: number }

/** Apps Script 웹 앱으로 보내기. 미리 확인 요청(preflight)이 생기지 않도록 text/plain으로 보낸다 */
export async function postRows(url: string, key: string, rows: string[][], expectId?: string): Promise<Reply> {
  // 예전 코드(날짜를 글자로 쓰던 버전)로는 보내지 않는다
  const ping = await pingSheet(url, key)
  if (!ping.ok) return ping
  if (ping.v !== SCRIPT_VERSION)
    return { ok: false, error: '시트에 붙여넣은 연결 코드가 예전 버전이에요. 설정 > 구글 시트 연결에서 코드를 다시 복사해 붙여넣고 새 버전으로 배포해 주세요.' }
  if (!expectId || ping.id !== expectId)
    return { ok: false, error: `연결 코드가 다른 파일(“${ping.file}”)을 가리키고 있어요. 설정 > 구글 시트 연결을 확인해 주세요.` }
  const res = await fetch(url, { method: 'POST', body: JSON.stringify({ key, rows }) })
  if (!res.ok) return { ok: false, error: `응답 오류 ${res.status}` }
  try {
    return (await res.json()) as Reply
  } catch {
    return { ok: false, error: '시트 연결 주소가 올바른지 확인하세요 (웹 앱 주소는 /exec 로 끝납니다).' }
  }
}

export async function pingSheet(url: string, key: string): Promise<Reply> {
  try {
    const res = await fetch(`${url}?key=${encodeURIComponent(key)}`)
    return (await res.json()) as Reply
  } catch {
    return { ok: false, error: '연결하지 못했습니다. 주소와 배포 설정(액세스: 모든 사용자)을 확인하세요.' }
  }
}

export function newKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** 구글 시트 > 확장 프로그램 > Apps Script 에 붙여넣을 코드 (파일 ID로 정확한 시트를 지정) */
export function appsScript(key: string, sheetId: string, tab = '보강') {
  return `// 결보강 매니저 → 구글 시트 연결 v${SCRIPT_VERSION}
// 붙여넣고 저장한 뒤 '배포 > 새 배포 > 웹 앱' (이미 배포했다면 '배포 관리 > 연필 > 버전: 새 버전 > 배포')
const KEY = '${key}'
const SHEET_ID = '${sheetId}' // 이 파일에만 기록합니다
const TAB = '${tab}'
const V = ${SCRIPT_VERSION}

function target() {
  const file = SpreadsheetApp.openById(SHEET_ID)
  return { file: file, sh: file.getSheetByName(TAB) }
}

function doGet(e) {
  if (e.parameter.key !== KEY) return out({ ok: false, error: '키가 맞지 않습니다' })
  const t = target()
  if (!t.sh) return out({ ok: false, error: '"' + TAB + '" 탭을 찾을 수 없습니다' })
  return out({ ok: true, v: V, id: t.file.getId(), file: t.file.getName(), sheet: TAB })
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  if (body.key !== KEY) return out({ ok: false, error: '키가 맞지 않습니다' })
  const t = target()
  const sh = t.sh
  if (!sh) return out({ ok: false, error: '"' + TAB + '" 탭을 찾을 수 없습니다' })
  const tz = t.file.getSpreadsheetTimeZone()
  const lock = LockService.getScriptLock()
  lock.waitLock(15000)
  try {
    // B열(결강 교사)에 글자가 있는 마지막 줄 (드롭다운만 있는 빈 줄은 건너뜀)
    const colB = sh.getRange(1, 2, sh.getMaxRows(), 1).getDisplayValues()
    let last = 1
    for (let i = colB.length - 1; i >= 0; i--) if (String(colB[i][0]).trim()) { last = i + 1; break }
    // 이미 적힌 줄(결강 교사·날짜·교시·보강 교사가 같은 줄)은 다시 쓰지 않음. 날짜는 화면에 보이는 'MM. dd'로 비교
    const have = last > 1 ? sh.getRange(2, 2, last - 1, 4).getDisplayValues().map(function (r) { return r.join('|') }) : []
    const rows = []
    ;(body.rows || []).forEach(function (r) {
      const p = r[1].split('-')
      const date = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
      const shown = Utilities.formatDate(date, tz, 'MM. dd')
      const k = [r[0], shown, r[2], r[3]].join('|')
      if (have.indexOf(k) < 0) { rows.push([r[0], date, r[2], r[3], r[4], r[5]]); have.push(k) }
    })
    if (rows.length) {
      if (last + rows.length > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), last + rows.length - sh.getMaxRows())
      sh.getRange(last + 1, 2, rows.length, 6).setValues(rows)
      sh.getRange(last + 1, 3, rows.length, 1).setNumberFormat('mm". "dd') // C열은 기존처럼 날짜
      // A열 순번이 숫자로 이어지고 있으면 이어서 매기기
      const prev = Number(sh.getRange(last, 1).getValue())
      if (last > 1 && prev > 0) sh.getRange(last + 1, 1, rows.length, 1).setValues(rows.map(function (_, i) { return [prev + i + 1] }))
    }
    return out({ ok: true, v: V, added: rows.length, skipped: (body.rows || []).length - rows.length })
  } finally {
    lock.releaseLock()
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
`
}
