import { supabase } from './supabase'

/**
 * Get a signed URL for a file in Supabase storage.
 * @param bucket - The storage bucket name (e.g., 'materials')
 * @param path - The file path in storage
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns Signed URL string or null
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path) return null

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Error getting signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('Error getting signed URL:', err)
    return null
  }
}

/**
 * Get a public URL for a file in Supabase storage.
 * Note: Only works if the bucket has public access.
 * @param bucket - The storage bucket name
 * @param path - The file path in storage
 * @returns Public URL string or null
 */
export function getPublicUrl(bucket: string, path: string): string | null {
  if (!path) return null

  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  } catch (err) {
    console.error('Error getting public URL:', err)
    return null
  }
}
