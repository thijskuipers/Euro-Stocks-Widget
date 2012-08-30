// Create local scope
(function () {
    var showPercentage = ko.observable(false);
    
    function Stock(code, name, value, previousClose) {
        var self = this;
            
        self.code = code;
        self.name = name;
        self.isIndex = self.name.charAt(0) === "^";

        self.value = ko.observable(parseFloat(value));
        self.previousClose = ko.observable(parseFloat(previousClose));

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
    }
    
    function StocksViewModel() {
        var self = this;
        
        self.stocks = ko.observableArray([
            new Stock("AAPL", "AAPL", 678.22, 673.11),
            new Stock("GOOG", "GOOG", 75.25, 70.35),
            new Stock("^FTSE", "^FTSE", 5678.99, 5832)
        ]);
        
        self.selectedStock = ko.observable(self.stocks()[0]);
        
        self.toggleShowPercentage = function () {
            showPercentage(!showPercentage());
        };
    }
    
    var stocksViewModel = new StocksViewModel();
    
    ko.applyBindings(stocksViewModel);
    // debugger;
    
    setTimeout(function() {
        stocksViewModel.stocks.push(new Stock("TOM2.AS", "TOM2.AS", 3.44, 3.77));
    }, 1000);
    
    // setTimeout(function() {
    //     stocksViewModel.stocks()[0].
    // }, 2000);
    
}());