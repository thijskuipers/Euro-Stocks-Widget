// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var debug1; // the debug div
var debugChartURL = "http://localhost:8888/New Euro Stocks/table6.csv"; // debug
var debugStocksURL ="http://localhost:8888/New Euro Stocks/quotes2.csv"; // debug

// global chart variables
var horGridPeriod = 1; // 0=year, 1=month, 2=day
var horGridSkip = 4; // the number of gridlines to skip
var numberOfColumns = 7;
var numberOfStocks = 3;
var arrayStocks;

// global UI variables
var topbarHeight = 103;
var frontHeight = 208;
var backHeight = 250;
var showPercentage = false;
var widgetID = "";

// global XML request variables
var chartURL; // the url for the chart data
var reqChart; // the XMLHttpRequest
var response; // the HTTP text response
var busyRequesting = false;

var stocksURL; // the url for the stock rate data
var reqStocks;
var responseStocks;
var busyRequestingStocks=false;

// default preferences
var Stocks = new Array("AAPL","^AEX","AABA.AS","^FTSE"); // example: (AAPL,^AEX,AABA.AS)
var chartPeriod = 1; // 1-7 -> 2w,1m,3m,6m,1y,2y,5y
var selectedStock = 0; // the index of the selected stock in Stocks

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
        
    // update selection of chartperiod
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
    requestStockRates();
    requestChartRates();
}

function drawChart(arrayDateClose,numberOfRows,dateColumn,closeColumn) {
    var canvas = document.getElementById("chartcanvas");
    var canvasHeight = canvas.offsetHeight - 10; // real height(css) -10 (margin)
    var canvasWidth = canvas.offsetWidth - 10; // real width(css) -10 (margin)
    var xStepSize = canvasWidth/(numberOfRows-2); // minus 1 for first row, minus 1 for "pieces in between is one less"
    var yMin=arrayDateClose[closeColumn+numberOfColumns]; // +numberOfColumns -> from row 2
    var yMax=arrayDateClose[closeColumn+numberOfColumns];
    
    for (i=2;i<numberOfRows;i++) { // from third row (0=first row)
        var j = (i * numberOfColumns) + closeColumn; // select columns
        yMin = Math.min(arrayDateClose[j],yMin); // compare current columns with previous column
        yMax = Math.max(arrayDateClose[j],yMax);
    }
    var yRatio = canvasHeight/(yMax-yMin);

    // start of the canvas
    var context = canvas.getContext("2d");
    context.clearRect(0,0,canvasWidth+10,canvasHeight+10); // canvas leegmaken (met marge)
    
    // the horizontal grid
    context.save();
    var yGridStep = canvasHeight/4; // 4 - 1 = number of gridlines
    for (i=1;i<=3;i++) { // 3 = number of gridlines
        context.moveTo(5,i*yGridStep+5); // 5 = margin (2*5=10, see above)
        context.lineTo(canvasWidth+5,i*yGridStep+5); // 5 = margin
    }
    context.lineWidth = 1;
    context.strokeStyle = "#ccaaaa";
    context.stroke();
    context.restore();
    
    // the vertical grid
    context.save();
    var countXGrid=0;
    var horizontalLabels = new Array();
    var prevDate = arrayDateClose[(numberOfColumns + dateColumn)].split("-"); // from row 2, split: y-m-d -> y,m,d
    var nextDate = new Array();
    for (i=2;i<numberOfRows;i++) { // from row three (0 = first row)
        var j = (i * 7) + dateColumn;
        nextDate = arrayDateClose[j].split("-"); // split: y-m-d -> y,m,d
        // if the y,m or d changes, it's time for a new gridline, but some are skipped
        if (prevDate[horGridPeriod]!=nextDate[horGridPeriod]) { // compare according to: horGridPeriod = 0,1,2 -> y,m,d
            countXGrid++;
            if (!(countXGrid%horGridSkip)) { // show every "horGridSKip" gridline, starting with the first
                var xCoord = Math.round(canvasWidth - (i-1) * xStepSize + 5);
                context.moveTo(xCoord,5); // 5 = margin
                context.lineTo(xCoord,canvasHeight+5); // 5 = margin
                horizontalLabels.push(xCoord); // add the xCoord of the label
                horizontalLabels.push(prevDate[horGridPeriod]); // add the label
            }
            prevDate = nextDate;
        }
    }
    context.lineWidth = 1;
    context.strokeStyle = "#ccaaaa";
    context.stroke();
    context.restore();
    
    // array to change the monthnumber to the monthname
    var monthLabels = new Array("","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec");
    function yearLabel(year) {
        return "'"+year.slice(year.length-2);
    }
    
    var xGrid = document.getElementById("horGrid");
    
    // clear the horizontal grid labels
    while (xGrid.hasChildNodes()) {
        xGrid.removeChild(xGrid.lastChild);
    }
    // add the horizontal grid labels
    for (i=0; i<(horizontalLabels.length/2);i++) {
        var addXGrid = document.createElement("div");
         // if the horGridPeriod is in months, change the monthnumber to the monthname
        addXGrid.innerHTML = (horGridPeriod!=1) ? (horGridPeriod!=0) ? horizontalLabels[i*2+1] : yearLabel(horizontalLabels[i*2+1]) : monthLabels[parseFloat(horizontalLabels[(i*2+1)])];
        addXGrid.setAttribute("id","xGrid" + i);
        addXGrid.setAttribute("class","horGridLabel");
        addXGrid.setAttribute("style","left:" + horizontalLabels[i*2] + "px;");
        xGrid.appendChild(addXGrid);
    }
    
    // the actual graph 
    context.save();
    context.lineWidth = 1;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.shadowBlur = 2;
    context.shadowOffsetY = 1;
    context.beginPath();
    for (i=1;i<numberOfRows;i++) { // from row 2 (0 = first row)
        var j = (i * 7) + closeColumn;
        var xCoord = canvasWidth - (i-1) * xStepSize + 5;
        var yCoord = canvasHeight - (arrayDateClose[j] - yMin) * yRatio + 5;
        if (i==1) context.moveTo(xCoord,yCoord);
        else context.lineTo(xCoord,yCoord);
    }
    context.strokeStyle = "#333333"
    context.stroke();
    context.restore();
    
    // add the vertical grid labels (they're always in the same place)
    var yGridStepAbs = (yMax-yMin)/4;
    document.getElementById("vertGridLabel1").innerHTML = formatNumber(yMax,2);
    document.getElementById("vertGridLabel2").innerHTML = Math.round((3*yGridStepAbs) + yMin);
    document.getElementById("vertGridLabel3").innerHTML = Math.round((2*yGridStepAbs) + yMin);
    document.getElementById("vertGridLabel4").innerHTML = Math.round(yGridStepAbs + yMin);
    document.getElementById("vertGridLabel5").innerHTML = formatNumber(yMin,2);
    
    // the graph is ready, stop displaying the message
    document.getElementById("graphMessage").style.display = "none";
}

function requestChartRates()
{
    document.getElementById("graphMessage").innerHTML = "Requesting...";
    document.getElementById("graphMessage").style.display = "block";
    if (!busyRequesting)
    {
        busyRequesting = true;
        reqChart = new XMLHttpRequest();
        reqChart.onreadystatechange = receiveChartRates;
        reqChart.open("GET", makeChartURL(), true); // url = chartURL
        reqChart.setRequestHeader("Cache-Control", "no-cache");
        reqChart.send("");
    }
}

function receiveChartRates()
{
    if (reqChart.readyState == 4)
    {
        busyRequesting = false;
        if (reqChart.status == 200)
        {
            response = reqChart.responseText;
            parseChartRates();
        }
        else
        {
            document.getElementById("graphMessage").innerHTML = "Error in request";
        }
    }
}

function parseChartRates()
{
    response = response.replace(/(\r\n)|(\n)/gi,","); // convert line breaks (windows & unix) to commas
    var arrayRates = response.split(","); // split to array by commas
    var arrayRatesRows = Math.floor(arrayRates.length/numberOfColumns); // floor -> only entire rows (last elements are line endings)
    if (arrayRatesRows>5) { // only if response contains enough datapoints
        drawChart(arrayRates,arrayRatesRows,0,6); // 0 -> dateColumn, 6 -> closevalueColumn
    }
    else document.getElementById("graphMessage").innerHTML = "No data received.";
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
    document.getElementById("selectPeriodBar").style.display="block";
}

function mouseOutGraph() {
    document.getElementById("selectPeriodBar").style.display="none";
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
    //makeChartURL();
    requestChartRates();
    if (window.widget) widget.setPreferenceForKey(chartPeriod,("chartPeriod"+widgetID));
}

function selectStock(id) {
    var idnumber = id.replace("stockbarclick","");
    document.getElementById(("stockbar"+idnumber)).setAttribute("class","stockbarselected");
    document.getElementById(id).removeAttribute("onClick");
    for (i=1;i<=numberOfStocks;i++) { // bij tweede argument het aantal stocks dynamisch neerzetten
        if (idnumber!=i) {
            document.getElementById("stockbar"+i).setAttribute("class","stockbar");
            document.getElementById("stockbarclick"+i).setAttribute("onClick","selectStock(id)");
        }
    }
    selectedStock = idnumber-1;
    if (window.widget) widget.setPreferenceForKey(selectedStock,("selectedStock"+widgetID));
    //makeChartURL();
    requestChartRates();
}

function makeChartURL() {
    // http://ichart.yahoo.com/table.csv? s=%5EAEX &d=3 &e=10 &f=2007 &g=d &a=9 &b=12 &c=1992 &ignore=.csv
    var timeDif = 0;
    var resolution; // daily, weekly, monthly
    var day = 1000 * 60 * 60 * 24; // number of milliseconds in one day
    switch (chartPeriod) {
        case 1: // 2w
            timeDif = day * 14;
            resolution = "d";
            horGridPeriod = 2; // 0=year, 1=month, 2=day
            horGridSkip = 2; // the number of gridlines to skip
            break;
        case 2: // 1m
            timeDif = Math.round(day * 30.4);
            resolution = "d";
            horGridPeriod = 2; // 0=year, 1=month, 2=day
            horGridSkip = 4; // the number of gridlines to skip
            break;
        case 3: // 3m
            timeDif = Math.round(day * 91.3);
            resolution = "d";
            horGridPeriod = 1; // 0=year, 1=month, 2=day
            horGridSkip = 1; // the number of gridlines to skip
            break;
        case 4: // 6m
            timeDif = Math.round(day * 182.5);
            resolution = "d";
            horGridPeriod = 1; // 0=year, 1=month, 2=day
            horGridSkip = 1; // the number of gridlines to skip
            break;
        case 5: // 1y
            timeDif = Math.round(day * 365);
            resolution = "w";
            horGridPeriod = 1; // 0=year, 1=month, 2=day
            horGridSkip = 2; // the number of gridlines to skip
            break;
        case 6: // 2y
            timeDif = Math.round(day * 365 * 2);
            resolution = "w";
            horGridPeriod = 1; // 0=year, 1=month, 2=day
            horGridSkip = 4; // the number of gridlines to skip
            break;
        case 7: // 5y
            timeDif = Math.round(day * 365 * 5);
            resolution ="w";
            horGridPeriod = 0; // 0=year, 1=month, 2=day
            horGridSkip = 1; // the number of gridlines to skip
            break;
    }
    var today  = new Date();
    var fromDay = new Date();
    fromDay.setTime(today-timeDif);
    var todaysYear = today.getFullYear();
    var todaysMonth = today.getMonth();
    var todaysDay = today.getDate();
    var fromDaysYear = fromDay.getFullYear();
    var fromDaysMonth = fromDay.getMonth();
    var fromDaysDay = fromDay.getDate();
    var stockName = encodeURIComponent(Stocks[selectedStock]);
    var chartURL = "http://ichart.yahoo.com/table.csv?s=" + stockName + "&d=" + todaysMonth + "&e=" + todaysDay + "&f=" + todaysYear + "&g=" + resolution + "&a=" + fromDaysMonth + "&b=" + fromDaysDay + "&c=" + fromDaysYear + "&ignore=.csv";
    return chartURL;
    //return debugChartURL;
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

function makeStockRateURL() {
    var stringStockNames = Stocks.toString(",");
    var urlStockNames = encodeURIComponent(stringStockNames);
    stocksURL = "http://finance.yahoo.com/d/quotes.csv?s=" + urlStockNames + "&f=sl1d1t1c1ohgv&e=.csv";
    return stocksURL;
    //return debugStocksURL;
}

function requestStockRates()
{
    if (!busyRequestingStocks)
    {
        busyRequestingStocks = true;
        reqStocks = new XMLHttpRequest();
        reqStocks.onreadystatechange = receiveStockRates;
        reqStocks.open("GET", makeStockRateURL(), true);
        reqStocks.setRequestHeader("Cache-Control", "no-cache");
        reqStocks.send("");
    }
}

function receiveStockRates()
{
    if (reqStocks.readyState == 4)
    {
        busyRequestingStocks = false;
        if (reqStocks.status == 200)
        {
            responseStocks = reqStocks.responseText;
            parseStockRates();
        }
        else
        {
            //debug1.innerHTML = "Error in Stockrates request";
        }
    }
}

function parseStockRates() {
    responseStocks = responseStocks.replace(/\r\n/gi,","); // replace line breaks by comma's
    arrayStocks = responseStocks.split(","); // split the file into an array by comma's
    for (x in arrayStocks) {
        arrayStocks[x] = arrayStocks[x].replace(/\"/gi,""); // remove quotes
    }
    var arrayStocksRows = Math.floor(arrayStocks.length/9);
    var least = Math.min(arrayStocksRows,numberOfStocks);
    var row;
    var changeClass = "stockchangepos";
    for (i=0;i<least;i++) {
        row = i*9;
        document.getElementById("stockbarname"+(i+1)).innerHTML=arrayStocks[row];
        document.getElementById("stockbarvalue"+(i+1)).innerHTML=arrayStocks[row+1];
        if (showPercentage) {
            percentage = arrayStocks[row+4] / (arrayStocks[row+1] - arrayStocks[row+4]) * 100;
            document.getElementById("stockbarchange"+(i+1)).innerHTML = formatNumber(percentage,2) + '%';
        }
        else {
            document.getElementById("stockbarchange"+(i+1)).innerHTML = formatNumber(arrayStocks[row+4],2);
        }
        changeClass = (parseFloat(arrayStocks[row+4])<0) ? "stockchangeneg" : "stockchangepos";
        document.getElementById("stockbarchange"+(i+1)).setAttribute("class",changeClass);
        document.getElementById("stockbarclick"+(i+1)).setAttribute("title","Last update: " + arrayStocks[(row+2)] + " " + arrayStocks[(row+3)] + " E.T.");
    }
}

function switchChangePercentage() {
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

function checkStock(value) {
    document.getElementById('stockFeedback').innerHTML="";
    var isStock = /^\^?[a-zA-Z]{1,5}(\.[a-zA-Z]{1,4})?$/; // of form ^AEX or AAPL or AABA.AS
	var result = value.match(isStock);
	if (!result) document.getElementById('stockFeedback').innerHTML="Code is of wrong format.";
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
    
    if (window.widget) setTimeout ('widget.performTransition();', 0);
}

function hidePrefs() {
    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) widget.prepareForTransition("ToFront");
    
    back.style.display="none";
    front.style.display="block";
    updateFront();
    getData();
    
    document.getElementById('stockFeedback').innerHTML="";
    
    if (window.widget) setTimeout ('widget.performTransition();', 0); 
}

function openSite(url) {
    widget.openURL(url);
}