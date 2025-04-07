
(function() {
    let config = FRANKENFONT.config!;
    if (!config.enabled) {
        return;
    }
    if (config.mode === "css") {
        // TODO
    } else if (config.mode === "noremotefonts") {
        // TODO
        //  add a "Content-Security-Policy: font-src *" header to fonts
    } else if (config.mode === "js") {
        FRANKENFONT.engine_js!()
    }
})();
