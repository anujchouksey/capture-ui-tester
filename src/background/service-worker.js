// Enable side panel click behavior
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

console.log('Background service worker loaded.');
