import { CapsulePreviewCard } from './capsule-preview-card'
import { getImageUrl } from '../lib/constants'
import { CAPSULE_TYPES, type CapsuleType } from '../lib/capsule-art'

export function CapsuleMetadataPanel() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Capsule metadata GIFs
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Preview cards match the price-tag layout with an empty capsule. Regenerate{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">
              common.gif
            </code>
            ,{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">
              rare.gif
            </code>
            , and{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">
              epic.gif
            </code>{' '}
            with one full sparkle loop each.
          </p>
        </div>
        <code className="shrink-0 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">
          pnpm render:capsules
        </code>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {CAPSULE_TYPES.map((type) => (
          <CapsuleMetadataTile key={type} type={type} />
        ))}
      </div>
    </div>
  )
}

function CapsuleMetadataTile({ type }: { type: CapsuleType }) {
  const gifUrl = getImageUrl(`/${type}.gif`)

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
      <CapsulePreviewCard type={type} />
      <div className="w-full space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Current {type}.gif
        </p>
        <img
          src={`${gifUrl}?v=${type}`}
          alt={`${type} capsule metadata`}
          className="mx-auto h-24 w-24 object-contain"
        />
        <a
          href={`/render-capsules.html?type=${type}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-[#b480e4] underline decoration-[#b480e4]/40 hover:decoration-[#b480e4] dark:text-[#c99df0]"
        >
          Open render frame
        </a>
      </div>
    </div>
  )
}
