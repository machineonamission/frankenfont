document.addEventListener("DOMContentLoaded", function () {
    document.querySelector('#options')!.addEventListener('click', function () {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage().catch(console.error);
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });
    document.querySelectorAll("a:not(#options)").forEach((el) => {
        el.addEventListener("click", () => {
            const href = (el as HTMLAnchorElement).getAttribute("href");
            if (href) {
                window.open(href);
            }
        });
    });
    document.querySelector("#version")!.innerHTML = chrome.runtime.getManifest().version;
});
