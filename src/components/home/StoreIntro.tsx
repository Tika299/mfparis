import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Link from 'next/link'
import { ChevronRight, PlayCircle } from 'lucide-react'
import { LiteYouTube } from '@/components/LiteYouTube'
import { SafeHtmlContent } from '@/components/SafeHtmlContent'

/**
 * Chỉ chấp nhận các nguồn video được cho phép.
 * Không đưa URL tùy ý từ CMS trực tiếp vào iframe.
 */
const LEGACY_HOME_STORY_HTML = `
<p>Từ lâu, với sự yêu thích cái đẹp và mong muốn nhân rộng giá trị làm đẹp đến với mọi người, chúng tôi đã không ngừng suy tư nên chọn cách nào để có thể tiếp cận cộng đồng hiệu quả nhất.</p>
<p>Trước thực trạng hàng nhái, hàng kém chất lượng tràn lan trên thị trường, với sứ mệnh của người trẻ trong thời đại mới, điều này đã thôi thúc các CEO của chúng tôi mạnh dạn mang đến với mọi người một thương hiệu đẳng cấp, một đơn vị chuyên cung ứng sỉ lẻ các sản phẩm làm đẹp, nước hoa chất lượng, chính hãng. Và cũng từ đó thương hiệu “Marais de France” ra đời.</p>
<p>Được mệnh danh là thiên đường của mỹ phẩm, Pháp quả thật là nơi dành cho những ai yêu thích làm đẹp. Mỹ phẩm Pháp luôn làm bạn yên tâm về chất lượng, độ an toàn, không lo hàng giả kém chất lượng và giá thành cũng rất hợp lý.</p>
<p>Tại Pháp tập trung nhiều thương hiệu mỹ phẩm nổi tiếng thế giới như Chanel, Dior, Lancôme, Guerlain, Givenchy... đó là lý do chúng tôi quyết định trở thành một trong những đơn vị hàng đầu về cung ứng các mặt hàng mỹ phẩm Pháp, nước hoa Pháp và hàng nội địa Pháp.</p>
<p>Cùng phương châm “Sự thu hút đến từ bạn”, Marais de France xây dựng thương hiệu từ những giá trị chân thật nhất, góp phần nâng cao chất lượng cuộc sống và vẻ đẹp của con người Việt Nam.</p>
`

function getYouTubeVideoId(
    value: string | null | undefined,
): string | null {
    const normalizedValue = value?.trim()

    if (!normalizedValue) {
        return null
    }

    try {
        const url = new URL(normalizedValue)
        const hostname = url.hostname
            .replace(/^www\./, '')
            .toLowerCase()

        if (hostname === 'youtu.be') {
            const videoId = url.pathname
                .split('/')
                .filter(Boolean)[0]

            return videoId || null
        }

        if (
            hostname === 'youtube.com' ||
            hostname === 'm.youtube.com'
        ) {
            if (url.pathname === '/watch') {
                return url.searchParams.get('v')
            }

            const pathMatch = url.pathname.match(
                /^\/(?:embed|shorts)\/([^/?]+)/,
            )

            return pathMatch?.[1] || null
        }

        return null
    } catch {
        return null
    }
}

export async function StoreIntro() {
    const payload = await getPayload({
        config: configPromise,
    })

    const aboutPage =
        await payload.findGlobal({
            slug: 'about-page',
            depth: 1,
        })

    const story = aboutPage.story

    const heading =
        story?.heading?.trim() ||
        'Câu chuyện Marais de France'

    const videoTitle =
        story?.videoTitle?.trim() ||
        'Video giới thiệu Marais de France'

    const videoId = getYouTubeVideoId(
        story?.videoUrl,
    )

    const introContent = story?.content?.trim() || LEGACY_HOME_STORY_HTML

    return (
        <section
            className="container-ux mt-8 md:mt-10"
            aria-labelledby="store-intro-heading"
        >
            <div className="lc-card overflow-hidden rounded-[2rem] p-4 sm:p-6 md:rounded-[2.5rem] md:p-8 lg:p-10">
                <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
                    {/* Nội dung lấy từ Global about-page */}
                    <div className="min-w-0">
                        <span className="sub-heading">
                            Về Marais de France
                        </span>

                        <h2
                            id="store-intro-heading"
                            className="font-heading text-2xl font-semibold leading-tight tracking-tight text-neutral-950 sm:text-3xl lg:text-4xl"
                        >
                            {heading}
                        </h2>

                        {introContent ? (
                            <div className="prose mt-5 max-h-[260px] max-w-none overflow-hidden text-sm leading-7 text-neutral-600 sm:text-[15px]">
                                <SafeHtmlContent html={introContent} />
                            </div>
                        ) : (
                            <p className="mt-5 text-sm leading-7 text-neutral-500 sm:text-[15px]">
                                Nội dung giới thiệu thương hiệu đang được cập nhật.
                            </p>
                        )}

                        <div className="mt-6">
                            <Link
                                href="/about"
                                className="group/read-more inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-neutral-950"
                            >
                                Đọc thêm
                                <ChevronRight
                                    aria-hidden="true"
                                    size={16}
                                    className="transition-transform group-hover/read-more:translate-x-0.5"
                                />
                            </Link>
                        </div>
                    </div>

                    {/* Khung video tỷ lệ 16:9 */}
                    <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-neutral-100 shadow-sm ring-1 ring-black/[0.05] md:rounded-[2rem]">
                        {videoId ? (
                            <LiteYouTube
                                videoId={videoId}
                                title={videoTitle}
                                className="h-full w-full"
                                roundedClassName="rounded-[1.5rem] md:rounded-[2rem]"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                                    <PlayCircle
                                        aria-hidden="true"
                                        size={28}
                                        strokeWidth={1.7}
                                    />
                                </span>

                                <p className="mt-4 text-sm font-semibold text-neutral-700">
                                    Video giới thiệu thương hiệu
                                </p>

                                <p className="mt-1 max-w-xs text-xs leading-5 text-neutral-400">
                                    Vui lòng cập nhật link video trong
                                    Global Trang Giới thiệu.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
