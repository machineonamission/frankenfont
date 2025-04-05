type font_option = {
    enabled: boolean,
    name: string,
};

type config_type = {
    enabled: boolean,
    url_mode: "whitelist" | "blacklist",
    specificity: "one" | "minimal" | "standard" | "advanced",
    url_whitelist: string[],
    url_blacklist: string[],
    "font-options": {
        serif: font_option,
        "sans-serif": font_option,
        monospace: font_option,
        fantasy: font_option,
        cursive: font_option,
        math: font_option,
        normal: font_option,
        unknown: font_option,
    }
    mode: "css" | "js" | "noremotefonts",
}

const default_config: config_type = {
    enabled: true,
    url_mode: "blacklist",
    specificity: "standard",
    url_whitelist: [],
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
    mode: "js"
}

type serializable_rule = { font: string | null, font_family: string | null, selector: string };

function get_config(): Promise<config_type> {
    return chrome.storage.sync.get(default_config) as Promise<config_type>;
}
