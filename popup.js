let botChecker = document.getElementById('botChecker');
let injected = false;
let botCheckerEnabled;

const onLoadFunc = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, 'is_checker_enabled', (msg) => {
            msg = msg || {};
            botCheckerEnabled = msg.status === 'yes';
            botChecker.innerText = botCheckerEnabled ? 'Turn off' : 'Turn on';
        });
    });   
}

botChecker.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        botCheckerEnabled = !botCheckerEnabled;
        botChecker.innerText = botCheckerEnabled ? 'Turn off' : 'Turn on';
        chrome.tabs.sendMessage(tab.id, 'script_already_injected', (msg) => {
            msg = msg || {};
            if (msg.status != 'yes') {
              chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['script.js'],
              }, () => {
                chrome.tabs.sendMessage(tab.id, `checker_${botCheckerEnabled}`);
              });
              chrome.scripting.insertCSS({
                  target: { tabId: tab.id },
                  files: ['inject.css'],
              });
            } else {
                chrome.tabs.sendMessage(tab.id, `checker_${botCheckerEnabled}`);
            }
        });
    });
});

window.onload = onLoadFunc;
