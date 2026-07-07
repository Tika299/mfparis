import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { PlayCircle } from 'lucide-react'
import { LiteYouTube } from '@/components/LiteYouTube'
import { SafeHtmlContent } from '@/components/SafeHtmlContent'

/**
 * Chỉ chấp nhận các nguồn video được cho phép.
 * Không đưa URL tùy ý từ CMS trực tiếp vào iframe.
 */
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

                        {story?.content ? (
                            <div className="prose mt-5 max-w-none text-sm leading-7 text-neutral-600 sm:text-[15px]">
                                <SafeHtmlContent html={story.content} />
                            </div>
                        ) : (
                            <p className="mt-5 text-sm leading-7 text-neutral-500 sm:text-[15px]">
                                Nội dung giới thiệu thương hiệu
                                đang được cập nhật.
                            </p>
                        )}
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
