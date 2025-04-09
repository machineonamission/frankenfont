FRANKENFONT.config = null;


function copy_font(config: config_type, in_font: string, out_font: string[]) {
    for (const type of out_font as (keyof config_type["font-options"])[]) {
        config["font-options"][type] = config["font-options"][in_font as keyof config_type["font-options"]];
    }
}

function disable_font(config: config_type, in_fonts: string[]) {
    for (const type of in_fonts as (keyof config_type["font-options"])[]) {
        config["font-options"][type].enabled = false;
    }
}

function expand_font_options(config: config_type): config_type {
    switch (config.specificity) {
        case "one":
            copy_font(config, "normal", ["serif", "sans-serif", "monospace", "fantasy", "cursive"])
            disable_font(config, ["math", "unknown"])
            break;
        case "minimal":
            copy_font(config, "normal", ["serif", "sans-serif", "fantasy", "cursive"])
            disable_font(config, ["math", "unknown"])
            break;
        case "standard":
            copy_font(config, "sans-serif", ["fantasy", "cursive"])
            disable_font(config, ["math", "unknown"])
            break;
        case "advanced":
            break;
    }
    return config;
}

window.addEventListener("frankenfont-config-receive", (e) => {
    let config: config_type = (e as CustomEvent).detail;
    config = expand_font_options(config);
    FRANKENFONT.config = config;
    FRANKENFONT.waiting_for_config.forEach(r => {
        r(config)
    });
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