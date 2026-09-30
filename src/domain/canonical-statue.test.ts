import { describe, expect, it, vi } from 'vitest'
import { createCanonicalStatue, serializeCanonicalStatue } from './canonical-statue'
import { createSchematicDocument } from './schematic'
import { recordStatueDownload, TELEMETRY_ENDPOINT } from './telemetry'
import type { Voxel } from './voxel-model'

const red: Voxel = { x: 1, y: 0, z: 0, block: 'minecraft:red_concrete', color: '#901d1d' }
const glass: Voxel = { x: 0, y: 2, z: 1, block: 'minecraft:black_stained_glass', color: '#666767' }

describe('canonical statue identity', () => {
  it('is independent of voxel order and model metadata', () => {
    const first = createSchematicDocument('classic', [red, glass])
    const second = createSchematicDocument('slim', [glass, red])

    expect(serializeCanonicalStatue(first)).toBe(serializeCanonicalStatue(second))
  })

  it('changes canonical data only when the generated blocks change', () => {
    const original = createSchematicDocument('classic', [red, glass])
    const changed = createSchematicDocument('classic', [
      red,
      { ...glass, block: 'minecraft:black_concrete', color: '#010205' },
    ])

    expect(serializeCanonicalStatue(original)).not.toBe(serializeCanonicalStatue(changed))
  })

  it('sorts expanded block states by numeric coordinates', () => {
    const schematic = createSchematicDocument('classic', [red, glass])

    expect(createCanonicalStatue(schematic).blocks).toEqual([
      { x: 0, y: 2, z: 1, state: 'minecraft:black_stained_glass' },
      { x: 1, y: 0, z: 0, state: 'minecraft:red_concrete' },
    ])
  })

  it('posts truncated SHA-256 identifiers using the telemetry contract', async () => {
    const schematic = createSchematicDocument('classic', [red, glass])
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await recordStatueDownload(schematic, 'PlayerOne', fetchMock)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(TELEMETRY_ENDPOINT, expect.objectContaining({
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
    }))
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body).toEqual({
      StatueID: expect.stringMatching(/^[a-f0-9]{36}$/),
      PlayerUUID: expect.stringMatching(/^[a-f0-9]{36}$/),
    })
  })

  it('sends an empty PlayerUUID when no player lookup was used', async () => {
    const schematic = createSchematicDocument('classic', [red, glass])
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await recordStatueDownload(schematic, undefined, fetchMock)

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      StatueID: expect.stringMatching(/^[a-f0-9]{36}$/),
      PlayerUUID: '',
    })
  })

  it('normalizes player names to lowercase before hashing', async () => {
    const schematic = createSchematicDocument('classic', [red, glass])
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await recordStatueDownload(schematic, 'PlayerOne', fetchMock)
    await recordStatueDownload(schematic, 'playerone', fetchMock)

    const mixedCaseBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    const lowercaseBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(mixedCaseBody.PlayerUUID).toBe(lowercaseBody.PlayerUUID)
  })
})