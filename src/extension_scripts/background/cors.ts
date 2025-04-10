// for some FUCKING reason, you cant access cross-origin CSS scripts even on the page the damn script is loaded on
// so this jank ass duplicate fetching script is necessary, hopefully the overhead aint too bad :/
type cors_response = { "status": "ok", "text": string }
    | { "status": "error", "error": string };

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse: (response: cors_response) => void) {
        fetch(request)
            .then(response => response.text())
            .then(text => sendResponse({"status": "ok", "text": text}))
            .catch(error => sendResponse({"status": "error", "error": error}));
        return true;
    });