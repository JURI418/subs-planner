import type { AppData } from './types'

/** 백업 파일(JSON) 내려받기. 파일 이름에 날짜를 붙인다 */
export function downloadBackup(data: AppData) {
  const n = new Date()
  const stamp = `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `subs-planner-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** 마지막 백업 후 며칠 지났는지 (한 번도 안 했으면 null) */
export function daysSinceBackup(data: AppData) {
  if (!data.settings.lastBackupAt) return null
  return Math.floor((Date.now() - new Date(data.settings.lastBackupAt).getTime()) / 86400000)
}
