const STORAGE_KEY = "filesphere.files.v1";

const defaultFiles = [
  {
    name: "welcome.txt",
    content: "Welcome to FileSphere.\n\nCreate, edit, search, import, and download small files from this browser workspace.",
  },
  {
    name: "tasks.json",
    content: '{\n  "project": "FileSphere",\n  "status": "small web application"\n}\n',
  },
  {
    name: "snippet.cpp",
    content: '#include <iostream>\n\nint main() {\n  std::cout << "FileSphere";\n  return 0;\n}\n',
  },
];

const state = {
  files: loadFiles(),
  activeId: "",
  filter: "all",
  search: "",
  sort: "name",
};

const elements = {
  fileCount: document.querySelector("#fileCount"),
  totalSize: document.querySelector("#totalSize"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  fileList: document.querySelector("#fileList"),
  template: document.querySelector("#fileItemTemplate"),
  form: document.querySelector("#fileForm"),
  fileName: document.querySelector("#fileName"),
  fileContent: document.querySelector("#fileContent"),
  fileExtension: document.querySelector("#fileExtension"),
  fileSize: document.querySelector("#fileSize"),
  fileUpdated: document.querySelector("#fileUpdated"),
  newFileButton: document.querySelector("#newFileButton"),
  deleteButton: document.querySelector("#deleteButton"),
  downloadButton: document.querySelector("#downloadButton"),
  uploadInput: document.querySelector("#uploadInput"),
  filterButtons: document.querySelectorAll(".filter-button"),
};

initialize();

function initialize() {
  state.activeId = state.files[0]?.id || "";
  bindEvents();
  render();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderList();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderList();
  });

  elements.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      elements.filterButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderList();
    });
  });

  elements.newFileButton.addEventListener("click", () => {
    const file = createFile("untitled.txt", "");
    state.files.unshift(file);
    state.activeId = file.id;
    persist();
    render();
    elements.fileName.focus();
    elements.fileName.select();
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveActiveFile();
  });

  elements.deleteButton.addEventListener("click", () => {
    if (!state.activeId) return;
    state.files = state.files.filter((file) => file.id !== state.activeId);
    state.activeId = state.files[0]?.id || "";
    persist();
    render();
  });

  elements.downloadButton.addEventListener("click", downloadActiveFile);

  elements.uploadInput.addEventListener("change", async (event) => {
    const [incomingFile] = event.target.files;
    if (!incomingFile) return;

    const content = await incomingFile.text();
    const file = createFile(uniqueName(incomingFile.name), content);
    state.files.unshift(file);
    state.activeId = file.id;
    persist();
    render();
    event.target.value = "";
  });
}

function loadFiles() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return defaultFiles.map((file) => createFile(file.name, file.content));
}

function createFile(name, content) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    content,
    createdAt: now,
    updatedAt: now,
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.files));
}

function render() {
  renderStats();
  renderList();
  renderEditor();
}

function renderStats() {
  const totalBytes = state.files.reduce((sum, file) => sum + fileSize(file), 0);
  elements.fileCount.textContent = String(state.files.length);
  elements.totalSize.textContent = formatBytes(totalBytes);
}

function renderList() {
  elements.fileList.textContent = "";
  const files = filteredFiles();

  if (files.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No files match this view.";
    elements.fileList.append(empty);
    return;
  }

  files.forEach((file) => {
    const item = elements.template.content.firstElementChild.cloneNode(true);
    item.classList.toggle("active", file.id === state.activeId);
    item.querySelector("strong").textContent = file.name;
    item.querySelector("small").textContent = `${extensionLabel(file)} • ${formatDate(file.updatedAt)}`;
    item.querySelector(".file-size").textContent = formatBytes(fileSize(file));
    item.addEventListener("click", () => {
      state.activeId = file.id;
      renderList();
      renderEditor();
    });
    elements.fileList.append(item);
  });
}

function renderEditor() {
  const file = activeFile();
  const hasFile = Boolean(file);
  elements.fileName.disabled = !hasFile;
  elements.fileContent.disabled = !hasFile;
  elements.deleteButton.disabled = !hasFile;
  elements.downloadButton.disabled = !hasFile;

  if (!file) {
    elements.fileName.value = "";
    elements.fileContent.value = "";
    elements.fileExtension.textContent = "No extension";
    elements.fileSize.textContent = "0 B";
    elements.fileUpdated.textContent = "Not saved";
    return;
  }

  elements.fileName.value = file.name;
  elements.fileContent.value = file.content;
  elements.fileExtension.textContent = extensionLabel(file);
  elements.fileSize.textContent = formatBytes(fileSize(file));
  elements.fileUpdated.textContent = `Updated ${formatDate(file.updatedAt)}`;
}

function saveActiveFile() {
  const file = activeFile();
  if (!file) return;

  const nextName = elements.fileName.value.trim();
  if (!nextName) {
    elements.fileName.focus();
    return;
  }

  file.name = uniqueName(nextName, file.id);
  file.content = elements.fileContent.value;
  file.updatedAt = new Date().toISOString();
  persist();
  render();
}

function downloadActiveFile() {
  const file = activeFile();
  if (!file) return;

  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

function filteredFiles() {
  return [...state.files]
    .filter((file) => matchesFilter(file) && matchesSearch(file))
    .sort((a, b) => compareFiles(a, b));
}

function matchesFilter(file) {
  const ext = extensionOf(file.name);
  if (state.filter === "text") return ["txt", "md", "log"].includes(ext);
  if (state.filter === "code") return ["c", "cpp", "css", "html", "js", "py"].includes(ext);
  if (state.filter === "data") return ["csv", "json", "xml"].includes(ext);
  return true;
}

function matchesSearch(file) {
  if (!state.search) return true;
  return `${file.name} ${extensionOf(file.name)} ${file.content}`.toLowerCase().includes(state.search);
}

function compareFiles(a, b) {
  if (state.sort === "size") return fileSize(b) - fileSize(a);
  if (state.sort === "updated") return new Date(b.updatedAt) - new Date(a.updatedAt);
  if (state.sort === "extension") return extensionOf(a.name).localeCompare(extensionOf(b.name));
  return a.name.localeCompare(b.name);
}

function activeFile() {
  return state.files.find((file) => file.id === state.activeId);
}

function fileSize(file) {
  return new Blob([file.content]).size;
}

function extensionOf(name) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function extensionLabel(file) {
  const ext = extensionOf(file.name);
  return ext ? `.${ext}` : "No extension";
}

function uniqueName(name, currentId = "") {
  const cleanName = name.replace(/[\\/:*?"<>|]/g, "-").trim() || "untitled.txt";
  const exists = state.files.some((file) => file.id !== currentId && file.name.toLowerCase() === cleanName.toLowerCase());
  if (!exists) return cleanName;

  const dotIndex = cleanName.lastIndexOf(".");
  const base = dotIndex > 0 ? cleanName.slice(0, dotIndex) : cleanName;
  const ext = dotIndex > 0 ? cleanName.slice(dotIndex) : "";
  let counter = 2;
  let nextName = `${base}-${counter}${ext}`;

  while (state.files.some((file) => file.id !== currentId && file.name.toLowerCase() === nextName.toLowerCase())) {
    counter += 1;
    nextName = `${base}-${counter}${ext}`;
  }

  return nextName;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
