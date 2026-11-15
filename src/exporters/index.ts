import type { SchematicDocument } from '../domain/schematic'
import {
  createCommandBlockCommands,
  type CommandBlockOptions,
} from './command-block'
import { createCsv } from './csv'
import { createGlb, createGlbCompat } from './glb'
import { createLegacySchematic } from './legacy-schematic'
import { createLitematic } from './litematic'
import { createMcfunction } from './mcfunction'
import { createPly, createPlyCompat } from './ply'
import { createProjectJson } from './project-json'
import { createSpongeSchematic } from './sponge-schem'
import { createStructureNbt } from './structure-nbt'

export type ExportData = string | Uint8Array | string[]
export type ExportOptions = CommandBlockOptions

export interface SchematicExporter {
  id: string
  label: string
  extension: string
  mime: string
  delivery: 'download' | 'clipboard'
  commandOptions?: boolean
  convert: (schematic: SchematicDocument, options?: ExportOptions) => ExportData
}

export const SCHEMATIC_EXPORTERS = [
  { id: 'command-block', label: 'Command block', extension: '', mime: 'text/plain', delivery: 'clipboard', commandOptions: true, convert: createCommandBlockCommands },
  { id: 'litematic', label: 'Litematica', extension: '.litematic', mime: 'application/gzip', delivery: 'download', convert: createLitematic },
  { id: 'schem', label: 'Sponge / WorldEdit', extension: '.schem', mime: 'application/gzip', delivery: 'download', convert: createSpongeSchematic },
  { id: 'structure', label: 'Minecraft structure block', extension: '.nbt', mime: 'application/gzip', delivery: 'download', convert: createStructureNbt },
  { id: 'legacy-schematic', label: 'Legacy MCEdit', extension: '.schematic', mime: 'application/gzip', delivery: 'download', convert: createLegacySchematic },
  { id: 'mcfunction', label: 'Minecraft function', extension: '.mcfunction', mime: 'text/plain', delivery: 'download', convert: createMcfunction },
  { id: 'glb', label: '3D model (GLB)', extension: '.glb', mime: 'model/gltf-binary', delivery: 'download', convert: (schematic) => createGlb(schematic) },
  { id: 'glb-compat', label: '3D model (GLB compat, no alpha)', extension: '-compat.glb', mime: 'model/gltf-binary', delivery: 'download', convert: (schematic) => createGlbCompat(schematic) },
  { id: 'ply', label: '3D model (PLY)', extension: '.ply', mime: 'application/octet-stream', delivery: 'download', convert: (schematic) => createPly(schematic) },
  { id: 'ply-compat', label: '3D model (PLY compat, no alpha)', extension: '-compat.ply', mime: 'application/octet-stream', delivery: 'download', convert: (schematic) => createPlyCompat(schematic) },
  { id: 'csv', label: 'Block table (CSV)', extension: '.csv', mime: 'text/csv', delivery: 'download', convert: createCsv },
  { id: 'project', label: 'PSB project JSON', extension: '.psb.json', mime: 'application/json', delivery: 'download', convert: createProjectJson },
] as const satisfies readonly SchematicExporter[]

export type ExporterId = typeof SCHEMATIC_EXPORTERS[number]['id']
const exporters: readonly SchematicExporter[] = SCHEMATIC_EXPORTERS

export function exportSchematic(schematic: SchematicDocument, id: ExporterId, options?: ExportOptions): { filename: string; mime: string; delivery: 'download' | 'clipboard'; data: ExportData } {
  const exporter = exporters.find((candidate) => candidate.id === id)
  if (!exporter) throw new Error(`Unknown schematic exporter: ${id}`)
  return { filename: `player-statue${exporter.extension}`, mime: exporter.mime, delivery: exporter.delivery, data: exporter.convert(schematic, options) }
}