import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSchematicDocument } from '../domain/schematic'
import { recordStatueDownload } from '../domain/telemetry'
import { exportSchematic } from '../exporters'
import { useStatueStore } from './statue'

vi.mock('../domain/telemetry', () => ({
  recordStatueDownload: vi.fn().mockResolvedValue(undefined),
}))

describe('multipart clipboard delivery', () => {
  const writeText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('copies the selected part and records telemetry for every successful click', async () => {
    const store = useStatueStore()
    store.playerName = 'SkyTechBytes'
    store.voxels = new Map(Array.from({ length: 900 }, (_, index) => {
      const x = (index % 30) * 2
      const z = Math.floor(index / 30) * 2
      return [`${x},0,${z}`, { x, y: 0, z, block: 'minecraft:red_concrete', color: '#901d1d' }]
    }))
    const schematic = createSchematicDocument(store.detectedModel, store.voxels.values())
    const options = { orientation: 'east', version: 'legacy', mode: 'build' } as const
    const artifact = exportSchematic(schematic, 'command-block', options)
    if (!Array.isArray(artifact.data)) throw new Error('Expected multipart clipboard output')
    expect(artifact.data.length).toBeGreaterThan(1)

    expect(await store.runExport('command-block', options, 0)).toBe('copied')
    expect(await store.runExport('command-block', options, 1)).toBe('copied')
    expect(await store.runExport('command-block', options, 1)).toBe('copied')

    expect(writeText.mock.calls.map(([text]) => text)).toEqual([
      artifact.data[0], artifact.data[1], artifact.data[1],
    ])
    expect(recordStatueDownload).toHaveBeenCalledTimes(3)
    expect(recordStatueDownload).toHaveBeenLastCalledWith(schematic, 'SkyTechBytes')
  })

  it('reports a missing part without copying or sending telemetry', async () => {
    const store = useStatueStore()
    store.regenerate()
    expect(await store.runExport('command-block', undefined, 999)).toBeNull()
    expect(store.error).toContain('part is missing')
    expect(writeText).not.toHaveBeenCalled()
    expect(recordStatueDownload).not.toHaveBeenCalled()
  })

  it('reports clipboard failures without sending telemetry', async () => {
    const store = useStatueStore()
    store.regenerate()
    writeText.mockRejectedValueOnce(new Error('Clipboard permission denied'))
    expect(await store.runExport('command-block')).toBeNull()
    expect(store.error).toBe('Clipboard permission denied')
    expect(recordStatueDownload).not.toHaveBeenCalled()
  })
})
