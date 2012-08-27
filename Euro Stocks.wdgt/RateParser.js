// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var debugStocksURL ="http://localhost:8888/New Euro Stocks/quotes2.csv"; // debug

// global request variables
var reqStocks;


function makeStockRateURL() {
    var stringStockNames = Stocks.toString(",");
    var urlStockNames = encodeURIComponent(stringStockNames);
    var stocksURL = "http://download.finance.yahoo.com/d/quotes.csv?s=" + urlStockNames + "&f=sl1d1t1c1ohgv&e=.csv";

    return stocksURL;
    //return debugStocksURL;
}

function requestStockRates()
{
    reqStocks = new XMLHttpRequest();
    reqStocks.onreadystatechange = receiveStockRates;
    reqStocks.open("GET", makeStockRateURL(), true);
    reqStocks.setRequestHeader("Cache-Control", "no-cache");
    reqStocks.send("");
}

function receiveStockRates()
{
    if (reqStocks.readyState == 4)
    {
        if (reqStocks.status == 200)
        {
            parseStockRates(reqStocks.responseText);
            if (debugEnabled) {
                // console.log(reqStocks.responseText);
            }
        }
        else
        {
            if (debugEnabled) {
                console.log("Error in Stockrates request");
            }
        }
    }
}

function parseStockRates(responseStocks) {
    var dataRows = responseStocks.split(/\r\n|\n/gi); // split response text by line endings into array
    console.log("rows: " + dataRows.length);
    
    for (var i = 0, len = dataRows.length; i < len; i++) {
        dataRows[i] = dataRows[i].split(","); // split each line by comma into array
        
        for (var j = 0, jLen = dataRows[i].length; j < jLen; j++) {
            dataRows[i][j] = dataRows[i][j].replace(/\"/gi,""); // remove quotes for each line in field
        }
        
        console.log("row[" + i + "].length: " + dataRows[i].length);
    }
    
    // Remove empty entries from the array.
    // An entry is empty when it contains less than two values.
    // Using a reverse for-loop, we can remove each empty entry without changing the index
    for (var i = dataRows.length - 1; i >= 0; i--){
        if(dataRows[i].length < 2) {
            dataRows.splice(i, 1); // remove the entry
        }
    }
    
    console.log("dataRows.length after pruning: " + dataRows.length);

    var least = Math.min(dataRows.length, numberOfStocks);
    console.log("least: " + least);
    
    var changeClass = "stockchangepos";
    
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
        console.log(row[0] + ": " + row[1]);
        document.getElementById("stockbarname" + (i + 1)).innerHTML = row[0];
        document.getElementById("stockbarvalue" + (i + 1)).innerHTML = row[1];
        if (showPercentage) {
            percentage = row[4] / (row[1] - row[4]) * 100;
            document.getElementById("stockbarchange"+(i + 1)).innerHTML = formatNumber(percentage, 2) + '%';
        }
        else {
            document.getElementById("stockbarchange"+(i + 1)).innerHTML = formatNumber(row[4], 2);
        }
        changeClass = (parseFloat(row[4]) < 0) ? "stockchangeneg" : "stockchangepos";
        document.getElementById("stockbarchange" + ( i + 1)).setAttribute("class", changeClass);
        document.getElementById("stockbarclick" + (i + 1)).setAttribute("title", "Last update: " + row[2] + " " + row[3] + " GMT");
    }
}