/* eslint-disable @next/next/no-img-element */

type EntityID = number | string

type MediaLike = {
  id?: EntityID | null
  url?: string | null
  alt?: string | null
}

export type FragranceNote = {
  id?: EntityID | null
  name?: string | null
  label?: string | null
  title?: string | null
  icon?: EntityID | MediaLike | null
}

export type FragranceNoteInput =
  | EntityID
  | FragranceNote
  | null
  | undefined

export type FragranceProfileData = {
  topNotes?: FragranceNoteInput[] | null
  middleNotes?: FragranceNoteInput[] | null
  baseNotes?: FragranceNoteInput[] | null
  longevityScore?: number | null
  sillageScore?: number | null
}

export type FragranceProfileProps = {
  data?: FragranceProfileData | null
  className?: string
  title?: string
  eyebrow?: string
  description?: string
  scoreMax?: number
}

type NormalizedNote = {
  key: string
  label: string
  iconUrl: string | null
  iconAlt: string
}

type NoteColumnProps = {
  title: string
  notes: NormalizedNote[]
}

type ScoreItemProps = {
  label: string
  score: number
  max: number
}

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ')
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getNoteLabel(
  note: FragranceNoteInput,
): string | null {
  if (
    typeof note === 'number' ||
    typeof note === 'string'
  ) {
    return typeof note === 'string'
      ? note.trim() || null
      : null
  }

  if (!note || !isRecord(note)) {
    return null
  }

  const candidates = [
    note.name,
    note.label,
    note.title,
  ]

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue
    }

    const normalized = candidate.trim()

    if (normalized.length > 0) {
      return normalized
    }
  }

  return null
}

function getNoteID(
  note: FragranceNoteInput,
): EntityID | null {
  if (
    typeof note === 'number' ||
    typeof note === 'string'
  ) {
    return note
  }

  if (!note || !isRecord(note)) {
    return null
  }

  const id = note.id

  return typeof id === 'number' ||
    typeof id === 'string'
    ? id
    : null
}

function getIconUrl(
  note: FragranceNoteInput,
): string | null {
  if (!note || !isRecord(note)) {
    return null
  }

  const icon = note.icon

  if (
    typeof icon === 'string' &&
    (
      icon.startsWith('/') ||
      icon.startsWith('http://') ||
      icon.startsWith('https://') ||
      icon.startsWith('data:')
    )
  ) {
    return icon
  }

  if (!icon || !isRecord(icon)) {
    return null
  }

  return typeof icon.url === 'string' &&
    icon.url.trim().length > 0
    ? icon.url.trim()
    : null
}

function getIconAlt(
  note: FragranceNoteInput,
  label: string,
): string {
  if (!note || !isRecord(note)) {
    return `Minh họa ${label}`
  }

  const icon = note.icon

  if (
    icon &&
    isRecord(icon) &&
    typeof icon.alt === 'string' &&
    icon.alt.trim().length > 0
  ) {
    return icon.alt.trim()
  }

  return `Minh họa ${label}`
}

function normalizeNotes(
  notes: FragranceNoteInput[] | null | undefined,
): NormalizedNote[] {
  if (!Array.isArray(notes)) {
    return []
  }

  const normalizedNotes: NormalizedNote[] = []
  const usedKeys = new Set<string>()

  for (const note of notes) {
    const label = getNoteLabel(note)

    if (!label) {
      continue
    }

    const relationshipID = getNoteID(note)

    const baseKey =
      relationshipID !== null
        ? String(relationshipID)
        : label.toLocaleLowerCase('vi-VN')

    let key = baseKey
    let duplicateIndex = 1

    while (usedKeys.has(key)) {
      duplicateIndex += 1
      key = `${baseKey}-${duplicateIndex}`
    }

    usedKeys.add(key)

    normalizedNotes.push({
      key,
      label,
      iconUrl: getIconUrl(note),
      iconAlt: getIconAlt(note, label),
    })
  }

  return normalizedNotes
}

function normalizeScore(
  score: number | null | undefined,
  maximum: number,
): number {
  if (
    typeof score !== 'number' ||
    !Number.isFinite(score)
  ) {
    return 0
  }

  return clamp(score, 0, maximum)
}

function BotanicalFallbackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="h-full w-full"
      fill="none"
    >
      <path
        d="M60 92V45"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M60 52C45 48 37 37 39 23c15 1 24 11 21 29Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M60 62c15-4 24-15 22-29-15 1-24 11-22 29Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M60 76c-12-3-20-11-20-23 13 0 21 8 20 23Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M60 82c12-3 20-11 20-23-13 0-21 8-20 23Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M39 94h42"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function NoteIcon({
  note,
}: {
  note: NormalizedNote
}) {
  return (
    <div className="flex h-24 w-24 items-center justify-center text-[#1D1A17] sm:h-24 sm:w-24 lg:h-24 lg:w-24">
      {note.iconUrl ? (
        <img
          src={note.iconUrl}
          alt={note.iconAlt}
          className="h-full w-full object-contain grayscale"
          loading="lazy"
        />
      ) : (
        <BotanicalFallbackIcon />
      )}
    </div>
  )
}

function NoteColumn({
  title,
  notes,
}: NoteColumnProps) {
  return (
    <section className="min-w-0 text-center">
      <h3 className="font-heading text-3xl font-medium leading-none tracking-[-0.03em] text-[#171411] sm:text-[2.35rem] lg:text-[2.6rem]">
        {title}
      </h3>

      {notes.length > 0 ? (
        <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-8 sm:mt-8 lg:gap-x-6">
          {notes.map((note) => (
            <figure
              key={note.key}
              className="flex w-[110px] flex-col items-center sm:w-[118px] lg:w-[122px]"
            >
              <NoteIcon note={note} />

              <figcaption className="mt-2 max-w-[120px] text-center text-[14px] leading-5 text-[#25201B] sm:text-base">
                {note.label}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm italic text-[#746C63]">
          Đang cập nhật
        </p>
      )}
    </section>
  )
}

function DecorativeDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-6 w-full max-w-6xl sm:mt-8"
    >
      <svg
        viewBox="0 0 1200 120"
        className="h-auto w-full text-[#756F68]"
        fill="none"
      >
        <path
          d="M32 97C130 12 253 29 351 42c54 7 99 4 139-16"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        <path
          d="M710 25c64 31 117 28 183 17 111-18 213 2 275 56"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        <path
          d="M594 57c17-33 45-38 59-15-11 16-29 24-59 15Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />

        <path
          d="M596 57c21 0 38-7 54-21"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />

        <path
          d="M616 52c-5-10-7-18-6-25M630 47c2-9 6-16 12-22"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function ScoreItem({
  label,
  score,
  max,
}: ScoreItemProps) {
  return (
    <div className="flex items-center justify-between rounded-full border border-[#DDD4C8] bg-white/70 px-5 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5D554C]">
        {label}
      </p>

      <p className="font-sans text-xl text-[#1D1915]">
        {Number.isInteger(score)
          ? score
          : score.toFixed(1)}
        <span className="ml-1 text-sm text-[#746C63]">
          / {max}
        </span>
      </p>
    </div>
  )
}

export default function FragranceProfile({
  data,
  className,
  title = 'Kiến trúc mùi hương',
  eyebrow = 'Fragrance notes',
  description =
  'Tưởng tượng cho giấc mơ đêm của bạn, lưu hương sâu mãi bên tôi, mang màu mới lạ hương.',
  scoreMax = 10,
}: FragranceProfileProps) {
  const safeMaximum =
    Number.isFinite(scoreMax) && scoreMax > 0
      ? scoreMax
      : 10

  const topNotes = normalizeNotes(data?.topNotes)
  const middleNotes = normalizeNotes(
    data?.middleNotes,
  )
  const baseNotes = normalizeNotes(data?.baseNotes)

  const longevityScore = normalizeScore(
    data?.longevityScore,
    safeMaximum,
  )

  const sillageScore = normalizeScore(
    data?.sillageScore,
    safeMaximum,
  )

  const hasNotes =
    topNotes.length > 0 ||
    middleNotes.length > 0 ||
    baseNotes.length > 0

  const hasScores =
    typeof data?.longevityScore === 'number' ||
    typeof data?.sillageScore === 'number'

  if (!hasNotes && !hasScores) {
    return null
  }

  return (
    <section
      aria-labelledby="fragrance-profile-heading"
      className={joinClassNames(
        'overflow-hidden rounded-[2.5rem] bg-[#F7F3ED]',
        'px-5 py-10 text-[#171411]',
        'shadow-[0_24px_90px_rgba(56,45,33,0.06)]',
        'sm:px-8 sm:py-14 lg:px-12 lg:py-16',
        className,
      )}
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#29241F] sm:text-sm">
            {eyebrow}
          </p>

          <h2
            id="fragrance-profile-heading"
            className="mt-4 font-heading text-4xl font-medium tracking-[-0.04em] text-[#15120F] sm:text-5xl lg:text-6xl"
          >
            {title}
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#2D2823] sm:text-lg sm:leading-8">
            {description}
          </p>
        </header>

        <DecorativeDivider />

        {hasNotes ? (
          <div className="mt-6 grid gap-10 md:grid-cols-3 md:gap-6 lg:mt-8 lg:gap-8">
            <NoteColumn
              title="Hương đầu"
              notes={topNotes}
            />

            <NoteColumn
              title="Hương giữa"
              notes={middleNotes}
            />

            <NoteColumn
              title="Hương cuối"
              notes={baseNotes}
            />
          </div>
        ) : null}

        {hasScores ? (
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 border-t border-[#D9D1C7] pt-6 md:grid-cols-2 md:gap-5">
            <ScoreItem
              label="Độ lưu hương"
              score={longevityScore}
              max={safeMaximum}
            />

            <ScoreItem
              label="Độ tỏa hương"
              score={sillageScore}
              max={safeMaximum}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
