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
    document.querySelector("#version")!.innerHTML = "v" + chrome.runtime.getManifest().version;
});

wait_for_config_and_dom().then(() => {
    if (config!.enabled && config!["computed-font-options"]["sans-serif"].enabled) {
        document.body.style.setProperty("font-family", `"${config!["computed-font-options"]["sans-serif"].name}", "Atkinson Hyperlegible Next", sans-serif`);
    }
});