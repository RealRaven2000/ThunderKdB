var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

window.addEventListener("load", function(e) { ahtStatusbarSetLabelIcon.startup(); }, false);
window.addEventListener("unload", function(e) { ahtStatusbarSetLabelIcon.shutdown(); }, false);

window.addEventListener("load", function(e) { ahtHideAndShowStatusbarElements.startup(); }, false);
window.addEventListener("unload", function(e) { ahtHideAndShowStatusbarElements.shutdown(); }, false);

var ahtStatusbarSetLabelIcon = {

	startup: function()
	{
		Services.prefs.addObserver("", this, false);

		this.refreshInformation(false);
		this.refreshInformation(true);
	},

	shutdown: function()
	{
		Services.prefs.removeObserver("", this);
	},

	observe: function(subject, topic, data)
	{
		if (topic != "nsPref:changed")
		{
			return;
		}

		switch(data)
		{
			case "mailnews.display.prefer_plaintext":
				this.refreshInformation(false);
				break;
			case "mailnews.display.html_as":
				this.refreshInformation(false);
				break;
			case "mailnews.display.disallow_mime_handlers":
				this.refreshInformation(false);
				break;
			case "rss.display.prefer_plaintext":
				this.refreshInformation(true);
				break;
			case "rss.display.html_as":
				this.refreshInformation(true);
				break;
			case "rss.display.disallow_mime_handlers":
				this.refreshInformation(true);
				break;
			case "rss.show.summary":
				this.refreshInformation(true);
				break;
		}
	},

	refreshInformation: function(isFeedOption)
	{
		if(!isFeedOption)
		{
			let prefer_plaintext = false;
			let html_as = 0;
			let disallow_classes = 0;

			prefer_plaintext = Services.prefs.getBoolPref("mailnews.display.prefer_plaintext");
			html_as = Services.prefs.getIntPref("mailnews.display.html_as");
			disallow_classes = Services.prefs.getIntPref("mailnews.display.disallow_mime_handlers");

			let ahtStatusbarpanelText = document.getElementById("AHT-statusbarpanel-text");
			let ahtStatusbarpanelIcon = document.getElementById("AHT-statusbarpanel-icon");

			if (ahtStatusbarpanelText && ahtStatusbarpanelIcon) {
				if (!prefer_plaintext && !html_as && !disallow_classes) {
					ahtStatusbarpanelText.setAttribute("value", ahtStatusbarpanelText.getAttribute("labelAHT-htmlStatusOriginal"));
					ahtStatusbarpanelIcon.setAttribute("AHT-htmlStatus", "Original");
				}
				else if (!prefer_plaintext && html_as == 3 && disallow_classes > 0) {
					ahtStatusbarpanelText.setAttribute("value", ahtStatusbarpanelText.getAttribute("labelAHT-htmlStatusSanitized"));
					ahtStatusbarpanelIcon.setAttribute("AHT-htmlStatus", "Sanitized");
				}
				else if (prefer_plaintext && html_as == 1 && disallow_classes > 0) {
					ahtStatusbarpanelText.setAttribute("value", ahtStatusbarpanelText.getAttribute("labelAHT-htmlStatusPlaintext"));
					ahtStatusbarpanelIcon.setAttribute("AHT-htmlStatus", "Plaintext");
				}
			}
		}
		else
		{
			let feed_summary = 0;
			feed_summary = Services.prefs.getIntPref("rss.show.summary");

			let ahtFeedStatusbarpanelText = document.getElementById("AHT-feed-statusbarpanel-text");

			if (ahtFeedStatusbarpanelText) {
				switch(feed_summary)
				{
					case 0:
						ahtFeedStatusbarpanelText.setAttribute("value", ahtFeedStatusbarpanelText.getAttribute("labelAHT-viewFeedWebPage"));
						break;
					case 1:
						ahtFeedStatusbarpanelText.setAttribute("value", ahtFeedStatusbarpanelText.getAttribute("labelAHT-viewFeedSummary"));
						break;
					case 2:
						ahtFeedStatusbarpanelText.setAttribute("value", ahtFeedStatusbarpanelText.getAttribute("labelAHT-viewFeedSummaryFeedPropsPref"));
						break;
				}
			}
		}
	}
}

var ahtHideAndShowStatusbarElements = {

	startup: function()
	{
		this.observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		this.observerService.addObserver(this, "mail:updateToolbarItems", false);
		this.observerService.addObserver(this, "MsgMsgDisplayed", false);

		this.refreshSwitch();
	},

	shutdown: function()
	{
		this.observerService.removeObserver(this, "mail:updateToolbarItems");
		this.observerService.removeObserver(this, "MsgMsgDisplayed");
	},

	observe: function(subject, topic, data)
	{
		switch(topic)
		{
			case "MsgMsgDisplayed":
				this.refreshSwitch();
				break;
			case "mail:updateToolbarItems":
				this.refreshSwitch();
				break;
		}
	},

	refreshSwitch: function()
	{
		let ahtStatusbarMessage = document.getElementById("AHT-statusbarpanel");
		let ahtStatusbarFeed = document.getElementById("AHT-feed-statusbarpanel");

		try {
			if(gFolderDisplay.selectedMessageIsFeed)
			{
				ahtStatusbarMessage.setAttribute("hidden", true);
				ahtStatusbarFeed.setAttribute("hidden", false);
			}
			else
			{
				ahtStatusbarMessage.setAttribute("hidden", false);
				ahtStatusbarFeed.setAttribute("hidden", true);
			}
		}
		catch(e) {
			ahtStatusbarMessage.setAttribute("hidden", true);
			ahtStatusbarFeed.setAttribute("hidden", true);
		}
	}
}
