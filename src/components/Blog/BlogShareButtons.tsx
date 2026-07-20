'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

type BlogShareButtonsProps = Readonly<{
  title: string
  url: string
}>

const INSTAGRAM_URL = 'https://www.instagram.com/maraisdefrance/'

function InstagramIcon({
  size = 18,
}: Readonly<{
  size?: number
}>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      width={size}
    >
      <rect
        height="18"
        rx="5"
        width="18"
        x="3"
        y="3"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
      />
      <circle
        cx="17.5"
        cy="6.5"
        fill="currentColor"
        r="1"
        stroke="none"
      />
    </svg>
  )
}

function getShareUrl(url: string) {
  if (typeof window === 'undefined') {
    return url
  }

  try {
    return new URL(url, window.location.origin).toString()
  } catch {
    return window.location.href
  }
}

function getFacebookShareUrl(url: string, title: string) {
  const params = new URLSearchParams({
    display: 'popup',
    u: url,
  })

  if (title) {
    params.set('quote', title)
  }

  return 'https://www.facebook.com/sharer/sharer.php?' + params.toString()
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', 'true')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

export function BlogShareButtons({
  title,
  url,
}: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => getShareUrl(url), [url])

  function markCopied() {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function shareFacebook() {
    const target = getFacebookShareUrl(shareUrl, title)
    const popup = window.open(
      target,
      'mfparis-facebook-share',
      'width=680,height=620,menubar=no,toolbar=no,status=no',
    )

    if (!popup) {
      window.location.href = target
    }
  }

  async function shareInstagram() {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        })
        return
      } catch {
        // User cancelled native share sheet.
      }
    }

    await copyText(shareUrl)
    markCopied()
    window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    await copyText(shareUrl)
    markCopied()
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-3">
        <button
          aria-label="Chia sẻ bài viết lên Facebook"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-all hover:bg-[#1877F2] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 focus:ring-offset-2"
          onClick={shareFacebook}
          title="Chia sẻ lên Facebook"
          type="button"
        >
          <Share2
            aria-hidden="true"
            size={18}
          />
        </button>

        <button
          aria-label="Chia sẻ bài viết lên Instagram"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-all hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2"
          onClick={shareInstagram}
          title="Chia sẻ lên Instagram"
          type="button"
        >
          <InstagramIcon size={18} />
        </button>

        <button
          aria-label={copied ? 'Đã copy link bài viết' : 'Copy link bài viết'}
          className="flex h-10 min-w-10 items-center justify-center rounded-full bg-gray-50 px-3 text-gray-500 transition-all hover:bg-orange-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-600/25 focus:ring-offset-2"
          onClick={copyLink}
          title={copied ? 'Đã copy link' : 'Copy link'}
          type="button"
        >
          {copied ? (
            <>
              <Check
                aria-hidden="true"
                size={18}
              />
              <span className="ml-2 hidden text-[10px] font-black uppercase tracking-[0.16em] sm:inline">
                Đã copy
              </span>
            </>
          ) : (
            <Copy
              aria-hidden="true"
              size={18}
            />
          )}
        </button>
      </div>
    </div>
  )
}
