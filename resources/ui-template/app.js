const shell = document.querySelector(".app-shell");
const themeToggle = document.querySelector("#themeToggle");
const componentDialog = document.querySelector("#componentDialog");
const openDialog = document.querySelector("#openDialog");
const confirmDialog = document.querySelector("#confirmDialog");
const openConfirmDialog = document.querySelector("#openConfirmDialog");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");
const toast = document.querySelector("#toast");
const toastButton = document.querySelector("#toastButton");
const retryStateButton = document.querySelector("#retryStateButton");
const advanceUploadButton = document.querySelector("#advanceUploadButton");
const uploadProgressBar = document.querySelector("#uploadProgressBar");
const uploadProgressLabel = document.querySelector("#uploadProgressLabel");
const resourceSearch = document.querySelector("#resourceSearch");
const resourceRows = Array.from(document.querySelectorAll(".resource-row"));
const listboxFields = Array.from(document.querySelectorAll("[data-listbox]"));
const menuAnchors = Array.from(document.querySelectorAll("[data-menu]"));
const contextTarget = document.querySelector("[data-context-target]");
const contextOpen = document.querySelector("[data-context-open]");
const contextMenu = document.querySelector("#contextMenu");
const toastMessage = document.querySelector("#toastMessage");
const submenuAnchors = Array.from(document.querySelectorAll("[data-submenu]"));
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsClose = document.querySelector("#settingsClose");
const settingsTabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
const chatRailButton = document.querySelector("#chatRailButton");
const railChatPanel = document.querySelector("#railChatPanel");
const railChatClose = document.querySelector("#railChatClose");
const chatThread = document.querySelector("#chatThread");
const chatInput = document.querySelector("#chatInput");
const attachFileButton = document.querySelector("#attachFileButton");
const micButton = document.querySelector("#micButton");
const sendChatButton = document.querySelector("#sendChatButton");
const composerAttachments = document.querySelector("#composerAttachments");

function setActiveWithin(groupSelector, activeClass = "active") {
  document.querySelectorAll(groupSelector).forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.parentElement;
      group.querySelectorAll(groupSelector).forEach((item) => {
        item.classList.remove(activeClass);
        item.setAttribute("aria-selected", "false");
      });
      button.classList.add(activeClass);
      button.setAttribute("aria-selected", "true");
    });
  });
}

setActiveWithin(".segment");
setActiveWithin(".tab");

document.querySelectorAll(".resource-row").forEach((row) => {
  row.addEventListener("click", () => {
    document.querySelectorAll(".resource-row").forEach((item) => item.classList.remove("selected"));
    row.classList.add("selected");
  });
});

function closeListbox(field) {
  const trigger = field.querySelector(".listbox-trigger");
  field.classList.remove("open");
  trigger.setAttribute("aria-expanded", "false");
  field.querySelectorAll(".listbox-option").forEach((option) => option.classList.remove("focused"));
}

function openListbox(field, focusSelected = false) {
  closeAllMenus();
  listboxFields.forEach((item) => {
    if (item !== field) closeListbox(item);
  });
  const trigger = field.querySelector(".listbox-trigger");
  const selected = field.querySelector(".listbox-option.selected") || field.querySelector(".listbox-option");
  field.classList.add("open");
  trigger.setAttribute("aria-expanded", "true");
  if (focusSelected && selected) {
    selected.classList.add("focused");
    selected.focus();
  }
}

function selectListboxOption(field, option) {
  const value = field.querySelector(".listbox-value");
  const label = option.querySelector("span")?.textContent.trim() || option.textContent.trim();
  value.textContent = label;
  field.querySelectorAll(".listbox-option").forEach((item) => {
    item.classList.remove("selected", "focused");
    item.setAttribute("aria-selected", "false");
  });
  option.classList.add("selected");
  option.setAttribute("aria-selected", "true");
  closeListbox(field);
  field.querySelector(".listbox-trigger").focus();
}

function focusListboxOption(field, direction) {
  const options = Array.from(field.querySelectorAll(".listbox-option"));
  const current = field.querySelector(".listbox-option.focused") || document.activeElement;
  const currentIndex = Math.max(0, options.indexOf(current));
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  options.forEach((option) => option.classList.remove("focused"));
  options[nextIndex].classList.add("focused");
  options[nextIndex].focus();
}

listboxFields.forEach((field) => {
  const trigger = field.querySelector(".listbox-trigger");
  const options = Array.from(field.querySelectorAll(".listbox-option"));

  trigger.addEventListener("click", () => {
    if (field.classList.contains("open")) {
      closeListbox(field);
    } else {
      openListbox(field);
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openListbox(field, true);
    }
  });

  options.forEach((option) => {
    option.addEventListener("click", () => selectListboxOption(field, option));
    option.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusListboxOption(field, 1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusListboxOption(field, -1);
      }
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        selectListboxOption(field, option);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeListbox(field);
        trigger.focus();
      }
    });
  });
});

document.addEventListener("click", (event) => {
  listboxFields.forEach((field) => {
    if (!field.contains(event.target)) closeListbox(field);
  });
});

function closeMenu(anchor) {
  const trigger = anchor.querySelector(".menu-trigger");
  anchor.classList.remove("open", "open-up", "align-end");
  trigger.setAttribute("aria-expanded", "false");
  anchor.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("focused"));
  closeAllSubmenus(anchor);
}

function closeContextMenu() {
  contextMenu.classList.remove("open");
  contextMenu.setAttribute("aria-hidden", "true");
  contextMenu.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("focused"));
}

function closeSubmenu(anchor) {
  const trigger = anchor.querySelector(".submenu-trigger");
  anchor.classList.remove("open", "align-left");
  trigger.setAttribute("aria-expanded", "false");
  anchor.querySelectorAll(".submenu .menu-item").forEach((item) => item.classList.remove("focused"));
}

function closeAllSubmenus(scope = document) {
  scope.querySelectorAll("[data-submenu]").forEach(closeSubmenu);
}

function closeAllMenus() {
  menuAnchors.forEach(closeMenu);
  closeContextMenu();
}

function closeRailChat({ focusButton = false } = {}) {
  listboxFields.forEach(closeListbox);
  railChatPanel.classList.remove("open");
  railChatPanel.setAttribute("aria-hidden", "true");
  chatRailButton.setAttribute("aria-expanded", "false");
  chatRailButton.classList.remove("active");
  if (focusButton) chatRailButton.focus();
}

function openRailChat() {
  listboxFields.forEach(closeListbox);
  closeAllMenus();
  closeSettingsPanel();
  railChatPanel.classList.add("open");
  railChatPanel.setAttribute("aria-hidden", "false");
  chatRailButton.setAttribute("aria-expanded", "true");
  chatRailButton.classList.add("active");
}

function toggleRailChat() {
  if (railChatPanel.classList.contains("open")) {
    closeRailChat();
  } else {
    openRailChat();
  }
}

function closeSettingsPanel() {
  settingsPanel.classList.remove("open");
  settingsPanel.setAttribute("aria-hidden", "true");
  settingsButton.setAttribute("aria-expanded", "false");
  settingsButton.classList.remove("active");
}

function openSettingsPanel() {
  listboxFields.forEach(closeListbox);
  closeAllMenus();
  closeRailChat();
  settingsPanel.classList.add("open");
  settingsPanel.setAttribute("aria-hidden", "false");
  settingsButton.setAttribute("aria-expanded", "true");
  settingsButton.classList.add("active");
}

function toggleSettingsPanel() {
  if (settingsPanel.classList.contains("open")) {
    closeSettingsPanel();
  } else {
    openSettingsPanel();
  }
}

function getMenuItems(menu) {
  if (menu.classList.contains("submenu")) {
    return Array.from(menu.querySelectorAll(":scope > .menu-item"));
  }
  return Array.from(menu.querySelectorAll(":scope > .menu-item, :scope > .submenu-anchor > .submenu-trigger"));
}

function focusMenuItem(menu, direction) {
  const items = getMenuItems(menu);
  const current = menu.querySelector(".menu-item.focused") || document.activeElement;
  const currentIndex = Math.max(0, items.indexOf(current));
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  items.forEach((item) => item.classList.remove("focused"));
  items[nextIndex].classList.add("focused");
  items[nextIndex].focus();
}

function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function openMenu(anchor, focusFirst = false) {
  listboxFields.forEach(closeListbox);
  menuAnchors.forEach((item) => {
    if (item !== anchor) closeMenu(item);
  });
  closeContextMenu();
  const trigger = anchor.querySelector(".menu-trigger");
  const menu = anchor.querySelector(".popup-menu");
  anchor.classList.add("open");
  trigger.setAttribute("aria-expanded", "true");
  const rect = menu.getBoundingClientRect();
  if (rect.bottom > window.innerHeight - 8) {
    anchor.classList.add("open-up");
  }
  if (rect.right > window.innerWidth - 8) {
    anchor.classList.add("align-end");
  }
  if (focusFirst) {
    focusMenuItem(menu, 0);
  }
}

function openSubmenu(anchor, focusFirst = false) {
  const rootMenu = anchor.closest(".popup-menu");
  rootMenu.querySelectorAll("[data-submenu]").forEach((item) => {
    if (item !== anchor) closeSubmenu(item);
  });
  const trigger = anchor.querySelector(".submenu-trigger");
  const menu = anchor.querySelector(".submenu");
  anchor.classList.add("open");
  trigger.setAttribute("aria-expanded", "true");
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth - 8) {
    anchor.classList.add("align-left");
  }
  if (focusFirst) {
    focusMenuItem(menu, 0);
  }
}

function runMenuItem(item) {
  showToast(item.dataset.toast || item.textContent.trim());
  closeAllMenus();
}

function positionContextMenu(x, y) {
  const menuWidth = 260;
  const menuHeight = 152;
  const left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8));
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
}

function openContextMenu(x, y, focusFirst = false) {
  listboxFields.forEach(closeListbox);
  menuAnchors.forEach(closeMenu);
  positionContextMenu(x, y);
  contextMenu.classList.add("open");
  contextMenu.setAttribute("aria-hidden", "false");
  if (focusFirst) {
    focusMenuItem(contextMenu, 0);
  }
}

menuAnchors.forEach((anchor) => {
  const trigger = anchor.querySelector(".menu-trigger");
  const menu = anchor.querySelector(".popup-menu");

  trigger.addEventListener("click", () => {
    if (anchor.classList.contains("open")) {
      closeMenu(anchor);
    } else {
      openMenu(anchor);
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu(anchor, true);
    }
  });

  menu.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", () => {
      const submenuAnchor = item.closest("[data-submenu]");
      if (item.classList.contains("submenu-trigger") && submenuAnchor) {
        openSubmenu(submenuAnchor, false);
        return;
      }
      runMenuItem(item);
    });
    item.addEventListener("keydown", (event) => {
      const submenuAnchor = item.closest("[data-submenu]");
      const activeMenu = item.closest(".submenu") || menu;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusMenuItem(activeMenu, 1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusMenuItem(activeMenu, -1);
      }
      if (event.key === "ArrowRight" && item.classList.contains("submenu-trigger") && submenuAnchor) {
        event.preventDefault();
        openSubmenu(submenuAnchor, true);
      }
      if (event.key === "ArrowLeft" && submenuAnchor && item.closest(".submenu")) {
        event.preventDefault();
        closeSubmenu(submenuAnchor);
        submenuAnchor.querySelector(".submenu-trigger").focus();
      }
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        if (item.classList.contains("submenu-trigger") && submenuAnchor) {
          openSubmenu(submenuAnchor, true);
          return;
        }
        runMenuItem(item);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(anchor);
        trigger.focus();
      }
    });
  });
});

submenuAnchors.forEach((anchor) => {
  const trigger = anchor.querySelector(".submenu-trigger");
  anchor.addEventListener("mouseenter", () => openSubmenu(anchor));
  trigger.addEventListener("focus", () => {
    if (anchor.closest(".menu-anchor")?.classList.contains("open")) {
      openSubmenu(anchor);
    }
  });
});

contextTarget.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  openContextMenu(event.clientX, event.clientY);
});

contextOpen.addEventListener("click", () => {
  const rect = contextOpen.getBoundingClientRect();
  openContextMenu(rect.left, rect.bottom + 6);
});

contextMenu.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => runMenuItem(item));
  item.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusMenuItem(contextMenu, 1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusMenuItem(contextMenu, -1);
    }
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      runMenuItem(item);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeContextMenu();
      contextTarget.focus();
    }
  });
});

document.addEventListener("click", (event) => {
  menuAnchors.forEach((anchor) => {
    if (!anchor.contains(event.target)) closeMenu(anchor);
  });
  if (!contextMenu.contains(event.target) && !contextTarget.contains(event.target)) {
    closeContextMenu();
  }
});

settingsButton.addEventListener("click", toggleSettingsPanel);

chatRailButton.addEventListener("click", toggleRailChat);

railChatClose.addEventListener("click", () => {
  closeRailChat({ focusButton: true });
});

settingsClose.addEventListener("click", () => {
  closeSettingsPanel();
  settingsButton.focus();
});

settingsTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.settingsTab;
    settingsTabs.forEach((item) => {
      item.classList.toggle("active", item === tab);
      item.setAttribute("aria-selected", item === tab ? "true" : "false");
    });
    document.querySelectorAll("[data-settings-view]").forEach((view) => {
      view.classList.toggle("active", view.dataset.settingsView === target);
    });
  });
});

document.querySelectorAll("[data-settings-toast]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(button.dataset.settingsToast);
  });
});

document.querySelectorAll("[data-ui-toast]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(button.dataset.uiToast);
  });
});

function bindAttachmentRemoval(scope = document) {
  scope.querySelectorAll(".attachment-chip button").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".attachment-chip")?.remove();
      showToast("Attachment removed");
    });
  });
}

function createAttachmentChip(name, icon = "attach_file") {
  const chip = document.createElement("span");
  chip.className = "attachment-chip";
  chip.innerHTML = `
    <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
    ${name}
    <button type="button" aria-label="Remove ${name}">
      <span class="material-symbols-rounded" aria-hidden="true">close</span>
    </button>
  `;
  composerAttachments.appendChild(chip);
  bindAttachmentRemoval(chip);
}

function appendUserMessage(text) {
  const message = document.createElement("article");
  message.className = "chat-message user";
  message.innerHTML = `
    <div class="chat-bubble">
      <div class="chat-meta">
        <strong>You</strong>
        <span>Queued</span>
      </div>
      <p></p>
    </div>
    <div class="chat-avatar user-avatar">Y</div>
  `;
  message.querySelector("p").textContent = text;
  chatThread.appendChild(message);
  chatThread.scrollTop = chatThread.scrollHeight;
}

bindAttachmentRemoval();

attachFileButton.addEventListener("click", () => {
  const count = composerAttachments.querySelectorAll(".attachment-chip").length + 1;
  createAttachmentChip(`reference-${count}.png`, "image");
  showToast("File attached");
});

micButton.addEventListener("click", () => {
  const recording = !micButton.classList.contains("recording");
  micButton.classList.toggle("recording", recording);
  micButton.setAttribute("aria-pressed", recording ? "true" : "false");
  micButton.querySelector(".material-symbols-rounded").textContent = recording ? "graphic_eq" : "mic";
  showToast(recording ? "Voice input listening" : "Voice input stopped");
});

sendChatButton.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) {
    showToast("Message is empty");
    return;
  }
  appendUserMessage(text);
  chatInput.value = "";
  showToast("Message sent");
});

document.addEventListener("click", (event) => {
  if (settingsPanel.classList.contains("open") && event.target === settingsPanel) {
    closeSettingsPanel();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (settingsPanel.classList.contains("open")) {
    closeSettingsPanel();
    settingsButton.focus();
    return;
  }
  if (railChatPanel.classList.contains("open")) {
    closeRailChat({ focusButton: true });
  }
});

themeToggle.addEventListener("click", () => {
  const nextTheme = shell.dataset.theme === "dark" ? "light" : "dark";
  shell.dataset.theme = nextTheme;
  themeToggle.querySelector(".material-symbols-rounded").textContent =
    nextTheme === "dark" ? "light_mode" : "dark_mode";
});

openDialog.addEventListener("click", () => {
  if (typeof componentDialog.showModal === "function") {
    componentDialog.showModal();
  }
});

openConfirmDialog.addEventListener("click", () => {
  if (typeof confirmDialog.showModal === "function") {
    confirmDialog.showModal();
  }
});

confirmDeleteButton.addEventListener("click", () => {
  showToast("Component set deleted");
});

retryStateButton.addEventListener("click", () => {
  showToast("Retry queued");
});

advanceUploadButton.addEventListener("click", () => {
  const current = parseInt(uploadProgressLabel.textContent, 10);
  const next = current >= 100 ? 72 : Math.min(100, current + 14);
  uploadProgressBar.style.width = `${next}%`;
  uploadProgressLabel.textContent = `${next}%`;
  showToast(next === 100 ? "Upload complete" : "Upload advanced");
});

toastButton.addEventListener("click", () => {
  showToast("Preview request queued");
});

resourceSearch.addEventListener("input", () => {
  const query = resourceSearch.value.trim().toLowerCase();
  resourceRows.forEach((row) => {
    row.hidden = query.length > 0 && !row.dataset.name.includes(query);
  });
});
