'use client'
import { useEffect, useState } from 'react'
import { emptyData, normalizeData, seedData, type AppData } from '@/lib/types'
import { cleanExcluded } from '@/lib/dataOps'

export const STORAGE_KEY = 'school-cover-data'

export function useAppData() {
  const [data, setData] = useState<AppData>(emptyData())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    // 예전에 후보에서 뺀 교사가 배정에 남아 있으면 열 때 정리
    setData(raw ? cleanExcluded(normalizeData(JSON.parse(raw))) : seedData())
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data, ready])

  return { data, setData, ready }
}
