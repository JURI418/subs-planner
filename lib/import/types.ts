/** PDF 한 쪽에서 뽑은 글자 조각과 위치 (x: 왼쪽, y: 아래에서부터, w: 너비) */
export type TextItem = { s: string; x: number; y: number; w: number }
export type PdfPages = TextItem[][]

/** 같은 높이(y)에 있는 조각끼리 묶어 위에서 아래 순서의 줄로 만든다 */
export function groupLines(items: TextItem[], tolerance = 2): TextItem[][] {
  const sorted = items.filter((i) => i.s.trim()).sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: TextItem[][] = []
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - it.y) <= tolerance)
    if (line) line.push(it)
    else lines.push([it])
  }
  lines.forEach((l) => l.sort((a, b) => a.x - b.x))
  return lines.sort((a, b) => b[0].y - a[0].y)
}

/** 조각 사이 간격을 보고 띄어쓰기를 살려 한 줄 문자열로 합친다 */
export function joinLine(line: TextItem[]): string {
  let out = ''
  let end = -Infinity
  for (const it of line) {
    if (out && it.x - end > 1.5) out += ' '
    out += it.s
    end = it.x + it.w
  }
  return out.replace(/\s+/g, ' ').trim()
}
