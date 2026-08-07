import { createAutoSummary, hasMeaningfulText } from '@/utilities/autoSummary'

type FillShortDescriptionOptions = {
  sourceField: string
  targetField: string
  maxLength?: number
}

function getFieldValue(doc: unknown, field: string): unknown {
  if (!doc || typeof doc !== 'object') {
    return undefined
  }

  return (doc as Record<string, unknown>)[field]
}

export function fillShortDescriptionFromContent({
  sourceField,
  targetField,
  maxLength = 240,
}: FillShortDescriptionOptions) {
  return async ({ data, originalDoc }: any) => {
    if (!data || typeof data !== 'object') {
      return data
    }

    const incomingTarget = getFieldValue(data, targetField)
    const existingTarget = getFieldValue(originalDoc, targetField)

    if (hasMeaningfulText(incomingTarget)) {
      return data
    }

    if (incomingTarget === undefined && hasMeaningfulText(existingTarget)) {
      return data
    }

    const source = getFieldValue(data, sourceField) ?? getFieldValue(originalDoc, sourceField)
    const summary = createAutoSummary(source, { maxLength })

    if (!summary) {
      return data
    }

    return {
      ...data,
      [targetField]: summary,
    }
  }
}
