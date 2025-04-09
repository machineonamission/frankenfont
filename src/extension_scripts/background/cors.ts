// for some FUCKING reason, you cant access cross-origin CSS scripts even on the page the damn script is loaded on
// so this jank ass duplicate fetching script is necessary, hopefully the overhead aint too bad :/
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        fetch(request)
            .then(response => response.text())
            .then(text => sendResponse({"status": "ok", "text": text}))
            .catch(error => sendResponse({"status": "error", "error": error}));
        return true;
    });