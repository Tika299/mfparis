'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const ROUTE_LOADING_MIN_VISIBLE_MS = 280
const ROUTE_LOADING_TIMEOUT_MS = 8000

function getLocationKey(url: URL): string {
  return `${url.pathname}${url.search}`
}

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

function shouldIgnoreAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== '_self') return true
  if (anchor.hasAttribute('download')) return true

  const rawHref = anchor.getAttribute('href')
  if (!rawHref || rawHref.startsWith('#')) return true
  if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
    return true
  }

  let url: URL

  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return true
  }

  if (url.origin !== window.location.origin) return true

  const ignoredPrefixes = ['/admin', '/api', '/media', '/_next']

  if (ignoredPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    return true
  }

  const current = window.location.pathname + window.location.search
  const next = url.pathname + url.search

  return current === next
}

function isSameInternalLocation(nextUrl: string | URL | null | undefined): boolean {
  if (!nextUrl) return true

  let url: URL

  try {
    url = new URL(String(nextUrl), window.location.href)
  } catch {
    return true
  }

  if (url.origin !== window.location.origin) return true

  const current = window.location.pathname + window.location.search
  const next = getLocationKey(url)

  return current === next
}

function shouldScrollToTopForNavigation(nextUrl: string | URL | null | undefined): boolean {
  if (!nextUrl) return false

  let url: URL

  try {
    url = new URL(String(nextUrl), window.location.href)
  } catch {
    return false
  }

  if (url.origin !== window.location.origin) return false

  const currentPathname = window.location.pathname

  if (url.pathname !== currentPathname) {
    return true
  }

  const currentParams = new URLSearchParams(window.location.search)
  const nextParams = url.searchParams

  return currentParams.get('page') !== nextParams.get('page')
}

function scrollToPageTop() {
  if (window.scrollY <= 0) return

  const html = document.documentElement
  const body = document.body
  const previousHtmlScrollBehavior = html.style.scrollBehavior
  const previousBodyScrollBehavior = body.style.scrollBehavior

  html.style.scrollBehavior = 'auto'
  body.style.scrollBehavior = 'auto'

  const jumpToTop = () => {
    window.scrollTo(0, 0)
    html.scrollTop = 0
    body.scrollTop = 0
  }

  jumpToTop()
  window.requestAnimationFrame(jumpToTop)

  window.setTimeout(() => {
    html.style.scrollBehavior = previousHtmlScrollBehavior
    body.style.scrollBehavior = previousBodyScrollBehavior
  }, 80)
}

export function RouteLoadingIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const startedAtRef = useRef(0)
  const hideTimerRef = useRef<number | null>(null)
  const progressTimerRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current)
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)

    hideTimerRef.current = null
    progressTimerRef.current = null
    timeoutRef.current = null
  }

  const start = (nextUrl?: string | URL | null) => {
    if (shouldScrollToTopForNavigation(nextUrl)) {
      scrollToPageTop()
    }

    clearTimers()
    startedAtRef.current = Date.now()
    setVisible(true)
    setProgress(12)

    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current < 45) return current + 8
        if (current < 75) return current + 4
        if (current < 90) return current + 1.5

        return current
      })
    }, 180)

    timeoutRef.current = window.setTimeout(() => {
      setVisible(false)
      setProgress(0)
      clearTimers()
    }, ROUTE_LOADING_TIMEOUT_MS)
  }

  const finish = () => {
    if (!visible) return

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }

    setProgress(100)

    const elapsed = Date.now() - startedAtRef.current
    const delay = Math.max(80, ROUTE_LOADING_MIN_VISIBLE_MS - elapsed)

    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)

    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
      setProgress(0)
      clearTimers()
    }, delay)
  }

  useEffect(() => {
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function pushStateWithLoading(...args) {
      if (!isSameInternalLocation(args[2])) {
        start(args[2])
      }

      return originalPushState.apply(this, args)
    }

    window.history.replaceState = function replaceStateWithLoading(...args) {
      if (!isSameInternalLocation(args[2])) {
        start(args[2])
      }

      return originalReplaceState.apply(this, args)
    }

    const startFromEventTarget = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null
      const anchor = element?.closest('a')

      if (!anchor || shouldIgnoreAnchor(anchor)) return

      start(anchor.href)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return

      startFromEventTarget(event.target)
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return

      startFromEventTarget(event.target)
    }

    const onPopState = () => {
      start()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
      clearTimers()
    }
  }, [])

  useEffect(() => {
    finish()
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div aria-live="polite" aria-label="Trang đang tải" role="status">
      <div className="fixed left-0 right-0 top-0 z-[2147483646] h-[3px] bg-transparent">
        <div
          className="h-full rounded-r-full bg-[#b72828] shadow-[0_0_18px_rgba(183,40,40,0.45)] transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="pointer-events-none fixed left-1/2 top-20 z-[2147483645] -translate-x-1/2 rounded-full border border-white/80 bg-white/92 px-4 py-2 text-[12px] font-semibold text-[#b72828] shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-md md:top-24">
        <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[#b72828]" />
        Đang tải nội dung...
      </div>
    </div>
  )
}
