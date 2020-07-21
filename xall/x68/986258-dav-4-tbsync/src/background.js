function handleUpdateAvailable(details) {
  console.log("Update available for Dav4TbSync");
}

async function main() {
  // just by registering this listener, updates will not install until next restart
  //messenger.runtime.onUpdateAvailable.addListener(handleUpdateAvailable);

  await messenger.LegacyBootstrap.registerChromeUrl([ ["content", "dav4tbsync", "content/"] ]);
  await messenger.LegacyBootstrap.registerBootstrapScript("chrome://dav4tbsync/content/bootstrap.js");  
}

main();
