let FRANKENFONT: {
    config: config_type | null,
    handle_direct_declarations: ((rule: CSSStyleRule) => void) | null,
    handle_sheet: ((sheet: CSSStyleSheet) => void) | null,
    waiting_for_config: ((value: (config_type | PromiseLike<config_type>)) => void)[],
} = {
    config: null,
    handle_direct_declarations: null,
    handle_sheet: null,
    waiting_for_config: [],
}