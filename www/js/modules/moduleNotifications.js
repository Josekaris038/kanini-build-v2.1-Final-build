ModuleLoader.register("notifications", function (ctx) {

  const container = ctx.container;
  let render = null;

  // ===============================
  // RENDER
  // ===============================
  function mount() {

    container.innerHTML = `
      <h2 class="module-title">Notifications</h2>
      <div class="notifications-empty">No new notifications</div>
    `;

    // example listener (safe scoped)
    render = () => {
      // update UI later if needed
    };

    window.addEventListener("inventoryUpdated", render);
  }

  // ===============================
  // CLEANUP
  // ===============================
  function unmount() {
    window.removeEventListener("inventoryUpdated", render);
    container.innerHTML = "";
  }

  return {
    mount,
    unmount
  };

});