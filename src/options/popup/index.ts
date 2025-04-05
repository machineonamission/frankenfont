document.addEventListener("DOMContentLoaded", function(event){
    (document.querySelector('#options') as Element).addEventListener('click', function() {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });
    (document.querySelector("#version") as Element).innerHTML = "v" + chrome.runtime.getManifest().version;
});
