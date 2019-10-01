/*global Components: false, EnigmailFiles: false, EnigmailCore: false, EnigmailApp: false, EnigmailDialog: false, EnigmailWindows: false, EnigmailTime: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PLEASE NOTE: this module is legacy and must not be used for newe code - it will be removed!
 */


"use strict";

// enigmailCommon.js: shared JS functions for Enigmail

// WARNING: This module functions must not be loaded in overlays to standard functionality!

// Many of these components are not used in this file, but are instead used in other files that are loaded together with EnigmailCommon
var EnigmailCore = ChromeUtils.import("chrome://autocrypt/content/modules/core.jsm").EnigmailCore;
var EnigmailFuncs = ChromeUtils.import("chrome://autocrypt/content/modules/funcs.jsm").EnigmailFuncs;
var EnigmailLog = ChromeUtils.import("chrome://autocrypt/content/modules/log.jsm").EnigmailLog;
var EnigmailPrefs = ChromeUtils.import("chrome://autocrypt/content/modules/prefs.jsm").EnigmailPrefs;
var EnigmailOS = ChromeUtils.import("chrome://autocrypt/content/modules/os.jsm").EnigmailOS;
var EnigmailLocale = ChromeUtils.import("chrome://autocrypt/content/modules/locale.jsm").EnigmailLocale;
var EnigmailData = ChromeUtils.import("chrome://autocrypt/content/modules/data.jsm").EnigmailData;
var EnigmailFiles = ChromeUtils.import("chrome://autocrypt/content/modules/files.jsm").EnigmailFiles;
var EnigmailApp = ChromeUtils.import("chrome://autocrypt/content/modules/app.jsm").EnigmailApp;
var EnigmailDialog = ChromeUtils.import("chrome://autocrypt/content/modules/dialog.jsm").EnigmailDialog;
var EnigmailWindows = ChromeUtils.import("chrome://autocrypt/content/modules/windows.jsm").EnigmailWindows;
var EnigmailTime = ChromeUtils.import("chrome://autocrypt/content/modules/time.jsm").EnigmailTime;
var EnigmailTimer = ChromeUtils.import("chrome://autocrypt/content/modules/timer.jsm").EnigmailTimer;
var EnigmailKeyRing = ChromeUtils.import("chrome://autocrypt/content/modules/keyRing.jsm").EnigmailKeyRing;
var EnigmailConstants = ChromeUtils.import("chrome://autocrypt/content/modules/constants.jsm").EnigmailConstants;
var EnigmailKeyServer = ChromeUtils.import("chrome://autocrypt/content/modules/keyserver.jsm").EnigmailKeyServer;
var EnigmailEvents = ChromeUtils.import("chrome://autocrypt/content/modules/events.jsm").EnigmailEvents;
var EnigmailStreams = ChromeUtils.import("chrome://autocrypt/content/modules/streams.jsm").EnigmailStreams;


// The compatible Enigmime version
var gEnigmailSvc;
var gEnigPromptSvc;


// Maximum size of message directly processed by Enigmail
const ENIG_PROCESSINFO_CONTRACTID = "@mozilla.org/xpcom/process-info;1";
const ENIG_ENIGMAIL_CONTRACTID = "@mozdev.org/enigmail/enigmail;1";
const ENIG_STRINGBUNDLE_CONTRACTID = "@mozilla.org/intl/stringbundle;1";
const ENIG_LOCAL_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const ENIG_DIRSERVICE_CONTRACTID = "@mozilla.org/file/directory_service;1";
const ENIG_MIME_CONTRACTID = "@mozilla.org/mime;1";
const ENIG_WMEDIATOR_CONTRACTID = "@mozilla.org/rdf/datasource;1?name=window-mediator";
const ENIG_ASS_CONTRACTID = "@mozilla.org/appshell/appShellService;1";
const ENIG_LOCALE_SVC_CONTRACTID = "@mozilla.org/intl/nslocaleservice;1";
const ENIG_DATE_FORMAT_CONTRACTID = "@mozilla.org/intl/scriptabledateformat;1";
const ENIG_ACCOUNT_MANAGER_CONTRACTID = "@mozilla.org/messenger/account-manager;1";
const ENIG_THREAD_MANAGER_CID = "@mozilla.org/thread-manager;1";
const ENIG_SIMPLEURI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const ENIG_SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";


const ENIG_STANDARD_URL_CONTRACTID = "@mozilla.org/network/standard-url;1";
const ENIG_SCRIPTABLEINPUTSTREAM_CONTRACTID = "@mozilla.org/scriptableinputstream;1";
const ENIG_BINARYINPUTSTREAM_CONTRACTID = "@mozilla.org/binaryinputstream;1";
const ENIG_SAVEASCHARSET_CONTRACTID = "@mozilla.org/intl/saveascharset;1";

const ENIG_STREAMCONVERTERSERVICE_CID_STR =
  "{892FFEB0-3F80-11d3-A16C-0050041CAF44}";


const ENIG_ISCRIPTABLEUNICODECONVERTER_CONTRACTID = "@mozilla.org/intl/scriptableunicodeconverter";

const ENIG_IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";

const ENIG_C = Components.classes;
const ENIG_I = Components.interfaces;

const ENIG_BUTTON_POS_0 = 1;
const ENIG_BUTTON_POS_1 = 1 << 8;
const ENIG_BUTTON_POS_2 = 1 << 16;
const ENIG_BUTTON_TITLE_IS_STRING = 127;

const ENIG_HEADERMODE_KEYID = 0x01;
const ENIG_HEADERMODE_URL = 0x10;



function EnigGetFrame(win, frameName) {
  return EnigmailWindows.getFrame(win, frameName);
}

// Initializes enigmailCommon
function EnigInitCommon(id) {
  EnigmailLog.DEBUG("enigmailCommon.js: EnigInitCommon: id=" + id + "\n");

  gEnigPromptSvc = enigGetService("@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService");
}


function GetEnigmailSvc() {
  if (!gEnigmailSvc)
    gEnigmailSvc = EnigmailCore.getService(window);
  return gEnigmailSvc;
}

// maxBytes == -1 => read everything
function EnigReadURLContents(url, maxBytes) {
  EnigmailLog.DEBUG("enigmailCommon.js: EnigReadURLContents: url=" + url +
    ", " + maxBytes + "\n");

  var ioServ = enigGetService(ENIG_IOSERVICE_CONTRACTID, "nsIIOService");
  if (!ioServ)
    throw Components.results.NS_ERROR_FAILURE;

  var fileChannel = EnigmailStreams.createChannel(url);

  var rawInStream = fileChannel.open();

  var inStream = ENIG_C[ENIG_BINARYINPUTSTREAM_CONTRACTID].createInstance(ENIG_I.nsIBinaryInputStream);
  inStream.setInputStream(rawInStream);

  var available = inStream.available();
  if ((maxBytes < 0) || (maxBytes > available))
    maxBytes = available;

  var data = inStream.readBytes(maxBytes);

  inStream.close();

  return data;
}

// maxBytes == -1 => read whole file
function EnigReadFileContents(localFile, maxBytes) {

  EnigmailLog.DEBUG("enigmailCommon.js: EnigReadFileContents: file=" + localFile.leafName +
    ", " + maxBytes + "\n");

  if (!localFile.exists() || !localFile.isReadable())
    throw Components.results.NS_ERROR_FAILURE;

  var ioServ = enigGetService(ENIG_IOSERVICE_CONTRACTID, "nsIIOService");
  if (!ioServ)
    throw Components.results.NS_ERROR_FAILURE;

  var fileURI = ioServ.newFileURI(localFile);
  return EnigReadURLContents(fileURI.asciiSpec, maxBytes);

}

///////////////////////////////////////////////////////////////////////////////


// write exception information
function EnigWriteException(referenceInfo, ex) {
  EnigmailLog.writeException(referenceInfo, ex);
}

///////////////////////////////////////////////////////////////////////////////

function EnigAlert(mesg) {
  return EnigmailDialog.alert(window, mesg);
}

/**
 * Displays an alert dialog with 3-4 optional buttons.
 * checkBoxLabel: if not null, display checkbox with text; the checkbox state is returned in checkedObj
 * button-Labels: use "&" to indicate access key
 *     use "buttonType:label" or ":buttonType" to indicate special button types
 *        (buttonType is one of cancel, help, extra1, extra2)
 * return: 0-2: button Number pressed
 *          -1: ESC or close window button pressed
 *
 */
function EnigLongAlert(mesg, checkBoxLabel, okLabel, labelButton2, labelButton3, checkedObj) {
  return EnigmailDialog.longAlert(window, mesg, checkBoxLabel, okLabel, labelButton2, labelButton3, checkedObj);
}

function EnigAlertPref(mesg, prefText) {
  return EnigmailDialog.alertPref(window, mesg, prefText);
}

// Confirmation dialog with OK / Cancel buttons (both customizable)
function EnigConfirm(mesg, okLabel, cancelLabel) {
  return EnigmailDialog.confirmDlg(window, mesg, okLabel, cancelLabel);
}


function EnigError(mesg) {
  return gEnigPromptSvc.alert(window, EnigGetString("enigError"), mesg);
}


function EnigHelpWindow(source) {
  EnigmailWindows.openHelpWindow(source);
}


function EnigDisplayRadioPref(prefName, prefValue, optionElementIds) {
  EnigmailLog.DEBUG("enigmailCommon.js: EnigDisplayRadioPref: " + prefName + ", " + prefValue + "\n");

  if (prefValue >= optionElementIds.length)
    return;

  var groupElement = document.getElementById("enigmail_" + prefName);
  var optionElement = document.getElementById(optionElementIds[prefValue]);

  if (groupElement && optionElement) {
    groupElement.selectedItem = optionElement;
    groupElement.value = prefValue;
  }
}

function EnigSetRadioPref(prefName, optionElementIds) {
  EnigmailLog.DEBUG("enigmailCommon.js: EnigSetRadioPref: " + prefName + "\n");

  try {
    var groupElement = document.getElementById("enigmail_" + prefName);
    if (groupElement) {
      var optionElement = groupElement.selectedItem;
      var prefValue = optionElement.value;
      if (prefValue < optionElementIds.length) {
        EnigSetPref(prefName, prefValue);
        groupElement.value = prefValue;
      }
    }
  } catch (ex) {}
}

function EnigSavePrefs() {
  return EnigmailPrefs.savePrefs();
}

function EnigGetPref(prefName) {
  return EnigmailPrefs.getPref(prefName);
}

function EnigGetDefaultPref(prefName) {
  EnigmailLog.DEBUG("enigmailCommon.js: EnigGetDefaultPref: prefName=" + prefName + "\n");
  var prefValue = null;
  try {
    EnigmailPrefs.getPrefBranch().lockPref(prefName);
    prefValue = EnigGetPref(prefName);
    EnigmailPrefs.getPrefBranch().unlockPref(prefName);
  } catch (ex) {}

  return prefValue;
}

function EnigSetPref(prefName, value) {
  return EnigmailPrefs.setPref(prefName, value);
}


function EnigConvertFromUnicode(text, charset) {
  EnigmailLog.DEBUG("enigmailCommon.js: EnigConvertFromUnicode: " + charset + "\n");

  if (!text)
    return "";

  if (!charset) charset = "utf-8";

  // Encode plaintext
  try {
    var unicodeConv = ENIG_C[ENIG_ISCRIPTABLEUNICODECONVERTER_CONTRACTID].getService(ENIG_I.nsIScriptableUnicodeConverter);

    unicodeConv.charset = charset;
    return unicodeConv.ConvertFromUnicode(text);

  } catch (ex) {
    EnigmailLog.DEBUG("enigmailCommon.js: EnigConvertFromUnicode: caught an exception\n");

    return text;
  }
}


function EnigConvertToUnicode(text, charset) {
  // EnigmailLog.DEBUG("enigmailCommon.js: EnigConvertToUnicode: "+charset+"\n");

  if (!text || !charset /*|| (charset.toLowerCase() == "iso-8859-1")*/ )
    return text;

  // Encode plaintext
  try {
    var unicodeConv = ENIG_C[ENIG_ISCRIPTABLEUNICODECONVERTER_CONTRACTID].getService(ENIG_I.nsIScriptableUnicodeConverter);

    unicodeConv.charset = charset;
    return unicodeConv.ConvertToUnicode(text);

  } catch (ex) {
    EnigmailLog.DEBUG("enigmailCommon.js: EnigConvertToUnicode: caught an exception while converting'" + text + "' to " + charset + "\n");
    return text;
  }
}

function EnigFormatFpr(fingerprint) {
  return EnigmailFuncs.formatFpr(fingerprint);
}

/////////////////////////
// Console stuff
/////////////////////////


// return the options passed to a window
function EnigGetWindowOptions() {
  var winOptions = [];
  if (window.location.search) {
    var optList = window.location.search.substr(1).split(/&/);
    for (var i = 0; i < optList.length; i++) {
      var anOption = optList[i].split(new RegExp("="));
      winOptions[anOption[0]] = unescape(anOption[1]);
    }
  }
  return winOptions;
}

function EngmailCardDetails() {
  EnigmailWindows.openCardDetails();
}

function EnigKeygen() {
  EnigmailWindows.openKeyGen();

}

// retrieves a localized string from the enigmail.properties stringbundle
function EnigGetString(aStr) {
  var argList = [];
  // unfortunately arguments.shift() doesn't work, so we use a workaround

  if (arguments.length > 1)
    for (var i = 1; i < arguments.length; i++) {
      argList.push(arguments[i]);
    }
  return EnigmailLocale.getString(aStr, (arguments.length > 1 ? argList : null));
}


//get path for temporary directory (e.g. /tmp, C:\TEMP)
function EnigGetTempDir() {
  return EnigmailFiles.getTempDir();
}

// get the OS platform
function EnigGetOS() {
  return EnigmailOS.getOS();
}

function EnigGetVersion() {
  return EnigmailApp.getVersion();
}

function EnigFilePicker(title, displayDir, save, defaultExtension, defaultName, filterPairs) {
  return EnigmailDialog.filePicker(window, title, displayDir, save, defaultExtension,
    defaultName, filterPairs);
}

// get keys from keyserver
function EnigDownloadKeys(inputObj, resultObj) {
  return EnigmailWindows.downloadKeys(window, inputObj, resultObj);
}

function EnigDisplayKeyDetails(keyId, refresh) {
  return EnigmailWindows.openKeyDetails(window, keyId, refresh);
}


function EnigGetLocalFileApi() {
  return Components.interfaces.nsIFile;
}

function EnigGetFilePath(nsFileObj) {
  return EnigmailFiles.getFilePath(nsFileObj);
}

function EnigGetDateTime(dateNum, withDate, withTime) {
  return EnigmailTime.getDateTime(dateNum, withDate, withTime);
}

function enigCreateInstance(aURL, aInterface) {
  return ENIG_C[aURL].createInstance(ENIG_I[aInterface]);
}

function enigGetService(aURL, aInterface) {
  // determine how 'aInterface' is passed and handle accordingly
  switch (typeof(aInterface)) {
    case "object":
      return ENIG_C[aURL].getService(aInterface);
    case "string":
      return ENIG_C[aURL].getService(ENIG_I[aInterface]);
    default:
      return ENIG_C[aURL].getService();
  }
}

/**
 * EnigOpenUrlExternally
 *
 * forces a uri to be loaded in an external browser
 *
 * @uri nsIUri object
 */
function EnigOpenUrlExternally(uri) {
  let eps = ENIG_C["@mozilla.org/uriloader/external-protocol-service;1"].
  getService(ENIG_I.nsIExternalProtocolService);

  eps.loadURI(uri, null);
}

function EnigOpenURL(event, hrefObj) {
  var xulAppinfo = ENIG_C["@mozilla.org/xre/app-info;1"].getService(ENIG_I.nsIXULAppInfo);
  if (xulAppinfo.ID == ENIG_SEAMONKEY_ID) return;



  try {
    var ioservice = ENIG_C["@mozilla.org/network/io-service;1"].
    getService(ENIG_I.nsIIOService);
    var iUri = ioservice.newURI(hrefObj.href, null, null);

    EnigOpenUrlExternally(iUri);
    event.preventDefault();
    event.stopPropagation();
  } catch (ex) {}
}

function EnigGetHttpUri(aEvent) {

  function hRefForClickEvent(aEvent, aDontCheckInputElement) {
    var href;
    var isKeyCommand = (aEvent.type == "command");
    var target =
      isKeyCommand ? document.commandDispatcher.focusedElement : aEvent.target;

    if (target instanceof HTMLAnchorElement ||
      target instanceof HTMLAreaElement ||
      target instanceof HTMLLinkElement) {
      if (target.hasAttribute("href"))
        href = target.href;
    } else if (!aDontCheckInputElement && target instanceof HTMLInputElement) {
      if (target.form && target.form.action)
        href = target.form.action;
    } else {
      // we may be nested inside of a link node
      var linkNode = aEvent.originalTarget;
      while (linkNode && !(linkNode instanceof HTMLAnchorElement))
        linkNode = linkNode.parentNode;

      if (linkNode)
        href = linkNode.href;
    }

    return href;
  }

  // getHttpUri main function

  let href = hRefForClickEvent(aEvent);
  if (!href) return null;

  EnigmailLog.DEBUG("enigmailAbout.js: interpretHtmlClick: href='" + href + "'\n");

  var ioServ = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  var uri = ioServ.newURI(href, null, null);

  if (Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
    .getService(Components.interfaces.nsIExternalProtocolService)
    .isExposedProtocol(uri.scheme) &&
    (uri.schemeIs("http") || uri.schemeIs("https")))
    return uri;

  return null;
}

/**
 * Receive a GUI List and remove all entries
 *
 * @param  XML-DOM  (it will be changed!)
 */
function EnigCleanGuiList(guiList) {
  while (guiList.firstChild) {
    guiList.removeChild(guiList.firstChild);
  }
}

/**
 * create a new treecell element
 *
 * @param String label of the cell
 *
 * @return treecell node
 */
function createCell(label) {
  var cell = document.createXULElement("treecell");
  cell.setAttribute("label", label);
  return cell;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
