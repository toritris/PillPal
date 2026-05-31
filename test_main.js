"use strict";
const electron = require("electron");
console.log("electron type:", typeof electron);
console.log("electron.app type:", typeof electron.app);
console.log("electron keys:", Object.keys(electron || {}).slice(0, 8).join(","));
electron.app.whenReady().then(() => {
  console.log("App ready!");
  electron.app.quit();
});
