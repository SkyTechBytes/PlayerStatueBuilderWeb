import { describe, expect, it, vi } from 'vitest'
import { fetchPublicSkin } from './player-skin'

describe('fetchPublicSkin', () => {
  it('uses the upstream MineSkin name endpoint first', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(new Blob(['png']), {
      headers: { 'content-type': 'image/png' },
    }))

    const skin = await fetchPublicSkin('Notch', fetchImpl)

    expect(skin.provider).toBe('mineskin')
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://mineskin.eu/download/Notch')
  })

  it('falls back to the public MCHeads name endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => String(input).includes('mineskin.eu')
      ? new Response(null, { status: 503 })
      : new Response(new Blob(['png']), { headers: { 'content-type': 'image/png' } }))

    const skin = await fetchPublicSkin('Notch', fetchImpl)

    expect(skin.provider).toBe('mc-heads')
    expect(fetchImpl.mock.calls.map(([input]) => new URL(String(input)).host)).toEqual(['mineskin.eu', 'mc-heads.net'])
  })

  it('rejects invalid player names before making a request', async () => {
    const fetchImpl = vi.fn<typeof fetch>()

    await expect(fetchPublicSkin('not valid', fetchImpl)).rejects.toThrow('valid Minecraft player name')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})