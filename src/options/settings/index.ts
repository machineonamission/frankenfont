const id = document.getElementById.bind(document) as (id: string) => HTMLElement;


function copy_font(config: config_type, in_font: string, out_font: string[]) {
    for (const type of out_font as (keyof font_options)[]) {
        config["computed-font-options"][type] = config["font-options"][in_font as keyof font_options];
    }
}

function disable_font(config: config_type, in_fonts: string[]) {
    for (const type of in_fonts as (keyof font_options)[]) {
        config["computed-font-options"][type].enabled = false;
    }
}

function expand_font_options(config: config_type): config_type {
    // expands out the compact low-specificity config into the full mapping for each font
    config["computed-font-options"] = config["font-options"];
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
            // advanced is 1:1 with the full mapping
            break;
    }
    return config;
}

wait_for_config_and_dom().then(() => {
    if (config === null) {
        throw new Error("huh?");
    }
    if (config.enabled && config["computed-font-options"]["sans-serif"].enabled) {
        document.body.style.setProperty("font-family", `"${config["computed-font-options"]["sans-serif"].name}", "Atkinson Hyperlegible Next", sans-serif`);
    }
    // global enable switch
    const global_enable = (id("enable") as HTMLInputElement);
    global_enable.checked = config.enabled;
    global_enable.addEventListener("change", () => {
        config!["enabled"] = global_enable.checked;
    });
    // save
    const sn = id("save-name");
    id("save").addEventListener("click", () => {
        config = expand_font_options(config!)
        chrome.storage.sync.set(config).then(() => {
            return handle_mode()
        }).then(() => {
            sn.innerText = "Saved! Reload any open pages to see changes.";
            sn.classList.add("text-success");
            sn.classList.remove("text-danger");
        }).catch((e) => {
            sn.innerText = "Error saving config! " + e;
            sn.classList.remove("text-success");
            sn.classList.add("text-danger");
        })

    })
    // font selection
    for (const [f_type, {enabled, name}] of Object.entries(config["font-options"])) {
        const enable_switch = (id(`${f_type.replace("_", "-")}-font-enable`) as HTMLInputElement);
        const font_name = (id(`${f_type.replace("_", "-")}-font-name`) as HTMLInputElement);
        // enable switch
        enable_switch.checked = enabled;
        if (enable_switch.checked) {
            font_name.removeAttribute("disabled")
        } else {
            font_name.setAttribute("disabled", "true")
        }
        enable_switch.addEventListener("change", () => {
            config!["font-options"][f_type as keyof config_type["font-options"]]["enabled"] = enable_switch.checked;
            if (enable_switch.checked) {
                font_name.removeAttribute("disabled")
            } else {
                font_name.setAttribute("disabled", "true")
            }
        });

        // font name
        let fallback_type;
        if (["normal", "math", "unknown"].includes(f_type)) {
            fallback_type = "sans-serif";
        } else {
            fallback_type = f_type;
        }
        font_name.value = name;
        font_name.addEventListener("change", () => {
            config!["font-options"][f_type as keyof config_type["font-options"]]["name"] = font_name.value;
            font_name.style.setProperty("font-family", `"${font_name.value}", ${fallback_type}`);
        });
        font_name.style.setProperty("font-family", `"${font_name.value}", ${fallback_type}`);
    }

    // specificity
    const spec = config.specificity;
    id(`spec-${spec}`).setAttribute("checked", "true");
    handle_spec(spec);
    id("spec").addEventListener("change", () => {
        const spec = (document.querySelector('input[name="spec"]:checked') as HTMLInputElement).value;
        config!.specificity = spec as config_type["specificity"];
        handle_spec(spec as config_type["specificity"]);
    })

    // white/black list
    const whitelist = id("whitelist") as HTMLTextAreaElement;
    whitelist.value = config.url_whitelist.join("\n");
    whitelist.addEventListener("change", () => {
        if (whitelist.value) {
            config!.url_whitelist = whitelist.value.split("\n") as config_type["url_whitelist"];
        } else {
            config!.url_whitelist = [] as config_type["url_whitelist"];
        }

    })
    const blacklist = id("blacklist") as HTMLTextAreaElement;
    blacklist.value = config.url_blacklist.join("\n");
    blacklist.addEventListener("change", () => {
        if (blacklist.value) {
            config!.url_blacklist = blacklist.value.split("\n") as config_type["url_blacklist"];
        } else {
            config!.url_blacklist = [] as config_type["url_blacklist"];
        }
    })
})

function handle_spec(spec: config_type["specificity"]) {
    document.querySelectorAll(`.spec.spec-${spec}`).forEach((el) => {
        el.classList.remove("d-none");
    });
    document.querySelectorAll(`.spec:not(.spec-${spec})`).forEach((el) => {
        el.classList.add("d-none");
    });
}