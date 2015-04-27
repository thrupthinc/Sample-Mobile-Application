
//var app = {
//    // Application Constructor
//    initialize: function() {
//        this.bindEvents();
//    },
//    // Bind Event Listeners
//    //
//    // Bind any events that are required on startup. Common events are:
//    // 'load', 'deviceready', 'offline', and 'online'.
//    bindEvents: function() {
//        document.addEventListener('deviceready', this.onDeviceReady, false);
//    },
//    // deviceready Event Handler
//    //
//    // The scope of 'this' is the event. In order to call the 'receivedEvent'
//    // function, we must explicitly call 'app.receivedEvent(...);'
//    onDeviceReady: function() {
//        app.receivedEvent('deviceready');
//    },
//    // Update DOM on a Received Event
//    receivedEvent: function(id) {
//        var parentElement = document.getElementById(id);
//        var listeningElement = parentElement.querySelector('.listening');
//        var receivedElement = parentElement.querySelector('.received');

//        listeningElement.setAttribute('style', 'display:none;');
//        receivedElement.setAttribute('style', 'display:block;');

//        console.log('Received Event: ' + id);
//    }
//};
//function callSoapHeader() {
//    //var xmlhttp = new XMLHttpRequest();
//    //xmlhttp.open('POST', 'http://localhost:57564/EmployeeData.asmx?op=HelloWorld', true);
//    var sr='<?xml version="1.0" encoding="utf-8"?>'+
//           '<soap:Envelope'+
//           'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+
//            'xmlns:xsd="http://www.w3.org/2001/XMLSchema"'+
//            'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'+
//            '<soap:Body>'+
//            '<HelloWorld xmlns="http://tempuri.org/" />'+
//            '</soap:Body>'+
//            '<soap:Envelope>';

//    //xmlhttp.onreadystatechange = function () {
//    //    if (xmlhttp.readyState == 4) {
//    //        if (xmlhttp.status == 200) {

//    //            alert('Sorry page coud not found');
//    //        }
//    //    }
//    //}
//    //xmlhttp.setRequestHeader('Content-Type', 'text/xml');
//    //xmlhttp.send(sr);
//    return sr;
//}
//function callback(result) {
//    alert(result);
//    if (result) {
//        alert("SUCCESS");
//    }
//    else {
//        alert("Error");
//    }
//}
//function WebSvc()  {
//    WebSvc.prototype.CallWebService = function (url, soapXml, callback) {
//        var xmlDoc = null;
//        if (window.XMLHttpRequest) {
//            xmlDoc = new XMLHttpRequest(); 
//        }
//        else if (window.ActiveXObject) //IE 5, 6
//        {
//            xmlDoc = new ActiveXObject("Microsoft.XMLHTTP");
//        }
//        alert(xmlDoc);
//        if (xmlDoc) {
//            //callback for readystate when it returns
//            var self = this;
//            xmlDoc.onreadystatechange = function () { self.StateChange(xmlDoc, callback); };

//            //set up the soap xml web service call
//            xmlDoc.open("POST", url, true);
//            xmlDoc.setRequestHeader("Content-Type", "text/xml");
//            xmlDoc.setRequestHeader("Content-Length", soapXml.length);
//            xmlDoc.send(soapXml);
//        }
//        else {
//            if (callback) {
//                callback(false);
//            }
//        }
//    };

//    WebSvc.prototype.StateChange = function (xmlDoc, callback) {
//        if (xmlDoc.readyState === 4) {
//            var text = "";

//            if (xmlDoc.status === 200) {
//                text = xmlDoc.responseText;
//            }
//            if (callback !== null) {
//                callback(xmlDoc.status === 200, text);
//            }
//        }
//    };
//}

//function getMessage() {

//    var soap = callSoapHeader();
//    var webServiceCall = new WebSvc();
//    alert(webServiceCall.CallWebService("EmployeeData.asmx?op=HelloWorld", soap, callback));;
//    alert("weBservice call");
//}




