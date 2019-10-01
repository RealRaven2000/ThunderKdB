/*
 * This file is part of DAV-4-TbSync.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

"use strict";

var network = {

  getAuthData: function(accountData) {
      let connection = {
        get host() {
          return accountData.getAccountProperty("calDavHost") ? accountData.getAccountProperty("calDavHost") : accountData.getAccountProperty("cardDavHost");
        },
        
        get username() {
          return accountData.getAccountProperty("user");
        },

        get password() {
          return TbSync.passwordManager.getLoginInfo(this.host, "TbSync/DAV", this.username);
        },
        
        updateLoginData: function(newUsername, newPassword) {
          let oldUsername = this.username;
          TbSync.passwordManager.updateLoginInfo(this.host, "TbSync/DAV", oldUsername, newUsername, newPassword);
          // Also update the username of this account.
          accountData.setAccountProperty("user", newUsername);
        },
      };
      return connection;
  }, 

  //https://bugzilla.mozilla.org/show_bug.cgi?id=669675
  //non permanent cache
  problematicHosts: [],
  listOfRealms: {},

  ConnectionData: class {
    constructor(data) {            
      this._password = "";
      this._username = "";
      this._https = "";
      this._type = "";
      this._fqdn = "";
      this._timeout = dav.Base.getConnectionTimeout();
      this._timer = Components.classes["@mozilla.org/timer;1"].createInstance(
                      Components.interfaces.nsITimer);

      //for error logging
      this._eventLogInfo = null;
      
      //typof syncdata?
      let folderData = null;
      let accountData = null;            
      
      if (data instanceof TbSync.SyncData) {
        folderData = data.currentFolderData;
        accountData = data.accountData;
        this._eventLogInfo = data.eventLogInfo;                
      } else if (data instanceof TbSync.FolderData) {
        folderData = data;
        accountData = data.accountData;
        this._eventLogInfo =  new TbSync.EventLogInfo(
          accountData.getAccountProperty("provider"),
          accountData.getAccountProperty("accountname"),
          accountData.accountID,
          folderData.getFolderProperty("foldername"));
      } else if (data instanceof TbSync.AccountData) {
        accountData = data;
        this._eventLogInfo =  new TbSync.EventLogInfo(
          accountData.getAccountProperty("provider"),
          accountData.getAccountProperty("accountname"),
          accountData.accountID,
          "");
      }
      
      if (accountData) {
        let authData = dav.network.getAuthData(accountData);
        this._password = authData.password;
        this._username = authData.username;

        this._https = accountData.getAccountProperty("https");
        this._accountname = accountData.getAccountProperty("accountname");
        if (folderData) {
          this._type = folderData.getFolderProperty("type");
          this._fqdn = folderData.getFolderProperty("fqdn");
        }
      }
      
      this.accountData = accountData;
    }
    
    startTimeout(aChannel) {
      let rv = Components.results.NS_ERROR_NET_TIMEOUT;
      let event = {
        notify: function(timer) {
          if (aChannel) aChannel.cancel(rv);
        }
      }
      this._timer.initWithCallback(
        event, 
        this._timeout, 
        Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
        
    set password(v) {this._password = v;}
    set username(v) {this._username = v;}
    set timeout(v) {this._timeout = v;}
    set https(v) {this._https = v;}
    set type(v) {this._type = v;}
    set fqdn(v) {this._fqdn = v;}
    set eventLogInfo(v) {this._eventLogInfo = v;}

    get password() {return this._password;}
    get username() {return this._username;}
    get timeout() {return this._timeout;}
    get https() {return this._https;}
    get type() {return this._type;}
    get fqdn() {return this._fqdn;}
    get eventLogInfo() {return this._eventLogInfo;}
  },
  
  Prompt: class {
    constructor(aConnection) {
      this.mCounts = 0;
      this.mConnection = aConnection;
    }

    // boolean promptAuth(in nsIChannel aChannel,
    //                    in uint32_t level,
    //                    in nsIAuthInformation authInfo)
    promptAuth (aChannel, aLevel, aAuthInfo) {
      // Store aAuthInfo.realm, needed later to setup lightning passwords.
      TbSync.dump("PROMPTING", (this.mConnection.type));

      if (this.mConnection.type == "cal") {
        TbSync.dump("Found CalDAV authRealm for <"+aChannel.URI.host+">", aAuthInfo.realm);
        dav.network.listOfRealms[aChannel.URI.host] = aAuthInfo.realm;
      }
      
      if (this.mConnection.password !== null) {
        aAuthInfo.username = this.mConnection.username;
        aAuthInfo.password = this.mConnection.password;
      } else {
        // We have no password, request one by throwing a 401.
        return false;
      }
      
      // Even if we have a password, it could be wrong, in which case we would
      // be here more than once.
      this.mCounts++
      return (this.mCounts < 2);
    }
  },

  Redirect: {
    // nsIChannelEventSink implementation
    asyncOnChannelRedirect: function(aOldChannel, aNewChannel, aFlags, aCallback) {
      let uploadData;
      let uploadContent;
      if (aOldChannel instanceof Ci.nsIUploadChannel &&
        aOldChannel instanceof Ci.nsIHttpChannel &&
        aOldChannel.uploadStream) {
        uploadData = aOldChannel.uploadStream;
        uploadContent = aOldChannel.getRequestHeader("Content-Type");
      }

      aNewChannel.QueryInterface(Ci.nsIHttpChannel);
      aOldChannel.QueryInterface(Ci.nsIHttpChannel);
            
      function copyHeader(aHdr) {
        try {
          let hdrValue = aOldChannel.getRequestHeader(aHdr);
          if (hdrValue) {
            aNewChannel.setRequestHeader(aHdr, hdrValue, false);
          }
        } catch (e) {
          if (e.code != Components.results.NS_ERROR_NOT_AVAILIBLE) {
            // The header could possibly not be available, ignore that
            // case but throw otherwise
            throw e;
          }
        }
      }

      // If any other header is used, it should be added here. We might want
      // to just copy all headers over to the new channel.
      copyHeader("Depth");
      copyHeader("Originator");
      copyHeader("Recipient");
      copyHeader("If-None-Match");
      copyHeader("If-Match");
      if (aNewChannel.URI.host == "apidata.googleusercontent.com") {
        copyHeader("Authorization");
      }

      dav.network.prepHttpChannelUploadData(
        aNewChannel, 
        aOldChannel.requestMethod, 
        uploadData, 
        uploadContent);
      aCallback.onRedirectVerifyCallback(Components.results.NS_OK);
    }
  },
  
  prepHttpChannelUploadData: function(aHttpChannel, aMethod, aUploadData, aContentType) {
    if (aUploadData) {
      aHttpChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
      let stream;
      if (aUploadData instanceof Components.interfaces.nsIInputStream) {
        // Make sure the stream is reset
        stream = aUploadData.QueryInterface(Components.interfaces.nsISeekableStream);
        stream.seek(Components.interfaces.nsISeekableStream.NS_SEEK_SET, 0);
      } else {
        // Otherwise its something that should be a string, convert it.
        let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
              .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        stream = converter.convertToInputStream(aUploadData.toString());
      }

      // If aContentType is empty, the protocol will assume that no content headers are to be
      // added to the uploaded stream and that any required headers are already encoded in
      // the stream. In the case of HTTP, if this parameter is non-empty, then its value will
      // replace any existing Content-Type header on the HTTP request. In the case of FTP and
      // FILE, this parameter is ignored.
      aHttpChannel.setUploadStream(stream, aContentType, -1);
      
    }

    //must be set after setUploadStream
    //https://developer.mozilla.org/en-US/docs/Mozilla/Creating_sandboxed_HTTP_connections
    aHttpChannel.QueryInterface(Ci.nsIHttpChannel);
    aHttpChannel.requestMethod = aMethod;
  },

  prepHttpChannel: function(aUploadData, aHeaders, aMethod, aConnection, aNotificationCallbacks=null) {
    let userContextId = TbSync.network.getContainerIdForUser(aConnection.username);
    let channel = Services.io.newChannelFromURI(
            aConnection.uri,
            null,
            Services.scriptSecurityManager.createCodebasePrincipal(aConnection.uri, { userContextId }),
            null,
            Components.interfaces.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
            Components.interfaces.nsIContentPolicy.TYPE_OTHER);

    let httpchannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
    httpchannel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
    httpchannel.notificationCallbacks = aNotificationCallbacks;
    
    // Set default content type.
    if (!aHeaders.hasOwnProperty("Content-Type")) {
      aHeaders["Content-Type"] = "application/xml; charset=utf-8";
    }
    
    // Set default accept value.
    if (!aHeaders.hasOwnProperty("Accept")) {
      aHeaders["Accept"] = "*/*"; //"utf-8,*;q=0.1"
    }

    for (let header in aHeaders) {
      if (aHeaders.hasOwnProperty(header)) {
        httpchannel.setRequestHeader(header, aHeaders[header], false);
      }
    }

    // Will overwrite the content-Type, so it must be called after the headers have been set.
    dav.network.prepHttpChannelUploadData(httpchannel, aMethod, aUploadData, aHeaders["Content-Type"]);
    return httpchannel;
  },
 
  sendRequest: async function (requestData, path, method, connectionData, headers = {}, options = {softfail: []}, aUseStreamLoader = true) {            
    // path could be absolute or relative, we may need to rebuild the full url.
    let url = (path.startsWith("http://") || path.startsWith("https://")) ? path : "http" + (connectionData.https ? "s" : "") + "://" + connectionData.fqdn + path;

    // A few bugs in TB and in client implementations require to retry a connection on certain failures.
    const MAX_RETRIES = 5;
    for (let i=1; i <= MAX_RETRIES; i++) {
      TbSync.dump("URL Request #" + i, url);

      connectionData.uri = Services.io.newURI(url);

      // https://bugzilla.mozilla.org/show_bug.cgi?id=669675
      if (dav.network.problematicHosts.includes(connectionData.uri.host)) {
        headers["Authorization"] = "Basic " + TbSync.tools.b64encode(connectionData.username + ":" + connectionData.password);
      }
      
      let r = await dav.network.useHttpChannel(requestData, method, connectionData, headers, options, aUseStreamLoader);
      
      // ConnectionData.uri.host may no longer be the correct value, as there might have been redirects, use connectionData.fqdn .
      if (r && r.retry && r.retry === true) {
        if (r.addBasicAuthHeaderOnce) {
          TbSync.dump("DAV:unauthenticated", "Manually adding basic auth header for <" + connectionData.username + "@" + connectionData.fqdn + ">");
          headers["Authorization"] = "Basic " + TbSync.tools.b64encode(connectionData.username + ":" + connectionData.password);
        } else if (r.passwordPrompt && r.passwordPrompt === true) {
          if (i == MAX_RETRIES) {
            // If this is the final retry, abort with error.
            throw r.passwordError;
          } else {
            let credentials = null;

            // Prompt, if connection belongs to an account (and not from the create wizard)
            if (connectionData.accountData) {
              let promptData = {
                windowID: "auth:" + connectionData.accountData.accountID,
                accountname: connectionData.accountData.getAccountProperty("accountname"),
                usernameLocked: connectionData.accountData.isConnected(),
                username: connectionData.username,                
              }
              connectionData.accountData.syncData.setSyncState("passwordprompt");
              credentials = await TbSync.passwordManager.asyncPasswordPrompt(promptData, dav.openWindows);
            }

            if (credentials) {
              // update login data
              dav.network.getAuthData(connectionData.accountData).updateLoginData(credentials.username, credentials.password);
              // update connection data
              connectionData.username = credentials.username;
              connectionData.password = credentials.password;
            } else {
              throw r.passwordError;
            }
          }
        } else if (r.addToProblematicHosts && r.addToProblematicHosts === true && !dav.network.problematicHosts.includes(connectionData.fqdn) ) {
          TbSync.dump("BUG 669675", "Adding <" + connectionData.fqdn + "> to list of problematic hosts.");
          dav.network.problematicHosts.push(connectionData.fqdn)
        }
        
        // There might have been a redirect, rebuild url.
        url = "http" + (connectionData.https ? "s" : "") + "://" + connectionData.fqdn + r.path;
        
      } else {
        return r;
      }
    }

  },
  
  // Promisified implementation of Components.interfaces.nsIHttpChannel
  useHttpChannel: function (requestData, method, connectionData, headers, options, aUseStreamLoader) {
    let responseData = "";
    
    //do not log HEADERS, as it could contain an Authorization header
    //TbSync.dump("HEADERS", JSON.stringify(headers));
    if (TbSync.prefs.getIntPref("log.userdatalevel")>1) TbSync.dump("REQUEST", method + " : " + requestData);
  
    return new Promise(function(resolve, reject) {                  
      let listener = {
        _data: "",
        _stream: null,

        //nsIStreamListener (aUseStreamLoader = false)
        onStartRequest: function(aRequest, aContext) {
          //Services.console.logStringMessage("[onStartRequest] ");
          this.data = "";
        },
        onDataAvailable: function (aRequest, aContext, aInputStream, aOffset, aCount) {
          //Services.console.logStringMessage("[onDataAvailable] " + aCount);
          if (this._stream == null) {
            this._stream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
            this._stream.init(aInputStream);
          }
          let d = this._stream.read(aCount);
          //TbSync.dump("STREAM", d);
          this._data += d;
        },        
        onStopRequest: function(aRequest, aContext, aStatusCode) {
          //Services.console.logStringMessage("[onStopRequest] " + aStatusCode);
          this.processResponse(aRequest.QueryInterface(Components.interfaces.nsIHttpChannel), aContext, aStatusCode,  this._data);
        },
      
        //nsIStreamLoaderObserver (aUseStreamLoader = true)
        onStreamComplete: function(aLoader, aContext, aStatus, aResultLength, aResult) {
          let result = dav.tools.convertByteArray(aResult);  
          this.processResponse(aLoader.request.QueryInterface(Components.interfaces.nsIHttpChannel), aContext, aStatus, result);
        },
        
        processResponse: function(aChannel, aContext, aStatus, aResult) {
          let responseStatus = 0;
          try {
            responseStatus = aChannel.responseStatus;
          } catch (ex) {
            let error = TbSync.network.createTCPErrorFromFailedRequest(aChannel);
            if (!error) {
              return reject(dav.sync.finish("error", "networkerror", "URL:\n" + connectionData.uri.spec + " ("+method+")")); //reject/resolve do not terminate control flow
            } else {
              return reject(dav.sync.finish("error", error, "URL:\n" + connectionData.uri.spec + " ("+method+")"));
            }
          }
          
          if (TbSync.prefs.getIntPref("log.userdatalevel")>1) TbSync.dump("RESPONSE", responseStatus + " ("+aChannel.responseStatusText+")" + " : " + aResult);
          responseData = aResult.split("><").join(">\n<");
          
          //Redirected? Update connection settings from current URL
          if (aChannel.URI) {
            let newHttps = (aChannel.URI.scheme == "https");
            if (connectionData.https != newHttps) {
              TbSync.dump("Updating HTTPS", connectionData.https + " -> " + newHttps);
              connectionData.https = newHttps;
            }
            if (connectionData.fqdn != aChannel.URI.hostPort) {
              TbSync.dump("Updating FQDN", connectionData.fqdn + " -> " + aChannel.URI.hostPort);
              connectionData.fqdn = aChannel.URI.hostPort;
            }
          }

          let commLog = "URL:\n" + connectionData.uri.spec + " ("+method+")" + "\n\nRequest:\n" + requestData + "\n\nResponse:\n" + responseData;
          
          switch(responseStatus) {
            case 301:
            case 302:
            case 303:
            case 305:
            case 307:
            case 308:
              {
                // Since the default nsIChannelEventSink handles the redirects, this should never
                // be called. Just in case, do a retry with the updated connection settings.
                let response = {};
                response.retry = true;
                response.path = aChannel.URI.pathQueryRef;
                return resolve(response);
              }
              break;

            case 401: //AuthError
              {                               
                // Handle nsIHttpChannel bug (https://bugzilla.mozilla.org/show_bug.cgi?id=669675):                
                // TB will connect each server without any Authorization header first, to get the
                // auth method. That first call will not end up here, UNLESS he is not able to
                // extracts an auth method -> Unauthenticated.
                
                // Problematic hosts send a VALID Auth header, but TB is not able to parse it.
                // We need to manually add a BASIC auth header (best guess). TB
                // TB will not get the realm for such a problematic host. Currently there is no
                // known problematic CALDAV server (where we need the realm to pre-add the password
                // so lightning does not prompt). If this changes, we need a hardcoded list of
                // problematic servers and their realm. I hope this bug gets fixed soon.

                // Should the channel have been able to authenticate (password is stored)?
                if (connectionData.password !== null) {                                    
                  let unauthenticated;
                  try {
                    let header = aChannel.getRequestHeader("Authorization");
                    unauthenticated = false;
                  } catch (e) {
                    unauthenticated = true;
                  }
                  
                  if (unauthenticated) {
                    let response = {};
                    response.retry = true;
                    response.path = aChannel.URI.pathQueryRef;
                    response.addToProblematicHosts = true;
                    return resolve(response);
                  }
                }
                
                // This (callback) function cannot be turned into an async
                // function, so we resolve the overall Promise and do the
                // password prompt in the outer (async) function.
                let response = {};
                response.retry = true;
                response.path = aChannel.URI.pathQueryRef;
                response.passwordPrompt = true;
                response.passwordError = dav.sync.finish("error", responseStatus, commLog);
                return resolve(response);                
              }
              break;
              
            case 207: //preprocess multiresponse
              {
                let xml = dav.tools.convertToXML(aResult);
                if (xml === null) return reject(dav.sync.finish("warning", "malformed-xml", commLog));

                //the specs allow to  return a 207 with DAV:unauthenticated if not authenticated 
                if (xml.documentElement.getElementsByTagNameNS(dav.sync.ns.d, "unauthenticated").length != 0) {
                  let response = {};
                  response.retry = true;
                  response.path = aChannel.URI.pathQueryRef;
                  //we have no information at all about allowed auth methods, try basic auth
                  response.addBasicAuthHeaderOnce = true;
                  return resolve(response);
                } else {
                  let response = {};
                  response.commLog = commLog;
                  response.node = xml.documentElement;

                  let multi = xml.documentElement.getElementsByTagNameNS(dav.sync.ns.d, "response");
                  response.multi = [];
                  for (let i=0; i < multi.length; i++) {
                    let hrefNode = dav.tools.evaluateNode(multi[i], [["d","href"]]);
                    let responseStatusNode = dav.tools.evaluateNode(multi[i], [["d", "status"]]);
                    let propstats = multi[i].getElementsByTagNameNS(dav.sync.ns.d, "propstat");
                    if (propstats.length > 0) {
                      //response contains propstats, push each as single entry
                      for (let p=0; p < propstats.length; p++) {
                        let statusNode = dav.tools.evaluateNode(propstats[p], [["d", "status"]]);

                        let resp = {};
                        resp.node = propstats[p];
                        resp.status = statusNode === null ? null : statusNode.textContent.split(" ")[1];
                        resp.responsestatus = responseStatusNode === null ? null : responseStatusNode.textContent.split(" ")[1];
                        resp.href = hrefNode === null ? null : hrefNode.textContent;
                        response.multi.push(resp);
                      }
                    } else {
                      //response does not contain any propstats, push raw response
                      let resp = {};
                      resp.node = multi[i];
                      resp.status = responseStatusNode === null ? null : responseStatusNode.textContent.split(" ")[1];
                      resp.responsestatus = responseStatusNode === null ? null : responseStatusNode.textContent.split(" ")[1];
                      resp.href = hrefNode === null ? null : hrefNode.textContent;
                      response.multi.push(resp);
                    }
                  }

                  return resolve(response);
                }
              }


            case 200: //returned by DELETE by radicale - watch this !!!
            case 204: //is returned by DELETE - no data
            case 201: //is returned by CREATE - no data
              return resolve(null);
              break;

            default:
              if (options.softfail.includes(responseStatus)) {
                let noresponse = {};
                noresponse.softerror = responseStatus;
                let xml = dav.tools.convertToXML(aResult);
                if (xml !== null) {
                  let exceptionNode = dav.tools.evaluateNode(xml.documentElement, [["s","exception"]]);
                  if (exceptionNode !== null) {
                    noresponse.exception = exceptionNode.textContent;
                  }
                }
                //manually log this non-fatal error
                TbSync.eventlog.add("info", connectionData.eventLogInfo, "softerror::"+responseStatus, commLog);
                return resolve(noresponse);
              } else {
                return reject(dav.sync.finish("warning", responseStatus, commLog)); 
              }                                
              break;

          }
        }
      }

      let notificationCallbacks = {
        // nsIInterfaceRequestor
        getInterface : function(aIID) {
          if (aIID.equals(Components.interfaces.nsIAuthPrompt2)) {
            TbSync.dump("GET","nsIAuthPrompt2");
            if (!this.authPrompt) {
              this.authPrompt = new dav.network.Prompt(connectionData);
            }
            return this.authPrompt;
          } else if (aIID.equals(Components.interfaces.nsIAuthPrompt)) {
            //TbSync.dump("GET","nsIAuthPrompt");
          } else if (aIID.equals(Components.interfaces.nsIAuthPromptProvider)) {
            //TbSync.dump("GET","nsIAuthPromptProvider");
          } else if (aIID.equals(Components.interfaces.nsIPrompt)) {
            //TbSync.dump("GET","nsIPrompt");
          } else if (aIID.equals(Components.interfaces.nsIProgressEventSink)) {
            //TbSync.dump("GET","nsIProgressEventSink");
          } else if (aIID.equals(Components.interfaces.nsIChannelEventSink)) {
            //TbSync.dump("GET","nsIChannelEventSink");
            return dav.network.Redirect;
          }

          throw Components.results.NS_ERROR_NO_INTERFACE;
        },
      }

      let channel = dav.network.prepHttpChannel(requestData, headers, method, connectionData, notificationCallbacks);    
      if (aUseStreamLoader) {
        let loader =  Components.classes["@mozilla.org/network/stream-loader;1"].createInstance(Components.interfaces.nsIStreamLoader);
        loader.init(listener);
        listener = loader;
      }        
    
      connectionData.startTimeout(channel);
      channel.asyncOpen(listener, channel);
    });
  }
}
