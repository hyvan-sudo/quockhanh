import { useEffect, useState } from 'react'
import { waitForAuthUser } from '../firebase'

/**
 * Signs the browser in anonymously (no email/password, no signup form) and
 * returns the stable auth.uid. Firebase persists this sign-in locally, so
 * refreshing the page returns the SAME uid instead of creating a new player.
 */
export function usePlayerId() {
  const [uid, setUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    waitForAuthUser()
      .then((user) => {
        if (!cancelled) setUid(user.uid)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to connect.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { uid, error }
}
