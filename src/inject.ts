// intercept any document JS rule injections, and send them to the content script
(function () {
    // Save references to the original methods.
    const originalInsertRule = CSSStyleSheet.prototype.insertRule;
    const originalAddRule = CSSStyleSheet.prototype.addRule;
    const originalReplace = CSSStyleSheet.prototype.replace;
    const originalReplaceSync = CSSStyleSheet.prototype.replaceSync;

    // Helper function: dispatch a custom event with method name, arguments, and result.
    function add_event(rule: serializable_rule) {
        const event = new CustomEvent("cssRuleIntercepted", {detail: rule});
        document.dispatchEvent(event);
    }

    // serialize and then send the rule
    function serialize_and_send_rule(rule: CSSRule) {
        if (rule instanceof CSSStyleRule) {
            add_event({
                font: rule.style.font,
                font_family: rule.style.fontFamily,
                selector: rule.selectorText
            });
        }
    }

    // iterate over every css rule in the sheet and serialize and send them
    function handle_sheet(sheet: CSSRuleList) {
        for (const rule of sheet) {
            if (rule instanceof CSSStyleRule) {
                serialize_and_send_rule(rule);
            } else if (rule instanceof CSSGroupingRule) {
                // unwrap grouping rules, shouldnt matter if theyre media queries or whatever cause all fonts are
                // replaced
                handle_sheet(rule.cssRules);
            }
        }
    }

    // Override insertRule.
    CSSStyleSheet.prototype.insertRule = function (rule, index) {
        const result = originalInsertRule.call(this, rule, index);
        serialize_and_send_rule(this.cssRules[result]);
        return result;
    };

    // Override addRule.
    CSSStyleSheet.prototype.addRule = function (selector, rule, index) {
        const result = originalAddRule.call(this, selector, rule, index);
        serialize_and_send_rule(this.cssRules[result]);
        return result;
    };

    // Override replace (which returns a Promise).
    CSSStyleSheet.prototype.replace = function (rule) {
        const resultPromise = originalReplace.call(this, rule);
        resultPromise.then(s => {
            // Handle the new CSSStyleSheet.
            handle_sheet(this.cssRules);
        })
        return resultPromise;
    };

    // Override replaceSync.
    CSSStyleSheet.prototype.replaceSync = function (rule) {
        originalReplaceSync.call(this, rule);
        handle_sheet(this.cssRules)
    };

    console.log("CSSStyleSheet methods have been overridden.");
})();
