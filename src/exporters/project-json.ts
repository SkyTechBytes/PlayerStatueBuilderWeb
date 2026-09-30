import type { SchematicDocument } from '../domain/schematic'
import { createCanonicalStatue } from '../domain/canonical-statue'

export function createProjectJson(schematic: SchematicDocument): string {
  return JSON.stringify(createCanonicalStatue(schematic), null, 2)
}
