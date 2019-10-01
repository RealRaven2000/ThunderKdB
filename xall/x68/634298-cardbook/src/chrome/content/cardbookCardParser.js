if ("undefined" == typeof(cardbookCardParser)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	function cardbookCardParser(vCardData, vSiteUrl, vEtag, vDirPrefId) {
		this._init(vDirPrefId);
		
		if (vCardData) {
			this._parseCard(vCardData, vSiteUrl, vEtag);
		}

		this._finish();
	}

	cardbookCardParser.prototype = {
		_init: function (vDirPrefId) {
			if (vDirPrefId) {
				this.dirPrefId = vDirPrefId;
			} else {
				this.dirPrefId = "";
			}
			this.cardurl = "";
			this.cacheuri = "";
			this.etag = "";
			this.updated = false;
			this.deleted = false;
			this.created = false;
			this.isAList = false;

			this.lastname = "";
			this.firstname = "";
			this.othername = "";
			this.prefixname = "";
			this.suffixname = "";
			this.fn = "";
			this.nickname = "";
			this.bday = "";
			this.gender = "";
			this.birthplace = "";
			this.anniversary = "";
			this.deathdate = "";
			this.deathplace = "";
			this.adr = [];
			this.tel = [];
			this.email = [];
			this.emails = [];
			this.mailer = "";
			this.tz = "";
			this.geo = "";
			this.title = "";
			this.role = "";
			this.agent = "";
			this.org = "";
			this.categories = [];
			this.note = "";
			this.prodid = "";
			this.sortstring = "";
			this.uid = "";
			this.rev = "";
			this.url = [];
			this.version = "";
			this.class1 = "";
			this.key = "";
			this.impp = [];
			this.others = [];
			this.cbid = "";

			this.photo = {types: [], value: "", localURI: "", URI: "", extension: ""};
			this.logo = {types: [], value: "", localURI: "", URI: "", extension: ""};
			this.sound = {types: [], value: "", localURI: "", URI: "", extension: ""};

			this.kind = "";
			this.member = [];
		},

		_finish: function () {
			if (this.uid == "") {
				cardbookUtils.setCardUUID(this);
			}
		},

		formatNote: function (vString) {
			return vString.replace(/\\:/g,":").replace(/\\;/g,";").replace(/\\,/g,",").split(/\\n/i).join("\n");
		},
		
		mediaParser: function (aField, aString) {
			try {
				var localDelim0 = aString.indexOf(",",0);
				var cacheDir = cardbookRepository.getLocalDirectory();
				if (localDelim0 >= 0) {
					// 4.0
					// FROM : PHOTO:data:image/jpeg;base64,R0lGODlhCw…
					var headerTmp = aString.substr(0,localDelim0);
					var trailerTmp = aString.substr(localDelim0+1,aString.length);
					var headerTmpArray = [];
					headerTmpArray = headerTmp.toLowerCase().split(";");
					this[aField].types = JSON.parse(JSON.stringify(headerTmpArray));
					this[aField].value = atob(trailerTmp);
					for (let i = 0; i < headerTmpArray.length; i++) {
						if (headerTmpArray[i].indexOf("data:image",0) >= 0) {
							this[aField].extension = headerTmpArray[i].replace(/data:image\//g,"").replace(/\s/g,"");
						}
					}
					this[aField].extension = cardbookUtils.formatExtension(this[aField].extension, "4.0");
				} else {
					// 3.0
					// FROM : PHOTO;ENCODING=b;TYPE=image/jpeg:R0lGODlhCw…
					// FROM : PHOTO;X-ABCROP-RECTANGLE=ABClipRect_1&0&0&583&583&AbGQEWkRV74gSDvD5j4+wg==;VALUE=uri:https://p44-contacts.icloud.com:443/10151953909/wbs/01a57d0472c3cf027a6d20bb7d690688f17da8fb13
					// FROM : PHOTO;ENCODING=B;TYPE=JPEG;VALUE=BINARY:/9j/4AAQSkZ
					// 3.0 and 4.0
					// FROM : PHOTO:http://www.example.com/pub/photos/jqpublic.gif
					var localDelim1 = aString.indexOf(":",0);
					if (localDelim1 >= 0) {
						var headerTmp = aString.substr(0,localDelim1);
						var trailerTmp = aString.substr(localDelim1+1,aString.length);
						var headerTmpArray = [];
						headerTmpArray = headerTmp.toUpperCase().split(";");
						if (trailerTmp.indexOf(cacheDir.path) >= 0) {
							this[aField].localURI = trailerTmp;
							this[aField].extension = cardbookUtils.getFileExtension(trailerTmp);
						} else if ((trailerTmp.search(/^http/i) >= 0) || (trailerTmp.search(/^file/i) >= 0)) {
							this[aField].URI = trailerTmp;
							this[aField].extension = cardbookUtils.getFileExtension(trailerTmp);
						} else {
							this[aField].value = atob(trailerTmp);
							this[aField].types = JSON.parse(JSON.stringify(headerTmpArray));
							for (let i = 0; i < headerTmpArray.length; i++) {
								if (headerTmpArray[i].indexOf("TYPE=",0) >= 0) {
									this[aField].extension = headerTmpArray[i].replace("TYPE=","").replace("IMAGE/","").replace(/\s/g,"");
								}
							}
						}
						this[aField].extension = cardbookUtils.formatExtension(this[aField].extension, this.version);
					}
				}
			} catch(e) {
				this[aField] = {types: [], value: "", localURI: "", URI: "", extension: ""};
			}
		},
	
		_parseCard: function (vCardData, vSiteUrl, vEtag) {
			var re = /[\n\u0085\u2028\u2029]|\r\n?/;
			var vCardDataArray = cardbookUtils.cleanArrayWithoutTrim(vCardData.split(re));
			if (vCardDataArray.indexOf("VERSION:3.0") >= 0 || vCardDataArray.indexOf("VERSION:4.0") >= 0
				|| vCardDataArray.indexOf("version:3.0") >= 0 || vCardDataArray.indexOf("version:4.0") >= 0) {
				try {
					// For multilines data
					var limit = vCardDataArray.length-1;
					for (var i = 0; i < limit; i++) {
						while (vCardDataArray[i+1].substr(0,1) == " ") {
							vCardDataArray[i] = vCardDataArray[i] + vCardDataArray[i+1].substr(1);
							vCardDataArray.splice(i+1, 1);
							limit--;
						}
					}
					
					var myPGName = "";
					var myPGField = "";
					var myPGArray = [];
					var myPGToBeParsed = {};
					
					for (var vCardDataArrayIndex = 0; vCardDataArrayIndex < vCardDataArray.length-1;) {
						var localDelim1 = -1;
						var localDelim2 = -1;
						var vCardDataArrayHeaderKey = "";
						var vCardDataArrayHeaderOption = "";
						var vCardDataArrayTrailer = "";
						var vCardDataArrayTrailerArray = [];
						var vCardDataArrayHeaderOptionArray = [];
						var localDelimArray = null;
						localDelim1 = vCardDataArray[vCardDataArrayIndex].indexOf(":",0);
						vCardDataArrayHeaderKey = "";
						vCardDataArrayHeaderOption = "";
						vCardDataArrayTrailer = "";
						
						// Splitting data
						if (localDelim1 >= 0) {
							vCardDataArrayHeader = vCardDataArray[vCardDataArrayIndex].substr(0,localDelim1).trim();
							vCardDataArrayTrailer = vCardDataArray[vCardDataArrayIndex].substr(localDelim1+1,vCardDataArray[vCardDataArrayIndex].length).trim();
							// for Google
							vCardDataArrayTrailer = vCardDataArrayTrailer.replace(/\\:/g, ":");
							localDelim2 = vCardDataArrayHeader.indexOf(";",0);
							if (localDelim2 >= 0) {
								vCardDataArrayHeaderKey = vCardDataArrayHeader.substr(0,localDelim2).toUpperCase();
								vCardDataArrayHeaderOption = vCardDataArrayHeader.substr(localDelim2+1,vCardDataArrayHeader.length);
							} else {
								vCardDataArrayHeaderKey = vCardDataArrayHeader.toUpperCase();
								vCardDataArrayHeaderOption = "";
							}
						}

						if ( vCardDataArrayIndex < vCardDataArray.length-1) {
							vCardDataArrayIndex++;
						}

						// property groups, example that should be parsed
						// ITEM1.X-ABLABEL:eee
						// ITEM1.ADR;TYPE=PREF:;;rue des angeliques;BORDEAUX;;33000;France
						// item1.X-ABADR:fr
						if (vCardDataArrayHeaderKey.indexOf(".") >= 0) {
							myPGArray = vCardDataArrayHeaderKey.toUpperCase().split(".");
							myPGName = myPGArray[0];
							myPGField = myPGArray[1];
							if (cardbookRepository.multilineFields.indexOf(myPGField.toLowerCase()) >= 0) {
								vCardDataArrayHeaderKey = myPGField;
							} else {
								if (!(myPGToBeParsed[myPGName] != null && myPGToBeParsed[myPGName] !== undefined && myPGToBeParsed[myPGName] != "")) {
									myPGToBeParsed[myPGName] = [];
								}
								myPGToBeParsed[myPGName].push(myPGField + ":" + vCardDataArrayTrailer);
								continue;
							}
						} else {
							myPGName = "";
						}

						switch (vCardDataArrayHeaderKey) {
							case "BEGIN":
								break;
							case "END":
								break;
							case "UID":
								this.uid = vCardDataArrayTrailer.replace(/^urn:uuid:/i, "");
								if (cardbookPreferences.getUrnuuid(this.dirPrefId)) {
									this.uid = "urn:uuid:" + this.uid;
								}
								break;
							case "N":
								vCardDataArrayTrailerArray = [];
								vCardDataArrayTrailerArray = cardbookUtils.escapeString(vCardDataArrayTrailer).replace(/,/g, ' ').split(";");
								if (vCardDataArrayTrailerArray[0]) {
									this.lastname = cardbookUtils.unescapeString(vCardDataArrayTrailerArray[0]);
								} else {
									this.lastname = "";
								}
								if (vCardDataArrayTrailerArray[1]) {
									this.firstname = cardbookUtils.unescapeString(vCardDataArrayTrailerArray[1]);
								} else {
									this.firstname = "";
								}
								if (vCardDataArrayTrailerArray[2]) {
									this.othername = cardbookUtils.unescapeString(vCardDataArrayTrailerArray[2]);
								} else {
									this.othername = "";
								}
								if (vCardDataArrayTrailerArray[3]) {
									this.prefixname = cardbookUtils.unescapeString(vCardDataArrayTrailerArray[3]);
								} else {
									this.prefixname = "";
								}
								if (vCardDataArrayTrailerArray[4]) {
									this.suffixname = cardbookUtils.unescapeString(vCardDataArrayTrailerArray[4]);
								} else {
									this.suffixname = "";
								}
								break;
							case "FN":
								this.fn = cardbookUtils.unescapeString(vCardDataArrayTrailer);
								break;
							case "NICKNAME":
								this.nickname = cardbookUtils.unescapeString(vCardDataArrayTrailer);
								break;
							case "BDAY":
								this.bday = vCardDataArrayTrailer;
								break;
							case "ADR":
								var vCardDataArrayTrailerTmp = vCardDataArrayTrailer.replace(/;/g,"");
								if (vCardDataArrayTrailerTmp) {
									vCardDataArrayTrailerArray = [];
									vCardDataArrayHeaderOptionArray = [];
									vCardDataArrayHeaderOptionArray = cardbookUtils.formatTypes(cardbookUtils.escapeString(vCardDataArrayHeaderOption).split(";"));
									vCardDataArrayTrailerArray = cardbookUtils.escapeString(vCardDataArrayTrailer).split(";");
									vCardDataArrayTrailerArray = cardbookUtils.replaceArrayComma(vCardDataArrayTrailerArray);
									// seven values
									var values = [];
									values = cardbookUtils.unescapeArray(vCardDataArrayTrailerArray);
									if (values.length > 7) {
										values = values.slice(0, 7);
									} else if (values.length < 7) {
										while (values.length < 7) {
											values.push("");
										}
									}
									this.adr.push([values, cardbookUtils.unescapeArray(vCardDataArrayHeaderOptionArray), myPGName, []]);
								}
								break;
							case "TEL":
								if (vCardDataArrayTrailer) {
									vCardDataArrayTrailerArray = [];
									vCardDataArrayHeaderOptionArray = [];
									vCardDataArrayHeaderOptionArray = cardbookUtils.formatTypes(cardbookUtils.escapeString(vCardDataArrayHeaderOption).split(";"));
									vCardDataArrayTrailerArray = cardbookUtils.escapeString(vCardDataArrayTrailer).split(";");
									this.tel.push([cardbookUtils.unescapeArray(vCardDataArrayTrailerArray), cardbookUtils.unescapeArray(vCardDataArrayHeaderOptionArray), myPGName, []]);
								}
								break;
							case "EMAIL":
								if (vCardDataArrayTrailer) {
									vCardDataArrayTrailerArray = [];
									vCardDataArrayHeaderOptionArray = [];
									vCardDataArrayHeaderOptionArray = cardbookUtils.formatTypes(cardbookUtils.escapeString(vCardDataArrayHeaderOption).split(";"));
									vCardDataArrayTrailerArray = cardbookUtils.escapeString(vCardDataArrayTrailer).split(";");
									this.email.push([cardbookUtils.unescapeArray(vCardDataArrayTrailerArray), cardbookUtils.unescapeArray(vCardDataArrayHeaderOptionArray), myPGName, []]);
								}
								break;
							case "TITLE":
								this.title = cardbookUtils.unescapeString(vCardDataArrayTrailer);
								break;
							case "ROLE":
								this.role = cardbookUtils.unescapeString(vCardDataArrayTrailer);
								break;
							case "ORG":
								if (vCardDataArrayTrailer != ";") {
									this.org = vCardDataArrayTrailer.replace(/\\,/g,",").replace(/;+$/, "").replace(/\\+$/, "");
								}
								break;
							case "CATEGORIES":
								if (vCardDataArrayTrailer != "") {
									this.categories = cardbookUtils.unescapeArray(cardbookUtils.escapeString(vCardDataArrayTrailer).split(","));
									this.categories = cardbookUtils.cleanCategories(this.categories);
								}
								break;
							case "NOTE":
								this.note = this.formatNote(vCardDataArrayTrailer);
								break;
							case "PRODID":
								this.prodid = vCardDataArrayTrailer;
								break;
							case "SORT-STRING":
								this.sortstring = vCardDataArrayTrailer;
								break;
							case "PHOTO":
								this.mediaParser("photo", vCardDataArrayHeaderOption + ":" + vCardDataArrayTrailer);
								break;
							case "LOGO":
								this.mediaParser("logo", vCardDataArrayHeaderOption + ":" + vCardDataArrayTrailer);
								break;
							case "SOUND":
								this.mediaParser("sound", vCardDataArrayHeaderOption + ":" + vCardDataArrayTrailer);
								break;
							case "URL":
								if (vCardDataArrayTrailer) {
									vCardDataArrayTrailerArray = [];
									vCardDataArrayHeaderOptionArray = [];
									vCardDataArrayHeaderOptionArray = cardbookUtils.formatTypes(cardbookUtils.escapeString(vCardDataArrayHeaderOption).split(";"));
									vCardDataArrayTrailerArray = cardbookUtils.escapeString(vCardDataArrayTrailer).split(";");
									this.url.push([cardbookUtils.unescapeArray(vCardDataArrayTrailerArray), cardbookUtils.unescapeArray(vCardDataArrayHeaderOptionArray), myPGName, []]);
								}
								break;
							case "VERSION":
								this.version = vCardDataArrayTrailer;
								break;
							case "CLASS":
								this.class1 = vCardDataArrayTrailer;
								break;
							case "KEY":
								this.key = vCardDataArrayHeaderOption + ":" + vCardDataArrayTrailer;
								break;
							case "REV":
								this.rev = vCardDataArrayTrailer;
								break;
							case "KIND":
								this.kind = vCardDataArrayTrailer;
								break;
							case "MEMBER":
								this.member.push(vCardDataArrayTrailer);
								break;
							case "GENDER":
								this.gender = vCardDataArrayTrailer;
								break;
							case "BIRTHPLACE":
								this.birthplace = vCardDataArrayTrailer;
								break;
							case "ANNIVERSARY":
								this.anniversary = vCardDataArrayTrailer;
								break;
							case "DEATHDATE":
								this.deathdate = vCardDataArrayTrailer;
								break;
							case "DEATHPLACE":
								this.deathplace = vCardDataArrayTrailer;
								break;
							case "MAILER":
								this.mailer = vCardDataArrayTrailer;
								break;
							case "TZ":
								this.tz = vCardDataArrayTrailer;
								break;
							case "GEO":
								this.geo = vCardDataArrayTrailer;
								break;
							case "AGENT":
								this.agent = vCardDataArrayHeaderOption + ":" + vCardDataArrayTrailer;
								break;
							case "IMPP":
								if (vCardDataArrayTrailer) {
									vCardDataArrayTrailerArray = cardbookUtils.escapeString(vCardDataArrayTrailer).split(";");
									vCardDataArrayHeaderOptionArray = cardbookUtils.formatTypes(cardbookUtils.escapeString(vCardDataArrayHeaderOption).split(";"));
									this.impp.push([cardbookUtils.unescapeArray(vCardDataArrayTrailerArray), cardbookUtils.unescapeArray(vCardDataArrayHeaderOptionArray), myPGName, []]);
								}
								break;
							case "X-THUNDERBIRD-ETAG":
								this.etag = vCardDataArrayTrailer;
								this.others.push(vCardDataArrayHeaderKey + ":" + vCardDataArrayTrailer);
								break;
							case "X-THUNDERBIRD-MODIFICATION":
								switch (vCardDataArrayTrailer) {
									case "UPDATED":
										this.updated = true;
										break;
									case "CREATED":
										this.created = true;
										break;
									case "DELETED":
										this.deleted = true;
										break;
									default:
										break;
								}
								this.others.push(vCardDataArrayHeaderKey + ":" + vCardDataArrayTrailer);
								break;
							default:
								if (vCardDataArrayHeaderKey) {
									this.others.push(vCardDataArrayHeader + ":" + vCardDataArrayTrailer);
								}
								// for users that shares Thunderbird contacts between profiles, it's good to automatically record Thunderbird custom fields
								if (vCardDataArrayHeader == "X-CUSTOM1" || vCardDataArrayHeader == "X-CUSTOM2" || vCardDataArrayHeader == "X-CUSTOM3" || vCardDataArrayHeader == "X-CUSTOM4") {
									var customLabel = cardbookRepository.strBundle.GetStringFromName("customLabel");
									var found = false
									for (var i = 0; i < cardbookRepository.customFields['pers'].length; i++) {
										if (cardbookRepository.customFields['pers'][i][0] == vCardDataArrayHeader) {
											found = true;
											break;
										}
									}
									if (!found) {
										cardbookPreferences.setCustomFields('pers', cardbookRepository.customFields['pers'].length, vCardDataArrayHeader + ":" + customLabel + vCardDataArrayHeader.replace("X-CUSTOM", ""));
										cardbookRepository.loadCustoms();
									}
								}
						}
					}

					// have to finish the PG parsing
					for (var i in myPGToBeParsed) {
						let myPGLocalName = i;
						let found = false;
						for (var j in cardbookRepository.multilineFields) {
							if (found) {
								break;
							}
							let myLocalField = cardbookRepository.multilineFields[j];
							for (var k = 0; k < this[myLocalField].length; k++) {
								if (this[myLocalField][k][2] == myPGLocalName) {
									this[myLocalField][k][3] = JSON.parse(JSON.stringify(myPGToBeParsed[myPGLocalName]));
									found = true;
									break;
								}
							}
						}
						if (!found) {
							for (var j = 0; j < myPGToBeParsed[myPGLocalName].length; j++) {
								this.others.push(myPGLocalName + "." + myPGToBeParsed[myPGLocalName][j]);
							}
						}
					}
								
					cardbookUtils.setCalculatedFieldsWithoutRev(this);
					
					if (vSiteUrl) {
						this.cardurl = vSiteUrl;
					}
					
					if (this.fn == "") {
						cardbookUtils.getDisplayedName(this, this.dirPrefId, [this.prefixname, this.firstname, this.othername, this.lastname, this.suffixname, this.nickname],
																	[this.org, this.title, this.role]);
					}
					
					cardbookUtils.addEtag(this, vEtag);
				}
				catch (e) {
					throw({code : "UNKNOWN_ERROR", message: e});
				}
			} else {
				throw({code : "WRONG_VERSION", message: ""});
			}
		}
	};
};
