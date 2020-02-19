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

//Components.utils.import("chrome://CompactHeader/content/debug.jsm");

if (typeof org_mozdev_compactHeader == "undefined") {
  var org_mozdev_compactHeader = {};
};


org_mozdev_compactHeader.RSSLinkify = function() {
  var pub = {};

  var cohePrefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                                          .getService(Components.interfaces.nsIPrefService)
                                          .getBranch("extensions.CompactHeader.");

  var coheIntegrateRSSLinkify = false;

  var RSSLinkify = {
      oldSubject: null,
      newSubject: null
  };

  pub.UpdateHeaderView = function(currentHeaderData) {
    org_mozdev_compactHeader.debug.log("updateheaderview start");
    if (!currentHeaderData) {
      org_mozdev_compactHeader.debug.log("updateheaderview: no currentHeaderData!");
      return;
    }
    if (cohePrefBranch.getBoolPref("headersize.linkify")) {
      org_mozdev_compactHeader.debug.log("updateheaderview start 1");
      if (!RSSLinkify.newSubject) pub.InitializeHeaderViewTables();
      var url = currentHeaderData["content-base"] || currentHeaderData["x-post-url"];
      if(url) {
//          RSSLinkify.newSubject.setAttribute("onclick", "if (!event.button) messenger.launchExternalURL('" +
//                                               url.headerValue + "');");
        RSSLinkify.newSubject.setAttribute("value", currentHeaderData["subject"].headerValue);
        RSSLinkify.newSubject.setAttribute("url", url.headerValue);
        RSSLinkify.newSubject.setAttribute("collapsed", "false");
        RSSLinkify.oldSubject.setAttribute("collapsed", "true");
        RSSLinkify.newSubject.setAttribute("tooltiptext", url.headerValue);
        RSSLinkify.newSubject.addEventListener("click",
          org_mozdev_compactHeader.RSSLinkify.openBrowser, false);
        RSSLinkify.newSubject.setAttribute("context", "CompactHeader_copyPopup");
      } else {
        removeEventListener('click',
            org_mozdev_compactHeader.RSSLinkify.openBrowser, true);
        RSSLinkify.newSubject.setAttribute("collapsed", "true");
        RSSLinkify.oldSubject.setAttribute("collapsed", "false");
        RSSLinkify.oldSubject.setAttribute("tooltiptext", currentHeaderData["subject"].headerValue);
//          if (gCoheCollapsedHeaderViewMode) {
//            //linkifySubject('collapsed1LsubjectBox');
//          }
//          else {
//            linkifySubject('expandedsubjectBox');
//          }
      }
    } else {
      if (RSSLinkify.newSubject) {
        RSSLinkify.newSubject.setAttribute("collapsed", "true");
      }
      if (RSSLinkify.oldSubject) {
        RSSLinkify.oldSubject.setAttribute("collapsed", "false");
        RSSLinkify.oldSubject.setAttribute("tooltiptext", currentHeaderData["subject"].headerValue);
      }
    }
    org_mozdev_compactHeader.debug.log("updateheaderview stop");
  };

  pub.openBrowser = function(event) {
    org_mozdev_compactHeader.debug.log("open browser 0" + event.attrName);
    if (!event.button) {
      let url = RSSLinkify.newSubject.getAttribute("url");
      org_mozdev_compactHeader.debug.log("open browser 2" + url);
      messenger.launchExternalURL(url);
    }
  };

  pub.InitializeHeaderViewTables = function() {
    org_mozdev_compactHeader.debug.log("rss InitializeHeaderViewTables start");
    if (cohePrefBranch.getBoolPref("headersize.linkify")) {
      org_mozdev_compactHeader.debug.log("rss InitializeHeaderViewTables start 1");
      let newSubject = document.getElementById("CompactHeader_collapsedsubjectlinkBox");
      org_mozdev_compactHeader.debug.log("rss InitializeHeaderViewTables newSubject: " + newSubject);
      if (newSubject) {
        RSSLinkify.newSubject = newSubject;
      } else
      {
        org_mozdev_compactHeader.debug.log("try to create label");
        try {
          RSSLinkify.newSubject = document.createXULElement("label");
          org_mozdev_compactHeader.debug.log("created XUL label");
        }
        catch(e) {
          RSSLinkify.newSubject = document.createElement("label");
          org_mozdev_compactHeader.debug.log("created label");
        }
      }
      org_mozdev_compactHeader.debug.log("rss InitializeHeaderViewTables start 2");
      RSSLinkify.newSubject.setAttribute("id", "CompactHeader_collapsedsubjectlinkBox");
      RSSLinkify.newSubject.setAttribute("class", "headerValue plain headerValueUrl");
      RSSLinkify.newSubject.setAttribute("originalclass", "headerValue plain headerValueUrl");
      RSSLinkify.newSubject.setAttribute("context", "CompactHeader_copyPopup");
      RSSLinkify.newSubject.setAttribute("keywordrelated", "true");
      RSSLinkify.newSubject.setAttribute("readonly", "true");
      RSSLinkify.newSubject.setAttribute("appendoriginalclass", "true");
      RSSLinkify.newSubject.setAttribute("flex", "1");
      org_mozdev_compactHeader.debug.log("rss InitializeHeaderViewTables start 3");
      if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
        RSSLinkify.oldSubject = document.getElementById("CompactHeader_collapsed2LsubjectBox");
      } else {
        RSSLinkify.oldSubject = document.getElementById("CompactHeader_collapsed1LsubjectBox");
      }
      org_mozdev_compactHeader.debug.log("rss InitializeHeaderViewTables start 3");
      RSSLinkify.oldSubject.parentNode.insertBefore(RSSLinkify.newSubject, RSSLinkify.oldSubject);
      org_mozdev_compactHeader.debug.log("rss InitializeHeaderViewTables start 4");
    }
    org_mozdev_compactHeader.debug.log("InitializeHeaderViewTables stop");
  };

  function linkifySubject(subjectValueStr) {
    org_mozdev_compactHeader.debug.log("linkifySubject start");
    var subjectNode = document.getElementById(subjectValueStr);
    while(subjectNode.childNodes.length > 0) {
      subjectNode.removeChild(subjectNode.firstChild)
    }
    var subject = currentHeaderData['subject'].headerValue;

    if (regex.links.test(subject)) {
      var text = subject;
      /* utility function to split text and links */
      linkify = function(text) {
        var matches = regex.links.exec(text);
        var pre, post = null;
        [pre, post] = text.split(matches[1]);
        var link = document.createElement("a");
        link.appendChild(document.createTextNode(matches[1]));
        link.setAttribute("href", matches[1]);
        link.setAttribute("class","text-link");
        link.addEventListener("onclick",
          pub.subjectLinkOnClickListenter, false);
        return [pre,link,post];
      }
      /* loop through multiple possible links in the subject */
      while(text && regex.links.test(text)) {
        var pre, link, post = null;
        [pre,link,post] = linkify(text);
        /* we can't assume that any pre or post text was given, only a link */
        if (pre && pre.length > 0)
          subjectNode.appendChild(document.createTextNode(pre));
        subjectNode.appendChild(link);
        text = post;
      }
      if (text && text.length > 0)
        subjectNode.appendChild(document.createTextNode(text));
    } else {
      subjectNode.appendChild(document.createTextNode(subject));
    }
    org_mozdev_compactHeader.debug.log("linkifySubject stop");
  }

  /* :::: Subject Link onClick Listener Functions :::: */
  pub.subjectLinkOnClickListenter = function(event) {
    org_mozdev_compactHeader.debug.log("subjectLinkOnClickListenter start");
    if (event.originalTarget && event.originalTarget.getAttribute("href")) {
      try {
        messenger.launchExternalURL(event.originalTarget.getAttribute("href"));
      } catch (e) { Application.console.log(e); }
    }
    org_mozdev_compactHeader.debug.log("subjectLinkOnClickListenter stop");
  };

  pub.CopyToClipboard = function(node, attr) {
    org_mozdev_compactHeader.debug.log("CopyToClipboard start");
    if (node) {
      var contractid = "@mozilla.org/widget/clipboardhelper;1";
      var iid = Components.interfaces.nsIClipboardHelper;
      var clipboard = Components.classes[contractid].getService(iid);
      clipboard.copyString( node.getAttribute(attr) );
    }
    org_mozdev_compactHeader.debug.log("CopyToClipboard stop");
  };

  return pub;
}();
