// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var debugEnabled = false;

// global UI variables
var topbarHeight = 103;
var frontHeight = 208;
var backHeight = 250;
var showPercentage = false;
var showRisersFallers = false;
var widgetID = "";
var updateAllowed = true;

// default preferences
var Stocks = new Array("AAPL","GOOG","^FTSE","EURUSD=X"); // example: (AAPL,^AEX,AABA.AS)
var selectedStock = 0; // the index of the selected stock in Stocks
var chartPeriod = 1; // 1-7 -> 2w,1m,3m,6m,1y,2y,5y
var numberOfStocks = 3;

// global data containers
var arrayStocks;
var stocksDataRows;

function setup() {
    
    BroesUpdater.init("updatepanel", "updateFeedback", "btnUpdateYes", "btnUpdateNo");

    // Only perform these setup steps when it's a widget
    if (window.widget) {
        widgetID = widget.identifier;
        widget.onshow = onWidgetShow;
        widget.onremove = onWidgetRemoval;
        var doneButton = new AppleGlassButton(document.getElementById('doneButton'), "Done", hidePrefs);
        var iButton = new AppleInfoButton(document.getElementById("iButton"), document.getElementById("front"), "black", "black", showPrefs);
        window.resizeTo(216, parseInt(Math.max(frontHeight, backHeight)));
    }

    // To conform to new WebKit (Leopard), initialize size in HTML and set size in CSS accordingly.
    var canvasEl = document.getElementById('chartcanvas');
    canvasEl.style.width = canvasEl.width + "px";
    canvasEl.style.height = canvasEl.height + "px";

    getPrefs();
    updateCheckbox();
    updateFront();

    // update select list on back
    for (var i = 0; i < Stocks.length; i++) {
        var newOption = new Option();
        newOption.value = Stocks[i].toLowerCase();
        newOption.text = Stocks[i].toUpperCase();
        document.getElementById('selectStock').add(newOption, null);
    }

    // update selectionlabel of chart period
    if (chartPeriod != 1) {
        document.getElementById(("selectPeriodLabel" + chartPeriod)).setAttribute("class", "selectedPeriodLabel");
        document.getElementById(("selectPeriodLabel" + chartPeriod)).removeAttribute("onClick");
        
        // reset all css classes for the chart periods
        for (i = 1; i <= 7; i++)    {
            if (chartPeriod != i) {
                document.getElementById("selectPeriodLabel" + i).setAttribute("class", "selectPeriodLabel");
                document.getElementById("selectPeriodLabel" + i).setAttribute("onClick", "selectPeriod(id)");
            }
        }
    }

    getData();
}

function onWidgetShow() {
    getData();
    if (updateAllowed) {
        BroesUpdater.isItTimeToUpdate();
    }
}

function onWidgetRemoval() {
    // remove all associated preferences
    if (window.widget) {
        widget.setPreferenceForKey(null, ("Stocks" + widgetID));
        widget.setPreferenceForKey(null, ("chartPeriod" + widgetID));
        widget.setPreferenceForKey(null, ("selectedStock" + widgetID));
        widget.setPreferenceForKey(null, ("updateAllowed" + widgetID));
        widget.setPreferenceForKey(null, ("showRisersFallers" + widgetID));
        widget.setPreferenceForKey(null, ("showPercentage" + widgetID));
    }
}

// update front to reflect number of Stocks
function updateFront() {
    if (Stocks.length > numberOfStocks) {
        while (Stocks.length > numberOfStocks) {
            addStock();
        }
    }
    else {
        while (Stocks.length < numberOfStocks) {
            removeStock(numberOfStocks);
        }
    }
    // update selection of stock
    var idnumber = selectedStock + 1;
    document.getElementById(("stockbar" + idnumber)).setAttribute("class", "stockbarselected");
    document.getElementById(("stockbar" + idnumber)).removeAttribute("onClick");
    for (i = 1; i <= numberOfStocks; i++) { // bij tweede argument het aantal stocks dynamisch neerzetten
        if (idnumber != i) {
            document.getElementById("stockbar" + i).setAttribute("class","stockbar");
            document.getElementById("stockbarclick" + i).setAttribute("onClick","selectStock(id)");
        }
    }    
}

// retrieve saved preferences, when they're non-existent, do nothing (see defaults above)
function getPrefs() {
    if (window.widget) {
        var StocksPrefs = widget.preferenceForKey("Stocks" + widgetID);
        var chartPeriodPrefs = widget.preferenceForKey("chartPeriod" + widgetID);
        var selectedStockPrefs = widget.preferenceForKey("selectedStock" + widgetID);
        var updateAllowedPrefs = widget.preferenceForKey("updateAllowed" + widgetID);
        var showPercentagePrefs = widget.preferenceForKey("showPercentage" + widgetID);
        
        if (StocksPrefs !== undefined) {
            Stocks = StocksPrefs.split(",");
        }
        if (chartPeriodPrefs !== undefined) {
            chartPeriod = parseInt(chartPeriodPrefs);
        }
        if (selectedStockPrefs !== undefined) {
            selectedStock = parseInt(selectedStockPrefs);
        }
        if (updateAllowedPrefs !== undefined) {
            updateAllowed = !!updateAllowedPrefs;
            document.getElementById('updateCheckbox').checked = updateAllowed;
        }
        if (showPercentagePrefs !== undefined) {
            showPercentage = showPercentagePrefs;
        }
    }
}

function getData() {
    requestStockRates();

    // build in some code to check whether asking for the RF is of any use.
    var isIndex = (Stocks[selectedStock].charAt(0) == "^");
    if (isIndex) {
        document.getElementById('switchRfGraph').style.display = "block";
        if (showRisersFallers) {
            requestRF();
        }
        else {
            requestChartRates(chartPeriod);
        }
    }
    else {
        document.getElementById('switchRfGraph').style.display = "none";
        if (!showRisersFallers) {
            requestChartRates(chartPeriod);
        }
        else {
            switchShowRF();
        }
    } 
}

function formatNumber(num, dec, addSign) { // num = number to format, dec = number of decimals
    if (isNaN(num)) {
        return "N/A";
    }
    else {
        num = parseFloat(num);
        dec = parseInt(dec);
        var factor = Math.pow(10, dec);
        var negative = num < 0;
        num = Math.abs(num);
        num = Math.round(num * factor);
        var numString = String(num);
        var numberOfLeadingZeros = (num == 0) ? dec : parseInt(dec - Math.floor(Math.log(num) / Math.log(10)));
        for (q = 0; q < numberOfLeadingZeros; q++) {
            numString = "0" + numString;
        }
        var left = numString.slice(0, (numString.length - dec));
        var right = numString.slice(numString.length - dec);
        var resultString = String(left) + ((dec > 0) ? "." + String(right) : "");
        if (!!addSign) {
            resultString = (negative ? "-&nbsp;" : "+&nbsp;") + resultString;
        }
        return resultString
    }
}

function mouseOverGraph() {
    document.getElementById("selectPeriodBar").style.display = "block";
    document.getElementById("switchRfGraph").style.visibility = "visible";
}

function mouseOutGraph() {
    document.getElementById("selectPeriodBar").style.display = "none";
    document.getElementById("switchRfGraph").style.visibility = "hidden";
}

function selectPeriod(id) {
    document.getElementById(id).setAttribute("class","selectedPeriodLabel");
    document.getElementById(id).removeAttribute("onClick");
    for (i = 1; i <= 7; i++)    {
        if (id != "selectPeriodLabel" + i) {
            document.getElementById("selectPeriodLabel" + i).setAttribute("class", "selectPeriodLabel");
            document.getElementById("selectPeriodLabel" + i).setAttribute("onClick", "selectPeriod(id)");
        }
    }
    chartPeriod = parseInt(id.replace("selectPeriodLabel", ""));
    requestChartRates(chartPeriod);
    if (window.widget) widget.setPreferenceForKey(chartPeriod,("chartPeriod" + widgetID));
}

function selectStock(id) {
    var idnumber = id.replace("stockbarclick", "");
    document.getElementById(("stockbar" + idnumber)).setAttribute("class", "stockbarselected");
    for (i = 1; i <= numberOfStocks; i++) {
        if (idnumber != i) {
            document.getElementById("stockbar" + i).setAttribute("class", "stockbar");
            document.getElementById("stockbarclick" + i).setAttribute("onClick", "selectStock(id)");
        }
    }
    selectedStock = idnumber - 1;
    if (window.widget) widget.setPreferenceForKey(selectedStock, ("selectedStock" + widgetID));
    getData();
}

function addStock() {
    numberOfStocks++;
    topbarHeight += 28;
    frontHeight += 28;
    var newStock = document.createElement("div");
    var newStockClick = document.createElement("div");
    var newStockName = document.createElement("div");
    var newStockValue = document.createElement("div");
    var newStockChange = document.createElement("div");
    newStock.setAttribute("class", "stockbar");
    newStock.setAttribute("id","stockbar" + numberOfStocks);
    newStock.setAttribute("style","top:" + (6 + (numberOfStocks - 1) * 28) + "px");
    newStockClick.setAttribute("class", "stockclick");
    newStockClick.setAttribute("id", "stockbarclick" + numberOfStocks);
    newStockClick.setAttribute("onclick", "selectStock(id)");
    newStockName.setAttribute("class", "stockname");
    newStockName.setAttribute("id", "stockbarname" + numberOfStocks);
    newStockName.innerHTML = "TEMP";
    newStockValue.setAttribute("class", "stockvalue");
    newStockValue.setAttribute("id", "stockbarvalue" + numberOfStocks);
    newStockValue.innerHTML = "100.00";
    newStockChange.setAttribute("class", "stockchangepos");
    newStockChange.setAttribute("id", "stockbarchange" + numberOfStocks);
    newStockChange.setAttribute("onclick", "switchChangePercentage()");
    newStockChange.innerHTML = "10.00";
    newStock.appendChild(newStockClick);
    newStock.appendChild(newStockName);
    newStock.appendChild(newStockValue);
    newStock.appendChild(newStockChange);
    document.getElementById("topbar").style.height = topbarHeight + "px";
    document.getElementById("front").style.height = frontHeight + "px";
    window.resizeTo(216, parseInt(Math.max(frontHeight, backHeight)));
    document.getElementById("stockbars").appendChild(newStock);
}

function removeStock(stockID) {
    if (numberOfStocks>1) {
        if (stockID!=undefined) {
            stockID = parseInt(stockID);
        }
        else {
            var stockID = parseInt(document.getElementById("removeStockID").value);
        }
        var stockToRemove = document.getElementById("stockbar"+stockID);
        var stockExists = true;
        try {
            document.getElementById("stockbars").removeChild(stockToRemove);
        }
        catch(e) {
            stockExists = false;
        }
        if (stockExists) {
            for (i=(stockID+1);i<=numberOfStocks;i++){
                document.getElementById("stockbar"+i).setAttribute("style","top:"+(6+(i-2)*28)+"px");
                document.getElementById("stockbar"+i).setAttribute("id","stockbar"+(i-1));
                document.getElementById("stockbarclick"+i).setAttribute("id","stockbarclick"+(i-1));
                document.getElementById("stockbarvalue"+i).setAttribute("id","stockbarvalue"+(i-1));
                document.getElementById("stockbarchange"+i).setAttribute("id","stockbarchange"+(i-1));
                document.getElementById("stockbarname"+i).setAttribute("id","stockbarname"+(i-1));
            }
            numberOfStocks--;
            topbarHeight-=28;
            frontHeight-=28;
            document.getElementById("topbar").style.height = topbarHeight+"px";
            document.getElementById("front").style.height = frontHeight+"px";
            window.resizeTo(216,parseInt(Math.max(frontHeight,backHeight)));
        }
    }
}

function switchChangePercentage() {
    if (debugEnabled) {
        console.log("switchChangePercentage");
    }
    
    showPercentage = !showPercentage;
    if (window.widget) {
        widget.setPreferenceForKey(showPercentage,("showPercentage"+widgetID));
    }
    
    // Create local variable pointing to global stocks data array
    var dataRows = stocksDataRows;
    
    if (!dataRows) {
        return;
    }
    
    var least = Math.min(dataRows.length, numberOfStocks);
    if (debugEnabled) {
        console.log("least: " + least);
    }
    
    var changeClass = "stockchangepos";
    var percentage = 0.0;
    
    for (var i = 0; i < least; i++) {
        // Name: 0
        // Value: 1
        // Date: 2
        // Time: 3
        // Change: 4
        // Open: 5
        // High: 6
        // Low: 7
        // Volume: 8
        var row = dataRows[i];
        var changeEl = document.getElementById("stockbarchange" + (i + 1));
        if (debugEnabled) {
            console.log(row[0] + ": " + row[1]);
        }
        if (showPercentage) {
            percentage = row[4] / (row[1] - row[4]) * 100;
            changeEl.innerHTML = formatNumber(percentage, 2, true) + '%';
        }
        else {
            changeEl.innerHTML = formatNumber(row[4], 2, true);
        }
        changeClass = (parseFloat(row[4]) < 0) ? "stockchangeneg" : "stockchangepos";
        changeEl.setAttribute("class", changeClass);
    }

    // if (arrayStocks) {
    //     var arrayStocksRows = Math.floor(arrayStocks.length/9);
    //     var least = Math.min(arrayStocksRows,numberOfStocks);
    //     var percentage;
    //     var row;
    //     for (i=0;i<least;i++) {
    //         row = i*9;
    //         if (!showPercentage) {
    //             percentage = (arrayStocks[row+4]==0.0) ? 0 : arrayStocks[row+4] / (arrayStocks[row+1] - arrayStocks[row+4]) * 100;
    //             document.getElementById("stockbarchange"+(i+1)).innerHTML = formatNumber(percentage,2) + '%';
    //         }
    //         else {
    //             document.getElementById("stockbarchange"+(i+1)).innerHTML = formatNumber(arrayStocks[row+4],2);
    //         }
    //     }
    // }
}

function addNewStock() {
    var newStock = document.getElementById('stockNameField').value;
    newStock = newStock.toUpperCase();
    newOption = new Option();
    newOption.value=newStock.toLowerCase();
    newOption.text=newStock;
    document.getElementById('selectStock').add(newOption,null);
    document.getElementById('stockNameField').value="";
    Stocks = new Array();
    for (i=0;i<document.getElementById('selectStock').length;i++) {
        Stocks[i] = document.getElementById('selectStock').options[i].value.toUpperCase();
    }
    if (window.widget) widget.setPreferenceForKey(Stocks.toString(","),("Stocks"+widgetID));
}

function removeExistingStock() {
    // remove all selected stocks, starting with the last
    var selectStockEl = document.getElementById('selectStock');

    for (i = selectStockEl.length - 1; i >= 0; i--) { 
        if (selectStockEl.options[i].selected && selectStockEl.length > 1) {
            selectStockEl.remove(i);
        }
    }

    if (selectedStock >= selectStockEl.length) {
        selectedStock = 0;
    }

    Stocks = new Array();

    for (i = 0; i < selectStockEl.length; i++) {
        Stocks[i] = selectStockEl.options[i].value.toUpperCase();
    }

    if (window.widget) {
        widget.setPreferenceForKey(Stocks.toString(","), ("Stocks" + widgetID));
        widget.setPreferenceForKey(selectedStock, ("selectedStock" + widgetID));
    }
}

function moveStockDown() {
    // move the selected stock down in the list
    // alert( document.getElementById('selectStock').selectedIndex );
    // alert( document.getElementById('selectStock').length - 1 );
    
    var selectStockEl = document.getElementById('selectStock');
    
    if (selectStockEl.selectedIndex < selectStockEl.length - 1) {
        // alert( "hej" );
        var afterMe = selectStockEl.options[selectStockEl.selectedIndex + 2];
        var me = selectStockEl.options[selectStockEl.selectedIndex];
        var newMe = new Option();
        newMe.value = me.value;
        newMe.text  = me.text;

        selectStockEl.add(newMe, afterMe);
        selectStockEl.remove(selectStockEl.selectedIndex);
    }

    Stocks = new Array();

    for (i = 0; i < selectStockEl.length; i++) {
        Stocks[i] = selectStockEl.options[i].value.toUpperCase();
    }

    if (window.widget) {
        widget.setPreferenceForKey(Stocks.toString(","), ("Stocks" + widgetID));
        widget.setPreferenceForKey(selectedStock, ("selectedStock" + widgetID));
    }
}

function moveStockUp() {
    // move the selected stock up in the list
    var selectStockEl = document.getElementById('selectStock');
    var selectedIndex = selectStockEl.selectedIndex;
    if ( selectedIndex > 0 ) {       
        var beforeMe = selectStockEl.options[selectedIndex - 1];
        var me = selectStockEl.options[selectedIndex];
        var newMe = new Option();
        newMe.value = me.value;
        newMe.text  = me.text;

        selectStockEl.add(newMe, beforeMe);
        selectStockEl.remove(selectedIndex);
    }
    Stocks = new Array();

    for (i = 0, len = selectStockEl.length ; i < len; i++) {
        Stocks[i] = selectStockEl.options[i].value.toUpperCase();
    }

    if (window.widget) {
        widget.setPreferenceForKey(Stocks.toString(","), ("Stocks" + widgetID));
        widget.setPreferenceForKey(selectedStock, ("selectedStock" + widgetID));
    }
}

function showPrefs() {
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) widget.prepareForTransition("ToBack");

    front.style.display = "none";
    back.style.display = "block";

    if (window.widget) setTimeout(function () {
        widget.performTransition();
    }, 0);
}

function hidePrefs() {
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) widget.prepareForTransition("ToFront");

    back.style.display="none";
    front.style.display="block";
    updateFront();
    getData();

    if (window.widget) setTimeout(function () {
        widget.performTransition()
    }, 0); 
}

function openSite(url) {
    widget.openURL(url);
}

function switchShowRF() {
    showRisersFallers = !showRisersFallers;
    if (window.widget) widget.setPreferenceForKey(showRisersFallers,("showRisersFallers" + widgetID));
    if (showRisersFallers) {
        requestRF();
    }
    else {
        requestChartRates(chartPeriod);        
    }
}

function updateCheckbox()
{
    updateAllowed = document.getElementById("updateCheckbox").checked;
    
    if (window.widget) {
        widget.setPreferenceForKey(updateAllowed, ("updateAllowed" + widgetID));
    }
    
    if (!updateAllowed) {
        document.getElementById("updateFeedback").innerHTML = "This version: " + BroesUpdater.currentVersion;
    }
    else {
        BroesUpdater.isItTimeToUpdate(true);
    }
}