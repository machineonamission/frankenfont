// TODO: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof
//  constructed stylesheets inside shadow root dont work

const franken_debug = console.debug.bind(console, '[frankenfont]');
const franken_log = console.log.bind(console, '[frankenfont]');
const franken_warn = console.warn.bind(console, '[frankenfont]');
const franken_error = console.error.bind(console, '[frankenfont]');

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


function handle_document(target_document: Document | ShadowRoot) {

// override styles thing
    let override_styles = new CSSStyleSheet();
    target_document.adoptedStyleSheets.push(override_styles);

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

    let known_vars: { [key: string]: string } = {};

    type compute_result_type = "full" | "fallback" | "none";

    let waiting_on_vars: { [name: string]: serializable_rule[] } = {};

    function wait_on_var(varname: string, rule: serializable_rule) {
        if (!waiting_on_vars[varname]) {
            waiting_on_vars[varname] = []
        }
        waiting_on_vars[varname].push({
            font: rule.font,
            font_family: rule.font_family,
            selector: rule.selector,
            vars: {}
        });
    }

    function compute_vars(full_property: string): {
        "result": string,
        "type": compute_result_type,
        "waiting": string[]
    } {
        // recursively compute vars and substitute back into the string
        let result_type: compute_result_type = "full";
        let out = full_property;
        let count = 0;
        let waiting: string[] = [];
        // vars can nest, so do it iteratively
        while (out.includes("var(") && !(result_type === ("none" as compute_result_type)) && count < 10) {
            // find var(), and replace it with the computed value
            out = out.replace(/var\(([^(), ]+),?([^()]*)\)/gi, ((_, css_var, css_fallback) => {
                if (result_type === ("none" as compute_result_type)) {
                    return ""
                }
                const s = known_vars[css_var];
                if (s) {
                    return s
                } else {
                    waiting.push(css_var);
                    if (css_fallback) {
                        // failing back to css fallback. this is fine but we should keep watch if the variable gets declared.
                        result_type = "fallback";
                        return css_fallback
                    } else {
                        result_type = "none";
                        return ""
                    }
                }
            }));
            count++;
        }
        // failsafe in case my code sucks
        if (count > 10) {
            result_type = "none";
            franken_error("Error computing vars, too many iterations", full_property);
        }
        return {
            "result": out,
            "type": result_type,
            "waiting": waiting
        }
    }

    function explicit_handle_declarations(rule: serializable_rule) {
        // given a serialized rule, compute and apply the styles
        // we can't operate on the rule directly
        // because rules passed via intercepted insertRule calls must be serialized
        let {font, font_family, selector, vars} = rule;

        Object.entries(vars).forEach(([name, value]) => {
            // if (name in known_vars) {
            //     franken_warn("duplicate variable", name, value)
            // }
            known_vars[name] = value;
            if (waiting_on_vars[name]) {
                // franken_log("found waiting var", name, value)
                waiting_on_vars[name].forEach(explicit_handle_declarations)
            }
            delete waiting_on_vars[name];
        })

        let fonts: string[] = [];
        // handle font tags
        // if element has actual font tag
        let parsed = null;
        let defer = false;
        let waiting_vars: string[] = [];
        if (font && !css_noops.includes(font)) {
            // if it has vars, we need to compute those
            if (font.includes("var(")) {
                // try to compute it
                const {result, type, waiting} = compute_vars(font);
                if (type === "none" || type === "fallback") {
                    // we couldn't compute it, its likely the element doesnt exist yet.
                    // push it to the deferred list
                    defer = true;
                    waiting_vars = waiting_vars.concat(waiting)
                }
                if (type === "full" || type === "fallback") {
                    // if we could compute it, parse
                    parsed = parseFont(result);
                }
            } else {
                // parse out the families from the font
                parsed = parseFont(font);
            }
            if (parsed === null) {
                // franken_debug("Error parsing font string.", font);
                // const ff = get_computed_style(rule.selector, "font-family")
                // if (ff) {
                //     fonts = parseFontFamily(ff);
                // } else {
                //     // if it has no computed style, defer it unless font_family comes up with something
                //     defer = true;
                // }
                // debugger
                defer = true;
            } else {
                fonts = parsed["font-family"];
            }
        }

        // handle font-family tags
        if (font_family && !css_noops.includes(font_family)) {
            // compute or defer vars
            if (font_family.includes("var(")) {
                const {result, type, waiting} = compute_vars(font_family);
                if (type === "none" || type === "fallback") {
                    // we couldn't compute it, its likely the element doesnt exist yet.
                    // push it to the deferred list
                    defer = true;
                    waiting_vars = waiting_vars.concat(waiting)
                }
                if (type === "full" || type === "fallback") {
                    // if we could compute it, parse
                    font_family = result;
                }
            }
            // parse out families
            fonts = parseFontFamily(font_family);
        }
        // if this element has font declarations
        if (fonts && fonts.length > 0) {
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
            return false;
        } else if (defer) {
            waiting_vars.forEach(v => {
                wait_on_var(v, rule);
            })
            return true;
        }
    }

    function handle_direct_declarations(rule: CSSStyleRule) {
        // "serialize" the rule, then handle it
        let style = rule.style;
        let font = style["font" as keyof typeof style] as string | null;
        let font_family = style["font-family" as keyof typeof style] as string | null;
        let outvars: { [variable: string]: string } = {};
        for (let i = 0; i < style.length; i++) {
            const r = style[i];
            if (r.startsWith("--")) {
                outvars[r] = style.getPropertyValue(r);
            }
        }
        if (font || font_family || Object.keys(outvars).length > 0) {
            explicit_handle_declarations({
                font: font,
                font_family: font_family,
                selector: rule.selectorText,
                vars: outvars
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
                    franken_error("Error handling css rule", e);
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
                franken_error('Failed to replace styles:', err);
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
                        franken_error("Error fetching css file", r.error);
                    }
                });
            } else {
                // some other fuckass error
                franken_error("Unknown Error at accessing cssRules", e);
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
                    for (const style of [
                        ...node.querySelectorAll("style, link[rel=stylesheet]"),
                        ...(node instanceof HTMLStyleElement || (node instanceof HTMLLinkElement && node.rel === "stylesheet") ? [node] : [])
                    ]) {
                        style.addEventListener("load", () => {
                            handle_sheet((style as HTMLStyleElement | HTMLLinkElement).sheet);
                        });
                    }
                    // for any normal element added, check if any of the deferred computed styles are now able to
                    // be evaluated, then evaluate them
                }
            }
        }
    }).observe(target_document, {childList: true, subtree: true});
// run any stylesheets we didn't catch
    for (let sheet of target_document.styleSheets) {
        handle_sheet(sheet)
    }
    window.addEventListener("frankenfont-css-rules", (event) => {
        const rules = (event as CustomEvent).detail as serializable_rule[];
        rules.forEach(explicit_handle_declarations);
    });
    target_document.addEventListener("frankenfont-shadow-attached", (event) => {
        const id: string = (event as CustomEvent).detail;
        const el = target_document.getElementById(id)!;
        const shadow = chrome.dom.openOrClosedShadowRoot(el)!;
        // franken_log("received shadow ", shadow)
        handle_document(shadow);
    });
}

handle_document(document);

