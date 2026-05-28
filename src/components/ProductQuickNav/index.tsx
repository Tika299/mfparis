// D:\mfparis\src\components\ProductQuickNav\index.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronUp, List } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import RichText from '@/components/RichText'

type AccordionEntry = {
  title: string
  content: any
}

export function ProductQuickNav({ accordions }: { accordions: AccordionEntry[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [showTopButton, setShowTopButton] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY
      const height = document.documentElement.scrollHeight - window.innerHeight
      const progress = height > 0 ? Math.min(100, Math.max(0, (top / height) * 100)) : 0
      setScrollPercent(progress)
      setShowTopButton(top > 700)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const items = useMemo(
    () =>
      (accordions || []).map((item, i) => ({
        id: `section-${i}`,
        title: item?.title || `Mục ${i + 1}`,
      })),
    [accordions],
  )

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-transparent">
        <div className="h-full bg-[#b72828] transition-[width] duration-150" style={{ width: `${scrollPercent}%` }} />
      </div>

      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 sm:bottom-5 md:bottom-6 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex h-10 items-center gap-2 rounded-full bg-black px-4 text-[10px] font-black uppercase tracking-wider text-white shadow-lg sm:h-11 sm:text-[11px]">
              <List size={14} />
              Mục lục
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[82dvh] rounded-t-3xl bg-white px-5 pb-8 pt-6">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left">Mục lục nội dung</SheetTitle>
            </SheetHeader>
            <div className="space-y-2 overflow-y-auto">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setSheetOpen(false)}
                  className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {showTopButton && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b72828] text-white shadow-lg sm:h-11 sm:w-11"
            aria-label="Lên đầu trang"
          >
            <ChevronUp size={18} />
          </button>
        )}
      </div>
    </>
  )
}

export function ProductAccordionContent({ accordions }: { accordions: AccordionEntry[] }) {
  if (!accordions?.length) return null

  return (
    <Accordion type="single" collapsible defaultValue="section-0" className="space-y-3 md:space-y-4">
      {accordions.map((item, i) => (
        <AccordionItem
          key={i}
          value={`section-${i}`}
          id={`section-${i}`}
          className="scroll-mt-20 rounded-2xl border border-gray-100 bg-white shadow-sm md:scroll-mt-24 lg:scroll-mt-28"
        >
          <AccordionTrigger className="px-4 py-3 text-left text-[15px] font-bold text-gray-900 hover:no-underline sm:px-5 md:px-8 md:py-4 md:text-[17px] lg:px-10">
            <span className="flex items-center gap-3">
              <span className="h-5 w-1.5 rounded-full bg-[#b72828]" />
              {item.title}
            </span>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4 pt-1 sm:px-5 md:px-8 md:pb-7 lg:px-10">
            <div className="border-t border-gray-100 pt-4 md:pt-6">
              <RichText content={item.content} className="prose-p:text-[15px] prose-p:leading-relaxed" />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}