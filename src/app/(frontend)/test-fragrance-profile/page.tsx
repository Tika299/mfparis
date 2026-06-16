import FragranceProfile from '@/components/product/FragranceProfile'

export default function TestFragranceProfilePage() {
    return (
        <main className="min-h-screen bg-[#f4f1eb] px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <FragranceProfile
                    data={{
                        topNotes: [
                            'Cam Bergamot',
                            'Tiêu hồng',
                            'Quýt Ý',
                        ],
                        middleNotes: [
                            'Hoa nhài',
                            'Hoa oải hương',
                            'Phong lữ',
                        ],
                        baseNotes: [
                            'Gỗ tuyết tùng',
                            'Xạ hương',
                            'Hổ phách',
                            'Vanilla',
                        ],
                        longevityScore: 8.5,
                        sillageScore: 7,
                    }}
                    scoreMax={10}
                />
            </div>
        </main>
    )
}