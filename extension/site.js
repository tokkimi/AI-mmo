// Signale à la page d'installation d'i-ateliers que l'extension est installée, avec sa version.
document.documentElement.dataset.icourtier = chrome.runtime.getManifest().version;
