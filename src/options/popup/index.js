document.querySelector('#options').addEventListener('click', function() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
});
document.querySelector("#version").innerHTML = "v" + chrome.runtime.getManifest().version;