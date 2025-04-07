let FRANKENFONT: {
    config: config_type | null,
    engine_js: (() => void) | null,
    handle_direct_declarations: ((rule: CSSStyleRule) => void) | null,
    handle_sheet: ((sheet: CSSStyleSheet) => void) | null,
    waiting_for_config: ((value: (config_type | PromiseLike<config_type>)) => void)[],
    overrode_prototypes: {
        insertRule: typeof CSSStyleSheet.prototype.insertRule | null,
        addRule: typeof CSSStyleSheet.prototype.addRule | null,
        replaceSync: typeof CSSStyleSheet.prototype.replaceSync | null,
        replace: typeof CSSStyleSheet.prototype.replace | null,
        font: PropertyDescriptor | null
    }
} = {
    config: null,
    engine_js: null,
    handle_direct_declarations: null,
    handle_sheet: null,
    waiting_for_config: [],
    overrode_prototypes: {
        insertRule: null,
        addRule: null,
        replaceSync: null,
        replace: null,
        font: null
    }
}