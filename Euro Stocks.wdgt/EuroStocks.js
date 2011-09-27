// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var debug1; // the debug div

// global UI variables
var topbarHeight = 103;
var frontHeight = 208;
var backHeight = 250;
var showPercentage = false;
var showRisersFallers = false;
var widgetID = "";

// default preferences
var Stocks = new Array("AAPL","^AEX","AABA.AS","^FTSE"); // example: (AAPL,^AEX,AABA.AS)
var selectedStock = 0; // the index of the selected stock in Stocks
var chartPeriod = 1; // 1-7 -> 2w,1m,3m,6m,1y,2y,5y
var numberOfStocks = 3;

// global data containers
var arrayStocks;

function setup() {
    debug1 = document.getElementById("debug1");
    if (window.widget) {
        widgetID = widget.identifier;
        widget.onshow = onWidgetShow;
        widget.onremove = onWidgetRemoval;
        var doneButton = new AppleGlassButton(document.getElementById('doneButton'),"Done",hidePrefs);
        var iButton = new AppleInfoButton(document.getElementById("iButton"),document.getElementById("front"),"black","black",showPrefs);
        window.resizeTo(216,parseInt(Math.max(frontHeight,backHeight)));
    }
    // To conform to new WebKit (Leopard), initialize size in HTML and set size in CSS accordingly.
    document.getElementById('chartcanvas').style.width = document.getElementById('chartcanvas').width + "px";
    document.getElementById('chartcanvas').style.height = document.getElementById('chartcanvas').height + "px";
    getPrefs();
    updateCheckbox();
    updateFront();
    // update select list on back
    for (i=0;i<Stocks.length;i++) {
        var newOption = new Option();
        newOption.value=Stocks[i].toLowerCase();
        newOption.text=Stocks[i].toUpperCase();
        document.getElementById('selectStock').add(newOption,null);
    }
        
    // update selectionlabel of chartperiod
    if (chartPeriod!=1) {
        document.getElementById(("selectPeriodLabel"+chartPeriod)).setAttribute("class","selectedPeriodLabel");
        document.getElementById(("selectPeriodLabel"+chartPeriod)).removeAttribute("onClick");
        for (i=1;i<=7;i++)    {
            if (("selectPeriodLabel"+chartPeriod)!="selectPeriodLabel"+i) {
                document.getElementById("selectPeriodLabel"+i).setAttribute("class","selectPeriodLabel");
                document.getElementById("selectPeriodLabel"+i).setAttribute("onClick","selectPeriod(id)");
            }
        }
    }
    
    getData();
}

function onWidgetShow() {
    getData();
    isItTimeToUpdate();
}

function onWidgetRemoval() {
    // remove all associated preferences
    if (window.widget) {
        widget.setPreferenceForKey(null,("Stocks"+widgetID));
        widget.setPreferenceForKey(null,("chartPeriod"+widgetID));
        widget.setPreferenceForKey(null,("selectedStock"+widgetID));
        widget.setPreferenceForKey(null,("updateAllowed"+widgetID));
        widget.setPreferenceForKey(null,("showRisersFallers"+widgetID));
    }
}

// update front to reflect number of Stocks
function updateFront() {
    if (Stocks.length>numberOfStocks) {
        while (Stocks.length>numberOfStocks) {
            addStock();
        }
    }
    else {
        while (Stocks.length<numberOfStocks) {
            removeStock(numberOfStocks);
        }
    }
    // update selection of stock
    var idnumber = selectedStock + 1;
    document.getElementById(("stockbar"+idnumber)).setAttribute("class","stockbarselected");
    document.getElementById(("stockbar"+idnumber)).removeAttribute("onClick");
    for (i=1;i<=numberOfStocks;i++) { // bij tweede argument het aantal stocks dynamisch neerzetten
        if (idnumber!=i) {
            document.getElementById("stockbar"+i).setAttribute("class","stockbar");
            document.getElementById("stockbarclick"+i).setAttribute("onClick","selectStock(id)");
        }
    }    
}

// retrieve saved preferences, when they're non-existent, do nothing (see defaults above)
function getPrefs() {
    if (window.widget) {
        var StocksPrefs = widget.preferenceForKey(("Stocks"+widgetID));
        var chartPeriodPrefs = widget.preferenceForKey(("chartPeriod"+widgetID));
        var selectedStockPrefs = widget.preferenceForKey(("selectedStock"+widgetID));
        var updateAllowed = widget.preferenceForKey(("updateAllowed"+widgetID));
        if (StocksPrefs!=undefined) {
            Stocks = StocksPrefs.split(",");
        }
        if (chartPeriodPrefs!=undefined) {
            chartPeriod = parseInt(chartPeriodPrefs);
        }
        if (selectedStockPrefs!=undefined) {
            selectedStock = parseInt(selectedStockPrefs);
        }
        if (updateAllowed!=undefined){
            document.getElementById('updateCheckbox').checked = updateAllowed;
        }
    }
}

function getData() {
    // build in some code to check whether asking for the RF is of any use.
    var isIndex = (Stocks[selectedStock].charAt(0) == "^");
    requestStockRates();
    
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



function formatNumber(num,dec) { // num = number to format, dec = number of decimals
    if (isNaN(num)) {
        return "N/A";
    }
    else {
        num = parseFloat(num);
        dec = parseInt(dec);
        var factor = Math.pow(10,dec);
        num = Math.abs(num);
        num = Math.round(num * factor);
        var numString = String(num);
        var numberOfLeadingZeros = (num==0) ? dec : parseInt(dec - Math.floor(Math.log(num)/Math.log(10)));
        for (q=0;q<numberOfLeadingZeros;q++) {
            numString = "0" + numString;
        }
        var left = numString.slice(0,(numString.length - dec));
        var right = numString.slice(numString.length - dec);
        return String(left) + ((dec>0) ? "." + String(right) : "");
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
    for (i=1;i<=7;i++)    {
        if (id!="selectPeriodLabel"+i) {
            document.getElementById("selectPeriodLabel"+i).setAttribute("class","selectPeriodLabel");
            document.getElementById("selectPeriodLabel"+i).setAttribute("onClick","selectPeriod(id)");
        }
    }
    chartPeriod = parseInt(id.replace("selectPeriodLabel",""));
    requestChartRates(chartPeriod);
    if (window.widget) widget.setPreferenceForKey(chartPeriod,("chartPeriod"+widgetID));
}

function selectStock(id) {
    var idnumber = id.replace("stockbarclick","");
    document.getElementById(("stockbar"+idnumber)).setAttribute("class","stockbarselected");
    for (i=1;i<=numberOfStocks;i++) {
        if (idnumber!=i) {
            document.getElementById("stockbar"+i).setAttribute("class","stockbar");
            document.getElementById("stockbarclick"+i).setAttribute("onClick","selectStock(id)");
        }
    }
    selectedStock = idnumber-1;
    if (window.widget) widget.setPreferenceForKey(selectedStock,("selectedStock"+widgetID));
    getData();
}

function addStock() {
    numberOfStocks++;
    topbarHeight+=28;
    frontHeight+=28;
    var newStock = document.createElement("div");
    var newStockClick = document.createElement("div");
    var newStockName = document.createElement("div");
    var newStockValue = document.createElement("div");
    var newStockChange = document.createElement("div");
    newStock.setAttribute("class","stockbar");
    newStock.setAttribute("id","stockbar"+numberOfStocks);
    newStock.setAttribute("style","top:"+(6+(numberOfStocks-1)*28)+"px");
    newStockClick.setAttribute("class","stockclick");
    newStockClick.setAttribute("id","stockbarclick"+numberOfStocks);
    newStockClick.setAttribute("onclick","selectStock(id)");
    newStockName.setAttribute("class","stockname");
    newStockName.setAttribute("id","stockbarname"+numberOfStocks);
    newStockName.innerHTML = "TEMP";
    newStockValue.setAttribute("class","stockvalue");
    newStockValue.setAttribute("id","stockbarvalue"+numberOfStocks);
    newStockValue.innerHTML = "100.00";
    newStockChange.setAttribute("class","stockchangepos");
    newStockChange.setAttribute("id","stockbarchange"+numberOfStocks);
    newStockChange.setAttribute("onclick","switchChangePercentage()");
    newStockChange.innerHTML = "10.00";
    newStock.appendChild(newStockClick);
    newStock.appendChild(newStockName);
    newStock.appendChild(newStockValue);
    newStock.appendChild(newStockChange);
    document.getElementById("topbar").style.height = topbarHeight+"px";
    document.getElementById("front").style.height = frontHeight+"px";
    window.resizeTo(216,parseInt(Math.max(frontHeight,backHeight)));
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
    if (arrayStocks) {
        var arrayStocksRows = Math.floor(arrayStocks.length/9);
        var least = Math.min(arrayStocksRows,numberOfStocks);
        var percentage;
        var row;
        for (i=0;i<least;i++) {
            row = i*9;
            if (!showPercentage) {
                percentage = (arrayStocks[row+4]==0.0) ? 0 : arrayStocks[row+4] / (arrayStocks[row+1] - arrayStocks[row+4]) * 100;
                document.getElementById("stockbarchange"+(i+1)).innerHTML = formatNumber(percentage,2) + '%';
            }
            else {
                document.getElementById("stockbarchange"+(i+1)).innerHTML = formatNumber(arrayStocks[row+4],2);
            }
        }
        showPercentage = !showPercentage;
    }
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
    for (i=document.getElementById('selectStock').length-1;i>=0;i--) { 
        if (document.getElementById('selectStock').options[i].selected && document.getElementById('selectStock').length>1) {
            document.getElementById('selectStock').remove(i);
        }
    }
    if (selectedStock>=document.getElementById('selectStock').length) selectedStock = 0;
    Stocks = new Array();
    for (i=0;i<document.getElementById('selectStock').length;i++) {
        Stocks[i] = document.getElementById('selectStock').options[i].value.toUpperCase();
    }
    if (window.widget) {
        widget.setPreferenceForKey(Stocks.toString(","),("Stocks"+widgetID));
        widget.setPreferenceForKey(selectedStock,("selectedStock"+widgetID));
    }
}

function showPrefs() {
    var front = document.getElementById("front");
    var back = document.getElementById("back");
    
    if (window.widget) widget.prepareForTransition("ToBack");
    
    front.style.display="none";
    back.style.display="block";
    
    if (window.widget) setTimeout('widget.performTransition();', 0);
}

function hidePrefs() {
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) widget.prepareForTransition("ToFront");
    
    back.style.display="none";
    front.style.display="block";
    updateFront();
    getData();
    
    if (window.widget) setTimeout('widget.performTransition();', 0); 
}

function openSite(url) {
    widget.openURL(url);
}

function switchShowRF() {
    showRisersFallers = !showRisersFallers;
    if (window.widget) widget.setPreferenceForKey(showRisersFallers,("showRisersFallers"+widgetID));
    if (showRisersFallers) {
        requestRF();
    }
    else {
        requestChartRates(chartPeriod);        
    }
}