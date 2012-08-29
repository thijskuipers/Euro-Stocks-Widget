// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var BroesUpdater = function() {
    // private properties
    var currentVersion = "1.7",
        lastTimeUpdateCheck = 0,
        versionUrl = "http://widgets.broes.nl/euroStocksVersion.php",
        downloadUrl = "http://www.broes.nl/widgets/eurostocks/",
        updatePanel,
        feedbackPanel;
    
    // private methods
    
    function init(updatePanelId, feedbackPanelId, yesBtnId, noBtnId) {
        updatePanel = document.getElementById(updatePanelId);
        feedbackPanel = document.getElementById(feedbackPanelId);
        var updNoButton = new AppleGlassButton(document.getElementById(noBtnId), "No", dontUpdate); 
        var updYesButton = new AppleGlassButton(document.getElementById(yesBtnId), "Yes, update", doUpdate);
    }
    
    function dontUpdate(e) {
        e.preventDefault();
        e.stopPropagation();
        updatePanel.style.display = "none";
    }
    
    function doUpdate(e) {
        e.preventDefault();
        e.stopPropagation();
        updatePanel.style.display = "none";
        if (window.widget) {
            widget.openURL(downloadUrl);
        }
    }
    
    function checkForUpdate() {
        var reqversion = new XMLHttpRequest();
        
        function compareVersion () { 
            if (reqversion.readyState === 4) {
                if (reqversion.status === 200) {
                    lastTimeUpdateCheck = Math.floor(new Date().getTime() / 1000);
                    
                    if (currentVersion !== reqversion.responseText) {
                        feedbackPanel.innerHTML = "New version available!<br>New version: " + reqversion.responseText;
                        updateAvailable();
                    }
                    else {
                        feedbackPanel.innerHTML = "This version (" + currentVersion + ") is up to date.";
                    }
                }
                else {
                    feedbackPanel.innerHTML = "Can't connect to server.";
                }
                reqversion = false;
            }
        }
        
        reqversion.onreadystatechange = compareVersion;
        reqversion.open("GET", versionUrl + "?version=" + currentVersion, true);
        reqversion.setRequestHeader("Cache-Control", "no-cache");
        reqversion.send(null);
    }

    function isItTimeToUpdate(updateNow) {
        var _updateNow = updateNow || false; // default false

        var dateNow = new Date();
        dateNow = Math.round(dateNow.getTime() / 1000);

        if ((lastTimeUpdateCheck + 172800 < dateNow) || _updateNow) { // last update was more than 2 days ago
            checkForUpdate();
        }
    }

    function updateAvailable() {
        updatePanel.style.display = "block";
    }
    
    // public methods
    return {
        isItTimeToUpdate: isItTimeToUpdate,
        init: init,
        currentVersion: currentVersion
    }
}();