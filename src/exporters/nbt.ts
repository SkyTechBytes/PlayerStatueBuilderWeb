export const NBT = {
  byte: (value: number): NbtTag => ({ type: 1, value }),
  short: (value: number): NbtTag => ({ type: 2, value }),
  int: (value: number): NbtTag => ({ type: 3, value }),
  long: (value: number | bigint): NbtTag => ({ type: 4, value: BigInt(value) }),
  byteArray: (value: Uint8Array): NbtTag => ({ type: 7, value }),
  string: (value: string): NbtTag => ({ type: 8, value }),
  list: (itemType: NbtType, value: NbtTag[]): NbtTag => ({ type: 9, itemType, value }),
  compound: (value: Record<string, NbtTag>): NbtTag => ({ type: 10, value }),
  intArray: (value: number[]): NbtTag => ({ type: 11, value }),
  longArray: (value: bigint[]): NbtTag => ({ type: 12, value }),
} as const

type NbtType = 1 | 2 | 3 | 4 | 7 | 8 | 9 | 10 | 11 | 12

export interface NbtTag {
  type: NbtType
  value: number | bigint | string | Uint8Array | number[] | bigint[] | NbtTag[] | Record<string, NbtTag>
  itemType?: NbtType
}

class Writer {
  private bytes: number[] = []
  private readonly encoder = new TextEncoder()

  result(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }

  u8(value: number) {
    this.bytes.push(value & 0xff)
  }

  i16(value: number) {
    this.number(value, 2, (view) => view.setInt16(0, value, false))
  }

  i32(value: number) {
    this.number(value, 4, (view) => view.setInt32(0, value, false))
  }

  i64(value: bigint) {
    const buffer = new ArrayBuffer(8)
    new DataView(buffer).setBigInt64(0, value, false)
    this.bytes.push(...new Uint8Array(buffer))
  }

  string(value: string) {
    const encoded = this.encoder.encode(value)
    this.i16(encoded.length)
    this.bytes.push(...encoded)
  }

  raw(value: Uint8Array) {
    this.bytes.push(...value)
  }

  private number(_value: number, size: number, write: (view: DataView) => void) {
    const buffer = new ArrayBuffer(size)
    write(new DataView(buffer))
    this.bytes.push(...new Uint8Array(buffer))
  }
}

export function encodeNbt(root: NbtTag, rootName = ''): Uint8Array {
  if (root.type !== 10) throw new Error('NBT root must be a compound')
  const writer = new Writer()
  writer.u8(root.type)
  writer.string(rootName)
  writePayload(writer, root)
  return writer.result()
}

function writePayload(writer: Writer, tag: NbtTag): void {
  switch (tag.type) {
    case 1:
      writer.u8(tag.value as number)
      break
    case 2:
      writer.i16(tag.value as number)
      break
    case 3:
      writer.i32(tag.value as number)
      break
    case 4:
      writer.i64(tag.value as bigint)
      break
    case 7: {
      const value = tag.value as Uint8Array
      writer.i32(value.length)
      writer.raw(value)
      break
    }
    case 8:
      writer.string(tag.value as string)
      break
    case 9: {
      const value = tag.value as NbtTag[]
      if (!tag.itemType) throw new Error('NBT list requires an item type')
      writer.u8(tag.itemType)
      writer.i32(value.length)
      for (const item of value) {
        if (item.type !== tag.itemType) throw new Error('NBT list contains a mismatched tag type')
        writePayload(writer, item)
      }
      break
    }
    case 10:
      for (const [name, child] of Object.entries(tag.value as Record<string, NbtTag>)) {
        writer.u8(child.type)
        writer.string(name)
        writePayload(writer, child)
      }
      writer.u8(0)
      break
    case 11: {
      const value = tag.value as number[]
      writer.i32(value.length)
      for (const item of value) writer.i32(item)
      break
    }
    case 12: {
      const value = tag.value as bigint[]
      writer.i32(value.length)
      for (const item of value) writer.i64(item)
      break
    }
  }
}