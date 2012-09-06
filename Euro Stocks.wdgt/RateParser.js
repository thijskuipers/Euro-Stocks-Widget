// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var RateParser = function () {
    var self = this;
    var debugEnabled = true;
        
    var debugStocksURL = "http://localhost:8888/New Euro Stocks/quotes2.csv"; // debug

    function makeStockRateURL(arrayStockNames) {
        var stringStockNames = arrayStockNames.toString(","),
            urlStockNames = encodeURIComponent(stringStockNames),
            stocksURL = "http://download.finance.yahoo.com/d/quotes.csv?s=" + urlStockNames + "&f=sl1d1t1p&e=.csv";

        return stocksURL;
        //return debugStocksURL;
    }

    self.requestStockRates = function (arrayStockNames, callback) {
        if (typeof arrayStockNames != "object" || typeof arrayStockNames.length != "number") {
            throw new Error("RateParser.requestStockRates: argument arrayStockNames not an Array");
        }
        
        if (typeof callback != "function") {
            throw new Error("RateParser.requestStockRates: argument callback not a Function");
        }
        
        var reqStocks = new XMLHttpRequest();
        reqStocks.onreadystatechange = function () {
            if (reqStocks.readyState == 4)
            {
                if (reqStocks.status == 200)
                {
                    if (debugEnabled) {
                        console.log(reqStocks.responseText);
                    }
                    parseStockRates(reqStocks.responseText, callback);
                }
                else
                {
                    if (debugEnabled) {
                        console.log("Error in Stockrates request");
                    }
                }
            }
        };
        reqStocks.open("GET", makeStockRateURL(arrayStockNames), true);
        reqStocks.setRequestHeader("Cache-Control", "no-cache");
        reqStocks.send("");

        if (debugEnabled) {
            console.log("Retrieving stock rates asynchronously");
        }
    }
    
    function parseDate(date, time) {
        if (typeof date != "string") {
            throw new Error("RateParser.parseDate: argument date not a string");
        }
        if (typeof time != "string") {
            throw new Error("RateParser.parseDate: argument time not a string");
        }
        
        var dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/i;
        var timeRegex = /^(\d{1,2})\:(\d{2})([ap]m)$/i;
        
        var dateResult = dateRegex.exec(date);
        var timeResult = timeRegex.exec(time);
        
        var day = parseInt(dateResult[2]),
            month = parseInt(dateResult[1]),
            year = parseInt(dateResult[3]),
            hour = parseInt(timeResult[1]),
            minute = parseInt(timeResult[2]),
            amPm = timeResult[3];
        
        month -= 1; // convert 1-based month to zero-based
        hour += 4; // convert EDT time to UTC
        
        if (amPm.toLowerCase() === "pm") {
            hour += 12; // convert to 24h representation
        }
        
        var returnDate = new Date(Date.UTC(year, month, day, hour, minute, 0));
        
        return returnDate;
    }

    function parseStockRates(responseStocks, callback) {
        var dataRows = responseStocks.split(/\r\n|\n/gi); // split response text by line endings into array

        if (debugEnabled) {
            console.log("rows: " + dataRows.length);        
        }

        for (var i = 0, len = dataRows.length; i < len; i++) {
            dataRows[i] = dataRows[i].split(","); // split each line by comma into array

            for (var j = 0, jLen = dataRows[i].length; j < jLen; j++) {
                dataRows[i][j] = dataRows[i][j].replace(/\"/gi,""); // remove quotes for each line in field
            }

            if (debugEnabled) {
                console.log("row[" + i + "].length: " + dataRows[i].length);
            }
        }

        // Remove empty entries from the array.
        // An entry is empty when it contains less than two values.
        // Using a reverse for-loop, we can remove each empty entry without changing the index
        for (var i = dataRows.length - 1; i >= 0; i--){
            if(dataRows[i].length < 2) {
                dataRows.splice(i, 1); // remove the entry
            }
        }

        if (debugEnabled) {
            console.log("dataRows.length after pruning: " + dataRows.length);
        }

        var rates = [];
        
        for (var i = 0, len = dataRows.length; i < len; i++) {
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
            rates.push({
                name: row[0],
                value: parseFloat(row[1]),
                datetime: parseDate(row[2], row[3]),
                previousClose: parseFloat(row[4])
            });
        }
        
        callback(rates);
    }    

}