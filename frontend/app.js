const form = document.getElementById("profileForm");
const fullNameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phone");
const aboutInput = document.getElementById("about");
const messageEl = document.getElementById("formMessage");
const randomBtn = document.getElementById("randomBtn");
const randomCard = document.getElementById("randomCard");
const profilesList = document.getElementById("profilesList");
const countBadge = document.getElementById("countBadge");

let profiles = [];

async function loadProfiles() {
  try {
    const response = await fetch("../data/mock-users.json");
    if (!response.ok) throw new Error("Не удалось загрузить список участников");
    profiles = await response.json();
    renderProfiles();
  } catch (error) {
    randomCard.textContent =
      "Ошибка загрузки данных. Запусти проект через локальный сервер.";
    randomCard.classList.add("muted");
    console.error(error);
  }
}

function isValidProfile(profile) {
  return (
    typeof profile.fullName === "string" &&
    profile.fullName.trim().length >= 5 &&
    typeof profile.phone === "string" &&
    profile.phone.trim().length >= 7 &&
    typeof profile.about === "string" &&
    profile.about.trim().length >= 10
  );
}

function renderProfiles() {
  profilesList.innerHTML = "";
  profiles.forEach((profile) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="person-name">${escapeHtml(profile.fullName)}</div>
      <div class="person-phone">${escapeHtml(profile.phone)}</div>
      <div class="person-about">${escapeHtml(profile.about)}</div>
    `;
    profilesList.appendChild(li);
  });
  countBadge.textContent = String(profiles.length);
}

function pickRandomProfile() {
  const validProfiles = profiles.filter(isValidProfile);
  if (!validProfiles.length) return null;
  const index = Math.floor(Math.random() * validProfiles.length);
  return validProfiles[index];
}

function showRandomProfile() {
  const randomProfile = pickRandomProfile();
  if (!randomProfile) {
    randomCard.textContent = "Пока нет участников для знакомства";
    randomCard.classList.add("muted");
    return;
  }

  randomCard.classList.remove("muted");
  randomCard.innerHTML = `
    <div class="person-name">${escapeHtml(randomProfile.fullName)}</div>
    <div class="person-phone">${escapeHtml(randomProfile.phone)}</div>
    <div class="person-about">${escapeHtml(randomProfile.about)}</div>
  `;
}

function createProfilePayload() {
  return {
    id: `usr_${String(Date.now()).slice(-6)}`,
    fullName: fullNameInput.value.trim(),
    phone: phoneInput.value.trim(),
    about: aboutInput.value.trim(),
    createdAt: new Date().toISOString(),
  };
}

function validateForm(payload) {
  if (payload.fullName.length < 5) return "Укажи ФИО (минимум 5 символов).";
  if (payload.phone.length < 7) return "Укажи телефон (минимум 7 символов).";
  if (payload.about.length < 10) {
    return "Добавь описание деятельности (минимум 10 символов).";
  }
  return "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = createProfilePayload();
  const validationError = validateForm(payload);

  if (validationError) {
    messageEl.textContent = validationError;
    return;
  }

  profiles.unshift(payload);
  renderProfiles();
  messageEl.textContent = "Анкета сохранена.";
  form.reset();
});

randomBtn.addEventListener("click", showRandomProfile);

loadProfiles();
