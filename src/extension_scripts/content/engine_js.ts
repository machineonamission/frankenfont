// TODO: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof
//  the  fucking try it editor, with constructed stylesheet, is not workig

// parser.js
declare function parseFontFamily(name: string): string[];

declare function parseFont(name: string): {
    'font-family': string[]
    'font-size': string
    'line-height': string
} | null;

// hardcoded map of font types to font families
const reverse_font_mapping: { [key: string]: string[] } = {
    "serif": ["serif", "ui-sans-serif", "system-ui", "ui-rounded", "arial", "verdana", "tahoma", "trebuchet ms"],
    "sans-serif": ["sans-serif", "ui-sans-serif", "times new roman", "georgia", "garamond"],
    "cursive": ["cursive", "brush script mt"],
    "fantasy": ["fantasy"],
    "monospace": ["monospace", "ui-monospace", "courier", "courier new"],
    "math": ["math"],
    "none": ["emoji"],
    "unknown": []
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
        font = font.toLowerCase()
        if (font_mapping[font]) {
            return font_mapping[font];
        }
    }
    return "unknown"
}

function get_computed_style(selector: string, property: string): string | null {
    // get a computed style given a selector and a property to compute
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

function compute_vars(selector: string, full_property: string): string | null {
    // recursively compute vars and substitute back into the string
    let error: boolean = false;
    let out = full_property;
    let count = 0;
    // vars can nest, so do it iteratively
    while (out.includes("var(") && !error && count < 10) {
        // find var(), and replace it with the computed value
        out = out.replace(/var\(([^(), ]+)[^()]*\)/gi, ((_, m1) => {
            if (error) {
                return ""
            }
            const s = get_computed_style(selector, m1);
            if (s === null) {
                error = true;
                return ""
            } else {
                return s
            }
        }));
        count++;
    }
    // failsafe in case my code sucks
    if (count > 10) {
        error = true;
        console.error("[FRANKENFONT] Error computing vars, too many iterations", selector, full_property);
    }
    if (error) {
        return null;
    } else {
        return out;
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
    let parsed = null;
    let defer = false;
    if (font && !css_noops.includes(font)) {
        // if it has vars, we need to compute those
        if (font.includes("var(")) {
            // try to compute it
            font = compute_vars(selector, font);
            if (!font) {
                // we couldn't compute it, its likely the element doesnt exist yet.
                // push it to the deferred list
                defer = true;
            } else {
                // if we could compute it, parse
                parsed = parseFont(font);
            }
        } else {
            // parse out the families from the font
            parsed = parseFont(font);
        }
        if (parsed === null) {
            console.debug("[FRANKENFONT] Error parsing font string, deferring to font-family.", font);
            const ff = get_computed_style(rule.selector, "font-family")
            if (ff) {
                fonts = parseFontFamily(ff);
            } else {
                // if it has no computed style, defer it unless font_family comes up with something
                defer = true;
            }
        } else {
            fonts = parsed["font-family"];
        }
    }

    // handle font-family tags
    if (font_family && !css_noops.includes(font_family)) {
        // compute or defer vars
        if (font_family.includes("var(")) {
            const cff = compute_vars(selector, font_family);
            if (cff) {
                font_family = cff;
            } else {
                defer = true;
            }
        }
        // parse out families
        fonts = parseFontFamily(font_family);
    }
    // if this element has font declarations
    if (fonts.length > 0) {
        // get the predicted font type
        let fonttype = get_font_type(fonts);
        if (fonttype !== "none") {
            // if the font has a type
            // check if config says to replace this type of font
            get_config().then(config => {
                const this_font_config = config["computed-font-options"][fonttype as keyof font_options];
                if (this_font_config["enabled"]
                    // edge case: existing font matches user font, no need to override style
                    && this_font_config["name"] !== fonts[0]) {
                    // push the new font to the front of the list
                    fonts.unshift(this_font_config["name"])
                    // convert to css list
                    let new_font_family = fonts.map(f => `"${f}"`).join(", ");
                    // add style to override font
                    override_styles.insertRule(`${selector} { font-family: ${new_font_family} !important; }`);
                }
            })
        }
    } else if (defer) {
        deferred_computed_styles.push(rule)
    }
}

function handle_direct_declarations(rule: CSSStyleRule) {
    // "serialize" the rule, then handle it
    let style = rule.style;
    let font = style["font" as keyof typeof style] as string | null;
    let font_family = style["font-family" as keyof typeof style] as string | null;
    if (font || font_family) {
        explicit_handle_declarations({
            font: font,
            font_family: font_family,
            selector: rule.selectorText
        })
    }
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
            chrome.runtime.sendMessage(sheet.href, (r: cors_response) => {
                if (r.status === "ok") {
                    parse_css(r.text)
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
                [
                    ...node.querySelectorAll("style, link[rel=stylesheet]"),
                    ...(node instanceof HTMLStyleElement || (node instanceof HTMLLinkElement && node.rel === "stylesheet") ? [node] : [])
                ].forEach((style) => {
                    style.addEventListener("load", () => {
                        handle_sheet((style as HTMLStyleElement | HTMLLinkElement).sheet);
                    });
                });
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
}).observe(document, {childList: true, subtree: true});
// run any stylesheets we didn't catch
for (let sheet of document.styleSheets) {
    handle_sheet(sheet)
}

