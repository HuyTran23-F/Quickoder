define([
    'ko',
    'jquery',
    'uiComponent',
    'mage/url',
    'mage/storage',
    'Magento_Customer/js/customer-data'
], function (ko, $, Component, urlBuilder, storage, customerData) {
    'use strict';

    function product(item, symbol) {
        item.getPrice = function () {
            return item.price;
        }
        item.symbol = symbol;

        return item;
    }

    function productList(item, symbol) {
        var self = this;
        self.symbol = symbol;
        self.product = ko.observable(product(item, symbol))

        self.qty = ko.observable(1);
        self.qtyUp = function () {
            self.qty(self.qty() + 1);
        };

        self.qtyDown = function () {
            if (self.qty() > 1) {
                return self.qty(self.qty() - 1);
            }
        };

        self.sku = ko.observable(item.sku);
        self.getId = item.entity_id;
        self.total = ko.computed(function () {
            return self.qty() * self.product().getPrice();
        });
    }

    function viewModel() {
        var self = this;
        self.search = ko.observable();
        self.symbol = ko.observable();
        self.productList = ko.observableArray([]);
        self.isSelected = ko.observable(false);
        self.result_search = ko.observableArray([]);
        self.result_search_has_focus = ko.observable(true);
        self.result_search_focus = ko.observable(true);

        // check result focus or not focus
        self.result_search_has_focus_listener = function () {
            if (self.isSelected()) {
                self.result_search_has_focus();
            } else {
                self.result_search_has_focus(this.result_search_focus());
            }
        }
        //  call Ajax to Controller
        self.evenSearch = function () {
            var self = this;
            var serviceUrl = urlBuilder.build('quickorder/index/search');
            return storage.post(
                serviceUrl,
                JSON.stringify({ 'search': self.search() }),
                false
            ).done(
                function (response) {
                    var product = $.map(response.data, function (item) {
                        item['isCheck'] = ko.observable(self.checkExistsInTable(item));
                        return item;
                    })
                    self.symbol(response.symbol);
                    self.result_search(product);
                }
            ).fail();
        }

        self.checkExistsInTable = function (item) {
            var exist = false;
            var idProducSearch = item.entity_id;
            ko.utils.arrayFilter(self.productList(), function (product) {
                if (product.getId == idProducSearch) {
                    exist = true;
                }
            });
            return exist;
        }

        self.check = function (item) {
            var exist = false;
            var idProducSearch = item.entity_id;
            var productExists = false;
            ko.utils.arrayFilter(self.productList(), function (product) {
                if (product.getId == idProducSearch) {
                    exist = true;
                    productExists = product;
                }
            });

            if (!exist && item.isCheck()) {
                self.productList.push(new productList(item, self.symbol()));
            } else if (exist && !item.isCheck() && productExists) {
                self.productList.remove(productExists);
            }
        }

        self.delete = function (item) {
            self.productList.remove(item);
            // if (item.entity_id == item.getId) {
            //     self.isSelected(false);
            // }
            ko.utils.arrayFilter(self.result_search(), function (product) {
                if (product.entity_id == item.getId) {
                    product.isCheck(false);
                }
            });



        }

        self.countLine = ko.computed(function () {
            return self.productList().length;
        });

        self.countQty = ko.computed(function () {
            var totalQty = 0;
            ko.utils.arrayFilter(self.productList(), function (product) {
                totalQty += product.qty();
            });
            return totalQty;
        });

        self.subTotal = ko.computed(function () {
            var total = 0;
            ko.utils.arrayFilter(self.productList(), function (product) {
                total += product.total();
                // console.log(total);
            });
            return total;
        });



        // Add to cart
        self.addtocart = function () {
            var serviceUrl = urlBuilder.build('quickorder/index/addtocart');
            var data = [];

            ko.utils.arrayFilter(self.productList(), function (product) {
                data.push({
                    'product': product.getId,
                    'qty': product.qty()
                });
            })
            return storage.post(
                serviceUrl,
                JSON.stringify(data),
                false
            ).done(
                function (response, status) {
                    if (status == 'success') {
                        alert('Add to cart success');
                        self.productList([]);
                        self.result_search([]);
                        self.search('');
                        customerData.reload(['cart'], true)
                    }

                }
            ).fail(
                // something code
                function () {
                    alert('Add to cart fail')
                }
            )
        }
    }
    return Component.extend(new viewModel());
});