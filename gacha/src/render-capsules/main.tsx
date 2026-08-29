import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { CapsulePreviewCard } from '../components/capsule-preview-card'
import {
  CAPSULE_GIF_LOOP_MS,
  CAPSULE_TYPES,
  type CapsuleType,
} from '../lib/capsule-art'

const params = new URLSearchParams(window.location.search)
const requested = params.get('type')
const type = CAPSULE_TYPES.includes(requested as CapsuleType)
  ? (requested as CapsuleType)
  : 'common'

function RenderApp() {
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    document.documentElement.removeAttribute('data-gif-loop-ready')
    setEpoch(1)
  }, [])

  useEffect(() => {
    if (epoch === 0) return

    const timer = window.setTimeout(() => {
      document.documentElement.setAttribute('data-gif-loop-ready', 'true')
    }, CAPSULE_GIF_LOOP_MS)

    return () => window.clearTimeout(timer)
  }, [epoch])

  if (epoch === 0) return null

  return <CapsulePreviewCard key={epoch} type={type} forGif />
}

createRoot(document.getElementById('root')!).render(<RenderApp />)
