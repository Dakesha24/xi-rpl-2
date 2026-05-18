const cardElement = document.getElementById("student-card");
const emptyStateElement = document.getElementById("empty-state");
const stateMessageElement = document.getElementById("state-message");
const studentNameElement = document.getElementById("student-name");
const studentQuoteElement = document.getElementById("student-quote");
const studentMessageElement = document.getElementById("student-message");
const footerTextElement = document.getElementById("footer-text");
const contentPanelElement = document.querySelector(".content-panel");
const studentCardTabElement = document.getElementById("student-card-tab");
const emptyStateTabElement = document.getElementById("empty-state-tab");

function getStudentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") || "").trim();
}

function findStudentById(studentId) {
  return students.find((student) => student.id === studentId);
}

function showStudentCard(student) {
  studentNameElement.textContent = student.name;
  studentQuoteElement.textContent = student.quote;
  studentMessageElement.textContent = student.message;
  studentMessageElement.hidden = !student.message;

  emptyStateElement.classList.add("hidden");
  cardElement.classList.remove("hidden");
  resetCardPosition(cardElement);
}

function showEmptyState(message) {
  stateMessageElement.textContent = `${message} Gunakan format URL seperti ?id=001.`;

  cardElement.classList.add("hidden");
  emptyStateElement.classList.remove("hidden");
  resetCardPosition(emptyStateElement);
}

function renderFooter() {
  if (!footerTextElement) {
    return;
  }

  footerTextElement.textContent = `${schoolInfo.className} | ${schoolInfo.subjectName} | ${schoolInfo.schoolName} | ${schoolInfo.graduationYear} | ${schoolInfo.authorName}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetCardPosition(element) {
  if (!contentPanelElement || !element) {
    return;
  }

  if (element.classList.contains("hidden")) {
    return;
  }

  const panelRect = contentPanelElement.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const maxX = Math.max(0, panelRect.width - elementRect.width);
  const maxY = Math.max(0, panelRect.height - elementRect.height);
  const defaultX = maxX / 2;
  const defaultY = maxY / 2;

  element.style.left = `${defaultX}px`;
  element.style.top = `${defaultY}px`;
  element.style.bottom = "auto";
}

function toggleLetterCard(element, tabElement) {
  if (!element || !tabElement) {
    return;
  }

  const nextExpanded = element.classList.contains("is-collapsed");
  element.classList.toggle("is-collapsed", !nextExpanded);
  tabElement.setAttribute("aria-expanded", String(nextExpanded));
  resetCardPosition(element);
}

function makeDraggable(element) {
  if (!element || !contentPanelElement) {
    return;
  }

  let isDragging = false;
  let startOffsetX = 0;
  let startOffsetY = 0;

  const onPointerMove = (event) => {
    if (!isDragging) {
      return;
    }

    const panelRect = contentPanelElement.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const nextX = event.clientX - panelRect.left - startOffsetX;
    const nextY = event.clientY - panelRect.top - startOffsetY;
    const maxX = Math.max(0, panelRect.width - elementRect.width);
    const maxY = Math.max(0, panelRect.height - elementRect.height);

    element.style.left = `${clamp(nextX, 0, maxX)}px`;
    element.style.top = `${clamp(nextY, 0, maxY)}px`;
    element.style.bottom = "auto";
  };

  const stopDragging = () => {
    isDragging = false;
    element.classList.remove("dragging");
  };

  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (event.target instanceof Element && event.target.closest(".letter-tab")) {
      return;
    }

    const elementRect = element.getBoundingClientRect();
    startOffsetX = event.clientX - elementRect.left;
    startOffsetY = event.clientY - elementRect.top;
    isDragging = true;
    element.classList.add("dragging");
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", stopDragging);
  element.addEventListener("pointercancel", stopDragging);
}

function initPage() {
  if (!cardElement || !emptyStateElement || !stateMessageElement || !studentNameElement || !studentQuoteElement || !studentMessageElement) {
    return;
  }

  renderFooter();
  makeDraggable(cardElement);
  makeDraggable(emptyStateElement);
  studentCardTabElement?.addEventListener("click", () => toggleLetterCard(cardElement, studentCardTabElement));
  emptyStateTabElement?.addEventListener("click", () => toggleLetterCard(emptyStateElement, emptyStateTabElement));

  const studentId = getStudentIdFromUrl();

  if (!studentId) {
    showEmptyState("Data siswa tidak tersedia.");
    return;
  }

  const student = findStudentById(studentId);

  if (!student) {
    showEmptyState(`Data untuk ID ${studentId} tidak ditemukan. Periksa kembali QR Code atau tautan yang digunakan.`);
    return;
  }

  showStudentCard(student);
}

initPage();
window.addEventListener("resize", () => {
  resetCardPosition(cardElement);
  resetCardPosition(emptyStateElement);
});
