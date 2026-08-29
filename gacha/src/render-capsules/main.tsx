import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { CapsulePreviewCard } from '../components/capsule-preview-card'
import { CAPSULE_TYPES, type CapsuleType } from '../lib/capsule-art'

const params = new URLSearchParams(window.location.search)
const requested = params.get('type')
const type = CAPSULE_TYPES.includes(requested as CapsuleType)
  ? (requested as CapsuleType)
  : 'common'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="flex min-h-screen items-center justify-center bg-white p-8">
      <CapsulePreviewCard type={type} />
    </div>
  </StrictMode>
)
