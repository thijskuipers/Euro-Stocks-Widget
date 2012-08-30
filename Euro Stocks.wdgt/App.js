// Create local scope
(function () {
    // feature checks
    var hasDateLocaleString = typeof Date.toLocaleString === "function";
    
    // application-wide fields (state)
    var showPercentage = ko.observable(false);
    
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
                selectedStock: self.selectedStock().name
            };
        };
    }
    
    var stocksViewModel = new StocksViewModel();
    console.log(JSON.stringify(stocksViewModel));
    
    ko.applyBindings(stocksViewModel, document.getElementById('stockbars'));
    // debugger;
    
    setTimeout(function() {
        stocksViewModel.stocks.push(new Stock("TOM2.AS", "TOM2.AS", 3.44, 3.77, new Date()));
    }, 1000);
    
    // setTimeout(function() {
    //     stocksViewModel.stocks()[0].
    // }, 2000);
    
}());