ModuleLoader.register("notifications", function () {
  moduleContainer.innerHTML = "<h2 class='module-title'>Notifications</h2>";

return function cleanup() {
  window.removeEventListener("inventoryUpdated", render);
};
});