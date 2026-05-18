const qrGridElement = document.getElementById("qr-grid");
const qrSubtitleElement = document.getElementById("qr-subtitle");
const downloadAllButtonElement = document.getElementById("download-all-btn");
const downloadStatusElement = document.getElementById("download-status");
const textEncoder = new TextEncoder();

function getStudentPageBaseUrl() {
  return new URL("./", window.location.href);
}

function buildStudentUrl(studentId) {
  const url = new URL(getStudentPageBaseUrl());
  url.searchParams.set("id", studentId);
  return url.toString();
}

function buildQrImageUrl(text) {
  const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
  qrUrl.searchParams.set("size", "220x220");
  qrUrl.searchParams.set("margin", "10");
  qrUrl.searchParams.set("data", text);
  return qrUrl.toString();
}

function sanitizeFileName(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function createQrCard(student) {
  const studentUrl = buildStudentUrl(student.id);
  const article = document.createElement("article");
  article.className = "qr-card";

  article.innerHTML = `
    <div class="qr-card__code">
      <img src="${buildQrImageUrl(studentUrl)}" alt="QR Code untuk ${student.name}">
    </div>
    <h2>${student.id} - ${student.name}</h2>
    <p>Scan QR untuk membuka halaman siswa ini.</p>
    <a href="${studentUrl}" target="_blank" rel="noopener noreferrer">${studentUrl}</a>
    <span class="qr-card__download">Nama file: ${sanitizeFileName(student.name)}.png</span>
  `;

  return article;
}

function setDownloadStatus(message) {
  if (downloadStatusElement) {
    downloadStatusElement.textContent = message;
  }
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let current = i;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((current & 1) === 1) {
        current = 0xedb88320 ^ (current >>> 1);
      } else {
        current >>>= 1;
      }
    }

    table[i] = current >>> 0;
  }

  return table;
}

const crc32Table = createCrc32Table();

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);

  return { dosDate, dosTime };
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function buildStoredZip(files) {
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;
  const timestamp = getDosDateTime();

  files.forEach((file) => {
    const fileNameBytes = textEncoder.encode(file.name);
    const fileData = file.data;
    const fileCrc32 = crc32(fileData);

    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, timestamp.dosTime);
    writeUint16(localView, 12, timestamp.dosDate);
    writeUint32(localView, 14, fileCrc32);
    writeUint32(localView, 18, fileData.length);
    writeUint32(localView, 22, fileData.length);
    writeUint16(localView, 26, fileNameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(fileNameBytes, 30);

    localChunks.push(localHeader, fileData);

    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, timestamp.dosTime);
    writeUint16(centralView, 14, timestamp.dosDate);
    writeUint32(centralView, 16, fileCrc32);
    writeUint32(centralView, 20, fileData.length);
    writeUint32(centralView, 24, fileData.length);
    writeUint16(centralView, 28, fileNameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);
    centralHeader.set(fileNameBytes, 46);
    centralChunks.push(centralHeader);

    localOffset += localHeader.length + fileData.length;
  });

  const centralDirectory = concatUint8Arrays(centralChunks);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, localOffset);
  writeUint16(endView, 20, 0);

  return new Blob([concatUint8Arrays(localChunks), centralDirectory, endRecord], { type: "application/zip" });
}

async function fetchQrBlob(student) {
  const studentUrl = buildStudentUrl(student.id);
  const qrImageUrl = buildQrImageUrl(studentUrl);
  const response = await fetch(qrImageUrl);

  if (!response.ok) {
    throw new Error(`Gagal mengambil QR untuk ${student.name}`);
  }

  return response.blob();
}

async function downloadAllQrs() {
  if (!downloadAllButtonElement) {
    return;
  }

  downloadAllButtonElement.disabled = true;
  setDownloadStatus("Menyiapkan file ZIP...");

  try {
    const files = [];

    for (const [index, student] of students.entries()) {
      setDownloadStatus(`Mengambil QR ${index + 1} dari ${students.length}: ${student.name}`);
      const blob = await fetchQrBlob(student);
      const buffer = await blob.arrayBuffer();
      files.push({
        name: `${sanitizeFileName(student.name)}.png`,
        data: new Uint8Array(buffer),
      });
    }

    setDownloadStatus("Membuat file ZIP...");
    const zipBlob = buildStoredZip(files);
    const downloadUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "qr-code-siswa-xi-rpl-2.zip";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setDownloadStatus("ZIP berhasil diunduh.");
  } catch (error) {
    setDownloadStatus("Gagal membuat ZIP QR Code. Pastikan koneksi internet stabil lalu coba lagi.");
  } finally {
    downloadAllButtonElement.disabled = false;
  }
}

function renderQrCards() {
  if (!qrGridElement) {
    return;
  }

  const baseUrl = getStudentPageBaseUrl().toString();

  if (qrSubtitleElement) {
    qrSubtitleElement.textContent = `Setiap QR mengarah ke ${baseUrl}?id=001 sampai ?id=036.`;
  }

  students.forEach((student) => {
    qrGridElement.appendChild(createQrCard(student));
  });
}

renderQrCards();
downloadAllButtonElement?.addEventListener("click", downloadAllQrs);
