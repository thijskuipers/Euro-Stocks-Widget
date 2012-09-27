// JavaScript Document
// author: Broes.nl
// this code may freely be used, changed and redistributed
// when you're literally copying and using the code, please refer to the author

var ChartParser = function () {
    var self = this;
    
    // global chart variables
    var horGridPeriod = 1; // 0=year, 1=month, 2=day
    var horGridSkip = 4; // the number of gridlines to skip
    var numberOfColumns = 7; // number of columns in data array

    // global XML request variables

    self.requestChartRates = function (periodId, stockCode)
    {
        document.getElementById("graphMessage").innerHTML = "Requesting Chart";
        document.getElementById("graphMessage").style.display = "block";
        document.getElementById("chartcanvas").style.display = "none";
        document.getElementById('graphDiv').style.visibility = "visible";
        document.getElementById('horGrid').style.display="none";
        document.getElementById('vertGrid').style.display="none";

        document.getElementById('rfTableDiv').style.display = "none";

        if (periodId === 1) {
            drawIntradayChart(stockCode);
        }
        else {
            var reqChart = new XMLHttpRequest();
            reqChart.onreadystatechange = function () {
                if (reqChart.readyState == 4)
                {
                    if (reqChart.status == 200)
                    {
                        parseChartRates(reqChart.responseText);
                    }
                    else
                    {
                        document.getElementById("graphMessage").innerHTML = "Chart not available";
                    }
                }
            };

            reqChart.open("GET", makeChartURL(periodId, stockCode), true);
            reqChart.setRequestHeader("Cache-Control", "no-cache");
            reqChart.send("");
        }
    }

    function drawIntradayChart(stockCode) {
        document.getElementById('horGrid').style.display="none";
        document.getElementById('vertGrid').style.display="none";

        var imageCanvas = document.getElementById('chartcanvas');
        imageCanvas.style.display = "block";
        var context = imageCanvas.getContext("2d");
        context.clearRect(0, 0, imageCanvas.offsetWidth, imageCanvas.offsetHeight);    

        var chartBackground = new Image(206,151);
        chartBackground.src = "images/graph_slideout.png";

        var chartImage = new Image();

        chartImage.onerror = function drawIntradayError() {
            document.getElementById("graphMessage").innerHTML = "Chart not available";
            //document.getElementById('graphDiv').style.visibility = "hidden";
        }

        chartImage.onload = function drawIntradayImage() {

            context.save();
            context.drawImage(chartImage, 0, 0, chartImage.width, chartImage.height, 1, 3, 187, 90); // source: Image, left, top, width, height; destination: left, top, width, height.
            context.restore();

            context.save();
            context.globalCompositeOperation = "darker";
            context.drawImage(chartBackground, 8, 35, 189, 95, 0, 0, 189, 95); // source: Image, left, top, width, height; destination: left, top, width, height.
            context.restore();

            // the graph is ready, stop displaying the message, show the graph and labels
            document.getElementById("graphMessage").style.display = "none";
            document.getElementById('graphDiv').style.visibility = "visible";
        }

        chartImage.src = makeIntradayChartURL(stockCode);
    }

    function makeIntradayChartURL(stockCode) {
        //var debugIntradayChartURL = "http://localhost:8888/YahooIntraDay/t.png?rndm=" + Math.random();
        var stockName = encodeURIComponent(stockCode);
        var intradayChartURL = "http://ichart.yahoo.com/t?s=" + stockName + "&rndm=" + Math.random();
        return intradayChartURL;
    }

    function parseChartRates(responseText)
    {
        // convert line breaks (windows & unix) to commas
        responseText = responseText.replace(/(\r\n)|(\n)/gi,",");
 
        // split to array by commas
        var arrayRates = responseText.split(",");

        // floor -> only entire rows (last elements are line endings)
        var arrayRatesRows = Math.floor(arrayRates.length / numberOfColumns);
        
        // only if response contains enough datapoints
        if (arrayRatesRows > 5) {
            // 0 -> dateColumn, 6 -> closevalueColumn
            drawChart(arrayRates, arrayRatesRows, 0, 6);
        }
        else document.getElementById("graphMessage").innerHTML = "No data received.";
    }

    function drawChart(arrayDateClose, numberOfRows, dateColumn, closeColumn) {
        var canvas = document.getElementById("chartcanvas");
        canvas.style.display = "block";

        // Margins
        var topMargin = 5,
            bottomMargin = 15,
            leftMargin = 5,
            rightMargin = 41;

        var canvasHeight = canvas.offsetHeight - (topMargin + bottomMargin), // real height - vertical margins
            canvasWidth = canvas.offsetWidth - (leftMargin + rightMargin), // real width - horizontal margin
            xStepSize = canvasWidth / (numberOfRows - 2), // minus 1 for first row, minus 1 for "pieces in between is one less"
            yMin = arrayDateClose[closeColumn + numberOfColumns], // +numberOfColumns -> from row 2
            yMax = arrayDateClose[closeColumn + numberOfColumns];

        // Find minimum and maximum y(rate) value
        for (var i = 2; i < numberOfRows; i++) { // from third row (0=first row)
            var j = (i * numberOfColumns) + closeColumn; // select columns
            yMin = Math.min(arrayDateClose[j], yMin); // compare current columns with previous column
            yMax = Math.max(arrayDateClose[j], yMax);
        }
        var yRatio = canvasHeight / (yMax - yMin);

        // start of the canvas
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, (canvasWidth + leftMargin + rightMargin), (canvasHeight + topMargin + bottomMargin)); // canvas leegmaken (met marge)

        // the horizontal grid
        context.save();
        var yGridStep = canvasHeight / 4; // 4 - 1 = number of gridlines
        for (var i = 1; i <= 3; i++) { // 3 = number of gridlines
            context.moveTo(leftMargin, i * yGridStep + topMargin);
            context.lineTo(canvasWidth + leftMargin, i * yGridStep + topMargin);
        }
        context.lineWidth = 1;
        context.strokeStyle = "#ccaaaa";
        context.stroke();
        context.restore();

        // the vertical grid
        context.save();
        var countXGrid = 0;
        var horizontalLabels = [];
        var prevDate = arrayDateClose[(numberOfColumns + dateColumn)].split("-"); // from row 2, split: y-m-d -> y,m,d
        var nextDate = [];
        for (var i = 2; i < numberOfRows; i++) { // from row three (0 = first row)
            var j = (i * 7) + dateColumn;
            nextDate = arrayDateClose[j].split("-"); // split: y-m-d -> y,m,d
            // if the y,m or d changes, it's time for a new gridline, but some are skipped
            if (prevDate[horGridPeriod]!=nextDate[horGridPeriod]) { // compare according to: horGridPeriod = 0,1,2 -> y,m,d
                countXGrid++;
                if (!(countXGrid % horGridSkip)) { // show every "horGridSKip" gridline, starting with the first
                    var xCoord = Math.round(canvasWidth - (i - 1) * xStepSize + leftMargin);
                    context.moveTo(xCoord, topMargin); // 5 = margin
                    context.lineTo(xCoord, canvasHeight+topMargin); // 5 = margin
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
        var monthLabels = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        
        // function to return the last two digits of a four digit year
        function yearLabel(year) {
            return "'" + year.slice(year.length - 2);
        }

        var xGrid = document.getElementById("horGrid");

        // clear the horizontal grid labels
        while (xGrid.hasChildNodes()) {
            xGrid.removeChild(xGrid.lastChild);
        }
        
        // add the horizontal grid labels
        for (var i = 0; i < (horizontalLabels.length / 2); i++) {
            var addXGrid = document.createElement("div");
             // if the horGridPeriod is in months, change the monthnumber to the monthname
            addXGrid.innerHTML = (horGridPeriod != 1) ? (horGridPeriod != 0) ? horizontalLabels[i * 2 + 1] : yearLabel(horizontalLabels[i * 2 + 1]) : monthLabels[parseFloat(horizontalLabels[(i * 2 + 1)])];
            addXGrid.setAttribute("id", "xGrid" + i);
            addXGrid.setAttribute("class", "horGridLabel");
            addXGrid.setAttribute("style", "left:" + horizontalLabels[i * 2] + "px;");
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
        for (var i = 1; i < numberOfRows; i++) { // from row 2 (0 = first row)
            var j = (i * 7) + closeColumn;
            var xCoord = canvasWidth - (i - 1) * xStepSize + leftMargin;
            var yCoord = canvasHeight - (arrayDateClose[j] - yMin) * yRatio + topMargin;
            if (i == 1) context.moveTo(xCoord, yCoord);
            else context.lineTo(xCoord, yCoord);
        }
        context.strokeStyle = "#333333"
        context.stroke();
        context.restore();

        // add the vertical grid labels (they're always in the same place)
        var yGridStepAbs = (yMax - yMin) / 4;
        document.getElementById("vertGridLabel1").innerHTML = formatNumber(yMax, 2);
        document.getElementById("vertGridLabel2").innerHTML = (formatNumber((3 * yGridStepAbs) + yMin, 2).length < 6) ? formatNumber((3 * yGridStepAbs) + yMin, 2) : Math.round((3 * yGridStepAbs) + yMin);
        document.getElementById("vertGridLabel3").innerHTML = (formatNumber((2 * yGridStepAbs) + yMin, 2).length < 6) ? formatNumber((2 * yGridStepAbs) + yMin, 2) : Math.round((2 * yGridStepAbs) + yMin);
        document.getElementById("vertGridLabel4").innerHTML = (formatNumber(yGridStepAbs + yMin, 2).length < 6) ? formatNumber(yGridStepAbs + yMin, 2) : Math.round(yGridStepAbs + yMin);
        document.getElementById("vertGridLabel5").innerHTML = formatNumber(yMin, 2);

        // the graph is ready, stop displaying the message, show the graph and labels
        document.getElementById("graphMessage").style.display = "none";
        document.getElementById('horGrid').style.display = "block";
        document.getElementById('vertGrid').style.display = "block";
        document.getElementById('graphDiv').style.visibility = "visible";
    }

    function makeChartURL(chartPeriodInt, stockCode) {
        // http://ichart.yahoo.com/table.csv? s=%5EAEX &d=3 &e=10 &f=2007 &g=d &a=9 &b=12 &c=1992 &ignore=.csv
        var timeDif = 0;
        var resolution; // daily, weekly, monthly
        var day = 1000 * 60 * 60 * 24; // number of milliseconds in one day
        switch (chartPeriodInt) {
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
        fromDay.setTime(today - timeDif);
        var todaysYear = today.getFullYear();
        var todaysMonth = today.getMonth();
        var todaysDay = today.getDate();
        var fromDaysYear = fromDay.getFullYear();
        var fromDaysMonth = fromDay.getMonth();
        var fromDaysDay = fromDay.getDate();
        var stockName = encodeURIComponent(stockCode);
        //var debugChartURL = "http://localhost:8888/New Euro Stocks/table6.csv";
        var chartURL = "http://ichart.yahoo.com/table.csv?s=" + stockName + "&d=" + todaysMonth + "&e=" + todaysDay + "&f=" + todaysYear + "&g=" + resolution + "&a=" + fromDaysMonth + "&b=" + fromDaysDay + "&c=" + fromDaysYear + "&ignore=.csv";
        return chartURL;
        //return debugChartURL;
    }    

    function formatNumber(number, decimals) {
        return number.toFixed(2);
    }
};
