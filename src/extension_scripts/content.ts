window.addEventListener("frankenfont-request-config", (e) => {
    get_config().then(c => {
        window.dispatchEvent(new CustomEvent('frankenfont-receive-config', {detail: c}));
    })
});

