async function handle_mode() {
    const config = await get_config();
    const js_scripts: chrome.scripting.RegisteredContentScript[] = [
        {
            "id": "js-content",
            "js": [
                "extension_scripts/config.js",
                "extension_scripts/content/parser.js",
                "extension_scripts/content/engine_js.js"
            ],
            "matches": config.url_whitelist,
            "excludeMatches": config.url_blacklist,
            "runAt": "document_start",
            "allFrames": true,
            "persistAcrossSessions": true
        },
        {
            "id": "js-content-world-main",
            "js": [
                "extension_scripts/content_world_main/override_prototypes.js",
            ],
            "matches": config.url_whitelist,
            "excludeMatches": config.url_blacklist,
            "runAt": "document_start",
            "allFrames": true,
            "world": "MAIN",
            "persistAcrossSessions": true
        }
    ];

    const css_scripts: chrome.scripting.RegisteredContentScript[] = [];
    const nrf_scripts: chrome.scripting.RegisteredContentScript[] = [];
    await chrome.scripting.unregisterContentScripts();
    if (config.enabled) {
        switch (config.mode) {
            case "js":
                await chrome.scripting.registerContentScripts(js_scripts);
                break
            case "css":
                await chrome.scripting.registerContentScripts(css_scripts);
                break
            case "noremotefonts":
                await chrome.scripting.registerContentScripts(nrf_scripts);
                break
        }
    }
}