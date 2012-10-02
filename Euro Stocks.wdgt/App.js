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
                selectedStock: self.selectedStock().code
            };
        };
        
        self.updateRates = function () {
            // Get a copy of the array using slice(0).
            // Need a copy here, otherwise splice further below will alter
            // the original array, which is not good. Nope.
            var stocks = self.stocks().slice(0),
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
                        if (currentStock.code.toLowerCase() === rate.name.toLowerCase()) {
                            currentStock.value(rate.value);
                            currentStock.previousClose(rate.previousClose);
                            currentStock.updateDate(rate.datetime);
                            stocks.splice(j, 1); // remove the match from the array to speed up subsequent searches
                            break; // break the inner loop, cause a match was already found
                        }
                    }
                }
            });
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
        });
        
        self.switchToRisersFallers = function () {
            self.graphSelected(false);

            var rfParser = new RisersFallersParser();
            rfParser.requestRisersFallers(selectedStock().code);
        };
        
        self.switchToGraph = function () {
            self.graphSelected(true);
        };
        
        self.graphSelected = ko.observable(true);
        
        self.updateChart = function () {
            var chartParser = new ChartParser();
            chartParser.requestChartRates(self.selectedPeriod().id, selectedStock().code);        
        };
        
        // Subscribe to the event when the selected period is updated.
        // Update the chart.
        self.selectedPeriod.subscribe(function () {
            self.updateChart();
        });
    }
    
    function PreferencesViewModel(stocks) {
        if (typeof stocks != "function" || typeof stocks.subscribe != "function") {
            throw new Error("PreferencesViewModel: stocks is not an observable array.");
        }
        
        var self = this;
        
        self.addStock = function (formEl) {
            console.log("adding stock");
            
            var code = self.newStockValue().toUpperCase();
            
            // Check for too short stock symbol, return
            // when too short, don't do anything else.
            if (code.length < 2) {
                return;
            }
            
            // Check whether the code already exists
            var stocks = self.stocks();
            for (var i = 0, len = stocks.length; i < len; i++) {
                if (stocks[i].code === code) {
                    console.log("stock already exists: " + stocks[i].code);
                    return;
                }
            }
            
            self.newStockValue("");

            // Reset the state of the auto-suggestions
            self.suggestions.removeAll();
            self.showSuggestions(false);
            self.selectedSuggestion(false);
            
            self.stocks.push(new Stock(code, code, 0.00, 0.00, new Date()));
            
            return;
        };
        
        // Need this to be able to bind the select list on the
        // back of the widget.
        self.stocks = stocks;
        
        self.allowUpdateCheck = ko.observable(true);
        
        // This will be called using by the autosuggest
        // JSONP callback function.
        function autoSuggestCallback(response) {
            // Empty suggestions array
            self.suggestions.removeAll();
            
            // Check the response for validity
            if (typeof response.ResultSet === "object" && typeof response.ResultSet.Result === "object" && typeof response.ResultSet.Result.length === "number") {
                var results = response.ResultSet.Result;
                for (var i = 0, len = results.length; i < len; i++) {
                    var result = results[i];

                    self.suggestions.push({
                        "name": result.name,
                        "code": result.symbol,
                        "exchange": result.exchDisp,
                        "type": result.typeDisp
                    });
                }
            }
            
            // Show or hide the suggestions based on 
            self.showSuggestions(self.suggestions().length > 0);
        }
        
        // This is a real hack, but the JSONP autosuggest feature
        // on the Yahoo Finance site only allows a callback with
        // the name YAHOO.util.ScriptNodeDateSource.callbacks,
        // otherwise it will return a 404.
        window.YAHOO = {
            util: {
                ScriptNodeDataSource: {
                    callbacks: autoSuggestCallback
                }
            }
        };
        
        var suppressRetrieveSuggestions = false;
        
        function retrieveSuggestions(value) {
            if (suppressRetrieveSuggestions) {
                suppressRetrieveSuggestions = false;
                return;
            }
            
            if (typeof value != "string" || value.length < 2) {
                self.showSuggestions(false);
                self.suggestions.removeAll();
                self.selectedSuggestion(false);
                return;
            }
            
            var url = "http://d.yimg.com/aq/autoc?query=" + encodeURIComponent(value) + "&region=GB&lang=en-GB&callback=YAHOO.util.ScriptNodeDataSource.callbacks";
            
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4)
                {
                    if (xhr.status == 200)
                    {
                        eval(xhr.responseText);
                    }
                }
            };
            xhr.open("GET", url, true);
            xhr.setRequestHeader("Cache-Control", "no-cache");
            xhr.send(null);
        }
        
        self.newStockValue = ko.observable("");
        self.newStockValue.subscribe(retrieveSuggestions);
        
        self.suggestions = ko.observableArray();
        self.showSuggestions = ko.observable(false);
        self.selectedSuggestion = ko.observable(false);
        self.selectedIndex = ko.computed(function () {
            return self.suggestions.indexOf(self.selectedSuggestion());
        });
        
        var keyCode = {
            "ESC": 27,
            "UP": 38,
            "DOWN": 40
        };
        
        var userSuppliedStockValue = "";
        
        self.keydownStockInput = function (data, event) {
            if (!event.altKey && !event.ctrlKey && ! event.shiftKey) {
                var value = self.newStockValue();
                
                if(event.keyCode === keyCode.UP) { // up arrow key
                    suppressRetrieveSuggestions = true;
                    
                    if (typeof value != "string" || value.length < 2) {
                        return;
                    }
                    
                    if (self.suggestions().length <= 0) {
                        return;
                    }
                    
                    self.showSuggestions(true);
                    
                    // Up arrow is moving up the list, smaller index
                    var index = self.selectedIndex(),
                        length = self.suggestions().length;
                    
                    // If selected index is larger than the first item,
                    // select the previous suggestion.
                    if (index > 0) {
                        self.selectedSuggestion(self.suggestions()[--index]);
                        self.newStockValue(self.selectedSuggestion().code);
                    }
                    // If selected index is the first item, select none.
                    else if (index === 0) {
                        self.selectedSuggestion(false);
                        self.newStockValue(userSuppliedStockValue);
                    }
                    // If selected index is smaller than zero,
                    // select the last suggestion.
                    else {
                        userSuppliedStockValue = self.newStockValue();
                        self.selectedSuggestion(self.suggestions()[length - 1]);
                        self.newStockValue(self.selectedSuggestion().code);
                    }
                    
                    return;
                }
                
                else if (event.keyCode === keyCode.DOWN) { // down arrow key
                    suppressRetrieveSuggestions = true;
                    
                    if (typeof value != "string" || value.length < 2) {
                        return;
                    }
                    
                    if (self.suggestions().length <= 0) {
                        return;
                    }
                    
                    self.showSuggestions(true);
                    
                    // Down arrow is moving down the list, larger index
                    var index = self.selectedIndex(),
                        length = self.suggestions().length;
                    
                    // If selected index is smaller than zero,
                    // select the first item
                    if (index < 0) {
                        userSuppliedStockValue = self.newStockValue();
                        self.selectedSuggestion(self.suggestions()[0]);
                        self.newStockValue(self.selectedSuggestion().code);
                    }                    
                    // If selected index is smaller than array length,
                    // select the next suggestion.
                    else if (index < length - 1) {
                        self.selectedSuggestion(self.suggestions()[++index]);
                        self.newStockValue(self.selectedSuggestion().code);
                    }
                    // If selected index is the last item (or larger?), select none.
                    else {
                        self.selectedSuggestion(false);
                        self.newStockValue(userSuppliedStockValue);
                    }
                    
                    return;
                }
                
                else if (event.keyCode === keyCode.ESC) {
                    self.showSuggestions(false);
                    self.selectedSuggestion(false);
                }
                
                // else {
                //     console.log("keyCode: " + event.keyCode);
                // }
            }
            return true;
        };
        
        self.clickSuggestion = function (suggestion) {
            self.selectedSuggestion(suggestion);
            self.stocks.push(new Stock(suggestion.code, suggestion.code, 0, 0, new Date()));
            setTimeout(function () {
                self.showSuggestions(false);
                self.suggestions.removeAll();
                self.selectedSuggestion(false);
                self.newStockValue("");
                document.getElementById("stockNameField").focus();
            }, 300);
        };
        
        var hideTimeout = null;
        
        self.blurStockInput = function () {
            hideTimeout = setTimeout(function () {
                self.showSuggestions(false);
                self.selectedSuggestion(false);
                hideTimeout = null;
            }, 500);
        };
        
        self.focusStockInput = function () {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
        };
        
        self.removeStock = function (stock) {
            // If there is just one stock left, don't allow 
            // removal of the last one.
            if (self.stocks().length < 2) {
                return;
            }
            
            self.stocks.remove(stock);
        };
        
        self.moveUp = function (stock) {
            // If it's the first item, abort.
            var index = self.stocks.indexOf(stock);
            if (index <= 0) {
                return;
            }
            
            // Remove the stock and add it a position before
            // the original position.
            var removedStock = self.stocks.remove(stock);
            self.stocks.splice(index - 1, 0, removedStock[0]);
            
            console.log("move up: " + stock.code);
        };
        
        self.moveDown = function (stock) {
            // If it's the last item, abort.
            var index = self.stocks.indexOf(stock);
            if (index >= self.stocks().length - 1) {
                return;
            }
            
            // Remove the stock and add it a position after
            // the oringal position.
            var removedStock = self.stocks.remove(stock);
            self.stocks.splice(index + 1, 0, removedStock[0]);
            
            console.log("move down: " + stock.code);
        };
    }
    
    // Set up the actual viewmodel instances
    var stocksViewModel = new StocksViewModel();
    var chartViewModel = new ChartViewModel(stocksViewModel.selectedStock);
    var preferencesViewModel = new PreferencesViewModel(stocksViewModel.stocks);
    
    function updateRatesAndChart() {
        stocksViewModel.updateRates();
        chartViewModel.updateChart();
    }
    
    // Subscribe to the event when the selectedStock is updated.
    // Update the rates and update the chart.
    stocksViewModel.selectedStock.subscribe(function (stock) {
        updateRatesAndChart();
    });
    
    function showPrefs(frontEl, backEl) {
        if (window.widget) {
            widget.prepareForTransition("ToBack");
        }

        frontEl.style.display = "none";
        backEl.style.display = "block";

        if (window.widget) {
            setTimeout(function () {
                widget.performTransition();
            }, 0);
        }
    }
    
    function hidePrefs(frontEl, backEl) {
        if (window.widget) {
            widget.prepareForTransition("ToFront");
        }

        backEl.style.display = "none";
        frontEl.style.display = "block";

        if (window.widget) {
            setTimeout(function () {
                widget.performTransition();
            }, 0);
        }

        updateRatesAndChart();
    }
    
    // Call this when the DOM is ready to set up bindings and UI.
    function bootstrapApp() {
        var front = document.getElementById("front");
        var back = document.getElementById("back");
        
        // Apply Knockout bindings, preferably with scope.
        ko.applyBindings(stocksViewModel, document.getElementById("stockbars"));
        ko.applyBindings(chartViewModel, document.getElementById("graphslideout"));
        ko.applyBindings(preferencesViewModel, back);
        
        // Add infoButton to front and Done-button to back.
        new AppleGlassButton(document.getElementById('doneButton'), "Done", function () {
            hidePrefs(front, back);
        });
        new AppleInfoButton(document.getElementById("iButton"), document.getElementById("front"), "black", "black", function () {
            showPrefs(front, back);
        });
    }
    
    // These are limited to the case we're loaded in Mac OS X Dashboard
    // as a widget.
    function bootstrapWidget() {
        if (window.widget) {
            
            var backHeight = 250;
            // Subscribe to the number of stocks to update the window
            // height when it is a widget.
            stocksViewModel.stocks.subscribe(function (stock) {
                var frontHeight = 115 + 31 * stocksViewModel.stocks().length;
                window.resizeTo(216, Math.max(frontHeight, backHeight));
            });
            
            // When the widget is shown, update the rates and chart.
            widget.onshow = function () {
                updateRatesAndChart();
            };
            
        }
    }
    
    // DOMContentLoaded function that removes itself.
    function domContentLoaded() {
        if (document.addEventListener) {
            document.removeEventListener("DOMContentLoaded", domContentLoaded, false);
            ready();
        }
    }
    
    // Ready function for when the dom is loaded, with duplicate
    // execution protection.
    var isReady = false;
    function ready() {
        // If this function has already been called before,
        // return.
        if (isReady) {
            return;
        }
        isReady = true;
        bootstrapApp();
        bootstrapWidget();
        updateRatesAndChart();
    }
    
    // Document ready handling based on jQuery 1.8.2
    if (document.addEventListener) {
        // Use the handy event callback
        document.addEventListener("DOMContentLoaded", domContentLoaded, false);
        
        // A fallback to window.onload, that will always work
        window.addEventListener("load", ready, false);
    }
    
}());