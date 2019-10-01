/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = [
  // heuristics for finding quoted parts
  "convertHotmailQuotingToBlockquote1",
  "convertOutlookQuotingToBlockquote", "convertForwardedToBlockquote",
  "fusionBlockquotes", "convertMiscQuotingToBlockquote",
];

/* Below are hacks^W heuristics for finding quoted parts in a given email */

function canInclude(aNode) {
  let v = aNode.tagName && aNode.tagName.toLowerCase() == "br"
    || aNode.nodeType == aNode.TEXT_NODE && aNode.textContent.trim() === "";
  // if (v) dump("Including "+aNode+"\n");
  return v;
}

function isBody(aNode) {
  if (aNode.tagName && aNode.tagName.toLowerCase() == "body") {
    return true;
  }
  let count = 0;
  for (let node of aNode.parentNode.childNodes) {
    // dump(node+" "+node.nodeType+"\n");
    switch (node.nodeType) {
      case node.TEXT_NODE:
        if (node.textContent.trim().length > 0)
          count++;
        break;
      case node.ELEMENT_NODE:
        count++;
        break;
    }
  }
  // dump(count+"\n");
  return (count == 1) && isBody(aNode.parentNode);
}

function implies(a, b) {
  return !a || a && b;
}

/* Create a blockquote that encloses everything relevant, starting from marker.
 * Marker is included by default, remove it later if you need to. */
function encloseInBlockquote(aDoc, marker) {
  if (marker.previousSibling && canInclude(marker.previousSibling)) {
    encloseInBlockquote(aDoc, marker.previousSibling);
  } else if (!marker.previousSibling && !isBody(marker.parentNode)) {
    encloseInBlockquote(aDoc, marker.parentNode);
  } else if (implies(marker == marker.parentNode.firstChild, !isBody(marker.parentNode))) {
    let blockquote = aDoc.createElement("blockquote");
    blockquote.setAttribute("type", "cite");
    marker.parentNode.insertBefore(blockquote, marker);
    while (blockquote.nextSibling)
      blockquote.appendChild(blockquote.nextSibling);
  }
}

function trySel(aDoc, sel, remove) {
  let marker = aDoc.querySelector(sel);
  if (marker) {
    encloseInBlockquote(aDoc, marker);
    if (remove)
      marker.remove();
  }
  return marker != null;
}

/* Hotmails use a <hr> to mark the start of the quoted part. */
function convertHotmailQuotingToBlockquote1(aDoc) {
  /* We make the assumption that no one uses a <hr> in their emails except for
   * separating a quoted message from the rest */
  trySel(aDoc,
    "body > hr, \
     body > div > hr, \
     body > pre > hr, \
     body > div > div > hr, \
     hr#stopSpelling", true);
}

function convertMiscQuotingToBlockquote(aDoc) {
  trySel(aDoc, ".yahoo_quoted");
}

/* There's a special message header for that. */
function convertOutlookQuotingToBlockquote(aWin, aDoc) {
  /* Outlook uses a special thing for that */
  trySel(aDoc, ".OutlookMessageHeader");
  for (let div of aDoc.getElementsByTagName("div")) {
    let style = aWin.getComputedStyle(div);
    if ((style.borderTopColor == "rgb(181, 196, 223)"
         || style.borderTopColor == "rgb(225, 225, 225)")
        && style.borderTopStyle == "solid"
        && style.borderLeftWidth == "0px"
        && style.borderRightWidth == "0px"
        && style.borderBottomWidth == "0px") {
      encloseInBlockquote(aDoc, div);
      div.style.borderTopWidth = 0;
      break;
    }
  }
}

/* Stupid regexp that matches:
 * ----- Something that supposedly says the text below is quoted -----
 * Fails 9 times out of 10. */
function convertForwardedToBlockquote(aDoc) {
  let re = /^\s*(-{5,15})(?:\s*)(?:[^ \f\n\r\t\v\u00A0\u2028\u2029-]+\s+)*[^ \f\n\r\t\v\u00A0\u2028\u2029-]+(\s*)\1\s*/mg;
  let walk = function(aNode) {
    for (let child of aNode.childNodes) {
      let txt = child.textContent;
      let m = txt.match(re);
      if (child.nodeType == child.TEXT_NODE
          && !txt.includes("-----BEGIN PGP")
          && !txt.includes("----END PGP")
          && m && m.length) {
        let marker = m[0];
        // dump("Found matching text "+marker+"\n");
        let i = txt.indexOf(marker);
        let t1 = txt.substring(0, i);
        let t2 = txt.substring(i + 1, child.textContent.length);
        let tn1 = aDoc.createTextNode(t1);
        let tn2 = aDoc.createTextNode(t2);
        child.parentNode.insertBefore(tn1, child);
        child.parentNode.insertBefore(tn2, child);
        child.remove();
        encloseInBlockquote(aDoc, tn2);
        // eslint-disable-next-line no-throw-literal
        throw { found: true };
      } else if (m && m.length) {
        // We only move on if we found the matching text in the parent's text
        // content, otherwise, there's no chance we'll find it in the child's
        // content.
        walk(child);
      }
    }
  };
  try {
    walk(aDoc.body);
  } catch ( { found }) {
    if (!found) {
      throw new Error();
    }
  }
}

/* If [b1] is a blockquote followed by [ns] whitespace nodes followed by [b2],
 * append [ns] to [b1], then append all the child nodes of [b2] to [b1],
 * effectively merging the two blockquotes together. */
function fusionBlockquotes(aDoc) {
  let blockquotes = new Set(aDoc.getElementsByTagName("blockquote"));
  for (let blockquote of blockquotes) {
    let isWhitespace = function(n) {
      return (n && (n.tagName && n.tagName.toLowerCase() == "br"
          || n.nodeType == n.TEXT_NODE && n.textContent.match(/^\s*$/)));
    };
    let isBlockquote = function(b) {
      return (b && b.tagName && b.tagName.toLowerCase() == "blockquote");
    };
    let blockquoteFollows = function(n) {
      return n && (isBlockquote(n) || isWhitespace(n) && blockquoteFollows(n.nextSibling));
    };
    while (blockquoteFollows(blockquote.nextSibling)) {
      while (isWhitespace(blockquote.nextSibling))
        blockquote.appendChild(blockquote.nextSibling);
      if (isBlockquote(blockquote.nextSibling)) {
        let next = blockquote.nextSibling;
        while (next.firstChild)
          blockquote.appendChild(next.firstChild);
        blockquote.parentNode.removeChild(next);
        blockquotes.delete(next);
      } else {
        Cu.reportError("What?!");
      }
    }
  }
}
