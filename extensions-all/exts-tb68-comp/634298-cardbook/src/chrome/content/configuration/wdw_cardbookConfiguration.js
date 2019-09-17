Preferences.addAll([
	{ id: "extensions.cardbook.exclusive", type: "bool" },
	{ id: "extensions.cardbook.autocompletion", type: "bool" },
	{ id: "extensions.cardbook.autocompleteSortByPopularity", type: "bool" },
	{ id: "extensions.cardbook.proposeConcatEmails", type: "bool" },
	{ id: "extensions.cardbook.autocompleteShowAddressbook", type: "bool" },
	{ id: "extensions.cardbook.autocompleteWithColor", type: "bool" },
	{ id: "extensions.cardbook.autocompleteRestrictSearch", type: "bool" },
	{ id: "extensions.cardbook.autocompleteRestrictSearchFields", type: "string" },
	{ id: "extensions.cardbook.useColor", type: "string" },
	{ id: "extensions.cardbook.debugMode", type: "bool" },
	{ id: "extensions.cardbook.statusInformationLineNumber", type: "string" },
	{ id: "extensions.cardbook.mailPopularityTabView", type: "bool" },
	{ id: "extensions.cardbook.technicalTabView", type: "bool" },
	{ id: "extensions.cardbook.vcardTabView", type: "bool" },
	{ id: "extensions.cardbook.advancedTabView", type: "bool" },
	{ id: "extensions.cardbook.localizeEngine", type: "string" },
	{ id: "extensions.cardbook.showNameAs", type: "string" },
	{ id: "extensions.cardbook.adrFormula", type: "string" },
	{ id: "extensions.cardbook.localizeTarget", type: "string" },
	{ id: "extensions.cardbook.preferEmailEdition", type: "bool" },
	{ id: "extensions.cardbook.dateDisplayedFormat", type: "string" },
	{ id: "extensions.cardbook.defaultRegion", type: "string" },
	{ id: "extensions.cardbook.localDataEncryption", type: "bool" },
	{ id: "extensions.cardbook.preferIMPPPref", type: "bool" },
	{ id: "extensions.cardbook.URLPhoneURL", type: "string" },
	{ id: "extensions.cardbook.URLPhoneUser", type: "string" },
	{ id: "extensions.cardbook.URLPhoneBackground", type: "bool" },
	{ id: "extensions.cardbook.kindCustom", type: "string" },
	{ id: "extensions.cardbook.memberCustom", type: "string" },
	{ id: "extensions.cardbook.initialSync", type: "bool" },
	{ id: "extensions.cardbook.initialSyncDelay", type: "string" },
	{ id: "extensions.cardbook.solveConflicts", type: "string" },
	{ id: "extensions.cardbook.requestsTimeout", type: "string" },
	{ id: "extensions.cardbook.multiget", type: "string" },
	{ id: "extensions.cardbook.maxModifsPushed", type: "string" },
	{ id: "extensions.cardbook.discoveryAccountsNameList", type: "string" },
	{ id: "extensions.cardbook.decodeReport", type: "bool" },
	{ id: "extensions.cardbook.preferEmailPref", type: "bool" },
	{ id: "extensions.cardbook.warnEmptyEmails", type: "bool" },
	{ id: "extensions.cardbook.useOnlyEmail", type: "bool" },
	{ id: "extensions.cardbook.addressBooksNameList", type: "string" },
	{ id: "extensions.cardbook.birthday.bday", type: "bool" },
	{ id: "extensions.cardbook.birthday.anniversary", type: "bool" },
	{ id: "extensions.cardbook.birthday.deathdate", type: "bool" },
	{ id: "extensions.cardbook.birthday.events", type: "bool" },
	{ id: "extensions.cardbook.calendarsNameList", type: "string" },
	{ id: "extensions.cardbook.numberOfDaysForSearching", type: "string" },
	{ id: "extensions.cardbook.showPopupOnStartup", type: "bool" },
	{ id: "extensions.cardbook.showPeriodicPopup", type: "bool" },
	{ id: "extensions.cardbook.periodicPopupIime", type: "string" },
	{ id: "extensions.cardbook.showPopupEvenIfNoBirthday", type: "bool" },
	{ id: "extensions.cardbook.numberOfDaysForWriting", type: "string" },
	{ id: "extensions.cardbook.syncWithLightningOnStartup", type: "bool" },
	{ id: "extensions.cardbook.eventEntryTitle", type: "string" },
	{ id: "extensions.cardbook.eventEntryWholeDay", type: "bool" },
	{ id: "extensions.cardbook.eventEntryTime", type: "string" },
	{ id: "extensions.cardbook.calendarEntryAlarm", type: "string" },
	{ id: "extensions.cardbook.calendarEntryCategories", type: "string" },
]);

if ("undefined" == typeof(wdw_cardbookConfiguration)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookTypes", "chrome://cardbook/content/cardbookTypes.js");

	var CardBookConfigNotification = {};
	XPCOMUtils.defineLazyGetter(CardBookConfigNotification, "errorNotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("errorNotificationsHbox").append(element);
		});
	});

	var wdw_cardbookConfiguration = {

		allCustomFields: {},
		allIMPPs: {},
		allTypes: {},
		allOrg: [],
		allRestrictions: [],
		allEmailsCollections: [],
		allVCards: [],
		allDiscoveryAccounts: [],
		allAddressbooks: [],
		allCalendars: [],
		preferEmailPrefOld: false,
		encryptionPrefOld: false,
		autocompleteRestrictSearchFields: "",
		customListsFields: ['kindCustom', 'memberCustom'],
		
		customFieldCheck: function (aTextBox) {
			var myValue = aTextBox.value.trim();
			if (myValue == "") {
				aTextBox.value = "X-";
			} else {
				aTextBox.value = myValue.toUpperCase();
			}
		},

		sortTreesFromCol: function (aEvent, aColumn, aTreeName) {
			if (aEvent.button == 0) {
				wdw_cardbookConfiguration.sortTrees(aColumn, aTreeName);
			}
		},

		sortTrees: function (aColumn, aTreeName) {
			var myTree = document.getElementById(aTreeName);
			if (aColumn) {
				if (myTree.currentIndex != -1) {
					var mySelectedValue = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn(aColumn.id));
				}
			}

			var columnName;
			var columnArray;
			var order = myTree.getAttribute("sortDirection") == "ascending" ? 1 : -1;
			
			// if the column is passed and it's already sorted by that column, reverse sort
			if (aColumn) {
				columnName = aColumn.id;
				if (myTree.getAttribute("sortResource") == columnName) {
					order *= -1;
				}
			} else {
				columnName = myTree.getAttribute("sortResource");
			}
			switch(columnName) {
				case "accountsRestrictionsMailName":
					columnArray=2;
					break;
				case "accountsRestrictionsABName":
					columnArray=4;
					break;
				case "accountsRestrictionsCatName":
					columnArray=6;
					break;
				case "accountsRestrictionsIncludeName":
					columnArray=8;
					break;
				case "typesLabel":
					columnArray=0;
					break;
				case "emailsCollectionMailName":
					columnArray=2;
					break;
				case "emailsCollectionABName":
					columnArray=4;
					break;
				case "emailsCollectionCatName":
					columnArray=6;
					break;
				case "accountsVCardsMailName":
					columnArray=2;
					break;
				case "accountsVCardsFn":
					columnArray=4;
					break;
				case "accountsVCardsFileName":
					columnArray=7;
					break;
				case "IMPPCode":
					columnArray=0;
					break;
				case "IMPPLabel":
					columnArray=1;
					break;
				case "IMPPProtocol":
					columnArray=2;
					break;
				case "customFieldsCode":
					columnArray=0;
					break;
				case "customFieldsLabel":
					columnArray=1;
					break;
				case "customFieldsRank":
					columnArray=2;
					break;
				case "orgLabel":
					columnArray=0;
					break;
				case "orgRank":
					columnArray=1;
					break;
				case "discoveryAccountsName":
					columnArray=1;
					break;
				case "addressbooksName":
					columnArray=1;
					break;
				case "calendarsName":
					columnArray=1;
					break;
			}
			if (aTreeName == "accountsVCardsTree") {
				var myData = wdw_cardbookConfiguration.allVCards;
			} else if (aTreeName == "accountsRestrictionsTree") {
				var myData = wdw_cardbookConfiguration.allRestrictions;
			} else if (aTreeName == "typesTree") {
				if (wdw_cardbookConfiguration.allTypes[document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value]) {
					var myData = wdw_cardbookConfiguration.allTypes[document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value][document.getElementById('typesCategoryRadiogroup').selectedItem.value];
				} else {
					return;
				}
			} else if (aTreeName == "emailsCollectionTree") {
				var myData = wdw_cardbookConfiguration.allEmailsCollections;
			} else if (aTreeName == "IMPPsTree") {
				var myData = wdw_cardbookConfiguration.allIMPPs[document.getElementById('imppsCategoryRadiogroup').selectedItem.value];
			} else if (aTreeName == "customFieldsTree") {
				var myData = wdw_cardbookConfiguration.allCustomFields[document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value];
			} else if (aTreeName == "orgTree") {
				var myData = wdw_cardbookConfiguration.allOrg;
			} else if (aTreeName == "discoveryAccountsTree") {
				var myData = wdw_cardbookConfiguration.allDiscoveryAccounts;
			} else if (aTreeName == "addressbooksTree") {
				var myData = wdw_cardbookConfiguration.allAddressbooks;
			} else if (aTreeName == "calendarsTree") {
				var myData = wdw_cardbookConfiguration.allCalendars;
			}
			
			if (myData && myData.length) {
				cardbookUtils.sortMultipleArrayByString(myData,columnArray,order);
			}

			//setting these will make the sort option persist
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);
			
			if (aTreeName == "accountsVCardsTree") {
				wdw_cardbookConfiguration.displayVCards();
			} else if (aTreeName == "accountsRestrictionsTree") {
				wdw_cardbookConfiguration.displayRestrictions();
			} else if (aTreeName == "typesTree") {
				wdw_cardbookConfiguration.displayTypes();
			} else if (aTreeName == "emailsCollectionTree") {
				wdw_cardbookConfiguration.displayEmailsCollection();
			} else if (aTreeName == "IMPPsTree") {
				wdw_cardbookConfiguration.displayIMPPs();
			} else if (aTreeName == "customFieldsTree") {
				wdw_cardbookConfiguration.displayCustomFields();
			} else if (aTreeName == "orgTree") {
				wdw_cardbookConfiguration.displayOrg();
			} else if (aTreeName == "discoveryAccountsTree") {
				wdw_cardbookConfiguration.displayDiscoveryAccounts();
			} else if (aTreeName == "addressbooksTree") {
				wdw_cardbookConfiguration.displayAddressbooks();
			} else if (aTreeName == "calendarsTree") {
				wdw_cardbookConfiguration.displayCalendars();
			}
			
			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select back
			if (aColumn && mySelectedValue) {
				for (var i = 0; i < myTree.view.rowCount; i++) {
					if (myTree.view.getCellText(i, myTree.columns.getNamedColumn(aColumn.id)) == mySelectedValue) {
						myTree.view.selection.rangedSelect(i,i,true);
						found = true
						foundIndex = i;
						break;
					}
				}
			}
		},

		doubleClickTree: function (aEvent, aTreeName) {
			var myTree = document.getElementById(aTreeName);
			var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
			if (cell.row != -1) {
				if (aTreeName == "accountsVCardsTree") {
					wdw_cardbookConfiguration.renameVCard();
				} else if (aTreeName == "accountsRestrictionsTree") {
					wdw_cardbookConfiguration.renameRestriction();
				} else if (aTreeName == "typesTree") {
					wdw_cardbookConfiguration.renameType();
				} else if (aTreeName == "emailsCollectionTree") {
					wdw_cardbookConfiguration.renameEmailsCollection();
				} else if (aTreeName == "IMPPsTree") {
					wdw_cardbookConfiguration.renameIMPP();
				} else if (aTreeName == "customFieldsTree") {
					wdw_cardbookConfiguration.renameCustomFields();
				} else if (aTreeName == "orgTree") {
					wdw_cardbookConfiguration.renameOrg();
				}
			} else {
				if (aTreeName == "accountsVCardsTree") {
					wdw_cardbookConfiguration.addVCard();
				} else if (aTreeName == "accountsRestrictionsTree") {
					wdw_cardbookConfiguration.addRestriction();
				} else if (aTreeName == "typesTree") {
					wdw_cardbookConfiguration.addType();
				} else if (aTreeName == "emailsCollectionTree") {
					wdw_cardbookConfiguration.addEmailsCollection();
				} else if (aTreeName == "IMPPsTree") {
					wdw_cardbookConfiguration.addIMPP();
				} else if (aTreeName == "customFieldsTree") {
					wdw_cardbookConfiguration.addCustomFields();
				} else if (aTreeName == "orgTree") {
					wdw_cardbookConfiguration.addOrg();
				}
			}
		},

		loadTitle: function () {
			document.title = cardbookRepository.strBundle.GetStringFromName("cardbookPrefTitle") + " (" + cardbookRepository.addonVersion + ")";
		},

		autocompleteRestrictSearch: function () {
			document.getElementById('chooseAutocompleteRestrictSearchFieldsButton').disabled=!document.getElementById('autocompleteRestrictSearchCheckBox').checked;
			document.getElementById('resetAutocompleteRestrictSearchFieldsButton').disabled=!document.getElementById('autocompleteRestrictSearchCheckBox').checked;
		},

		translateSearchFields: function (aFieldList) {
			var myFieldArray = aFieldList.split('|');
			var result = [];
			for (var i = 0; i < myFieldArray.length; i++) {
				result.push(wdw_csvTranslator.getTranslatedField(myFieldArray[i]));
			}
			return cardbookUtils.cleanArray(result).join('|');
		},

		loadAutocompleteRestrictSearchFields: function () {
			wdw_cardbookConfiguration.autocompleteRestrictSearchFields = cardbookRepository.autocompleteRestrictSearchFields.join('|');
			if (wdw_cardbookConfiguration.autocompleteRestrictSearchFields == "") {
				wdw_cardbookConfiguration.autocompleteRestrictSearchFields = cardbookRepository.defaultAutocompleteRestrictSearchFields;
			}
			document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = wdw_csvTranslator.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
		},

		chooseAutocompleteRestrictSearchFieldsButton: function () {
			var myTemplate = wdw_csvTranslator.getTemplate(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
			var myArgs = {template: myTemplate, mode: "choice", includePref: false, lineHeader: true, columnSeparator: "", action: ""};
			var myWindow = window.openDialog("chrome://cardbook/content/csvTranslator/wdw_csvTranslator.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.action == "SAVE") {
				var result = [];
				for (var i = 0; i < myArgs.template.length; i++) {
					result.push(myArgs.template[i][0]);
				}
				wdw_cardbookConfiguration.autocompleteRestrictSearchFields = result.join('|');
				document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = wdw_csvTranslator.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
				wdw_cardbookConfiguration.preferenceChanged('autocompleteRestrictSearch');
			}
		},

		resetAutocompleteRestrictSearchFieldsButton: function () {
			wdw_cardbookConfiguration.autocompleteRestrictSearchFields = cardbookRepository.defaultAutocompleteRestrictSearchFields;
			document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = wdw_csvTranslator.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
			wdw_cardbookConfiguration.preferenceChanged('autocompleteRestrictSearch');
		},

		validateAutocompleteRestrictSearchFields: function () {
			if (document.getElementById('autocompletionCheckBox').checked && document.getElementById('autocompleteRestrictSearchCheckBox').checked) {
				if ((wdw_cardbookConfiguration.autocompleteRestrictSearchFields != cardbookRepository.autocompleteRestrictSearchFields.join('|')) ||
					(document.getElementById('autocompleteRestrictSearchCheckBox').checked != cardbookRepository.autocompleteRestrictSearch)) {
					cardbookPreferences.setStringPref("extensions.cardbook.autocompleteRestrictSearchFields", wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
					cardbookRepository.autocompleteRestrictSearch = document.getElementById('autocompleteRestrictSearchCheckBox').checked;
					cardbookRepository.autocompleteRestrictSearchFields = wdw_cardbookConfiguration.autocompleteRestrictSearchFields.split('|');
					cardbookRepository.cardbookCardShortSearch = {};
					for (j in cardbookRepository.cardbookCards) {
						let myCard = cardbookRepository.cardbookCards[j];
						cardbookRepository.addCardToShortSearch(myCard);
					}
				} else {
					cardbookRepository.autocompleteRestrictSearch = document.getElementById('autocompleteRestrictSearchCheckBox').checked;
				}
			} else {
				cardbookRepository.autocompleteRestrictSearch = document.getElementById('autocompleteRestrictSearchCheckBox').checked;
				cardbookRepository.cardbookCardShortSearch = {};
			}
			wdw_cardbookConfiguration.autocompleteRestrictSearch();
		},

		loadPrefEmailPref: function () {
			wdw_cardbookConfiguration.preferEmailPrefOld = cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailPref");
		},

		validatePrefEmailPref: function () {
			var myNewCheck = document.getElementById('preferEmailPrefCheckBox').checked;
			if (myNewCheck !== wdw_cardbookConfiguration.preferEmailPrefOld) {
				cardbookRepository.preferEmailPref = myNewCheck;
				for (j in cardbookRepository.cardbookCards) {
					var myCard = cardbookRepository.cardbookCards[j];
					if (!myCard.isAList) {
						var myNewEmails = cardbookUtils.getPrefAddressFromCard(myCard, "email", myNewCheck);
						if (myNewEmails.join(',') != myCard.emails.join(',')) {
							var myTempCard = new cardbookCardParser();
							cardbookUtils.cloneCard(myCard, myTempCard);
							cardbookRepository.saveCard(myCard, myTempCard, null, false);
						}
					}
				}
			}
		},

		loadEncryptionPref: function () {
			wdw_cardbookConfiguration.encryptionPrefOld = cardbookPreferences.getBoolPref("extensions.cardbook.localDataEncryption");
		},

		validateEncryptionPref: async function () {
			var myNewCheck = document.getElementById('localDataEncryptionEnabledCheckBox').checked;
			if (myNewCheck !== wdw_cardbookConfiguration.encryptionPrefOld) {
				if (myNewCheck) {
					cardbookIndexedDB.encryptDBs();
				} else {
					cardbookIndexedDB.decryptDBs();
				}
				cardbookPreferences.setStringPref("extensions.cardbook.localDataEncryption.validatedVersion", String(cardbookEncryptor.VERSION));
			}
		},

		loadAdrFormula: function () {
			var adrFormula = cardbookPreferences.getStringPref("extensions.cardbook.adrFormula");
			document.getElementById('adrFormulaTextBox').value = adrFormula.replace(/\n/g, "\\n").trim();
			var myLabel = [];
			myLabel.push("{{1}} : " + cardbookRepository.strBundle.GetStringFromName("postOfficeLabel"));
			myLabel.push("{{2}} : " + cardbookRepository.strBundle.GetStringFromName("extendedAddrLabel"));
			myLabel.push("{{3}} : " + cardbookRepository.strBundle.GetStringFromName("streetLabel"));
			myLabel.push("{{4}} : " + cardbookRepository.strBundle.GetStringFromName("localityLabel"));
			document.getElementById('adrFormula7').value = myLabel.join("    ");
			myLabel = [];
			myLabel.push("{{5}} : " + cardbookRepository.strBundle.GetStringFromName("regionLabel"));
			myLabel.push("{{6}} : " + cardbookRepository.strBundle.GetStringFromName("postalCodeLabel"));
			myLabel.push("{{7}} : " + cardbookRepository.strBundle.GetStringFromName("countryLabel"));
			document.getElementById('adrFormula8').value = myLabel.join("    ");
		},

		resetAdrFormula: function () {
			document.getElementById('adrFormulaTextBox').value = cardbookRepository.defaultAdrFormula.replace(/\n/g, "\\n").trim();
			wdw_cardbookConfiguration.preferenceChanged('adrFormula');
		},

		validateAdrFormula: function () {
			if (document.getElementById('adrFormulaTextBox').value == "") {
				wdw_cardbookConfiguration.resetAdrFormula();
			}
			// to be sure the pref is saved (resetting its value does not save the preference)
			cardbookPreferences.setStringPref("extensions.cardbook.adrFormula", document.getElementById('adrFormulaTextBox').value.replace(/\\n/g, "\n").trim());
		},

		loadEventEntryTitle: function () {
			var eventEntryTitle = cardbookPreferences.getStringPref("extensions.cardbook.eventEntryTitle");
			if (eventEntryTitle == "") {
				document.getElementById('calendarEntryTitleTextBox').value=cardbookRepository.strBundle.GetStringFromName("eventEntryTitleMessage");
			}
		},

		showTab: function () {
			if (window.arguments) {
				if (window.arguments[0].showTab) {
					wdw_cardbookConfiguration.showPane(window.arguments[0].showTab);
				}
			}
		},

		cardbookAutoComplete: function () {
			document.getElementById('autocompleteSortByPopularityCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
			document.getElementById('autocompleteProposeConcatEmailsCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
			document.getElementById('autocompleteShowAddressbookCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
			document.getElementById('autocompleteWithColorCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
			document.getElementById('autocompleteRestrictSearchCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
			if (document.getElementById('autocompletionCheckBox').checked && document.getElementById('autocompleteRestrictSearchCheckBox').checked) {
				document.getElementById('chooseAutocompleteRestrictSearchFieldsButton').disabled=false;
				document.getElementById('resetAutocompleteRestrictSearchFieldsButton').disabled=false;
			} else {
				document.getElementById('chooseAutocompleteRestrictSearchFieldsButton').disabled=true;
				document.getElementById('resetAutocompleteRestrictSearchFieldsButton').disabled=true;
			}
		},

		remindViaPopup: function () {
			if (document.getElementById('showPopupOnStartupCheckBox').checked || document.getElementById('showPeriodicPopupCheckBox').checked) {
				document.getElementById('showPopupEvenIfNoBirthdayCheckBox').disabled=false;
			} else {
				document.getElementById('showPopupEvenIfNoBirthdayCheckBox').disabled=true;
			}
			document.getElementById('periodicPopupTimeTextBox').disabled=!document.getElementById('showPeriodicPopupCheckBox').checked;
			document.getElementById('periodicPopupTimeLabel').disabled=!document.getElementById('showPeriodicPopupCheckBox').checked;
		},

		wholeDay: function () {
			document.getElementById('calendarEntryTimeTextBox').disabled=document.getElementById('calendarEntryWholeDayCheckBox').checked;
			document.getElementById('calendarEntryTimeLabel').disabled=document.getElementById('calendarEntryWholeDayCheckBox').checked;
		},

		LightningInstallation: function (aValue) {
			document.getElementById('calendarsGoupbox').disabled = aValue;
			document.getElementById('calendarsCheckbox').disabled = aValue;
			document.getElementById('calendarsTree').disabled = aValue;
			document.getElementById('numberOfDaysForWritingLabel').disabled = aValue;
			document.getElementById('numberOfDaysForWritingTextBox').disabled = aValue;
			document.getElementById('syncWithLightningOnStartupCheckBox').disabled = aValue;
			document.getElementById('calendarEntryTitleLabel').disabled = aValue;
			document.getElementById('calendarEntryTitleTextBox').disabled = aValue;
			if (!aValue) {
				if (document.getElementById('calendarEntryWholeDayCheckBox').checked) {
					document.getElementById('calendarEntryTimeTextBox').disabled=true;
					document.getElementById('calendarEntryTimeLabel').disabled=true;
				} else {
					document.getElementById('calendarEntryTimeTextBox').disabled=false;
					document.getElementById('calendarEntryTimeLabel').disabled=false;
				}
			} else {
				document.getElementById('calendarEntryWholeDayCheckBox').disabled = aValue;
				document.getElementById('calendarEntryTimeLabel').disabled = aValue;
				document.getElementById('calendarEntryTimeTextBox').disabled = aValue;
			}
			document.getElementById('calendarEntryAlarmLabel').disabled = aValue;
			document.getElementById('calendarEntryAlarmTextBox').disabled = aValue;
			document.getElementById('calendarEntryCategoriesLabel').disabled = aValue;
			document.getElementById('calendarEntryCategoriesTextBox').disabled = aValue;
		},

		loadDiscoveryAccounts: function () {
			var myPref = cardbookPreferences.getStringPref("extensions.cardbook.discoveryAccountsNameList");

			var tmpArray = cardbookSynchronization.getAllURLsToDiscover();
			wdw_cardbookConfiguration.allDiscoveryAccounts = [];

			var totalChecked = 0;
			for (var i = 0; i < tmpArray.length; i++) {
				if (myPref.includes(tmpArray[i][1])) {
					wdw_cardbookConfiguration.allDiscoveryAccounts.push([true, tmpArray[i][0], tmpArray[i][1]]);
					totalChecked++;
				} else {
					wdw_cardbookConfiguration.allDiscoveryAccounts.push([false, tmpArray[i][0], tmpArray[i][1]]);
				}
			}
			wdw_cardbookConfiguration.changeDiscoveryMainCheckbox(totalChecked);
		},
		
		displayDiscoveryAccounts: function () {
			var discoveryAccountsTreeView = {
				get rowCount() { return wdw_cardbookConfiguration.allDiscoveryAccounts.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				getCellText: function(idx, column) {
					if (column.id == "discoveryAccountsSelect") return wdw_cardbookConfiguration.allDiscoveryAccounts[idx][0];
					else if (column.id == "discoveryAccountsName") return wdw_cardbookConfiguration.allDiscoveryAccounts[idx][1];
				},
				getCellValue: function(idx, column) {
					if (column.id == "discoveryAccountsSelect") return wdw_cardbookConfiguration.allDiscoveryAccounts[idx][0];
					else if (column.id == "discoveryAccountsName") return true;
				},
				setCellValue: function(idx, column) {
					if (column.id == "discoveryAccountsSelect") {
						wdw_cardbookConfiguration.allDiscoveryAccounts[idx][0] = !wdw_cardbookConfiguration.allDiscoveryAccounts[idx][0];
						wdw_cardbookConfiguration.changeDiscoveryCheckbox();
						wdw_cardbookConfiguration.preferenceChanged('discoveryAccounts');
					}
				},
				isEditable: function(idx, column) {
					if (column.id == "discoveryAccountsSelect") return true;
					else return false;
				}
			}
			document.getElementById('discoveryAccountsTree').view = discoveryAccountsTreeView;
		},
		
		discoveryAccountsKeyup: function (aEvent) {
			switch (aEvent.key) {
				case " ":
					var myTree = document.getElementById('discoveryAccountsTree');
					var myIndex = myTree.currentIndex;
					if (myIndex != -1) {
						var myFirstRow = myTree.getFirstVisibleRow();
						wdw_cardbookConfiguration.allDiscoveryAccounts[myIndex][0] = !wdw_cardbookConfiguration.allDiscoveryAccounts[myIndex][0];
						wdw_cardbookConfiguration.sortTrees(null, "discoveryAccountsTree");
						wdw_cardbookConfiguration.preferenceChanged('discoveryAccounts');
						wdw_cardbookConfiguration.changeDiscoveryCheckbox();
						myTree.scrollToRow(myFirstRow);
						myTree.view.selection.select(myIndex);
						aEvent.preventDefault();
					} else {
						return;
					}
			}
		},

		changeDiscoveryCheckbox: function () {
			var totalChecked = 0;
			for (var i = 0; i < wdw_cardbookConfiguration.allDiscoveryAccounts.length; i++) {
				if (wdw_cardbookConfiguration.allDiscoveryAccounts[i][0]) {
					totalChecked++;
				}
			}
			wdw_cardbookConfiguration.changeDiscoveryMainCheckbox(totalChecked);
		},

		changeDiscoveryMainCheckbox: function (aTotalChecked) {
			var myCheckBox = document.getElementById('discoveryAccountsCheckbox');
			if (aTotalChecked == wdw_cardbookConfiguration.allDiscoveryAccounts.length && aTotalChecked != 0) {
				myCheckBox.checked = true;
			} else {
				myCheckBox.checked = false;
			}
		},

		changedDiscoveryMainCheckbox: function () {
			var myCheckBox = document.getElementById('discoveryAccountsCheckbox');
			if (myCheckBox.getAttribute('checked') == "true") {
				var myState = true;
			} else {
				var myState = false;
			}
			var tmpArray = [];
			for (var i = 0; i < wdw_cardbookConfiguration.allDiscoveryAccounts.length; i++) {
				tmpArray.push([myState, wdw_cardbookConfiguration.allDiscoveryAccounts[i][1], wdw_cardbookConfiguration.allDiscoveryAccounts[i][2]]);
			}

			wdw_cardbookConfiguration.allDiscoveryAccounts = JSON.parse(JSON.stringify(tmpArray));
			wdw_cardbookConfiguration.sortTrees(null, "discoveryAccountsTree");
			wdw_cardbookConfiguration.preferenceChanged('discoveryAccounts');
		},
		
		validateDiscoveryAccounts: function () {
			var tmpArray = [];
			for (var i = 0; i < wdw_cardbookConfiguration.allDiscoveryAccounts.length; i++) {
				if (wdw_cardbookConfiguration.allDiscoveryAccounts[i][0]) {
					tmpArray.push(wdw_cardbookConfiguration.allDiscoveryAccounts[i][2]);
				}
			}
			cardbookPreferences.setStringPref("extensions.cardbook.discoveryAccountsNameList", tmpArray.join(','));
		},

		loadAddressbooks: function () {
			var myPref = cardbookPreferences.getStringPref("extensions.cardbook.addressBooksNameList");

			var tmpArray = [];
			var accounts = cardbookPreferences.getAllPrefIds();
			for (var dirPrefId of accounts) {
				if (cardbookPreferences.getBoolPref(cardbookPreferences.prefCardBookData + dirPrefId + "." + "enabled", true) &&
					cardbookPreferences.getStringPref(cardbookPreferences.prefCardBookData + dirPrefId + "." + "type")) {
					tmpArray.push([cardbookPreferences.getName(dirPrefId), dirPrefId]);
				}
			}
			cardbookUtils.sortMultipleArrayByString(tmpArray,0,1);
			wdw_cardbookConfiguration.allAddressbooks = [];

			var totalChecked = 0;
			for (var account of tmpArray) {
				if ( (myPref.includes(account[1])) || (myPref == "allAddressBooks") ) {
					wdw_cardbookConfiguration.allAddressbooks.push([true, account[0], account[1]]);
					totalChecked++;
				} else {
					wdw_cardbookConfiguration.allAddressbooks.push([false, account[0], account[1]]);
				}
			}
			wdw_cardbookConfiguration.changeAddressbooksMainCheckbox(totalChecked);
		},
		
		displayAddressbooks: function () {
			var addressbooksTreeView = {
				get rowCount() { return wdw_cardbookConfiguration.allAddressbooks.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				getCellText: function(idx, column) {
					if (column.id == "addressbooksSelect") return wdw_cardbookConfiguration.allAddressbooks[idx][0];
					else if (column.id == "addressbooksName") return wdw_cardbookConfiguration.allAddressbooks[idx][1];
				},
				getCellValue: function(idx, column) {
					if (column.id == "addressbooksSelect") return wdw_cardbookConfiguration.allAddressbooks[idx][0];
					else if (column.id == "addressbooksName") return true;
				},
				setCellValue: function(idx, column) {
					if (column.id == "addressbooksSelect") {
						wdw_cardbookConfiguration.allAddressbooks[idx][0] = !wdw_cardbookConfiguration.allAddressbooks[idx][0];
						wdw_cardbookConfiguration.changeAddressbooksCheckbox();
						wdw_cardbookConfiguration.preferenceChanged('addressbooks');
					}
				},
				isEditable: function(idx, column) {
					if (column.id == "addressbooksSelect") return true;
					else return false;
				}
			}
			document.getElementById('addressbooksTree').view = addressbooksTreeView;
		},
		
		addressbooksKeyup: function (aEvent) {
			switch (aEvent.key) {
				case " ":
					var myTree = document.getElementById('addressbooksTree');
					var myIndex = myTree.currentIndex;
					if (myIndex != -1) {
						var myFirstRow = myTree.getFirstVisibleRow();
						wdw_cardbookConfiguration.allAddressbooks[myIndex][0] = !wdw_cardbookConfiguration.allAddressbooks[myIndex][0];
						wdw_cardbookConfiguration.sortTrees(null, "addressbooksTree");
						wdw_cardbookConfiguration.preferenceChanged('addressbooks');
						wdw_cardbookConfiguration.changeAddressbooksCheckbox();
						myTree.scrollToRow(myFirstRow);
						myTree.view.selection.select(myIndex);
						aEvent.preventDefault();
					} else {
						return;
					}
			}
		},

		changeAddressbooksCheckbox: function () {
			var totalChecked = 0;
			for (var i = 0; i < wdw_cardbookConfiguration.allAddressbooks.length; i++) {
				if (wdw_cardbookConfiguration.allAddressbooks[i][0]) {
					totalChecked++;
				}
			}
			wdw_cardbookConfiguration.changeAddressbooksMainCheckbox(totalChecked);
		},

		changeAddressbooksMainCheckbox: function (aTotalChecked) {
			var myCheckBox = document.getElementById('addressbooksCheckbox');
			if (aTotalChecked == wdw_cardbookConfiguration.allAddressbooks.length && aTotalChecked != 0) {
				myCheckBox.checked = true;
			} else {
				myCheckBox.checked = false;
			}
		},

		changedAddressbooksMainCheckbox: function () {
			var myCheckBox = document.getElementById('addressbooksCheckbox');
			if (myCheckBox.getAttribute('checked') == "true") {
				var myState = true;
			} else {
				var myState = false;
			}
			var tmpArray = [];
			for (var i = 0; i < wdw_cardbookConfiguration.allAddressbooks.length; i++) {
				tmpArray.push([myState, wdw_cardbookConfiguration.allAddressbooks[i][1], wdw_cardbookConfiguration.allAddressbooks[i][2]]);
			}

			wdw_cardbookConfiguration.allAddressbooks = JSON.parse(JSON.stringify(tmpArray));
			wdw_cardbookConfiguration.sortTrees(null, "addressbooksTree");
			wdw_cardbookConfiguration.preferenceChanged('addressbooks');
		},
		
		validateAddressbooks: function () {
			var myCheckBox = document.getElementById('addressbooksCheckbox');
			if (myCheckBox.getAttribute('checked') == "true") {
				cardbookPreferences.setStringPref("extensions.cardbook.addressBooksNameList", "allAddressBooks");
			} else {
				var tmpArray = [];
				for (var i = 0; i < wdw_cardbookConfiguration.allAddressbooks.length; i++) {
					if (wdw_cardbookConfiguration.allAddressbooks[i][0]) {
						tmpArray.push(wdw_cardbookConfiguration.allAddressbooks[i][2]);
					}
				}
				cardbookPreferences.setStringPref("extensions.cardbook.addressBooksNameList", tmpArray.join(','));
			}
		},
		
		loadCalendars: function (addon) {
			if (addon && addon.isActive) {
				var myPref = cardbookPreferences.getStringPref("extensions.cardbook.calendarsNameList");

				var tmpArray = [];
				var calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
				var calendars = calendarManager.getCalendars({});
				for (var prop in calendars) {
					var cal = calendars[prop];
					tmpArray.push([cal.name, cal.id]);
				}
				cardbookUtils.sortMultipleArrayByString(tmpArray,0,1);
				wdw_cardbookConfiguration.allCalendars = [];
			
				var totalChecked = 0;
				for (var i = 0; i < tmpArray.length; i++) {
					if ( (myPref.includes(tmpArray[i][1])) || (myPref == "allCalendars") ) {
						wdw_cardbookConfiguration.allCalendars.push([true, tmpArray[i][0], tmpArray[i][1]]);
						totalChecked++;
					} else {
						wdw_cardbookConfiguration.allCalendars.push([false, tmpArray[i][0], tmpArray[i][1]]);
					}
				}
				wdw_cardbookConfiguration.changeCalendarsMainCheckbox(totalChecked);
				wdw_cardbookConfiguration.LightningInstallation(false);
			} else {
				wdw_cardbookConfiguration.LightningInstallation(true);
			}
			wdw_cardbookConfiguration.sortTrees(null, "calendarsTree");
		},
		
		displayCalendars: function () {
			var calendarsTreeView = {
				get rowCount() { return wdw_cardbookConfiguration.allCalendars.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				getCellText: function(idx, column) {
					if (column.id == "calendarsSelect") return wdw_cardbookConfiguration.allCalendars[idx][0];
					else if (column.id == "calendarsName") return wdw_cardbookConfiguration.allCalendars[idx][1];
				},
				getCellValue: function(idx, column) {
					if (column.id == "calendarsSelect") return wdw_cardbookConfiguration.allCalendars[idx][0];
					else if (column.id == "calendarsName") return true;
				},
				setCellValue: function(idx, column) {
					if (column.id == "calendarsSelect") {
						wdw_cardbookConfiguration.allCalendars[idx][0] = !wdw_cardbookConfiguration.allCalendars[idx][0];
						wdw_cardbookConfiguration.changeCalendarsCheckbox();
						wdw_cardbookConfiguration.preferenceChanged('calendars');
					}
				},
				isEditable: function(idx, column) {
					if (column.id == "calendarsSelect") return true;
					else return false;
				}
			}
			document.getElementById('calendarsTree').view = calendarsTreeView;
		},
		
		calendarsKeyup: function (aEvent) {
			switch (aEvent.key) {
				case " ":
					var myTree = document.getElementById('calendarsTree');
					var myIndex = myTree.currentIndex;
					if (myIndex != -1) {
						var myFirstRow = myTree.getFirstVisibleRow();
						wdw_cardbookConfiguration.allCalendars[myIndex][0] = !wdw_cardbookConfiguration.allCalendars[myIndex][0];
						wdw_cardbookConfiguration.sortTrees(null, "calendarsTree");
						wdw_cardbookConfiguration.preferenceChanged('calendars');
						wdw_cardbookConfiguration.changeCalendarsCheckbox();
						myTree.scrollToRow(myFirstRow);
						myTree.view.selection.select(myIndex);
						aEvent.preventDefault();
					} else {
						return;
					}
			}
		},

		changeCalendarsCheckbox: function () {
			var totalChecked = 0;
			for (var i = 0; i < wdw_cardbookConfiguration.allCalendars.length; i++) {
				if (wdw_cardbookConfiguration.allCalendars[i][0]) {
					totalChecked++;
				}
			}
			wdw_cardbookConfiguration.changeCalendarsMainCheckbox(totalChecked);
		},

		changeCalendarsMainCheckbox: function (aTotalChecked) {
			var myCheckBox = document.getElementById('calendarsCheckbox');
			if (aTotalChecked == wdw_cardbookConfiguration.allCalendars.length && aTotalChecked != 0) {
				myCheckBox.checked = true;
			} else {
				myCheckBox.checked = false;
			}
		},

		changedCalendarsMainCheckbox: function () {
			var myCheckBox = document.getElementById('calendarsCheckbox');
			if (myCheckBox.getAttribute('checked') == "true") {
				var myState = true;
			} else {
				var myState = false;
			}
			var tmpArray = [];
			for (var i = 0; i < wdw_cardbookConfiguration.allCalendars.length; i++) {
				tmpArray.push([myState, wdw_cardbookConfiguration.allCalendars[i][1], wdw_cardbookConfiguration.allCalendars[i][2]]);
			}

			wdw_cardbookConfiguration.allCalendars = JSON.parse(JSON.stringify(tmpArray));
			wdw_cardbookConfiguration.sortTrees(null, "calendarsTree");
			wdw_cardbookConfiguration.preferenceChanged('calendars');
		},
		
		validateCalendars: function () {
			var tmpArray = [];
			for (var i = 0; i < wdw_cardbookConfiguration.allCalendars.length; i++) {
				if (wdw_cardbookConfiguration.allCalendars[i][0]) {
					tmpArray.push(wdw_cardbookConfiguration.allCalendars[i][2]);
				}
			}
			cardbookPreferences.setStringPref("extensions.cardbook.calendarsNameList", tmpArray.join(','));
		},

		resetCalendarEntryTitle: function () {
			document.getElementById('calendarEntryTitleTextBox').value = cardbookRepository.strBundle.GetStringFromName("eventEntryTitleMessage");
			cardbookPreferences.setStringPref("extensions.cardbook.eventEntryTitle", cardbookRepository.strBundle.GetStringFromName("eventEntryTitleMessage"));
		},

		validateEventEntryTitle: function () {
			if (document.getElementById('calendarEntryTitleTextBox').value == "") {
				wdw_cardbookConfiguration.resetCalendarEntryTitle();
			}
				
		},

		getEmailAccountName: function(aEmailAccountId) {
			if (aEmailAccountId == "allMailAccounts") {
				return cardbookRepository.strBundle.GetStringFromName(aEmailAccountId);
			}
			var accounts = MailServices.accounts.accounts;
			var accountsLength = (typeof accounts.Count === 'undefined') ? accounts.length : accounts.Count();
			for (var i = 0; i < accountsLength; i++) {
				var account = accounts.queryElementAt ? accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount) : accounts.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgAccount);
				if (!account.incomingServer) {
					continue;
				}
				var identitiesLength = (typeof account.identities.Count === 'undefined') ? account.identities.length : account.identities.Count();
				for (var j = 0; j < identitiesLength; j++) {
					var identity = account.identities.queryElementAt ? account.identities.queryElementAt(j, Components.interfaces.nsIMsgIdentity) : account.identities.GetElementAt(j).QueryInterface(Components.interfaces.nsIMsgIdentity);
					var mailAccountServer = account.incomingServer;
					if (mailAccountServer.type == "pop3" || mailAccountServer.type == "imap") {
						if (aEmailAccountId == identity.key) {
							return identity.email;
						}
					}
				}
			}
			return "";			
		},

		getABName: function(dirPrefId) {
			if (!cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
				var contactManager = MailServices.ab;
				var contacts = contactManager.directories;
				while ( contacts.hasMoreElements() ) {
					var contact = contacts.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
					if (contact.dirPrefId == dirPrefId) {
						return contact.dirName;
					}
				}
			}
			return cardbookUtils.getPrefNameFromPrefId(dirPrefId);
		},

		selectVCard: function() {
			var btnEdit = document.getElementById("renameVCardLabel");
			var myTree = document.getElementById("accountsVCardsTree");
			if (myTree.view && myTree.view.selection.getRangeCount() > 0) {
				btnEdit.disabled = false;
			} else {
				btnEdit.disabled = true;
			}
			document.getElementById("deleteVCardLabel").disabled = btnEdit.disabled;
		},

		loadVCards: function () {
			var result = [];
			result = cardbookPreferences.getAllVCards();
			var count = 0;
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i];
				var emailAccountName = wdw_cardbookConfiguration.getEmailAccountName(resultArray[1]);
				if (emailAccountName != "") {
					if (cardbookRepository.cardbookCards[resultArray[2]+"::"+resultArray[3]]) {
						var index = count++;
						var myFn = cardbookRepository.cardbookCards[resultArray[2]+"::"+resultArray[3]].fn;
						wdw_cardbookConfiguration.allVCards.push([(resultArray[0] == "true"), index.toString(), emailAccountName, resultArray[1], myFn, resultArray[2], resultArray[3], resultArray[4]]);
					}
				}
			}
		},
		
		displayVCards: function () {
			var accountsVCardsTreeView = {
				get rowCount() { return wdw_cardbookConfiguration.allVCards.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) {
					if (column.id == "accountsVCardsEnabled") return true;
					else return false;
				},
				getCellText: function(idx, column) {
					if (column.id == "accountsVCardsEnabled") return wdw_cardbookConfiguration.allVCards[idx][0];
					else if (column.id == "accountsVCardsId") return wdw_cardbookConfiguration.allVCards[idx][1];
					else if (column.id == "accountsVCardsMailName") return wdw_cardbookConfiguration.allVCards[idx][2];
					else if (column.id == "accountsVCardsMailId") return wdw_cardbookConfiguration.allVCards[idx][3];
					else if (column.id == "accountsVCardsFn") return wdw_cardbookConfiguration.allVCards[idx][4];
					else if (column.id == "accountsVCardsAddressBookId") return wdw_cardbookConfiguration.allVCards[idx][5];
					else if (column.id == "accountsVCardsContactId") return wdw_cardbookConfiguration.allVCards[idx][6];
					else if (column.id == "accountsVCardsFileName") return wdw_cardbookConfiguration.allVCards[idx][7];
				},
				getCellValue: function(idx, column) {
					if (column.id == "accountsVCardsEnabled") return wdw_cardbookConfiguration.allVCards[idx][0];
				},
				setCellValue: function(idx, column) {
					if (column.id == "accountsVCardsEnabled") {
						wdw_cardbookConfiguration.allVCards[idx][0] = !wdw_cardbookConfiguration.allVCards[idx][0];
						wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
					}
				}
			}
			document.getElementById('accountsVCardsTree').view = accountsVCardsTreeView;
			wdw_cardbookConfiguration.selectVCard();
		},
		
		addVCard: function () {
			var myArgs = {emailAccountName: "", emailAccountId: "", fn: "", addressBookId: "", contactId: "", fileName: "",  typeAction: ""};
			var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddVcards.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				wdw_cardbookConfiguration.allVCards.push([true, wdw_cardbookConfiguration.allVCards.length.toString(), myArgs.emailAccountName, myArgs.emailAccountId, myArgs.fn, myArgs.addressBookId, myArgs.contactId, myArgs.fileName]);
				wdw_cardbookConfiguration.sortTrees(null, "accountsVCardsTree");
				wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
			}
		},
		
		renameVCard: function () {
			var myTree = document.getElementById('accountsVCardsTree');
			if (myTree.currentIndex != -1) {
				var myEnabled = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsEnabled'));
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsId'));
				var myMailName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsMailName'));
				var myMailId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsMailId'));
				var myFn = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsFn'));
				var myABDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsAddressBookId'));
				var myContactId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsContactId'));
				var myFileName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsFileName'));
				var myArgs = {emailAccountName: myMailName, emailAccountId: myMailId, fn: myFn, addressBookId: myABDirPrefId, contactId: myContactId, fileName: myFileName, typeAction: ""};
				var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddVcards.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.typeAction == "SAVE") {
					var result = [];
					for (let i = 0; i < wdw_cardbookConfiguration.allVCards.length; i++) {
						if (myId === wdw_cardbookConfiguration.allVCards[i][1]) {
							result.push([myEnabled, myId, myArgs.emailAccountName, myArgs.emailAccountId, myArgs.fn, myArgs.addressBookId, myArgs.contactId, myArgs.fileName]);
						} else {
							result.push(wdw_cardbookConfiguration.allVCards[i]);
						}
					}
					wdw_cardbookConfiguration.allVCards = JSON.parse(JSON.stringify(result));
					wdw_cardbookConfiguration.sortTrees(null, "accountsVCardsTree");
					wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
				}
			}
		},
		
		deleteVCard: function () {
			var myTree = document.getElementById('accountsVCardsTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsVCardsId'));
				var result = [];
				for (let i = 0; i < wdw_cardbookConfiguration.allVCards.length; i++) {
					if (myId !== wdw_cardbookConfiguration.allVCards[i][1]) {
						result.push(wdw_cardbookConfiguration.allVCards[i]);
					}
				}
				wdw_cardbookConfiguration.allVCards = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "accountsVCardsTree");
				wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
			}
		},
		
		validateVCards: function () {
			cardbookPreferences.delVCards();
			for (var i = 0; i < wdw_cardbookConfiguration.allVCards.length; i++) {
				cardbookPreferences.setVCard(i.toString(), wdw_cardbookConfiguration.allVCards[i][0].toString() + "::" + wdw_cardbookConfiguration.allVCards[i][3]
													+ "::" + wdw_cardbookConfiguration.allVCards[i][5] + "::" + wdw_cardbookConfiguration.allVCards[i][6] + "::" + wdw_cardbookConfiguration.allVCards[i][7]);
			}
		},

		selectRestriction: function() {
			var btnEdit = document.getElementById("renameRestrictionLabel");
			var myTree = document.getElementById("accountsRestrictionsTree");
			if (myTree.view && myTree.view.selection.getRangeCount() > 0) {
				btnEdit.disabled = false;
			} else {
				btnEdit.disabled = true;
			}
			document.getElementById("deleteRestrictionLabel").disabled = btnEdit.disabled;
		},

		loadRestrictions: function () {
			var result = [];
			result = cardbookPreferences.getAllRestrictions();
			var count = 0;
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i];
				var emailAccountName = wdw_cardbookConfiguration.getEmailAccountName(resultArray[2]);
				if (emailAccountName != "") {
					var ABName = wdw_cardbookConfiguration.getABName(resultArray[3]);
					if (ABName != "") {
						var index = count++;
						if (resultArray[4]) {
							var categoryId = resultArray[3] + "::" + resultArray[4];
							var categoryName = resultArray[4];
						} else {
							var categoryId = "";
							var categoryName = "";
						}
						wdw_cardbookConfiguration.allRestrictions.push([(resultArray[0] == "true"), index.toString(), emailAccountName, resultArray[2],
																		ABName, resultArray[3], categoryName, categoryId, cardbookRepository.strBundle.GetStringFromName(resultArray[1] + "Label"), resultArray[1]]);
					}
				}
			}
		},
		
		displayRestrictions: function () {
			var accountsRestrictionsTreeView = {
				get rowCount() { return wdw_cardbookConfiguration.allRestrictions.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) {
					if (column.id == "accountsRestrictionsEnabled") return true;
					else return false;
				},
				getCellText: function(idx, column) {
					if (column.id == "accountsRestrictionsEnabled") return wdw_cardbookConfiguration.allRestrictions[idx][0];
					else if (column.id == "accountsRestrictionsId") return wdw_cardbookConfiguration.allRestrictions[idx][1];
					else if (column.id == "accountsRestrictionsMailName") return wdw_cardbookConfiguration.allRestrictions[idx][2];
					else if (column.id == "accountsRestrictionsMailId") return wdw_cardbookConfiguration.allRestrictions[idx][3];
					else if (column.id == "accountsRestrictionsABName") return wdw_cardbookConfiguration.allRestrictions[idx][4];
					else if (column.id == "accountsRestrictionsDirPrefId") return wdw_cardbookConfiguration.allRestrictions[idx][5];
					else if (column.id == "accountsRestrictionsCatName") return wdw_cardbookConfiguration.allRestrictions[idx][6];
					else if (column.id == "accountsRestrictionsCatId") return wdw_cardbookConfiguration.allRestrictions[idx][7];
					else if (column.id == "accountsRestrictionsIncludeName") return wdw_cardbookConfiguration.allRestrictions[idx][8];
					else if (column.id == "accountsRestrictionsIncludeCode") return wdw_cardbookConfiguration.allRestrictions[idx][9];
				},
				getCellValue: function(idx, column) {
					if (column.id == "accountsRestrictionsEnabled") return wdw_cardbookConfiguration.allRestrictions[idx][0];
				},
				setCellValue: function(idx, column) {
					if (column.id == "accountsRestrictionsEnabled") {
						wdw_cardbookConfiguration.allRestrictions[idx][0] = !wdw_cardbookConfiguration.allRestrictions[idx][0];
						wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
					}
				}
			}
			document.getElementById('accountsRestrictionsTree').view = accountsRestrictionsTreeView;
			wdw_cardbookConfiguration.selectRestriction();
		},
		
		addRestriction: function () {
			var myArgs = {emailAccountId: "", emailAccountName: "", addressBookId: "", addressBookName: "", categoryName: "", includeName: "",  includeCode: "", typeAction: "", context: "Restriction"};
			var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				wdw_cardbookConfiguration.allRestrictions.push([true, wdw_cardbookConfiguration.allRestrictions.length.toString(), myArgs.emailAccountName, myArgs.emailAccountId,
																myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId, myArgs.includeName, myArgs.includeCode]);
				wdw_cardbookConfiguration.sortTrees(null, "accountsRestrictionsTree");
				wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
			}
		},
		
		renameRestriction: function () {
			var myTree = document.getElementById('accountsRestrictionsTree');
			if (myTree.currentIndex != -1) {
				var myEnabled = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsEnabled'));
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsId'));
				var myMailId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsMailId'));
				var myMailName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsMailName'));
				var myABName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsABName'));
				var myABDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsDirPrefId'));
				var myCatName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsCatName'));
				var myCatId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsCatId'));
				var myIncludeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsIncludeName'));
				var myIncludeCode = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsIncludeCode'));
				var myArgs = {emailAccountId: myMailId, emailAccountName: myMailName, addressBookId: myABDirPrefId, addressBookName: myABName, categoryId: myCatId, categoryName: myCatName,
								includeName: myIncludeName, includeCode: myIncludeCode, typeAction: "", context: "Restriction"};
				var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.typeAction == "SAVE") {
					var result = [];
					for (let i = 0; i < wdw_cardbookConfiguration.allRestrictions.length; i++) {
						if (myId === wdw_cardbookConfiguration.allRestrictions[i][1]) {
							result.push([myEnabled, myId, myArgs.emailAccountName, myArgs.emailAccountId, myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId,
										myArgs.includeName, myArgs.includeCode]);
						} else {
							result.push(wdw_cardbookConfiguration.allRestrictions[i]);
						}
					}
					wdw_cardbookConfiguration.allRestrictions = JSON.parse(JSON.stringify(result));
					wdw_cardbookConfiguration.sortTrees(null, "accountsRestrictionsTree");
					wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
				}
			}
		},
		
		deleteRestriction: function () {
			var myTree = document.getElementById('accountsRestrictionsTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountsRestrictionsId'));
				var result = [];
				for (let i = 0; i < wdw_cardbookConfiguration.allRestrictions.length; i++) {
					if (myId !== wdw_cardbookConfiguration.allRestrictions[i][1]) {
						result.push(wdw_cardbookConfiguration.allRestrictions[i]);
					}
				}
				wdw_cardbookConfiguration.allRestrictions = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "accountsRestrictionsTree");
				wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
			}
		},
		
		validateRestrictions: function () {
			cardbookPreferences.delRestrictions();
			for (var i = 0; i < wdw_cardbookConfiguration.allRestrictions.length; i++) {
				cardbookPreferences.setRestriction(i.toString(), wdw_cardbookConfiguration.allRestrictions[i][0].toString() + "::" + wdw_cardbookConfiguration.allRestrictions[i][9]
													+ "::" + wdw_cardbookConfiguration.allRestrictions[i][3] + "::" + wdw_cardbookConfiguration.allRestrictions[i][5] + "::" + wdw_cardbookConfiguration.allRestrictions[i][6]);
			}
		},

		selectType: function() {
			var btnEdit = document.getElementById("renameTypeLabel");
			var myTree = document.getElementById("typesTree");
			if (myTree.view && myTree.view.selection.getRangeCount() > 0) {
				btnEdit.disabled = false;
			} else {
				btnEdit.disabled = true;
			}
			document.getElementById("deleteTypeLabel").disabled = btnEdit.disabled;
		},

		loadTypes: function () {
			var ABTypes = [ 'CARDDAV' , 'GOOGLE', 'APPLE', 'YAHOO' ];
			for (var i in ABTypes) {
				var myABType = ABTypes[i];
				wdw_cardbookConfiguration.allTypes[myABType] = {};
				for (var j in cardbookRepository.multilineFields) {
					let myType = cardbookRepository.multilineFields[j];
					wdw_cardbookConfiguration.allTypes[myABType][myType] = cardbookTypes.getTypes(myABType, myType, false);
				}
			}
		},

		displayTypes: function () {
			var typesTreeView = {
				ABTypeField: document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value,
				typeField: document.getElementById('typesCategoryRadiogroup').selectedItem.value,
				get rowCount() {
					if (wdw_cardbookConfiguration.allTypes[this.ABTypeField][this.typeField]) {
						return wdw_cardbookConfiguration.allTypes[this.ABTypeField][this.typeField].length;
					} else {
						return 0;
					}
				},
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == "typesLabel") return wdw_cardbookConfiguration.allTypes[this.ABTypeField][this.typeField][idx][0];
				}
			}
			document.getElementById('typesTree').view = typesTreeView;
			wdw_cardbookConfiguration.selectType();
		},

		addType: function () {
			var myABTypeField = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
			var myTypeField = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
			var myValidationList = [];
			for (let i = 0; i < wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField].length; i++) {
				myValidationList.push(wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i][0]);
				myValidationList.push(wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i][1]);
			}
			var myArgs = {type: "", context: "AddType", typeAction: "", validationList: myValidationList};
			var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
				wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField].push([myArgs.type, myArgs.type]);
				wdw_cardbookConfiguration.sortTrees(null, "typesTree");
				wdw_cardbookConfiguration.preferenceChanged('customTypes');
			}
		},
		
		renameType: function () {
			var myTree = document.getElementById('typesTree');
			if (myTree.currentIndex != -1) {
				var myABTypeField = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
				var myTypeField = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
				var myValidationList = [];
				for (let i = 0; i < wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField].length; i++) {
					myValidationList.push(wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i][0]);
					myValidationList.push(wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i][1]);
				}
				var myValue = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('typesLabel'));
				function filterOriginal(element) {
					return (element != myValue);
				}
				myValidationList = myValidationList.filter(filterOriginal);
				var myArgs = {type: myValue, context: "EditType", typeAction: "", validationList: myValidationList};
				var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
					var result = [];
					for (let i = 0; i < wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField].length; i++) {
						if (myValue === wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i][0]) {
							result.push([myArgs.type, wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i][1]]);
						} else {
							result.push(wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i]);
						}
					}
					wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField] = JSON.parse(JSON.stringify(result));
					wdw_cardbookConfiguration.sortTrees(null, "typesTree");
					wdw_cardbookConfiguration.preferenceChanged('customTypes');
				}
			}
		},
		
		deleteType: function () {
			var myTree = document.getElementById('typesTree');
			if (myTree.currentIndex != -1) {
				var myABTypeField = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
				var myTypeField = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
				var myValue = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('typesLabel'));
				var result = [];
				for (let i = 0; i < wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField].length; i++) {
					if (myValue !== wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i][0]) {
						result.push(wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField][i]);
					}
				}
				wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField] = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "typesTree");
				wdw_cardbookConfiguration.preferenceChanged('customTypes');
			}
		},
		
		resetType: function () {
			var myABTypeField = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
			var myTypeField = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
			wdw_cardbookConfiguration.allTypes[myABTypeField][myTypeField] = cardbookTypes.getTypes(myABTypeField, myTypeField, true);
			wdw_cardbookConfiguration.sortTrees(null, "typesTree");
			wdw_cardbookConfiguration.preferenceChanged('customTypes');
		},

		validateTypes: function () {
			Services.prefs.deleteBranch(cardbookPreferences.prefCardBookCustomTypes);
			var ABTypes = [ 'CARDDAV', 'GOOGLE', 'APPLE', 'YAHOO' ];
			for (var i in ABTypes) {
				var myABType = ABTypes[i];
				for (var j in cardbookRepository.multilineFields) {
					let myType = cardbookRepository.multilineFields[j];
					// searching for new or updated
					for (let k = 0; k < wdw_cardbookConfiguration.allTypes[myABType][myType].length; k++) {
						var isItANew = true;
						var myLabel = wdw_cardbookConfiguration.allTypes[myABType][myType][k][0];
						var myCode = wdw_cardbookConfiguration.allTypes[myABType][myType][k][1];
						for (let l = 0; l < cardbookRepository.cardbookCoreTypes[myABType][myType].length; l++) {
							var myCoreCodeType = cardbookRepository.cardbookCoreTypes[myABType][myType][l][0];
							if (myCode == myCoreCodeType) {
								if (myLabel != cardbookRepository.strBundle.GetStringFromName(myCoreCodeType)) {
									cardbookPreferences.setStringPref(cardbookPreferences.prefCardBookCustomTypes + myABType + "." + myType + "." + myCode + ".value", myLabel);
								}
								isItANew = false;
								break;
							}
						}
						if (isItANew) {
							cardbookPreferences.setStringPref(cardbookPreferences.prefCardBookCustomTypes + myABType + "." + myType + "." + myCode + ".value", myLabel);
						}
					}
					// searching for deleted
					for (let k = 0; k < cardbookRepository.cardbookCoreTypes[myABType][myType].length; k++) {
						var myCoreCodeType = cardbookRepository.cardbookCoreTypes[myABType][myType][k][0];
						var wasItDeleted = true;
						for (let l = 0; l < wdw_cardbookConfiguration.allTypes[myABType][myType].length; l++) {
							var myCode = wdw_cardbookConfiguration.allTypes[myABType][myType][l][1];
							if (myCode == myCoreCodeType) {
								wasItDeleted = false;
								break;
							}
						}
						if (wasItDeleted) {
							cardbookPreferences.setBoolPref(cardbookPreferences.prefCardBookCustomTypes + myABType + "." + myType + "." + myCoreCodeType + ".disabled", true);
						}
					}
				}
			}
		},

		selectEmailsCollection: function() {
			var btnEdit = document.getElementById("renameEmailsCollectionLabel");
			var myTree = document.getElementById("emailsCollectionTree");
			if (myTree.view && myTree.view.selection.getRangeCount() > 0) {
				btnEdit.disabled = false;
			} else {
				btnEdit.disabled = true;
			}
			document.getElementById("deleteEmailsCollectionLabel").disabled = btnEdit.disabled;
		},

		loadEmailsCollection: function () {
			var result = [];
			result = cardbookPreferences.getAllEmailsCollections();
			var count = 0;
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i];
				var emailAccountName = wdw_cardbookConfiguration.getEmailAccountName(resultArray[1]);
				if (emailAccountName != "") {
					var ABName = wdw_cardbookConfiguration.getABName(resultArray[2]);
					if (ABName != "") {
						var index = count++;
						if (resultArray[3]) {
							var categoryId = resultArray[2] + "::" + resultArray[3];
							var categoryName = resultArray[3];
						} else {
							var categoryId = "";
							var categoryName = "";
						}
						wdw_cardbookConfiguration.allEmailsCollections.push([(resultArray[0] == "true"), index.toString(), emailAccountName, resultArray[1],
																		ABName, resultArray[2], categoryName, categoryId]);
					}
				}
			}
		},
		
		displayEmailsCollection: function () {
			var emailsCollectionTreeView = {
				get rowCount() { return wdw_cardbookConfiguration.allEmailsCollections.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) {
					if (column.id == "emailsCollectionEnabled") return true;
					else return false;
				},
				getCellText: function(idx, column) {
					if (column.id == "emailsCollectionEnabled") return wdw_cardbookConfiguration.allEmailsCollections[idx][0];
					else if (column.id == "emailsCollectionId") return wdw_cardbookConfiguration.allEmailsCollections[idx][1];
					else if (column.id == "emailsCollectionMailName") return wdw_cardbookConfiguration.allEmailsCollections[idx][2];
					else if (column.id == "emailsCollectionMailId") return wdw_cardbookConfiguration.allEmailsCollections[idx][3];
					else if (column.id == "emailsCollectionABName") return wdw_cardbookConfiguration.allEmailsCollections[idx][4];
					else if (column.id == "emailsCollectionDirPrefId") return wdw_cardbookConfiguration.allEmailsCollections[idx][5];
					else if (column.id == "emailsCollectionCatName") return wdw_cardbookConfiguration.allEmailsCollections[idx][6];
					else if (column.id == "emailsCollectionCatId") return wdw_cardbookConfiguration.allEmailsCollections[idx][7];
				},
				getCellValue: function(idx, column) {
					if (column.id == "emailsCollectionEnabled") return wdw_cardbookConfiguration.allEmailsCollections[idx][0];
				},
				setCellValue: function(idx, column) {
					if (column.id == "emailsCollectionEnabled") {
						wdw_cardbookConfiguration.allEmailsCollections[idx][0] = !wdw_cardbookConfiguration.allEmailsCollections[idx][0];
						wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
					}
				}
			}
			document.getElementById('emailsCollectionTree').view = emailsCollectionTreeView;
			wdw_cardbookConfiguration.selectEmailsCollection();
		},
		
		addEmailsCollection: function () {
			var myArgs = {emailAccountId: "", emailAccountName: "", addressBookId: "", addressBookName: "", categoryName: "", typeAction: "", context: "Collection"};
			var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				wdw_cardbookConfiguration.allEmailsCollections.push([true, wdw_cardbookConfiguration.allEmailsCollections.length.toString(), myArgs.emailAccountName, myArgs.emailAccountId,
																myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId]);
				wdw_cardbookConfiguration.sortTrees(null, "emailsCollectionTree");
				wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
			}
		},
		
		renameEmailsCollection: function () {
			var myTree = document.getElementById('emailsCollectionTree');
			if (myTree.currentIndex != -1) {
				var myEnabled = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionEnabled'));
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionId'));
				var myMailId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionMailId'));
				var myMailName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionMailName'));
				var myABName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionABName'));
				var myABDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionDirPrefId'));
				var myCatName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionCatName'));
				var myCatId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionCatId'));
				var myArgs = {emailAccountId: myMailId, emailAccountName: myMailName, addressBookId: myABDirPrefId, addressBookName: myABName, categoryId: myCatId, categoryName: myCatName,
								typeAction: "", context: "Collection"};
				var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.typeAction == "SAVE") {
					var result = [];
					for (let i = 0; i < wdw_cardbookConfiguration.allEmailsCollections.length; i++) {
						if (myId === wdw_cardbookConfiguration.allEmailsCollections[i][1]) {
							result.push([myEnabled, myId, myArgs.emailAccountName, myArgs.emailAccountId, myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId]);
						} else {
							result.push(wdw_cardbookConfiguration.allEmailsCollections[i]);
						}
					}
					wdw_cardbookConfiguration.allEmailsCollections = JSON.parse(JSON.stringify(result));
					wdw_cardbookConfiguration.sortTrees(null, "emailsCollectionTree");
					wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
				}
			}
		},
		
		deleteEmailsCollection: function () {
			var myTree = document.getElementById('emailsCollectionTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('emailsCollectionId'));
				var result = [];
				for (let i = 0; i < wdw_cardbookConfiguration.allEmailsCollections.length; i++) {
					if (myId !== wdw_cardbookConfiguration.allEmailsCollections[i][1]) {
						result.push(wdw_cardbookConfiguration.allEmailsCollections[i]);
					}
				}
				wdw_cardbookConfiguration.allEmailsCollections = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "emailsCollectionTree");
				wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
			}
		},
		
		validateEmailsCollection: function () {
			cardbookPreferences.delEmailsCollection();
			for (var i = 0; i < wdw_cardbookConfiguration.allEmailsCollections.length; i++) {
				cardbookPreferences.setEmailsCollection(i.toString(), wdw_cardbookConfiguration.allEmailsCollections[i][0].toString() + "::" + wdw_cardbookConfiguration.allEmailsCollections[i][3]
														+ "::" + wdw_cardbookConfiguration.allEmailsCollections[i][5] + "::" + wdw_cardbookConfiguration.allEmailsCollections[i][6]);
			}
		},
		
		loadURLPhonesPassword: function () {
			var myUser = cardbookPreferences.getStringPref("extensions.cardbook.URLPhoneUser");
			var myUrl = cardbookPreferences.getStringPref("extensions.cardbook.URLPhoneURL");
			document.getElementById('URLPhonePasswordTextBox').value = cardbookPasswordManager.getPassword(myUser, myUrl);
		},

		showPassword: function () {
			var passwordType = document.getElementById('URLPhonePasswordTextBox').type;
			if (passwordType != "password") {
				document.getElementById('URLPhonePasswordTextBox').type = "password";
			} else {
				document.getElementById('URLPhonePasswordTextBox').type = "";
			}
		},

		displayURLPhones: function () {
			if (document.getElementById('imppsCategoryRadiogroup').selectedItem.value == "impp") {
				document.getElementById('URLPhoneGroupbox').hidden = true;
			} else {
				document.getElementById('URLPhoneGroupbox').hidden = false;
				if (wdw_cardbookConfiguration.allIMPPs['tel'].length == 1 && wdw_cardbookConfiguration.allIMPPs['tel'][0][2] == "url") {
					document.getElementById('URLPhoneURLLabel').disabled = false;
					document.getElementById('URLPhoneURLTextBox').disabled = false;
					document.getElementById('URLPhoneUserLabel').disabled = false;
					document.getElementById('URLPhoneUserTextBox').disabled = false;
					document.getElementById('URLPhonePasswordLabel').disabled = false;
					document.getElementById('URLPhonePasswordTextBox').disabled = false;
					document.getElementById('URLPhoneBackgroundCheckBox').disabled = false;
				} else {
					document.getElementById('URLPhoneURLLabel').disabled = true;
					document.getElementById('URLPhoneURLTextBox').disabled = true;
					document.getElementById('URLPhoneUserLabel').disabled = true;
					document.getElementById('URLPhoneUserTextBox').disabled = true;
					document.getElementById('URLPhonePasswordLabel').disabled = true;
					document.getElementById('URLPhonePasswordTextBox').disabled = true;
					document.getElementById('URLPhoneBackgroundCheckBox').disabled = true;
				}
			}
			wdw_cardbookConfiguration.loadURLPhonesPassword();
		},
		
		validateURLPhonesPassword: function () {
			var myURL = document.getElementById('URLPhoneURLTextBox').value;
			var myUser = document.getElementById('URLPhoneUserTextBox').value;
			var myPassword = document.getElementById('URLPhonePasswordTextBox').value;
			if (myPassword) {
				cardbookPasswordManager.rememberPassword(myUser, myURL, myPassword, true);
			}
		},

		selectIMPPsCategory: function () {
			wdw_cardbookConfiguration.selectIMPPs();
			wdw_cardbookConfiguration.sortTrees(null, 'IMPPsTree');
		},
		
		selectIMPPs: function() {
			var myTree = document.getElementById("IMPPsTree");
			var type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
			var btnAdd = document.getElementById("addIMPPLabel");
			btnAdd.disabled = false;
			if (type == "tel" && wdw_cardbookConfiguration.allIMPPs['tel'].length == 1) {
				btnAdd.disabled = true;
			}
			var btnEdit = document.getElementById("renameIMPPLabel");
			if (myTree.view && myTree.view.selection.getRangeCount() > 0) {
				btnEdit.disabled = false;
			} else {
				btnEdit.disabled = true;
			}
			document.getElementById("deleteIMPPLabel").disabled = btnEdit.disabled;
			wdw_cardbookConfiguration.displayURLPhones();
		},

		loadIMPPs: function () {
			wdw_cardbookConfiguration.allIMPPs['impp'] = [];
			wdw_cardbookConfiguration.allIMPPs['impp'] = cardbookUtils.sortMultipleArrayByString(cardbookPreferences.getAllIMPPs(),1,1);
			wdw_cardbookConfiguration.allIMPPs['tel'] = [];
			wdw_cardbookConfiguration.allIMPPs['tel'] = cardbookUtils.sortMultipleArrayByString(cardbookPreferences.getAllTels(),1,1);
		},
		
		displayIMPPs: function () {
			var IMPPsTreeView = {
				typeField: document.getElementById('imppsCategoryRadiogroup').selectedItem.value,
				get rowCount() {
					if (wdw_cardbookConfiguration.allIMPPs[this.typeField]) {
						return wdw_cardbookConfiguration.allIMPPs[this.typeField].length;
					} else {
						return 0;
					}
				},
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == "IMPPCode") return wdw_cardbookConfiguration.allIMPPs[this.typeField][idx][0];
					else if (column.id == "IMPPLabel") return wdw_cardbookConfiguration.allIMPPs[this.typeField][idx][1];
					else if (column.id == "IMPPProtocol") return wdw_cardbookConfiguration.allIMPPs[this.typeField][idx][2];
					else if (column.id == "IMPPId") return wdw_cardbookConfiguration.allIMPPs[this.typeField][idx][3];
				}
			}
			document.getElementById('IMPPsTree').view = IMPPsTreeView;
			wdw_cardbookConfiguration.selectIMPPs();
		},

		addIMPP: function () {
			var type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
			var myArgs = {code: "", label: "", protocol: "", typeAction: ""};
			var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddIMPP.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				wdw_cardbookConfiguration.allIMPPs[type].push([myArgs.code, myArgs.label, myArgs.protocol, wdw_cardbookConfiguration.allIMPPs[type].length]);
				wdw_cardbookConfiguration.sortTrees(null, "IMPPsTree");
				wdw_cardbookConfiguration.preferenceChanged('impps');
			}
		},
		
		renameIMPP: function () {
			var type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
			var myTree = document.getElementById('IMPPsTree');
			if (myTree.currentIndex != -1) {
				var myCode = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('IMPPCode'));
				var myLabel = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('IMPPLabel'));
				var myProtocol = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('IMPPProtocol'));
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('IMPPId'));
				var myArgs = {code: myCode, label: myLabel, protocol: myProtocol, typeAction: ""};
				var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddIMPP.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.typeAction == "SAVE") {
					var result = [];
					for (let i = 0; i < wdw_cardbookConfiguration.allIMPPs[type].length; i++) {
						if (myId == wdw_cardbookConfiguration.allIMPPs[type][i][3]) {
							result.push([myArgs.code, myArgs.label, myArgs.protocol, myId]);
						} else {
							result.push(wdw_cardbookConfiguration.allIMPPs[type][i]);
						}
					}
					wdw_cardbookConfiguration.allIMPPs[type] = JSON.parse(JSON.stringify(result));
					wdw_cardbookConfiguration.sortTrees(null, "IMPPsTree");
					wdw_cardbookConfiguration.preferenceChanged('impps');
				}
			}
		},
		
		deleteIMPP: function () {
			var type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
			var myTree = document.getElementById('IMPPsTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('IMPPId'));
				var result = [];
				for (let i = 0; i < wdw_cardbookConfiguration.allIMPPs[type].length; i++) {
					if (myId != wdw_cardbookConfiguration.allIMPPs[type][i][3]) {
						result.push(wdw_cardbookConfiguration.allIMPPs[type][i]);
					}
				}
				wdw_cardbookConfiguration.allIMPPs[type] = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "IMPPsTree");
				wdw_cardbookConfiguration.preferenceChanged('impps');
			}
		},

		validateIMPPs: function () {
			cardbookPreferences.delIMPPs();
			for (var i in wdw_cardbookConfiguration.allIMPPs['impp']) {
				cardbookPreferences.setIMPPs(i, wdw_cardbookConfiguration.allIMPPs['impp'][i][0] + ":" + wdw_cardbookConfiguration.allIMPPs['impp'][i][1] + ":" + wdw_cardbookConfiguration.allIMPPs['impp'][i][2]);
			}
			cardbookPreferences.delTels();
			for (var i in wdw_cardbookConfiguration.allIMPPs['tel']) {
				cardbookPreferences.setTels(i, wdw_cardbookConfiguration.allIMPPs['tel'][i][0] + ":" + wdw_cardbookConfiguration.allIMPPs['tel'][i][1] + ":" + wdw_cardbookConfiguration.allIMPPs['tel'][i][2]);
			}
		},

		selectCustomFields: function() {
			var btnEdit = document.getElementById("renameCustomFieldsLabel");
			var btnUp = document.getElementById("upCustomFieldsLabel");
			var btnDown = document.getElementById("downCustomFieldsLabel");
			var type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
			var myTree = document.getElementById("customFieldsTree");
			if (myTree.view && myTree.view.selection.getRangeCount() > 0) {
				btnEdit.disabled = false;
				if (wdw_cardbookConfiguration.allCustomFields[type].length > 1) {
					if (myTree.currentIndex == 0) {
						btnUp.disabled = true;
					} else {
						btnUp.disabled = false;
					}
					if (myTree.currentIndex == wdw_cardbookConfiguration.allCustomFields[type].length-1) {
						btnDown.disabled = true;
					} else {
						btnDown.disabled = false;
					}
				} else {
					btnUp.disabled = true;
					btnDown.disabled = true;
				}
			} else {
				btnEdit.disabled = true;
				btnUp.disabled = true;
				btnDown.disabled = true;
			}
			document.getElementById("deleteCustomFieldsLabel").disabled = btnEdit.disabled;
		},

		loadCustomFields: function () {
			wdw_cardbookConfiguration.allCustomFields = cardbookPreferences.getAllCustomFields();
		},

		displayCustomFields: function () {
			var customFieldsTreeView = {
				typeField: document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value,
				get rowCount() {
					if (wdw_cardbookConfiguration.allCustomFields[this.typeField]) {
						return wdw_cardbookConfiguration.allCustomFields[this.typeField].length;
					} else {
						return 0;
					}
				},
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == "customFieldsCode") return wdw_cardbookConfiguration.allCustomFields[this.typeField][idx][0];
					else if (column.id == "customFieldsLabel") return wdw_cardbookConfiguration.allCustomFields[this.typeField][idx][1];
					else if (column.id == "customFieldsRank") return wdw_cardbookConfiguration.allCustomFields[this.typeField][idx][2];
				}
			}
			document.getElementById('customFieldsTree').view = customFieldsTreeView;
			wdw_cardbookConfiguration.selectCustomFields();
		},

		upCustomFields: function () {
			var type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
			var myTree = document.getElementById('customFieldsTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('customFieldsRank'))*1;
				var temp = [wdw_cardbookConfiguration.allCustomFields[type][myId-1][0], wdw_cardbookConfiguration.allCustomFields[type][myId-1][1], parseInt(myId)];
				wdw_cardbookConfiguration.allCustomFields[type][myId-1] = [wdw_cardbookConfiguration.allCustomFields[type][myId][0], wdw_cardbookConfiguration.allCustomFields[type][myId][1], parseInt(myId-1)];
				wdw_cardbookConfiguration.allCustomFields[type][myId] = temp;
				wdw_cardbookConfiguration.sortTrees(null, "customFieldsTree");
				wdw_cardbookConfiguration.preferenceChanged('customFields');
			}
		},

		downCustomFields: function () {
			var type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
			var myTree = document.getElementById('customFieldsTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('customFieldsRank'))*1;
				var temp = [wdw_cardbookConfiguration.allCustomFields[type][myId+1][0], wdw_cardbookConfiguration.allCustomFields[type][myId+1][1], parseInt(myId)];
				wdw_cardbookConfiguration.allCustomFields[type][myId+1] = [wdw_cardbookConfiguration.allCustomFields[type][myId][0], wdw_cardbookConfiguration.allCustomFields[type][myId][1], parseInt(myId+1)];
				wdw_cardbookConfiguration.allCustomFields[type][myId] = temp;
				wdw_cardbookConfiguration.sortTrees(null, "customFieldsTree");
				wdw_cardbookConfiguration.preferenceChanged('customFields');
			}
		},

		addCustomFields: function () {
			var type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
			var myValidationList = wdw_cardbookConfiguration.getAllCustomsFields();
			var myArgs = {code: "", label: "", typeAction: "", validationList: myValidationList};
			var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddCustomField.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				var result = [];
				var already = false;
				for (let i = 0; i < wdw_cardbookConfiguration.allCustomFields[type].length; i++) {
					if (myArgs.code.toLowerCase() === wdw_cardbookConfiguration.allCustomFields[type][i][0].toLowerCase()) {
						result.push([myArgs.code, myArgs.label, i]);
						already = true;
					} else {
						result.push([wdw_cardbookConfiguration.allCustomFields[type][i][0], wdw_cardbookConfiguration.allCustomFields[type][i][1], i]);
					}
				}
				if (!already) {
					result.push([myArgs.code, myArgs.label, wdw_cardbookConfiguration.allCustomFields[type].length]);
				}
				wdw_cardbookConfiguration.allCustomFields[type] = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "customFieldsTree");
				wdw_cardbookConfiguration.preferenceChanged('customFields');
			}
		},

		renameCustomFields: function () {
			var type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
			var myTree = document.getElementById('customFieldsTree');
			if (myTree.currentIndex != -1) {
				var myCode = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('customFieldsCode'));
				var myLabel = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('customFieldsLabel'));
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('customFieldsRank'));
				var myValidationList = wdw_cardbookConfiguration.getAllCustomsFields();
				function filterOriginal(element) {
					return (element != myCode);
				}
				myValidationList = myValidationList.filter(filterOriginal);
				var myArgs = {code: myCode, label: myLabel, typeAction: "", validationList: myValidationList};
				var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddCustomField.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.typeAction == "SAVE") {
					var result = [];
					var already = false;
					for (let i = 0; i < wdw_cardbookConfiguration.allCustomFields[type].length; i++) {
						if (myArgs.code.toLowerCase() === wdw_cardbookConfiguration.allCustomFields[type][i][0].toLowerCase()) {
							result.push([myArgs.code, myArgs.label, i]);
							already = true;
						} else {
							result.push([wdw_cardbookConfiguration.allCustomFields[type][i][0], wdw_cardbookConfiguration.allCustomFields[type][i][1], i]);
						}
					}
					if (!already) {
						result = [];
						for (let i = 0; i < wdw_cardbookConfiguration.allCustomFields[type].length; i++) {
							if (myId == wdw_cardbookConfiguration.allCustomFields[type][i][2]) {
								result.push([myArgs.code, myArgs.label, i]);
							} else {
								result.push([wdw_cardbookConfiguration.allCustomFields[type][i][0], wdw_cardbookConfiguration.allCustomFields[type][i][1], i]);
							}
						}
					}
					wdw_cardbookConfiguration.allCustomFields[type] = JSON.parse(JSON.stringify(result));
					wdw_cardbookConfiguration.sortTrees(null, "customFieldsTree");
					wdw_cardbookConfiguration.preferenceChanged('customFields');
				}
			}
		},

		deleteCustomFields: function () {
			var type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
			var myTree = document.getElementById('customFieldsTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('customFieldsRank'));
				var result = [];
				var myCount = 0;
				for (let i = 0; i < wdw_cardbookConfiguration.allCustomFields[type].length; i++) {
					if (myId != wdw_cardbookConfiguration.allCustomFields[type][i][2]) {
						result.push([wdw_cardbookConfiguration.allCustomFields[type][i][0], wdw_cardbookConfiguration.allCustomFields[type][i][1], myCount]);
						myCount++;
					}
				}
				wdw_cardbookConfiguration.allCustomFields[type] = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "customFieldsTree");
				wdw_cardbookConfiguration.preferenceChanged('customFields');
			}
		},

		getAllCustomsFields: function () {
			var allcustomFieldNames = [];
			for (var i in wdw_cardbookConfiguration.allCustomFields) {
				for (var j = 0; j < wdw_cardbookConfiguration.allCustomFields[i].length; j++) {
					allcustomFieldNames.push(wdw_cardbookConfiguration.allCustomFields[i][j][0]);
				}
			}
			for (var i in wdw_cardbookConfiguration.customListsFields) {
				var nameValue = document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value;
				allcustomFieldNames.push(nameValue);
			}
			return allcustomFieldNames;
		},

		validateCustomFields: function () {
			cardbookPreferences.delCustomFields();
			for (var i in wdw_cardbookConfiguration.allCustomFields) {
				for (var j = 0; j < wdw_cardbookConfiguration.allCustomFields[i].length; j++) {
					cardbookPreferences.setCustomFields(i, wdw_cardbookConfiguration.allCustomFields[i][j][2], wdw_cardbookConfiguration.allCustomFields[i][j][0] + ":" + wdw_cardbookConfiguration.allCustomFields[i][j][1]);
				}
			}
		},

		resetCustomListFields: function () {
			document.getElementById('kindCustomTextBox').value = cardbookRepository.defaultKindCustom;
			document.getElementById('memberCustomTextBox').value = cardbookRepository.defaultMemberCustom;
			wdw_cardbookConfiguration.validateCustomListValues();
		},

		validateCustomListValues: function () {
			for (var i in wdw_cardbookConfiguration.customListsFields) {
				var myValue = document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value;
				var myValidationListOrig = wdw_cardbookConfiguration.getAllCustomsFields();
				var myValidationList = cardbookRepository.arrayUnique(myValidationListOrig);
				if (myValidationList.length != myValidationListOrig.length) {
					cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorUNIQUE");
					return;
				} else if (myValue.toUpperCase() !== myValue) {
					cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorUPPERCASE", [myValue]);
					return;
				} else if (!(myValue.toUpperCase().startsWith("X-"))) {
					cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorX", [myValue]);
					return;
				} else if (cardbookRepository.notAllowedCustoms.indexOf(myValue.toUpperCase()) != -1) {
					cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorFIELD", [myValue]);
					return;
				} else if (myValue.includes(":") || myValue.includes(",") || myValue.includes(";") || myValue.includes(".")) {
					cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorCHAR", [myValue]);
					return;
				}
			}
			cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "OK");
			wdw_cardbookConfiguration.preferenceChanged('customListFields');
		},

		loadCustomListFields: function () {
			for (var i in wdw_cardbookConfiguration.customListsFields) {
				document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value = cardbookPreferences.getStringPref("extensions.cardbook." + wdw_cardbookConfiguration.customListsFields[i]);
			}
		},

		validateCustomListFields: function () {
			for (var i in wdw_cardbookConfiguration.customListsFields) {
				cardbookPreferences.setStringPref("extensions.cardbook." + wdw_cardbookConfiguration.customListsFields[i], document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value);
			}
		},

		selectOrg: function() {
			var btnEdit = document.getElementById("renameOrgLabel");
			var btnUp = document.getElementById("upOrgLabel");
			var btnDown = document.getElementById("downOrgLabel");
			var myTree = document.getElementById("orgTree");
			if (myTree.view && myTree.view.selection.getRangeCount() > 0) {
				btnEdit.disabled = false;
				if (wdw_cardbookConfiguration.allOrg.length > 1) {
					if (myTree.currentIndex == 0) {
						btnUp.disabled = true;
					} else {
						btnUp.disabled = false;
					}
					if (myTree.currentIndex == wdw_cardbookConfiguration.allOrg.length-1) {
						btnDown.disabled = true;
					} else {
						btnDown.disabled = false;
					}
				} else {
					btnUp.disabled = true;
					btnDown.disabled = true;
				}
			} else {
				btnEdit.disabled = true;
				btnUp.disabled = true;
				btnDown.disabled = true;
			}
			document.getElementById("deleteOrgLabel").disabled = btnEdit.disabled;
		},

		loadOrg: function () {
			var orgStructure = cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
			if (orgStructure != "") {
				var tmpArray = cardbookUtils.unescapeArray(cardbookUtils.escapeString(orgStructure).split(";"));
				for (let i = 0; i < tmpArray.length; i++) {
					wdw_cardbookConfiguration.allOrg.push([tmpArray[i], i]);
				}
			} else {
				wdw_cardbookConfiguration.allOrg = [];
			}
		},
		
		displayOrg: function () {
			var orgTreeView = {
				get rowCount() { return wdw_cardbookConfiguration.allOrg.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == "orgLabel") return wdw_cardbookConfiguration.allOrg[idx][0];
					else if (column.id == "orgRank") return wdw_cardbookConfiguration.allOrg[idx][1];
				}
			}
			document.getElementById('orgTree').view = orgTreeView;
			wdw_cardbookConfiguration.selectOrg();
		},
		
		upOrg: function () {
			var myTree = document.getElementById('orgTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('orgRank'))*1;
				var temp = [wdw_cardbookConfiguration.allOrg[myId-1][0], parseInt(myId)];
				wdw_cardbookConfiguration.allOrg[myId-1] = [wdw_cardbookConfiguration.allOrg[myId][0], parseInt(myId-1)];
				wdw_cardbookConfiguration.allOrg[myId] = temp;
				wdw_cardbookConfiguration.sortTrees(null, "orgTree");
				wdw_cardbookConfiguration.preferenceChanged('orgStructure');
			}
		},

		downOrg: function () {
			var myTree = document.getElementById('orgTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('orgRank'))*1;
				var temp = [wdw_cardbookConfiguration.allOrg[myId+1][0], parseInt(myId)];
				wdw_cardbookConfiguration.allOrg[myId+1] = [wdw_cardbookConfiguration.allOrg[myId][0], parseInt(myId+1)];
				wdw_cardbookConfiguration.allOrg[myId] = temp;
				wdw_cardbookConfiguration.sortTrees(null, "orgTree");
				wdw_cardbookConfiguration.preferenceChanged('orgStructure');
			}
		},

		addOrg: function () {
			var myValidationList = JSON.parse(JSON.stringify(wdw_cardbookConfiguration.allOrg));
			var myArgs = {type: "", context: "Org", typeAction: "", validationList: myValidationList};
			var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				var result = [];
				var already = false;
				for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
					if (myArgs.type.toLowerCase() === wdw_cardbookConfiguration.allOrg[i][0].toLowerCase()) {
						result.push([myArgs.type, i]);
						already = true;
					} else {
						result.push([wdw_cardbookConfiguration.allOrg[i][0], i]);
					}
				}
				if (!already) {
					result.push([myArgs.type, wdw_cardbookConfiguration.allOrg.length]);
				}
				wdw_cardbookConfiguration.allOrg = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "orgTree");
				wdw_cardbookConfiguration.preferenceChanged('orgStructure');
			}
		},
		
		renameOrg: function () {
			var myTree = document.getElementById('orgTree');
			if (myTree.currentIndex != -1) {
				var myLabel = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('orgLabel'));
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('orgRank'));
				var myValidationList = JSON.parse(JSON.stringify(wdw_cardbookConfiguration.allOrg));
				function filterOriginal(element) {
					return (element != myLabel);
				}
				myValidationList = myValidationList.filter(filterOriginal);
		 		var myArgs = {type: myLabel, context: "Org", typeAction: "", validationList: myValidationList};
		 		var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.modalWindowParams, myArgs);
		 		if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
					var result = [];
					var already = false;
					for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
						if (myArgs.type.toLowerCase() === wdw_cardbookConfiguration.allOrg[i][0].toLowerCase()) {
							result.push([myArgs.type, i]);
							already = true;
						} else {
							result.push([wdw_cardbookConfiguration.allOrg[i][0], i]);
						}
					}
					if (!already) {
						result = [];
						for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
							if (myId == wdw_cardbookConfiguration.allOrg[i][1]) {
								result.push([myArgs.type, i]);
							} else {
								result.push([wdw_cardbookConfiguration.allOrg[i][0], i]);
							}
						}
					}
					wdw_cardbookConfiguration.allOrg = JSON.parse(JSON.stringify(result));
					wdw_cardbookConfiguration.sortTrees(null, "orgTree");
					wdw_cardbookConfiguration.preferenceChanged('orgStructure');
				}
			}
		},
		
		deleteOrg: function () {
			var myTree = document.getElementById('orgTree');
			if (myTree.currentIndex != -1) {
				var myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('orgRank'));
				var result = [];
				var myCount = 0;
				for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
					if (myId != wdw_cardbookConfiguration.allOrg[i][1]) {
						result.push([wdw_cardbookConfiguration.allOrg[i][0], myCount]);
						myCount++;
					}
				}
				wdw_cardbookConfiguration.allOrg = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTrees(null, "orgTree");
				wdw_cardbookConfiguration.preferenceChanged('orgStructure');
			}
		},
		
		validateOrg: function () {
			var tmpArray = [];
			for (var i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
				tmpArray.push(cardbookUtils.escapeStringSemiColon(wdw_cardbookConfiguration.allOrg[i][0]));
			}
			cardbookPreferences.setStringPref("extensions.cardbook.orgStructure", cardbookUtils.unescapeStringSemiColon(tmpArray.join(";")));
		},

		loadDateDisplayedFormat: function () {
			var labelLong = cardbookRepository.strBundle.GetStringFromName("dateDisplayedFormatLong");
			var labelShort = cardbookRepository.strBundle.GetStringFromName("dateDisplayedFormatShort");
			var myDate = new Date();
			var myDateString = cardbookDates.convertDateToDateString(myDate, "4.0");
			var myDateFormattedLong = cardbookDates.getFormattedDateForDateString(myDateString, "4.0", "0");
			var myDateFormattedShort = cardbookDates.getFormattedDateForDateString(myDateString, "4.0", "1");
			document.getElementById('dateDisplayedFormatLong').setAttribute("label", labelLong.replace("%1", myDateFormattedLong));
			document.getElementById('dateDisplayedFormatShort').setAttribute("label", labelShort.replace("%1", myDateFormattedShort));
		},

		loadInitialSyncDelay: function () {
			var initialSync = cardbookPreferences.getBoolPref("extensions.cardbook.initialSync");
			if (!(initialSync)) {
				document.getElementById('initialSyncDelay').disabled = true;
				document.getElementById('initialSyncDelayTextBox').disabled = true;
			}
		},

		validateStatusInformationLineNumber: function () {
			var myValue = document.getElementById('statusInformationLineNumberTextBox').value;
			if (myValue < 10) {
				document.getElementById('statusInformationLineNumberTextBox').value = 10;
				myValue = 10;
			}
			cardbookRepository.statusInformationLineNumber = myValue;
			while (cardbookRepository.statusInformation.length > myValue) {
				cardbookRepository.statusInformation.splice(0,1);
			}
		},

		showInitialSyncDelay: function () {
			if (document.getElementById('initialSyncCheckBox').checked) {
				document.getElementById('initialSyncDelay').disabled = false;
				document.getElementById('initialSyncDelayTextBox').disabled = false;
			} else {
				document.getElementById('initialSyncDelay').disabled = true;
				document.getElementById('initialSyncDelayTextBox').disabled = true;
			}
		},

		loadCountries: function () {
			var countryList = document.getElementById('defaultRegionMenulist');
			var countryPopup = document.getElementById('defaultRegionMenupopup');
			var country = cardbookPreferences.getStringPref("extensions.cardbook.defaultRegion");
			cardbookElementTools.loadCountries(countryPopup, countryList, country, true, true);
		},

		validateShowNameAs: function () {
			cardbookRepository.showNameAs = document.getElementById('showNameAsRadiogroup').selectedItem.value;
		},

		validateDateDisplayedFormat: function () {
			cardbookRepository.dateDisplayedFormat = document.getElementById('dateDisplayedFormatMenulist').selectedItem.value;
		},

		showPane: function (paneID) {
			if (!paneID) {
				return;
			}
			
			let pane = document.getElementById(paneID);
			if (!pane) {
				return;
			}
			document.getElementById("cardbook-selector").value = paneID;
			
			let currentlySelected = document.getElementById("cardbook-paneDeck").querySelector("#cardbook-paneDeck > prefpane[selected]");
			if (currentlySelected) {
				if (currentlySelected == pane) {
					return;
				}
				currentlySelected.removeAttribute("selected");
			}

			pane.setAttribute("selected", "true");
			pane.dispatchEvent(new CustomEvent("paneSelected", { bubbles: true }));

			document.documentElement.setAttribute("lastSelected", paneID);
			Services.xulStore.persist(document.documentElement, "lastSelected");
		},

		loadInitialPane: function () {
			if (document.documentElement.hasAttribute("lastSelected")) {
				wdw_cardbookConfiguration.showPane(document.documentElement.getAttribute("lastSelected"));
			} else {
				wdw_cardbookConfiguration.showPane("cardbook-generalPane");;
			}
		},

		load: function () {
			wdw_cardbookConfiguration.loadInitialPane();
			wdw_cardbookConfiguration.loadTitle();
			wdw_cardbookConfiguration.loadIMPPs();
			wdw_cardbookConfiguration.sortTrees(null, "IMPPsTree");
			wdw_cardbookConfiguration.loadCustomFields();
			wdw_cardbookConfiguration.sortTrees(null, "customFieldsTree");
			wdw_cardbookConfiguration.loadCustomListFields();
			wdw_cardbookConfiguration.loadOrg();
			wdw_cardbookConfiguration.sortTrees(null, "orgTree");
			wdw_cardbookConfiguration.loadCountries();
			wdw_cardbookConfiguration.loadDateDisplayedFormat();
			wdw_cardbookConfiguration.loadDiscoveryAccounts();
			wdw_cardbookConfiguration.sortTrees(null, "discoveryAccountsTree");
			wdw_cardbookConfiguration.loadAddressbooks();
			wdw_cardbookConfiguration.sortTrees(null, "addressbooksTree");
			AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID).then(addon => {
				wdw_cardbookConfiguration.loadCalendars(addon);
			});
			wdw_cardbookConfiguration.loadInitialSyncDelay();
			wdw_cardbookConfiguration.loadVCards();
			wdw_cardbookConfiguration.sortTrees(null, "accountsVCardsTree");
			wdw_cardbookConfiguration.loadRestrictions();
			wdw_cardbookConfiguration.sortTrees(null, "accountsRestrictionsTree");
			wdw_cardbookConfiguration.loadTypes();
			wdw_cardbookConfiguration.sortTrees(null, "typesTree");
			wdw_cardbookConfiguration.loadEmailsCollection();
			wdw_cardbookConfiguration.sortTrees(null, "emailsCollectionTree");
			wdw_cardbookConfiguration.loadPrefEmailPref();
			wdw_cardbookConfiguration.loadEncryptionPref();
			wdw_cardbookConfiguration.loadAdrFormula();
			wdw_cardbookConfiguration.remindViaPopup();
			wdw_cardbookConfiguration.cardbookAutoComplete();
			wdw_cardbookConfiguration.loadAutocompleteRestrictSearchFields();
			wdw_cardbookConfiguration.loadEventEntryTitle();
			wdw_cardbookConfiguration.showTab();
		},
		
		preferenceChanged: function (aPreference) {
			switch (aPreference) {
				case "autocompleteRestrictSearch":
					wdw_cardbookConfiguration.validateAutocompleteRestrictSearchFields();
					break;
				case "accountsRestrictions":
					wdw_cardbookConfiguration.validateRestrictions();
					break;
				case "statusInformationLineNumber":
					wdw_cardbookConfiguration.validateStatusInformationLineNumber();
					break;
				case "debugMode":
					cardbookRepository.debugMode = document.getElementById('debugModeCheckBox').checked;
					break;
				case "showNameAs":
					wdw_cardbookConfiguration.validateDisplaySettings();
					break;
				case "showNameAs":
					wdw_cardbookConfiguration.validateShowNameAs();
					break;
				case "dateDisplayedFormat":
					wdw_cardbookConfiguration.validateDateDisplayedFormat();
					break;
				case "customTypes":
					wdw_cardbookConfiguration.validateTypes();
					break;
				case "localDataEncryption":
					wdw_cardbookConfiguration.validateEncryptionPref();
					break;
				case "impps":
					wdw_cardbookConfiguration.validateIMPPs();
					break;
				case "URLPhonePassword":
					wdw_cardbookConfiguration.validateURLPhonesPassword();
					break;
				case "customFields":
					wdw_cardbookConfiguration.validateCustomFields();
					break;
				case "customListFields":
					wdw_cardbookConfiguration.validateCustomListFields();
					break;
				case "orgStructure":
					wdw_cardbookConfiguration.validateOrg();
					break;
				case "attachedVCard":
					wdw_cardbookConfiguration.validateVCards();
					break;
				case "discoveryAccounts":
					wdw_cardbookConfiguration.validateDiscoveryAccounts();
					break;
				case "emailsCollection":
					wdw_cardbookConfiguration.validateEmailsCollection();
					break;
				case "preferEmailPref":
					wdw_cardbookConfiguration.validatePrefEmailPref();
					break;
				case "addressbooks":
					wdw_cardbookConfiguration.validateAddressbooks();
					break;
				case "calendars":
					wdw_cardbookConfiguration.validateCalendars();
					break;
				case "eventEntryTitle":
					wdw_cardbookConfiguration.validateEventEntryTitle();
					break;
				
			}
			cardbookUtils.notifyObservers("preferencesChanged");
		}
	};
};