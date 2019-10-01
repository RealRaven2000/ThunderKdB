/*
 * This file is part of TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */
 
 "use strict";

var { TbSync } = ChromeUtils.import("chrome://tbsync/content/tbsync.jsm");

var tbSyncDavAddressBook = {

    onInject: function (window) {
        Services.obs.addObserver(tbSyncDavAddressBook.onAddressBookCreated, "tbsync.observer.addressbook.created", false);
        if (window.document.getElementById("dirTree")) {
            window.document.getElementById("dirTree").addEventListener("select", tbSyncDavAddressBook.onAbDirectorySelectionChanged, false);
        }
    },

    onRemove: function (window) {
        Services.obs.removeObserver(tbSyncDavAddressBook.onAddressBookCreated, "tbsync.observer.addressbook.created");
        if (window.document.getElementById("dirTree")) {
            window.document.getElementById("dirTree").removeEventListener("select", tbSyncDavAddressBook.onAbDirectorySelectionChanged, false);
        }
    },
    
    onAddressBookCreated: {
        observe: function (aSubject, aTopic, aData) {
            tbSyncDavAddressBook.onAbDirectorySelectionChanged();
        }
    },

    onAbDirectorySelectionChanged: function () {
        //TODO: Do not do this, if provider did not change
        //remove our details injection (if injected)
         TbSync.providers.dav.overlayManager.removeOverlay(window, "chrome://dav4tbsync/content/overlays/addressbookdetailsoverlay.xul");
        //inject our details injection (if the new selected book is us)
         TbSync.providers.dav.overlayManager.injectOverlay(window, "chrome://dav4tbsync/content/overlays/addressbookdetailsoverlay.xul");
    }
}
