// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var debugStocksURL ="http://localhost:8888/New Euro Stocks/quotes2.csv"; // debug

// global request variables
var stocksURL; // the url for the stock rate data
var reqStocks;


function makeStockRateURL() {
    var stringStockNames = Stocks.toString(",");
    var urlStockNames = encodeURIComponent(stringStockNames);
    stocksURL = "http://uk.old.finance.yahoo.com/d/quotes.csv?s=" + urlStockNames + "&f=sl1d1t1c1ohgv&e=.csv";
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
        }
        else
        {
            //debug1.innerHTML = "Error in Stockrates request";
        }
    }
}

function parseStockRates(responseStocks) {
    responseStocks = responseStocks.replace(/\r\n|\n/gi,","); // replace line breaks by comma's
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
        // remove the (extra) third column when it's "N/A"
        if (arrayStocks[row+2].match(/^N\/A$/)) {
            arrayStocks.splice((row+2),1);
        }
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
        document.getElementById("stockbarclick"+(i+1)).setAttribute("title","Last update: " + arrayStocks[(row+2)] + " " + arrayStocks[(row+3)] + " GMT");
    }
}