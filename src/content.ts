declare function parseFontFamily(name: string): string[];

declare function parseFont(name: string): {
    'font-family': string[]
    'font-size': string
    'line-height': string
};

let config: {
    url_whitelist: string[],
    url_blacklist: string[],
    "font-options": {
        serif: string,
        "sans-serif": string,
        monospace: string,
        fantasy: string,
        cursive: string
    },
    replace_unknown_fonts: boolean,
    mode: "css" | "js" | "off",
} = {
    "url_whitelist": ["*"],
    "url_blacklist": [],
    "font-options": {
        "serif": "Atkinson Hyperlegible Next",
        "sans-serif": "Atkinson Hyperlegible Next",
        "monospace": "Atkinson Hyperlegible Mono",
        "fantasy": "Atkinson Hyperlegible Next",
        "cursive": "Atkinson Hyperlegible Next"
        // "serif": "Comic Sans MS",
        // "sans-serif": "Comic Sans MS",
        // "monospace": "Comic Sans MS",
        // "fantasy": "Comic Sans MS",
        // "cursive": "Comic Sans MS",
    },
    "replace_unknown_fonts": false,
    "mode": "js", // css, js, off
}

if (config.mode === "css") {
    // TODO
} else if (config.mode === "js") {
    // listen for serialized rules intercepted in the injected script, and handle them
    type serializable_rule = { font: string | null, font_family: string | null, selector: string };
    document.addEventListener("cssRuleIntercepted", (event) => {
        explicit_handle_declarations((event as CustomEvent).detail as serializable_rule);
    });

    // inject the aforementioned script to listen for rules
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    (document.head || document.documentElement).appendChild(script);


    // hardcoded map of font types to font families
    const reverse_font_mapping: { [key: string]: string[] } = {
        "serif": ["serif", "ui-sans-serif", "system-ui", "ui-rounded", "arial", "verdana", "tahoma", "trebuchet ms"],
        "sans-serif": ["sans-serif", "ui-sans-serif", "times new roman", "georgia", "garamond"],
        "cursive": ["cursive", "brush script mt"],
        "fantasy": ["fantasy"],
        "monospace": ["monospace", "ui-monospace", "courier", "courier new"],
        "none": ["emoji", "math"],
        "unidentified": []
    }
    // reverse the mapping to get a font family to type mapping
    let font_mapping: { [key: string]: string } = {}
    for (let key in reverse_font_mapping) {
        for (let value of reverse_font_mapping[key]) {
            font_mapping[value] = key;
        }
    }

    // css props that we can safely ignore
    const css_noops = [
        "inherit",
        "initial",
        "revert",
        "revert-layer",
        "unset"
    ]
    // list of css styles that are fonts, and do apply to elements, but have var()s and the element doesn't exist,
    // so the vars cant be computed
    // these are monitored in a mutation observer until the element exists, then the vars are computed
    let deferred_computed_styles: serializable_rule[] = []

    // override styles thing
    let override_styles = new CSSStyleSheet();
    document.adoptedStyleSheets.push(override_styles);

    function get_font_type(fonts: string[]): keyof typeof reverse_font_mapping {
        // go in order of the font declarations until we find one we recognize, then return the type
        for (let font of fonts) {
            if (font_mapping[font]) {
                return font_mapping[font];
            }
        }
        return "unidentified"
    }

    function get_computed_style(selector: string, property: string): string | null {
        try {
            let doc;
            if (selector === ":root") {
                // this is a special case for the root element
                doc = document.documentElement;
            } else {
                // try to find the element
                doc = document.querySelector(selector);
                if (!doc) {
                    // if the element isnt found, handle_direct_declarations will defer it for us
                    return null;
                }
            }
            // resolve the vars
            return window.getComputedStyle(doc).getPropertyValue(property);
        } catch (e) {
            console.error("Error getting computed style", e);
            return null;
        }
    }

    function explicit_handle_declarations(rule: serializable_rule) {
        // given a serialized rule, compute and apply the styles
        // we can't operate on the rule directly
        // because rules passed via intercepted insertRule calls must be serialized
        let {font, font_family, selector} = rule;
        let fonts: string[] = [];
        // handle font tags
        // if element has actual font tag
        if (font && !css_noops.includes(font)) {
            // if it has vars, we need to compute those
            if (font.includes("var(")) {
                // try to compute it
                font = get_computed_style(selector, "font-family");
                if (!font) {
                    // we couldn't compute it, its likely the element doesnt exist yet.
                    // push it to the deferred list
                    deferred_computed_styles.push(rule);
                    return
                } else {
                    // if we could compute it, parse out the families
                    fonts = parseFontFamily(font);
                }
            } else {
                // parse out the families from the font
                fonts = parseFont(font)["font-family"];
            }

        }
        // handle font-family tags
        if (font_family && !css_noops.includes(font_family)) {
            // compute or defer vars
            if (font_family.includes("var(")) {
                font_family = get_computed_style(selector, "font-family");
                if (!font_family) {
                    deferred_computed_styles.push(rule);
                    return
                }
            }
            // parse out families
            fonts = parseFontFamily(font_family);
        }
        // if this element has font declarations
        if (fonts) {
            // get the predicted font type
            let fonttype = get_font_type(fonts);
            if (fonttype !== "none") {
                // if the font has a type
                // get config font
                let new_font = config["font-options"][fonttype as keyof typeof config["font-options"]];
                if (new_font) {
                    // push the new font to the front of the list
                    fonts.unshift(new_font)
                    // convert to css list
                    let new_font_family = fonts.map(f => `"${f}"`).join(", ");
                    // add style to override font
                    override_styles.insertRule(`${selector} { font-family: ${new_font_family} !important; }`);
                }
            }
        }
    }

    function handle_direct_declarations(rule: CSSStyleRule) {
        // "serialize" the rule, then handle it
        let style = rule.style;
        let font = style["font" as keyof typeof style] as string | null;
        let font_family = style["font-family" as keyof typeof style] as string | null;
        explicit_handle_declarations({
            font: font,
            font_family: font_family,
            selector: rule.selectorText
        })
    }

    function handle_css(rules: CSSRuleList) {
        // for all css declarations in the sheet
        for (let rule of rules) {

            if (rule instanceof CSSStyleRule) {
                // for all normal rules, handle with error handling
                try {
                    handle_direct_declarations(rule);
                    // handle_variables(rule, override_styles);
                } catch (e) {
                    console.error("Error handling css rule", e);
                }
            } else if (rule instanceof CSSGroupingRule) {
                // unwrap grouping rules, shouldnt matter if theyre media queries or whatever cause all fonts are
                // replaced
                handle_css(rule.cssRules);
            }
        }

    }

    function parse_css(text: string) {
        // insert css text into a stylesheet to evaluate it, then handle it
        const sheet = new CSSStyleSheet();
        sheet.replace(text)
            .then(() => {
                handle_css(sheet.cssRules)
            })
            .catch(err => {
                console.error('Failed to replace styles:', err);
            });
    }

    function handle_sheet(sheet: CSSStyleSheet | null) {
        if (!sheet) {
            return
        }
        let rules: CSSRuleList | null = null;
        try {
            // try to access the css rules
            rules = sheet.cssRules;
        } catch (e) {
            if ((e as DOMException).name === "SecurityError") {
                // if we get a security error, it means the css has CORS restrictions, so we need to ask the background
                // worker to fetch it for us
                chrome.runtime.sendMessage(sheet.href, (r: { "status": "ok", "text": string }
                    | { "status": "error", "error": string }
                ) => {
                    if (r.status === "ok") {
                        parse_css(r.text)
                        return
                    } else {
                        console.error("Error fetching css file", r.error);
                    }
                });
            } else {
                // some other fuckass error
                console.error("Unknown Error at accessing cssRules", e);
            }
        } finally {
            // if the rules successfully evaluated, no CORS bs, we can just handle it
            if (rules) {
                handle_css(rules);
            }
        }
    }

    // for all document changes
    new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {

                    if (node instanceof HTMLStyleElement || (node instanceof HTMLLinkElement && node.rel === "stylesheet")) {
                        // wait for styles to load, then handle it
                        node.addEventListener("load", () => {
                            handle_sheet(node.sheet);
                            // force_check_all_deferred_rules()
                        });
                    } else {
                        // for any normal element added, check if any of the deferred computed styles are now able to
                        // be evaluated, then evaluate them
                        deferred_computed_styles = deferred_computed_styles.filter(value => {
                            if (node.matches(value.selector) || node.querySelector(value.selector)) {
                                explicit_handle_declarations(value);
                                return false;
                            }
                            return true;
                        })
                    }
                }
            }
        }
    }).observe(document, {childList: true, subtree: true});
    // run any stylesheets we didn't catch
    for (let sheet of document.styleSheets) {
        handle_sheet(sheet)
    }
}

