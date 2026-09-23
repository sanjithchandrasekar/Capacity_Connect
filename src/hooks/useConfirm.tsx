import React, { useState } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function useConfirm() {
  const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null)
  const [config, setConfig] = useState({ title: '', message: '' })

  const confirm = (message: string, title: string = 'Confirm Action') => new Promise<boolean>((resolve) => {
    setConfig({ title, message })
    setPromise({ resolve })
  })

  const handleConfirm = () => {
    promise?.resolve(true)
    setPromise(null)
  }

  const handleCancel = () => {
    promise?.resolve(false)
    setPromise(null)
  }

  const ConfirmationDialog = () => (
    <ConfirmModal 
      isOpen={promise !== null} 
      title={config.title} 
      message={config.message} 
      onConfirm={handleConfirm} 
      onCancel={handleCancel} 
    />
  )

  return [ConfirmationDialog, confirm] as const
}
