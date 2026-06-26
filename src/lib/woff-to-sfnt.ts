import zlib from "zlib";

/**
 * pdf-lib embeds whatever bytes it's given as the PDF FontFile program
 * verbatim — it does not decompress WOFF's zlib-compressed table container
 * into a real sfnt (TTF/OTF). PDF viewers built on FreeType (e.g. MuPDF,
 * Poppler) reject that container with "unknown file format" and silently
 * fall back to a substitute font with incomplete glyph coverage. Converting
 * to a real sfnt before embedding is required for the PDF to render
 * correctly outside lenient viewers like Chrome/PDF.js.
 */
export function woffToSfnt(woff: Buffer): Buffer {
  if (woff.length < 4 || woff.readUInt32BE(0) !== 0x774f4646) return woff;

  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);

  const tables: { tag: number; data: Buffer }[] = [];
  let p = 44;
  for (let i = 0; i < numTables; i++) {
    const tag = woff.readUInt32BE(p);
    const offset = woff.readUInt32BE(p + 4);
    const compLength = woff.readUInt32BE(p + 8);
    const origLength = woff.readUInt32BE(p + 12);
    const raw = woff.subarray(offset, offset + compLength);
    const data = compLength < origLength ? zlib.inflateSync(raw) : Buffer.from(raw);
    tables.push({ tag, data });
    p += 20;
  }
  tables.sort((a, b) => a.tag - b.tag);

  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  const rangeShift = numTables * 16 - searchRange;

  const header = Buffer.alloc(12);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(searchRange, 6);
  header.writeUInt16BE(entrySelector, 8);
  header.writeUInt16BE(rangeShift, 10);

  let offset = 12 + numTables * 16;
  const records: Buffer[] = [];
  const dataChunks: Buffer[] = [];
  for (const { tag, data } of tables) {
    const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4);
    data.copy(padded);

    const record = Buffer.alloc(16);
    record.writeUInt32BE(tag, 0);
    record.writeUInt32BE(tableChecksum(padded), 4);
    record.writeUInt32BE(offset, 8);
    record.writeUInt32BE(data.length, 12);
    records.push(record);
    dataChunks.push(padded);
    offset += padded.length;
  }

  return Buffer.concat([header, ...records, ...dataChunks]);
}

function tableChecksum(paddedTable: Buffer): number {
  let sum = 0;
  for (let i = 0; i < paddedTable.length; i += 4) {
    sum = (sum + paddedTable.readUInt32BE(i)) % 4294967296;
  }
  return sum;
}
