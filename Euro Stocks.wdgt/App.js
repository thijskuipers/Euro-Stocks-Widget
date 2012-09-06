// Create local scope
(function () {
    // feature checks
    var hasDateLocaleString = typeof Date.toLocaleString === "function";
    
    // application-wide fields (state)
    var showPercentage = ko.observable(false);
    var refreshing = false;
    
    function Stock(code, name, value, previousClose, updateDate) {
        var self = this;
            
        self.code = code;
        self.name = name;
        self.isIndex = self.name.charAt(0) === "^";

        self.value = ko.observable(parseFloat(value));
        self.previousClose = ko.observable(parseFloat(previousClose));
        self.updateDate = ko.observable(updateDate);

        self.change = ko.computed(function () { // formatted
            if(showPercentage()) {
                return ((self.value() - self.previousClose()) / self.previousClose() * 100).toFixed(2) + "%";
            }
            else {
                return (self.value() - self.previousClose()).toFixed(2).toString();
            }
        });

        self.isNegativeChange = ko.computed(function () {
            return self.value() < self.previousClose();
        });
        
        self.lastUpdate = ko.computed(function () {
            return hasDateLocaleString ? self.updateDate().toLocaleString() : self.updateDate().toString();
        });
        
        self.toJSON = function () {
            return {
                code: self.code,
                name: self.name,
                value: self.value(),
                previousClose: self.previousClose()
            };
        };
    }
    
    function StocksViewModel() {
        var self = this,
            now = new Date();
        
        self.stocks = ko.observableArray([
            new Stock("AAPL", "AAPL", 678.22, 673.11, now),
            new Stock("GOOG", "GOOG", 75.25, 70.35, now),
            new Stock("^FTSE", "^FTSE", 5678.99, 5832, now)
        ]);
        
        self.selectedStock = ko.observable(self.stocks()[0]);
        
        self.toggleShowPercentage = function () {
            showPercentage(!showPercentage());
        };
        
        self.toJSON = function () {
            return {
                stocks: self.stocks(),
                selectedStock: self.selectedStock().code
            };
        };
    }
    
    function ChartViewModel() {
        var self = this;
        
        self.periods = [
            { id: 1, label: "1d" },
            { id: 2, label: "1m" },
            { id: 3, label: "3m" },
            { id: 4, label: "6m" },
            { id: 5, label: "1y" },
            { id: 6, label: "2y" },
            { id: 7, label: "5y" }
        ];
        
        self.selectedPeriod = ko.observable(self.periods[1]);
    }
    
    var stocksViewModel = new StocksViewModel();
    // console.log(JSON.stringify(stocksViewModel));
    
    var chartViewModel = new ChartViewModel();
    
    function updateStocks() {
        var stocks = stocksViewModel.stocks(),
            stockCodes = [];

        for (var i = 0, len = stocks.length; i < len; i++) {
            stockCodes.push(stocks[i].code);
        }

        var rateParser = new RateParser();
        rateParser.requestStockRates(stockCodes, function (values) {
            for (var i = 0, len = values.length; i < len; i++) {
                var rate = values[i];
                for (var j = 0, jLen = stocks.length; j < jLen; j++) {
                    var currentStock = stocks[j];
                    if(currentStock.code.toLowerCase() === rate.name.toLowerCase()) {
                        currentStock.value(rate.value);
                        currentStock.previousClose(rate.previousClose);
                        currentStock.updateDate(rate.datetime);
                        stocks.splice(j, 1); // remove the match from the array to speed up subsequent searches
                        break; // break the inner loop, cause a match was already found
                    }
                }
                console.log("Name, Value: " + rate.name + "; " + rate.value + "; " + rate.datetime);
            }
        });
    }
    
    function updateChart(stock) {
        var chartParser = new ChartParser();
        chartParser.requestChartRates(chartViewModel.selectedPeriod().id, stock.code);        
    }
    
    stocksViewModel.selectedStock.subscribe(function (stock) {
        updateStocks();
        updateChart(stock);
    });

    ko.applyBindings(stocksViewModel, document.getElementById('stockbars'));
    ko.applyBindings(chartViewModel, document.getElementById('graphslideout'));
    
    setTimeout(function() {
        stocksViewModel.stocks.push(new Stock("TOM2.AS", "TOM2.AS", 3.44, 3.77, new Date()));
    }, 1000);
    
    setTimeout(updateStocks, 3000);
    
    // setTimeout(function() {
    //     stocksViewModel.stocks()[0].
    // }, 2000);
    
}());