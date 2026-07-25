import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'

type SiloMegaMenuLink = {
  id: string
  label: string
  link: string
}

type SiloMegaMenuGroup = {
  id: string
  title: string
  links: SiloMegaMenuLink[]
}

type SiloMegaMenuItem = SiloMegaMenuLink & {
  megaGroups?: SiloMegaMenuGroup[]
}

type SiloMegaMenuProps = {
  navItems: SiloMegaMenuItem[]
}

export function SiloMegaMenu({ navItems }: SiloMegaMenuProps) {
  return (
    <nav
      className="flex min-w-0 flex-1 items-center justify-start gap-x-5 xl:gap-x-8"
      aria-label="Điều hướng chính"
    >
      {navItems.map((item) => {
        const isOffer =
          item.label.trim().toLocaleLowerCase('vi') === 'ưu đãi'
        const hasMegaMenu =
          Array.isArray(item.megaGroups) &&
          item.megaGroups.some((group) => group.links.length > 0)

        if (!hasMegaMenu) {
          return (
            <Link
              key={item.id}
              href={item.link}
              className={
                isOffer
                  ? 'group flex items-center gap-2 whitespace-nowrap text-[12.5px] font-semibold text-[#c31920] transition-opacity hover:opacity-70'
                  : 'whitespace-nowrap text-[12.5px] font-medium text-[#202020] transition-colors hover:text-[#ad0509]'
              }
            >
              <span>{item.label}</span>

              {isOffer ? (
                <ChevronRight
                  aria-hidden="true"
                  size={13}
                  strokeWidth={2.3}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              ) : null}
            </Link>
          )
        }

        return (
          <div
            key={item.id}
            className="group/menu relative flex h-[49px] items-center"
          >
            <Link
              href={item.link}
              className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium text-[#202020] transition-colors hover:text-[#ad0509]"
            >
              <span>{item.label}</span>
              <ChevronDown
                aria-hidden="true"
                size={13}
                strokeWidth={2.2}
                className="transition-transform group-hover/menu:rotate-180"
              />
            </Link>

            <div className="invisible absolute left-0 top-full z-[120] w-[620px] translate-y-2 rounded-md border border-[#eeeeee] bg-white p-5 opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.12)] transition-all duration-150 group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:opacity-100">
              <div className="grid grid-cols-2 gap-5">
                {item.megaGroups?.map((group) => (
                  <section
                    key={group.id}
                    aria-label={group.title}
                    className="min-w-0"
                  >
                    <h3 className="mb-3 text-[12px] font-bold uppercase tracking-normal text-[#ad0509]">
                      {group.title}
                    </h3>

                    <ul className="space-y-2">
                      {group.links.map((link) => (
                        <li key={link.id}>
                          <Link
                            href={link.link}
                            className="block rounded px-2 py-1.5 text-[13px] font-medium text-[#333333] transition-colors hover:bg-red-50 hover:text-[#ad0509]"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
