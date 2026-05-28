// ===== quickSearch.js (KANINI SMART GLOBAL SEARCH v5 CORE ENGINE) =====

const QuickSearch = (() => {

  // ===============================
  // KERNEL ACCESS
  // ===============================
  const State = () => window.StateKernel;
  const Events = () => window.EventKernel;
  const Safe = () => window.Safe;
  const Data = () => window.DataService;
  const Cart = () => window.CartStore;
  const Router = () => window.Router;

  // ===============================
  // DOM
  // ===============================
  let searchInput = null;
  let resultsBox = null;

  // ===============================
  // RUNTIME
  // ===============================
  let debounceTimer = null;
  let activeIndex = -1;
  let currentResults = [];
  let unsubscribers = [];

  // ===============================
  // COMMAND ROUTES
  // ===============================
  const COMMANDS = {
    inventory: "inventory",
    dashboard: "dashboard",
    sales: "makesale",
    cart: "cart",
    records: "records",
    analytics: "analytics"
  };

  // ===============================
  // SAFE STRING
  // ===============================
  function s(v) {
    return String(v || "").trim();
  }

  // ===============================
  // SAFE NUMBER
  // ===============================
  function n(v) {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  }

  // ===============================
  // INIT
  // ===============================
  function init() {

    searchInput = document.querySelector(".search-box input");
    resultsBox = document.querySelector(".search-results");

    if (!searchInput || !resultsBox) {
      console.error("[QuickSearch] Missing DOM elements");
      return;
    }

    bindInputEvents();
    bindGlobalEvents();
    bindKernelEvents();

    console.log("🔎 QuickSearch Core Engine Ready");
  }

  // ===============================
  // INPUT EVENTS
  // ===============================
  function bindInputEvents() {

    // ===============================
    // MAIN SEARCH INPUT
    // ===============================
    searchInput.addEventListener("input", () => {

      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {

        const query = s(searchInput.value).toLowerCase();

        resetState();

        // ===============================
        // EMPTY QUERY
        // ===============================
        if (!query) {
          hideResults();
          return;
        }

        // ===============================
        // COMMAND MODE
        // ===============================
        if (COMMANDS[query]) {
          renderCommand(query);
          return;
        }

        // ===============================
        // SAFE INVENTORY ACCESS
        // ===============================
        const inventory = getInventory();

        // ===============================
        // SMART SEARCH ENGINE
        // ===============================
        const results = inventory
          .map(item => {

            const name = s(item.name).toLowerCase();
            const barcode = s(item.barcode).toLowerCase();
            const category = s(item.category).toLowerCase();

            let score = 0;

            // exact matches
            if (name === query) score += 100;
            if (barcode === query) score += 90;

            // starts with
            if (name.startsWith(query)) score += 80;
            if (category.startsWith(query)) score += 60;

            // includes
            if (name.includes(query)) score += 50;
            if (barcode.includes(query)) score += 40;
            if (category.includes(query)) score += 30;

            return {
              item,
              score
            };

          })
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(r => r.item)
          .slice(0, 15);

        currentResults = results;

        // ===============================
        // NO RESULTS
        // ===============================
        if (!results.length) {

          resultsBox.innerHTML = `
            <div class="search-item no-results">
              No results found
            </div>
          `;

          showResults();
          return;
        }

        // ===============================
        // RENDER RESULTS
        // ===============================
        renderResults(results);

      }, 180);

    });

    // ===============================
    // KEYBOARD NAVIGATION
    // ===============================
    searchInput.addEventListener("keydown", handleKeyboard);
  }

  // ===============================
  // GLOBAL EVENTS
  // ===============================
  function bindGlobalEvents() {

    // ===============================
    // OUTSIDE CLICK CLOSE
    // ===============================
    document.addEventListener("click", (e) => {

      if (!e.target.closest(".search-box")) {
        hideResults();
      }

    });
  }

  // ===============================
  // KERNEL EVENTS
  // ===============================
  function bindKernelEvents() {

    const Bus = Events();

    if (!Bus?.on) return;

    // ===============================
    // INVENTORY UPDATED
    // ===============================
    unsubscribers.push(
      Bus.on("inventory:updated", refreshSearch)
    );

    // ===============================
    // SALE COMPLETED
    // ===============================
    unsubscribers.push(
      Bus.on("sale:completed", refreshSearch)
    );
  }

  // ===============================
  // REFRESH SEARCH
  // ===============================
  function refreshSearch() {

    if (!searchInput?.value?.trim()) return;

    searchInput.dispatchEvent(
      new Event("input")
    );
  }

  // ===============================
  // SAFE INVENTORY READ
  // ===============================
  function getInventory() {

    try {

      // ===============================
      // SAFE READ LAYER
      // ===============================
      if (Safe()?.inventory) {
        return Safe().inventory() || [];
      }

      // ===============================
      // DATA SERVICE
      // ===============================
      if (Data()?.getProducts) {
        return Data().getProducts() || [];
      }

      // ===============================
      // STATE KERNEL FALLBACK
      // ===============================
      if (State()?.get) {
        return State().get("inventory") || [];
      }

      return [];

    }
    catch (err) {

      console.error(
        "❌ QuickSearch Inventory Read Error",
        err
      );

      return [];
    }
  }

  // ===============================
  // COMMAND RENDER
  // ===============================
  function renderCommand(query) {

    resultsBox.innerHTML = `
      <div class="search-item qs-item command-item">

        <div>
          <strong>Go to ${query}</strong>
        </div>

        <button class="gold-btn">
          Open
        </button>

      </div>
    `;

    showResults();

    resultsBox
      .querySelector("button")
      .onclick = () => {

        if (Router()?.go) {
          Router().go(COMMANDS[query]);
        }

        hideResults();
        searchInput.value = "";
      };
  }

  // ===============================
  // RENDER RESULTS
  // ===============================
  function renderResults(results) {

    resultsBox.innerHTML = "";

    results.forEach((item, index) => {

      const div = document.createElement("div");

      div.className = "search-item qs-item";
      div.dataset.index = index;

      div.innerHTML = `
        <div>

          <strong>
            ${s(item.name)}
          </strong><br>

          <small>
            Stock: ${n(item.stock)}
            |
            KES ${n(item.sellingPrice).toFixed(2)}
          </small>

        </div>

        <button class="gold-btn">
          Add
        </button>
      `;

      // ===============================
      // ADD TO CART
      // ===============================
      div.querySelector("button").onclick = (e) => {

        e.stopPropagation();

        addToCart(item);
      };

      // ===============================
      // SELECT ITEM
      // ===============================
      div.addEventListener("click", () => {

        searchInput.value = item.name;

        hideResults();

        // optional future hook
        Events()?.emit?.(
          "quicksearch:item:selected",
          {
            itemId: item.id
          },
          "QuickSearch"
        );
      });

      resultsBox.appendChild(div);

    });

    showResults();
  }

  // ===============================
  // ADD TO CART
  // ===============================
  function addToCart(item) {

    try {

      // ===============================
      // CART STORE
      // ===============================
      if (Cart()?.add) {

        Cart().add(item, 1);

      }
      else if (window.Cart?.add) {

        window.Cart.add(item, 1);
      }

      // ===============================
      // OPTIONAL EVENT
      // ===============================
      Events()?.emit?.(
        "cart:item:added",
        {
          itemId: item.id,
          quantity: 1
        },
        "QuickSearch"
      );

      searchInput.value = "";

      hideResults();

    }
    catch (err) {

      console.error(
        "❌ QuickSearch Add To Cart Failed",
        err
      );
    }
  }

  // ===============================
  // KEYBOARD NAVIGATION
  // ===============================
  function handleKeyboard(e) {

    const items = resultsBox.querySelectorAll(".qs-item");

    if (!items.length) return;

    // ===============================
    // ARROW DOWN
    // ===============================
    if (e.key === "ArrowDown") {

      e.preventDefault();

      activeIndex = Math.min(
        activeIndex + 1,
        items.length - 1
      );

      highlight(items);
    }

    // ===============================
    // ARROW UP
    // ===============================
    if (e.key === "ArrowUp") {

      e.preventDefault();

      activeIndex = Math.max(
        activeIndex - 1,
        0
      );

      highlight(items);
    }

    // ===============================
    // ENTER
    // ===============================
    if (e.key === "Enter") {

      e.preventDefault();

      if (
        activeIndex >= 0 &&
        currentResults[activeIndex]
      ) {

        addToCart(
          currentResults[activeIndex]
        );
      }
    }

    // ===============================
    // ESCAPE
    // ===============================
    if (e.key === "Escape") {

      hideResults();
    }
  }

  // ===============================
  // HIGHLIGHT ITEMS
  // ===============================
  function highlight(items) {

    items.forEach(el => {
      el.style.background = "";
    });

    if (
      activeIndex >= 0 &&
      items[activeIndex]
    ) {

      items[activeIndex].style.background =
        "#1f1f1f";
    }
  }

  // ===============================
  // SHOW RESULTS
  // ===============================
  function showResults() {

    resultsBox.style.display = "block";
  }

  // ===============================
  // HIDE RESULTS
  // ===============================
  function hideResults() {

    resultsBox.style.display = "none";
  }

  // ===============================
  // RESET STATE
  // ===============================
  function resetState() {

    resultsBox.innerHTML = "";

    activeIndex = -1;

    currentResults = [];
  }

  // ===============================
  // CLEANUP
  // ===============================
  function cleanup() {

    clearTimeout(debounceTimer);

    unsubscribers.forEach(unsub => {

      try {
        unsub?.();
      }
      catch (err) {
        console.warn(
          "⚠️ QuickSearch Cleanup Warning",
          err
        );
      }

    });

    unsubscribers = [];
  }

  // ===============================
  // PUBLIC API
  // ===============================
  return {
    init,
    cleanup
  };

})();

// ===============================
// BOOTSTRAP
// ===============================
window.QuickSearch = QuickSearch;

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (window.QuickSearch?.init) {
      window.QuickSearch.init();
    }

  }
);
