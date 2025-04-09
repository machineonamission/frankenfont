FRANKENFONT.config = null;

window.addEventListener("frankenfont-config-receive", (e) => {
    let config: config_type = (e as CustomEvent).detail;
    FRANKENFONT.config = config;
    FRANKENFONT.waiting_for_config.forEach(r => {r(config)});
});

// if this loads before content.ts, then this is ignore and we'll recieve the config when content.ts is ready
// if this loads after content.ts, we missed its message and we need to request it
window.dispatchEvent(new CustomEvent('frankenfont-config-send'));

function wait_for_config(): Promise<config_type> {
    if (FRANKENFONT.config) {
        return Promise.resolve(FRANKENFONT.config);
    } else {
        return new Promise((resolve) => {
            FRANKENFONT.waiting_for_config.push(resolve);
        });
    }
}