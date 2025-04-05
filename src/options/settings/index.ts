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

const id = document.getElementById.bind(document);

function setup_config() {
    if (config === null) {
        throw new Error("huh?");
    }
    const global_enable = (id("enable") as HTMLInputElement);
    global_enable.checked = config.enabled;
    global_enable.addEventListener("change", (e) => {
        config!["enabled"] = global_enable.checked;
    });
    id("save")!.addEventListener("click", e => {
        chrome.storage.sync.set(config!).then(() => {
            id("save-name")!.innerText = "Saved!";
        })
    })
    for (const [f_type, {enabled, name}] of Object.entries(config["font-options"])) {
        const enable_switch = (id(`${f_type.replace("_", "-")}-font-enable`) as HTMLInputElement);
        const font_name = (id(`${f_type.replace("_", "-")}-font-name`) as HTMLInputElement);
        enable_switch.checked = enabled;
        if (enable_switch.checked) {
            font_name.removeAttribute("disabled")
        } else {
            font_name.setAttribute("disabled", "true")
        }
        enable_switch.addEventListener("change", (e) => {
            config!["font-options"][f_type as keyof config_type["font-options"]]["enabled"] = enable_switch.checked;
            if (enable_switch.checked) {
                font_name.removeAttribute("disabled")
            } else {
                font_name.setAttribute("disabled", "true")
            }
        });
        font_name.value = name;
        font_name.addEventListener("change", (e) => {
            config!["font-options"][f_type as keyof config_type["font-options"]]["name"] = font_name.value;
        });
    }
}