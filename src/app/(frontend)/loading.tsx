export default function FrontendLoading() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-8 h-5 w-44 animate-pulse rounded-full bg-gray-100" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="aspect-[16/9] w-full animate-pulse rounded-[1.25rem] bg-gradient-to-br from-[#f6eeee] via-white to-[#f3f4f6]" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 h-8 w-3/4 animate-pulse rounded-full bg-gray-100" />
          <div className="mb-3 h-4 w-full animate-pulse rounded-full bg-gray-100" />
          <div className="mb-3 h-4 w-5/6 animate-pulse rounded-full bg-gray-100" />
          <div className="mb-8 h-4 w-2/3 animate-pulse rounded-full bg-gray-100" />
          <div className="h-12 w-full animate-pulse rounded-full bg-[#f6eeee]" />
        </div>
      </div>
    </section>
  )
}
