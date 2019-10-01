"use strict";

/* 
BEGIN LICENSE BLOCK

	SmartTemplate4 is released under the Creative Commons (CC BY-ND 4.0)
	Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
	For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK
*/

var SmartTemplate4_TabURIregexp = {
	get _thunderbirdRegExp() {
		delete this._thunderbirdRegExp;
		return this._thunderbirdRegExp = new RegExp("^http://smarttemplate4.mozdev.org");
	}
};

SmartTemplate4.Util = {
	HARDCODED_CURRENTVERSION : "2.3.1",
	HARDCODED_EXTENSION_TOKEN : ".hc",
	ADDON_ID: "smarttemplate4@thunderbird.extension",
	VersionProxyRunning: false,
	mAppver: null,
	mAppName: null,
	mHost: null,
	mExtensionVer: null,
	ConsoleService: null,
	lastTime: 0,
	AMOHomepage:      "https://addons.thunderbird.net/thunderbird/addon/324497/",
	PremiumFeaturesPage: "http://smarttemplate4.mozdev.org/premium.html",
	SupportHomepage:  "http://smarttemplate4.mozdev.org/index.html",
	BugPage:          "http://smarttemplate4.mozdev.org/bugs.html",
	LicensePage:      "http://smarttemplate4.mozdev.org/contribute.html",
	VersionPage:      "http://smarttemplate4.mozdev.org/version.html",
	StationeryHelpPage: "http://smarttemplate4.mozdev.org/stationery.html",
	AxelAMOPage:      "https://addons.thunderbird.net/thunderbird/user/66492/",
	MarkyAMOPage:     "https://addons.thunderbird.net/thunderbird/user/2448736/",
	ArisAMOPage:      "https://addons.thunderbird.net/firefox/user/5641642/",
	Tool8AMOPage:     "https://addons.thunderbird.net/thunderbird/user/5843412/",
	NoiaHomepage:     "http://carlitus.deviantart.com/",
	FlagsHomepage:    "http://flags.blogpotato.de/",
	BeniBelaHomepage: "http://www.benibela.de/",
	StationeryPage:   "https://addons.thunderbird.net/thunderbird/addon/stationery",
	YouTubePage:      "https://www.youtube.com/channel/UCCiqw9IULdRxig5e-fcPo6A",
	
  get mainInstance() {
    return this.Mail3PaneWindow.SmartTemplate4;
  } ,
	
	get CurrentEditor() {
		if (typeof GetCurrentEditor == 'function')
			return GetCurrentEditor();
		this.logDebug("CurrentEditor failed!");
		return null;
	} ,
	
  /* premiumFeatures: array of premium function used during getProcessedText calls.
   * this gathers all into a single consolidated notification.	
	 */
	premiumFeatures: new Array(),  // only the array in the main instance Util will be used
	addUsedPremiumFunction: function addUsedPremiumFunction(f) {
		const mainUtil = SmartTemplate4.Util.mainInstance.Util;
		// avoid duplicates
		if (!mainUtil.premiumFeatures.some(function(e) {return e==f;} ))  // e => e == f    OLD POSTBOX IS TOO STUPID FOR THIS SYNTAX
			mainUtil.premiumFeatures.push(f);
	},
	
	clearUsedPremiumFunctions: function clearUsedPremiumFunctions() {
		while (SmartTemplate4.Util.mainInstance.Util.premiumFeatures.length) {
			SmartTemplate4.Util.mainInstance.Util.premiumFeatures.pop();
		}
	},
	
	get Licenser() { // retrieve Licenser always from the main window to keep everything in sync
		const util = SmartTemplate4.Util;
	  try { 
			return util.Mail3PaneWindow.SmartTemplate4.Licenser;
		}
		catch(ex) {
			util.logException('Retrieve Licenser failed: ', ex);
		}
		return SmartTemplate4.Licenser;
	} ,


	get mailDocument() {
	  return gMsgCompose.editor.document;
	} ,
	
	getComposeType: function() {
		const Ci = Components.interfaces;
		let msgComposeType = Ci.nsIMsgCompType,
		    st4composeType = '';
		
		switch (gMsgCompose.type) {
			// new message -----------------------------------------
			//	(New:0 / NewsPost:5 / MailToUrl:11)
			case msgComposeType.New:
			case msgComposeType.NewsPost:
			case msgComposeType.MailToUrl:
				// composeCase = 'new';
				st4composeType = 'new';
				break;

			// reply message ---------------------------------------
			// (Reply:1 / ReplyAll:2 / ReplyToSender:6 / ReplyToGroup:7 /
			// ReplyToSenderAndGroup:8 / ReplyToList:13)
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToGroup:
			case msgComposeType.ReplyToSenderAndGroup:
			case msgComposeType.ReplyToList:
				// composeCase = 'reply';
				st4composeType = 'rsp';
				break;

			// forwarding message ----------------------------------
			// (ForwardAsAttachment:3 / ForwardInline:4)
			case msgComposeType.ForwardAsAttachment:
			case msgComposeType.ForwardInline:
				// composeCase = 'forward';
				st4composeType = 'fwd';
				break;

			// do not process -----------------------------------
			// (Draft:9/Template:10/ReplyWithTemplate:12)
			case msgComposeType.Draft:
				// composeCase = 'draft';
				let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
				let msgDbHdr = messenger.msgHdrFromURI(gMsgCompose.originalMsgURI).QueryInterface(Ci.nsIMsgDBHdr);
				const nsMsgKey_None = 0xffffffff;
				if(msgDbHdr) {
					if (msgDbHdr.threadParent && (msgDbHdr.threadParent != nsMsgKey_None)) {
						st4composeType = 'rsp(draft)'; // just guessing, of course it could be fwd as well
					}
					if (msgDbHdr.numReferences == 0)
						st4composeType = 'new(draft)';
				}
				break;
			default:
				st4composeType = "";
				break;
		}
		SmartTemplate4.Util.logDebugOptional('functions', 'getComposeType: gMsgCompose.type = ' + gMsgCompose.type + ' (' + st4composeType + ')');
		return st4composeType;

	} ,
	
	getBundleString: function(id, defaultText) {
    const Ci = Components.interfaces;
		let strBndlSvc = Components.classes["@mozilla.org/intl/stringbundle;1"].
						getService(Ci.nsIStringBundleService),
		    bundle = strBndlSvc.createBundle("chrome://smarttemplate4/locale/messages.properties"),
		    theText = '';
		try{
			//try writing an error to the Error Console using the localized string; if it fails write it in English
			theText = bundle.GetStringFromName(id);
		} catch (e) {
			theText = defaultText;
			this.logException ("Could not retrieve bundle string: " + id, e);
		}
		theText = theText.replace("&lt;","<");
		return theText.replace("&gt;",">");
	} ,

	get Mail3PaneWindow() {
		let windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1']
				.getService(Components.interfaces.nsIWindowMediator),
		    win3pane = windowManager.getMostRecentWindow("mail:3pane");
		return win3pane;
	} ,

	get PlatformVer() {
		let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULAppInfo);
		return appInfo.platformVersion;
	} ,
	
	get AppverFull() {
		let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULAppInfo);
		return appInfo.version;
	},

	get Appver() {
		if (null === this.mAppver) {
			let appVer=this.AppverFull; // no more truncation
			this.mAppver = parseFloat(appVer).toString(); // quick n dirty!
		}
		return this.mAppver;
	},

	get Application() {
		if (null===this.mAppName) {
		let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULAppInfo);
			const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
			const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
			const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
			const POSTBOX_ID = "postbox@postbox-inc.com";
			switch(appInfo.ID) {
				case FIREFOX_ID:
					return this.mAppName='Firefox';
				case THUNDERBIRD_ID:
					return this.mAppName='Thunderbird';
				case SEAMONKEY_ID:
					return this.mAppName='SeaMonkey';
				case POSTBOX_ID:
					return this.mAppName='Postbox';
				default:
					this.mAppName=appInfo.name;
					this.logDebug ( 'Unknown Application: ' + appInfo.name);
					return appInfo.name;
			}
		}
		return this.mAppName;
	},

	get HostSystem() {
		if (null===this.mHost) {
			let runTime = Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULRuntime);
			let osString = runTime.OS;
			this.mHost = osString.toLowerCase();
			// 
			if (window.navigator)
				this.mHost = window.navigator.oscpu;
			
			
			if (runTime.inSafeMode)
				this.mHost += ' [Safe Mode]';
			
			
		}
		return this.mHost; // linux - winnt - darwin
	},
	
	get isLinux() {
    // https://developer.mozilla.org/en-US/docs/OS_TARGET
    let xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                 .getService(Components.interfaces.nsIXULRuntime);  
    return (xulRuntime.OS.indexOf('Linux')>=0);
  } ,

	// this is done asynchronously, so it respawns itself
	VersionProxy: function() {
		const util = SmartTemplate4.Util;
		try {
			if (util.mExtensionVer // early exit, we got the version!
				||
					util.VersionProxyRunning) // no recursion...
				return;

			util.logDebug("Util.VersionProxy()...");
			util.VersionProxyRunning = true;
			util.logDebug("Util.VersionProxy() started.");
			let myId = util.ADDON_ID;
			if (Components.utils.import) {
				var { AddonManager } = 
					ChromeUtils.import ?
					ChromeUtils.import("resource://gre/modules/AddonManager.jsm") :
					Components.utils.import("resource://gre/modules/AddonManager.jsm");
				
				let versionCallback = function(addon) {
					let versionLabel = window.document.getElementById("qf-options-header-description");
					if (versionLabel) versionLabel.setAttribute("value", addon.version);

					util.mExtensionVer = addon.version;
					util.logDebug("AddonManager: SmartTemplate4 extension's version is " + addon.version);
					util.logDebug("SmartTemplate4.VersionProxy() - DETECTED SmartTemplate4 Version " + util.mExtensionVer + "\n"
					           + "Running on " + util.Application
					           + " Version " + util.AppverFull);
					// make sure we are not in options window
					if (!versionLabel)
						util.firstRun.init();

					util.mExtensionVer = addon.version;
					util.logDebug("AddonManager: SmartTemplate4 extension's version is " + addon.version);
					versionLabel = window.document.getElementById("smartTemplate-options-version");
					if(versionLabel)
						versionLabel.setAttribute("value", addon.version);
				}
				
				if (util.versionGreaterOrEqual(util.AppverFull, "61")) 
					AddonManager.getAddonByID(myId).then(versionCallback); // this function is now a promise
				else
					AddonManager.getAddonByID(myId, versionCallback);
			}
			util.logDebug("AddonManager.getAddonByID .. added callback for setting extensionVer.");

		}
		catch(ex) {
			util.logToConsole("SmartTemplate4 VersionProxy failed - are you using an old version of " + util.Application + "?"
				+ "\n" + ex);
		}
		finally {
			util.VersionProxyRunning = false;
			util.logDebug("Util.VersionProxy ends()");
		}
	},

	get Version() {
		const util = SmartTemplate4.Util;
		//returns the current full SmartTemplate version number.
		if(util.mExtensionVer)
			return util.mExtensionVer;
		let current = util.HARDCODED_CURRENTVERSION + util.HARDCODED_EXTENSION_TOKEN;

		// Addon Manager: use Proxy code to retrieve version asynchronously
		util.VersionProxy(); // modern Mozilla builds.
											// these will set mExtensionVer (eventually)
											// also we will delay firstRun.init() until we _know_ the version number
		this.logDebug("Version() = " + current);

		return current;
	} ,

	get VersionSanitized() {
		function strip(version, token) {
			let cutOff = version.indexOf(token);
			if (cutOff > 0) { 	// make sure to strip of any pre release labels
				return version.substring(0, cutOff);
			}
			return version;
		}

		let pureVersion = strip(SmartTemplate4.Util.Version, 'pre');
		pureVersion = strip(pureVersion, 'beta');
		pureVersion = strip(pureVersion, 'alpha');
		return strip(pureVersion, '.hc');
	},

  getIdentityKey  :  function getIdentityKey(doc) {
    let selected = doc.getElementById("msgIdentity").selectedItem;
    if (!selected) return "";
    let key = selected.getAttribute("identitykey");  // Tb 38.*
    if (!key)
        key = selected.getAttribute("value"); // Tb 31.*
    return key;
  }, 
  
	popupAlert: function (title, text, icon) {
		try {
			if (!icon)
				icon = "chrome://smarttemplate4/skin/icon32x32.png";
			Components.classes['@mozilla.org/alerts-service;1'].
								getService(Components.interfaces.nsIAlertsService).
								showAlertNotification(icon, title, text, false, '', null);
		}
		catch(e) {
			// prevents runtime error on platforms that don't implement nsIAlertsService
		}
	},
	
  /* SmartTemplate4 Pro / licensing features */
	// default to isRegister from now = show button for buying a license.
	// was popupProFeature, now renamed to popupLicenseNotification
	// isProFeature = true - show notification based on function used
	//              = false - show fact that a license is needed.
	popupLicenseNotification: function popupLicenseNotification(featureList, isRegister, isProFeature, additionalText) {
		const util = SmartTemplate4.Util;
		let notifyBox,
				State = util.Licenser.ELicenseState,
				featureName = '',
				isList = false,
				hasLicense = util.hasLicense(false),
				isStandardLicense = false;
				
		if (SmartTemplate4.Preferences.isDebugOption('premium.testNotification')) {
			util.logToConsole("Testing license warning - to restore normal validation of your license, please reset extensions.smartTemplate4.debug.premium.testNotification");
			hasLicense=false;
		}
				
    if (hasLicense) {
			if (isProFeature && util.hasStandardLicense)
				isStandardLicense = true; // popup for pro features
			else return;
		}
		
		// show no license reminder if user has standard license, unless this is a "pro feature" warning
		if (!isProFeature && isStandardLicense) return; 
		
		
		if (typeof featureList == 'string') {
			featureName = featureList;
		}
		else { // Array
			featureName = featureList.join('|'); // we use this in the referrer URL, but might need to concatenate.
			if (featureList.length > 1)
				isList=true;
		}
		
		util.logDebug('popupLicenseNotification(' + featureName + ')' );
		
		if (typeof specialTabs == 'object' && specialTabs.msgNotificationBar) { // Tb 68
			notifyBox = specialTabs.msgNotificationBar;
		}
		else if( typeof gNotification == 'object' && gNotification.notificationbox) { // Tb 68
			notifyBox = gNotification.notificationbox;
		}
		else {
			let notificationId;
			switch(util.Application) {
				case 'Postbox': 
					notificationId = 'pbSearchThresholdNotifcationBar';  // msgNotificationBar
					break;
				case 'Thunderbird': 
					if (window.location.toString().endsWith("messengercompose.xul"))
						notificationId = 'attachmentNotificationBox';
					else
						notificationId = 'mail-notification-box';
					break;
				case 'SeaMonkey':
					notificationId = null;
					break;
			}
			notifyBox = document.getElementById (notificationId);
			// composer/dialog windows fallback - show in main window if notification is not available in this window
			if (!notifyBox) { 
				notifyBox = util.Mail3PaneWindow.document.getElementById (notificationId);
			}
		}
		let title, theText, featureTitle='';
		if (isProFeature) {
			title = util.getBundleString("SmartTemplate4.notification.premium.title", "Premium Feature");
			theText = 
				  isList 
						? util.getBundleString("SmartTemplate4.notification.premium.text.plural",
																 "{1} are Premium features, please upgrade to a SmartTemplate⁴ Pro License for using them permanently.")
						: util.getBundleString("SmartTemplate4.notification.premium.text",
																 "{1} is a Premium feature, please upgrade to a SmartTemplate⁴ Pro License for using it permanently.");
        featureTitle = 
				  isList ? featureList.join(', ') : featureName; // nice l10n name for pro features
						// util.getBundleString('SmartTemplate4.premium.title.' + featureName, featureName); 
			theText = theText.replace ("{1}", "'" + featureTitle + "'");
			if (additionalText)
				theText = theText + '  ' + additionalText;
		}
		else {
			title = "Licensing";
			theText = 
				util.getBundleString("SmartTemplate4.notification.license.text",
					"From now on, SmartTemplate⁴ requires at least a standard license. " +
					"Read more about it on our licensing page.");
			let gracePeriod = SmartTemplate4.Licenser.GracePeriod,
					txtGracePeriod = util.getBundleString("SmartTemplate4.trialDays", "You have {0} trial days left.").replace("{0}", gracePeriod);
			theText = theText + '  ' + txtGracePeriod;
		}
		
		let regBtn,
        hotKey = util.getBundleString("SmartTemplate4.notification.premium.btn.hotKey", "L"),
				nbox_buttons = [];
				
		switch(util.Licenser.ValidationStatus) {
			case State.Expired:
				regBtn = util.getBundleString("SmartTemplate4.notification.premium.btn.renewLicense", "Renew License!");
			  break;
			default:
			  if (util.Licenser.key_type==2) { // standard license
					regBtn = util.getBundleString("SmartTemplate4.notification.premium.btn.upgrade", "Upgrade to Pro");
					hotKey = util.getBundleString("SmartTemplate4.notification.premium.btn.upgrade.hotKey", "U");
				}
				else
					regBtn = util.getBundleString("SmartTemplate4.notification.premium.btn.getLicense", "Buy License!");
		}
				
		if (notifyBox) {
			let notificationKey = 
			  (isProFeature) ? "SmartTemplate4-proFeature" : "SmartTemplate4-license";
      if (notifyBox.getNotificationWithValue(notificationKey)) {
        // notification is already shown on screen.
        util.logDebug('notifyBox for [' + notificationKey + '] is already displayed, no action necessary.');
        return;
      }
      util.logDebug('Showing notifyBox for [' + notificationKey + ']...');
      
			// obsolete: button for disabling this notification in the future
			if (true) {
        // registration button
        if (isRegister) {
          nbox_buttons.push(
						{
							label: regBtn,
							accessKey: hotKey,   
							callback: function() { 
								util.mainInstance.Util.Licenser.showDialog(featureName); 
							},
							popup: null
						}
          )
        }
        
        // licensing buttons
        if (!isProFeature) {
          let donateMsg = util.getBundleString("SmartTemplate4.notification.licensing", "More about licensing");
          nbox_buttons.push(
            {
              label: donateMsg,
              accessKey: null, 
              callback: function() { 
							  const theUtil = util.mainInstance.Util;
                theUtil.showLicensePage(); 
								// remove this message?
                // let item = notifyBox.getNotificationWithValue(notificationKey);
                // notifyBox.removeNotification(item, (theUtil.Application == 'Postbox'))
              },
              popup: null
            }
          )
				  // remind me later checkbox?
				}
        
			}
			else {
				// obsolete: button for disabling this notification in the future
				let dontShow = util.getBundleString("SmartTemplate4.notification.dontShowAgain", "Do not show this message again.") + ' [' + featureTitle + ']'
				nbox_buttons.push(
					{
						label: dontShow,
						accessKey: null, 
						callback: function() { util.mainInstance.Util.disableFeatureNotification(featureName); },
						popup: null
					}
				);
			}
			
			if (notifyBox) {
				let item = notifyBox.getNotificationWithValue(notificationKey);
				if (item)
					notifyBox.removeNotification(item, (util.Application == 'Postbox'));
			}
		
		  // the standard license warning will be always shown on top of the other ones [PRIORITY_WARNING_HIGH]
			// it contains the number of free / trial days left
			notifyBox.appendNotification( 
			    theText, 
					notificationKey, 
					isProFeature ? "chrome://smarttemplate4/skin/proFeature.png" : "chrome://smarttemplate4/skin/licensing.png" , 
					isProFeature ? notifyBox.PRIORITY_INFO_HIGH : notifyBox.PRIORITY_WARNING_HIGH, 
					nbox_buttons ); // , eventCallback
			if (util.Application == 'Postbox') {
				this.fixLineWrap(notifyBox, notificationKey);
			}
		}
		else {
			// fallback for systems that do not support notification (currently: SeaMonkey)
			let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),  
			    check = {value: false},   // default the checkbox to true  
					dontShow = util.getBundleString("SmartTemplate4.notification.dontShowAgain", "Do not show this message again.") + ' [' + featureTitle + ']',
			    result = prompts.alert(null, title, theText); // , dontShow, check
			// if (check.value==true) util.disableFeatureNotification(featureName);
		}
	},  	

	showStatusMessage: function(s) {
		try {
			let sb = this.Mail3PaneWindow.document.getElementById('status-bar');
			let el, sbt;
			if (sb) {
				for (let i = 0; i < sb.childNodes.length; i++)
				{
					el = sb.childNodes[i];
					if (el.nodeType === 1 && el.id === 'statusTextBox') {
						sbt = el;
							break;
					}
				}
				for (let i = 0; i < sbt.childNodes.length; i++)
				{
					el = sbt.childNodes[i];
					if (el.nodeType === 1 && el.id === 'statusText') {
							el.label = s;
							break;
					}
				}
			}
			else
				MsgStatusFeedback.showStatusString(s);
		}
		catch(ex) {
			this.logException("showStatusMessage - ", ex);
			MsgStatusFeedback.showStatusString(s);
		}
	} ,
	
	debugVar: function debugVar(value) {
		let str = "Value: " + value + "\r\n";
		for (let prop in value) {
			str += prop + " => " + value[prop] + "\r\n";
		}
		this.logDebug(str);
	},

	logTime: function() {
		let timePassed = '';
    let end;
		try { // AG added time logging for test
			end = new Date();
			let endTime = end.getTime();
			if (this.lastTime === 0) {
				this.lastTime = endTime;
				return "[logTime init]";
			}
			let elapsed = new String(endTime - this.lastTime); // time in milliseconds
			timePassed = '[' + elapsed + ' ms]	 ';
			this.lastTime = endTime; // remember last time
		}
		catch(e) {;}
		return end.getHours() + ':' + end.getMinutes() + ':' + end.getSeconds() + '.' + end.getMilliseconds() + '  ' + timePassed;
	},

	logToConsole: function (msg, optionalTitle) {
		const util = SmartTemplate4.Util;
		if (util.ConsoleService === null)
			util.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
									.getService(Components.interfaces.nsIConsoleService);
		let title = "SmartTemplate⁴";
		if (typeof optionalTitle !== 'undefined')
			title += " {" + optionalTitle.toUpperCase() + "}"

		util.ConsoleService.logStringMessage(title + " " + this.logTime() + "\n"+ msg);
	},

	// flags
	// errorFlag		  0x0 	Error messages. A pseudo-flag for the default, error case.
	// warningFlag		0x1 	Warning messages.
	// exceptionFlag	0x2 	An exception was thrown for this case - exception-aware hosts can ignore this.
	// strictFlag 		0x4
	logError: function (aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags)
	{
		let consoleService = Components.classes["@mozilla.org/consoleservice;1"]
		                               .getService(Components.interfaces.nsIConsoleService),
		    aCategory = 'chrome javascript',
		    scriptError = Components.classes["@mozilla.org/scripterror;1"].createInstance(Components.interfaces.nsIScriptError);
		scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags, aCategory);
		consoleService.logMessage(scriptError);
    if (this.Application == 'Postbox') { // apparently logMessage is ignored here.
      this.logToConsole(aMessage, 'EXCEPTION in ' + aSourceName + ' @ line ' + aLineNumber + '\n');
    }
	} ,

	logException: function (aMessage, ex) {
		let stack = '';
		if (typeof ex.stack!='undefined')
			stack= ex.stack.replace("@","\n  ");

		let srcName = ex.fileName ? ex.fileName : "";
		this.logError(aMessage + "\n" + ex.message, srcName, stack, ex.lineNumber, 0, 0x1); // use warning flag, as this is an exception we caught ourselves
	} ,

	logDebug: function (msg) {
	  // to disable the standard debug log, turn off extensions.smartTemplate4.debug.default
		if (SmartTemplate4.Preferences.isDebug && SmartTemplate4.Preferences.isDebugOption('default'))
			this.logToConsole(msg);
	},

	logDebugOptional: function (optionString, msg) {
    let options = optionString.split(','); // allow multiple switches
    for (let i=0; i<options.length; i++) {
      let option = options[i];
      if (SmartTemplate4.Preferences.isDebugOption(option)) {
        this.logToConsole(msg, option);
        break; // only log once, in case multiple log switches are on
      }
    }
	},
	
	getTabInfoLength: function getTabInfoLength(tabmail) {
		if (tabmail.tabInfo)
		  return tabmail.tabInfo.length;
	  if (tabmail.tabOwners)
		  return tabmail.tabOwners.length;
		return null;
	} ,
	
	getTabInfoByIndex: function getTabInfoByIndex(tabmail, idx) {
		if (tabmail.tabInfo)
			return tabmail.tabInfo[idx];
		if (tabmail.tabOwners)
		  return tabmail.tabOwners[idx];
		return null;
	} ,
	
	getTabMode: function getTabMode(tab) {
	  if (tab.mode) {   // Tb / Sm
		  if (this.Application=='SeaMonkey' && (typeof tab.modeBits != 'undefined')) {
				const kTabShowFolderPane  = 1 << 0;
				const kTabShowMessagePane = 1 << 1;
				const kTabShowThreadPane  = 1 << 2;			
				// SM: maybe also check	tab.getAttribute("type")=='folder'
				// check for single message shown - SeaMonkey always uses 3pane!
				// so we return "single message mode" when folder tree is hidden (to avoid switching away from single message or conversation)
			  if ( (tab.modeBits & kTabShowMessagePane) 
             && 
             !(tab.modeBits & kTabShowFolderPane)) {
				  return 'message';
				}
			}
			return tab.mode.name;
		}
		if (tab.type)  // Pb
		  return tab.type;
		return "";
	},
	
	getBaseURI: function baseURI(URL) {
		let hashPos = URL.indexOf('#'),
				queryPos = URL.indexOf('?'),
				baseURL = URL;
				
		if (hashPos>0)
			baseURL = URL.substr(0, hashPos);
		else if (queryPos>0)
			baseURL = URL.substr(0, queryPos);
		if (baseURL.endsWith('/'))
			return baseURL.substr(0, baseURL.length-1); // match "x.com" with "x.com/"
		return baseURL;		
	} ,
	
	findMailTab: function findMailTab(tabmail, URL) {
		const util = SmartTemplate4.Util;
		// mail: tabmail.tabInfo[n].browser		
		let baseURL = util.getBaseURI(URL),
				numTabs = util.getTabInfoLength(tabmail);
		
		for (let i = 0; i < numTabs; i++) {
			let info = util.getTabInfoByIndex(tabmail, i);
			if (info.browser && info.browser.currentURI) {
				let tabUri = util.getBaseURI(info.browser.currentURI.spec);
				if (tabUri == baseURL) {
					tabmail.switchToTab(i);
					info.browser.loadURI(URL);
					return true;
				}
			}
		}
		return false;
	} ,	
	

	// dedicated function for email clients which don't support tabs
	// and for secured pages (donation page).
	openLinkInBrowserForced: function(linkURI) {
		const Ci = Components.interfaces,
		      Cc = Components.classes,
		      util = SmartTemplate4.Util;
		try {
			this.logDebug("openLinkInBrowserForced (" + linkURI + ")");
			linkURI = util.makeUriPremium(linkURI);
			if (util.Application==='SeaMonkey') {
				let windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator),
				    browserWin = windowManager.getMostRecentWindow( "navigator:browser" );
				if (browserWin) {
					let URI = linkURI;
					browserWin.setTimeout(
						function sm_openBrowser() {  
					    let browser = browserWin.getBrowser();
							browser.selectedTab = browser.addTab(URI); 
							if (browser.selectedTab.reload) 
								browser.selectedTab.reload(); 
							browserWin.focus();
						}, 
						250
					);
					
				}
				else {
					this.Mail3PaneWindow.window.openDialog(getBrowserURL(), "_blank", "all,dialog=no", linkURI, null, 'SmartTemplate4');
				}

				return;
			}
			let service = Cc["@mozilla.org/uriloader/external-protocol-service;1"].getService(Ci.nsIExternalProtocolService),
			    ioservice = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
			    uri = ioservice.newURI(linkURI, null, null);
			service.loadURI(uri);
		}
		catch(e) { this.logDebug("openLinkInBrowserForced (" + linkURI + ") " + e.toString()); }
	},


	// moved from options.js
	// use this to follow a href that did not trigger the browser to open (from a XUL file)
	openLinkInBrowser: function(evt, linkURI) {
		const Cc = Components.classes,
		      Ci = Components.interfaces,
					util = SmartTemplate4.Util;
		if (util.Application === 'Thunderbird') {
			let service = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
				.getService(Ci.nsIExternalProtocolService);
			let ioservice = Cc["@mozilla.org/network/io-service;1"].
						getService(Ci.nsIIOService);
			service.loadURI(ioservice.newURI(util.makeUriPremium(linkURI), null, null));
			
			if(null !== evt)
				evt.stopPropagation();
		}
		else {
			this.openLinkInBrowserForced(linkURI);
		}
	},

	// moved from options.js (then called
	openURL: function(evt,URL) { // workaround for a bug in TB3 that causes href's not be followed anymore.
		const util = SmartTemplate4.Util;
		let ioservice, iuri, eps;

		if (util.Application==='SeaMonkey' || util.Application==='Postbox')
		{
			util.openLinkInBrowserForced(util.makeUriPremium(URL));
			if(null!=evt) evt.stopPropagation();
		}
		else {
			if (util.openURLInTab(URL) && null!=evt) {
				if (evt.preventDefault)  evt.preventDefault();
				if (evt.stopPropagation)	evt.stopPropagation();
			}
		}
	},

	openURLInTab: function (URL) {
		const util = SmartTemplate4.Util;
		try {
			if (this.Application!='Thunderbird') {
				this.openLinkInBrowserForced(URL);
				return true;
			}
			
			let sTabMode="",
			    tabmail;
			URL = util.makeUriPremium(URL);
			
			tabmail = document.getElementById("tabmail");
			if (!tabmail) {
				// Try opening new tabs in an existing 3pane window
				let mail3PaneWindow = this.Mail3PaneWindow;
				if (mail3PaneWindow) {
					tabmail = mail3PaneWindow.document.getElementById("tabmail");
					mail3PaneWindow.focus();
				}
			}
			// note: findMailTab will activate the tab if it is already open
			if (tabmail) {
				if (!util.findMailTab(tabmail, URL)) {
					sTabMode = (util.Application === "Thunderbird") ? "contentTab" : "3pane";
					tabmail.openTab(sTabMode,
					{contentPage: URL, clickHandler: "specialTabs.siteClickHandler(event, SmartTemplate4_TabURIregexp._thunderbirdRegExp);"});
				}
			}
			else {
				window.openDialog("chrome://messenger/content/", 
				  "_blank", 
					"chrome,dialog=no,all", 
					null,
					{ tabType: "contentTab", 
					  tabParams: {contentPage: URL, clickHandler: "specialTabs.siteClickHandler(event, SmartTemplate4_TabURIregexp._thunderbirdRegExp);", id:"gSmartTemplate_Weblink"} 
					} 
				);
			}
		}
		catch(e) {
			util.logException('openURLInTab(' + URL + ')', e);
			return false;
		}
		return true;
	} ,

	versionGreaterOrEqual: function(a, b) {
		/*
			Compares Application Versions
			returns
			- is smaller than 0, then A < B
			-  equals 0 then Version, then A==B
			- is bigger than 0, then A > B
		*/
		let versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
														.getService(Components.interfaces.nsIVersionComparator);
		return (versionComparator.compare(a, b) >= 0);
	} ,

	versionSmaller: function(a, b) {
		/*
			Compares Application Versions
			returns
			- is smaller than 0, then A < B
			-  equals 0 then Version, then A==B
			- is bigger than 0, then A > B
		*/
		let versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
														.getService(Components.interfaces.nsIVersionComparator);
		 return (versionComparator.compare(a, b) < 0);
	} ,


	showVersionHistory: function(ask) {
		let mainWindow = SmartTemplate4.Util.Mail3PaneWindow,
		    util = mainWindow.SmartTemplate4.Util,
		    version = util.VersionSanitized,
		    sPrompt = util.getBundleString("SmartTemplate4.confirmVersionLink", "Display the change log?")+" [version {1}]";
		sPrompt = sPrompt.replace("{1}", version);
		if (!ask || confirm(sPrompt)) {
			util.openURL(null, util.VersionPage + "#" + version);
			return true;
		}
		return false;
	} ,

	showBugsAndFeaturesPage: function() {
		SmartTemplate4.Util.openURLInTab(this.BugPage);
	} ,

	showLicensePage: function () { SmartTemplate4.Util.openURLInTab(this.LicensePage); } ,
	showHomePage: function () { SmartTemplate4.Util.openURLInTab(this.AMOHomepage); } ,
	showSupportPage: function () { SmartTemplate4.Util.openURLInTab(this.SupportHomepage); window.close();} ,
	showYouTubePage: function () { SmartTemplate4.Util.openLinkInBrowserForced(this.YouTubePage); } ,
	showAxelAMOPage: function () { SmartTemplate4.Util.openURLInTab(this.AxelAMOPage); } ,
	showMarkyAMOPage: function () { SmartTemplate4.Util.openURLInTab(this.MarkyAMOPage); } ,
	showArisAMOPage: function () { SmartTemplate4.Util.openURLInTab(this.ArisAMOPage); } ,
	showTool8AMOPage: function () { SmartTemplate4.Util.openURLInTab(this.Tool8AMOPage); } ,
	showNoiaHomepage: function () { SmartTemplate4.Util.openURLInTab(this.NoiaHomepage); } ,
	showFlagsHomepage: function () { SmartTemplate4.Util.openURLInTab(this.FlagsHomepage); } ,
	showStationeryPage: function () { SmartTemplate4.Util.openURLInTab(this.StationeryPage); } ,
	showStationeryWarning: function(win) {
		let noStationery = this.getBundleString("SmartTemplate4.notification.noStationery", 
		  "Could not find Stationery - is Stationery installed?");
		let warnText = noStationery,
				txtSuggestion = this.getBundleString("SmartTemplate4.fileTemplates.replaceStationery",
				"From Thunderbird 68 onward, unfortunately Stationery does not work anymore.\n"
				+ "Therefore SmartTemplate⁴ now offers its own HTML template management system; click Ok to set it up.");
		SmartTemplate4.Message.display(
			warnText  + "\n" + txtSuggestion,
			"centerscreen,titlebar",
			{ ok: function() {
				  if (!win) {
						// open ST4 options with the file templates panel open:
						let win = SmartTemplate4.Util.Mail3PaneWindow,
								params = {inn:{mode:"fileTemplates",tab:-1, message: "", instance: win.SmartTemplate4}, out:null};
						// open options and open the last tab!
						// first param = identity (not set, unimportant)
						// second param = mode to open correct setting 
						win.openDialog('chrome://smarttemplate4/content/settings.xul',
								'Preferences','chrome,titlebar,centerscreen,dependent,resizable,alwaysRaised ',
								null,
								params).focus();
					}
					else {
						// select from dropdown + open file templates
						let idMenu = document.getElementById("msgIdentity");
						if (idMenu)
							idMenu.selectedIndex = 1;
						SmartTemplate4.Settings.switchIdentity("fileTemplates");
					}
				},
				cancel: function() { ;/* cancel NOP */ }
			}
			, win
		);			
		
	},
	showStationerySettings: function () {
		let win = this.Mail3PaneWindow;
		if (win.Stationery)
			win.Stationery.showOptions(win);
		else {
			this.showStationeryWarning(window);
		}
	},
	showStationeryHelpPage: function () { SmartTemplate4.Util.openURLInTab(this.StationeryHelpPage); } ,
	showBeniBelaHomepage: function () { SmartTemplate4.Util.openURLInTab(this.BeniBelaHomepage); } ,
	showPremiumFeatures: function () { SmartTemplate4.Util.openURLInTab(this.PremiumFeaturesPage); } ,
	

	showAboutConfig: function(clickedElement, filter) {
		const name = "Preferences:ConfigManager";
		const uri = "chrome://global/content/config.xul";

		let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		let w = mediator.getMostRecentWindow(name);
		// parent window
		let win = (clickedElement && clickedElement.ownerDocument && clickedElement.ownerDocument.defaultView)
         		? clickedElement.ownerDocument.defaultView 
						: window;

		if (!w) {
			let watcher = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
			w = watcher.openWindow(win, uri, name, "chrome,resizable,centerscreen,width=600px,height=350px", null);
		}
		w.focus();
    w.addEventListener('load', 
      function () {
        let flt = w.document.getElementById("textbox");
        if (flt) {
          flt.value=filter;
          // make filter box readonly to prevent damage!
					flt.setAttribute('readonly',true);
          if (w.self.FilterPrefs) {
            w.self.FilterPrefs();
          }
        }
      });
	} ,

	displayNotAllowedMessage: function(reservedWord) {
		let strBndlSvc = Components.classes["@mozilla.org/intl/stringbundle;1"].
			 getService(Components.interfaces.nsIStringBundleService);
		// wrap variable in % but only if necessary
		let decoratedWord =
			((reservedWord[0] != '%') ? '%' : '')
			+ reservedWord
			+ ((reservedWord[reservedWord.length - 1] != '%') ? '%' : '');

		let bundle = strBndlSvc.createBundle("chrome://smarttemplate4/locale/messages.properties");
		let ErrorString1 = '';
		try{
			//try writing an error to the Error Console using the localized string; if it fails write it in English
			ErrorString1 = bundle.GetStringFromName("contextError");
		} catch (e) {
			ErrorString1 = bundle.GetStringFromName("The Variable {1} can not be used for *new* messages!\nPlease refer to help for a list of permitted variables");
		}
		let errorText = ErrorString1.replace("{1}", decoratedWord);

		SmartTemplate4.Message.display(errorText,
		                              "centerscreen,titlebar",
		                              { ok: function() { ; }}
		);
		this.logDebug (errorText);
	} ,

/**
* Returns the week number for this date. dowOffset is the day of week the week
* "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
* the week returned is the ISO 8601 week number.
* @param int dowOffset
* @return int
*/
	getIsoWeek : function (tm, dowOffset) {
	/*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.epoch-calendar.com */
		if (!tm) {
			return ("No valid time passed to getIsoWeek!");
		}
		if (isNaN(dowOffset)) {
			return ("cwIso(offset) needs a number as offset! e.g. cwIso(0)");
		}
		SmartTemplate4.Util.logDebugOptional('functions', 'Util.getIsoWeek(' + tm + ', ' + dowOffset + ')');

		dowOffset = typeof(dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero

		let newYear = new Date(tm.getFullYear(),0,1);
		let day = newYear.getDay() - dowOffset; //the day of week the year begins on
		day = (day >= 0 ? day : day + 7);
		let daynum = Math.floor((tm.getTime() - newYear.getTime() -
		             (tm.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
		let weeknum;
		//if the year starts before the middle of a week
		if(day < 4) {
			weeknum = Math.floor((daynum+day-1)/7) + 1;
			if(weeknum > 52) {
				let nYear = new Date(tm.getFullYear() + 1,0,1);
				let nday = nYear.getDay() - dowOffset;
				nday = nday >= 0 ? nday : nday + 7;
				/*if the next year starts before the middle of
				the week, it is week #1 of that year*/
				weeknum = nday < 4 ? 1 : 53;
			}
		}
		else {
			weeknum = Math.floor((daynum+day-1)/7);
		}
		SmartTemplate4.Util.logDebugOptional('functions', 'Util.getIsoWeek() returns weeknum: ' + weeknum);
		return weeknum;
	},
	
  // moved from settings diaLog as there were problems calling this on program start
	cancelConvert : function() {
		// conversion routine to 0.9 was cancelled
		// user will have to create new settings from scratch!
		// this is a dummy function, it doesn't do anything
	} ,
	
	// convert a extension.smarttemplate. setting to an extension.smartTemplate4. one
	convertPrefValue : function (oldPrefName, test, realString) {
		let converted = true,
		    debugText = "";
		debugText += 'CONVERT: ' + oldPrefName;
		
		let thePreference = realString ? realString : SmartTemplate4.Settings.getPref(oldPrefName),
		    newPrefString = oldPrefName.indexOf('smarttemplate.id') > 0 ?
		                    oldPrefName.replace('smarttemplate', 'smartTemplate4') :
		                    oldPrefName.replace('smarttemplate', 'smartTemplate4.common');

		debugText += ' => ' + newPrefString + '\n';
		SmartTemplate4.Settings.setPref(newPrefString, thePreference);
		switch (typeof thePreference) {
			case 'string':
				if (thePreference.indexOf('{')>0 || thePreference.indexOf('}')>0) {
					convertedBracketExpressions++;
					// hmmmffff....
					thePreference = thePreference
					                .replace("\{","[[").replace("{","[[")
					                .replace("\}","]]").replace("}","]]");
					debugText += '\nbracketed conversion:\n:   ' + thePreference;
				}
				if (test) 
					alert(newPrefString + "\n" + thePreference);
				else
					SmartTemplate4.Settings.prefService.setCharPref(newPrefString, thePreference);
				break;
			case 'number':
				SmartTemplate4.Settings.prefService.setIntPref(newPrefString, thePreference);
				break;
			case 'boolean':
				SmartTemplate4.Settings.prefService.setBoolPref(newPrefString, thePreference);
				break;
			default:
				converted = false;
				break;
		}
		SmartTemplate4.Util.logDebug(debugText);
		return converted;
	},

	convertOldPrefs : function() {
		let countConverted = 0,
		    convertedBracketExpressions = 0;
		SmartTemplate4.Util.logDebug('CONVERSION OF OLD SMARTTEMPLATE PREFERENCES');

		try {
			let array = SmartTemplate4.Settings.prefService.getChildList("extensions.smarttemplate.", {});

			// AG new: import settings to new format
			for (var i in array) {

				let oldPrefName = array[i];
				if (this.convertPrefValue(oldPrefName))
					countConverted ++;
				
				// keep a backup, for now ??
				// this.prefService.deleteBranch(array[i]);
			}
		}
		catch (ex) {
			SmartTemplate4.Util.logException("convertOldPrefs failed: ", ex);
		}
		if (countConverted)
			SmartTemplate4.Settings.prefService.setIntPref("extensions.smartTemplate4.conversions.total", countConverted);
		if (convertedBracketExpressions)
			SmartTemplate4.Settings.prefService.setIntPref("extensions.smartTemplate4.conversions.curlyBrackets", convertedBracketExpressions);

	},

	isFormatLink : function(format) {
    if (!format) return false;
    if (format.charAt(0)=='(')
      format = format.slice(1);
    if (format.charAt(format.length-1)==')')
      format = format.slice(0, -1);
    
    let fs = format.split(',');
	  return (fs.indexOf('link') != -1);
	} ,
	
	getServerInfo: function(idKey) {
		let Ci = Components.interfaces;
		let serverInfo = '';
		try {
			let account = null,
			    acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]  
														.getService(Ci.nsIMsgAccountManager),  
			    accounts = acctMgr.accounts,
			    iAccounts = (typeof accounts.Count === 'undefined') ? accounts.length : accounts.Count();
			for (let i = 0; i < iAccounts; i++) {
				account = accounts.queryElementAt ?
					accounts.queryElementAt(i, Ci.nsIMsgAccount) :
					accounts.GetElementAt(i).QueryInterface(Ci.nsIMsgAccount);
				if (account.defaultIdentity && account.defaultIdentity.key == idKey)
					break;
			}
			let srv = account ? account.incomingServer : null;
			serverInfo = srv ? 'server{?}:      ' + srv.hostName + ' [' + srv.type + ']' + '\n ': '';
		}
		catch(ex) { this.logException("could not find server for identity " + idKey , ex); }
    return serverInfo;
  },

	getSignatureInner: function(sig, isRemoveDashes) {
		function removeDashes(elem, isPlainText) {
			// also fix removing dashes from plain text sig:
			if (isPlainText) {
				return elem.replace('-- \<br\>', '');
			}
		
			// [Bug 25483] when using %sig(2)% signature is missing on new mails in HTML mode
			let newSig = elem;
			if (elem.childNodes.length) {
				if (elem.childNodes.length == 1)
					newSig = removeDashes(elem.firstChild);
				else {
					if (elem.firstChild.nodeValue == "-- ") {
						elem.removeChild(elem.firstChild); //remove '-- '
					}
					if (elem.firstChild.tagName == 'BR') {
						elem.removeChild(elem.firstChild); //remove 'BR'
					}
				}
			}
			return newSig;
		}
		// the actual function
		const util = SmartTemplate4.Util;
		try {
			util.logDebugOptional('regularize','getSignatureInner(' + isRemoveDashes + ')');
			if (sig != null) {
				SmartTemplate4.sigInTemplate = true;
				if (typeof sig === "string")
					return isRemoveDashes ? removeDashes(sig, true) : sig;
					
				if (!sig.children || sig.children.length==0) {
					util.logDebugOptional('regularize','getSignatureInner(): signature has no child relements.');

					return sig.innerHTML ? sig.innerHTML : 
                 (sig.outerHTML ? sig.outerHTML : '');  // deal with DOM String sig (non html)
				}
				if (isRemoveDashes) {
				  removeDashes(sig, false);
				}
				return sig.innerHTML;
			}
		}
		catch(ex) {
			util.logException('regularize.getSignatureInner() failed', ex);
		}
		return "";
	} ,
	
	// returns a list of available locales for a given package
	getAvailableLocales: function(packageName) {
		let chromeRegService = Components.classes["@mozilla.org/chrome/chrome-registry;1"].getService();
		let toolkitChromeReg = chromeRegService.QueryInterface(Components.interfaces.nsIToolkitChromeRegistry);
		let availableLocales = toolkitChromeReg.getLocalesForPackage(packageName); 
		return availableLocales;
	},
  
  toTitleCase: function toTitleCase(str) { // international version.
    let orig = str;
    try {
      let words = str.split(' ');
          
      for (let i=0; i<words.length; i++) {
        let word = words[i],
            findw = 0;
        while ("\\\"\'\{\[\(\)".indexOf(word.charAt(findw))>=0 && findw<word.length) {
          findw++; // skip these characters, so we hit alphabetics again
        }
        // Titlecase and re-append to Array
        words[i] = word.substring(0, findw)
                       .concat(word.charAt(findw).toLocaleUpperCase())
                       .concat(word.substring(findw + 1).toLocaleLowerCase());
      }
      str = words.join(' ');
      return str;
    }
    catch(ex) {
      this.logException ("toTitleCase(" + orig + ") failed", ex);
      return orig;
    }
  } ,
	
  unquotedRegex: function unquotedRegex(s, global) {
		let quoteLess = s.substring(1, s.length-1);
	  if (global)
			return new RegExp( quoteLess, 'ig');
		return quoteLess;
	} ,
	
	// see MsgComposeCommands, loadBlockedImage()
	getFileAsDataURI : function getFileAsDataURI(aURL) {
		const prefs = SmartTemplate4.Preferences,
		      util = SmartTemplate4.Util,
					Ci = Components.interfaces,
		      Cc = Components.classes;
    let filename = aURL.substr(aURL.lastIndexOf("/") + 1);
    filename = decodeURIComponent(filename);
		util.logDebugOptional('images',"getFileAsDataURI()\nfilename=" + filename);
		
		var { Services } =
			ChromeUtils.import ?
			ChromeUtils.import('resource://gre/modules/Services.jsm') :
			Components.utils.import('resource://gre/modules/Services.jsm');
		
    let url = Services.io.newURI(aURL), // , null, null
        contentType = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).getTypeFromURI(url);
    if (!contentType.startsWith("image/")) {
			util.logDebugOptional('images',"getFileAsDataURI()\nthe file is not an image\ncontentType = " + contentType);
			// non-image content-type; let Thunderbird show a warning after insertion
			return aURL;
    }

		try {
			let LoadInfoFlags, channel;
			
			if (Services.io.newChannelFromURI2) { // Thunderbird 60 + older
				url = url.QueryInterface(Ci.nsIURL);
				//  Allow loads from any origin, but require CORS for cross-origin loads.
				LoadInfoFlags = Ci.nsILoadInfo.SEC_REQUIRE_CORS_DATA_INHERITS; // SEC_NORMAL  was removed
			  channel = 
					  Services.io.newChannelFromURI2(url, null, Services.scriptSecurityManager.getSystemPrincipal(), null, LoadInfoFlags, Ci.nsIContentPolicy.TYPE_OTHER);
			}
			else { // Thunderbird 68 + 
				LoadInfoFlags = Ci.nsILoadInfo.SEC_NORMAL | Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL;
			  channel = 
					  Services.io.newChannelFromURI(url, null, Services.scriptSecurityManager.getSystemPrincipal(), null, LoadInfoFlags, Ci.nsIContentPolicy.TYPE_OTHER);
			}
			let stream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
			stream.setInputStream(channel.open());
			util.logDebugOptional('images',"opening image stream...");
			let encoded = btoa(stream.readBytes(stream.available()));
			stream.close();
			let encodedFileName = filename ? encodeURIComponent(filename) : "";
			util.logDebugOptional('images',"stream read. Adding data, including encoded filename part: " + encodedFileName);
			return "data:" + contentType + (filename ? ";filename=" + encodedFileName : "") + ";base64," + encoded;
		}
		catch (ex) {
			this.logToConsole("could not decode file: " + filename + "\n" + ex.toString());
			return aURL;
		}
  } ,
	
  hasLicense: function hasLicense(reset) {
		const util = SmartTemplate4.Util,
					licenser = util.Licenser;
		function withLog(result) { // returns value but logs it first.
			util.logDebugOptional("premium.licenser", "util.hasLicense = " + result);
			return result;
		}
    // early exit for Licensed copies
    if (licenser.isValidated) {
      return withLog(true);
		}
    // short circuit if we already validated:
    if (!reset && licenser.wasValidityTested) {
      return withLog(licenser.isValidated);
		}
		
    let licenseKey = SmartTemplate4.Preferences.getStringPref('LicenseKey');
    if (!licenseKey) {
			return withLog(false); // short circuit if no license key!
		}
		
		// ======================================
    if (!licenser.isValidated || reset) {
      licenser.wasValidityTested = false;
			let validate = licenser.validateLicense.bind(SmartTemplate4.Util.Licenser);
      validate(licenseKey);
    }
    if (licenser.isValidated) {
			return withLog(true);
		}
    return withLog(false);
  } ,
	
	get hasStandardLicense() {
		const util = SmartTemplate4.Util,
					licenser = util.Licenser;
    if (licenser.isValidated) {
			let result = (licenser.key_type==2);
			util.logDebugOptional("premium.licenser", "util.hasStandardLicense = " + result);
			return result; // standard license - true 
			                               // pro / domain license - false
		}
		return false;
		
	}, 
	
	// appends user=pro OR user=proRenew if user has a valid / expired license
	makeUriPremium: function makeUriPremium(URL) {
		const util = SmartTemplate4.Util,
					isPremiumLicense = util.hasLicense(false),
					isExpired = util.Licenser.isExpired;
		try {
			let uType = "";
			if (isExpired) 
				uType = "proRenew"
			else if (isPremiumLicense)
			  uType = "pro";
			// make sure we can sanitize all pages for our premium users!
			if (   uType
			    && URL.indexOf("user=")==-1 
					&& URL.indexOf("smarttemplate4.mozdev.org")>0 ) {
				// remove #NAMED anchors
				let x = URL.indexOf("#"),
				    anchor = '';
				if (x>0) {
					anchor = URL.substr(x);
					URL = URL.substr(0, x)
				}
				if (URL.indexOf("?")==-1)
					URL = URL + "?user=" + uType;
				else
					URL = URL + "&user=" + uType;
				URL = URL + anchor;
			}
		}
		catch(ex) {
		}
		finally {
			return URL;
		}
	} ,
  
	viewLicense: function viewLicense() {
		let win = SmartTemplate4.Util.Mail3PaneWindow,
        params = {inn:{mode:"licenseKey",tab:-1, message: "", instance: win.SmartTemplate4}, out:null};
		// open options and open the last tab!
		// first param = identity (not set, unimportant)
		// second param = mode to open correct setting 
    win.openDialog('chrome://smarttemplate4/content/settings.xul',
				'Preferences','chrome,titlebar,centerscreen,dependent,resizable,alwaysRaised ',
				null,
				params).focus();
	}	,
	
  /** 
	* getAccountsPostbox() return an Array of mail Accounts for Postbox
	*/   
	getAccountsPostbox: function getAccountsPostbox() {
	  let accounts=[],
        actManager = this.Mail3PaneWindow.accountManager,
        Ci = Components.interfaces,
		    smartServers = actManager.allSmartServers;
		for (let i = 0; i < smartServers.Count(); i++) {
			let smartServer = smartServers.QueryElementAt(i, Ci.nsIMsgIncomingServer),
			    account_groups = smartServer.getCharValue("group_accounts");
			if (account_groups) {
				let groups = account_groups.split(",");
				for (let k=0; k<groups.length; k++) {
          let account = actManager.getAccount(groups[k]); // groups returns accountkey
					if (account) {
						accounts.push(account);
					}
				}
			}
		}
		return accounts;
	} ,
	
  // safe wrapper to get member from account.identities array
  getIdentityByIndex: function getIdentityByIndex(ids, index) {
    const Ci = Components.interfaces;
    if (!ids) return null;
    try {
      if (ids.queryElementAt) {
        return ids.queryElementAt(index, Ci.nsIMsgIdentity);
      }
      if (ids.QueryElementAt) {  // Postbox
        return ids.QueryElementAt(index, Ci.nsIMsgIdentity);
      }
      return null;
    }
    catch(ex) {
      SmartTemplate4.Util.logDebug('Exception in getIdentityByIndex(ids,' + index + ') \n' + ex.toString());
    }
    return null;
  } ,	
	
	// HTML only:
	// headers that are currently not defined may be filled later.
	// e.g. adding a To address when writing a new email
	wrapDeferredHeader : function wrapDeferredHeader(field, defaultValue, isHtml, isComposeNew) {
		
		const prefs = SmartTemplate4.Preferences,
		      util = SmartTemplate4.Util;
		if (prefs.isDebugOption("tokens.deferred")) debugger;
		
		let newComposeClass = isComposeNew ? " class='noWrite'" : ""; /* make field look pink for headers that are not available in New Emails */
		if (!isHtml) return defaultValue; // not supported in plain text for now
		
		SmartTemplate4.hasDeferredVars = true;
		
		if (!defaultValue) {  //  || defaultValue=='??'
			defaultValue = field;  // show the syntax of placeholder (without percent signs!)
		}
			
		// Add variables in "Write" window to standard features!
    // util.popupLicenseNotification("Wrap_Deferred_Variables", true, true, "%" + field + "%");
		field = field.replace(/%/g,'');
		let tag = "<smarttemplate" +
					 " hdr='" + field + "'" +
					 " st4variable='" + field + "'" +
					 " title='" + field + "'" +
					 newComposeClass + 
					 ">" + defaultValue + "</smarttemplate>";
					 
		return tag;
	} ,
	
	// should be called when email is sent
	composerSendMessage : function composerSendMessage (evt) {
		const Ci = Components.interfaces,
		      util = SmartTemplate4.Util,
		      msgComposeType = Ci.nsIMsgCompType,
					nsIMsgCompDeliverMode = Ci.nsIMsgCompDeliverMode;
					
		let msgType = window.document.getElementById("msgcomposeWindow").getAttribute("msgtype");
		util.logDebug('composerSendMessage() - msgType=' + msgType);
		
		if (msgType == nsIMsgCompDeliverMode.Now || msgType == nsIMsgCompDeliverMode.Background || msgType == nsIMsgCompDeliverMode.Later) {
			// is SmartTemplate4.classSmartTemplate.composeType == '', 'new', 'rsp', 'fwd'
			switch (gMsgCompose.type) {
				case msgComposeType.New:
				case msgComposeType.NewsPost:
				case msgComposeType.MailToUrl:
				// [Bug 26632] Using %dateformat% in reply / forward: deferred fields are not automatically tidied up
				case msgComposeType.Reply:
				case msgComposeType.ReplyAll:
				case msgComposeType.ReplyToSender:
				case msgComposeType.ReplyToGroup:
				case msgComposeType.ReplyToSenderAndGroup:
				case msgComposeType.ReplyToList:
				case msgComposeType.ForwardAsAttachment:
				case msgComposeType.ForwardInline:
					util.cleanupDeferredFields();
					break;
				default:
					return;
			}
		}
		
	} ,
	
	cleanupDeferredFields : function cleanupDeferredFields() {
		const prefs = SmartTemplate4.Preferences,
		      util = SmartTemplate4.Util,
					editor = gMsgCompose.editor;
		let body = editor.rootElement,
		    el = body,
				treeWalker = editor.document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT),
				nodeList = [];
				
		util.logDebug('cleanupDeferredFields()');
		while(treeWalker.nextNode()) {
			let node = treeWalker.currentNode;
			if (node.tagName && node.tagName.toLowerCase()=='smarttemplate') {
				util.resolveDeferred(editor, node, true, nodeList); 
			}
		}	
		
		// replace all divs (working backwards.)
		while (nodeList.length) {
			let nL = nodeList.pop();
			nL.divNode.parentNode.insertBefore(nL.txtNode, nL.divNode);
			editor.deleteNode(nL.divNode);
		}
	} ,
	
	resolveDeferred: function st4_resolveDeferred(editor, el, isReplaceField, nodeList) {
		const util = SmartTemplate4.Util,
		      Ci = Components.interfaces,
		      Cc = Components.classes;
		let div = el,
				st4 = div.getAttribute('st4variable'),
				alreadyResolved = (el.className == 'resolved'), // for removing _all_ smarttemplate divs
				resolved = false,
				tm;
		function getAddressingWidget() {
      if (typeof GetMsgAddressingWidgetTreeElement == 'function')
				return GetMsgAddressingWidgetTreeElement(); // returns #addressingWidgetTree
			return GetMsgAddressingWidgetElement();  // legacy, SeaMonkey fallback, gets #addressingWidget
		}
				
		if (st4) {
			// isReplaceField is the final call where the deferred smarttemplate element is removed.
			// it's false when we click on the element (manual) so that we can refresh the content
			// multiple times
			if(!alreadyResolved || !isReplaceField) {
				let parensPos = st4.indexOf('('),
						generalFunction = (parensPos==-1) ? st4 : st4.substr(0,parensPos),
						argList = (parensPos==-1) ? "" : st4.match(/([\w-:=]+)\(([^)]+)\)*/);
				if (!generalFunction.length)
					return;
				// util.logDebugOptional('resolveDeferred','matched variable [' + i + ']: ' + matchPart[i]);
				let args=(argList.length<2) ? [] : argList[2].split(',');
				
				// 1st group: name of st4 variable, e.g. subject
				if (generalFunction=='date')
					generalFunction = 'dateshort';
				if (generalFunction=='identity')
					generalFunction = 'from';
				switch(generalFunction) {
					case 'subject':
						let sub = GetMsgSubjectElement();
						if (sub.value) {
							el.innerText = sub.value;
							resolved = true;
						}
						break;
					case 'from':  // fall through
					case 'to':    // fall through
					case 'cc':    // fall through
					case 'bcc':
						let aw = getAddressingWidget(),
								identityList = GetMsgIdentityElement(),
								messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
								charset = null,
								addressValue; // messenger.msgHdrFromURI(gMsgCompose.originalMsgURI).Charset;
						
						if(generalFunction=='from')
							addressValue = identityList.value;
						else {
							// first column of widget:  addr_to, addr_bss, addr_bcc
							for (let i=1; i<aw.getRowCount(); i++) {
								let id = 'addressCol1#' + i;
								if (document.getElementById(id) && document.getElementById(id).value == 'addr_' + generalFunction) {
									id = 'addressCol2#' + i;
									addressValue = document.getElementById(id).value;
									break;
								}
							}
						}
						
						if (addressValue) {
							let token = SmartTemplate4.mimeDecoder.split(addressValue, charset, argList[2], true);
							// if nothing is returned by mime decoder (e.g. empty name) we do not resolve the variable
							if (token || isReplaceField) {
								el.innerText = token;
								resolved = true;
							}
						}
						
						break;
					case 'dateformat':
						tm = new Date();
						el.innerText = util.dateFormat(tm.getTime() * 1000, argList[2], 0);
						resolved = true;
						break;
					case "datelocal":  // fall through
					case "dateshort":
						tm = new Date(), 
						el.innerText = util.prTime2Str(tm.getTime() * 1000, generalFunction, 0);
						resolved = true;
						break;
					default:
						alert('NOT SUPPORTED: Replace deferred smartTemplate variable: %' + generalFunction + '%');
						break;
				}
			}
			
			if (alreadyResolved || resolved) {
				if (isReplaceField) {
					// called from "clean up all button"
					let txtNode = editor.document.createTextNode(el.innerText);
					if (nodeList) {
						// create an array of elements that will be replaced.
						// (can't do DOM replacements during the treeWalker)
						// replace div with a text node.
						nodeList.push ( { txtNode:txtNode, divNode: el } );
					}
					else { // called from context menu: remove the field and replace with content
						el.parentNode.insertBefore(txtNode, el);
						editor.deleteNode(el);
					}
				}
				else
					el.className = "resolved";
			}
		}
	} ,
	
	// add listeners for deferred variables (e.g. "from" in New Email)
	setupDeferredListeners: function st4_setupDeferredListeners(editor) {
		const prefs = SmartTemplate4.Preferences,
		      util = SmartTemplate4.Util;
		let body = editor.rootElement,
		    el = body,
				treeWalker = editor.document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
				
				
		while(treeWalker.nextNode()) {
			let node = treeWalker.currentNode;
			if (node.tagName && node.tagName.toLowerCase()=='smarttemplate') {
				// add a click handler
				node.addEventListener(
					"click", 
					function(event) { 
						util.resolveDeferred(editor, event.target, false); 
						return false; 
					}, 
					false
				);
				
				// add context menu
				node.addEventListener(
					"contextmenu", 
					function(event) { 
					  let st4element = event.originalTarget,
					      popup = document.getElementById('SmartTemplate4-ComposerPopup'); // button.ownerDocument.getElementById
						// document.popupNode = button
						// document.getElementById('msgcomposeWindow').ownerDocument.getElementById('SmartTemplate4-ComposerPopup')
						popup.targetNode = event.target;
						popup.openPopup(st4element,'after_start', 0, 0, true, false, event);
					  event.preventDefault();
						return false; 
					}, 
					false
				);
				
			}
		}
	},
	
	removeDeferred: function removeDeferred(item) {
		let par = item.parentNode;
		gMsgCompose.editor.selection;
		// just a hack to move the cursor: insert a space, select it then remove it again.
    let space = gMsgCompose.editor.document.createTextNode('\u00a0');
		if (par) {
			par.insertBefore(space, item); 
			par.removeChild(item);
		}
		editor.selection.selectAllChildren(space);
		editor.selection.collapseToStart()
		par.removeChild(space);
	},
	
	
	checkIsURLencoded: function checkIsURLencoded(tok) {
		if (tok.length>=4) {
			let t = tok.substr(1,2);
			if (/[0-9a-fA-F]+/.test(t)) {
				this.logDebug("checkIsURLencoded()\n" +
				  "I will ignore the following character sequence as not a SmartTemplate because it looks like an URL encoded sequence:\n" +
					tok)
				return true;
			}
		}
		this.logDebug("checkIsURLencoded()\nNot an encoded string, I believe this is a SmartTemplate⁴ header:\n" + tok);
		return false;
	}	,
	
	// new function for manually formatting a time / date string in one go.
	dateFormat: function dateFormat(time, timeFormat, timezone) {
		const util = SmartTemplate4.Util;
		util.logDebugOptional('timeStrings','dateFormat(' + time + ', ' + timeFormat + ', ' + timezone  +')\n' + 
		  'Forced Timezone[' + SmartTemplate4.whatIsTimezone + ']= ' + util.getTimezoneOffset(SmartTemplate4.whatIsTimezone));
		util.addUsedPremiumFunction('dateFormat');
		if (!timezone) timezone=0;
		try {
			let tm = new Date();
			
			if (SmartTemplate4.whatIsDateOffset) {
				time += (SmartTemplate4.whatIsDateOffset*24*60*60*1000*1000); // add n days
			}
			if (SmartTemplate4.whatIsHourOffset || SmartTemplate4.whatIsMinuteOffset ) {
				time += (SmartTemplate4.whatIsHourOffset*60*60*1000*1000)
				      + (SmartTemplate4.whatIsMinuteOffset*60*1000*1000); // add m hours / n minutes
			}		
			if (SmartTemplate4.whatIsTimezone) { // subtract UTC offset for timezone
			  let nativeUtcOffset = tm.getTimezoneOffset(),
			      forcedOffset = util.getTimezoneOffset(SmartTemplate4.whatIsTimezone)*60; // calculate minutes
				time = time + (nativeUtcOffset + forcedOffset)*60*1000*1000;
			}
			
			// Set Time - add Timezone offset
			tm.setTime(time / 1000 + (timezone) * 60 * 1000);
			let d02 = function(val) { return ("0" + val).replace(/.(..)/, "$1"); },
			    cal = SmartTemplate4.calendar,
			    isUTC = SmartTemplate4.whatIsUtc,
					year = isUTC ? tm.getUTCFullYear().toString() : tm.getFullYear().toString(),
					month = isUTC ? tm.getUTCMonth() : tm.getMonth(),
					day = isUTC ? tm.getUTCDate() : tm.getDate(),
					hour = isUTC ? tm.getUTCHours() : tm.getHours(),
					minute = isUTC ? tm.getUTCMinutes() : tm.getMinutes();
					
      //numeral replacements first					
			let timeString = 
			  timeFormat
					.replace('Y', year)
					.replace('y', year.slice(year.length-2))
					.replace('n', (month+1))
					.replace('m', d02(month+1))
					.replace('e', day)
					.replace('d', d02(day))
					.replace('k',     hour)
					.replace('H', d02(hour))
					.replace('l',    (((hour + 23) % 12) + 1))
					.replace('I', d02(((hour + 23) % 12) + 1))
					.replace('M', d02(minute))
					.replace('S', d02(tm.getSeconds()));
			
      // alphabetic-placeholders need to be inserted because otherwise we will replace
			// parts of day / monthnames etc.
			timeString=			
			  timeString
					.replace("tz_name", "##t")
					.replace('B', '##B')
					.replace('b', '##b')
				  .replace('A', '##A')
					.replace('a', '##a')
					.replace('p1', '##p1')
					.replace('p2', '##p2')
					.replace('p', '##p')
				
			timeString=
			  timeString
				  .replace('##t', isUTC ? 'UTC' : util.getTimeZoneAbbrev(tm, false))
					.replace('##B', cal.monthName(month))
					.replace('##b', cal.shortMonthName(month))
				  .replace('##A', cal.dayName(tm.getDay()))
					.replace('##a', cal.shortDayName(tm.getDay()))
					.replace('##p1', hour < 12 ? "a.m." : "p.m.")
					.replace('##p2', hour < 12 ? "A.M." : "P.M.")
					.replace('##p', hour < 12 ? "AM" : "PM")
					
					
			util.logDebugOptional('timeStrings', 'Created timeString: ' + timeString);
			return timeString;
			
		}
		catch (ex) {
			util.logException('util.dateFormat() failed', ex);
		}
		return '';
	} ,
	
	prTime2Str : function st4_prTime2Str(time, timeType, timezone) {
		const util = SmartTemplate4.Util,
					prefs = SmartTemplate4.Preferences;
		      Ci = Components.interfaces,
		      Cc = Components.classes;
		function getDateFormat(field) {
			return prefs.getStringPref("dateformat." + field);
		}
					
		util.logDebugOptional('timeStrings','prTime2Str(' + time + ', ' + timeType + ', ' + timezone + ')');
		try {
			let tm = new Date(),
					isOldDateFormat = (typeof Ci.nsIScriptableDateFormat !== "undefined"),
					fmt;
					
			if (isOldDateFormat) {
				// this interface was removed in Gecko 57.0
				fmt = Cc["@mozilla.org/intl/scriptabledateformat;1"].createInstance(Ci.nsIScriptableDateFormat);
			}
			else {
				// alternative date formatting
				// Cu.import("resource:///modules/ToLocaleFormat.jsm");
				// new Services.intl.
				let dateOptions = {
					hour12: false, // 24 hours
					hour: getDateFormat('hour'),
					minute: "2-digit",
					dateStyle: "full"
				};
				// { dateStyle: "full", timeStyle: "long" } - not documented!
				switch (timeType) {
					case "datelocal":
						// no change
						dateOptions.weekday = "long";
					  dateOptions.day = getDateFormat('day');
					  dateOptions.month = "short";
					  dateOptions.year = "numeric";
						break;
					case "dateshort":
					default:
					  dateOptions.day = getDateFormat('day');
					  dateOptions.month = getDateFormat('month');
					  dateOptions.year = getDateFormat('year');
						break;
				}
				let localeString = util.getLocalePref();
				fmt = new Intl.DateTimeFormat(localeString, dateOptions);
				util.logDebugOptional('timeStrings',"DateTimeFormat(" + localeString + ") resolved options: " + fmt.resolvedOptions());
			}
      
			if (SmartTemplate4.whatIsDateOffset) {
				time += (SmartTemplate4.whatIsDateOffset*24*60*60*1000*1000); // add n days
				util.logDebugOptional('timeStrings', "Adding " + SmartTemplate4.whatIsDateOffset + " days to time");
			}
			if (SmartTemplate4.whatIsHourOffset || SmartTemplate4.whatIsMinuteOffset ) {
				time += (SmartTemplate4.whatIsHourOffset*60*60*1000*1000)
				      + (SmartTemplate4.whatIsMinuteOffset*60*1000*1000); // add n days
				util.logDebugOptional('timeStrings', 
				  "Adding " + SmartTemplate4.whatIsHourOffset  + ":" + SmartTemplate4.whatIsMinuteOffset + " hours to time");
			}
			
			// Set Time - add Timezone offset
			let nativeUtcOffset = tm.getTimezoneOffset(),
			    forceTimeZone = SmartTemplate4.whatIsTimezone; // UTC offset for current time,  in minutes
			if (forceTimeZone)  {
				let forceHours = util.getTimezoneOffset(forceTimeZone);
				timezone = nativeUtcOffset + forceHours*60; // offset in minutes!
				util.logDebug("Adding timezone offsets:\n" +
				  "UTC Offset: " + nativeUtcOffset/60 + 
					"\nForced Timezone[" + forceTimeZone + "]: " + forceHours);
			}
			tm.setTime(time / 1000 + (timezone) * 60 * 1000);

			// Format date string
			let dateFormat = null,
			    timeFormat = null;

			
			let timeString;
			if (isOldDateFormat) {
				switch (timeType) {
					case "datelocal":
						dateFormat = fmt.dateFormatLong;
						timeFormat = fmt.timeFormatSeconds;
						break;
					case "dateshort":
					default:
						dateFormat = fmt.dateFormatShort;
						timeFormat = fmt.timeFormatSeconds;
						break;
				}
				timeString = fmt.FormatDateTime(SmartTemplate4.pref.getLocalePref(),
												dateFormat, 
												timeFormat,
												tm.getFullYear(), tm.getMonth() + 1, tm.getDate(),
												tm.getHours(), tm.getMinutes(), tm.getSeconds());
			}
			else
				timeString = fmt.format(tm)
			util.logDebugOptional('timeStrings', "Created timeString: " + timeString);
			return timeString;
		}
		catch (ex) {
			util.logException('util.prTime2Str() failed', ex);
		}
		return '';
	} ,

	zoneFromShort: function st4_zoneFromShort(short) {
		let timezones = {
			"ACDT" : "Australian Central Daylight Time",
			"ACST" : "Australian Central Standard Time",
			"ACT"	 : "ASEAN Common Time",
			"ADT"	 : "Atlantic Daylight Time",
			"AEDT" : "Australian Eastern Daylight Time",
			"AEST" : "Australian Eastern Standard Time",
			"AUS"  : "Australian Time",
			"AFT"	 : "Afghanistan Time",
			"AKDT" : "Alaska Daylight Time",
			"AKST" : "Alaska Standard Time",
			"AMST" : "Armenia Summer Time",
			"AMT"	 : "Armenia Time",
			"ART"	 : "Argentina Time",
			"AST"	 : "Atlantic Standard Time",
			"AWDT" : "Australian Western Daylight Time",
			"AWST" : "Australian Western Standard Time",
			"AZOST": "Azores Standard Time",
			"AZT"	 : "Azerbaijan Time",
			"BDT"	 : "Brunei Time",
			"BIOT" : "British Indian Ocean Time",
			"BIT"	 : "Baker Island Time",
			"BOT"	 : "Bolivia Time",
			"BRT"	 : "Brasilia Time",
			"BST"	 : "British Summer Time (British Standard Time from Feb 1968 to Oct 1971)",
			"BTT"	 : "Bhutan Time",
			"CAT"	 : "Central Africa Time",
			"CCT"	 : "Cocos Islands Time",
			"CDT"	 : "Central Daylight Time (North America)",
			"CEDT" : "Central European Daylight Time",
			"CEST" : "Central European Summer Time (Cf. HAEC)",
			"CET"	 : "Central European Time",
			"CHADT": "Chatham Daylight Time",
			"CHAST": "Chatham Standard Time",
			"CHOT" : "Choibalsan",
			"ChST" : "Chamorro Standard Time",
			"CHUT" : "Chuuk Time",
			"CIST" : "Clipperton Island Standard Time",
			"CIT"	 : "Central Indonesia Time",
			"CKT"	 : "Cook Island Time",
			"CLST" : "Chile Summer Time",
			"CLT"	 : "Chile Standard Time",
			"COST" : "Colombia Summer Time",
			"COT"	 : "Colombia Time",
			"CST"	 : "Central Standard Time (North America)",
			"CT"   : "China time",
			"CVT"	 : "Cape Verde Time",
			"CWST" : "Central Western Standard Time (Australia)",
			"CXT"	 : "Christmas Island Time",
			"DAVT" : "Davis Time",
			"DDUT" : "Dumont d'Urville Time",
			"DFT"	 : "AIX specific equivalent of Central European Time",
			"EASST": "Easter Island Standard Summer Time",
			"EAST" : "Easter Island Standard Time",
			"EAT"	 : "East Africa Time",
			"ECT"	 : "Ecuador Time",
			"EDT"	 : "Eastern Daylight Time (North America)",
			"EEDT" : "Eastern European Daylight Time",
			"EEST" : "Eastern European Summer Time",
			"EET"	 : "Eastern European Time",
			"EGST" : "Eastern Greenland Summer Time",
			"EGT"	 : "Eastern Greenland Time",
			"EIT"	 : "Eastern Indonesian Time",
			"EST"	 : "Eastern Standard Time (North America)",
			"FET"	 : "Further-eastern_European_Time",
			"FJT"	 : "Fiji Time",
			"FKST" : "Falkland Islands Summer Time",
			"FKT"	 : "Falkland Islands Time",
			"FNT"	 : "Fernando de Noronha Time",
			"GALT" : "Galapagos Time",
			"GAMT" : "Gambier Islands",
			"GET"	 : "Georgia Standard Time",
			"GFT"	 : "French Guiana Time",
			"GILT" : "Gilbert Island Time",
			"GIT"	 : "Gambier Island Time",
			"GMT"	 : "Greenwich Mean Time",
			"GST"	 : "South Georgia and the South Sandwich Islands",
			"GYT"	 : "Guyana Time",
			"HADT" : "Hawaii-Aleutian Daylight Time",
			"HAEC" : "Heure Avanc\u00E9e d'Europe Centrale francised name for CEST",
			"HAST" : "Hawaii-Aleutian Standard Time",
			"HKT"	 : "Hong Kong Time",
			"HMT"	 : "Heard and McDonald Islands Time",
			"HOVT" : "Khovd Time",
			"HST"	 : "Hawaii Standard Time",
			"ICT"	 : "Indochina Time",
			"IDT"	 : "Israel Daylight Time",
			"I0T"	 : "Indian Ocean Time",
			"IRDT" : "Iran Daylight Time",
			"IRKT" : "Irkutsk Time",
			"IRST" : "Iran Standard Time",
			"IST"	 : "Irish Summer Time",
			"JST"	 : "Japan Standard Time",
			"KGT"	 : "Kyrgyzstan time",
			"KOST" : "Kosrae Time",
			"KRAT" : "Krasnoyarsk Time",
			"KST"	 : "Korea Standard Time",
			"LHST" : "Lord Howe Standard Time",
			"LINT" : "Line Islands Time",
			"MAGT" : "Magadan Time",
			"MART" : "Marquesas Islands Time",
			"MAWT" : "Mawson Station Time",
			"MDT"	 : "Mountain Daylight Time (North America)",
			"MET"	 : "Middle European Time Same zone as CET",
			"MEST" : "Middle European Saving Time Same zone as CEST",
			"MHT"	 : "Marshall_Islands",
			"MIST" : "Macquarie Island Station Time",
			"MIT"	 : "Marquesas Islands Time",
			"MMT"	 : "Myanmar Time",
			"MSK"	 : "Moscow Time",
			"MST"	 : "Mountain Standard Time (North America)",
			"MUT"	 : "Mauritius Time",
			"MVT"	 : "Maldives Time",
			"MYT"	 : "Malaysia Time",
			"NCT"	 : "New Caledonia Time",
			"NDT"	 : "Newfoundland Daylight Time",
			"NFT"	 : "Norfolk Time[1]",
			"NPT"	 : "Nepal Time",
			"NST"	 : "Newfoundland Standard Time",
			"NT"	 : "Newfoundland Time",
			"NUT"	 : "Niue Time",
			"NZDT" : "New Zealand Daylight Time",
			"NZST" : "New Zealand Standard Time",
			"OMST" : "Omsk Time",
			"ORAT" : "Oral Time",
			"PDT"	 : "Pacific Daylight Time (North America)",
			"PET"	 : "Peru Time",
			"PETT" : "Kamchatka Time",
			"PGT"	 : "Papua New Guinea Time",
			"PHOT" : "Phoenix Island Time",
			"PHT"	 : "Philippine Time",
			"PKT"	 : "Pakistan Standard Time",
			"PMDT" : "Saint Pierre and Miquelon Daylight time",
			"PMST" : "Saint Pierre and Miquelon Standard Time",
			"PONT" : "Pohnpei Standard Time",
			"PST"	 : "Pacific Standard Time (North America)",
			"RET"	 : "R\u00E9union Time",
			"ROTT" : "Rothera Research Station Time",
			"SAKT" : "Sakhalin Island time",
			"SAMT" : "Samara Time",
			"SAST" : "South African Standard Time",
			"SBT"	 : "Solomon Islands Time",
			"SCT"	 : "Seychelles Time",
			"SGT"	 : "Singapore Time",
			"SLT"	 : "Sri Lanka Time",
			"SRT"	 : "Suriname Time",
			"SST"	 : "Singapore Standard Time",
			"SYOT" : "Showa Station Time",
			"TAHT" : "Tahiti Time",
			"THA"	 : "Thailand Standard Time",
			"TFT"	 : "Indian/Kerguelen",
			"TJT"	 : "Tajikistan Time",
			"TKT"	 : "Tokelau Time",
			"TLT"	 : "Timor Leste Time",
			"TMT"	 : "Turkmenistan Time",
			"TOT"	 : "Tonga Time",
			"TVT"	 : "Tuvalu Time",
			"UCT"	 : "Coordinated Universal Time",
			"ULAT" : "Ulaanbaatar Time",
			"UTC"	 : "Coordinated Universal Time",
			"UYST" : "Uruguay Summer Time",
			"UYT"	 : "Uruguay Standard Time",
			"UZT"	 : "Uzbekistan Time",
			"VET"	 : "Venezuelan Standard Time",
			"VLAT" : "Vladivostok Time",
			"VOLT" : "Volgograd Time",
			"VOST" : "Vostok Station Time",
			"VUT"  : "Vanuatu Time",
			"WAKT" : "Wake Island Time",
			"WAST" : "West Africa Summer Time",
			"WAT"	 : "West Africa Time",
			"WEDT" : "Western European Daylight Time",
			"WEST" : "Western European Summer Time",
			"WET"  : "Western European Time",
			"WST"	 : "Western Standard Time",
			"YAKT" : "Yakutsk Time",
			"YEKT" : "Yekaterinburg Time"
		};

		let tz = timezones[short]; // Date().toString().replace(/^.*\(|\)$/g, "")
		return tz || short;
	} ,
	
	getTimezoneOffset: function st4_getTimezoneOffset(zone) {
		let offset = 0;
		// Offsets according to https://en.wikipedia.org/wiki/List_of_time_zone_abbreviations
		switch (zone) {
			case "ACDT": return 10.5;
			case "ACST": return 9.5;
			case "ACT": return -5;
			case "ACWST": return 8.75;
			case "ADT": return -3;
			case "AEDT": return 11;
			case "AEST": return 10;
			case "AFT": return 4.5;
			case "ART": return -3;
			case "AKDT": return -8; // Alaska Daylight
			case "AKST": return -9;
			case "AMST": return -3;
			case "ART": return -3;
			case "AST": return -4;  //Atlantic Standard Time
			case "AWST": return 8;
			case "AZOST": return 0;
			case "AZOT": return -1;
			case "AZT": return 4;
			case "BDT": return 8;
			case "BIOT": return 6;
			case "BIT": return -12;
			case "BOT": return -4;
			case "BRST": return -2;
			case "BRT": return -3;
			case "BST": return 1; // British Summer Time
			case "BTT": return 6;
			case "CAT": return 2;
			case "CCT": return 6.5;
			case "CDT": return -5; // Central Daylight (North America)
			case "CEDT": return 2; // Central European Daylight Saving Time
			case "CEST": return 2; // Central European Summer Time
			case "CET": return 1;
			case "CHADT": return 13.75;
			case "CHAST": return 12.75;
			case "CHOT": return 8;
			case "CHIST": return 9;
			case "CHST": return 10;
			case "CHUT": return 10;
			case "CIST": return -8;
			case "CIT": return 8;
			case "CKT": return -10;
			case "CLST": return -3;
			case "CLT": return -4;
			case "COST": return -5;
			case "CST": return -6; // Central Standard Time (North America)
			case "CT": return 8;
			case "CVT": return -1;
			case "CWST": return -8.75; // Central Western Standard Time (Australia) unofficial
			case "CXT": return 7;
			case "DAVY": return 7;
			case "DDUT": return 10;
			case "DFT": return 1;
			case "EASST": return -5;
			case "EAST": return -6;
			case "EAT": return 3;
			case "ECT": return -4; //Eastern Caribbean Time 
			case "EDT": return -4; // Eastern Daylight Time (North America)
			case "EEST": return 3;
			case "EET": return 2;
			case "EGST": return -1;
			case "EGT": return -1;
			case "EIT": return 9;
			case "EST": return -5; // Eastern Standard Time (North America)
			case "FET": return 3;
			case "FJT": return 12;
			case "FKST": return -3;
			case "FKT": return -4;
			case "FNT": return -2;
			case "GAKT": return -6;
			case "GAMT": return -9;
			case "GFT": return -3;
			case "GILT": return 12;
			case "GIT": return -9;
			case "GMT": return 0;
			case "GST": return 4; //  	Gulf Standard Time
			case "GYT": return -4;
			case "HDT": return -9;
			case "HAEC": return 2;
			case "HST": return -10;
			case "HKT": return 8;
			case "HMT": return 5;
			case "HOVST": return 8;
			case "HOVT": return 7;
			case "ICT": return 7;
			case "IDLW": return -12;
			case "IDT": return 3;
			case "IOT": return 3;
			case "IRDT": return 4.5;
			case "IRKT": return 8;
			case "IRST": return 3.5;
			case "IST": return 5.5;
			case "JST": return 9;
			case "KALT": return 2;
			case "KGT": return 6;
			case "KOST": return 11;
			case "KRAT": return 7;
			case "KST": return 9;
			case "LHST": return 10.5; // Lord Howe Standard Time
			case "LINT": return 14;
			case "MAGT": return 12;
			case "MART": return -9.5;
			case "MAWT": return 5;
			case "MDT": return -6;
			case "MEET": return 1;
			case "MEST": return 2; // Middle European Summer Time 
			case "MESZ": return 2; // Middle European Summer Time 
			case "MHT": return 12;
			case "MIST": return 11;
			case "MIT": return -9.5;
			case "MMT": return 6.5;
			case "MSK": return 3;
			case "MST": return -7;  // Mountain Standard Time (North America)
			case "MUT": return 4;
			case "MVT": return 5;
			case "MYT": return 8;
			case "NCT": return 11;
			case "NDT": return -2.5;
			case "NFT": return 11;
			case "NPT": return 5.75;
			case "NST": return -3.5;
			case "NT": return -3.5;
			case "NUT": return -11;
			case "NZDY": return 13;
			case "NZST": return 12;
			case "OMST": return 6;
			case "ORAT": return 5;
			case "PDT": return -7;
			case "PET": return -5;
			case "PETT": return 12;
			case "PGT": return 10;
			case "PHOT": return 13;
			case "PHT": return 8;
			case "PKT": return 5;
			case "PMDT": return -2;
			case "PMST": return -3;
			case "PONT": return 11;
			case "PST": return -8;  //Pacific Standard Time (North America)
			case "PYST": return -3;
			case "PYT": return -4;
			case "RET": return 4;
			case "ROTT": return -3;
			case "SAKT": return 11;
			case "SAMT": return 4;
			case "SAST": return 2;
			case "SBT": return 11;
			case "SCT": return 4;
			case "SDT": return -10;
			case "SGT": return 8;
			case "SLST": return 5.5;
			case "SRET": return 11;
			case "SST": return 8;  //Singapore Standard Time
			case "SYOT": return 3;
			case "TAHT": return -10;
			case "THA": return 7;
			case "TFT": return 5;
			case "TJT": return 5;
			case "TKT": return 13;
			case "TLT": return 9;
			case "TMT": return 5;
			case "TRT": return 3;
			case "TOT": return 13;
			case "TVT": return 12;
			case "ULAST": return 9;
			case "ULAT": return 8;
			case "UTC": return 0;
			case "UYST": return -2;
			case "UYT": return -3;
			case "UZT": return 5;
			case "VET": return -4;
			case "VLAT": return 10;
			case "VOLT": return 4;
			case "VOST": return 6;
			case "VUT": return 11;
			case "WAKT": return 12;
			case "WAST": return 1;
			case "WAT": return 2;
			case "WEST": return 1;
			case "WET": return 0;
			case "WST": return 8;
			case "YAKT": return 9;
			case "YEKT": return 5;
		}
		return 0;
		
	} ,

	getTimeZoneAbbrev: function st4_getTimeZoneAbbrev(tm, isLongForm) {
		const util = SmartTemplate4.Util;
    function isAcronym(str) {
      return (str.toUpperCase() == str); // if it is all caps we assume it is an acronym
    }
		// return tm.toString().replace(/^.*\(|\)$/g, ""); HARAKIRIs version, not working.
		// get part between parentheses
		// e.g. "(GMT Daylight Time)"
		util.logDebugOptional ('timeZones', 'getTimeZoneAbbrev(time: ' + tm.toString() + ', long form: ' + isLongForm);
		let timeString =  tm.toTimeString(),
		    timeZone = timeString.match(/\(.*?\)/),
		    retVal = '';
		util.logDebugOptional ('timeZones', 'timeString = ' + timeString + '\n' 
		                                      + 'timeZone =' + timeZone);
		if (timeZone && timeZone.length>0) {
      // remove enclosing brackets and split
			let words = timeZone[0].substr(1,timeZone[0].length-2).split(' ');
			for (let i=0; i<words.length; i++) {
        let wrd = words[i];
				if (isLongForm) {
					retVal += ' ' + wrd;
				}
				else {
					if (wrd.length == 3 && wrd.match('[A-Z]{3}') 
					    ||
					    wrd.length == 4 && wrd.match('[A-Z]{4}')
              ||
              isAcronym(wrd))
          {
						retVal += wrd + ' ';  // abbrev contained
          }
					else {
						retVal += wrd[0];  // first letters cobbled together
          }
				}
			}
		}
		else {
			util.logDebugOptional ('timeZones', 'no timeZone match, building manual...');
			retVal = timeString.match('[A-Z]{4}');
			if (!retVal)
				retVal = timeString.match('[A-Z]{3}');
			// convert to long form by using hard-coded time zones array.
			util.logDebug('Cannot determine timezone string - Missed parentheses - from:\n' + timeString + ' regexp guesses: ' + retVal);
			if (isLongForm) {
				retVal = util.zoneFromShort(retVal);
			}
		}
		util.logDebugOptional ('timeZones', 'getTimeZoneAbbrev return value = ' + retVal);
		return retVal.trim();
	} ,
	
	splitFormatArgs: function splitFormatArgs(format)	{
    let formatArray = [];
    if (format) {
      // remove parentheses
      if (format.charAt(0)=='(')
        format = format.slice(1);
      if (format.charAt(format.length-1)==')')
        format = format.slice(0, -1);
      
      let fs=format.split(','); // lastname, firstname ?
      for(let i=0; i<fs.length; i++) {
        let ff = fs[i].trim();
        // if next one is a link modifier, modify previous element and continue
        switch(ff.toLowerCase()) {
          case 'link':
            formatArray[formatArray.length-1].modifier = 'linkTo';
            continue;
          case 'islinkable':
            formatArray[formatArray.length-1].modifier = 'linkable';
            continue;
        }
        formatArray.push ({ field: ff, modifier: ''}); // modifier: linkTo
      }
    }
		return formatArray;
	} ,
	
  /**
   * Installs the toolbar button with the given ID into the given
   * toolbar, if it is not already present in the document.
   *
   * @toolbarId {string} The ID of the toolbar to install to.
   * @id {string} The ID of the button to install.
   * @afterId {string} The ID of the element to insert after. @optional
   */	
	installButton: function installButton(toolbarId, id, afterId) {
    // if (!document.getElementById(id)) {
      this.logDebug("installButton(" + toolbarId + "," + id + "," + afterId + ")");
			if (this.Application=="Postbox") return; // something is going wrong in Pb, so we are not doing this.

      let toolbar = document.getElementById(toolbarId),
          before = null;
      // If no afterId is given, then append the item to the toolbar
      if (afterId) {
        let elem = document.getElementById(afterId);
        if (elem && elem.parentNode == toolbar)
          before = elem.nextElementSibling;
				else {
					// get last item and insert before:
					before = toolbar.childNodes[toolbar.childNodes.length-1];
					this.logDebug("toolbar.childNodes length = " + toolbar.childNodes.length);
					// if there is a spacer, let's put element before that.
					if (before && before.previousElementSibling.tagName == "toolbarspring")
						before = before.previousElementSibling;
				}
      }
			if (!before) {
				return false;
			}

      this.logDebug("toolbar.insertItem(" + id  + "," + before + ")");
			if (before)
				toolbar.insertItem(id, before);
				
      toolbar.setAttribute("currentset", toolbar.currentSet);
      this.logDebug("document.persist" + toolbar.id + ")");
			if (document.persist)
				document.persist(toolbar.id, "currentset");
      return true;
    // }
  }  ,
	
	// -----------------------------------
	// get locale preference
	getLocalePref : function getLocalePref()	{
		const Ci = Components.interfaces,
		      Cc = Components.classes,
		      util = SmartTemplate4.Util;
		try {
			let locale,
			    forcedLocale = SmartTemplate4.calendar.currentLocale,  // check if the %language% variable was set
			    listLocales = '',
			    found = false;
			try {
				var { Services } =
				  ChromeUtils.import ?
					ChromeUtils.import('resource://gre/modules/Services.jsm') :
					Components.utils.import('resource://gre/modules/Services.jsm');
				
				// Tb68: requestedLocale
				// Tb60: getRequestedLocale()
				// Tb52: getApplicationLocale().getCategory("NSILOCALE_TIME")
				let platformRequestedLocale 
				  = (typeof Services.locale.requestedLocale == "string") ? Services.locale.requestedLocale : 
					  (Services.locale.getRequestedLocale ? Services.locale.getRequestedLocale() : Services.locale.getApplicationLocale().getCategory("NSILOCALE_TIME"));
				
				locale =   // get locale from Operating System. note nslocaleservice was removed in Gecko 57
				           // removed Services.locale.getLocaleComponentForUserAgent()
			      Services.locale.appLocaleAsLangTag  
							|| platformRequestedLocale || Services.locale.lastFallbackLocale; // was Services.locale.getAppLocaleAsLangTag();
			}
			catch(ex) {
				util.logException("getLocalePref failed - fallback to en-US", ex);
				locale = "en-US";				
			}
			if (forcedLocale && forcedLocale != locale) {
				let availableLocales = util.getAvailableLocales("global"),
				    foundPartly=""; // list of installed locales
				while (availableLocales.hasMore()) {
					let aLocale = availableLocales.getNext();
					listLocales += aLocale.toString() + ', ';
					if (aLocale == forcedLocale) 
						found = true;
					else {
						if(aLocale.indexOf(forcedLocale)==0)
							foundPartly = aLocale; // partly matched, e.g. forcedLocale=de, language pack = de-DE
					}
				}
				if (!found && foundPartly) {
					util.logDebug("found requested language '{0}' matching partly: %language% selecting '{1}'"
					  .replace("{0}", forcedLocale)
					  .replace("{1}", foundPartly));
					// we found a variation of the root language requested:
					forcedLocale = foundPartly;
					found = true;
				}
				if (!found) {
					let requiredLocaleTxt =
					  " In order to use %datelocal% or %dateshort% with the requested language," +
					  " You will need the matching Language Pack [{0}]".replace('{0}', forcedLocale+".xpi")
						+ " from https://ftp.mozilla.org/pub/thunderbird/releases/" + util.AppverFull + "/yourOS/xpi";
				  let errorText =   'Invalid %language% id: ' + forcedLocale + '\n'
					                +  requiredLocaleTxt + '\n'
					                + 'Available Locales on your system: ' + listLocales.substring(0, listLocales.length-2);
					util.logToConsole(errorText);
					/*
					let parentWin = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("msgcomposeWindow") || window;
					SmartTemplate4.Message.display(errorText,
							"centerscreen,titlebar",
							{ ok: function() { parentWin.focus(); }},
							parentWin
					);
					forcedLocale = null;
					*/
					
				}
				else {
					util.logDebug('calendar - found global locales: ' + listLocales + '\nconfiguring ' + forcedLocale);
					locale = forcedLocale;
				}
			}

			util.logDebug('getLocalePref() returns: ' + locale);
			return locale;
		}
		catch (ex) {
			util.logException('getLocalePref() failed and defaulted to [en]', ex);
			return "en";
		}
	} ,
	
	
	/* 
	,
	
  setCursorPosition : function(editor) { 
		try {
			let caretSpan = editor.rootElement.childNodes[0].ownerDocument.getElementById('_AthCaret');
			if (caretSpan) {
				editor.selection.collapse(caretSpan, 0);
				caretSpan.parentNode.removeChild(caretSpan);
			}
		} catch(e) {}
	}	
	*/
		
	

};  // ST4.Util


SmartTemplate4.Util.firstRun =
{
	update: function(previousVersion) {
		// upgrade routines for future use...
		// SmartTemplate4.Util.logDebug('convert { %% } to [[ ]] ');

	} ,
	
	silentUpdate: function st4_silentUpdate(previousVersion, newVersion) {
		let p = previousVersion.toString(),
		    n = newVersion.toString();
		if (p=="2.2" && (n=="2.2.1" || n=="2.2.2")) {
			SmartTemplate4.Util.logToConsole(
				"Silent Update - no version history displayed because v{0} is a maintenance release for v{1}"
				.replace("{0}",n).replace("{1}",p));
			return true;
		}
		return false;
	} ,

	init: function() {
		// avoid running firstRun.init in messenger compose again!
		if (typeof SmartTemplate4.Settings === 'undefined')
			return;
			
  	const util = SmartTemplate4.Util,
		      prefs = SmartTemplate4.Preferences;
		util.logDebug('Util.firstRun.init()');
		let prev = -1, firstRun = true,
		    debugFirstRun = false,
		    prefBranchString = "extensions.smartTemplate4.",
		    svc = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService),
		    ssPrefs = svc.getBranch(prefBranchString);

		try { debugFirstRun = Boolean(ssPrefs.getBoolPref("debug.firstRun")); } catch (e) { debugFirstRun = false; }

		util.logDebugOptional ("firstRun","SmartTemplate4.Util.firstRun.init()");
		if (!ssPrefs) {
			util.logDebugOptional ("firstRun","Could not retrieve prefbranch for " + prefBranchString);
		}

		let current = util.Version;
		util.logDebug("Current SmartTemplate4 Version: " + current);

		try {
			util.logDebugOptional ("firstRun","try to get setting: getCharPref(version)");
			try {
				prev = prefs.getMyStringPref("version");
			}
			catch (e) {
				prev = "?";
				util.logDebugOptional ("firstRun","Could not determine previous version - " + e);
			} ;

			util.logDebugOptional ("firstRun","try to get setting: getBoolPref(firstRun)");
			try { firstRun = ssPrefs.getBoolPref("firstRun"); } catch (e) { firstRun = true; }


			if (firstRun) {
				// previous setting found? not a new installation!
				if (prefs.existsBoolPref("extensions.smarttemplate.def"))
					firstRun = false;
				util.logDebugOptional ("firstRun","setting firstRun=false");
				prefs.setMyBoolPref("firstRun", false);
			}
			else {
				// this is an update - start license timer if license is empty.
				if (!prefs.getStringPref('LicenseKey')) {
					let daysLeft = util.Licenser.graceDate(); // start / continue countdown
					util.logDebug("Days left without license: " + util.Licenser.GracePeriod);
				}
			}

			util.logDebugOptional ("firstRun", "Settings retrieved:"
					+ "\nprevious version=" + prev
					+ "\ncurrent version=" + current
					+ "\nfirstrun=" + firstRun
					+ "\ndebugFirstRun=" + debugFirstRun);
		}
		catch(e) {
			util.logException("Exception in SmartTemplate4-util.js: \n"
				+ "\n\ncurrent: " + current
				+ "\nprev: " + prev
				+ "\nfirstrun: " + firstRun
				+ "\ndebugFirstRun: " + debugFirstRun, e);
		}
		finally {
			util.logDebugOptional ("firstRun","finally - firstRun=" + firstRun);

			// AG if this is a pre-release, cut off everything from "pre" on... e.g. 1.9pre11 => 1.9
			let pureVersion = util.VersionSanitized;
			util.logDebugOptional ("firstRun","finally - pureVersion=" + pureVersion);
			// change this depending on the branch
			let versionPage = util.VersionPage + "#" + pureVersion;
			util.logDebugOptional ("firstRun","finally - versionPage=" + versionPage);
			
			let isPremium = util.hasLicense(true),
			    updateVersionMessage = util.getBundleString (
			                             "SmartTemplate4.updateMessageVersion",
			                             "SmartTemplate4 was successfully upgraded to version {1}!").replace("{1}",current);

			// NOTE: showfirst-check is INSIDE both code-blocks, because prefs need to be set no matter what.
			if (firstRun){
				/* EXTENSION INSTALLED FOR THE FIRST TIME! */
				util.logDebug ("firstRun code");
				// Insert code for first run here
				// on very first run, we go to the index page - welcome blablabla
				util.logDebugOptional ("firstRun","setTimeout for content tab (index.html)");
				window.setTimeout(function() {
					util.openURL(null, "http://smarttemplate4.mozdev.org/index.html");
				}, 1500); //Firefox 2 fix - or else tab will get closed (leave it in....)
			}
			else {

				// check for update of pure version (everything before pre, beta, alpha)
				if (prev!=pureVersion && current.indexOf(util.HARDCODED_EXTENSION_TOKEN) < 0) {
					
					/* EXTENSION UPDATED */
					let isUpdated = this.update(prev);
					util.logDebug("===========================\n"+
					              "ST4 Test  - SmartTemplate4 Update Detected:\n" +
												" **PREVIOUS**:" + prev + 
												"\npure Version: " + pureVersion + 
												"\ncurrent: " + current +
												"\nisUpdated=" + isUpdated);
					util.logDebugOptional ("firstRun","prev!=current -> upgrade case.");

					// VERSION HISTORY PAGE
					// display version history - disable by right-clicking label above show history panel
					if (!prefs.getBoolPrefSilent("extensions.smarttemplate4.hideVersionOnUpdate")
						  && !this.silentUpdate(prev,pureVersion)) {
						util.logDebugOptional ("firstRun","open tab for version history, ST " + current);
						window.setTimeout(function(){ util.showVersionHistory(false); }, 2200);
					}

					// Display the modeless update message
					// To Do: We need to make this more generic for charging for a standard version!
					window.setTimeout(function(){
						util.popupAlert ("SmartTemplate4", updateVersionMessage); // OS notification
					}, 3000);

				}
			}

			// =============================================
			// STORE CURRENT VERSION NUMBER!
			if (prev != pureVersion && current != '?' && (current.indexOf(util.HARDCODED_EXTENSION_TOKEN) < 0)) {
				util.logDebug ("Storing new version number " + current);
				// STORE VERSION CODE!
				prefs.setMyStringPref("version", pureVersion); // store sanitized version! (no more alert on pre-Releases + betas!)
			}
			else {
				util.logDebugOptional ("firstRun","No need to store current version: " + current
					+ "\nprevious: " + prev.toString()
					+ "\ncurrent!='?' = " + (current!='?').toString()
					+ "\nprev!=current = " + (prev!=current).toString()
					+ "\ncurrent.indexOf(" + util.HARDCODED_EXTENSION_TOKEN + ") = " + current.indexOf(util.HARDCODED_EXTENSION_TOKEN).toString());
			}
			
			// load the templates file and initialize the dropdown menus for write / reply / forward
			setTimeout(
			  function() {
					SmartTemplate4.fileTemplates.initMenus();
				}, 4500
			);

			util.logDebugOptional ("firstRun","finally { } ends.");
		} // end finally

		// // fire this on application launch, which includes open-link-in-new-window
		// window.addEventListener("load",function(){ SmartTemplate4.Util.firstRun.init(); },true);
	
	} 

};  // ST4.Util.firstRun

// this object is used to configure the modeless smartTemplate-msg window
// the display() Method it takes 2 callback functions one for [Ok] and one for [Cancel]
// these are executed when the button is pressed, and the window will be closed.
// if a callback for [Cancel] [Yes] [No] is not passed then the Cancel button is hidden
SmartTemplate4.Message = {
	okCALLBACK : null ,
	cancelCALLBACK : null,
	yesCALLBACK : null ,
	noCALLBACK : null ,
	myWindow : null,
	parentWindow : null,
	display : function(text, features, callbacksObj, parent) {
		// initialize callback functions
		this.okCALLBACK = callbacksObj.ok || null;
		this.cancelCALLBACK = callbacksObj.cancel || null;
		this.yesCALLBACK = callbacksObj.yes  || null;
		this.noCALLBACK = callbacksObj.no || null;
		// parent window
		if (parent) this.parentWindow = parent;

		// pass some data as args. we allow nulls for the callbacks
		// avoid using "this" in here as it confuses Tb3?
		let params =
		{
			messageText:    text,
			okCallback:     SmartTemplate4.Message.okCALLBACK,
			cancelCallback: SmartTemplate4.Message.cancelCALLBACK,
			yesCallback:    SmartTemplate4.Message.yesCALLBACK,
			noCallback:     SmartTemplate4.Message.noCALLBACK
		};

		// open message with main as parent

		let main = this.parentWindow || SmartTemplate4.Util.Mail3PaneWindow,
		    dispFeatures = "chrome,alwaysRaised,dependent,close=no," + features; //  close=no,
		main.openDialog("chrome://smarttemplate4/content/smartTemplate-msg.xul", "st4message", dispFeatures, params)
		    .QueryInterface(Components.interfaces.nsIDOMWindow);
		this.parentWindow = null;

	} ,

	// default function (probably not used)
	okMessage : function() {
		if (this.okCALLBACK) {
			this.okCALLBACK();
			this.okCALLBACK = null;
		}
		window.close();
	} ,

	// default function (probably not used)
	cancelMessage : function() {
		if (this.cancelCALLBACK) {
			this.cancelCALLBACK();
			this.cancelCALLBACK = null;
		}
		window.close();
	} ,

	// default function (probably not used)
	yesMessage : function() {
		if (this.yesCALLBACK) {
			this.yesCALLBACK();
			this.yesCALLBACK = null;
		}
		window.close();
	} ,

	noMessage : function() {
		if (this.noCALLBACK) {
			this.noCALLBACK();
			this.noCALLBACK = null;
		}
		window.close();
	} ,

	loadMessage : function () {
		try {
			if (window.arguments && window.arguments.length) {
				let params = window.arguments[0],  // leads to errors in tb3?
				    msgDiv = document.getElementById('innerMessage'),
				    theMessage = window.arguments[0].messageText,
				// split text (passed in with /n as delimiter) into paragraphs
				    textNodes = theMessage.split("\n");
						
				for (let i = 0; i < textNodes.length; i++) {
					// empty nodes will be <br>
					let par = textNodes[i].length ? document.createElement('p') : document.createElement('br');
					if (textNodes[i].length)
						par.textContent = textNodes[i]; // we want this to wrap. won't use unescape for the moment
					msgDiv.appendChild(par);
				}
				// contents.innerHTML = 'Element Number '+num+' has been added! <a href=\'#\' onclick=\'removeElement('+divIdName+')\'>Remove the div "'+divIdName+'"</a>';

				document.getElementById('ok').addEventListener("click", window.arguments[0].okCallback, true);
				window.st4OkListener = window.arguments[0].okCallback; // this is the minimum
				if (window.arguments[0].cancelCallback) {
					let cancelBtn = document.getElementById('cancel');
					cancelBtn.addEventListener("click", window.arguments[0].cancelCallback, true);
					cancelBtn.hidden = false;
					window.st4CancelListener = window.arguments[0].cancelCallback;
				}
				if (window.arguments[0].yesCallback) {
					let yesBtn = document.getElementById('yes');
					yesBtn.addEventListener("click", window.arguments[0].yesCallback, true);
					yesBtn.hidden = false;
					window.st4YesListener = window.arguments[0].yesCallback;
				}
				if (window.arguments[0].noCallback) {
					let noBtn = document.getElementById('no');
					noBtn.addEventListener("click", window.arguments[0].noCallback, true);
					noBtn.hidden = false;
					window.st4NoListener = window.arguments[0].noCallback;
				}
			}
			else
				alert('window.arguments: ' + window.arguments);
		}
		catch(ex) {
			alert("Exception in loadMessage:" + ex);
			SmartTemplate4.Util.logException("Exception in loadMessage:", ex);
		}
		window.sizeToContent();
	} ,

	unloadMessage : function (win) {
		this.okCALLBACK = null;
		this.cancelCALLBACK = null;
		this.yesCALLBACK = null;
		this.noCALLBACK = null;
		this.myWindow = null;
		if (win.st4OkListener) {
			document.getElementById('ok').removeEventListener("click", win.st4OkListener, false);
		}
		if (win.st4CancelListener) {
			document.getElementById('cancel').removeEventListener("click", win.st4CancelListener, false);
		}
		if (win.st4YesListener) {
			document.getElementById('yes').removeEventListener("click", win.st4YesListener, false);
		}
		if (win.st4NoListener) {
			document.getElementById('no').removeEventListener("click", win.st4NoListener, false);
		}
		win.close();
	} 
	
};  // ST4.Message
