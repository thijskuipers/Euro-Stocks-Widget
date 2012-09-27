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
    
    function ChartViewModel(selectedStock) {
        if (typeof selectedStock != "function" || typeof selectedStock.subscribe != "function") {
            throw new Error("ChartViewModel: selectedStock is not an observable.");
        }
        
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
        
        self.isIndex = ko.computed(function () {
            return selectedStock().isIndex;
        })
    }
    
    function PreferencesViewModel(stocks) {
        if (typeof stocks != "function" || typeof stocks.subscribe != "function") {
            throw new Error("PreferencesViewModel: stocks is not an observable array.");
        }
        
        var self = this;
        
        self.addStock = function (formEl) {
            console.log("adding stock");
            
            var code = formEl["stockNameField"].value.toUpperCase();
            formEl.reset();
            
            stocks.push(new Stock(code, code, 0.00, 0.00, new Date()));
            
            // return false to prevent form from submitting
            return false;
        };
        
        self.stocks = stocks;
    }
    
    var stocksViewModel = new StocksViewModel();
    // console.log(JSON.stringify(stocksViewModel));
    
    var chartViewModel = new ChartViewModel(stocksViewModel.selectedStock);
    
    var preferencesViewModel = new PreferencesViewModel(stocksViewModel.stocks);
    
    function updateRates() {
        // Get a copy of the array using slice(0).
        // Need a copy here, otherwise splice further below will alter
        // the original array, which is not good. Nope.
        var stocks = stocksViewModel.stocks().slice(0),
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
                // console.log("Name, Value: " + rate.name + "; " + rate.value + "; " + rate.datetime);
            }
        });
    }
    
    function updateChart(stock) {
        var chartParser = new ChartParser();
        chartParser.requestChartRates(chartViewModel.selectedPeriod().id, stock.code);        
    }
    
    function updateRatesAndChart() {
        updateRates();
        updateChart(stocksViewModel.selectedStock());
    }
    
    // Subscribe to the event when the selectedStock is updated.
    // Update the rates and update the chart.
    stocksViewModel.selectedStock.subscribe(function (stock) {
        updateRatesAndChart();
    });
    
    // Subscribe to the event when the selected period is updated.
    // Update the chart.
    chartViewModel.selectedPeriod.subscribe(function (period) {
        updateChart(stocksViewModel.selectedStock());
    });
    
    var backHeight = 250;
    // Subscribe to the number of stocks to update the window
    // height when it is a widget
    stocksViewModel.stocks.subscribe(function (stock) {
        var frontHeight = 115 + 31 * stocksViewModel.stocks().length;
        if (window.widget) {
            window.height = window.resizeTo(216, Math.min(frontHeight, backHeight));
        }
        console.log("New widget height: " + frontHeight);
    });
    
    
    // Apply Knockout bindings, preferably with scope.
    ko.applyBindings(stocksViewModel, document.getElementById('stockbars'));
    ko.applyBindings(chartViewModel, document.getElementById('graphslideout'));
    ko.applyBindings(preferencesViewModel, document.getElementById('back'));
    
    setTimeout(function() {
        stocksViewModel.stocks.push(new Stock("TOM2.AS", "TOM2.AS", 3.44, 3.77, new Date()));
    }, 500);
    
    setTimeout(updateRatesAndChart, 1000);

}());