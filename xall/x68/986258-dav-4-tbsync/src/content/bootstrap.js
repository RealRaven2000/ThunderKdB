/*
 * This file is part of DAV-4-TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

// no need to create namespace, we are in a sandbox

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

let gExtension = "";
let component = {};

let onInitDoneObserver = {
    observe: async function (aSubject, aTopic, aData) {        
        let valid = false;
        try {
            var { TbSync } = ChromeUtils.import("chrome://tbsync/content/tbsync.jsm");
            valid = TbSync.enabled;
        } catch (e) {
            // If this fails, TbSync is not loaded yet and we will get the notification later again.
        }
        
        //load this provider add-on into TbSync
        if (valid) {
            await TbSync.providers.loadProvider(gExtension, "dav", "chrome://dav4tbsync/content/provider.js");
        }
    }
}


function startup(addon, extension) {
    gExtension = extension;
    Services.obs.addObserver(onInitDoneObserver, "tbsync.observer.initialized", false);

    try {
        Services.scriptloader.loadSubScript("chrome://dav4tbsync/content/includes/tbSyncDavCalendar.js", component);    
        let registrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        registrar.registerFactory(
            component.tbSyncDavCalendar.prototype.classID,
            component.tbSyncDavCalendar.prototype.classDescription,
            component.tbSyncDavCalendar.prototype.contractID,
            component.NSGetFactory(component.tbSyncDavCalendar.prototype.classID)
        );
    } catch (e) {}
    
    onInitDoneObserver.observe();
}

function shutdown(addon, extension) {
    try {
        let registrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        registrar.unregisterFactory(
            component.tbSyncDavCalendar.prototype.classID,
            component.NSGetFactory(component.tbSyncDavCalendar.prototype.classID)
        );
    } catch (e) {}
    
    Services.obs.removeObserver(onInitDoneObserver, "tbsync.observer.initialized");
    //unload this provider add-on from TbSync
    try {
        var { TbSync } = ChromeUtils.import("chrome://tbsync/content/tbsync.jsm");
        TbSync.providers.unloadProvider("dav");
    } catch (e) {
        //if this fails, TbSync has been unloaded already and has unloaded this addon as well
    }
}
