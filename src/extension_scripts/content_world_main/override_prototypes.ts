// injected as world:main script, overrides JS methods and either send them to the content script, or directly handles them

function override_prototypes() {
    // Save references to the original methods.
    const originalInsertRule = CSSStyleSheet.prototype.insertRule;
    const originalAddRule = CSSStyleSheet.prototype.addRule;
    const originalReplace = CSSStyleSheet.prototype.replace;
    const originalReplaceSync = CSSStyleSheet.prototype.replaceSync;

    // serialize and then send the rule
    function serialize_and_send_rule(rule: CSSRule) {
        if (rule instanceof CSSStyleRule) {
            FRANKENFONT.handle_direct_declarations!(rule)
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
            FRANKENFONT.handle_sheet!(this);
        })
        return resultPromise;
    };

    // Override replaceSync.
    CSSStyleSheet.prototype.replaceSync = function (rule) {
        originalReplaceSync.call(this, rule);
        FRANKENFONT.handle_sheet!(this)
    };

    // console.log("CSSStyleSheet methods have been overridden.");
    // Save the original descriptor so you can call the real setter/getter later
    const originalDescriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font')!;

    // Define a new property descriptor
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
        get: function() {
            console.log('Custom font getter called with:');
            return originalDescriptor.get!.call(this);
        },
        set: function(value) {
            console.log('Custom font setter called with:', value);

            // You can modify the value here if you want
            // const newValue = value + ' /* intercepted */';

            // Call the original setter
            originalDescriptor.set!.call(this, value);
        },
        configurable: true,
        enumerable: true
    });
}
