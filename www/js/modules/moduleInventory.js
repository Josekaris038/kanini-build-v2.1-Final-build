// ===== moduleInventory.js (KANINI INVENTORY v20 STABLE RECEIVE FIX + CSS SAFE) =====

ModuleLoader.register("inventory", function () {

  const container = document.getElementById("moduleContainer");
  if (!container) return;

  const Data = window.DataService;
  const StateKernel = window.StateKernel;
  const Cart = window.CartStore;
  const Bus = window.EventKernel;

  // ===============================
  // STATE
  // ===============================
  const State = {
    search: "",
    editMode: false,
    editId: null,
    receiveItem: null
  };

  // ===============================
  // HELPERS
  // ===============================
  const readText = (sel) => container.querySelector(sel)?.value ?? "";

  const toNumberStrict = (value, field) => {
    const n = Number(String(value ?? "").trim());
    if (!Number.isFinite(n)) throw new Error(`${field} must be valid number`);
    return n;
  };

  const uid = () => `P_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const getProducts = () => Data.getProducts?.() || [];

  // ===============================
  // TOAST
  // ===============================
  function toast(msg) {
    const el = document.createElement("div");

    Object.assign(el.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#111",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "10px",
      zIndex: 999999,
      border: "1px solid #333",
      fontSize: "14px"
    });

    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  // ===============================
  // TABLE
  // ===============================
  function buildTable(products) {

    const filtered = products.filter(p =>
      (p.name || "").toLowerCase().includes(State.search)
    );

    return `
      <table class="inventory-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Stock</th>
            <th>SP</th>
            <th>BP</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${
            filtered.length
              ? filtered.map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td>${p.stock}</td>
                    <td>${p.sellingPrice}</td>
                    <td>${p.buyingPrice}</td>
                    <td>
                      <button class="gold-btn" data-edit="${p.id}">Edit</button>
                      <button class="gold-btn" data-del="${p.id}">Delete</button>
                      <button class="gold-btn" data-cart="${p.id}">Cart</button>
                    </td>
                  </tr>
                `).join("")
              : `<tr><td colspan="5">No items</td></tr>`
          }
        </tbody>
      </table>
    `;
  }

  // ===============================
  // FORMS
  // ===============================
  function buildForms() {
    return `
      <div id="formBox" class="form-container inventory-form-dropdown" style="display:none;">
        <div class="form-header">
          <h3 class="form-title">${State.editMode ? "Edit Item" : "Add Item"}</h3>
          <button class="close-form-btn" id="closeForm">✕</button>
        </div>

        <input id="name" class="form-input" placeholder="Item Name" />
        <input id="stock" class="form-input" type="number" placeholder="Stock" />
        <input id="sp" class="form-input" type="number" placeholder="Selling Price" />
        <input id="bp" class="form-input" type="number" placeholder="Buying Price" />
        <input id="barcode" class="form-input" placeholder="Barcode" />

        <button class="gold-btn form-save-btn" id="saveBtn">
          ${State.editMode ? "Update Item" : "Save Item"}
        </button>
      </div>

      <div id="receiveBox" class="form-container inventory-form-dropdown" style="display:none;">
        <div class="form-header">
          <h3 class="form-title">Receive Stock</h3>
          <button class="close-form-btn" id="closeReceive">✕</button>
        </div>

        <input id="receiveSearch" class="form-input" placeholder="Search item..." />

        <div id="receiveResults"></div>

        <div id="selectedItemBox" style="display:none;">
          Selected: <b id="selectedItemName"></b>
        </div>

        <input id="receiveQty" class="form-input" type="number" placeholder="Quantity" />

        <button class="gold-btn form-save-btn" id="confirmReceive" disabled>
          Confirm Stock
        </button>
      </div>
    `;
  }

  // ===============================
  // LAYOUT (UNCHANGED STRUCTURE)
  // ===============================
  function renderLayout() {

    const products = getProducts();

    container.innerHTML = `
      <h2 class="module-title">Inventory</h2>

      <div class="inventory-search-box">
        <input id="search" class="search-input" placeholder="Search items..." value="${State.search}" />
      </div>

      <div class="inventory-actions">

        <div class="action-buttons">
          <button class="toggle-form-btn" id="addBtn">+ Add Item</button>
          <button class="toggle-form-btn" id="openReceive">Receive Stock</button>
        </div>

        <div class="action-dropdown-anchor">
          ${buildForms()}
        </div>

      </div>

      ${buildTable(products)}
    `;

    bindEvents();
  }

  // ===============================
  // TABLE UPDATE ONLY
  // ===============================
  function renderTable() {

    const products = getProducts();

    const filtered = products.filter(p =>
      (p.name || "").toLowerCase().includes(State.search)
    );

    const tbody = container.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = filtered.length
      ? filtered.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.stock}</td>
            <td>${p.sellingPrice}</td>
            <td>${p.buyingPrice}</td>
            <td>
              <button class="gold-btn" data-edit="${p.id}">Edit</button>
              <button class="gold-btn" data-del="${p.id}">Delete</button>
              <button class="gold-btn" data-cart="${p.id}">Cart</button>
            </td>
          </tr>
        `).join("")
      : `<tr><td colspan="5">No items</td></tr>`;
  }

  // ===============================
  // EVENTS (🔥 FIXED RECEIVE SYSTEM)
  // ===============================
  function bindEvents() {

    // SEARCH INVENTORY
    container.querySelector("#search").oninput = (e) => {
      State.search = e.target.value.toLowerCase();
      renderTable();
    };

    // BUTTONS
    container.querySelector("#addBtn").onclick = () => openForm(false);

    container.querySelector("#openReceive").onclick = () => {
      container.querySelector("#receiveBox").style.display = "block";
    };

    container.querySelector("#closeForm").onclick = closeForm;
    container.querySelector("#closeReceive").onclick = closeReceive;

    container.querySelector("#saveBtn").onclick = saveItem;
    container.querySelector("#confirmReceive").onclick = confirmReceive;

    // 🔥 FIXED RECEIVE SEARCH (EVENT DELEGATION - NO BREAK EVER)
    container.addEventListener("input", (e) => {
      if (e.target && e.target.id === "receiveSearch") {
        receiveSearch(e);
      }
    });

    // GLOBAL CLICK EVENTS
    container.onclick = (e) => {

      const edit = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-del]");
      const cart = e.target.closest("[data-cart]");

      if (edit) {
        const item = getProducts().find(p => p.id === edit.dataset.edit);
        if (item) openForm(true, item);
      }

      if (del) {
        const updated = getProducts().filter(p => p.id !== del.dataset.del);
        StateKernel.apply("PRODUCTS_SET", { products: updated });
        toast("Deleted");
        renderTable();
      }

      if (cart) {
        const item = getProducts().find(p => p.id === cart.dataset.cart);
        if (item) {
          Cart.add?.(item, 1);
          toast("Added");
        }
      }
    };
  }

  // ===============================
  // RECEIVE LOGIC (RESTORED + SAFE)
  // ===============================
  function receiveSearch(e) {

    const q = (e.target.value || "").toLowerCase();
    const box = container.querySelector("#receiveResults");

    if (!box) return;

    const items = getProducts().filter(p =>
      (p.name || "").toLowerCase().includes(q)
    );

    box.innerHTML = items.length
      ? items.map(p => `
          <div class="receive-item" data-id="${p.id}">
            ${p.name} (${p.stock})
          </div>
        `).join("")
      : `<div class="muted">No items found</div>`;

    box.querySelectorAll("[data-id]").forEach(el => {
      el.onclick = () => {

        const item = items.find(i => i.id === el.dataset.id);
        if (!item) return;

        State.receiveItem = item;

        container.querySelector("#selectedItemBox").style.display = "block";
        container.querySelector("#selectedItemName").textContent = item.name;

        container.querySelector("#confirmReceive").disabled = false;
      };
    });
  }

  function confirmReceive() {

    const qty = Number(readText("#receiveQty"));

    if (!State.receiveItem || qty <= 0) {
      return toast("Invalid quantity");
    }

    const updated = getProducts().map(p =>
      p.id === State.receiveItem.id
        ? { ...p, stock: Number(p.stock) + qty }
        : p
    );

    StateKernel.apply("PRODUCTS_SET", { products: updated });

    toast("Stock updated");

    closeReceive();
    renderTable();
  }

  // ===============================
  // FORM CONTROL
  // ===============================
  function openForm(edit, item = null) {

    State.editMode = edit;
    State.editId = item?.id || null;

    const form = container.querySelector("#formBox");
    form.style.display = "block";

    if (item) {
      container.querySelector("#name").value = item.name;
      container.querySelector("#stock").value = item.stock;
      container.querySelector("#sp").value = item.sellingPrice;
      container.querySelector("#bp").value = item.buyingPrice;
      container.querySelector("#barcode").value = item.barcode;
    } else {
      ["#name", "#stock", "#sp", "#bp", "#barcode"].forEach(s => {
        const el = container.querySelector(s);
        if (el) el.value = "";
      });
    }
  }

  function closeForm() {
    container.querySelector("#formBox").style.display = "none";
  }

  function closeReceive() {
    container.querySelector("#receiveBox").style.display = "none";

    State.receiveItem = null;

    ["#receiveSearch", "#receiveQty"].forEach(sel => {
      const el = container.querySelector(sel);
      if (el) el.value = "";
    });

    const btn = container.querySelector("#confirmReceive");
    if (btn) btn.disabled = true;

    const box = container.querySelector("#selectedItemBox");
    if (box) box.style.display = "none";

    const results = container.querySelector("#receiveResults");
    if (results) results.innerHTML = "";
  }

  // ===============================
  // SAVE
  // ===============================
  function saveItem() {

    try {
      const name = readText("#name").trim();
      const stock = toNumberStrict(readText("#stock"), "Stock");
      const sp = toNumberStrict(readText("#sp"), "SP");
      const bp = toNumberStrict(readText("#bp"), "BP");
      const barcode = readText("#barcode").trim();

      let updated = getProducts();

      if (State.editMode) {
        updated = updated.map(p =>
          p.id === State.editId
            ? { ...p, name, stock, sellingPrice: sp, buyingPrice: bp, barcode }
            : p
        );
      } else {
        updated.push({ id: uid(), name, stock, sellingPrice: sp, buyingPrice: bp, barcode });
      }

      StateKernel.apply("PRODUCTS_SET", { products: updated });

      toast("Saved");
      closeForm();
      renderTable();

    } catch (e) {
      toast(e.message);
    }
  }

  
  // ===============================
  // LIFECYCLE
  // ===============================
  function mount() {
    renderLayout();
    Bus.on("inventory:updated", renderTable, "inventory");
  }

  function cleanup() {
    container.innerHTML = "";
  }

  return { mount, cleanup };
});