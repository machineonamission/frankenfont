let docready = false;
let storageready = false;

let config: config_type | null = null;

document.addEventListener("DOMContentLoaded", function (event) {
    docready = true;
    waitforboth()
});

get_config().then(items => {
    config = items as config_type;
    storageready = true;
    waitforboth()
})

function waitforboth() {
    if (docready && storageready) {
        setup_config()
    }
}

const id = document.getElementById.bind(document) as (id: string) => HTMLElement;


function setup_config() {
    if (config === null) {
        throw new Error("huh?");
    }
    // global enable switch
    const global_enable = (id("enable") as HTMLInputElement);
    global_enable.checked = config.enabled;
    global_enable.addEventListener("change", () => {
        config!["enabled"] = global_enable.checked;
    });
    // save
    id("save").addEventListener("click", () => {
        chrome.storage.sync.set(config!).then(() => {
            id("save-name").innerText = "Saved!";
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
        font_name.value = name;
        font_name.addEventListener("change", () => {
            config!["font-options"][f_type as keyof config_type["font-options"]]["name"] = font_name.value;
        });
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
}

function handle_spec(spec: config_type["specificity"]) {
    document.querySelectorAll(`.spec.spec-${spec}`).forEach((el) => {
        el.classList.remove("d-none");
    });
    document.querySelectorAll(`.spec:not(.spec-${spec})`).forEach((el) => {
        el.classList.add("d-none");
    });
}