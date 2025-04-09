const js_scripts: chrome.scripting.RegisteredContentScript[] = [
    {
        "id": "js-content",
        "js": [
            "extension_scripts/config.js",
            "extension_scripts/content.js"
        ],
        "matches": [
            "<all_urls>"
        ],
        "runAt": "document_start",
        "allFrames": true,
        "persistAcrossSessions": true
    },
    {
        "id": "js-content-world-main",
        "js": [
            "extension_scripts/content_world_main/parser.js",
            "extension_scripts/content_world_main/world_main_type.js",
            "extension_scripts/content_world_main/receive_config.js",
            "extension_scripts/content_world_main/override_prototypes.js",
            "extension_scripts/content_world_main/engine_js.js",
        ],
        "matches": [
            "<all_urls>"
        ],
        "runAt": "document_start",
        "allFrames": true,
        "world": "MAIN",
        "persistAcrossSessions": true
    }
];

const css_scripts: chrome.scripting.RegisteredContentScript[] = [];
const nrf_scripts: chrome.scripting.RegisteredContentScript[] = [];


async function handle_mode() {
    const config = await get_config();
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