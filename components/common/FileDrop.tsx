'use client'
import { useRef, useState } from 'react'
import { FileUp, LoaderCircle } from 'lucide-react'

type Props = {
  id: string
  title: string
  hint: string
  accept?: string
  busy?: boolean
  onFile: (file: File) => void
}

/** 파일을 끌어다 놓거나 눌러서 고르는 영역 */
export function FileDrop({ id, title, hint, accept = 'application/pdf,.pdf', busy = false, onFile }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-describedby={`${id}-hint`}
      onClick={() => !busy && ref.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f && !busy) onFile(f)
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-6 py-8 text-center transition-colors ${over ? 'border-iris bg-iris-soft/60' : 'border-line-strong/40 bg-wash hover:border-iris/60 hover:bg-iris-soft/30'} ${busy ? 'cursor-wait opacity-70' : ''}`}
    >
      <span className="grid size-12 place-items-center rounded-full bg-iris-soft text-on-iris-container">
        {busy ? <LoaderCircle size={22} className="animate-spin" /> : <FileUp size={22} strokeWidth={1.75} />}
      </span>
      <span className="text-[15px] font-semibold text-ink">{busy ? '파일을 읽는 중…' : title}</span>
      <span id={`${id}-hint`} className="text-[13px] leading-5 text-subtle">
        {hint}
      </span>
      <input
        id={id}
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
    </div>
  )
}
