import { formatDate, type AppData, type Assignment, type Slot } from './types'

/** 시트에 쓸 한 줄: 결강 교사 | 보강 날짜 | 보강 교시 | 보강 교사 | 대상 학급 | 과목 (B~G열) */
export function sheetRow(data: AppData, a: Assignment, s: Slot): string[] {
  const name = (id?: string | null) => data.teachers.find((t) => t.id === id)?.name ?? ''
  const num = s.room.match(/^(\d)(\d{2})/)
  const cls = num ? `${num[1]}-${Number(num[2])}` : s.room
  return [name(s.absentTeacherId), formatDate(s.date), `${s.period}교시`, name(a.substituteTeacherId), cls, s.subject]
}

/** 아직 시트로 보내지 않은 확정 배정 (날짜·교시 순) */
export function unsent(data: AppData) {
  return data.assignments
    .filter((a) => a.status === '확정' && a.substituteTeacherId && !a.sheetSent)
    .map((a) => ({ a, s: data.slots.find((x) => x.id === a.slotId) }))
    .filter((x): x is { a: Assignment; s: Slot } => !!x.s)
    .sort((x, y) => x.s.date.localeCompare(y.s.date) || x.s.period - y.s.period)
}

type Reply = { ok: boolean; added?: number; skipped?: number; error?: string; sheet?: string }

/** Apps Script 웹 앱으로 보내기. 미리 확인 요청(preflight)이 생기지 않도록 text/plain으로 보낸다 */
export async function postRows(url: string, key: string, rows: string[][]): Promise<Reply> {
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

/** 구글 시트 > 확장 프로그램 > Apps Script 에 붙여넣을 코드 */
export function appsScript(key: string, tab = '보강') {
  return `// 결보강 매니저 → 구글 시트 연결 (붙여넣고 저장한 뒤 '배포 > 새 배포 > 웹 앱')
const KEY = '${key}'
const TAB = '${tab}'

function doGet(e) {
  if (e.parameter.key !== KEY) return out({ ok: false, error: '키가 맞지 않습니다' })
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB)
  return out(sh ? { ok: true, sheet: TAB } : { ok: false, error: '"' + TAB + '" 탭을 찾을 수 없습니다' })
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  if (body.key !== KEY) return out({ ok: false, error: '키가 맞지 않습니다' })
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB)
  if (!sh) return out({ ok: false, error: '"' + TAB + '" 탭을 찾을 수 없습니다' })
  const lock = LockService.getScriptLock()
  lock.waitLock(15000)
  try {
    // B열(결강 교사)에 글자가 있는 마지막 줄 찾기 (드롭다운만 있는 빈 줄은 건너뜀)
    const colB = sh.getRange(1, 2, sh.getMaxRows(), 1).getDisplayValues()
    let last = 1
    for (let i = colB.length - 1; i >= 0; i--) if (String(colB[i][0]).trim()) { last = i + 1; break }
    // 이미 적힌 줄(결강 교사·날짜·교시·보강 교사가 같은 줄)은 다시 쓰지 않음
    const have = last > 1 ? sh.getRange(2, 2, last - 1, 4).getDisplayValues().map((r) => r.join('|')) : []
    const rows = (body.rows || []).filter((r) => have.indexOf(r.slice(0, 4).join('|')) < 0)
    if (rows.length) {
      const range = sh.getRange(last + 1, 2, rows.length, rows[0].length)
      range.setNumberFormat('@')
      range.setValues(rows)
      // A열 순번이 숫자로 이어지고 있으면 이어서 매기기
      const prev = Number(sh.getRange(last, 1).getValue())
      if (last > 1 && prev > 0) sh.getRange(last + 1, 1, rows.length, 1).setValues(rows.map((_, i) => [prev + i + 1]))
    }
    return out({ ok: true, added: rows.length, skipped: (body.rows || []).length - rows.length })
  } finally {
    lock.releaseLock()
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
`
}
