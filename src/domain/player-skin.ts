export interface PublicSkin {
  blob: Blob
  provider: 'mineskin' | 'mc-heads'
}

const providers = [
  { name: 'mineskin' as const, url: (username: string) => `https://mineskin.eu/download/${encodeURIComponent(username)}` },
  { name: 'mc-heads' as const, url: (username: string) => `https://mc-heads.net/download/${encodeURIComponent(username)}` },
]

export async function fetchPublicSkin(rawUsername: string, fetchImpl: typeof fetch = fetch): Promise<PublicSkin> {
  const username = rawUsername.trim()
  if (!/^[a-zA-Z0-9_]{1,16}$/.test(username)) {
    throw new TypeError('Enter a valid Minecraft player name')
  }

  for (const provider of providers) {
    try {
      const response = await fetchImpl(provider.url(username), { headers: { accept: 'image/png' } })
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) continue
      const blob = await response.blob()
      if (blob.size > 0) return { blob, provider: provider.name }
    } catch {
      // Continue to the next public provider.
    }
  }

  throw new Error(`Could not retrieve a skin for ${username}`)
}