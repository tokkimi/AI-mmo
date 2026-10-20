chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'icourtier-selection', title: 'Envoyer la sélection à i-Courtier', contexts: ['selection'] });
});

// La sélection est conservée puis ajoutée à la source dans le panneau.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'icourtier-selection' || !info.selectionText) return;
  const { pending = '' } = await chrome.storage.local.get('pending');
  await chrome.storage.local.set({ pending: (pending ? pending + '\n\n' : '') + info.selectionText });
  if (tab?.windowId) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
});
