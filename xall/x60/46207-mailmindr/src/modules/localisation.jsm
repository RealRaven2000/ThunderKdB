if (Cu === undefined) var Cu = Components.utils;
if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

Cu.import("resource://mailmindr/legacy/logger.jsm");

var EXPORTED_SYMBOLS = ['mailmindrI18n'];

class MailmindrI18n {
    constructor() {
        this._logger = new mailmindrLogger({ _name: 'localisation.jsm' });
        this._strings = null;
    }

    lazyInitialisation() {
        try {
            let src = `chrome://mailmindr/locale/utils/core.properties`;
            let stringBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
            this._strings = stringBundleService.createBundle(src);
            if (!this._strings) {
                this._logger.warn('cannot get localization service');
            }
        }
        catch (e) {
            this._logger.error(e);
        }
    }
    
    getString(id) {
        if (!this._strings) {
            this._logger.log('initializing localisation');
            this.lazyInitialisation();
        }

        return this._strings.GetStringFromName(id);
    }

    shutdown() {
        if (this._strings) {
            this._strings = null;
            let stringBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
            stringBundleService.flushBundles();
        }
    }
}

var mailmindrI18n = mailmindrI18n || new MailmindrI18n();
