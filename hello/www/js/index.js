
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
function soapService() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('POST', 'http://localhost:57564/EmployeeData.asmx?op=HelloWorld', true);
    var sr='<?xml version="1.0" encoding="utf-8"?>'+
           '<soap:Envelope'+
           ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+
            'xmlns:xsd="http://www.w3.org/2001/XMLSchema"'+
            'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'+
            '<soap:Body>'+
            '<HelloWorld xmlns="http://tempuri.org/" />'+
            '</soap:Body>'+
            '<soap:Envelope>';

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4) {
            if (xmlhttp.status == 200) {

                alert('done use firebug to see response');
            }
        }
    }
    xmlhttp.setRequestHeader('Content-Type', 'text/xml');
    xmlhttp.send(sr);
}