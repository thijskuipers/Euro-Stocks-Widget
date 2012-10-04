// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var RisersFallersParser = function () {
    var self = this,
        graphMessageEl = document.getElementById("graphMessage"),
        graphDivEl = document.getElementById("graphDiv"),
        rfTableDivEl = document.getElementById("rfTableDivEl"),
        rfTableBodyEl = document.getElementById("rfTableBody");
    
    function makeRisersFallersURL(stockCode)
    {
        var stockName = encodeURIComponent(stockCode);
        // The z parameter allows us to download more than 50 index components (stocks) at a time
        // Three columns: 
        //   s = Symbol
        //   l1 = Last Trade (Price Only)
        //   p = Previous Close
        var url = "http://download.finance.yahoo.com/d/quotes.csv?s=@" + stockName + "&f=sl1p&e=.csv&z=1";
        //var url = "http://localhost:8888/eurostocks/quotes.csv";

        return url;
    }

    self.requestRisersFallers = function (stockCode)
    {
        if (typeof stockCode != "string") {
            throw new Error("RisersFallersParser.requestRisersFallers: stockCode is not a string.")
        }
        
        graphMessageEl.innerHTML = "Requesting R/F data";
        graphMessageEl.style.display = "block";

        graphDivEl.style.visibility = "hidden";

        var reqRF = new XMLHttpRequest();
        reqRF.onreadystatechange = function ()
        {
            if (reqRF.readyState == 4)
            {
                if (reqRF.status == 200)
                {
                    parseRF(reqRF.responseText);
                }
                else
                {
                    graphMessageEl.innerHTML = "No R/F data available";
                    rfTableDivEl.style.display = "none";            
                }
            }
        };

        reqRF.open("GET", makeRisersFallersURL(stockCode), true);
        reqRF.setRequestHeader("Cache-Control", "no-cache");
        reqRF.send("");
    }

    function parseRF(responseText)
    {
        var numColumns = 3;
        // Split the response by line ending
        var arrayRF = responseText.split(/\r\n|\n/gi);
        
        // Split each row in the array into columns by comma.
        // Use reverse loop to be able to remove the last item,
        // without screwing up the index.
        for (var i = arrayRF.length - 1; i >= 0; i--) {
            arrayRF[i] = arrayRF[i].replace(/\"/g, "");
            arrayRF[i] = arrayRF[i].split(",");
            
            // If the item does not exist exactly of the expected number
            // of columns, remove the item from the array.
            if (arrayRF[i].length != numColumns) {
                arrayRF.splice(i, 0);
            }
        }

        var k = 0,
            l = 0,
            arrayRFTrueLength = arrayRF.length,
            arrayRisers = [],
            arrayFallers = [],
            rfName,
            rfRate,
            rfChange,
            rfPercentage;
            
        for (var i = 0, j = arrayRF.length; i < j; i++) {
            rfName = arrayRF[i][0];
            rfLastTrade = parseFloat(arrayRF[i][1]);
            rfPreviousClose = parseFloat(arrayRF[i][2]);
            rfChange = rfLastTrade - rfPreviousClose;
            rfPercentage =  rfChange / rfPreviousClose * 100;

            if (!isNaN(rfPercentage)) {
                if (rfChange < 0) {
                    arrayFallers[k] = { name: rfName, percentage: rfPercentage };
                    ++k;
                }
                else {
                    arrayRisers[l] = { name: rfName, percentage: rfPercentage };
                    ++l;
                }
            }
        }

        arrayRisers.sort(function (a, b) {
            // Sort the risers descending.
            return b.percentage - a.percentage; 
        });
        
        arrayFallers.sort(function (a, b) {
            // Sort the fallers ascending.
            return a.percentage - b.percentage;
        });
        
        appendRF(arrayRisers, arrayFallers);
        rfTableDivEl.style.display = "block";
    }

    function appendRF(arrayRisers, arrayFallers)
    {
        // Clear table body
        rfTableBodyEl.innerHTML = "";

        var maxArrayRFLength = Math.max(arrayRisers.length, arrayFallers.length);
        var maxDisplay = Math.min(7, maxArrayRFLength);
        for (var i = 0; i < maxDisplay; i++) {
            var tableRow = document.createElement('tr');
            if (i % 2) {
                tableRow.setAttribute("class","evenRow");
            }
            else {
                tableRow.setAttribute("class","oddRow");
            }
            var riserNameCell = document.createElement('td'),
                riserPercCell = document.createElement('td'),
                fallerNameCell = document.createElement('td'),
                fallerPercCell = document.createElement('td');

            if (i < arrayRisers.length) { // as long as Risers exist
                riserNameCell.innerHTML = (typeof arrayRisers[i].name != "undefined") ? arrayRisers[i].name : "";
                riserPercCell.innerHTML = (typeof arrayRisers[i].percentage != "undefined") ? formatNumber(arrayRisers[i].percentage, 2) + "%" : "";
                if (arrayRisers[i].percentage === 0.0) {
                    riserPercCell.setAttribute("class", "noChange");
                }
                else {
                    riserPercCell.setAttribute("class", "posChange");
                }
            }

            if (i < arrayFallers.length) { // as long as Fallers exist
                fallerNameCell.innerHTML = (typeof arrayFallers[i].name != "undefined") ? arrayFallers[i].name : "";
                fallerPercCell.innerHTML = (typeof arrayFallers[i].percentage != "undefined") ? formatNumber(arrayFallers[i].percentage, 2) + "%" : "";
                if (arrayFallers[i].percentage === 0.0) {
                    fallerPercCell.setAttribute("class","noChange");
                }
                else {
                    fallerPercCell.setAttribute("class", "negChange");
                }
            }

            tableRow.appendChild(riserNameCell);
            tableRow.appendChild(riserPercCell);
            tableRow.appendChild(fallerNameCell);
            tableRow.appendChild(fallerPercCell);

            rfTableBodyEl.appendChild(tableRow);
        }

        graphMessageEl.style.display = "none";
    }    
    
    function formatNumber(number, decimals) {
        return number.toFixed(decimals);
    }
};