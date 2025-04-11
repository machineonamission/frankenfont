chrome.runtime.onInstalled.addListener(function(details) {
    handle_mode().catch(console.error);
});