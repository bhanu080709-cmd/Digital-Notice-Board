const API_BASE = window.CAMPUSBOARD_API_URL || "http://localhost:3000/api";
const grid = document.getElementById("notice-grid");
const statusEl = document.getElementById("notice-status");
const emptyState = document.getElementById("empty-state");
const countEl = document.getElementById("notice-count");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const sortFilter = document.getElementById("sort-filter");
const noticeForm = document.getElementById("notice-form");
const submitButton = document.getElementById("submit-button");
const formMessage = document.getElementById("form-message");
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const toast = document.getElementById("toast");
let notices = [];
let toastTimer;

document.getElementById("year").textContent = new Date().getFullYear();

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
function setFormMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}
function dateLabel(value) {
  if (!value) return "No date set";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Date not set" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function createdLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function categoryClass(category) {
  return String(category || "General").toLowerCase().replace(/[^a-z]/g, "");
}
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
    });
  } catch {
    throw new Error("Could not connect to the backend. Start the server and check the API URL.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
async function loadNotices() {
  grid.innerHTML = "";
  emptyState.hidden = true;
  statusEl.textContent = "Loading campus notices…";
  countEl.textContent = "Loading…";
  try {
    const payload = await apiRequest("/notices");
    notices = payload.data || [];
    statusEl.textContent = "";
    renderNotices();
  } catch (error) {
    notices = [];
    countEl.textContent = "Not available";
    statusEl.textContent = error.message;
    emptyState.hidden = true;
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><h3>Couldn’t load notices</h3><p>${escapeHTML(error.message)}</p><button class="button button-dark" id="retry-load">Try again</button></div>`;
    document.getElementById("retry-load").addEventListener("click", loadNotices);
  }
}
function renderNotices() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const sort = sortFilter.value;
  const filtered = notices.filter((notice) => {
    const matchesCategory = category === "all" || notice.category === category;
    const searchable = [notice.title, notice.description, notice.author, notice.category, notice.contact].join(" ").toLowerCase();
    return matchesCategory && searchable.includes(query);
  });
  filtered.sort((a, b) => {
    const comparison = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return sort === "oldest" ? -comparison : comparison;
  });
  countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "notice" : "notices"} found`;
  emptyState.hidden = filtered.length !== 0;
  grid.innerHTML = filtered.map((notice) => {
    const title = escapeHTML(notice.title);
    const categoryName = escapeHTML(notice.category);
    const author = escapeHTML(notice.author);
    const initial = escapeHTML((notice.author || "C").trim().charAt(0).toUpperCase() || "C");
    const description = escapeHTML(notice.description);
    const contact = notice.contact ? `<div class="card-contact">Contact: ${escapeHTML(notice.contact)}</div>` : "";
    const eventDate = notice.event_date ? `<span class="card-date">Due ${escapeHTML(dateLabel(notice.event_date))}</span>` : `<span class="card-date">${escapeHTML(createdLabel(notice.created_at))}</span>`;
    return `<article class="notice-card">
      <div class="card-top"><span class="category-pill ${categoryClass(notice.category)}">${categoryName}</span>${eventDate}</div>
      <h3>${title}</h3><p class="card-description">${description}</p>${contact}
      <div class="card-meta"><span class="author-avatar">${initial}</span><span class="author-name" title="${author}">${author}</span><span class="meta-date">Posted ${escapeHTML(createdLabel(notice.created_at))}</span></div>
      <div class="card-actions"><button class="text-action" data-action="edit" data-id="${escapeHTML(notice.id)}">Edit</button><button class="text-action delete" data-action="delete" data-id="${escapeHTML(notice.id)}">Delete</button></div>
    </article>`;
  }).join("");
}
searchInput.addEventListener("input", renderNotices);
categoryFilter.addEventListener("change", renderNotices);
sortFilter.addEventListener("change", renderNotices);
document.getElementById("clear-filters").addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  sortFilter.value = "newest";
  renderNotices();
});
document.querySelector(".search-box kbd").hidden = true;
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});
function readNoticeForm(prefix = "") {
  const get = (field) => document.getElementById(`${prefix}${field}`).value.trim();
  return {
    title: get("title"),
    category: get("category"),
    author: get("author"),
    description: get("description"),
    event_date: get("date") || null,
    contact: get("contact") || null
  };
}
function validateNotice(data) {
  if (!data.title || !data.category || !data.author || !data.description) return "Please fill in all required fields.";
  if (data.title.length > 120 || data.author.length > 80 || data.description.length > 2000 || (data.contact && data.contact.length > 120)) return "One or more fields exceed the allowed length.";
  return "";
}
noticeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = readNoticeForm();
  const validationError = validateNotice(data);
  if (validationError) return setFormMessage(formMessage, validationError, true);
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Publishing…";
  setFormMessage(formMessage, "");
  try {
    const result = await apiRequest("/notices", { method: "POST", body: JSON.stringify(data) });
    notices.unshift(result.data);
    noticeForm.reset();
    renderNotices();
    setFormMessage(formMessage, "Notice published successfully.");
    showToast("Your notice is live on the board.");
    document.getElementById("notices").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    setFormMessage(formMessage, error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Publish notice";
  }
});
grid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const notice = notices.find((item) => item.id === button.dataset.id);
  if (!notice) return;
  if (button.dataset.action === "edit") return openEditDialog(notice);
  if (button.dataset.action === "delete") {
    if (!window.confirm(`Delete “${notice.title}”? This cannot be undone.`)) return;
    button.disabled = true;
    try {
      await apiRequest(`/notices/${encodeURIComponent(notice.id)}`, { method: "DELETE" });
      notices = notices.filter((item) => item.id !== notice.id);
      renderNotices();
      showToast("Notice deleted.");
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  }
});
function openEditDialog(notice) {
  document.getElementById("edit-id").value = notice.id;
  document.getElementById("edit-title").value = notice.title;
  document.getElementById("edit-category").value = notice.category;
  document.getElementById("edit-author").value = notice.author;
  document.getElementById("edit-description").value = notice.description;
  document.getElementById("edit-date").value = notice.event_date || "";
  document.getElementById("edit-contact").value = notice.contact || "";
  setFormMessage(document.getElementById("edit-message"), "");
  editDialog.showModal();
}
document.getElementById("close-edit").addEventListener("click", () => editDialog.close());
editDialog.addEventListener("click", (event) => {
  if (event.target === editDialog) editDialog.close();
});
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = {
    title: document.getElementById("edit-title").value.trim(),
    category: document.getElementById("edit-category").value,
    author: document.getElementById("edit-author").value.trim(),
    description: document.getElementById("edit-description").value.trim(),
    event_date: document.getElementById("edit-date").value || null,
    contact: document.getElementById("edit-contact").value.trim() || null
  };
  const messageEl = document.getElementById("edit-message");
  const error = validateNotice(data);
  if (error) return setFormMessage(messageEl, error, true);
  const saveButton = document.getElementById("save-edit");
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  try {
    const id = document.getElementById("edit-id").value;
    const result = await apiRequest(`/notices/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });
    notices = notices.map((item) => item.id === id ? result.data : item);
    renderNotices();
    editDialog.close();
    showToast("Notice updated successfully.");
  } catch (err) {
    setFormMessage(messageEl, err.message, true);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save changes ↗";
  }
});
loadNotices();
