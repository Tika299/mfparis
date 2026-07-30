export type WorkbookRow = Record<string, string>
export type WorkbookSheets = Record<string, WorkbookRow[]>

const XML_HEADER =
  '<?xml version="1.0"?>\n' +
  '<?mso-application progid="Excel.Sheet"?>\n'

function stripInvalidXmlChars(value: string) {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
    '',
  )
}

export function escapeXml(value: unknown) {
  return stripInvalidXmlChars(String(value ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function unescapeXml(value: string) {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

export function valueToCell(value: unknown) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  return JSON.stringify(value)
}

function cellXml(value: unknown) {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

function rowXml(values: unknown[]) {
  return `<Row>${values.map(cellXml).join('')}</Row>`
}

export function createExcelXmlWorkbook(sheets: WorkbookSheets) {
  const worksheetXml = Object.entries(sheets)
    .map(([sheetName, rows]) => {
      const headers = rows[0] ? Object.keys(rows[0]) : ['id']
      const bodyRows = rows.map((row) => rowXml(headers.map((header) => row[header] ?? '')))

      return [
        `<Worksheet ss:Name="${escapeXml(sheetName)}">`,
        '<Table>',
        rowXml(headers),
        ...bodyRows,
        '</Table>',
        '</Worksheet>',
      ].join('\n')
    })
    .join('\n')

  return [
    XML_HEADER,
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    worksheetXml,
    '</Workbook>',
  ].join('\n')
}

function extractRows(tableXml: string) {
  const rows: string[][] = []
  const rowPattern = /<Row\b[^>]*>([\s\S]*?)<\/Row>/gi
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowPattern.exec(tableXml))) {
    const cells: string[] = []
    const cellPattern = /<Cell\b[^>]*>(?:\s*<Data\b[^>]*>([\s\S]*?)<\/Data>\s*)?<\/Cell>/gi
    let cellMatch: RegExpExecArray | null

    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(unescapeXml((cellMatch[1] || '').replace(/\r?\n/g, '\n')))
    }

    rows.push(cells)
  }

  return rows
}

export function parseExcelXmlWorkbook(xml: string): WorkbookSheets {
  const sheets: WorkbookSheets = {}
  const sheetPattern =
    /<Worksheet\b[^>]*ss:Name="([^"]+)"[^>]*>[\s\S]*?<Table\b[^>]*>([\s\S]*?)<\/Table>[\s\S]*?<\/Worksheet>/gi

  let sheetMatch: RegExpExecArray | null

  while ((sheetMatch = sheetPattern.exec(xml))) {
    const sheetName = unescapeXml(sheetMatch[1])
    const rawRows = extractRows(sheetMatch[2])
    const headers = rawRows[0] || []

    sheets[sheetName] = rawRows.slice(1).map((cells) => {
      const row: WorkbookRow = {}

      headers.forEach((header, index) => {
        if (!header) return
        row[header] = cells[index] ?? ''
      })

      return row
    })
  }

  return sheets
}
