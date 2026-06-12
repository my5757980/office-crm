// Minimal ZIP builder (STORE method — no compression).
// Image/PDF files are already compressed, so storing keeps it fast and dependency-free.

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// DOS date/time (fixed timestamp is fine for our use)
function dosDateTime(d: Date): { time: number; date: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

export interface ZipEntry {
  /** Path inside the archive, e.g. "CHASSIS123/Yard Pictures/img.jpg" */
  path: string;
  data: Buffer;
}

/** Build a ZIP archive (STORE/no-compression) from the given entries. */
export function createZip(entries: ZipEntry[], when: Date = new Date()): Buffer {
  const { time, date } = dosDateTime(when);
  const fileParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.path, "utf-8");
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // ── Local file header ──
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);   // signature
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0x0800, 6);       // flags (UTF-8 filename)
    local.writeUInt16LE(0, 8);            // compression = STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);        // compressed size
    local.writeUInt32LE(size, 22);        // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);           // extra length

    fileParts.push(local, nameBuf, entry.data);

    // ── Central directory header ──
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4);         // version made by
    central.writeUInt16LE(20, 6);         // version needed
    central.writeUInt16LE(0x0800, 8);     // flags
    central.writeUInt16LE(0, 10);         // compression
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);         // extra length
    central.writeUInt16LE(0, 32);         // comment length
    central.writeUInt16LE(0, 34);         // disk number
    central.writeUInt16LE(0, 36);         // internal attrs
    central.writeUInt32LE(0, 38);         // external attrs
    central.writeUInt32LE(offset, 42);    // local header offset

    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + entry.data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const centralSize = centralDir.length;
  const centralOffset = offset;

  // ── End of central directory ──
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...fileParts, centralDir, eocd]);
}

/** Make a string safe to use as a single path segment (folder or file name). */
export function safeSegment(s: string): string {
  return (s || "")
    .replace(/[/\\]/g, "-")        // path separators → dash
    .replace(/[<>:"|?*\x00-\x1f]/g, "") // illegal chars
    .replace(/\s+/g, " ")
    .trim() || "untitled";
}
