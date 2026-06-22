const shell = document.querySelector(".app-shell");
const workspace = document.querySelector(".workspace");
const canvasStage = document.querySelector(".canvas-stage");
const canvasFrame = document.querySelector("#canvasFrame");
const outlineTree = document.querySelector("#outlineTree");
const aiCode = document.querySelector("#aiCode");
const selectedTitle = document.querySelector("#selectedTitle");
const selectedMeta = document.querySelector("#selectedMeta");
const nodeCount = document.querySelector("#nodeCount");
const mapName = document.querySelector("#mapName");
const dockStatus = document.querySelector("#dockStatus");
const previewRatioControl = document.querySelector("#previewRatioControl");
const previewRatioButton = document.querySelector("#previewRatioButton");
const previewRatioValue = document.querySelector("#previewRatioValue");
const previewRatioMenu = document.querySelector("#previewRatioMenu");
const mainToolButton = document.querySelector("#mainToolButton");
const sidebarResizer = document.querySelector("#sidebarResizer");
const aiPanelResizer = document.querySelector("#aiPanelResizer");
const agentResizer = document.querySelector("#agentResizer");
const agentThread = document.querySelector("#agentThread");
const agentComposer = document.querySelector("#agentComposer");
const agentInput = document.querySelector("#agentInput");
const agentStatus = document.querySelector("#agentStatus");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toastMessage");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const historyList = document.querySelector("#historyList");
const historyCount = document.querySelector("#historyCount");
const historyStateLabel = document.querySelector("#historyStateLabel");
const nodeIdInput = document.querySelector("#nodeIdInput");
const nodeMemoInput = document.querySelector("#nodeMemoInput");
const nodeAreaInput = document.querySelector("#nodeAreaInput");
const nodeFinalRoleInput = document.querySelector("#nodeFinalRoleInput");
const nodeFlexInput = document.querySelector("#nodeFlexInput");
const nodeGapInput = document.querySelector("#nodeGapInput");
const classList = document.querySelector("#classList");
const exportPreviewButton = document.querySelector("#exportPreviewButton");
const exportBundleButton = document.querySelector("#exportBundleButton");
const loadProjectButton = document.querySelector("#loadProjectButton");
const saveProjectButton = document.querySelector("#saveProjectButton");
const roleChips = Array.from(document.querySelectorAll("[data-role]"));
const codeTabs = Array.from(document.querySelectorAll("[data-view]"));
const previewRatioOptions = Array.from(document.querySelectorAll("[data-ratio]"));
const agentActionButtons = Array.from(document.querySelectorAll("[data-agent-action]"));

const layoutLimits = {
  sidebarDefault: 320,
  sidebarMin: 240,
  sidebarMax: 520,
  agentDefault: 360,
  agentMin: 300,
  agentMax: 540,
  aiDefaultRatio: 0.3,
  aiMin: 170,
  aiMaxRatio: 0.55,
};

const ratioLimits = {
  cutMin: 0.01,
  cutMax: 0.99,
  resizeMin: 0.02,
  resizeMax: 0.98,
};

const historyLimits = {
  events: 36,
  snapshots: 80,
};

const previewRatios = {
  "16:9": "16 / 9",
  "4:3": "4 / 3",
  "1:1": "1 / 1",
  "9:16": "9 / 16",
};

const roleIcons = {
  navigation: "view_sidebar",
  content: "dashboard_customize",
  inspector: "right_panel_open",
  toolbar: "tune",
};

const roleLabels = {
  navigation: "Navigation",
  content: "Content",
  inspector: "Inspector",
  toolbar: "Toolbar",
};

const areaLabels = {
  body: "body",
  foot: "foot",
  "sidebar-left": "side-l",
  "sidebar-right": "side-r",
  section: "section",
  top: "top",
};

const areaRoles = {
  body: "content",
  foot: "content",
  "sidebar-left": "navigation",
  "sidebar-right": "inspector",
  section: "content",
  top: "toolbar",
};

const finalRoleDefaults = {
  body: "Main content",
  foot: "Footer summary",
  "sidebar-left": "Primary navigation",
  "sidebar-right": "Inspector panel",
  section: "Content section",
  top: "Top toolbar",
};

const areaOverrideValues = new Set(Object.keys(areaLabels));

const agentActionLabels = {
  "assign-roles": "역할 정리",
  refine: "구조 재정리",
  review: "현재 화면 리뷰",
  chat: "채팅",
};

const initialMap = {
  name: "Blank canvas",
  canvas: {
    theme: "dark",
    density: "compact",
    ratio: "16:9",
    classPrefix: ["l-", "c-", "is-", "u-"],
  },
  rootId: "canvas-root",
  nodes: {
    "canvas-root": {
      id: "canvas-root",
      type: "region",
      role: "content",
      flex: 1,
      memo: "",
      finalRole: "",
      classes: ["l-region", "c-blank-canvas"],
    },
  },
};

let layoutMap = structuredClone(initialMap);
let selectedId = "canvas-root";
let activeCodeView = "map";
let activeTool = "main";
let idCounter = 1;
let cutPreviewLine = null;
let lastCutPointer = null;
let resizeState = null;
let modifierState = {
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};
let agentHistory = [];
let undoStack = [];
let redoStack = [];
let eventLog = [];
let draftHistory = null;
let draftHistoryCommitTimer = null;
let hierarchyDragState = null;
let suppressNextHierarchyClick = false;

function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function getHistoryTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function createHistorySnapshot() {
  return {
    activeCodeView,
    idCounter,
    layoutMap: structuredClone(layoutMap),
    selectedId,
  };
}

function isSameSnapshot(before, after) {
  return JSON.stringify(before) === JSON.stringify(after);
}

function pushUndoSnapshot(snapshot, label) {
  undoStack.push({ label, snapshot });
  if (undoStack.length > historyLimits.snapshots) undoStack.shift();
  redoStack = [];
}

function recordEvent(label, kind = "event") {
  eventLog.unshift({
    id: `${Date.now()}-${eventLog.length}`,
    kind,
    label,
    time: getHistoryTime(),
  });
  eventLog = eventLog.slice(0, historyLimits.events);
  renderHistoryFoot();
}

function commitHistory(label) {
  pushUndoSnapshot(createHistorySnapshot(), label);
  recordEvent(label, "change");
}

function beginDraftHistory(label) {
  if (draftHistory) return;
  draftHistory = {
    label,
    snapshot: createHistorySnapshot(),
  };
}

function commitDraftHistory() {
  window.clearTimeout(draftHistoryCommitTimer);
  draftHistoryCommitTimer = null;
  if (!draftHistory) return;
  const before = draftHistory.snapshot;
  const after = createHistorySnapshot();
  if (!isSameSnapshot(before, after)) {
    pushUndoSnapshot(before, draftHistory.label);
    recordEvent(draftHistory.label, "change");
  }
  draftHistory = null;
}

function scheduleDraftHistoryCommit() {
  window.clearTimeout(draftHistoryCommitTimer);
  draftHistoryCommitTimer = window.setTimeout(commitDraftHistory, 220);
}

function syncCodeTabs() {
  codeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === activeCodeView));
}

function restoreHistorySnapshot(snapshot) {
  layoutMap = structuredClone(snapshot.layoutMap);
  selectedId = layoutMap.nodes[snapshot.selectedId] ? snapshot.selectedId : layoutMap.rootId;
  idCounter = snapshot.idCounter;
  activeCodeView = snapshot.activeCodeView || "map";
  syncCodeTabs();
  setPreviewRatio(layoutMap.canvas.ratio, false, false);
  render();
}

function undoHistory() {
  commitDraftHistory();
  if (!undoStack.length) {
    showToast("Nothing to undo");
    return;
  }
  const entry = undoStack.pop();
  redoStack.push({ label: entry.label, snapshot: createHistorySnapshot() });
  restoreHistorySnapshot(entry.snapshot);
  recordEvent(`Undo: ${entry.label}`, "undo");
  showToast("Undo");
}

function redoHistory() {
  commitDraftHistory();
  if (!redoStack.length) {
    showToast("Nothing to redo");
    return;
  }
  const entry = redoStack.pop();
  undoStack.push({ label: entry.label, snapshot: createHistorySnapshot() });
  restoreHistorySnapshot(entry.snapshot);
  recordEvent(`Redo: ${entry.label}`, "redo");
  showToast("Redo");
}

function getHistoryIcon(kind) {
  if (kind === "undo") return "undo";
  if (kind === "redo") return "redo";
  if (kind === "change") return "edit_note";
  return "radio_button_checked";
}

function renderHistoryFoot() {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
  undoButton.setAttribute("aria-label", `Undo ${undoStack.length}`);
  redoButton.setAttribute("aria-label", `Redo ${redoStack.length}`);
  historyStateLabel.textContent = `${undoStack.length} undo / ${redoStack.length} redo`;
  historyCount.textContent = `${eventLog.length} events`;

  historyList.innerHTML = "";
  if (!eventLog.length) {
    const empty = document.createElement("span");
    empty.className = "history-empty";
    empty.textContent = "No events yet";
    historyList.appendChild(empty);
    return;
  }

  eventLog.forEach((event) => {
    const item = document.createElement("div");
    item.className = "history-event";
    item.dataset.kind = event.kind;
    item.innerHTML = `
      <span class="material-symbols-rounded" aria-hidden="true">${getHistoryIcon(event.kind)}</span>
      <time>${event.time}</time>
      <span></span>
    `;
    item.querySelector("span:last-child").textContent = event.label;
    historyList.appendChild(item);
  });
}

function getNode(id = selectedId) {
  return layoutMap.nodes[id];
}

function getAllNodes() {
  return Object.values(layoutMap.nodes);
}

function countNodes() {
  return getAllNodes().length;
}

function normalizeAreaOverride(value) {
  return areaOverrideValues.has(value) ? value : "";
}

function getNodeAreaOverride(node) {
  return normalizeAreaOverride(node?.areaOverride);
}

function getParentInfo(targetId, startId = layoutMap.rootId) {
  const start = getNode(startId);
  if (!start?.children) return null;
  const index = start.children.indexOf(targetId);
  if (index >= 0) return { parent: start, index };
  for (const childId of start.children) {
    const found = getParentInfo(targetId, childId);
    if (found) return found;
  }
  return null;
}

function getInheritedAreaOverride(id) {
  let parentInfo = getParentInfo(id);
  while (parentInfo?.parent) {
    const area = getNodeAreaOverride(parentInfo.parent);
    if (area) return area;
    parentInfo = getParentInfo(parentInfo.parent.id);
  }
  return "";
}

function getResolvedArea(id, fallback = "") {
  const node = getNode(id);
  return getNodeAreaOverride(node) || getInheritedAreaOverride(id) || fallback;
}

function getAreaMetaText(node) {
  const ownArea = getNodeAreaOverride(node);
  if (ownArea) return `${ownArea} manual`;
  if (node?.type === "region") {
    const inheritedArea = getInheritedAreaOverride(node.id);
    if (inheritedArea) return `${inheritedArea} inherited`;
    return node.area || node.role || "region";
  }
  return node?.direction || "group";
}

function getSplitGroupClasses(node) {
  const area = getNodeAreaOverride(node);
  const preserved = (node.classes || []).filter((className) => className === "l-split" || !/^c-[a-z0-9-]+-group$/.test(className));
  const base = preserved.includes("l-split") ? preserved : ["l-split", ...preserved];
  return [...new Set([...base, area ? `c-${area}-group` : "c-layout-group"])];
}

function makeUniqueId(base) {
  const safeBase = base.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "region";
  let next = `${safeBase}-${idCounter}`;
  while (layoutMap.nodes[next]) {
    idCounter += 1;
    next = `${safeBase}-${idCounter}`;
  }
  idCounter += 1;
  return next;
}

function cloneMapNode(node, id) {
  return {
    ...node,
    id,
    children: node.children ? [...node.children] : undefined,
    classes: [...node.classes],
  };
}

function getAutoRegionIdBase(node) {
  const area = areaLabels[node.area] || node.area || node.role || "region";
  return area.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "region";
}

function autoRenameRegionsByVisualOrder() {
  const regions = getAllNodes()
    .filter((node) => node.type === "region")
    .sort((a, b) => (a.order || 999) - (b.order || 999) || a.id.localeCompare(b.id));
  const reservedIds = new Set(getAllNodes().filter((node) => node.type !== "region").map((node) => node.id));
  const renameMap = new Map();
  const usedIds = new Set(reservedIds);

  regions.forEach((node, index) => {
    const order = String(node.order || index + 1).padStart(2, "0");
    const base = getAutoRegionIdBase(node);
    let nextId = `${base}-${order}`;
    let suffix = 2;
    while (usedIds.has(nextId)) {
      nextId = `${base}-${order}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(nextId);
    if (nextId !== node.id) renameMap.set(node.id, nextId);
  });

  if (!renameMap.size) return 0;

  const nextNodes = { ...layoutMap.nodes };
  renameMap.forEach((nextId, oldId) => {
    const node = nextNodes[oldId];
    if (!node) return;
    node.id = nextId;
    nextNodes[nextId] = node;
    delete nextNodes[oldId];
  });

  Object.values(nextNodes).forEach((node) => {
    if (!node.children) return;
    node.children = node.children.map((childId) => renameMap.get(childId) || childId);
  });

  if (renameMap.has(layoutMap.rootId)) layoutMap.rootId = renameMap.get(layoutMap.rootId);
  if (renameMap.has(selectedId)) selectedId = renameMap.get(selectedId);
  layoutMap.nodes = nextNodes;
  return renameMap.size;
}

function canMoveHierarchyNode(id, delta) {
  const parentInfo = getParentInfo(id);
  if (!parentInfo) return false;
  const nextIndex = parentInfo.index + delta;
  return nextIndex >= 0 && nextIndex < parentInfo.parent.children.length;
}

function finishHierarchyMove(movedId) {
  selectedId = movedId;
  render();
  const renamedCount = autoRenameRegionsByVisualOrder();
  if (renamedCount) render();
  showToast(renamedCount ? "Hierarchy moved and IDs updated" : "Hierarchy moved");
}

function moveHierarchyNode(id, delta) {
  commitDraftHistory();
  const parentInfo = getParentInfo(id);
  if (!parentInfo) {
    showToast("Root cannot move");
    return;
  }
  const nextIndex = parentInfo.index + delta;
  if (nextIndex < 0 || nextIndex >= parentInfo.parent.children.length) {
    showToast("No sibling in that direction");
    return;
  }

  commitHistory(delta < 0 ? "Move hierarchy item up" : "Move hierarchy item down");
  const [movedId] = parentInfo.parent.children.splice(parentInfo.index, 1);
  parentInfo.parent.children.splice(nextIndex, 0, movedId);
  finishHierarchyMove(movedId);
}

function getHierarchyDropPosition(event, item) {
  const rect = item.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function getHierarchyItemFromPoint(clientX, clientY) {
  const item = document.elementFromPoint(clientX, clientY)?.closest?.(".outline-item");
  if (item && outlineTree.contains(item)) return item;

  const treeRect = outlineTree.getBoundingClientRect();
  if (clientX < treeRect.left || clientX > treeRect.right || clientY < treeRect.top || clientY > treeRect.bottom) return null;

  const items = Array.from(outlineTree.querySelectorAll(".outline-item"));
  return (
    items
      .map((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return {
          candidate,
          distance: Math.abs(clientY - (rect.top + rect.height / 2)),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0]?.candidate || null
  );
}

function getHierarchyDropPlan(dragId, targetId, position) {
  if (!dragId || !targetId || dragId === targetId) return null;
  const source = getParentInfo(dragId);
  const target = getParentInfo(targetId);
  if (!source || !target || source.parent.id !== target.parent.id) return null;

  let nextIndex = target.index + (position === "after" ? 1 : 0);
  if (source.index < nextIndex) nextIndex -= 1;
  if (nextIndex === source.index) return null;

  return {
    parent: source.parent,
    fromIndex: source.index,
    toIndex: nextIndex,
  };
}

function clearHierarchyDropTargets() {
  outlineTree.querySelectorAll(".is-drop-before, .is-drop-after").forEach((item) => {
    item.classList.remove("is-drop-before", "is-drop-after");
  });
}

function clearHierarchyDropIndicators() {
  clearHierarchyDropTargets();
  outlineTree.querySelectorAll(".is-dragging").forEach((item) => {
    item.classList.remove("is-dragging");
  });
}

function createHierarchyDragGhost(state) {
  if (state.ghost) return;
  const main = state.item.querySelector(".outline-main");
  const rect = main.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.className = "hierarchy-drag-ghost";
  ghost.style.width = `${Math.round(rect.width)}px`;
  ghost.innerHTML = main.innerHTML;
  document.body.appendChild(ghost);
  state.ghost = ghost;
  state.ghostOffsetX = state.startX - rect.left;
  state.ghostOffsetY = state.startY - rect.top;
  updateHierarchyDragGhost(state.startX, state.startY);
}

function updateHierarchyDragGhost(clientX, clientY) {
  const state = hierarchyDragState;
  if (!state?.ghost) return;
  state.ghost.style.transform = `translate3d(${Math.round(clientX - state.ghostOffsetX)}px, ${Math.round(
    clientY - state.ghostOffsetY,
  )}px, 0)`;
}

function removeHierarchyDragGhost(state = hierarchyDragState) {
  state?.ghost?.remove();
  if (state) state.ghost = null;
}

function startHierarchyDrag(event, id, item) {
  commitDraftHistory();
  const parentInfo = getParentInfo(id);
  if (!parentInfo) {
    event.preventDefault();
    return;
  }
  hierarchyDragState = { id };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", id);
  item.classList.add("is-dragging");
}

function updateHierarchyDragOver(event, targetId, item) {
  const dragId = hierarchyDragState?.id || event.dataTransfer.getData("text/plain");
  const position = getHierarchyDropPosition(event, item);
  const plan = getHierarchyDropPlan(dragId, targetId, position);
  clearHierarchyDropTargets();
  if (!plan) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  item.classList.add(position === "before" ? "is-drop-before" : "is-drop-after");
}

function previewHierarchyPointerDrop(clientX, clientY) {
  if (!hierarchyDragState?.id) return null;
  const item = getHierarchyItemFromPoint(clientX, clientY);
  clearHierarchyDropTargets();
  if (!item) return null;

  const targetId = item.dataset.nodeId;
  const position = getHierarchyDropPosition({ clientY }, item);
  const plan = getHierarchyDropPlan(hierarchyDragState.id, targetId, position);
  if (!plan) return null;
  item.classList.add(position === "before" ? "is-drop-before" : "is-drop-after");
  return plan;
}

function dropHierarchyNode(event, targetId, item) {
  const dragId = hierarchyDragState?.id || event.dataTransfer.getData("text/plain");
  const position = getHierarchyDropPosition(event, item);
  const plan = getHierarchyDropPlan(dragId, targetId, position);
  clearHierarchyDropIndicators();
  hierarchyDragState = null;
  if (!plan) {
    showToast("Drag within the same parent");
    return;
  }

  event.preventDefault();
  commitHistory("Drag hierarchy item");
  const [movedId] = plan.parent.children.splice(plan.fromIndex, 1);
  plan.parent.children.splice(plan.toIndex, 0, movedId);
  finishHierarchyMove(movedId);
}

function endHierarchyDrag() {
  removeHierarchyDragGhost();
  hierarchyDragState = null;
  clearHierarchyDropIndicators();
}

function updateHierarchyPointerDrag(event) {
  if (hierarchyDragState?.mode !== "pointer") return;
  const distance = Math.hypot(event.clientX - hierarchyDragState.startX, event.clientY - hierarchyDragState.startY);
  if (distance > 4 && !hierarchyDragState.moved) {
    hierarchyDragState.moved = true;
    hierarchyDragState.item.classList.add("is-dragging");
    document.body.classList.add("is-hierarchy-dragging");
    createHierarchyDragGhost(hierarchyDragState);
  }
  if (hierarchyDragState.moved) {
    event.preventDefault();
    updateHierarchyDragGhost(event.clientX, event.clientY);
    previewHierarchyPointerDrop(event.clientX, event.clientY);
  }
}

function stopHierarchyPointerDrag(event) {
  if (hierarchyDragState?.mode !== "pointer") return;
  const state = hierarchyDragState;
  window.removeEventListener("pointermove", updateHierarchyPointerDrag);
  window.removeEventListener("pointerup", stopHierarchyPointerDrag);
  document.body.classList.remove("is-hierarchy-dragging");
  removeHierarchyDragGhost(state);
  clearHierarchyDropIndicators();
  hierarchyDragState = null;

  if (!state.moved) return;
  suppressNextHierarchyClick = true;
  window.setTimeout(() => {
    suppressNextHierarchyClick = false;
  }, 0);

  const targetItem = getHierarchyItemFromPoint(event.clientX, event.clientY);
  if (!targetItem) return;
  const targetId = targetItem.dataset.nodeId;
  const position = getHierarchyDropPosition({ clientY: event.clientY }, targetItem);
  const plan = getHierarchyDropPlan(state.id, targetId, position);
  if (!plan) {
    showToast("Drag within the same parent");
    return;
  }

  commitHistory("Drag hierarchy item");
  const [movedId] = plan.parent.children.splice(plan.fromIndex, 1);
  plan.parent.children.splice(plan.toIndex, 0, movedId);
  finishHierarchyMove(movedId);
}

function startHierarchyPointerDrag(event, id, item, options = {}) {
  if (event.button !== 0) return;
  const parentInfo = getParentInfo(id);
  if (!parentInfo) return;
  commitDraftHistory();
  hierarchyDragState = {
    id,
    item,
    mode: "pointer",
    moved: false,
    startX: event.clientX,
    startY: event.clientY,
  };
  if (options.preventInitial) event.preventDefault();
  window.addEventListener("pointermove", updateHierarchyPointerDrag);
  window.addEventListener("pointerup", stopHierarchyPointerDrag, { once: true });
}

function setSelected(id) {
  if (!layoutMap.nodes[id]) return;
  selectedId = id;
  render();
}

function nodeDepth(id, currentId = layoutMap.rootId, depth = 0) {
  if (id === currentId) return depth;
  const node = getNode(currentId);
  if (!node?.children) return 0;
  for (const childId of node.children) {
    const found = nodeDepth(id, childId, depth + 1);
    if (found) return found;
  }
  return 0;
}

function getRegionTagText(node) {
  const area = areaLabels[node.area] || "body";
  const order = String(node.order || 1).padStart(2, "0");
  return `${order} ${area}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function getDefaultFinalRole(node) {
  if (!node) return "";
  if (node.type === "split") {
    const area = getNodeAreaOverride(node);
    if (area) return `${finalRoleDefaults[area] || "Layout"} group`;
    return node.direction === "vertical" ? "Horizontal group" : "Vertical group";
  }
  return finalRoleDefaults[node.area] || finalRoleDefaults.section;
}

function getDisplayRole(node) {
  return node?.finalRole?.trim() || getDefaultFinalRole(node);
}

function getPurposeText(node) {
  return node?.memo?.trim() || "";
}

function getCanvasPurposeHtml(node) {
  const purpose = getPurposeText(node);
  return purpose ? `<span class="region-purpose">${escapeHtml(purpose)}</span>` : "";
}

function getSelectionBadgeHtml(node) {
  const role = getPurposeText(node) || getDisplayRole(node);
  const detail = node.type === "split" ? getAreaMetaText(node) : node.area || node.role || "region";
  return `
    <span class="selection-badge" data-selection-badge>
      <span class="material-symbols-rounded" aria-hidden="true">ads_click</span>
      <strong>${escapeHtml(node.id)}</strong>
      <small>${escapeHtml(role || detail)}</small>
    </span>
  `;
}

function refreshCanvasSelectionBadge() {
  const node = getNode();
  const element = canvasFrame.querySelector(`[data-node-id="${node.id}"]`);
  const badge = element?.querySelector("[data-selection-badge]");
  if (!badge) return;
  badge.querySelector("strong").textContent = node.id;
  badge.querySelector("small").textContent = getPurposeText(node) || getDisplayRole(node);
}

function refreshCanvasRegionPurpose(id = selectedId) {
  const node = getNode(id);
  const element = canvasFrame.querySelector(`[data-node-id="${id}"]`);
  if (!node || !element) return;
  const purpose = getPurposeText(node);
  let label = element.querySelector(".region-purpose");
  if (!purpose) {
    label?.remove();
    return;
  }
  if (!label) {
    label = document.createElement("span");
    label.className = "region-purpose";
    element.appendChild(label);
  }
  label.textContent = purpose;
}

function inferRegionArea(rect, frameRect, totalRegions) {
  if (totalRegions <= 1) return "body";
  const x = rect.left / Math.max(frameRect.width, 1);
  const y = rect.top / Math.max(frameRect.height, 1);
  const w = rect.width / Math.max(frameRect.width, 1);
  const h = rect.height / Math.max(frameRect.height, 1);
  const nearTop = y <= 0.08;
  const nearBottom = y + h >= 0.92;
  const nearLeft = x <= 0.08;
  const nearRight = x + w >= 0.92;

  if (nearTop && w >= 0.55 && h <= 0.28) return "top";
  if (nearBottom && w >= 0.55 && h <= 0.28) return "foot";
  if (nearLeft && w <= 0.38 && h >= 0.34) return "sidebar-left";
  if (nearRight && w <= 0.38 && h >= 0.34) return "sidebar-right";
  if (w <= 0.38 && h >= 0.34) return x < 0.5 ? "sidebar-left" : "sidebar-right";
  return "body";
}

function applyAutoRegionSemantics() {
  const frameRect = canvasFrame.getBoundingClientRect();
  const regions = Array.from(canvasFrame.querySelectorAll(".l-region[data-node-id]")).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      element,
      id: element.dataset.nodeId,
      rect: {
        height: rect.height,
        left: rect.left - frameRect.left,
        top: rect.top - frameRect.top,
        width: rect.width,
      },
    };
  });

  regions
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
    .forEach((region, index) => {
      const node = getNode(region.id);
      if (!node || node.type !== "region") return;

      const area = getResolvedArea(region.id, inferRegionArea(region.rect, frameRect, regions.length));
      const order = index + 1;
      const orderClass = `u-order-${String(order).padStart(2, "0")}`;
      node.area = area;
      node.order = order;
      node.role = areaRoles[area] || "content";
      node.classes = ["l-region", `c-${area}-area`, orderClass];

      region.element.dataset.area = area;
      region.element.className = `${node.classes.join(" ")} region-role-${node.role} ${
        node.id === layoutMap.rootId && countNodes() === 1 ? "is-empty-root" : ""
      } ${node.id === selectedId ? "is-selected" : ""}`;
      region.element.setAttribute("aria-label", `${node.id} ${area} ${order}`);
      const tag = region.element.querySelector(".region-tag");
      if (tag) tag.textContent = getRegionTagText(node);
    });
}

function renderCanvasNode(id) {
  const node = getNode(id);
  if (!node) return document.createElement("div");

  if (node.type === "split") {
    const element = document.createElement("div");
    element.className = `${node.classes.join(" ")} ${node.id === selectedId ? "is-selected" : ""}`;
    element.dataset.nodeId = node.id;
    element.dataset.direction = node.direction;
    if (getNodeAreaOverride(node)) element.dataset.area = getNodeAreaOverride(node);
    element.style.flex = node.flex ?? 1;
    element.style.setProperty("--node-gap", `${node.gap ?? 10}px`);
    if (node.id === selectedId) element.insertAdjacentHTML("afterbegin", getSelectionBadgeHtml(node));
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      setSelected(node.id);
    });
    node.children.forEach((childId) => element.appendChild(renderCanvasNode(childId)));
    return element;
  }

  const element = document.createElement("button");
  const emptyRoot = node.id === layoutMap.rootId && countNodes() === 1;
  element.className = `${node.classes.join(" ")} region-role-${node.role} ${emptyRoot ? "is-empty-root" : ""} ${node.id === selectedId ? "is-selected" : ""}`;
  element.type = "button";
  element.dataset.nodeId = node.id;
  element.dataset.area = node.area || "body";
  element.setAttribute("aria-label", `${node.id} ${node.area || node.role || "region"}`);
  element.style.flex = node.flex ?? 1;
  element.innerHTML = `<span class="region-tag">${getRegionTagText(node)}</span>${getCanvasPurposeHtml(node)}${
    node.id === selectedId ? getSelectionBadgeHtml(node) : ""
  }`;
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    setSelected(node.id);
  });
  return element;
}

function buildOutline(id = layoutMap.rootId) {
  const node = getNode(id);
  const movable = Boolean(getParentInfo(id));
  const purpose = getPurposeText(node);
  const detail =
    node.type === "split"
      ? `${node.direction}${getNodeAreaOverride(node) ? ` / ${getAreaMetaText(node)}` : ""}`
      : `${String(node.order || 1).padStart(2, "0")} ${node.area || node.role} / ${purpose || getDisplayRole(node)}`;
  const item = document.createElement("div");
  item.className = `outline-item ${movable ? "is-movable" : "is-root"} ${id === selectedId ? "is-selected" : ""}`;
  item.dataset.nodeId = id;
  item.style.setProperty("--depth", nodeDepth(id));
  item.innerHTML = `
    <button class="outline-main" type="button" aria-label="Select ${escapeHtml(node.id)}">
      <span class="material-symbols-rounded" aria-hidden="true">${node.type === "split" ? "account_tree" : roleIcons[node.role]}</span>
      <span>
        <strong>${escapeHtml(node.id)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
      <em class="outline-kind">${node.type}</em>
    </button>
    <span class="outline-actions" aria-label="Hierarchy position controls">
      <button class="outline-drag-handle" type="button" title="Drag to reorder" aria-label="Drag ${escapeHtml(node.id)} to reorder" ${
        movable ? "" : "disabled"
      }>
        <span class="material-symbols-rounded" aria-hidden="true">drag_indicator</span>
      </button>
      <button class="outline-move-button" type="button" title="Move up" aria-label="Move ${escapeHtml(node.id)} up" data-move="up" ${
        canMoveHierarchyNode(id, -1) ? "" : "disabled"
      }>
        <span class="material-symbols-rounded" aria-hidden="true">keyboard_arrow_up</span>
      </button>
      <button class="outline-move-button" type="button" title="Move down" aria-label="Move ${escapeHtml(node.id)} down" data-move="down" ${
        canMoveHierarchyNode(id, 1) ? "" : "disabled"
      }>
        <span class="material-symbols-rounded" aria-hidden="true">keyboard_arrow_down</span>
      </button>
    </span>
  `;
  item.addEventListener("dragover", (event) => updateHierarchyDragOver(event, id, item));
  item.addEventListener("dragleave", (event) => {
    if (!item.contains(event.relatedTarget)) item.classList.remove("is-drop-before", "is-drop-after");
  });
  item.addEventListener("drop", (event) => dropHierarchyNode(event, id, item));
  const dragHandle = item.querySelector(".outline-drag-handle");
  const outlineMain = item.querySelector(".outline-main");
  dragHandle.addEventListener("click", (event) => event.stopPropagation());
  outlineMain.addEventListener("click", (event) => {
    if (suppressNextHierarchyClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    setSelected(id);
  });
  if (movable) {
    outlineMain.addEventListener("pointerdown", (event) => startHierarchyPointerDrag(event, id, item));
    dragHandle.addEventListener("pointerdown", (event) => startHierarchyPointerDrag(event, id, item, { preventInitial: true }));
    dragHandle.addEventListener("dragstart", (event) => startHierarchyDrag(event, id, item));
    dragHandle.addEventListener("dragend", endHierarchyDrag);
  }
  item.querySelector('[data-move="up"]').addEventListener("click", () => moveHierarchyNode(id, -1));
  item.querySelector('[data-move="down"]').addEventListener("click", () => moveHierarchyNode(id, 1));
  outlineTree.appendChild(item);
  if (node.children) node.children.forEach((childId) => buildOutline(childId));
}

function getSerializableMap() {
  const nodes = Object.fromEntries(
    Object.entries(layoutMap.nodes).map(([id, node]) => [
      id,
      {
        ...node,
        finalRoleResolved: getDisplayRole(node),
      },
    ]),
  );
  return {
    ...layoutMap,
    nodes,
    selectedId,
    summary: {
      nodeCount: countNodes(),
      selectedType: getNode()?.type,
      selectedClasses: getNode()?.classes,
      selectedFinalRole: getDisplayRole(getNode()),
    },
  };
}

function getLayoutMapJson() {
  return JSON.stringify(getSerializableMap(), null, 2);
}

function getNextIdCounterFromNodes(nodes) {
  return (
    Object.keys(nodes || {}).reduce((max, id) => {
      const matches = id.match(/-(\d+)(?:-\d+)?$/);
      return matches ? Math.max(max, Number(matches[1])) : max;
    }, 0) + 1
  );
}

function normalizeLoadedNode(node) {
  const areaOverride = normalizeAreaOverride(node.areaOverride);
  const cleanNode = {
    ...node,
    classes: Array.isArray(node.classes) ? [...node.classes] : [node.type === "split" ? "l-split" : "l-region"],
    flex: Number.isFinite(Number(node.flex)) ? Number(node.flex) : 1,
    id: String(node.id),
    memo: node.memo || "",
    type: node.type === "split" ? "split" : "region",
  };
  delete cleanNode.finalRoleResolved;
  if (areaOverride) cleanNode.areaOverride = areaOverride;
  else delete cleanNode.areaOverride;
  if (cleanNode.type === "split") {
    cleanNode.children = Array.isArray(node.children) ? [...node.children] : [];
    cleanNode.direction = node.direction === "horizontal" ? "horizontal" : "vertical";
    cleanNode.gap = Number.isFinite(Number(node.gap)) ? Number(node.gap) : 0;
    cleanNode.classes = getSplitGroupClasses(cleanNode);
  } else {
    delete cleanNode.children;
    cleanNode.finalRole = node.finalRole || "";
    cleanNode.role = node.role || "content";
  }
  return cleanNode;
}

function normalizeLoadedMap(source) {
  if (!source?.nodes || !source.rootId || !source.nodes[source.rootId]) {
    throw new Error("Invalid layout map");
  }
  const nodes = Object.fromEntries(
    Object.entries(source.nodes).map(([id, node]) => [
      id,
      normalizeLoadedNode({
        ...node,
        id,
      }),
    ]),
  );
  return {
    canvas: {
      ...initialMap.canvas,
      ...(source.canvas || {}),
    },
    name: source.name || "Loaded layout",
    nodes,
    rootId: source.rootId,
  };
}

function getMapSlug() {
  return (
    layoutMap.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "layout-map"
  );
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function downloadTextFile(filename, text, type) {
  downloadBlob(filename, new Blob([text], { type }));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Blob read failed"));
    reader.readAsDataURL(blob);
  });
}

function getLayoutBriefText() {
  const serializableMap = getSerializableMap();
  const regionLines = Object.values(serializableMap.nodes)
    .filter((node) => node.type === "region")
    .sort((a, b) => (a.order || 999) - (b.order || 999) || a.id.localeCompare(b.id))
    .map((node) => {
      const detail = [
        node.area || node.role || "region",
        `flex ${node.flex ?? 1}`,
        node.finalRoleResolved || getDisplayRole(node),
      ]
        .filter(Boolean)
        .join(" / ");
      const areaOverride = node.areaOverride ? `; areaOverride ${node.areaOverride}` : "";
      const purpose = node.memo?.trim() ? `; purpose ${node.memo.trim()}` : "";
      return `- ${node.id}: ${detail}${areaOverride}${purpose}; classes ${node.classes.join(" ")}`;
    });

  return [
    "# Layout Map Brief",
    "",
    "## How To Use",
    "- Treat `layout-map.json` as the source of truth.",
    "- Use `layout-preview.png` to verify visible proportions, order, and selected state.",
    "- Use this brief as the short instruction layer for another agent.",
    "- Keep the class contract: `l-`, `c-`, `is-`, `u-`.",
    "",
    "## Canvas",
    `- Name: ${serializableMap.name}`,
    `- Ratio: ${serializableMap.canvas.ratio}`,
    `- Nodes: ${serializableMap.summary.nodeCount}`,
    `- Selected: ${serializableMap.selectedId}`,
    `- Selected role: ${serializableMap.summary.selectedFinalRole}`,
    "",
    "## Regions",
    ...(regionLines.length ? regionLines : ["- No regions yet."]),
    "",
    "## Agent Request Template",
    "Use the attached layout map and preview image together. Preserve the same visual hierarchy while turning the map into real UI code for the current project stack.",
  ].join("\n");
}

function truncateCanvasText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;
  let output = text;
  while (output.length > 1 && context.measureText(`${output.slice(0, -1)}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

function drawPreviewLabel(context, text, x, y, maxWidth, font, color) {
  context.font = font;
  context.fillStyle = color;
  context.fillText(truncateCanvasText(context, text, maxWidth), x, y);
}

async function createLayoutPreviewBlob() {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const frameRect = canvasFrame.getBoundingClientRect();
  if (!frameRect.width || !frameRect.height) throw new Error("Preview frame is not visible");

  const exportWidth = 1280;
  const exportHeight = Math.round((exportWidth * frameRect.height) / frameRect.width);
  const scale = exportWidth / frameRect.width;
  const canvas = document.createElement("canvas");
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas export is unavailable");

  context.fillStyle = "#0f141b";
  context.fillRect(0, 0, exportWidth, exportHeight);
  context.strokeStyle = "#4b5f78";
  context.lineWidth = 2;
  context.strokeRect(1, 1, exportWidth - 2, exportHeight - 2);

  const regions = Array.from(canvasFrame.querySelectorAll(".l-region[data-node-id]"))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        id: element.dataset.nodeId,
        node: getNode(element.dataset.nodeId),
        rect: {
          height: rect.height * scale,
          left: (rect.left - frameRect.left) * scale,
          top: (rect.top - frameRect.top) * scale,
          width: rect.width * scale,
        },
      };
    })
    .sort((a, b) => (a.node?.order || 999) - (b.node?.order || 999) || a.id.localeCompare(b.id));

  regions.forEach((region) => {
    const { node, rect } = region;
    if (!node) return;
    const selected = node.id === selectedId;
    context.fillStyle = selected ? "#17345f" : "#151d25";
    context.strokeStyle = selected ? "#2f7df6" : "#334255";
    context.lineWidth = selected ? 4 : 2;
    context.fillRect(rect.left, rect.top, rect.width, rect.height);
    context.strokeRect(rect.left + 1, rect.top + 1, Math.max(rect.width - 2, 1), Math.max(rect.height - 2, 1));

    const padding = Math.max(12, Math.round(14 * scale));
    const tagHeight = Math.min(34, Math.max(22, rect.height - padding * 2));
    const tagWidth = Math.min(rect.width - padding * 2, Math.max(130, context.measureText(node.id).width + 54));
    if (rect.width > 110 && rect.height > 50) {
      context.fillStyle = selected ? "#2f7df6" : "#263242";
      context.fillRect(rect.left + padding, rect.top + padding, Math.max(tagWidth, 72), tagHeight);
      drawPreviewLabel(
        context,
        `${String(node.order || 1).padStart(2, "0")} ${node.area || node.role}`,
        rect.left + padding + 10,
        rect.top + padding + Math.round(tagHeight * 0.65),
        Math.max(tagWidth - 20, 40),
        "600 17px Manrope, Arial, sans-serif",
        "#f6f8fb",
      );
    }

    if (rect.width > 150 && rect.height > 92) {
      drawPreviewLabel(
        context,
        node.id,
        rect.left + padding,
        rect.top + rect.height - padding - 28,
        rect.width - padding * 2,
        "700 22px Manrope, Arial, sans-serif",
        "#f6f8fb",
      );
      drawPreviewLabel(
        context,
        getDisplayRole(node),
        rect.left + padding,
        rect.top + rect.height - padding,
        rect.width - padding * 2,
        "500 17px Manrope, Arial, sans-serif",
        "#9ba9bc",
      );
    }
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG export failed"));
    }, "image/png");
  });
}

function getRulesText() {
  return [
    "Class contract:",
    "- l-: layout primitives such as l-shell, l-split, l-region",
    "- c-: reusable component surfaces such as c-toolbar, c-nav-panel",
    "- is-: state classes such as is-selected, is-editing",
    "- u-: limited utilities only when tokens cannot express intent",
    "",
    "AI editing rules:",
    "- Modify layoutMap first, then render from it.",
    "- Use CSS tokens for color, spacing, radius, and typography.",
    "- Avoid one-off inline styles except flex and map-derived sizing.",
    "- Keep visible canvas and JSON map semantically equivalent.",
    "- Regions carry auto-inferred area, order, and c-*-area classes from their visual position.",
    "- Use areaOverride only when a human or agent needs to lock an area such as sidebar-left.",
  ].join("\n");
}

function getPromptText() {
  const selected = getNode();
  return [
    "Use the shared layout map as the source of truth.",
    `Selected node: ${selected.id} (${selected.type}${selected.area ? ` / ${selected.area}` : selected.role ? ` / ${selected.role}` : ""})`,
    `Classes: ${selected.classes.join(", ")}`,
    `Purpose: ${selected.memo?.trim() || "(none)"}`,
    `Area override: ${getNodeAreaOverride(selected) || "auto"}`,
    `Final role: ${getDisplayRole(selected)}`,
    "",
    "Change request:",
    "- Keep the current class contract: l-, c-, is-, u-.",
    "- Update the prototype map before changing visual output.",
    "- Preserve readable region labels and inspector metadata.",
  ].join("\n");
}

function getAgentCheckpoint(kind = "checkpoint") {
  const selected = getNode();
  const label = {
    checkpoint: "중간 정리",
    decisions: "결정 기록",
    next: "다음 작업",
  }[kind] || "중간 정리";

  const lines = [
    `${label}`,
    `- 선택: ${selected.id} (${selected.type}${selected.role ? ` / ${selected.role}` : ""})`,
    `- 최종 역할: ${getDisplayRole(selected)}`,
    `- 노드: ${countNodes()}개`,
    `- 프리뷰: ${layoutMap.canvas.ratio}`,
  ];
  if (selected.memo?.trim()) lines.push(`- 설명: ${selected.memo.trim()}`);

  if (kind === "decisions") {
    lines.push("- 좌측은 Inspector/Hierarchy, 하단은 AI View, 우측은 Agent Chat으로 분리");
    lines.push("- layoutMap을 기준으로 캔버스와 AI View를 동기화");
  } else if (kind === "next") {
    lines.push("- 우측 Agent Chat을 실제 API 응답으로 연결");
    lines.push("- 체크포인트를 records 또는 작업 로그로 내보내는 흐름 검토");
  } else {
    lines.push(`- 클래스 계약: ${selected.classes.join(", ")}`);
    lines.push("- 레이아웃 변경 전후로 이 요약을 업데이트");
  }

  return lines.join("\n");
}

function appendAgentMessage(author, text, meta = "") {
  const article = document.createElement("article");
  article.className = `agent-message ${author}`;
  const icon = author === "user" ? "person" : author === "error" ? "error" : "neurology";
  const name = author === "user" ? "You" : author === "error" ? "System" : "Agent";
  article.innerHTML = `
    <span class="message-avatar material-symbols-rounded" aria-hidden="true">${icon}</span>
    <div>
      <strong>${name}</strong>
      <p></p>
      <small></small>
    </div>
  `;
  article.querySelector("p").textContent = text;
  article.querySelector("small").textContent = meta;
  agentThread.appendChild(article);
  agentThread.scrollTop = agentThread.scrollHeight;
  return article;
}

function updateAgentMessage(article, text, meta = "") {
  article.querySelector("p").textContent = text;
  article.querySelector("small").textContent = meta;
  agentThread.scrollTop = agentThread.scrollHeight;
}

function setAgentBusy(isBusy, label = "Ready") {
  agentStatus.textContent = label;
  agentStatus.classList.toggle("is-busy", isBusy);
  agentInput.disabled = isBusy;
  agentActionButtons.forEach((button) => {
    button.disabled = isBusy;
  });
}

function buildOutlineSnapshot(id = layoutMap.rootId, depth = 0, list = []) {
  const node = getNode(id);
  if (!node) return list;
  list.push({
    area: node.area || null,
    areaOverride: getNodeAreaOverride(node) || "",
    classes: node.classes || [],
    depth,
    direction: node.direction || null,
    finalRole: node.finalRole || "",
    finalRoleResolved: getDisplayRole(node),
    flex: node.flex ?? 1,
    id,
    memo: node.memo || "",
    order: node.order || null,
    role: node.role || null,
    type: node.type,
  });
  if (node.children) node.children.forEach((childId) => buildOutlineSnapshot(childId, depth + 1, list));
  return list;
}

function buildAgentContext() {
  const selected = getNode();
  return {
    actionLabels: agentActionLabels,
    aiView: {
      map: JSON.stringify(getSerializableMap(), null, 2),
      prompt: getPromptText(),
      rules: getRulesText(),
    },
    canvas: {
      ratio: layoutMap.canvas.ratio,
      theme: layoutMap.canvas.theme,
    },
    map: getSerializableMap(),
    outline: buildOutlineSnapshot(),
    selected: {
      ...selected,
      finalRoleResolved: getDisplayRole(selected),
    },
  };
}

function getLocalPatchForRoles() {
  const patch = { nodes: {} };
  getAllNodes().forEach((node) => {
    if (node.type !== "region") return;
    const finalRole = getDefaultFinalRole(node);
    const memo =
      node.memo?.trim() ||
      {
        body: "주요 콘텐츠와 작업 결과가 표시되는 중심 영역입니다.",
        foot: "하단 상태, 보조 정보, 후속 작업을 정리하는 영역입니다.",
        "sidebar-left": "구조 탐색과 선택 요소 편집을 담당하는 좌측 작업 영역입니다.",
        "sidebar-right": "AI 에이전트와 대화하며 화면 구조를 정리하는 보조 영역입니다.",
        top: "현재 도구, 화면 상태, 프리뷰 옵션을 빠르게 조작하는 상단 도구 영역입니다.",
      }[node.area] ||
      "화면의 독립적인 콘텐츠 섹션입니다.";
    patch.nodes[node.id] = { finalRole, memo };
  });
  return patch;
}

function getLocalAgentResult(action, message, reason = "local fallback") {
  const selected = getNode();
  const shouldPatch = action === "assign-roles" || action === "refine";
  const replyLines = [
    `${agentActionLabels[action] || "채팅"} 기준으로 현재 맵을 확인했어요.`,
    `선택 영역은 ${selected.id}이고, 최종 역할은 ${getDisplayRole(selected)}로 볼 수 있습니다.`,
  ];
  if (shouldPatch) replyLines.push("빈 설명과 최종 역할은 현재 배치 기준으로 채워 넣었습니다.");
  if (message?.trim()) replyLines.push(`요청 메모: ${message.trim()}`);

  return {
    meta: {
      model: "local-fallback",
      source: reason,
    },
    patch: shouldPatch ? getLocalPatchForRoles() : { nodes: {} },
    recommendations: ["SAM 프록시가 켜져 있으면 같은 요청을 실제 모델 판단으로 다시 실행할 수 있습니다."],
    reply: replyLines.join("\n"),
    summary: buildOutlineSnapshot()
      .filter((item) => item.type === "region")
      .map((item) => `${String(item.order || 1).padStart(2, "0")} ${item.id}: ${item.finalRoleResolved}`),
  };
}

function sanitizeAgentPatch(patch) {
  if (!patch || typeof patch !== "object") return { canvas: {}, nodes: {}, selectedId: null };
  const nodes = patch.nodes && typeof patch.nodes === "object" ? patch.nodes : {};
  const canvas = patch.canvas && typeof patch.canvas === "object" ? patch.canvas : {};
  const selectedPatchId = typeof patch.selectedId === "string" ? patch.selectedId : null;
  return { canvas, nodes, selectedId: selectedPatchId };
}

function getNumericPatchValue(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(clamp(number, min, max).toFixed(3));
}

function getPatchAreaOverride(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "auto") return "";
  return normalizeAreaOverride(value) || undefined;
}

function hasNodePatchChange(node, updates) {
  if (!node || !updates || typeof updates !== "object") return false;
  const nextFlex = updates.flex === undefined ? null : getNumericPatchValue(updates.flex, 0.05, 10);
  const nextGap = updates.gap === undefined ? null : getNumericPatchValue(updates.gap, 0, 48);
  const nextAreaOverride = getPatchAreaOverride(updates.areaOverride);
  return (
    (typeof updates.memo === "string" && node.memo !== updates.memo.trim()) ||
    (typeof updates.finalRole === "string" && node.finalRole !== updates.finalRole.trim()) ||
    (nextAreaOverride !== undefined && getNodeAreaOverride(node) !== nextAreaOverride) ||
    (nextFlex !== null && node.flex !== nextFlex) ||
    (nextGap !== null && node.type === "split" && (node.gap ?? 0) !== nextGap)
  );
}

function applyAgentPatch(patch) {
  const cleanPatch = sanitizeAgentPatch(patch);
  const changes = Object.entries(cleanPatch.nodes).filter(([id, updates]) => hasNodePatchChange(getNode(id), updates));
  const nextRatio = previewRatios[cleanPatch.canvas?.ratio] ? cleanPatch.canvas.ratio : null;
  const ratioChanged = nextRatio && layoutMap.canvas.ratio !== nextRatio;
  const selectedChanged = cleanPatch.selectedId && layoutMap.nodes[cleanPatch.selectedId] && selectedId !== cleanPatch.selectedId;

  if (changes.length > 0 || ratioChanged || selectedChanged) commitHistory("Agent patch");

  let changed = 0;
  changes.forEach(([id, updates]) => {
    const node = getNode(id);
    if (typeof updates.memo === "string" && node.memo !== updates.memo.trim()) {
      node.memo = updates.memo.trim();
      changed += 1;
    }
    if (typeof updates.finalRole === "string" && node.finalRole !== updates.finalRole.trim()) {
      node.finalRole = updates.finalRole.trim();
      changed += 1;
    }
    const nextAreaOverride = getPatchAreaOverride(updates.areaOverride);
    if (nextAreaOverride !== undefined && getNodeAreaOverride(node) !== nextAreaOverride) {
      if (nextAreaOverride) node.areaOverride = nextAreaOverride;
      else delete node.areaOverride;
      if (node.type === "split") node.classes = getSplitGroupClasses(node);
      changed += 1;
    }
    const nextFlex = updates.flex === undefined ? null : getNumericPatchValue(updates.flex, 0.05, 10);
    if (nextFlex !== null && node.flex !== nextFlex) {
      node.flex = nextFlex;
      changed += 1;
    }
    const nextGap = updates.gap === undefined ? null : getNumericPatchValue(updates.gap, 0, 48);
    if (nextGap !== null && node.type === "split" && (node.gap ?? 0) !== nextGap) {
      node.gap = nextGap;
      changed += 1;
    }
  });
  if (ratioChanged) {
    setPreviewRatio(nextRatio, false, false);
    changed += 1;
  }
  if (selectedChanged) {
    selectedId = cleanPatch.selectedId;
    changed += 1;
  }
  if (changed > 0) render();
  return changed;
}

async function requestAgent(action, message = "") {
  const cleanMessage = message.trim();
  const actionLabel = agentActionLabels[action] || agentActionLabels.chat;
  appendAgentMessage("user", cleanMessage || actionLabel);
  const pending = appendAgentMessage("assistant", "SAM Agent가 현재 맵을 읽는 중입니다...", "requesting");
  setAgentBusy(true, "Thinking");

  let result;
  try {
    const response = await fetch("/api/sam/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        history: agentHistory.slice(-8),
        message: cleanMessage,
        context: buildAgentContext(),
      }),
    });
    if (!response.ok) throw new Error(`SAM proxy ${response.status}`);
    result = await response.json();
  } catch (error) {
    result = getLocalAgentResult(action, cleanMessage, error.message);
  }

  const changed = applyAgentPatch(result.patch);
  const meta = [result.meta?.model, result.meta?.source, changed ? `${changed} fields applied` : "no patch"]
    .filter(Boolean)
    .join(" / ");
  const summary = Array.isArray(result.summary) && result.summary.length ? `\n\n요약\n- ${result.summary.join("\n- ")}` : "";
  const recommendations =
    Array.isArray(result.recommendations) && result.recommendations.length
      ? `\n\n다음\n- ${result.recommendations.join("\n- ")}`
      : "";

  updateAgentMessage(pending, `${result.reply || "정리 결과가 비어 있습니다."}${summary}${recommendations}`, meta);
  agentHistory.push({ role: "user", content: cleanMessage || actionLabel });
  agentHistory.push({ role: "assistant", content: result.reply || "" });
  setAgentBusy(false, result.meta?.model ? "SAM" : "Ready");
  showToast(changed ? "Agent patch applied" : "Agent replied");
}

function submitAgentMessage(text) {
  const clean = text.trim();
  if (!clean) return;
  requestAgent("chat", clean);
}

function renderAiView() {
  if (activeCodeView === "rules") {
    aiCode.textContent = getRulesText();
    return;
  }
  if (activeCodeView === "prompt") {
    aiCode.textContent = getPromptText();
    return;
  }
  aiCode.textContent = JSON.stringify(getSerializableMap(), null, 2);
}

function renderInspector() {
  const node = getNode();
  mapName.textContent = layoutMap.name;
  selectedTitle.textContent = `Selected: ${node.id}`;
  selectedMeta.textContent = `${node.type} / ${getAreaMetaText(node)}${node.order ? ` / ${String(node.order).padStart(2, "0")}` : ""}`;
  nodeCount.textContent = `${countNodes()} nodes`;
  nodeIdInput.value = node.id;
  nodeMemoInput.value = node.memo ?? "";
  nodeAreaInput.value = getNodeAreaOverride(node) || "auto";
  nodeFinalRoleInput.value = node.finalRole ?? "";
  nodeFinalRoleInput.placeholder = getDefaultFinalRole(node);
  nodeFlexInput.value = node.flex ?? 1;
  nodeGapInput.value = node.gap ?? 0;
  nodeGapInput.disabled = node.type !== "split";

  roleChips.forEach((chip) => {
    const active = node.role === chip.dataset.role;
    chip.classList.toggle("is-selected", active);
    chip.disabled = node.type !== "region";
  });

  classList.innerHTML = "";
  node.classes.forEach((className) => {
    const token = document.createElement("span");
    token.className = "class-token";
    token.textContent = className;
    classList.appendChild(token);
  });
}

function syncToolState() {
  const isMainActive = activeTool === "main";
  mainToolButton.classList.toggle("is-active", isMainActive);
  mainToolButton.setAttribute("aria-pressed", String(isMainActive));
  if (!isMainActive) hideToolPreview(true);
}

function getMergedModifiers(input = modifierState) {
  return {
    altKey: input.altKey ?? modifierState.altKey,
    ctrlKey: input.ctrlKey ?? modifierState.ctrlKey,
    metaKey: input.metaKey ?? modifierState.metaKey,
    shiftKey: input.shiftKey ?? modifierState.shiftKey,
  };
}

function getToolMode(input = modifierState) {
  if (activeTool !== "main") return "off";
  const modifiers = getMergedModifiers(input);
  if (modifiers.altKey) return "erase";
  if (modifiers.shiftKey && (modifiers.metaKey || modifiers.ctrlKey)) return "cut-vertical";
  if (modifiers.shiftKey) return "cut-horizontal";
  return "edit";
}

function updateModifierState(event, pressed) {
  if (event.key === "Alt") modifierState.altKey = pressed;
  if (event.key === "Control") modifierState.ctrlKey = pressed;
  if (event.key === "Meta") modifierState.metaKey = pressed;
  if (event.key === "Shift") modifierState.shiftKey = pressed;
}

function resetToolModeClasses() {
  canvasFrame.classList.remove(
    "is-tool-cut",
    "is-tool-erase",
    "is-tool-preview",
    "is-tool-resize-horizontal",
    "is-tool-resize-vertical",
  );
}

function hideToolPreview(clearPointer = false) {
  resetToolModeClasses();
  if (clearPointer) lastCutPointer = null;
}

function getRegionCutInfo(clientX, clientY, direction, sourceElement = document.elementFromPoint(clientX, clientY)) {
  const target = sourceElement?.closest?.("[data-node-id]");
  if (!target || !canvasFrame.contains(target)) return null;

  const node = getNode(target.dataset.nodeId);
  if (!node || node.type !== "region") return null;

  const frameRect = canvasFrame.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const x = clamp(clientX, targetRect.left, targetRect.right);
  const y = clamp(clientY, targetRect.top, targetRect.bottom);
  const ratio =
    direction === "vertical"
      ? (x - targetRect.left) / Math.max(targetRect.width, 1)
      : (y - targetRect.top) / Math.max(targetRect.height, 1);

  return {
    direction,
    id: node.id,
    ratio: clamp(ratio, ratioLimits.cutMin, ratioLimits.cutMax),
    frameRect,
    targetRect,
    x: x - frameRect.left,
    y: y - frameRect.top,
    left: targetRect.left - frameRect.left,
    top: targetRect.top - frameRect.top,
    width: targetRect.width,
    height: targetRect.height,
  };
}

function getSeamInfo(clientX, clientY) {
  const frameRect = canvasFrame.getBoundingClientRect();
  const tolerance = 8;
  let best = null;

  Array.from(canvasFrame.querySelectorAll(".l-split")).forEach((splitElement) => {
    const split = getNode(splitElement.dataset.nodeId);
    if (!split?.children || split.children.length < 2) return;

    const splitRect = splitElement.getBoundingClientRect();
    const childElements = Array.from(splitElement.children).filter((child) => child.dataset.nodeId);

    for (let index = 0; index < childElements.length - 1; index += 1) {
      const firstRect = childElements[index].getBoundingClientRect();
      const secondRect = childElements[index + 1].getBoundingClientRect();

      if (split.direction === "vertical") {
        const seamX = firstRect.right;
        const distance = Math.abs(clientX - seamX);
        const insideY = clientY >= splitRect.top && clientY <= splitRect.bottom;
        if (distance > tolerance || !insideY) continue;
        if (!best || distance < best.distance) {
          best = {
            direction: "vertical",
            distance,
            index,
            splitId: split.id,
            x: seamX - frameRect.left,
            y: clientY - frameRect.top,
            left: splitRect.left - frameRect.left,
            top: splitRect.top - frameRect.top,
            width: splitRect.width,
            height: splitRect.height,
            pairRect: {
              left: firstRect.left,
              top: firstRect.top,
              width: firstRect.width + secondRect.width,
              height: splitRect.height,
            },
          };
        }
        continue;
      }

      const seamY = firstRect.bottom;
      const distance = Math.abs(clientY - seamY);
      const insideX = clientX >= splitRect.left && clientX <= splitRect.right;
      if (distance > tolerance || !insideX) continue;
      if (!best || distance < best.distance) {
        best = {
          direction: "horizontal",
          distance,
          index,
          splitId: split.id,
          x: clientX - frameRect.left,
          y: seamY - frameRect.top,
          left: splitRect.left - frameRect.left,
          top: splitRect.top - frameRect.top,
          width: splitRect.width,
          height: splitRect.height,
          pairRect: {
            left: firstRect.left,
            top: firstRect.top,
            width: splitRect.width,
            height: firstRect.height + secondRect.height,
          },
        };
      }
    }
  });

  return best;
}

function setToolPreview(info, action) {
  if (!info || !cutPreviewLine) {
    hideToolPreview();
    return;
  }

  cutPreviewLine.dataset.direction = info.direction;
  cutPreviewLine.dataset.action = action;
  canvasFrame.style.setProperty("--cut-left", `${Math.round(info.left)}px`);
  canvasFrame.style.setProperty("--cut-top", `${Math.round(info.top)}px`);
  canvasFrame.style.setProperty("--cut-width", `${Math.round(info.width)}px`);
  canvasFrame.style.setProperty("--cut-height", `${Math.round(info.height)}px`);
  canvasFrame.style.setProperty("--cut-x", `${Math.round(info.x)}px`);
  canvasFrame.style.setProperty("--cut-y", `${Math.round(info.y)}px`);
  resetToolModeClasses();
  canvasFrame.classList.add("is-tool-preview");
  if (action === "cut") canvasFrame.classList.add("is-tool-cut");
  if (action === "erase") canvasFrame.classList.add("is-tool-erase");
  if (action === "resize") canvasFrame.classList.add(`is-tool-resize-${info.direction}`);
}

function updateToolPreview(clientX, clientY, input = modifierState, sourceElement) {
  const modifiers = getMergedModifiers(input);
  const mode = getToolMode(modifiers);
  lastCutPointer = { clientX, clientY, modifiers };

  if (mode === "cut-horizontal" || mode === "cut-vertical") {
    const direction = mode === "cut-vertical" ? "vertical" : "horizontal";
    setToolPreview(getRegionCutInfo(clientX, clientY, direction, sourceElement), "cut");
    return;
  }

  if (mode === "erase") {
    setToolPreview(getSeamInfo(clientX, clientY), "erase");
    if (!canvasFrame.classList.contains("is-tool-preview")) canvasFrame.classList.add("is-tool-erase");
    return;
  }

  if (mode === "edit") {
    setToolPreview(getSeamInfo(clientX, clientY), "resize");
    return;
  }

  hideToolPreview();
}

function refreshToolPreview() {
  if (!lastCutPointer) return;
  updateToolPreview(lastCutPointer.clientX, lastCutPointer.clientY, modifierState);
}

function removeSeam(info) {
  const split = getNode(info.splitId);
  if (!split?.children || split.children.length < 2) return;

  const firstId = split.children[info.index];
  const secondId = split.children[info.index + 1];
  const first = getNode(firstId);
  const second = getNode(secondId);
  const role = first?.role || second?.role || "content";
  const areaOverride = getNodeAreaOverride(split);
  commitHistory("Remove split line");
  const merged = {
    id: split.children.length === 2 ? split.id : makeUniqueId("merged-region"),
    type: "region",
    role,
    flex: split.children.length === 2 ? split.flex ?? 1 : (first?.flex ?? 1) + (second?.flex ?? 1),
    memo: [first?.memo, second?.memo].filter(Boolean).join("\n"),
    finalRole: [first?.finalRole, second?.finalRole].filter(Boolean).join(" / "),
    classes: ["l-region", `c-${role}-panel`],
  };
  if (areaOverride) merged.areaOverride = areaOverride;

  deleteSubtree(firstId);
  deleteSubtree(secondId);

  if (split.children.length === 2) {
    layoutMap.nodes[split.id] = merged;
  } else {
    layoutMap.nodes[merged.id] = merged;
    split.children.splice(info.index, 2, merged.id);
  }

  selectedId = merged.id;
  render();
  showToast("Split line removed");
}

function handleMainCanvasClick(event) {
  const mode = getToolMode(event);

  if (mode === "cut-horizontal" || mode === "cut-vertical") {
    const direction = mode === "cut-vertical" ? "vertical" : "horizontal";
    const info = getRegionCutInfo(event.clientX, event.clientY, direction, event.target);
    if (!info) return;
    event.preventDefault();
    event.stopPropagation();
    splitRegion(info.id, info.direction, info.ratio);
    hideToolPreview();
    return;
  }

  if (mode === "erase") {
    const info = getSeamInfo(event.clientX, event.clientY);
    if (!info) return;
    event.preventDefault();
    event.stopPropagation();
    removeSeam(info);
  }
}

function updateResizeFromPointer(event) {
  if (!resizeState) return;
  const split = getNode(resizeState.splitId);
  const first = getNode(split?.children?.[resizeState.index]);
  const second = getNode(split?.children?.[resizeState.index + 1]);
  if (!split || !first || !second) return;

  const rawRatio =
    resizeState.direction === "vertical"
      ? (event.clientX - resizeState.pairRect.left) / Math.max(resizeState.pairRect.width, 1)
      : (event.clientY - resizeState.pairRect.top) / Math.max(resizeState.pairRect.height, 1);
  const ratio = clamp(rawRatio, ratioLimits.resizeMin, ratioLimits.resizeMax);
  first.flex = Number((resizeState.totalFlex * ratio).toFixed(2));
  second.flex = Number((resizeState.totalFlex - first.flex).toFixed(2));
  render();
  updateToolPreview(event.clientX, event.clientY, event);
}

function stopResize() {
  resizeState = null;
  document.body.classList.remove("is-resizing");
  window.removeEventListener("pointermove", updateResizeFromPointer);
  window.removeEventListener("pointerup", stopResize);
}

function startMainResize(event) {
  if (getToolMode(event) !== "edit") return;
  const info = getSeamInfo(event.clientX, event.clientY);
  if (!info) return;

  const split = getNode(info.splitId);
  const first = getNode(split.children[info.index]);
  const second = getNode(split.children[info.index + 1]);
  commitHistory("Resize split");
  resizeState = {
    direction: info.direction,
    index: info.index,
    pairRect: info.pairRect,
    splitId: info.splitId,
    totalFlex: (first?.flex ?? 1) + (second?.flex ?? 1),
  };
  event.preventDefault();
  event.stopPropagation();
  document.body.classList.add("is-resizing");
  window.addEventListener("pointermove", updateResizeFromPointer);
  window.addEventListener("pointerup", stopResize, { once: true });
}

function render() {
  canvasFrame.innerHTML = "";
  const root = document.createElement("div");
  root.className = "prototype-root";
  root.appendChild(renderCanvasNode(layoutMap.rootId));
  canvasFrame.appendChild(root);
  applyAutoRegionSemantics();
  refreshCanvasSelectionBadge();
  cutPreviewLine = document.createElement("div");
  cutPreviewLine.className = "cut-preview-line";
  cutPreviewLine.dataset.direction = "horizontal";
  canvasFrame.appendChild(cutPreviewLine);
  syncToolState();

  outlineTree.innerHTML = "";
  buildOutline();
  renderInspector();
  renderAiView();
}

function splitRegion(regionId, direction, ratio = 0.5) {
  const node = getNode(regionId);
  if (!node || node.type !== "region") {
    showToast("Select a region before splitting");
    return;
  }
  commitHistory(direction === "vertical" ? "Vertical split" : "Horizontal split");
  const firstId = makeUniqueId(`${node.role || "region"}-a`);
  const secondId = makeUniqueId(`${node.role || "region"}-b`);
  const firstFlex = Number(clamp(ratio, ratioLimits.cutMin, ratioLimits.cutMax).toFixed(3));
  const secondFlex = Number((1 - firstFlex).toFixed(3));
  const areaOverride = getNodeAreaOverride(node);
  const splitNode = {
    id: node.id,
    type: "split",
    direction,
    gap: 0,
    flex: node.flex ?? 1,
    memo: node.memo || "",
    classes: ["l-split", `c-${areaOverride || node.role || "region"}-group`],
    children: [firstId, secondId],
  };
  if (areaOverride) splitNode.areaOverride = areaOverride;
  layoutMap.nodes[firstId] = {
    id: firstId,
    type: "region",
    role: node.role || "content",
    flex: firstFlex,
    memo: "",
    finalRole: "",
    classes: ["l-region", `c-${node.role || "content"}-panel`],
  };
  layoutMap.nodes[secondId] = {
    id: secondId,
    type: "region",
    role: "content",
    flex: secondFlex,
    memo: "",
    finalRole: "",
    classes: ["l-region", "c-content-panel"],
  };
  layoutMap.nodes[node.id] = splitNode;
  selectedId = secondId;
  render();
  showToast(direction === "vertical" ? "Vertical split created" : "Horizontal split created");
}

function splitSelected(direction) {
  splitRegion(selectedId, direction);
}

function addRegion() {
  const node = getNode();
  const parentInfo = node.type === "split" ? { parent: node, index: node.children.length - 1 } : getParentInfo(node.id);
  if (!parentInfo) {
    showToast("Root cannot receive a sibling");
    return;
  }
  commitHistory("Add region");
  const id = makeUniqueId("region");
  layoutMap.nodes[id] = {
    id,
    type: "region",
    role: "content",
    flex: 1,
    memo: "",
    finalRole: "",
    classes: ["l-region", "c-content-panel"],
  };
  parentInfo.parent.children.splice(parentInfo.index + 1, 0, id);
  selectedId = id;
  render();
  showToast("Region added");
}

function duplicateSelected() {
  const node = getNode();
  const parentInfo = getParentInfo(node.id);
  if (!parentInfo) {
    showToast("Root cannot be duplicated");
    return;
  }
  if (node.type !== "region") {
    showToast("Duplicate a region, not a split");
    return;
  }
  commitHistory("Duplicate region");
  const id = makeUniqueId(node.id);
  layoutMap.nodes[id] = cloneMapNode(node, id);
  parentInfo.parent.children.splice(parentInfo.index + 1, 0, id);
  selectedId = id;
  render();
  showToast("Node duplicated");
}

function deleteSubtree(id) {
  const node = getNode(id);
  if (node?.children) node.children.forEach(deleteSubtree);
  delete layoutMap.nodes[id];
}

function deleteSelected() {
  const parentInfo = getParentInfo(selectedId);
  if (!parentInfo) {
    showToast("Root cannot be deleted");
    return;
  }
  commitHistory("Delete node");
  const removed = parentInfo.parent.children.splice(parentInfo.index, 1)[0];
  deleteSubtree(removed);
  selectedId = parentInfo.parent.children[parentInfo.index] || parentInfo.parent.children[parentInfo.index - 1] || parentInfo.parent.id;
  render();
  showToast("Node removed");
}

function selectNextNode() {
  const ids = getAllNodes().map((node) => node.id);
  const index = ids.indexOf(selectedId);
  selectedId = ids[(index + 1) % ids.length];
  render();
}

function updateSelectedId(nextId) {
  const node = getNode();
  const clean = nextId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (!clean || clean === node.id) {
    nodeIdInput.value = node.id;
    return;
  }
  if (layoutMap.nodes[clean]) {
    showToast("ID already exists");
    nodeIdInput.value = node.id;
    return;
  }
  commitHistory("Rename node");
  const oldId = node.id;
  node.id = clean;
  layoutMap.nodes[clean] = node;
  delete layoutMap.nodes[oldId];
  const parentInfo = getParentInfo(oldId);
  if (parentInfo) parentInfo.parent.children[parentInfo.index] = clean;
  if (layoutMap.rootId === oldId) layoutMap.rootId = clean;
  selectedId = clean;
  render();
  showToast("ID updated");
}

function copyPrompt() {
  const text = activeCodeView === "map" ? getLayoutMapJson() : aiCode.textContent;
  navigator.clipboard?.writeText(text).then(
    () => showToast("AI view copied"),
    () => showToast("Copy unavailable"),
  );
}

function exportMap() {
  activeCodeView = "map";
  syncCodeTabs();
  renderAiView();
  copyPrompt();
  recordEvent("Export map", "event");
}

async function exportPreviewPng() {
  try {
    const blob = await createLayoutPreviewBlob();
    downloadBlob(`${getMapSlug()}-layout-preview.png`, blob);
    recordEvent("Export preview PNG", "event");
    showToast("Preview PNG downloaded");
  } catch (error) {
    console.error(error);
    showToast("Preview export failed");
  }
}

async function exportBundle() {
  activeCodeView = "map";
  syncCodeTabs();
  renderAiView();
  try {
    const slug = getMapSlug();
    const previewBlob = await createLayoutPreviewBlob();
    downloadTextFile(`${slug}-layout-map.json`, getLayoutMapJson(), "application/json");
    downloadTextFile(`${slug}-layout-brief.md`, getLayoutBriefText(), "text/markdown");
    downloadBlob(`${slug}-layout-preview.png`, previewBlob);
    recordEvent("Export layout bundle", "event");
    showToast("Bundle exported");
  } catch (error) {
    console.error(error);
    showToast("Bundle export failed");
  }
}

async function saveProjectBundle() {
  activeCodeView = "map";
  syncCodeTabs();
  renderAiView();
  saveProjectButton.disabled = true;
  try {
    const slug = getMapSlug();
    const previewBlob = await createLayoutPreviewBlob();
    const response = await fetch("/api/layout/save-project", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        briefMarkdown: getLayoutBriefText(),
        mapJson: getLayoutMapJson(),
        previewPngDataUrl: await blobToDataUrl(previewBlob),
        slug,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Project save failed");
    recordEvent(`Save project bundle: ${result.relativePath || result.directory}`, "event");
    showToast("Saved to project");
  } catch (error) {
    console.error(error);
    showToast("Project save failed");
  } finally {
    saveProjectButton.disabled = false;
  }
}

async function loadProjectBundle() {
  commitDraftHistory();
  loadProjectButton.disabled = true;
  try {
    const response = await fetch("/api/layout/load-project");
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Project load failed");
    const nextMap = normalizeLoadedMap(result.map);
    pushUndoSnapshot(createHistorySnapshot(), "Load project bundle");
    redoStack = [];
    layoutMap = nextMap;
    selectedId = nextMap.nodes[result.map.selectedId] ? result.map.selectedId : nextMap.rootId;
    idCounter = getNextIdCounterFromNodes(nextMap.nodes);
    activeCodeView = "map";
    syncCodeTabs();
    setPreviewRatio(nextMap.canvas.ratio, false, false);
    render();
    recordEvent(`Load project bundle: ${result.relativePath || result.directory}`, "change");
    showToast("Loaded project");
  } catch (error) {
    console.error(error);
    showToast("Project load failed");
  } finally {
    loadProjectButton.disabled = false;
  }
}

function resetMap() {
  commitDraftHistory();
  if (!isSameSnapshot(createHistorySnapshot(), { activeCodeView, idCounter, layoutMap: structuredClone(initialMap), selectedId: initialMap.rootId })) {
    commitHistory("Reset map");
  }
  layoutMap = structuredClone(initialMap);
  selectedId = layoutMap.rootId;
  activeCodeView = "map";
  setPreviewRatio(layoutMap.canvas.ratio, false);
  syncCodeTabs();
  render();
  showToast("Map reset");
}

function setPreviewRatio(ratio, announce = true, record = false) {
  const nextRatio = previewRatios[ratio] ? ratio : "16:9";
  if (record && layoutMap.canvas.ratio !== nextRatio) commitHistory(`Preview ratio ${nextRatio}`);
  canvasFrame.style.setProperty("--preview-aspect", previewRatios[nextRatio]);
  layoutMap.canvas.ratio = nextRatio;
  previewRatioValue.textContent = nextRatio;
  previewRatioOptions.forEach((option) => {
    const active = option.dataset.ratio === nextRatio;
    option.classList.toggle("is-selected", active);
    option.setAttribute("aria-checked", String(active));
  });
  renderAiView();
  if (announce) showToast(`Preview ${nextRatio}`);
}

function setRatioMenuOpen(open) {
  previewRatioMenu.hidden = !open;
  previewRatioButton.setAttribute("aria-expanded", String(open));
}

function initResizers() {
  sidebarResizer.setAttribute("aria-valuemin", String(layoutLimits.sidebarMin));
  sidebarResizer.setAttribute("aria-valuemax", String(layoutLimits.sidebarMax));
  sidebarResizer.setAttribute("aria-valuenow", String(layoutLimits.sidebarDefault));
  agentResizer.setAttribute("aria-valuemin", String(layoutLimits.agentMin));
  agentResizer.setAttribute("aria-valuemax", String(layoutLimits.agentMax));
  agentResizer.setAttribute("aria-valuenow", String(layoutLimits.agentDefault));
  aiPanelResizer.setAttribute("aria-valuemin", String(layoutLimits.aiMin));
  aiPanelResizer.setAttribute("aria-valuemax", String(getAiPanelMax()));
  aiPanelResizer.setAttribute("aria-valuenow", `${Math.round(canvasStage.getBoundingClientRect().height * layoutLimits.aiDefaultRatio)}`);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getSidebarMax() {
  const workspaceWidth = workspace.getBoundingClientRect().width;
  const agentWidth = document.querySelector(".agent-panel").getBoundingClientRect().width;
  return Math.max(layoutLimits.sidebarMin, Math.min(layoutLimits.sidebarMax, workspaceWidth - agentWidth - 720));
}

function setSidebarWidth(width) {
  const nextWidth = Math.round(clamp(width, layoutLimits.sidebarMin, getSidebarMax()));
  workspace.style.setProperty("--sidebar-width", `${nextWidth}px`);
  sidebarResizer.setAttribute("aria-valuenow", String(nextWidth));
}

function resetSidebarWidth() {
  workspace.style.removeProperty("--sidebar-width");
  sidebarResizer.setAttribute("aria-valuenow", String(layoutLimits.sidebarDefault));
  showToast("Sidebar reset");
}

function getAgentMax() {
  const workspaceWidth = workspace.getBoundingClientRect().width;
  const sidebarWidth = document.querySelector(".control-panel").getBoundingClientRect().width;
  return Math.max(layoutLimits.agentMin, Math.min(layoutLimits.agentMax, workspaceWidth - sidebarWidth - 720));
}

function setAgentWidth(width) {
  const nextWidth = Math.round(clamp(width, layoutLimits.agentMin, getAgentMax()));
  workspace.style.setProperty("--agent-width", `${nextWidth}px`);
  agentResizer.setAttribute("aria-valuenow", String(nextWidth));
}

function resetAgentWidth() {
  workspace.style.removeProperty("--agent-width");
  agentResizer.setAttribute("aria-valuenow", String(layoutLimits.agentDefault));
  showToast("Agent reset");
}

function getAiPanelMax() {
  const stageHeight = canvasStage.getBoundingClientRect().height;
  return Math.max(220, Math.round(stageHeight * layoutLimits.aiMaxRatio));
}

function setAiPanelHeight(height) {
  const nextHeight = Math.round(clamp(height, layoutLimits.aiMin, getAiPanelMax()));
  canvasStage.style.setProperty("--ai-panel-height", `${nextHeight}px`);
  aiPanelResizer.setAttribute("aria-valuenow", String(nextHeight));
}

function resetAiPanelHeight() {
  canvasStage.style.removeProperty("--ai-panel-height");
  aiPanelResizer.setAttribute("aria-valuenow", `${Math.round(canvasStage.getBoundingClientRect().height * layoutLimits.aiDefaultRatio)}`);
  showToast("AI View reset");
}

function startSidebarResize(event) {
  event.preventDefault();
  sidebarResizer.classList.add("is-active");
  document.body.classList.add("is-resizing");

  function resize(moveEvent) {
    const workspaceRect = workspace.getBoundingClientRect();
    setSidebarWidth(moveEvent.clientX - workspaceRect.left);
  }

  function stopResize() {
    sidebarResizer.classList.remove("is-active");
    document.body.classList.remove("is-resizing");
    window.removeEventListener("pointermove", resize);
    window.removeEventListener("pointerup", stopResize);
  }

  resize(event);
  window.addEventListener("pointermove", resize);
  window.addEventListener("pointerup", stopResize, { once: true });
}

function startAiPanelResize(event) {
  event.preventDefault();
  aiPanelResizer.classList.add("is-active");
  document.body.classList.add("is-resizing");

  function resize(moveEvent) {
    const stageRect = canvasStage.getBoundingClientRect();
    const paddingBottom = Number.parseFloat(getComputedStyle(canvasStage).paddingBottom) || 0;
    setAiPanelHeight(stageRect.bottom - moveEvent.clientY - paddingBottom);
  }

  function stopResize() {
    aiPanelResizer.classList.remove("is-active");
    document.body.classList.remove("is-resizing");
    window.removeEventListener("pointermove", resize);
    window.removeEventListener("pointerup", stopResize);
  }

  resize(event);
  window.addEventListener("pointermove", resize);
  window.addEventListener("pointerup", stopResize, { once: true });
}

function startAgentResize(event) {
  event.preventDefault();
  agentResizer.classList.add("is-active");
  document.body.classList.add("is-resizing");

  function resize(moveEvent) {
    const workspaceRect = workspace.getBoundingClientRect();
    setAgentWidth(workspaceRect.right - moveEvent.clientX);
  }

  function stopResize() {
    agentResizer.classList.remove("is-active");
    document.body.classList.remove("is-resizing");
    window.removeEventListener("pointermove", resize);
    window.removeEventListener("pointerup", stopResize);
  }

  resize(event);
  window.addEventListener("pointermove", resize);
  window.addEventListener("pointerup", stopResize, { once: true });
}

document.querySelector("#splitVerticalButton").addEventListener("click", () => splitSelected("vertical"));
document.querySelector("#splitHorizontalButton").addEventListener("click", () => splitSelected("horizontal"));
document.querySelector("#addRegionButton").addEventListener("click", addRegion);
document.querySelector("#duplicateButton").addEventListener("click", duplicateSelected);
document.querySelector("#deleteButton").addEventListener("click", deleteSelected);
document.querySelector("#nextNodeButton").addEventListener("click", selectNextNode);
document.querySelector("#copyPromptButton").addEventListener("click", copyPrompt);
document.querySelector("#exportMapButton").addEventListener("click", exportMap);
exportPreviewButton.addEventListener("click", exportPreviewPng);
exportBundleButton.addEventListener("click", exportBundle);
loadProjectButton.addEventListener("click", loadProjectBundle);
saveProjectButton.addEventListener("click", saveProjectBundle);
document.querySelector("#resetMapButton").addEventListener("click", resetMap);
undoButton.addEventListener("click", undoHistory);
redoButton.addEventListener("click", redoHistory);
mainToolButton.addEventListener("click", () => {
  activeTool = activeTool === "main" ? null : "main";
  syncToolState();
  recordEvent(activeTool === "main" ? "Main tool on" : "Main tool off", "event");
});
canvasFrame.addEventListener("pointerdown", startMainResize);
canvasFrame.addEventListener("pointermove", (event) => {
  updateToolPreview(event.clientX, event.clientY, event, event.target);
});
canvasFrame.addEventListener("pointerleave", () => hideToolPreview(true));
canvasFrame.addEventListener("click", handleMainCanvasClick, true);
previewRatioButton.addEventListener("click", () => setRatioMenuOpen(previewRatioMenu.hidden));
previewRatioOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setPreviewRatio(option.dataset.ratio, true, true);
    setRatioMenuOpen(false);
    previewRatioButton.focus();
  });
});

sidebarResizer.addEventListener("pointerdown", startSidebarResize);
sidebarResizer.addEventListener("dblclick", resetSidebarWidth);
sidebarResizer.addEventListener("keydown", (event) => {
  const currentWidth = document.querySelector(".control-panel").getBoundingClientRect().width;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    setSidebarWidth(currentWidth + (event.key === "ArrowRight" ? 24 : -24));
  }
  if (event.key === "Home") {
    event.preventDefault();
    resetSidebarWidth();
  }
});

aiPanelResizer.addEventListener("pointerdown", startAiPanelResize);
aiPanelResizer.addEventListener("dblclick", resetAiPanelHeight);
aiPanelResizer.addEventListener("keydown", (event) => {
  const currentHeight = document.querySelector(".canvas-stage > .ai-panel").getBoundingClientRect().height;
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    setAiPanelHeight(currentHeight + (event.key === "ArrowUp" ? 24 : -24));
  }
  if (event.key === "Home") {
    event.preventDefault();
    resetAiPanelHeight();
  }
});

agentResizer.addEventListener("pointerdown", startAgentResize);
agentResizer.addEventListener("dblclick", resetAgentWidth);
agentResizer.addEventListener("keydown", (event) => {
  const currentWidth = document.querySelector(".agent-panel").getBoundingClientRect().width;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    setAgentWidth(currentWidth + (event.key === "ArrowLeft" ? 24 : -24));
  }
  if (event.key === "Home") {
    event.preventDefault();
    resetAgentWidth();
  }
});

agentActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    requestAgent(button.dataset.agentAction);
  });
});

agentComposer.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAgentMessage(agentInput.value);
  agentInput.value = "";
});

window.addEventListener("resize", () => {
  const sidebarWidth = document.querySelector(".control-panel").getBoundingClientRect().width;
  setSidebarWidth(sidebarWidth);
  const agentWidth = document.querySelector(".agent-panel").getBoundingClientRect().width;
  if (workspace.style.getPropertyValue("--agent-width")) setAgentWidth(agentWidth);
  const aiHeight = document.querySelector(".canvas-stage > .ai-panel").getBoundingClientRect().height;
  if (canvasStage.style.getPropertyValue("--ai-panel-height")) setAiPanelHeight(aiHeight);
});

document.addEventListener("click", (event) => {
  if (!previewRatioControl.contains(event.target)) setRatioMenuOpen(false);
});

document.querySelector("#dockBottomButton").addEventListener("click", () => {
  workspace.dataset.dock = "bottom";
  dockStatus.textContent = "Dock bottom";
  recordEvent("Dock bottom", "event");
  showToast("Dock moved bottom");
});

document.querySelector("#dockLeftButton").addEventListener("click", () => {
  workspace.dataset.dock = "left";
  dockStatus.textContent = "Dock left";
  recordEvent("Dock left", "event");
  showToast("Dock moved left");
});

document.querySelector("#themeToggle").addEventListener("click", () => {
  const nextTheme = shell.dataset.theme === "dark" ? "light" : "dark";
  shell.dataset.theme = nextTheme;
  document.querySelector("#themeToggle .material-symbols-rounded").textContent =
    nextTheme === "dark" ? "light_mode" : "dark_mode";
  recordEvent(`Theme ${nextTheme}`, "event");
});

nodeIdInput.addEventListener("change", () => updateSelectedId(nodeIdInput.value));
nodeMemoInput.addEventListener("focus", () => beginDraftHistory("Edit purpose"));
nodeMemoInput.addEventListener("input", () => {
  beginDraftHistory("Edit purpose");
  getNode().memo = nodeMemoInput.value;
  renderAiView();
  refreshCanvasSelectionBadge();
  refreshCanvasRegionPurpose();
  outlineTree.innerHTML = "";
  buildOutline();
  scheduleDraftHistoryCommit();
});
nodeMemoInput.addEventListener("change", () => {
  beginDraftHistory("Edit purpose");
  getNode().memo = nodeMemoInput.value;
  renderAiView();
  refreshCanvasSelectionBadge();
  refreshCanvasRegionPurpose();
  outlineTree.innerHTML = "";
  buildOutline();
  commitDraftHistory();
});
nodeMemoInput.addEventListener("blur", commitDraftHistory);
nodeAreaInput.addEventListener("change", () => {
  commitHistory("Edit area");
  const node = getNode();
  const area = normalizeAreaOverride(nodeAreaInput.value);
  if (area) node.areaOverride = area;
  else delete node.areaOverride;
  if (node.type === "split") node.classes = getSplitGroupClasses(node);
  render();
  showToast(area ? `Area set to ${area}` : "Area set to Auto");
});
nodeFinalRoleInput.addEventListener("focus", () => beginDraftHistory("Edit final role"));
nodeFinalRoleInput.addEventListener("input", () => {
  beginDraftHistory("Edit final role");
  getNode().finalRole = nodeFinalRoleInput.value;
  renderAiView();
  refreshCanvasSelectionBadge();
  outlineTree.innerHTML = "";
  buildOutline();
  scheduleDraftHistoryCommit();
});
nodeFinalRoleInput.addEventListener("change", () => {
  beginDraftHistory("Edit final role");
  getNode().finalRole = nodeFinalRoleInput.value;
  renderAiView();
  refreshCanvasSelectionBadge();
  outlineTree.innerHTML = "";
  buildOutline();
  commitDraftHistory();
});
nodeFinalRoleInput.addEventListener("blur", commitDraftHistory);
nodeFlexInput.addEventListener("focus", () => beginDraftHistory("Edit flex"));
nodeFlexInput.addEventListener("input", () => {
  beginDraftHistory("Edit flex");
  getNode().flex = Number(nodeFlexInput.value);
  render();
  scheduleDraftHistoryCommit();
});
nodeFlexInput.addEventListener("change", () => {
  beginDraftHistory("Edit flex");
  getNode().flex = Number(nodeFlexInput.value);
  render();
  commitDraftHistory();
});
nodeFlexInput.addEventListener("blur", commitDraftHistory);
nodeGapInput.addEventListener("focus", () => beginDraftHistory("Edit gap"));
nodeGapInput.addEventListener("input", () => {
  beginDraftHistory("Edit gap");
  const node = getNode();
  if (node.type === "split") node.gap = Number(nodeGapInput.value);
  render();
  scheduleDraftHistoryCommit();
});
nodeGapInput.addEventListener("change", () => {
  beginDraftHistory("Edit gap");
  const node = getNode();
  if (node.type === "split") node.gap = Number(nodeGapInput.value);
  render();
  commitDraftHistory();
});
nodeGapInput.addEventListener("blur", commitDraftHistory);

roleChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const node = getNode();
    if (node.type !== "region") return;
    commitHistory("Update role");
    node.role = chip.dataset.role;
    node.classes = ["l-region", `c-${node.role}-panel`];
    render();
    showToast("Role updated");
  });
});

codeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeCodeView = tab.dataset.view;
    syncCodeTabs();
    renderAiView();
    recordEvent(`AI View ${activeCodeView}`, "event");
  });
});

document.addEventListener("keydown", (event) => {
  updateModifierState(event, true);
  refreshToolPreview();
  if (event.key === "Escape" && !previewRatioMenu.hidden) {
    event.preventDefault();
    setRatioMenuOpen(false);
    previewRatioButton.focus();
    return;
  }
  const editing = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
  const inPreviewControl = document.activeElement.closest?.("#previewRatioControl");
  const onResizer = document.activeElement.getAttribute?.("role") === "separator";
  if (editing || inPreviewControl || onResizer) return;
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === "z") {
    event.preventDefault();
    if (event.shiftKey) redoHistory();
    else undoHistory();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && key === "y") {
    event.preventDefault();
    redoHistory();
    return;
  }
  if (key === "v") {
    event.preventDefault();
    splitSelected("vertical");
  }
  if (key === "h") {
    event.preventDefault();
    splitSelected("horizontal");
  }
  if (key === "a") {
    event.preventDefault();
    addRegion();
  }
  if (key === "d") {
    event.preventDefault();
    duplicateSelected();
  }
  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    deleteSelected();
  }
  if (event.key === "Tab") {
    event.preventDefault();
    selectNextNode();
  }
  if ((event.metaKey || event.ctrlKey) && key === "e") {
    event.preventDefault();
    exportMap();
  }
});

document.addEventListener("keyup", (event) => {
  updateModifierState(event, false);
  refreshToolPreview();
});

render();
setPreviewRatio(layoutMap.canvas.ratio, false);
initResizers();
recordEvent("Session ready", "event");
