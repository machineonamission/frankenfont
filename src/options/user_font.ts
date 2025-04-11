wait_for_config_and_dom().then(() => {
    if (config!.enabled) {
        const existing_ss = window.getComputedStyle(document.documentElement).getPropertyValue("--bs-font-sans-serif");
        const existing_mono = window.getComputedStyle(document.documentElement).getPropertyValue("--bs-font-monospace");

        let style = new CSSStyleSheet();
        if (config!["computed-font-options"]["sans-serif"].enabled) {
           style.insertRule(`:root {--bs-font-sans-serif: "${config!["computed-font-options"]["sans-serif"].name}", ${existing_ss} !important}`);
        }
        if (config!["computed-font-options"]["monospace"].enabled) {
            style.insertRule(`:root {--bs-font-monospace: "${config!["computed-font-options"]["monospace"].name}", ${existing_mono} !important}`);
        }
        document.adoptedStyleSheets.push(style);
    }
});