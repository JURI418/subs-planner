'use client'
import { useEffect, useState } from 'react'
import { emptyData, normalizeData, seedData, type AppData } from '@/lib/types'

export const STORAGE_KEY = 'school-cover-data'

export function useAppData() {
  const [data, setData] = useState<AppData>(emptyData())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    setData(raw ? normalizeData(JSON.parse(raw)) : seedData())
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data, ready])

  return { data, setData, ready }
}
