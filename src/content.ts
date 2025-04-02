let config: {
    url_whitelist: string[],
    url_blacklist: string[],
    "font-options": {
        serif: string,
        "sans-serif": string,
        mono: string,
    },
    replace_unknown_fonts: boolean,
    mode: "css" | "js" | "off",
} = {
    "url_whitelist": ["*"],
    "url_blacklist": [],
    "font-options": {
        "serif": "Atkinson Hyperlegible Next",
        "sans-serif": "Atkinson Hyperlegible Next",
        "mono": "Atkinson Hyperlegible Mono",
    },
    "replace_unknown_fonts": false,
    "mode": "js", // css, js, off
}

if (config.mode === "css") {
    // TODO
}
if (config.mode === "js") {
    for (let sheet of document.styleSheets) {
        if (sheet.cssRules) {
            for (let rule of sheet.cssRules) {
                // if (rule.style) {
                //     if (rule.style["font-family"]) {
                //         let style = rule.style["font-family"];
                //         for(let font of style) {
                //
                //         }
                //     }
                //     if (rule.style["font"]) {
                //         // TODO
                //     }
                // }
            }
        }
    }
}

