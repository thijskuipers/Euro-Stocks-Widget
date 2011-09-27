// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var currentVersion = "1.5"; // the current version of the widget
var debugUpdateURL = "http://localhost:8888/New Euro Stocks/version.html";
var updateURL = "http://widgets.broes.nl/euroStocksVersion.php";
var reqVersion = false; // The version XML request
var lastTimeUpdateCheck = 0; // Last time the widget checked for an update
var update=false; // Do update yes or no

function updateCheckbox()
{
    var updateAllowed = document.getElementById("updateCheckbox").checked;
    if (widget) widget.setPreferenceForKey(updateAllowed, ("updateAllowed"+widgetID));
    if (!updateAllowed)
    {
        document.getElementById("updateFeedback").innerHTML = "This version: " + currentVersion;
    }
    else
    {
        checkForUpdate();
    }
}

function checkForUpdate()
{
    reqVersion = new XMLHttpRequest();
    reqVersion.onreadystatechange = compareVersion;
    reqVersion.open("GET", updateURL, true);
    reqVersion.setRequestHeader("Cache-Control", "no-cache");
    reqVersion.send(null);
}

function compareVersion()
{ 
    if (reqVersion.readyState == 4)
    {
        if (reqVersion.status == 200)
        {
            var dateNow = new Date();
            dateNow = Math.round(dateNow.getTime() / 1000);
            lastTimeUpdateCheck = dateNow;
            var serverVersion = reqVersion.responseText;
            reqVersion = null;
            if ((currentVersion != serverVersion) && (serverVersion != null) && (serverVersion != ""))
            {
                document.getElementById("updateFeedback").innerHTML = "New version available!<br>Available version: " + serverVersion;
                updateAvailable();
            }
            else
            {
                document.getElementById("updateFeedback").innerHTML = "This version (" + currentVersion + ") is up to date!";
            }
        }
        else
        {
            document.getElementById("updateFeedback").innerHTML = "Can't connect to server.";
        }
    }
}

function isItTimeToUpdate()
{
    var dateNow = new Date();
    dateNow = Math.round(dateNow.getTime() / 1000);
    if (lastTimeUpdateCheck + 172800 < dateNow) updateCheckbox();
}

function updateAvailable()
{
    document.getElementById("updatenoimage").style.opacity = "0.0";
    document.getElementById("updateyesimage").style.opacity = "0.0";
    document.getElementById("updatepanel").style.opacity = "0.0";
    document.getElementById("updatenoimage").style.display = "block";
    document.getElementById("updateyesimage").style.display = "block";
    document.getElementById("updatepanel").style.display = "block";
    var fadeAnimator = new AppleAnimator(1000, 50, 0.0, 1.0, fadeInUpdatePanel);
    fadeAnimator.start();
}

function fadeInUpdatePanel(animation, current, start, finish)
{
    document.getElementById("updatepanel").style.opacity = current;
}

function mouseDownNo()
{
    document.getElementById("updatenoimage").style.opacity = "1.0";    
}

function mouseDownYes()
{
    document.getElementById("updateyesimage").style.opacity = "1.0";
}

function mouseOutNo()
{
    document.getElementById("updatenoimage").style.opacity = "0.0";    
}

function mouseOutYes()
{
    document.getElementById("updateyesimage").style.opacity = "0.0";
}

function doNotUpdate()
{
    update = false;
    document.getElementById("updateyesimage").style.display = "none";
    var fadeAnimator = new AppleAnimator(1000, 50, 1.0, 0.0, fadeOutUpdatePanel);
    fadeAnimator.start();
}

function doUpdate()
{
    update = true;
    document.getElementById("updatenoimage").style.display= "none";
    var fadeAnimator = new AppleAnimator(1000, 50, 1.0, 0.0, fadeOutUpdatePanel);
    fadeAnimator.start();
}

function fadeOutUpdatePanel(animation, current, start, finish)
{
    document.getElementById("updatepanel").style.opacity = current;
    if (finish)
    {
        document.getElementById("updatepanel").style.display = "none";
        if (update)
        {
            update = false;
            if (widget) widget.openURL("http://www.broes.nl/widgets/eurostocks/");
        }
    }
}
