// intercept any document JS rule injections, and send them to the content script
(function () {


    const franken_debug = console.debug.bind(console, '[frankenfont]');
    const franken_log = console.log.bind(console, '[frankenfont]');
    const franken_warn = console.warn.bind(console, '[frankenfont]');
    const franken_error = console.error.bind(console, '[frankenfont]');

    function add_event(rules: serializable_rule[], documents: Node[]) {
        documents.forEach(d => {
            const event = new CustomEvent("frankenfont-css-rules", {detail: rules});
            d.dispatchEvent(event);
        })
    }

    function serialize_rule(rule: CSSRule): serializable_rule | null {
        if (rule instanceof CSSStyleRule && (rule.style.font || rule.style.fontFamily)) {
            let outvars: { [variable: string]: string } = {};
            const style = rule.style;
            for (let i = 0; i < style.length; i++) {
                const r = style[i];
                if (r.startsWith("--")) {
                    outvars[r] = style.getPropertyValue(r);
                }
            }
            if ((rule.style.font || rule.style.fontFamily) || Object.keys(outvars).length > 0) {
                return {
                    font: rule.style.font,
                    font_family: rule.style.fontFamily,
                    selector: rule.selectorText,
                    vars: outvars
                }
            } else {
                return null
            }
        } else {
            return null
        }
    }

    // serialize and then send the rule
    function serialize_and_send_rules(rules: CSSRule[], documents: Node[]) {
        let serialized = rules
            .map(serialize_rule)
            .filter(r => r !== null);
        if (serialized.length > 0) {
            add_event(serialized, documents);
        }
    }

    // iterate over every css rule in the sheet and serialize and send them
    function handle_sheet(sheet: CSSRuleList, documents: Node[]) {
        const serialized = serialize_sheet(sheet);
        if (serialized.length > 0) {
            add_event(serialized, documents)
        }
    }

    function serialize_sheet(sheet: CSSRuleList) {
        let rules: serializable_rule[] = [];
        for (const rule of sheet) {
            if (rule instanceof CSSStyleRule) {
                const s = serialize_rule(rule);
                if (s) {
                    rules.push(s);
                }
            } else if (rule instanceof CSSGroupingRule) {
                // unwrap grouping rules, shouldnt matter if theyre media queries or whatever cause all fonts are
                // replaced
                rules = rules.concat(serialize_sheet(rule.cssRules));
            }
        }
        return rules;
    }

    function generateRandomString(length = 36) {
        return Array.from({length}, () => Math.random().toString(36).charAt(2)).join('');
    }

    function get_fixed_id(element: Element): string {
        if (element.hasAttribute("id")) {
            return element.getAttribute("id")!;
        } else {
            const id = "frankenfont-" + generateRandomString();
            element.setAttribute("id", id);
            return id;
        }
    }

    function get_owners(sheet: CSSStyleSheet & { FRANKENFONT_OWNERS?: Node[] }): Node[] {
        const owner = sheet.ownerNode;
        if (owner) {
            return [owner]
        } else if (sheet.FRANKENFONT_OWNERS) {
            return sheet.FRANKENFONT_OWNERS
        } else {
            return []
        }
    }

    const originalInsertRule = CSSStyleSheet.prototype.insertRule;
    CSSStyleSheet.prototype.insertRule = function (rule, index) {
        const result = originalInsertRule.call(this, rule, index);
        serialize_and_send_rules([this.cssRules[result]], get_owners(this));
        return result;
    };

    const originalAddRule = CSSStyleSheet.prototype.addRule;
    CSSStyleSheet.prototype.addRule = function (selector, rule, index) {
        const result = originalAddRule.call(this, selector, rule, index);
        const owner = this.ownerNode || (this as CSSStyleSheet & {
            FRANKENFONT_OWNER?: Node
        }).FRANKENFONT_OWNER;
        serialize_and_send_rules([this.cssRules[result]], get_owners(this));
        return result;
    };

    const originalReplace = CSSStyleSheet.prototype.replace;
    CSSStyleSheet.prototype.replace = function (rule) {
        const resultPromise = originalReplace.call(this, rule);
        resultPromise.then(s => {
            // Handle the new CSSStyleSheet.
            handle_sheet(this.cssRules, get_owners(this));
        })
        return resultPromise;
    };

    const originalReplaceSync = CSSStyleSheet.prototype.replaceSync;
    CSSStyleSheet.prototype.replaceSync = function (rule) {
        originalReplaceSync.call(this, rule);
        handle_sheet(this.cssRules, get_owners(this));
    };

    // // console.log("CSSStyleSheet methods have been overridden.");
    // // Save the original descriptor so you can call the real setter/getter later
    // const originalFont = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font')!;
    //
    // // Define a new property descriptor
    // Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
    //     get: function () {
    //         console.log('Custom font getter called with:');
    //         return originalFont.get!.call(this);
    //     },
    //     set: function (value) {
    //         console.log('Custom font setter called with:', value);
    //
    //         // You can modify the value here if you want
    //         // const newValue = value + ' /* intercepted */';
    //
    //         // Call the original setter
    //         originalFont.set!.call(this, value);
    //     },
    //     configurable: true,
    //     enumerable: true
    // });

    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init: ShadowRootInit): ShadowRoot {
        // console.warn(init);
        const out = originalAttachShadow.call(this, init);
        const id = get_fixed_id(this)
        const event = new CustomEvent("frankenfont-shadow-attached", {detail: id});
        this.getRootNode().dispatchEvent(event);
        return out;
    }

    type frankenAdopted = (CSSStyleSheet & { FRANKENFONT?: true })[] & { FRANKENFONT?: true }

    function is_frankenfont_sheet(i: CSSStyleSheet & { FRANKENFONT_SHEET?: true }): boolean {
        if (i.FRANKENFONT_SHEET) {
            return true
        } else if (i.cssRules[0].cssText.includes("--FRANKENFONT")) {
            i.FRANKENFONT_SHEET = true;
            return true
        }
        return false
    }

    function handle_unowned_sheet(i: CSSStyleSheet & {
        FRANKENFONT_OWNERS?: Node[]
    }, doc: Node) {
        if (!i.FRANKENFONT_OWNERS) {
            i.FRANKENFONT_OWNERS = []
        }
        if (!i.FRANKENFONT_OWNERS.includes(doc) && !is_frankenfont_sheet(i)) {
            handle_sheet(i.cssRules, [doc]);
            i.FRANKENFONT_OWNERS.push(doc);
        }
    }

    function override_push(orig: frankenAdopted, doc: Node) {
        // override the push method to call our code
        const origInsert = orig.splice
        orig.push = function (...items: CSSStyleSheet[]) {
            // new sheet is added, lets handle the bich
            items.forEach((i: CSSStyleSheet & {
                FRANKENFONT_OWNERS?: Node[]
            }) => {
                handle_unowned_sheet(i, doc)
            })
            // always insert new stylesheets BEFORE frankenfont sheets.
            let index = this.length;
            for (const [i, sheet] of this.entries()) {
                if (is_frankenfont_sheet(sheet)) {
                    index = i;
                    break
                }
            }
            // franken_log("running push on ", this, index, items);
            origInsert.call(this, index, 0, ...items)
            return this.length;
        }
        orig.FRANKENFONT = true;
    }

    const overrides = [ShadowRoot, Document];
    overrides.forEach(elem => {
        const originalAdopted = Object.getOwnPropertyDescriptor(elem.prototype, 'adoptedStyleSheets')!;
        Object.defineProperty(elem.prototype, 'adoptedStyleSheets', {
            get: function () {
                const doc = this;
                // franken_log('Custom adopted getter called');
                // get the underlying value
                let orig: frankenAdopted = originalAdopted.get!.call(this);
                // if the value hasnt been modified yet
                if (!orig.FRANKENFONT) {
                    override_push(orig, doc);
                    // set the underlying array
                    originalAdopted.set!.call(this, orig);
                }
                return orig;
            },
            set: function (value: CSSStyleSheet[]) {
                // we have to keep any of our own arrays
                let orig: frankenAdopted = originalAdopted.get!.call(this);
                // franken_warn(orig);
                const keep = orig.filter(is_frankenfont_sheet);
                // handle any new sheets
                const doc = this;
                value.forEach((i: CSSStyleSheet & {
                    FRANKENFONT_OWNERS?: Node[]
                }) => {
                    handle_unowned_sheet(i, doc)
                })
                // our stylesheets must go last to take priority
                const out = value.concat(keep);
                override_push(out, doc);
                // franken_log('Custom adopted setter called with:', this, value);
                // return the underlying setter, plus our sheets
                return originalAdopted.set!.call(this, out);
            },
            // configurable: true,
            // enumerable: false,
        })
    });
})();
