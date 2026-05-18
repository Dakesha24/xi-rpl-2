const qrGridElement = document.getElementById("qr-grid");
const qrSubtitleElement = document.getElementById("qr-subtitle");

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
  `;

  return article;
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
