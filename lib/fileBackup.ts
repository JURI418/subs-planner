import type { AppData } from './types'

/**
 * 같은 백업 파일 하나에 덮어쓰기 (크롬·엣지의 파일 시스템 접근 기능).
 * 처음 한 번 저장 위치를 고르면 그 파일 '연결 정보'를 브라우저(IndexedDB)에 기억해 두고, 다음부터 그 파일에 덮어쓴다.
 * 파일 내용은 브라우저 밖 어디로도 보내지 않는다.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handle = any

const DB = 'subs-planner-files'
const STORE = 'handles'
const KEY = 'backup'

export const canOverwrite = () => typeof window !== 'undefined' && 'showSaveFilePicker' in window

function db(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => ok(req.result)
    req.onerror = () => fail(req.error)
  })
}

async function put(h: Handle | null) {
  const d = await db()
  await new Promise((ok, fail) => {
    const tx = d.transaction(STORE, 'readwrite')
    if (h) tx.objectStore(STORE).put(h, KEY)
    else tx.objectStore(STORE).delete(KEY)
    tx.oncomplete = ok
    tx.onerror = () => fail(tx.error)
  })
}

export async function getHandle(): Promise<Handle | null> {
  try {
    const d = await db()
    return await new Promise((ok) => {
      const req = d.transaction(STORE).objectStore(STORE).get(KEY)
      req.onsuccess = () => ok(req.result ?? null)
      req.onerror = () => ok(null)
    })
  } catch {
    return null
  }
}

async function write(h: Handle, data: AppData) {
  const w = await h.createWritable()
  await w.write(JSON.stringify(data, null, 2))
  await w.close()
}

/** 저장 위치 고르기 (버튼 클릭에서 호출). 고른 파일에 바로 한 번 저장 */
export async function chooseBackupFile(data: AppData): Promise<string | null> {
  const h = await (window as any).showSaveFilePicker({
    suggestedName: 'subs-planner-backup.json',
    types: [{ description: '결보강 백업', accept: { 'application/json': ['.json'] } }],
  })
  await write(h, data)
  await put(h)
  return h.name as string
}

export async function forgetBackupFile() {
  await put(null)
}

/**
 * 기억해 둔 파일에 덮어쓰기.
 * - 'saved': 저장함
 * - 'need-click': 이번 방문에서 아직 허락을 안 받음 (버튼을 눌러 허락하면 저장)
 * - 'none': 기억해 둔 파일이 없음
 */
export async function overwriteBackup(data: AppData, askPermission = false): Promise<'saved' | 'need-click' | 'none'> {
  const h = await getHandle()
  if (!h) return 'none'
  let perm = await h.queryPermission({ mode: 'readwrite' })
  if (perm !== 'granted' && askPermission) perm = await h.requestPermission({ mode: 'readwrite' })
  if (perm !== 'granted') return 'need-click'
  try {
    await write(h, data)
    return 'saved'
  } catch {
    return 'none'
  }
}
