'use client'
import type { PdfPages } from './types'

/** 브라우저에서 PDF 파일의 글자 조각과 위치를 읽는다 (파일은 서버로 보내지 않음) */
export async function readPdfText(file: File): Promise<PdfPages> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    .promise
  const pages: PdfPages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    pages.push(
      content.items
        .filter((it): it is Extract<typeof it, { str: string }> => 'str' in it)
        .map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
    )
  }
  await doc.destroy()
  return pages
}
