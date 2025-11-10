document.addEventListener("DOMContentLoaded", () => {
  const settingsBtn = document.getElementById("settings");
  const holder = document.getElementById("holder");
  const settingsSlide = document.getElementById("settings-slide");
  const backBtn = document.getElementById("back-btn");
  const saveBtn = document.getElementById("save-settings");

  // показать настройки
  settingsBtn.addEventListener("click", () => {
    holder.style.transition = "left 0.3s ease-in-out";
    holder.style.left = "-100%";
    settingsSlide.classList.add("active");
  });

  // вернуться назад
  backBtn.addEventListener("click", () => {
    holder.style.left = "0";
    settingsSlide.classList.remove("active");
  });

  // сохранить настройки
  saveBtn.addEventListener("click", () => {
    const inlineEnabled = document.getElementById("inline-switch").checked;
    const contextEnabled = document.getElementById("context-switch").checked;
    const lang = document.getElementById("language-select").value;

    chrome.storage.sync.set({
      inlineEnabled,
      contextEnabled,
      lang,
    });

    alert("Settings saved");
  });

  // подгрузить сохранённые настройки
  chrome.storage.sync.get(
    ["inlineEnabled", "contextEnabled", "lang"],
    (data) => {
      document.getElementById("inline-switch").checked =
        data.inlineEnabled ?? false;
      document.getElementById("context-switch").checked =
        data.contextEnabled ?? false;
      document.getElementById("language-select").value = data.lang ?? "en";
    },
  );
});
