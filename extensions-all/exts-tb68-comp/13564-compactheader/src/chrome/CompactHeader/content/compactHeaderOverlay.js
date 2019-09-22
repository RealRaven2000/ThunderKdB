/*# -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Mozilla Communicator client code, released
# March 31, 1998.
#
# The Initial Developer of the Original Code is
# Netscape Communications Corporation.
# Portions created by the Initial Developer are Copyright (C) 1998-1999
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Joachim Herb <joachim.herb@gmx.de>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/

/* This is where functions related to displaying the headers for a selected message in the
   message pane live. */

////////////////////////////////////////////////////////////////////////////////////
// Warning: if you go to modify any of these JS routines please get a code review from
// scott@scott-macgregor.org. It's critical that the code in here for displaying
// the message headers for a selected message remain as fast as possible. In particular,
// right now, we only introduce one reflow per message. i.e. if you click on a message in the thread
// pane, we batch up all the changes for displaying the header pane (to, cc, attachements button, etc.)
// and we make a single pass to display them. It's critical that we maintain this one reflow per message
// view in the message header pane.
////////////////////////////////////////////////////////////////////////////////////


if (typeof org_mozdev_compactHeader == "undefined") {
  var org_mozdev_compactHeader = {};
};

org_mozdev_compactHeader.pane = function() {
  var pub = {};

  const COMPACTHEADER_EXTENSION_UUID = "{58D4392A-842E-11DE-B51A-C7B855D89593}";
  ChromeUtils.import("resource:///modules/MailServices.jsm");

//  var regex = {
//    /* taken from https://bugzilla.mozilla.org/show_bug.cgi?id=57104 */
//    links : /((\w+):\/\/[^<>()'"\s]+|www(\.[-\w]+){2,})/
//  };
//
  var gCoheCollapsedHeaderViewMode = false;
  var gCoheBuiltCollapsedView = false;

  /**
   * The collapsed view: very lightweight. We only show a couple of fields.  See
   * msgHdrViewOverlay.js for details of the field definition semantics.
   */
  var gCoheCollapsedHeader1LListLongAddresses = [
    {name:"subject", outputFunction:coheOutputSubject},
    {name:"from", useToggle:true, outputFunction:coheOutputEmailAddresses},
//    {name:"toCcBcc", useToggle:true, outputFunction:coheOutputEmailAddresses},
    {name:"date", outputFunction:coheUpdateDateValue}
    ];

  var gCoheCollapsedHeader2LListLongAddresses = [
    {name:"subject", outputFunction:coheOutputSubject},
    {name:"from", useToggle:true, outputFunction:coheOutputEmailAddresses},
    {name:"toCcBcc", useToggle:true, outputFunction:coheOutputEmailAddresses},
    {name:"date", outputFunction:coheUpdateDateValue}
    ];

  var prefserv = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch);

  var cohePrefBranch = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.CompactHeader.");

  var browserPreferences = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("browser.preferences.");

  var cohe={
    version: -1,
    firstrun: true,
    current: -1
  };

  var coheFirstTime = true;
  var headerFirstTime = true;

  var pressMores = null;
  var gMoreTooltip = "";

  function coheOutputSubject(headerEntry, headerValue) {
    var subjectBox;

    if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
      subjectBox = document.getElementById("CompactHeader_collapsed2LsubjectOutBox")
    } else {
      subjectBox = document.getElementById("CompactHeader_collapsed1LsubjectOutBox")
    }

//    if (subjectBox) {
//      subjectBox.setAttribute("tooltiptext", headerValue);
//    }
    updateHeaderValue(headerEntry, headerValue);
  }

  function coheOutputEmailAddresses(headerEntry, emailAddresses, addressType) {
    /* function copied from comm-1.9.1/ mail/ base/ content/ msgHdrViewOverlay.js 771135e6aaf5 */
    if (!emailAddresses)
      return;

    var addresses = {};
    var fullNames = {};
    var names = {};
    var numAddresses =  0;

    let moreButton = document.getElementById("CompactHeader_collapsed2LtoCcBccBox")
                             .getElementsByClassName("moreIndicator")[0];
    let moreTooltip = gMoreTooltip;

    numAddresses = MailServices.headerParser
                               .parseHeadersWithArray(emailAddresses, addresses,
                                                      names, fullNames);


    var index = 0;

    // we are called for to, cc, bcc addresses separately, so this will delete
    // the other entries! So we should not call it!
//    if (headerEntry.useToggle && (typeof headerEntry.enclosingBox.resetAddressView == 'function'))
//      headerEntry.enclosingBox.resetAddressView(); // make sure we start clean

    if (numAddresses == 0 && emailAddresses.includes(":")) {
      // No addresses and a colon, so an empty group like "undisclosed-recipients: ;".
      // Add group name so at least something displays.
      let address = { displayName: emailAddresses };
      if (headerEntry.useToggle)
        headerEntry.enclosingBox.addAddressView(address);
      else
        updateEmailAddressNode(headerEntry.enclosingBox.emailAddressNode, address);
    }

    while (index < numAddresses)
    {
      // if we want to include short/long toggle views and we have a long view, always add it.
      // if we aren't including a short/long view OR if we are and we haven't parsed enough
      // addresses to reach the cutoff valve yet then add it to the default (short) div.
      var address = {};
      address.emailAddress = addresses.value[index];
      address.fullAddress = fullNames.value[index];
      address.addressType = addressType;

      if (cohePrefBranch.getBoolPref("headersize.addressstyle")) {
        address.displayName = address.emailAddress;
        address.fullAddress = address.emailAddress;
      } else {
        address.displayName = names.value[index];
      }

      org_mozdev_compactHeader.debug.log("0 index: " + index);
      org_mozdev_compactHeader.debug.log("0: " + address.fullAddress);
      org_mozdev_compactHeader.debug.log("0 type: " + addressType);

      if (address.fullAddress != "" &&
           (addressType == "to" || addressType == "cc" || addressType == "bcc")) {
        if (moreTooltip == "") {
          moreTooltip = address.fullAddress;
          org_mozdev_compactHeader.debug.log("1 first in list: " + address.fullAddress);
        } else {
          moreTooltip = moreTooltip + ", " + address.fullAddress;
          org_mozdev_compactHeader.debug.log("2 add to list: " + address.fullAddress);
        }
      }
//      window.alert(address);
      if (headerEntry.useToggle && (typeof headerEntry.enclosingBox.addAddressView == 'function')) {
        org_mozdev_compactHeader.debug.log("call addAddressView");
        headerEntry.enclosingBox.addAddressView(address);
        org_mozdev_compactHeader.debug.log("headerEntry: " + headerEntry);
        org_mozdev_compactHeader.debug.log("enclosingBox: " + headerEntry.enclosingBox);
        let emailAddressNode = document.getAnonymousElementByAttribute(
            headerEntry.enclosingBox, 'anonid', 'emailAddressNode'
          );
//        emailAddressNode.setAttribute("addressType", addressType);
      } else {
        try {
          org_mozdev_compactHeader.debug.log("call updateEmailAddressNode");
          updateEmailAddressNode(headerEntry.enclosingBox.emailAddressNode, address);
          headerEntry.enclosingBox.emailAddressNode.setAttribute("addressType", addressType);
        }
        catch(e) {
          org_mozdev_compactHeader.debug.log("got execption " + e +
            " from updateEmailAddressNode");
        }
      }
      index++;
    }
    org_mozdev_compactHeader.debug.log("tooltiptext: " + moreTooltip);
    org_mozdev_compactHeader.debug.log("moreButton: " + moreButton);
    if (moreButton) {
      moreButton.setAttribute("tooltiptext", moreTooltip);
    }
    gMoreTooltip = moreTooltip;

    if (headerEntry.useToggle && (typeof headerEntry.enclosingBox.buildViews == 'function'))
      headerEntry.enclosingBox.buildViews();
    //OutputEmailAddresses(headerEntry, emailAddresses);
  }

  // Now, for each view the message pane can generate, we need a global table
  // of headerEntries. These header entry objects are generated dynamically
  // based on the static data in the header lists (see above) and elements
  // we find in the DOM based on properties in the header lists.
  var gCoheCollapsedHeaderView = {};

  function coheInitializeHeaderViewTables()
  {
    org_mozdev_compactHeader.debug.log("coheInitializeHeaderViewTables start");
    gCoheCollapsedHeaderView = {};
    var index;

    if (prefserv.getBoolPref("extensions.CompactHeader.headersize.twolineview")) {
      for (index = 0; index < gCoheCollapsedHeader2LListLongAddresses.length; index++) {
        gCoheCollapsedHeaderView[gCoheCollapsedHeader2LListLongAddresses[index].name] =
          new createHeaderEntry('CompactHeader_collapsed2L', gCoheCollapsedHeader2LListLongAddresses[index]);
      }
      let moreButton = document.getElementById("CompactHeader_collapsed2LtoCcBccBox")
                               .getElementsByClassName("moreIndicator")[0];

      if (moreButton) {
        org_mozdev_compactHeader.debug.log("add togglewrap 1");
        let oldToggleWrap = moreButton.parentNode.toggleWrap;
        org_mozdev_compactHeader.debug.log("add togglewrap 2: " + oldToggleWrap);
        moreButton.parentNode.toggleWrap = function() {
          org_mozdev_compactHeader.debug.log("toggleWrap start");
          pressMores = pressMoreButtons;
          org_mozdev_compactHeader.debug.log("toggleWrap 1");

          let deck = document.getElementById('msgHeaderViewDeck');
          // Work around a xul deck bug where the height of the deck is determined
          // by the tallest panel in the deck even if that panel is not selected...

          org_mozdev_compactHeader.debug.log("togglewrap old panel: " +
              deck.selectedPanel.id);
          org_mozdev_compactHeader.debug.log("togglewrap old panel collapsed: " +
              deck.selectedPanel.collapsed);

          pub.coheToggleHeaderView();
          org_mozdev_compactHeader.debug.log("toggleWrap stop");
        };
        org_mozdev_compactHeader.debug.log("add togglewrap 3");
        if (moreButton.hasAttribute("onclick")) {
          org_mozdev_compactHeader.debug.log(
              "add togglewrap: existing onclick" +
              moreButton.getAttribute("onclick"));
        }
        else {
          org_mozdev_compactHeader.debug.log("add togglewrap: no existing onclick");
        }
        moreButton.setAttribute("onclick", "this.parentNode.toggleWrap()");
        org_mozdev_compactHeader.debug.log("add togglewrap 4");
      }
    } else {
      for (index = 0; index < gCoheCollapsedHeader1LListLongAddresses.length; index++) {
        gCoheCollapsedHeaderView[gCoheCollapsedHeader1LListLongAddresses[index].name] =
          new createHeaderEntry('CompactHeader_collapsed1L', gCoheCollapsedHeader1LListLongAddresses[index]);
      }
    }

    org_mozdev_compactHeader.debug.log("call to org_mozdev_compactHeader.RSSLinkify.InitializeHeaderViewTables");
    org_mozdev_compactHeader.RSSLinkify.InitializeHeaderViewTables();

    org_mozdev_compactHeader.debug.log("coheInitializeHeaderViewTables stop");
  }

  function pressMoreButtons() {
    let moreButtonTo = document.getElementById("expandedtoBox")
                               .getElementsByClassName("moreIndicator")[0];

    let moreButtonCC = document.getElementById("expandedccBox")
                               .getElementsByClassName("moreIndicator")[0];

    let moreButtonBCC = document.getElementById("expandedbccBox")
                                .getElementsByClassName("moreIndicator")[0];

    if (!moreButtonTo.hasAttribute("collapsed")) {
      moreButtonTo.click();
      org_mozdev_compactHeader.debug.log("toggle To");
    }
    if (!moreButtonCC.hasAttribute("collapsed")) {
      moreButtonCC.click();
      org_mozdev_compactHeader.debug.log("toggle cc");
    }
    if (!moreButtonBCC.hasAttribute("collapsed")) {
      moreButtonBCC.click();
      org_mozdev_compactHeader.debug.log("toggle bcc");
    }
    pressMores = null;
  }

  function getCollapseState() {
    org_mozdev_compactHeader.debug.log("getCollapseState start");

    var deckHeaderView = document.getElementById("msgHeaderViewDeck");

    let collapseState =
      deckHeaderView.selectedPanel ==
        document.getElementById('CompactHeader_collapsedHeaderView');

    let collapseStatePrefs = cohePrefBranch.getBoolPref(
          document.documentElement.getAttribute("windowtype") +
          "collapseState");

    collapseState = collapseState || collapseStatePrefs;

    org_mozdev_compactHeader.debug.log("getCollapseState: " +
        collapseState);

    setCollapseState(collapseState);
    org_mozdev_compactHeader.debug.log("getCollapseState stop");

    return collapseState;
  }

  function setCollapseState(collapseState) {
    org_mozdev_compactHeader.debug.log("setCollapseState start");

    cohePrefBranch.setBoolPref(
        document.documentElement.getAttribute("windowtype") +
        "collapseState", collapseState);

    org_mozdev_compactHeader.debug.log("setCollapseState: " +
        collapseState);

    org_mozdev_compactHeader.debug.log("setCollapseState stop");
  }

  function selectMsgHeaderPanePanel() {
    org_mozdev_compactHeader.debug.log("selectMsgHeaderPanePanel start");
    let deck = document.getElementById('msgHeaderViewDeck');
    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...

    let wantedselectedPanel;

    if (gCoheCollapsedHeaderViewMode) {
      wantedselectedPanel = document.getElementById("CompactHeader_collapsedHeaderView")
    } else {
      wantedselectedPanel = document.getElementById("expandedHeaderView");
    }

    if (wantedselectedPanel == deck.selectedPanel) {
      org_mozdev_compactHeader.debug.log("selectMsgHeaderPanePanel no need to change, stop");
      return;
    }


    deck.selectedPanel.collapsed = true;
    deck.selectedPanel = wantedselectedPanel;

    org_mozdev_compactHeader.debug.log("selectMsgHeaderPanePanel gCoheCollapsedHeaderViewMode: " +
        gCoheCollapsedHeaderViewMode);

    org_mozdev_compactHeader.debug.log("selectMsgHeaderPanePanel selectedPanel: " +
        deck.selectedPanel.id);

    org_mozdev_compactHeader.debug.log("selectMsgHeaderPanePanel 1");

    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...
    deck.selectedPanel.collapsed = false;
    //syncGridColumnWidths();
    org_mozdev_compactHeader.debug.log("selectMsgHeaderPanePanel stop");
  }

  pub.coheOnLoadMsgHeaderPane = function() {
    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane start");

    coheInitializeHeaderViewTables();

    // Add an address book listener so we can update the header view when things
    // change.
    Components.classes["@mozilla.org/abmanager;1"]
              .getService(Components.interfaces.nsIAbManager)
              .addAddressBookListener(coheAddressBookListener,
                                      Components.interfaces.nsIAbListener.all);

    var deckHeaderView = document.getElementById("msgHeaderViewDeck");

    selectMsgHeaderPanePanel();

    org_mozdev_compactHeader.debug.log("coheFirstTime window type: " +
        document.documentElement.getAttribute("windowtype"));


    gCoheCollapsedHeaderViewMode = getCollapseState();

    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane 1");

    // work around XUL deck bug where collapsed header view, if it's the persisted
    // default, wouldn't be sized properly because of the larger expanded
    // view "stretches" the deck.
    if (gCoheCollapsedHeaderViewMode)
      document.getElementById('expandedHeaderView').collapsed = true;
    else
      document.getElementById('CompactHeader_collapsedHeaderView').collapsed = true;

    if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
      document.getElementById('CompactHeader_collapsed1LHeadersBox').collapsed = true;
      document.getElementById('CompactHeader_collapsed2LHeadersBox').collapsed = false;
    } else {
      document.getElementById('CompactHeader_collapsed1LHeadersBox').collapsed = false;
      document.getElementById('CompactHeader_collapsed2LHeadersBox').collapsed = true;
    }

    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane 2");

    org_mozdev_compactHeader.messenger.loadToolboxData();
    org_mozdev_compactHeader.toolbar.fillToolboxPalette();
    org_mozdev_compactHeader.messenger.saveToolboxData();

    if (coheFirstTime)
    {
      org_mozdev_compactHeader.debug.log("coheFirstTime start");
      coheFirstTime = false;
      gMessageListeners.push(coheMessageListener);
//      org_mozdev_compactHeader.messenger.loadToolboxData();
//      org_mozdev_compactHeader.toolbar.fillToolboxPalette();
//      org_mozdev_compactHeader.messenger.saveToolboxData();

      org_mozdev_compactHeader.debug.log("coheFirstTime 1");

      let collapsed2LtoCcBccBox = document.getElementById("CompactHeader_collapsed2LtoCcBccBox");
      if (collapsed2LtoCcBccBox) {
        org_mozdev_compactHeader.debug.log("overwrite collapsed2LtoCcBccBox._updateEmailAddressNode");
        let updateEmailAddressNodeFunction = collapsed2LtoCcBccBox._updateEmailAddressNode;
        org_mozdev_compactHeader.debug.log("overwrite collapsed2LtoCcBccBox.updateEmailAddressNode: "
            + updateEmailAddressNodeFunction);

        collapsed2LtoCcBccBox._updateEmailAddressNode = function(aEmailNode, aAddress) {
          org_mozdev_compactHeader.debug.log("collapsed2LtoCcBccBox.updateEmailAddressNode start");
          try {
            updateEmailAddressNodeFunction(aEmailNode, aAddress);
          }
          catch(e) {
            org_mozdev_compactHeader.debug.log("got execption " + e +
              " from updateEmailAddressNode");
          }
          org_mozdev_compactHeader.debug.log("collapsed2LtoCcBccBox.updateEmailAddressNode type:" +
              aAddress.addressType);
          aEmailNode.setAttribute("addressType", aAddress.addressType);
          org_mozdev_compactHeader.debug.log("collapsed2LtoCcBccBox.updateEmailAddressNode start");
        };

        if (typeof collapsed2LtoCcBccBox.setNMoreTooltiptext == 'function') {
          // remove setNMoreTooltiptext because we have our own function
          collapsed2LtoCcBccBox.setNMoreTooltiptext = function() {
            let moreButton = document.getElementById("CompactHeader_collapsed2LtoCcBccBox")
                                     .getElementsByClassName("moreIndicator")[0];
            if (moreButton) {
              moreButton.setAttribute("tooltiptext", gMoreTooltip);
            }
          };
        }
      }
      org_mozdev_compactHeader.debug.log("coheFirstTime stop");
    }

    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane 2a");

    if (cohe.firstrun) {
      coheCheckFirstRun();
    }

    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane 3");

    org_mozdev_compactHeader.toolbar.setButtonStyle();
    org_mozdev_compactHeader.messenger.saveToolboxData();
    org_mozdev_compactHeader.toolbar.dispMUACheck();

    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane 4");

    coheToggleHeaderContent();

    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane 5");

    // Make sure the correct panel is selected


    org_mozdev_compactHeader.debug.log("coheOnLoadMsgHeaderPane stop");
  }

  var coheMessageListener =
  {
    onStartHeaders:
    function cML_onStartHeaders () {
      org_mozdev_compactHeader.debug.log("cML_onStartHeaders start");
      selectMsgHeaderPanePanel();
      gCoheBuiltCollapsedView = false;
      org_mozdev_compactHeader.debug.log("cML_onStartHeaders stop");
    },

    onEndHeaders:
    function cML_onEndHeaders() {
      org_mozdev_compactHeader.debug.log("cML_onEndHeaders start");
      ClearHeaderView(gCoheCollapsedHeaderView);
      coheUpdateMessageHeaders();
      if (pressMores) {
        pressMoreButtons();
        pressMore = null;
      }
      org_mozdev_compactHeader.debug.log("cML_onEndHeaders stop");
    },

    onEndAttachments: function cML_onEndAttachments(){}
  };

  pub.coheOnUnloadMsgHeaderPane = function()
  {
    org_mozdev_compactHeader.debug.log("coheOnUnloadMsgHeaderPane start");

    Components.classes["@mozilla.org/abmanager;1"]
              .getService(Components.interfaces.nsIAbManager)
              .removeAddressBookListener(coheAddressBookListener);

    removeEventListener('messagepane-loaded',
      pub.coheOnLoadMsgHeaderPane, true);
    removeEventListener('messagepane-unloaded',
      pub.coheOnUnloadMsgHeaderPane, true);
    org_mozdev_compactHeader.debug.log("coheOnUnloadMsgHeaderPane stop");
  }

  var coheAddressBookListener =
  {
    onItemAdded: function(aParentDir, aItem) {
      coheOnAddressBookDataChanged(nsIAbListener.itemAdded,
                               aParentDir, aItem);
    },
    onItemRemoved: function(aParentDir, aItem) {
      coheOnAddressBookDataChanged(aItem instanceof nsIAbCard ?
                               nsIAbListener.directoryItemRemoved :
                               nsIAbListener.directoryRemoved,
                               aParentDir, aItem);
    },

    onItemPropertyChanged: function(aItem, aProperty, aOldValue, aNewValue) {
      // We only need updates for card changes, address book and mailing list
      // ones don't affect us here.
      if (aItem instanceof Components.interfaces.nsIAbCard)
        coheOnAddressBookDataChanged(nsIAbListener.itemChanged, null, aItem);
    }
  }

  function coheOnAddressBookDataChanged(aAction, aParentDir, aItem) {
    gEmailAddressHeaderNames.forEach(function (headerName) {
        var headerEntry = null;

        if (headerName in gCoheCollapsedHeaderView) {
          headerEntry = gCoheCollapsedHeaderView[headerName];
          if (headerEntry)
            headerEntry.enclosingBox.updateExtraAddressProcessing(aAction,
                                                                  aParentDir,
                                                                  aItem);
        }
      });
  }

  // make sure the appropriate fields within the currently displayed view header mode
  // are collapsed or visible...
  function coheUpdateHeaderView()
  {
    if (gCoheCollapsedHeaderViewMode)
      showHeaderView(gCoheCollapsedHeaderView);

    org_mozdev_compactHeader.RSSLinkify.UpdateHeaderView(currentHeaderData);

    if (cohePrefBranch.getBoolPref("headersize.addressstyle")) {
      selectEmailDisplayed();
    }

//    org_mozdev_compactHeader.messenger.loadToolboxData();
//    org_mozdev_compactHeader.toolbar.fillToolboxPalette();
//    org_mozdev_compactHeader.messenger.saveToolboxData();

    coheToggleHeaderContent();
    org_mozdev_compactHeader.toolbar.CHTUpdateReplyButton();
    org_mozdev_compactHeader.toolbar.CHTUpdateJunkButton();
    org_mozdev_compactHeader.buttons.coheToggleStar();
  }

  function enableButtons() {
    var hdrToolbar = document.getElementById("header-view-toolbar");
    if (hdrToolbar) {
      var buttons = hdrToolbar.querySelectorAll("[disabled*='true']");
      for (var i=0; i<buttons.length; i++) {
        buttons[i].removeAttribute("disabled");
      }
    }
  }

  pub.coheToggleHeaderView = function() {
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView start");
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView old view mode: " +
        gCoheCollapsedHeaderViewMode);
    gCoheCollapsedHeaderViewMode = !gCoheCollapsedHeaderViewMode;
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView new view mode: " +
        gCoheCollapsedHeaderViewMode);
    setCollapseState(gCoheCollapsedHeaderViewMode);

    let deck = document.getElementById('msgHeaderViewDeck');
    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...

    let oldSelectedPanel = deck.selectedPanel;

    org_mozdev_compactHeader.debug.log("coheToggleHeaderView old panel: " +
        deck.selectedPanel.id);
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView old panel collapsed: " +
        deck.selectedPanel.collapsed);

    deck.selectedPanel.collapsed = true;
    let otherPanel;

    if (gCoheCollapsedHeaderViewMode) {
      deck.selectedPanel = document.getElementById("CompactHeader_collapsedHeaderView")
      otherPanel = document.getElementById("expandedHeaderView");
      gDBView.reloadMessage();
      //coheUpdateMessageHeaders();
    } else {
      deck.selectedPanel = document.getElementById("expandedHeaderView");
      otherPanel = document.getElementById("CompactHeader_collapsedHeaderView")
      //ClearHeaderView(gExpandedHeaderView);
      gDBView.reloadMessage();
      //UpdateExpandedMessageHeaders();
    }

    // make sure, the other panel is really collapsed
    otherPanel.collapsed = true;

    org_mozdev_compactHeader.debug.log("coheToggleHeaderView old panel: " +
        oldSelectedPanel.id);
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView old panel collapsed: " +
        oldSelectedPanel.collapsed);
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView other panel: " +
        otherPanel.id);
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView other panel collapsed: " +
        otherPanel.collapsed);

    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...
    deck.selectedPanel.collapsed = false;

    org_mozdev_compactHeader.debug.log("coheToggleHeaderView new panel: " +
        deck.selectedPanel.id);
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView new panel collapsed: " +
        deck.selectedPanel.collapsed);

    syncGridColumnWidths();

    coheToggleHeaderContent();
    org_mozdev_compactHeader.debug.log("coheToggleHeaderView stop");
  }

  function coheToggleHeaderContent() {
    org_mozdev_compactHeader.debug.log("coheToggleHeaderContent start");
    var strHideLabel = document.getElementById("CompactHeader_CoheHideDetailsLabel").value;
    var strShowLabel = document.getElementById("CompactHeader_CoheShowDetailsLabel").value;
    var strLabel;

    var smimeBox = document.getElementById("smimeBox");

    if (smimeBox != null) {
      if (gCoheCollapsedHeaderViewMode) {
        var parent = document.getElementById("CompactHeader_collapsed2LdateOutBox");
        var refElement = document.getElementById("CompactHeader_collapsed2LdateRow");
        if (parent != null && refElement != null) {
          parent.insertBefore(smimeBox, refElement);
        }
      }
      else {
        var parent = document.getElementById("dateValueBox");
        var refElement = document.getElementById("dateLabel");
        if (parent != null && refElement != null) {
          parent.insertBefore(smimeBox, refElement);
        }
      }
    }


    var dispMUABox = document.getElementById("dispMUA");

    if (dispMUABox != null) {
      if (gCoheCollapsedHeaderViewMode) {
        var parent = document.getElementById("CompactHeader_collapsed2LdateOutBox");
        var refElement = document.getElementById("CompactHeader_collapsed2LdateRow");
        if (parent != null && refElement != null) {
          parent.insertBefore(dispMUABox, refElement);
        }
      }
      else {
        var parent = document.getElementById("dateValueBox");
        var refElement = document.getElementById("dateLabel");
        if (parent != null && refElement != null) {
          parent.insertBefore(dispMUABox, refElement);
        }
      }
    }

    var enigmailBox = document.getElementById("enigmailBox");

    if (enigmailBox != null) {
      if (gCoheCollapsedHeaderViewMode) {
        if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
          var parent = document.getElementById("CompactHeader_collapsed2LHeadersBox");
          var refElement = document.getElementById("CompactHeader_collapsed2LHeaderViewFirstLine");
          if (parent != null && refElement != null) {
            parent.insertBefore(enigmailBox, refElement);
          }
        } else {
          var parent = document.getElementById("CompactHeader_collapsed1LHeadersBox");
          var refElement = document.getElementById("CompactHeader_collapsed1LHeaderViewFirstLine");
          if (parent != null && refElement != null) {
            parent.insertBefore(enigmailBox, refElement);
          }
        }
      }
      else {
        var parent = document.getElementById("expandedHeadersBox");
        var refElement = document.getElementById("expandedHeadersTopBox");
        if (parent != null && refElement != null) {
          parent.insertBefore(enigmailBox, refElement);
        }
      }
    }

    org_mozdev_compactHeader.messenger.loadToolboxData();

    if (gCoheCollapsedHeaderViewMode) {
      strLabel = strShowLabel;
    } else {
      strLabel = strHideLabel;
    }
    if (document.getElementById("CompactHeader_hideDetailsMenu")) {
      document.getElementById("CompactHeader_hideDetailsMenu").setAttribute("label", strLabel);
    }

    org_mozdev_compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);

    if (document.getElementById("CompactHeader_hideDetailsMenu")) {
      document.getElementById("CompactHeader_hideDetailsMenu").setAttribute("label", strLabel);
    }

    document.getElementById("CompactHeader_viewMenuCompactBroadcast")
            .setAttribute("checked", gCoheCollapsedHeaderViewMode);

    org_mozdev_compactHeader.debug.log("coheToggleHeaderContent stop");
  }

  // default method for updating a header value into a header entry
  function coheUpdateHeaderValueInTextNode(headerEntry, headerValue)
  {
    headerEntry.textNode.value = headerValue;
  }

  function coheUpdateDateValue(headerEntry, headerValue, dummy, currentHeaderData) {
    //var t = currentHeaderData.date.headerValue;
    var d1, d2;
    d1 = document.getElementById("CompactHeader_collapsed1LdateBox");
    d2 = document.getElementById("CompactHeader_collapsed2LdateBox");
    if ("x-mozilla-localizeddate" in currentHeaderData) {
      d1.textContent = currentHeaderData["x-mozilla-localizeddate"].headerValue;
      d2.textContent = currentHeaderData["x-mozilla-localizeddate"].headerValue;
    } else {
      d1.textContent = headerValue;
      d2.textContent = headerValue;
    }
  }


  // coheUpdateMessageHeaders: Iterate through all the current header data we received from mime for this message
  // for each header entry table, see if we have a corresponding entry for that header. i.e. does the particular
  // view care about this header value. if it does then call updateHeaderEntry
  function coheUpdateMessageHeaders()
  {
    org_mozdev_compactHeader.debug.log("coheUpdateMessageHeaders start");
    // Remove the height attr so that it redraws correctly. Works around a
    // problem that attachment-splitter causes if it's moved high enough to
    // affect the header box:
    document.getElementById('msgHeaderView').removeAttribute('height');

    let moreButton = document.getElementById("CompactHeader_collapsed2LtoCcBccBox")
                             .getElementsByClassName("moreIndicator")[0];

    if (moreButton) {
      moreButton.setAttribute("tooltiptext", "");
    }
    gMoreTooltip = "";

    // iterate over each header we received and see if we have a matching entry
    // in each header view table...
    var keys = [];
    for (var key in currentHeaderData) {
      if (currentHeaderData.hasOwnProperty(key)) {
        keys.push(key);
      }
    }

    keys.sort();
    keys.reverse();
    for (let i=0; i<keys.length; i++)
    {
      let headerName = keys[i];
      var headerField = currentHeaderData[headerName];
      var headerEntry = null;

      if (gCoheCollapsedHeaderViewMode && !gCoheBuiltCollapsedView)
      {
        if (headerName == "cc" || headerName == "to" || headerName == "bcc")
          headerEntry = gCoheCollapsedHeaderView["toCcBcc"];
        else if (headerName in gCoheCollapsedHeaderView)
          headerEntry = gCoheCollapsedHeaderView[headerName];
      }

      if (headerEntry) {
        headerEntry.outputFunction(headerEntry, headerField.headerValue, headerName, currentHeaderData);
        headerEntry.valid = true;
      }
    }

    if (headerFirstTime) {
      org_mozdev_compactHeader.debug.log("headerFirstTime");
      headerFirstTime = false;
      var toolbox = document.getElementById("header-view-toolbox");
      var mailToolbox = document.getElementById("mail-toolbox");
      mailToolbox.myFunction = function() {
        return;
      }
      var oldCustomizeDone = toolbox.customizeDone;
      var oldCustomizeDoneMailToolbox = mailToolbox.customizeDone;
      toolbox.customizeDone = function(aEvent) {
        org_mozdev_compactHeader.debug.log("customizeDone start");
        oldCustomizeDone(aEvent);
        org_mozdev_compactHeader.debug.log("customizeDone 0");
        org_mozdev_compactHeader.toolbar.onDoCustomizationHeaderViewToolbox("doCustomization");
        org_mozdev_compactHeader.debug.log("customizeDone stop");
      };
      mailToolbox.customizeDone = function(aEvent) {
        org_mozdev_compactHeader.debug.log("customizeDone start");
        oldCustomizeDoneMailToolbox(aEvent);
        org_mozdev_compactHeader.debug.log("customizeDone 0");
        org_mozdev_compactHeader.toolbar.onDoCustomizationHeaderViewToolbox("doCustomization");
        org_mozdev_compactHeader.debug.log("customizeDone stop");
      };
    }

    if (gCoheCollapsedHeaderViewMode)
     gCoheBuiltCollapsedView = true;

    // now update the view to make sure the right elements are visible
    coheUpdateHeaderView();
    org_mozdev_compactHeader.debug.log("coheUpdateMessageHeaders stop");
  }

  function selectEmailDisplayed() {
    var xulemail = document.getElementById("CompactHeader_collapsedtoCcBccBox");
    if (xulemail != null) {
      var nextbox = document.getAnonymousElementByAttribute(xulemail, "anonid", "longEmailAddresses");
      if (nextbox != null) {
        var xuldesc = document.getAnonymousElementByAttribute(xulemail, "containsEmail", "true");
        if (xuldesc != null) {
          var children = xuldesc.children;
          for (var i=0; i<children.length; i++) {
            if (children[i].localName == "mail-emailaddress") {
              var rawAddress = children[i].getAttribute("emailAddress");
              if (rawAddress) {
                children[i].setAttribute("label", rawAddress);
              }
            }
          }
        }
      }
    }
    var xulemail = document.getElementById("CompactHeader_collapsedfromBox");
    if (xulemail != null) {
      var nextbox = document.getAnonymousElementByAttribute(xulemail, "anonid", "longEmailAddresses");
      if (nextbox != null) {
        var xuldesc = document.getAnonymousElementByAttribute(xulemail, "containsEmail", "true");
        if (xuldesc != null) {
          var children = xuldesc.children;
          for (var i=0; i<children.length; i++) {
            if (children[i].localName == "mail-emailaddress") {
              var rawAddress = children[i].getAttribute("emailAddress");
              if (rawAddress) {
                children[i].setAttribute("label", rawAddress);
              }
            }
          }
        }
      }
    }
  };

  var myPrefObserver =
  {
    register: function()
    {
      org_mozdev_compactHeader.debug.log("prefObserver registration start");

      // First we'll need the preference services to look for preferences.
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);

      // For this._branch we ask that the preferences for extensions.myextension. and children
      this._branch = prefService.getBranch("extensions.CompactHeader.");

      // Now we queue the interface called nsIPrefBranch. This interface is described as:
      // "nsIPrefBranch2 allows clients to observe changes to pref values."
      this._branch.QueryInterface(Components.interfaces.nsIPrefBranch);

      // Finally add the observer.
      this._branch.addObserver("", this, false);
      org_mozdev_compactHeader.debug.log("prefObserver registration stop");
    },

    unregister: function()
    {
      if(!this._branch) return;
      this._branch.removeObserver("", this);
    },

    observe: function(aSubject, aTopic, aData)
    {
      org_mozdev_compactHeader.debug.log("prefObserver start");
      if(aTopic != "nsPref:changed") return;
      // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
      // aData is the name of the pref that's been changed (relative to aSubject)
      org_mozdev_compactHeader.debug.log("prefObserver 1: " + aData);

      if (  (aData == "headersize.addressstyle")
          ||(aData == "headersize.twolineview")
          ||(aData == "headersize.linkify")
          ||(aData == "toolbox.position")
          ) {
        preferencesUpdate();
      } else if (aData == "header.doubleclick") {
        setDblClickHeaderEventHandler();
      }

      org_mozdev_compactHeader.debug.log("prefObserver stop");
    }
  };

  var wasHere = false;

  function preferencesUpdate() {
    org_mozdev_compactHeader.debug.log("preferencesUpdate " + wasHere);
    if (!browserPreferences.getBoolPref("instantApply")
        && wasHere)
      return;
    org_mozdev_compactHeader.debug.log("preferencesUpdate 2");
    wasHere = true;
    if ((typeof gDBView  != "undefined") && gDBView) {
      gDBView.reloadMessage();
      pub.coheOnLoadMsgHeaderPane();
    }
    org_mozdev_compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);
//    var event = document.createEvent('Events');
//    event.initEvent('messagepane-loaded', false, true);
//    var headerViewElement = document.getElementById("msgHeaderView");
//    headerViewElement.dispatchEvent(event);
    setTimeout(function() {
        clearReloadTimeout();
        return;
      }, 250);
    org_mozdev_compactHeader.debug.log("preferencesUpdate stop");
  }

  function clearReloadTimeout() {
    wasHere = false;
    org_mozdev_compactHeader.debug.log("wasHere cleared");
  }

  function coheCheckFirstRun() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                     .getService(Components.interfaces.nsIXULAppInfo);
    org_mozdev_compactHeader.debug.log("coheCheckFirstRun start");
    org_mozdev_compactHeader.debug.log("coheCheckFirstRun 0");
    var debugLevel = org_mozdev_compactHeader.debug.getLogLevel();
    org_mozdev_compactHeader.debug.log("coheCheckFirstRun 1");
    org_mozdev_compactHeader.toolbar.populateEmptyToolbar();
    org_mozdev_compactHeader.debug.log("coheCheckFirstRun 1a");
    ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID(COMPACTHEADER_EXTENSION_UUID,
      function(myAddon) {
        org_mozdev_compactHeader.debug.log("coheCheckFirstRun 2");
        cohe.version = "";
        cohe.firstrun = false;
        cohe.current = myAddon.version;
        try{
          cohe.version = cohePrefBranch.getCharPref("version");
          cohe.firstrun = cohePrefBranch.getBoolPref("firstrun");
        } catch(e) {
        } finally {
          //check for first run
          if (cohe.firstrun){
            org_mozdev_compactHeader.debug.log("first run 2c");
            org_mozdev_compactHeader.toolbar.CHTSetDefaultButtons();
            cohePrefBranch.setBoolPref("firstrun",false);
            cohePrefBranch.setCharPref("version",cohe.current);
            org_mozdev_compactHeader.debug.log("first run 2cc");
          }
          //check for upgrade
          if (cohe.version!=cohe.current && !cohe.firstrun){
            cohePrefBranch.setCharPref("version",cohe.current);
            org_mozdev_compactHeader.debug.log("found version change");
            // XXX
          }
          cohe.firstrun = false;
          org_mozdev_compactHeader.debug.log("first run 2d");
        }
      }
    );
    org_mozdev_compactHeader.debug.log("coheCheckFirstRun stop");
  }


  pub.coheInitializeOverlay = function() {
    removeEventListener('load', org_mozdev_compactHeader.pane.coheInitializeOverlay, false);
    org_mozdev_compactHeader.debug.log("before register");
    coheUninstallObserver.register();
    org_mozdev_compactHeader.debug.log("register PrefObserver");
    myPrefObserver.register();
    org_mozdev_compactHeader.debug.log("after ");
    if ((typeof MessageDisplayWidget != "undefined") && MessageDisplayWidget) {
      org_mozdev_compactHeader.debug.log("coheInitializeOverlay found MessageDisplayWidget");
      var oldUpdateActiveMessagePane = MessageDisplayWidget.prototype._updateActiveMessagePane;
      MessageDisplayWidget.prototype._updateActiveMessagePane = function() {
        org_mozdev_compactHeader.debug.log("_updateActiveMessagePane start");
        oldUpdateActiveMessagePane.call(this);
        org_mozdev_compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);
        org_mozdev_compactHeader.debug.log("_updateActiveMessagePane stop");
      };
    }
    else {
      org_mozdev_compactHeader.debug.log("coheInitializeOverlay didn't find MessageDisplayWidget");
    }

    var multiMessage = document.getElementById("multimessage");
    if (multiMessage) {
      org_mozdev_compactHeader.debug.log("multiMessage " + multiMessage);
      multiMessage.addEventListener("DOMContentLoaded", multiMessageLoaded, true);
    }

    addMessagePaneBoxFocusHandler();
    setDblClickHeaderEventHandler();

//    var deckHeaderView = document.getElementById("msgHeaderViewDeck");
//
//    org_mozdev_compactHeader.debug.log("coheInitializeOverlay deckHeaderView: " +
//      deckHeaderView.selectedPanel.id);
//
    selectMsgHeaderPanePanel();
    org_mozdev_compactHeader.debug.log("coheInitializeOverlay stop");
  };

  function addMessagePaneBoxFocusHandler() {
    let messagepanebox = document.getElementById("messagepanebox");
    if (messagepanebox) {
      messagepanebox.addEventListener("focus", messagePaneBoxFocus, true);
      messagepanebox.addEventListener("blur", messagePaneBoxBlur, true);
    }
  }

  var msgHeaderViewBackground;

  function messagePaneBoxFocus(event) {
    org_mozdev_compactHeader.debug.log("messagePaneBoxFocus start");
    let msgHeaderView = document.getElementById("msgHeaderView");
    let wintype = document.documentElement.getAttribute("windowtype");
//    let tabmail = document.getElementById("tabmail");
    if (cohePrefBranch.getBoolPref("header.darkenonfocus") &&
        msgHeaderView && wintype && wintype == "mail:3pane" ) {
//          && tabmail && tabmail.tabContainer.selectedIndex == 0) {
      org_mozdev_compactHeader.debug.log("background: " +
          msgHeaderViewBackground);
      if (typeof msgHeaderViewBackground === "undefined") {
        var style =
          document.defaultView.getComputedStyle(msgHeaderView, null);
        msgHeaderViewBackground = style.getPropertyValue("background-color");
      }
      org_mozdev_compactHeader.debug.log("style: " + style);
      org_mozdev_compactHeader.debug.log("background: " +
        msgHeaderViewBackground);
      let newColor = darkenColor(msgHeaderViewBackground);
      msgHeaderView.style.backgroundColor = newColor;
      //       msgHeaderView.setAttribute('style', 'background-color:darkblue;');
    }
    org_mozdev_compactHeader.debug.log("messagePaneBoxFocus stop");
  }

  function darkenColor(color) {
    if (color === "transparent") {
      return color;
    }

    var digits = /(.*?)rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)/.exec(color);

    var red = parseInt(digits[2]);
    var green = parseInt(digits[3]);
    var blue = parseInt(digits[4]);

    let factor = 0.9;

    red = red * factor;
    green = green * factor;
    blue = blue * factor;

    var rgb = blue | (green << 8) | (red << 16);
    return digits[1] + '#' + rgb.toString(16);
}

  function messagePaneBoxBlur(event) {
    let msgHeaderView = document.getElementById("msgHeaderView");
    let wintype = document.documentElement.getAttribute("windowtype");
    let tabmail = document.getElementById("tabmail");
//    if (msgHeaderView && wintype && wintype == "mail:3pane" &&
//        tabmail && tabmail.tabContainer.selectedIndex == 0) {
    if (msgHeaderView) {
      if (!(typeof msgHeaderViewBackground === "undefined")) {
        msgHeaderView.style.backgroundColor = msgHeaderViewBackground;
        msgHeaderViewBackground = undefined;
      }
    }
  }

  function setDblClickHeaderEventHandler() {
    var msgHeaderViewDeck = document.getElementById("msgHeaderViewDeck");
    if (msgHeaderViewDeck){
      org_mozdev_compactHeader.debug.log("msgHeaderViewDeck " + msgHeaderViewDeck);
      if (cohePrefBranch.getBoolPref("header.doubleclick"))
        msgHeaderViewDeck.addEventListener("dblclick", pub.coheToggleHeaderView, true);
      else
        msgHeaderViewDeck.removeEventListener("dblclick", pub.coheToggleHeaderView, true);
    }
  }

  function multiMessageLoaded() {
    var multiMessage = document.getElementById("multimessage");
    if (multiMessage) {
      multiMessage.removeEventListener("DOMContentLoaded", multiMessageLoaded, false);
    }

    org_mozdev_compactHeader.debug.log("multiMessageLoaded start");
    org_mozdev_compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);
    org_mozdev_compactHeader.debug.log("multiMessageLoaded stop");
  }

  var coheUninstallObserver = {
    _uninstall : false,
    observe : function(subject, topic, data) {
      org_mozdev_compactHeader.debug.log("test: " + subject + ", " +
          topic + ", " + data);
      if (topic == "quit-application-granted") {
        org_mozdev_compactHeader.debug.log("uninstalling COHE 2");
        if (this._uninstall) {
          cohePrefBranch.deleteBranch("");
          org_mozdev_compactHeader.toolbar.CHTCleanupButtons();
        }
        this.unregister();
      }
    },
    onUninstalling: function(addon) {
      if (addon.id == COMPACTHEADER_EXTENSION_UUID) {
        this._uninstall = true;
      }
    },

    onOperationCancelled: function(addon) {
      if (addon.id == COMPACTHEADER_EXTENSION_UUID) {
        this._uninstall = (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) != 0;
      }
    },

    register : function() {
      org_mozdev_compactHeader.debug.log("register uninstall start");
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
      org_mozdev_compactHeader.debug.log("register uninstall start 1");

      org_mozdev_compactHeader.debug.log("register uninstall start 2");

      org_mozdev_compactHeader.debug.log("register uninstall neu 2");
      observerService.addObserver(this, "quit-application-granted", false);
      ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.addAddonListener(this);
      org_mozdev_compactHeader.debug.log("register uninstall neu 2");
    },
    unregister : function() {
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService);

      observerService.removeObserver(this, "quit-application-granted");
      AddonManager.removeAddonListener(this);
    }
  }

  pub.firstRun = function() {
    org_mozdev_compactHeader.debug.log("firstRun start");
    let header_toolbox = document.getElementById("header-view-toolbox");
    if (header_toolbox) {
      if (header_toolbox.myFunction &&
          (typeof header_toolbox.myFunction === "function")
        ){
        org_mozdev_compactHeader.debug.log("firstRun: messagepane-loaded was already issued");
        pub.coheOnLoadMsgHeaderPane();
        org_mozdev_compactHeader.debug.log("firstRun: messagepane-loaded was already issued stop");
      } else {
        org_mozdev_compactHeader.debug.log("firstRun: not function");
        pub.coheOnLoadMsgHeaderPane();
        org_mozdev_compactHeader.debug.log("firstRun: not function finished");
      }
    } else {
      org_mozdev_compactHeader.debug.log("no header_toolbox");
    }
    org_mozdev_compactHeader.debug.log("firstRun stop");
  };


  return pub;
}();

// https://hg.mozilla.org/comm-central/rev/e1b29b3607c4#l1.13
if (document.getElementById("msgHeaderView").loaded) {
  org_mozdev_compactHeader.debug.log("firstRun: messagepane-loaded was already issued");
  org_mozdev_compactHeader.pane.coheOnLoadMsgHeaderPane();
}
else {
  addEventListener('messagepane-loaded', org_mozdev_compactHeader.pane.coheOnLoadMsgHeaderPane, true);
}

addEventListener('messagepane-unloaded', org_mozdev_compactHeader.pane.coheOnUnloadMsgHeaderPane, true);
addEventListener('load', org_mozdev_compactHeader.pane.coheInitializeOverlay, false);

// we need this, because the addon overlay might only be loaded after
// the event messagepane-loaded has already been fired.
org_mozdev_compactHeader.pane.firstRun();
