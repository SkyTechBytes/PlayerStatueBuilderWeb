import { serializeCanonicalStatue } from './canonical-statue'
import type { SchematicDocument } from './schematic'

export const TELEMETRY_ENDPOINT = 'https://psbweb.skytechbytes.workers.dev/api/telemetry'

interface Telemetry {
  StatueID: string
  PlayerUUID?: string
}

export async function recordStatueDownload(
  schematic: SchematicDocument,
  playerName: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  try {
    const telemetry: Telemetry = {
      StatueID: await sha256(serializeCanonicalStatue(schematic)),
      PlayerUUID: playerName ? await sha256(playerName.toLowerCase()) : '',
    }

    await fetchImpl(TELEMETRY_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(telemetry),
      mode: 'no-cors',
      keepalive: true,
    })
  } catch {
    // Telemetry must never prevent or report an otherwise successful download.
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 36)
}