// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

function makeRisersFallersURL()
{
    var stockName = encodeURIComponent(Stocks[selectedStock]);
    // The z parameter allows us to download more than 50 index components (stocks) at a time
    var url = "http://download.finance.yahoo.com/d/quotes.csv?s=@" + stockName + "&f=sl1d1t1c1ohgv&e=.csv&z=1";
    //var url = "http://localhost:8888/eurostocks/quotes.csv";
    
    return url;
}

function requestRF()
{
    document.getElementById("graphMessage").innerHTML = "Requesting R/F data";
    document.getElementById("graphMessage").style.display = "block";
    
    document.getElementById('graphDiv').style.visibility = "hidden";
    document.getElementById('switchRFSelect').style.opacity = "1.0";
    document.getElementById('switchRFSelect').removeAttribute("onclick");
    document.getElementById('switchGraphSelect').style.opacity = "0.0";
    document.getElementById('switchGraphSelect').setAttribute("onclick","switchShowRF()");
    
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
                document.getElementById("graphMessage").innerHTML = "No R/F data available";
                document.getElementById('rfTableDiv').style.visibility = "hidden";            
            }
        }
    };
    
    reqRF.open("GET", makeRisersFallersURL(), true);
    reqRF.setRequestHeader("Cache-Control", "no-cache");
    reqRF.send("");
}

function parseRF(responseText)
{
    var numColumns = 9;
    responseText = responseText.replace(/\r\n|\n/gi,",");
    var arrayRF = responseText.split(",");
    for (var x in arrayRF) {
        arrayRF[x] = arrayRF[x].replace(/\"/gi,"");
    }
    var k = 0;
    var l = 0;
    var arrayRFTrueLength = Math.floor(arrayRF.length/numColumns);
    var arrayRisers = [];
    var arrayFallers = [];
    var RFName;
    var RFRate;
    var RFChange;
    var RFPercentage;
    var j = 0;

    for (var i = 0; i < arrayRFTrueLength; i++) {
        j = numColumns * i;
        
        RFName = arrayRF[j];
        RFRate = parseFloat(arrayRF[(j + 1)]);
        RFChange = parseFloat(arrayRF[(j + 4)]);
        RFPercentage = RFChange / (RFRate - RFChange) * 100;
        
        if (!isNaN(RFPercentage)) {
            if (RFChange < 0) {
                arrayFallers[k] = [RFName, RFPercentage];
                k++;
            }
            else {
                arrayRisers[l] = [RFName, RFPercentage];
                l++;
            }
        }
    }
    
    var arrayRisersSorted = sortMultiArrayNew(arrayRisers, false);
    var arrayFallersSorted = sortMultiArrayNew(arrayFallers, true);
    appendRF(arrayRisersSorted, arrayFallersSorted);
    document.getElementById('rfTableDiv').style.visibility = "visible";
}

// much quicker sorting function than sortMultiArray
function sortMultiArrayNew(multiArray, ascending){
    var sortedArray = [];
    for (var i = 0; i < 7; i++) {
        sortedArray[i] = ['broes', 0.00];
    }
    for (var x in multiArray) {
        for (var y in sortedArray) {
            if (ascending && sortedArray[y][1] > multiArray[x][1] || !ascending && sortedArray[y][1] < multiArray[x][1]) {
                sortedArray.pop();
                sortedArray.splice(y, 0, multiArray[x]);
                break;
            }
        }
    }
    for (var i = sortedArray.length - 1; i >= 0; i--) {
        if (sortedArray[i][0] == 'broes') {
            sortedArray.splice(i, 1);
        }
    }
    return sortedArray;
}

function appendRF(arrayRisers,arrayFallers)
{
    var output = document.getElementById("rfTableBody");
        
    while (output.hasChildNodes()) {
        output.removeChild(output.lastChild);
    }
    
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
        var riserNameCell = document.createElement('td');
        var riserPercCell = document.createElement('td');
        var fallerNameCell = document.createElement('td');
        var fallerPercCell = document.createElement('td');
        
        if (i < arrayRisers.length) { // as long as Risers exist
            riserNameCell.innerHTML = (arrayRisers[i][0] != undefined) ? arrayRisers[i][0] : "";
            riserPercCell.innerHTML = (arrayRisers[i][1] != undefined) ? formatNumber(arrayRisers[i][1], 2) + "%" : "";
            if (arrayRisers[i][2] == 0.0) {
                riserPercCell.setAttribute("class", "noChange");
            }
            else {
                riserPercCell.setAttribute("class", "posChange");
            }
        }
        
        if (i < arrayFallers.length) { // as long as Fallers exist
            fallerNameCell.innerHTML = (arrayFallers[i][0] != undefined) ? arrayFallers[i][0] : "";
            fallerPercCell.innerHTML = (arrayFallers[i][1] != undefined) ? formatNumber(arrayFallers[i][1],2) + "%" : "";
            if (arrayFallers[i][2] == 0.0) {
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
        
        output.appendChild(tableRow);
    }
    
    document.getElementById("graphMessage").style.display = "none";
}