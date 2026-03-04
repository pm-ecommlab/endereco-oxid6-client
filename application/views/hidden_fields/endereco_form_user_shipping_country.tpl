<input type="hidden" name="deladr[oxaddress__mojoamsts]" value="[{if isset( $deladr.oxaddress__mojoamsts )}][{$deladr.oxaddress__mojoamsts}][{else}][{$delivadr->oxaddress__mojoamsts->value}][{/if}]">
<input type="hidden" name="deladr[oxaddress__mojoamsstatus]" value="[{if isset( $deladr.oxaddress__mojoamsstatus )}][{$deladr.oxaddress__mojoamsstatus}][{else}][{$delivadr->oxaddress__mojoamsstatus->value}][{/if}]">
<input type="hidden" name="deladr[oxaddress__mojoamspredictions]" value="[{if isset( $deladr.oxaddress__mojoamspredictions )}][{$deladr.oxaddress__mojoamspredictions}][{else}][{$delivadr->oxaddress__mojoamspredictions->value}][{/if}]">

<input type="hidden" name="deladr[oxaddress__mojonamescore]" value="[{if isset( $deladr.oxaddress__mojonamescore )}][{$deladr.oxaddress__mojonamescore}][{else}][{$delivadr->oxaddress__mojonamescore->value}][{/if}]">
[{$smarty.block.parent}]

<script>

    ( function() {

        function afterCreateHandler(EAO) {

            if (!EAO) {
                return;
            }

            if (EAO) {

                EAO.onAfterModalRendered.push(function (EAO) {
                    if (!document.querySelector('[name="deladr[oxaddress__oxzip]"]').offsetParent) {
                        if ('billing_address' === EAO.addressType) {
                            if (document.querySelector('#userChangeAddress')) {
                                document.querySelector('#userChangeAddress').click();
                            }
                        } else if ('shipping_address' === EAO.addressType) {
                            if (document.querySelector('.dd-available-addresses .dd-edit-shipping-address')) {
                                document.querySelector('.dd-available-addresses .dd-edit-shipping-address').click();
                            }
                        }
                    }
                });

            }

            window.EnderecoIntegrator.initPersonServices(
                'deladr[oxaddress__',
                {
                    name: 'shipping',
                }
            );
        }

        enderecoInitAMS(
            {
                countryCode: '[name="deladr[oxaddress__oxcountryid]"]',
                subdivisionCode: '[name="deladr[oxaddress__oxstateid]"]',
                postalCode: '[name="deladr[oxaddress__oxzip]"]',
                locality: '[name="deladr[oxaddress__oxcity]"]',
                streetName: '[name="deladr[oxaddress__oxstreet]"]',
                buildingNumber: '[name="deladr[oxaddress__oxstreetnr]"]',
                additionalInfo: '[name="deladr[oxaddress__oxaddinfo]"]',
                addressStatus: '[name="deladr[oxaddress__mojoamsstatus]"]',
                addressTimestamp: '[name="deladr[oxaddress__mojoamsts]"]',
                addressPredictions: '[name="deladr[oxaddress__mojoamspredictions]"]'
            },
            {
                name: 'shipping',
                addressType: 'shipping_address',
                intent: 'edit',
            },
            afterCreateHandler
        );

    })();

</script>

[{ * Wenn "neue Adresse hinzufügen" gewählt wird, leert das Theme-Widget das Formular inkl. Land.
Wir setzen die Vorauswahl auf das Rechnungsland, sobald das Lieferadress-Formular sichtbar wird. * }]
<script>
    (function() {
        function isVisible(el) {
            if (!el) return false;
            if (el.offsetParent !== null) return true;
            var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
            return !!style && style.display !== 'none' && style.visibility !== 'hidden';
        }

        function queryFirst(selectors) {
            for (var i = 0; i < selectors.length; i++) {
                var el = document.querySelector(selectors[i]);
                if (el) return el;
            }
            return null;
        }

        function getBillingCountryValue(invSelect) {
            if (!invSelect) return '';
            var value = (invSelect.value || '').trim();
            if (value) return value;
            var selected = invSelect.options && invSelect.options[invSelect.selectedIndex];
            return selected ? (selected.value || '').trim() : '';
        }

        function applyDeliveryCountry(delSelect, billingCountry) {
            if (!delSelect || !billingCountry) return false;

            var hasExactOption = !!delSelect.querySelector('option[value="' + billingCountry.replace(/"/g, '\\"') + '"]');
            if (!hasExactOption) {
                return false;
            }

            delSelect.value = billingCountry;

            if (typeof window.jQuery !== 'undefined') {
                var $el = window.jQuery(delSelect);
                if (typeof $el.selectpicker === 'function' && $el.data('selectpicker')) {
                    $el.selectpicker('val', billingCountry);
                    $el.selectpicker('refresh');
                    $el.trigger('changed.bs.select');
                } else {
                    $el.trigger('change');
                }
            } else {
                delSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }

            return true;
        }

        function preselectDeliveryCountryFromBilling() {
            var invSelect = queryFirst([
                '#invCountrySelect',
                'select[name="invadr[oxuser__oxcountryid]"]'
            ]);
            var delSelect = queryFirst([
                '#delCountrySelect',
                'select[name="deladr[oxaddress__oxcountryid]"]'
            ]);
            var form = queryFirst([
                '#shippingAddressForm',
                '[id="shippingAddressForm"]'
            ]);

            if (!invSelect || !delSelect || !form) return;
            if (!isVisible(form)) return;

            var billingCountry = getBillingCountryValue(invSelect);
            if (!billingCountry) return;

            var deliveryCountry = (delSelect.value || '').trim();
            if (deliveryCountry) return;

            applyDeliveryCountry(delSelect, billingCountry);
        }

        function runPreselectWithRetries() {
            [0, 50, 150, 300].forEach(function(delay) {
                setTimeout(preselectDeliveryCountryFromBilling, delay);
            });
        }

        function onShippingAddressChoiceChange(e) {
            var target = e && e.target ? e.target : null;
            if (!target || target.name !== 'oxaddressid') return;
            if (target.value === '-1') {
                runPreselectWithRetries();
            }
        }

        function onPotentialNewAddressClick(e) {
            var target = e && e.target ? e.target : null;
            if (!target) return;

            if (target.closest('.dd-add-delivery-address')) {
                runPreselectWithRetries();
            }
        }

        function startObservers() {
            var form = queryFirst([
                '#shippingAddressForm',
                '[id="shippingAddressForm"]'
            ]);
            if (!form || typeof MutationObserver === 'undefined') {
                return;
            }

            var observer = new MutationObserver(function() {
                runPreselectWithRetries();
            });

            observer.observe(form, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                childList: true,
                subtree: true
            });
        }

        function bindAdditionalTriggers() {
            var showShipAddress = document.querySelector('#showShipAddress');
            if (showShipAddress) {
                showShipAddress.addEventListener('change', runPreselectWithRetries);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                document.addEventListener('change', onShippingAddressChoiceChange, true);
                document.addEventListener('click', onPotentialNewAddressClick, true);
                bindAdditionalTriggers();
                startObservers();
                runPreselectWithRetries();
            });
        } else {
            document.addEventListener('change', onShippingAddressChoiceChange, true);
            document.addEventListener('click', onPotentialNewAddressClick, true);
            bindAdditionalTriggers();
            startObservers();
            runPreselectWithRetries();
        }
    })();
</script>
