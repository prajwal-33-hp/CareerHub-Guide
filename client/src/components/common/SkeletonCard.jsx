import { memo } from 'react'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-ink/10 bg-white p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-ink/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-ink/10" />
          <div className="h-3 w-1/3 rounded bg-ink/10" />
        </div>
      </div>
      <div className="mt-4 h-3 w-full rounded bg-ink/10" />
      <div className="mt-2 h-3 w-4/5 rounded bg-ink/10" />
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-ink/10" />
        <div className="h-5 w-16 rounded-full bg-ink/10" />
      </div>
    </div>
  )
}

export default memo(SkeletonCard)
