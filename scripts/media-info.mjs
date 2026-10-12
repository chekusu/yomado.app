// Reads what a video file actually contains, without ffprobe: MP4 boxes and WebM (EBML) elements.
//
//   import { mp4Info, webmInfo } from './media-info.mjs'
//   node scripts/media-info.mjs public/media/film-en-wide.mp4
//
// MP4: duration, frame rate and frame count of the video track, its size, codec, H.264 profile,
// level and chroma format (4:2:0 is yuv420p), and whether moov precedes mdat (faststart).
// WebM: duration, codec and size.
import { readFile } from 'node:fs/promises';

/** Top-level and nested MP4 boxes: { type, start (payload), end }. */
function boxes(buf, start = 0, end = buf.length) {
  const out = [];
  for (let off = start; off + 8 <= end; ) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(off + 8));
      header = 16;
    } else if (size === 0) size = end - off;
    if (size < header || off + size > end) throw new Error(`corrupt box ${type} at ${off}`);
    out.push({ type, start: off + header, end: off + size });
    off += size;
  }
  return out;
}

const child = (buf, box, type) => boxes(buf, box.start, box.end).find((b) => b.type === type);
const path = (buf, box, ...types) => types.reduce((b, t) => b && child(buf, b, t), box);

export async function mp4Info(file) {
  const buf = await readFile(file);
  const top = boxes(buf);
  const order = top.map((b) => b.type);
  const moov = top.find((b) => b.type === 'moov');
  if (!moov) throw new Error('no moov box');
  const traks = boxes(buf, moov.start, moov.end).filter((b) => b.type === 'trak');
  const video = traks.find((t) => {
    const hdlr = path(buf, t, 'mdia', 'hdlr');
    return hdlr && buf.toString('latin1', hdlr.start + 8, hdlr.start + 12) === 'vide';
  });
  if (!video) throw new Error('no video track');
  const tkhd = child(buf, video, 'tkhd');
  const tv = buf[tkhd.start];
  const dims = tkhd.start + (tv === 1 ? 88 : 76);
  const width = buf.readUInt32BE(dims) / 65536;
  const height = buf.readUInt32BE(dims + 4) / 65536;
  const mdhd = path(buf, video, 'mdia', 'mdhd');
  const mv = buf[mdhd.start];
  const timescale = mv === 1 ? buf.readUInt32BE(mdhd.start + 20) : buf.readUInt32BE(mdhd.start + 12);
  const units = mv === 1 ? Number(buf.readBigUInt64BE(mdhd.start + 24)) : buf.readUInt32BE(mdhd.start + 16);
  const stbl = path(buf, video, 'mdia', 'minf', 'stbl');
  const stts = child(buf, stbl, 'stts');
  const entries = buf.readUInt32BE(stts.start + 4);
  let frames = 0;
  const deltas = new Map();
  for (let i = 0; i < entries; i++) {
    const count = buf.readUInt32BE(stts.start + 8 + i * 8);
    const delta = buf.readUInt32BE(stts.start + 12 + i * 8);
    frames += count;
    deltas.set(delta, (deltas.get(delta) ?? 0) + count);
  }
  const delta = [...deltas.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const stsd = child(buf, stbl, 'stsd');
  const entry = boxes(buf, stsd.start + 8, stsd.end)[0];
  /** @type {Record<string, any>} */
  const info = {
    file,
    bytes: buf.length,
    order,
    faststart: order.indexOf('moov') >= 0 && order.indexOf('moov') < order.indexOf('mdat'),
    codec: entry.type,
    width,
    height,
    duration: units / timescale,
    frames,
    fps: timescale / delta,
  };
  if (entry.type === 'avc1') {
    // avc1 sample entry: 78 bytes of visual sample entry fields, then its boxes (avcC).
    const avcC = boxes(buf, entry.start + 78, entry.end).find((b) => b.type === 'avcC');
    const p = avcC.start;
    info.profile = buf[p + 1];
    info.level = buf[p + 3];
    info.codecs = `avc1.${[buf[p + 1], buf[p + 2], buf[p + 3]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    // Skip the SPS and PPS lists to the High-profile fields: chroma_format_idc 1 is 4:2:0.
    let q = p + 5;
    const sps = buf[q++] & 0x1f;
    for (let i = 0; i < sps; i++) q += 2 + buf.readUInt16BE(q);
    const pps = buf[q++];
    for (let i = 0; i < pps; i++) q += 2 + buf.readUInt16BE(q);
    if ([100, 110, 122, 144].includes(info.profile) && q < avcC.end) {
      info.chroma = buf[q] & 0x03;
      info.bitDepth = 8 + (buf[q + 1] & 0x07);
      info.pixelFormat = info.chroma === 1 && info.bitDepth === 8 ? 'yuv420p' : `chroma ${info.chroma}, ${info.bitDepth}-bit`;
    }
  }
  return info;
}

/** An EBML variable-length integer at `off`: its value (marker removed unless keepMarker) and length. */
function vint(buf, off, keepMarker = false) {
  const first = buf[off];
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
  if (len > 8) throw new Error(`bad EBML integer at ${off}`);
  let value = keepMarker ? first : first & (0xff >> len);
  for (let i = 1; i < len; i++) value = value * 256 + buf[off + i];
  return { value, len, unknown: !keepMarker && value === 2 ** (7 * len) - 1 };
}

function elements(buf, start, end) {
  const out = [];
  for (let off = start; off < end; ) {
    const id = vint(buf, off, true);
    const size = vint(buf, off + id.len);
    const data = off + id.len + size.len;
    const stop = size.unknown ? end : data + size.value;
    out.push({ id: id.value, start: data, end: stop });
    off = stop;
  }
  return out;
}

const EBML = { segment: 0x18538067, info: 0x1549a966, scale: 0x2ad7b1, duration: 0x4489, tracks: 0x1654ae6b, track: 0xae, codec: 0x86, video: 0xe0, width: 0xb0, height: 0xba, cluster: 0x1f43b675 };

export async function webmInfo(file) {
  const buf = await readFile(file);
  const segment = elements(buf, 0, buf.length).find((e) => e.id === EBML.segment);
  if (!segment) throw new Error('no Segment');
  const uint = (e) => {
    let v = 0;
    for (let i = e.start; i < e.end; i++) v = v * 256 + buf[i];
    return v;
  };
  /** @type {Record<string, any>} */
  const info = { file, bytes: buf.length };
  // Info and Tracks come before the first Cluster; stop there.
  for (let off = segment.start; off < segment.end; ) {
    const id = vint(buf, off, true);
    const size = vint(buf, off + id.len);
    const start = off + id.len + size.len;
    if (id.value === EBML.cluster) break;
    const e = { id: id.value, start, end: start + size.value };
    if (e.id === EBML.info) {
      let scale = 1_000_000;
      let duration = 0;
      for (const c of elements(buf, e.start, e.end)) {
        if (c.id === EBML.scale) scale = uint(c);
        if (c.id === EBML.duration) duration = c.end - c.start === 8 ? buf.readDoubleBE(c.start) : buf.readFloatBE(c.start);
      }
      info.duration = (duration * scale) / 1e9;
    }
    if (e.id === EBML.tracks) {
      for (const track of elements(buf, e.start, e.end).filter((c) => c.id === EBML.track)) {
        const parts = elements(buf, track.start, track.end);
        const video = parts.find((c) => c.id === EBML.video);
        if (!video) continue;
        const codec = parts.find((c) => c.id === EBML.codec);
        info.codec = buf.toString('latin1', codec.start, codec.end);
        for (const v of elements(buf, video.start, video.end)) {
          if (v.id === EBML.width) info.width = uint(v);
          if (v.id === EBML.height) info.height = uint(v);
        }
      }
    }
    off = e.end;
  }
  return info;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const file of process.argv.slice(2)) console.log(JSON.stringify(file.endsWith('.webm') ? await webmInfo(file) : await mp4Info(file)));
}
