import Promise from 'promise-polyfill';
import merge from 'lodash.merge';
import EnderecoIntegrator from './node_modules/@endereco/js-sdk/modules/integrator';
import css from './endereco.scss';
import 'polyfill-array-includes';

if ('NodeList' in window && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

if (!window.Promise) {
    window.Promise = Promise;
}

EnderecoIntegrator.postfix = {
    ams: {
        countryCode: 'oxcountryid]',
        postalCode: 'oxzip]',
        subdivisionCode: 'oxstateid]',
        locality: 'oxcity]',
        streetFull: '',
        streetName: 'oxstreet]',
        buildingNumber: 'oxstreetnr]',
        addressStatus: 'mojoamsstatus]',
        addressTimestamp: 'mojoamsts]',
        addressPredictions: 'mojoamspredictions]',
        additionalInfo: 'oxaddinfo]',
    },
    personServices: {
        salutation: 'oxsal]',
        firstName: 'oxfname]',
        lastName: 'oxlname]',
        nameScore: 'mojonamescore]'
    },
    emailServices: {
        email: '#userLoginName'
    }
};

EnderecoIntegrator.css = css[0][1];
EnderecoIntegrator.resolvers.countryCodeWrite = function (value, subscriber) {
    return new Promise(function (resolve, reject) {
        resolve(window.EnderecoIntegrator.countryMapping[value.toUpperCase()]);
    });
}
EnderecoIntegrator.resolvers.countryCodeRead = function (value, subscriber) {
    return new Promise(function (resolve, reject) {
        resolve(window.EnderecoIntegrator.countryMappingReverse[value]);
    });
}

EnderecoIntegrator.resolvers.subdivisionCodeWrite = function (value, subscriber) {
    return new Promise(resolve => {
        if (!value) {
            resolve('');
            return;
        }

        const mapping = window.EnderecoIntegrator?.subdivisionMapping || {};
        const key = mapping[value];
        resolve(key !== undefined ? key : '');
    });
}

EnderecoIntegrator.resolvers.subdivisionCodeRead = function (value, subscriber) {
    return new Promise(function (resolve) {
        const countryCode = subscriber._subject.countryCode?.toUpperCase() || '';
        if (!countryCode || !value) {
            resolve('');
            return;
        }

        const mapping = window.EnderecoIntegrator?.subdivisionMappingReverse || {};
        const submapping = mapping[countryCode] || {};
        const key = submapping[value];
        resolve(key !== undefined ? key : '');
    });
}

EnderecoIntegrator.resolvers.countryCodeSetValue = function (subscriber, value) {
    if (!subscriber || !subscriber.object) {
        return;
    }

    var element = subscriber.object;

    var hasJQuery = typeof window.jQuery !== "undefined";
    var hasSelectPicker = false;

    if (hasJQuery) {
        var $el = window.jQuery(element);
        hasSelectPicker = typeof $el.selectpicker === "function" && $el.data('selectpicker');
    }

    // Wert setzen
    if (hasJQuery && hasSelectPicker) {
        // Bootstrap-select korrekt aktualisieren
        window.jQuery(element).selectpicker('val', value);
    } else {
        // Standard-Setzen
        element.value = value;

        // Wenn jQuery vorhanden → zusätzlich jQuery-Change triggern
        if (hasJQuery) {
            window.jQuery(element).trigger('change');
            return;
        }
    }

    // Native Change Event (Fallback / Ergänzung)
    var event;
    if (typeof Event === 'function') {
        event = new Event('change', { bubbles: true });
    } else {
        event = document.createEvent('Event');
        event.initEvent('change', true, true);
    }

    element.dispatchEvent(event);
};

EnderecoIntegrator.resolvers.subdivisionCodeSetValue = function (subscriber, value) {
    if (!subscriber || !subscriber.object) {
        return;
    }

    var element = subscriber.object;

    element.value = value;

    // Trigger native change event
    var event;
    if (typeof Event === 'function') {
        event = new Event('change', { bubbles: true });
    } else {
        event = document.createEvent('Event');
        event.initEvent('change', true, true);
    }
    element.dispatchEvent(event);
}

EnderecoIntegrator.resolvers.salutationWrite = function (value, subscriber) {
    var mapping = {
        'f': 'MRS',
        'm': 'MR'
    };
    return new Promise(function (resolve, reject) {
        resolve(mapping[value]);
    });
}
EnderecoIntegrator.resolvers.salutationRead = function (value, subscriber) {
    var mapping = {
        'MRS': 'f',
        'MR': 'm'
    };
    return new Promise(function (resolve, reject) {
        resolve(mapping[value]);
    });
}

EnderecoIntegrator.resolvers.salutationSetValue = function (subscriber, value) {
    if (!subscriber || !subscriber.object) {
        return;
    }

    var element = subscriber.object;

    element.value = value;

    // Trigger native change event (if listeners depend on it)
    var event;
    if (typeof Event === 'function') {
        event = new Event('change', { bubbles: true });
    } else {
        event = document.createEvent('Event');
        event.initEvent('change', true, true);
    }
    element.dispatchEvent(event);
}

EnderecoIntegrator.afterAMSActivation.push( function(EAO) {
    if (!!document.querySelector('[type="checkbox"][name="blshowshipaddress"]')) {
        if (document.querySelector('[type="checkbox"][name="blshowshipaddress"]').checked) {
            if ('shipping_address' === EAO.addressType) {
                EAO.active = false;
            }
        }
        document.querySelector('[type="checkbox"][name="blshowshipaddress"]').addEventListener('change', function(e) {
            if ('shipping_address' === EAO.addressType) {
                EAO.active = !document.querySelector('[type="checkbox"][name="blshowshipaddress"]').checked;
            }
        });
    }

    // PLZ ohne Land: Hinweis anzeigen statt Endereco-Request (komplett in endereco.js)
    var originalSetPostalCode = EAO.setPostalCode;
    if (typeof originalSetPostalCode !== 'function') {
        return;
    }

    EAO.setPostalCode = function (postalCode) {
        var self = this;

        var rawPostal = postalCode;

        // Handle cases where an object is passed instead of a string
        // (SDK may pass a Promise/deferred-like object; OXID may pass events)
        if (rawPostal && typeof rawPostal === 'object') {
            // DOM event (e.g. input/change)
            if (rawPostal.target && typeof rawPostal.target.value !== 'undefined') {
                rawPostal = rawPostal.target.value;

                // Promise/deferred polyfill object (seen as `{ _value: "80", ... }`)
            } else if (typeof rawPostal._value !== 'undefined') {
                rawPostal = rawPostal._value;

                // Common object shapes
            } else if (typeof rawPostal.value !== 'undefined') {
                rawPostal = rawPostal.value;
            } else if (typeof rawPostal.postalCode !== 'undefined') {
                rawPostal = rawPostal.postalCode;
            }
        }

        var value = rawPostal == null ? '' : String(rawPostal).trim();
        var hasPostalInput = value !== '';

        // read country from model (SDK state)
        var countryFromModel = (self.countryCode || self._countryCode || '').toString().trim();

        // read country from DOM select
        var countryFromDom = '';
        if (self._subscribers && self._subscribers.countryCode && self._subscribers.countryCode[0]) {
            var el = self._subscribers.countryCode[0].object;
            if (el) {
                countryFromDom = (el.value || '').toString().trim();
            }
        }

        // convert OXID country id -> ISO code using mapping
        var mappedCountry = '';
        if (
            countryFromDom &&
            window.EnderecoIntegrator &&
            window.EnderecoIntegrator.countryMappingReverse
        ) {
            mappedCountry = window.EnderecoIntegrator.countryMappingReverse[countryFromDom] || '';
        }

        var effectiveCountryCode = mappedCountry || countryFromModel || '';

        // If user typed postal code but country is missing -> show warning
        if (hasPostalInput && !mappedCountry) {

            if (typeof window.EnderecoIntegrator.onCountryRequiredForPostalCode === 'function') {
                window.EnderecoIntegrator.onCountryRequiredForPostalCode(self);
            }

            self._postalCode = value;

            if (self._subscribers && self._subscribers.postalCode) {
                self._subscribers.postalCode.forEach(function (sub) {
                    sub.updateDOMValue(value);
                });
            }

            return Promise.resolve();
        }

        // Ensure SDK always has ISO country before calling Endereco
        if (effectiveCountryCode) {
            self.countryCode = effectiveCountryCode;
            self._countryCode = effectiveCountryCode;
        }

        // Keep SDK call signature for predictions, but ensure our own DOM logic uses normalized value
        return originalSetPostalCode.apply(self, arguments);
    };
});

/**
 * @param {string} fieldName
 * @param {HTMLElement|null} domElement
 * @param {{ countryCode?: string }} dataObject
 * @returns {boolean}
 */
EnderecoIntegrator.hasActiveSubscriber = function (fieldName, domElement, dataObject) {

    if (
        fieldName === 'subdivisionCode' &&
        domElement instanceof HTMLSelectElement
    ) {
        var countryCode = dataObject && dataObject.countryCode;

        /** @type {Record<string, string>} */
        var correctMapping =
            countryCode
                ? (window.EnderecoIntegrator.subdivisionMappingReverse &&
                window.EnderecoIntegrator.subdivisionMappingReverse[countryCode]) || {}
                : {};

        var selectState = checkSelectValuesAgainstMapping(
            domElement,
            correctMapping
        );

        return selectState.hasValidOptions && selectState.allValuesInMapping;
    }

    return true;
};

// Hinweis anzeigen, wenn im PLZ-Feld getippt wird ohne ausgewähltes Land
// Must exist before setPostalCode triggers
EnderecoIntegrator.onCountryRequiredForPostalCode = function (addressObject) {

    var msg = (window.EnderecoIntegrator &&
            window.EnderecoIntegrator.config &&
            window.EnderecoIntegrator.config.texts &&
            window.EnderecoIntegrator.config.texts.selectCountryFirst)
        || 'Bitte wählen Sie zuerst ein Land aus.';

    var countrySubscribers = addressObject && addressObject._subscribers && addressObject._subscribers.countryCode;
    var countryEl = countrySubscribers && countrySubscribers[0] && countrySubscribers[0].object;

    if (!countryEl) {
        alert(msg);
        return;
    }

    var formScope = countryEl.closest('form') || document.body;

    formScope.querySelectorAll('.endereco-country-required-hint').forEach(function (el) {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });

    var hint = document.createElement('div');
    hint.className = 'endereco-country-required-hint col-lg-9 offset-lg-3';
    hint.setAttribute('role', 'alert');
    hint.textContent = msg;
    hint.style.marginTop = '0.25rem';
    hint.style.marginBottom = '0';
    hint.style.color = '#dc3545';
    hint.style.fontWeight = '500';

    var parent = countryEl.closest('.form-group') || countryEl.closest('.mb-3') || countryEl.parentNode;

    if (!parent || !parent.appendChild) {
        alert(msg);
        return;
    }

    parent.appendChild(hint);

    // mark country field as invalid
    countryEl.classList.add('endereco-country-required-error');
    countryEl.style.borderColor = '#dc3545';

    countryEl.focus();

    var removeHint = function () {
        if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
        }

        // remove red error styling
        countryEl.classList.remove('endereco-country-required-error');
        countryEl.style.borderColor = '';

        countryEl.removeEventListener('change', removeHint);
    };

    countryEl.addEventListener('change', removeHint);
};

window.EnderecoIntegrator = merge({}, EnderecoIntegrator, window.EnderecoIntegrator || {});
const integrator = window.EnderecoIntegrator;

function initIntegrator(integrator) {
    // async callbacks ausführen
    integrator.asyncCallbacks.forEach(function (cb) {
        cb();
    });
    integrator.asyncCallbacks = [];
}

// SDK initialisieren sobald es bereit ist
integrator.waitUntilReady().then(function () {
    initIntegrator(integrator);
});


const waitForConfig = setInterval(function () {
    if (typeof enderecoLoadAMSConfig === 'function') {
        try {
            enderecoLoadAMSConfig();
            clearInterval(waitForConfig);
        } catch (error) {
            console.error('Failed to execute enderecoLoadAMSConfig:', error);
            clearInterval(waitForConfig);
        }
    }
}, 100);

/**
 * @function checkSelectValuesAgainstMapping
 * @description Validates the <option> elements within a given <select> element against a provided mapping object.
 * It determines if the select element contains any "valid" options (non-disabled, with a non-empty value)
 * and checks if the values of all such valid options exist as keys within the mapping object.
 *
 * @param {HTMLSelectElement | null | undefined} domElementOfSelect - The <select> DOM element whose options should be checked.
 * The function handles null or undefined input gracefully by returning the default result structure.
 * @param {object} mappingObject - The JavaScript object used as a reference map. The function checks
 * if the `value` attribute of the valid options exists as a key in this object.
 * It expects this to be a non-null object for the mapping check to work correctly.
 * If `selectedCountryCode` is provided and `mappingObject[selectedCountryCode]` is an object,
 * that nested object is used as the mapping (for per-country subdivision mappings).
 * @param {string} [selectedCountryCode] - Optional country code (e.g. "DE"). When provided and
 * mappingObject is keyed by country, the check uses mappingObject[selectedCountryCode] as the mapping.
 *
 * @returns {{
 * hasValidOptions: boolean,
 * allValuesInMapping: boolean,
 * missingValues: string[],
 * allOptionValues: string[]
 * }} An object containing the results of the validation:
 * - `hasValidOptions`: `true` if the select element has at least one option that is not disabled and has a non-empty value; `false` otherwise.
 * - `allValuesInMapping`: `true` if `hasValidOptions` is true AND every valid option's value exists as a key in `mappingObject`; `false` otherwise.
 * - `missingValues`: An array of strings containing the values of valid options that were *not* found as keys in `mappingObject`. Empty if all values are found or if `hasValidOptions` is false.
 * - `allOptionValues`: An array of strings containing the values of *all* valid options found in the select element. Empty if `hasValidOptions` is false.
 */
const checkSelectValuesAgainstMapping = (domElementOfSelect, mappingObject, selectedCountryCode) => {
    // Initialize default return structure
    const result = {
        hasValidOptions: false,
        allValuesInMapping: false,
        missingValues: [],
        allOptionValues: []
    };

    // Check if select element exists
    if (!domElementOfSelect) {
        return result;
    }

    // Use per-country mapping when selectedCountryCode is given and mapping has that key as object
    const effectiveMapping = selectedCountryCode &&
    mappingObject &&
    typeof mappingObject[selectedCountryCode] === 'object' &&
    mappingObject[selectedCountryCode] !== null
        ? mappingObject[selectedCountryCode]
        : mappingObject;

    if (!effectiveMapping || typeof effectiveMapping !== 'object') {
        return result;
    }

    const options = domElementOfSelect.options;
    const optionValues = [];

    // Process all valid options
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option.value && !option.disabled) {
            result.hasValidOptions = true;
            optionValues.push(option.value);
        }
    }

    // Set allOptionValues regardless of whether options are valid
    result.allOptionValues = optionValues;

    // Find missing values only if we have valid options
    if (result.hasValidOptions) {
        for (const value of optionValues) {
            if (!Object.prototype.hasOwnProperty.call(effectiveMapping, value)) {
                result.missingValues.push(value);
            }
        }

        result.allValuesInMapping = result.missingValues.length === 0;
    }

    return result;
}
