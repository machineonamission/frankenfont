FRANKENFONT.config = null;

window.addEventListener("frankenfont-receive-config", (e) => {
    let config: config_type = (e as CustomEvent).detail;
    FRANKENFONT.config = config;
    FRANKENFONT.waiting_for_config.forEach(r => {r(config)});
});

window.dispatchEvent(new CustomEvent('frankenfont-request-config'));

function wait_for_config(): Promise<config_type> {
    if (FRANKENFONT.config) {
        return Promise.resolve(FRANKENFONT.config);
    } else {
        return new Promise((resolve) => {
            FRANKENFONT.waiting_for_config.push(resolve);
        });
    }
}