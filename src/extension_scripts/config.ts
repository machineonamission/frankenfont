type font_option = {
    enabled: boolean,
    name: string,
};

type font_options = {
    serif: font_option,
    "sans-serif": font_option,
    monospace: font_option,
    fantasy: font_option,
    cursive: font_option,
    math: font_option,
    normal: font_option,
    unknown: font_option,
}

type config_type = {
    enabled: boolean,
    specificity: "one" | "minimal" | "standard" | "advanced",
    url_whitelist: string[],
    url_blacklist: string[],
    "font-options": font_options,
    "computed-font-options": font_options
    mode: "css" | "js" | "noremotefonts",
}

const default_config: config_type = {
    enabled: false,
    specificity: "standard",
    url_whitelist: ["<all_urls>"],
    url_blacklist: [],
    "font-options": {
        serif: {enabled: false, name: ""},
        "sans-serif": {enabled: false, name: ""},
        monospace: {enabled: false, name: ""},
        fantasy: {enabled: false, name: ""},
        cursive: {enabled: false, name: ""},
        math: {enabled: false, name: ""},
        normal: {enabled: false, name: ""},
        unknown: {enabled: false, name: ""},
    },
    "computed-font-options": {
        serif: {enabled: false, name: ""},
        "sans-serif": {enabled: false, name: ""},
        monospace: {enabled: false, name: ""},
        fantasy: {enabled: false, name: ""},
        cursive: {enabled: false, name: ""},
        math: {enabled: false, name: ""},
        normal: {enabled: false, name: ""},
        unknown: {enabled: false, name: ""},
    },
    mode: "js"
}

type serializable_rule = {
    font: string | null,
    font_family: string | null,
    selector: string | HTMLElement,
    vars: { [variable: string]: string }
};
let config: config_type | null;

async function get_config(): Promise<config_type> {
    if (!config) {
        config = (await chrome.storage.sync.get(default_config)) as config_type;
    }
    return config;
}

function wait_for_config_and_dom() {
    return new Promise<void>((resolve) => {
        let config_ready = false;
        let dom_ready = false;
        const check = () => {
            if (config_ready && dom_ready) {
                resolve();
            }
        };
        get_config().then(c => {
            config_ready = true;
            check();
        });
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                dom_ready = true;
                check();
            });
        } else {
            dom_ready = true;
            check();
        }
    });
}
