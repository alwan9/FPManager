const fs = require('fs');
const path = require('path');

function getJpegSize(filepath) {
  const buffer = fs.readFileSync(filepath);
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] !== 0xff) {
      // search for next marker
      i++;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2;
    const len = buffer.readUInt16BE(i);
    i += len;
  }
  return null;
}

const dir = 'c:\\Users\\user\\Desktop\\FPManager\\assets\\img\\mockups';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.jpg')) {
    const size = getJpegSize(path.join(dir, file));
    console.log(`${file}: ${size ? `${size.width}x${size.height}` : 'unknown'}`);
  }
});
