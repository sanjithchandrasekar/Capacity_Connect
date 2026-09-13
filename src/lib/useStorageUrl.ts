import { useState, useEffect } from 'react'
import { getSignedUrl } from './storage'

/**
 * Hook to get a signed URL for a storage file.
 * @param bucket - The storage bucket name
 * @param path - The file path in storage
 * @returns Object with url, loading, and error states
 */
export function useStorageUrl(bucket: string, path: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    getSignedUrl(bucket, path)
      .then(signedUrl => {
        setUrl(signedUrl)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [bucket, path])

  return { url, loading, error }
}
