window.addEventListener("frankenfont-config-send", (e) => {
    get_config().then(c => {
        window.dispatchEvent(new CustomEvent('frankenfont-config-receive', {detail: c}));
    })
});

window.addEventListener("frankenfont-cors-send", (e) => {
    console.log(e);
    const {id, url} = (e as CustomEvent).detail;
    chrome.runtime.sendMessage(url, (r: { "status": "ok", "text": string, "id"?: string }
        | { "status": "error", "error": string, "id"?: string }
    ) => {
        r["id"] = id;
        window.dispatchEvent(new CustomEvent('frankenfont-cors-receive', {detail: r}));
    });
});

// @ts-ignore
window["sex"] = "balls"