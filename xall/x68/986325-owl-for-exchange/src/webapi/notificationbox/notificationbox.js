var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

const kXULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const kBoxID = "owl-notification-box";

var {ExtensionError} = ExtensionUtils;
/// The extension callbacks to invoke when a notification's button is clicked.
var gButtonCallbacks = new Set();
/// The extension callbacks to invoke when a notification is dismissed.
var gClosedCallbacks = new Set();
/// A list of additional style sheet URIs to add to a notificationbox document.
var gStyleSheets = [];

/**
 * Add a style sheet to a document.
 *
 * @param aDoc {Document}
 * @param aURI {String}   The URI of the style sheet.
 */
function injectStyleSheet(aDoc, aURI) {
  let PI = aDoc.createProcessingInstruction("xml-stylesheet", "type=\"text/css\" href=\"" + aURI + "\"");
  aDoc.insertBefore(PI, aDoc.documentElement);
}

/**
 * Try to create a new notificationbox for a 3-pane window.
 */
function createNotificationBox(aDoc) {
  // Try to clone the existing notificationbox.
  // We can't create one from scratch because it won't have any XBL.
  let box = aDoc.getElementById("mail-notification-box");
  if (!box) {
    return null;
  }
  box = box.cloneNode(false);
  box.id = kBoxID;
  box.setAttribute("notificationside", "top");
  aDoc.documentElement.insertBefore(box, aDoc.getElementById("navigation-toolbox").nextElementSibling);
  for (let uri of gStyleSheets) {
    injectStyleSheet(aDoc, uri);
  }
  return box;
}

/**
 * Enumerate all the notificationboxes for the main 3-pane windows.
 *
 * @param aCreate {Boolean} Create boxes in those windows that don't have one
 * @returns {Array[<xul:notificationbox>]}
 */
function enumerateNotificationBoxes(aCreate) {
  let boxes = [];
  let enumerator = Services.wm.getEnumerator("mail:3pane");
  while (enumerator.hasMoreElements()) {
    let doc = enumerator.getNext().document;
    let box = doc.getElementById(kBoxID);
    if (!box && aCreate) {
      box = createNotificationBox(doc);
    }
    if (box) {
      boxes.push(box);
    }
  }
  return boxes;
}

/**
 * Generic callback function that it invoked by a notificationbox button event
 * and in turn calls the extension callbacks.
 *
 * @param aNotification {<xul:notificationbox>}
 * @param aButton       {Object}
 * @param aTarget       {<xul:button>}
 * @param aEvent        {Event}
 * @returns             {Boolean}
 */
async function ButtonCallback(aNotification, aButton, aTarget, aEvent)
{
  for (let fire of gButtonCallbacks) {
    try {
      await fire.async(aNotification.value, aButton.value);
    } catch (ex) {
      console.error(ex);
    }
  }
  return true; // do not close automatically
}

this.notificationbox = class extends ExtensionAPI {
  getAPI(context) {
    return {
      notificationbox: {
        addStyleSheet: function(aURI) {
          gStyleSheets.push(aURI);
          for (let notificationbox of enumerateNotificationBoxes(false)) {
            injectStyleSheet(notificationbox.ownerDocument, aURI);
          }
        },
        appendNotification: function(aLabel, aValue, aImage, aPriority, aButtons) {
          for (let notificationbox of enumerateNotificationBoxes(true)) {
            let notification = notificationbox.getNotificationWithValue(aValue);
            if (!notification) {
              let eventCallback = async event => {
                if (event == "dismissed") {
                  for (let fire of gClosedCallbacks) {
                    try {
                      await fire.async(aValue);
                    } catch (ex) {
                      console.error(ex);
                    }
                  }
                }
              };
              for (let button of aButtons) {
                button.callback = ButtonCallback;
              }
              notificationbox.appendNotification(aLabel, aValue, aImage, aPriority, aButtons, eventCallback);
            }
          }
        },
        removeNotification: function(aValue, aSkipAnimation) {
          for (let notificationbox of enumerateNotificationBoxes(false)) {
            let notification = notificationbox.getNotificationWithValue(aValue);
            if (notification) {
              notificationbox.removeNotification(notification);
            }
          }
        },
        onButton: new ExtensionCommon.EventManager(context, "notificationbox.onButton", fire => {
          gButtonCallbacks.add(fire);
          return () => gButtonCallbacks.delete(fire);
        }).api(),
        onClosed: new ExtensionCommon.EventManager(context, "notificationbox.onButton", fire => {
          gClosedCallbacks.add(fire);
          return () => gClosedCallbacks.delete(fire);
        }).api(),
      }
    };
  }
};