(function($) {

    $(document).ready( function() {

        // Select property
        $('#property-selector li.selector-child').on('click', function(e) {
            e.stopPropagation();
            var property = $(this);
            var term = property.data('property-term');
            var field = $('[data-property-term = "' + term + '"].field');
            if (!field.length) {
                field = makeNewField(property);
            }
            $('#property-selector').removeClass('mobile');
            Omeka.scrollTo(field);
        });

        $('#resource-template-select').on('change', function(e) {
            // Restore the original property label and comment.
            $('.alternate').remove();
            $('.field-label, .field-description').show();
            applyResourceTemplate(true);
        });

        $('a.value-language').on('click', function(e) {
            e.preventDefault();
            var languageButton = $(this);
            var languageInput =  languageButton.next('input.value-language');
            languageButton.toggleClass('active');
            languageInput.toggleClass('active');
            if (languageInput.hasClass('active')) {
                languageInput.focus();
            }
        });

        $('input.value-language').on('keyup, change', function(e) {
            if ('' === this.value || Omeka.langIsValid(this.value)) {
                this.setCustomValidity('');
            } else {
                this.setCustomValidity(Omeka.jsTranslate('Please enter a valid language tag'))
            }
        });

        // Make new value inputs whenever "add value" button clicked.
        $('#properties').on('click', '.add-value', function(e) {
            e.preventDefault();
            var typeButton = $(this);
            var field = typeButton.closest('.resource-values.field');
            var value = makeNewValue(field.data('property-term'), typeButton.data('type'))
            field.find('.values').append(value);
        });

        // Remove value.
        $('a.remove-value').on('click', function(e) {
            e.preventDefault();
            var thisButton = $(this);
            var value = thisButton.closest('.value');
            // Disable all form controls.
            value.find(':input').prop('disabled', true);
            value.addClass('delete');
            value.find('a.restore-value').show().focus();
            thisButton.hide();
        });

        // Restore a removed value
        $('a.restore-value').on('click', function(e) {
            e.preventDefault();
            var thisButton = $(this);
            var value = thisButton.closest('.value');
            // Enable all form controls.
            value.find('*').filter(':input').prop('disabled', false);
            value.removeClass('delete');
            value.find('a.remove-value').show().focus();
            thisButton.hide();
        });

        // Open or close item set
        $('a.o-icon-lock, a.o-icon-unlock').click(function(e) {
            e.preventDefault();
            var isOpenIcon = $(this);
            $(this).toggleClass('o-icon-lock').toggleClass('o-icon-unlock');
            var isOpenHiddenValue = $('input[name="o:is_open"]');
            if (isOpenHiddenValue.val() == 0) {
                isOpenIcon.attr('aria-label', Omeka.jsTranslate('Close item set'));
                isOpenIcon.attr('title', Omeka.jsTranslate('Close item set'));
                isOpenHiddenValue.attr('value', 1);
            } else {
                isOpenHiddenValue.attr('value', 0);
                isOpenIcon.attr('aria-label', Omeka.jsTranslate('Open item set'));
                isOpenIcon.attr('title', Omeka.jsTranslate('Open item set'));
            }
        });

        $('#select-item a').on('o:resource-selected', function (e) {
            var value = $('.value.selecting-resource');
            var valueObj = $('.resource-details').data('resource-values');

            $(document).trigger('o:prepare-value', ['resource', value, valueObj]);
            Omeka.closeSidebar($('#select-resource'));
        });

        // Prevent resource details from opening when quick add is toggled on.
        $('#select-resource').on('click', '.quick-select-toggle', function() {
            $('#item-results').find('a.select-resource').each(function() {
                $(this).toggleClass('sidebar-content');
            });
        });

        $('#select-resource').on('o:resources-selected', '.select-resources-button', function(e) {
            var value = $('.value.selecting-resource');
            var field = value.closest('.resource-values.field');
            $('#item-results').find('.resource')
                .has('input.select-resource-checkbox:checked').each(function(index) {
                    if (0 < index) {
                        value = makeNewValue(field.data('property-term'), 'resource');
                        field.find('.values').append(value);
                    }
                    var valueObj = $(this).data('resource-values');
                    $(document).trigger('o:prepare-value', ['resource', value, valueObj]);
                });
        });

        $('.button.resource-select').on('click', function(e) {
            e.preventDefault();
            var selectButton = $(this);
            var sidebar = $('#select-resource');
            var term = selectButton.closest('.resource-values').data('property-term');
            $('.selecting-resource').removeClass('selecting-resource');
            selectButton.closest('.value').addClass('selecting-resource');
            $('#select-item a').data('property-term', term);
            Omeka.populateSidebarContent(sidebar, selectButton.data('sidebar-content-url'));
            Omeka.openSidebar(sidebar);
        });

        $('.visibility [type="checkbox"]').on('click', function() {
            var publicCheck = $(this);
            if (publicCheck.prop("checked")) {
                publicCheck.attr('checked','checked');
            } else {
                publicCheck.removeAttr('checked');
            }
        });

        // Handle validation for required properties.
        $('form.resource-form').on('submit', function(e) {

            var thisForm = $(this);
            var errors = [];

            // Iterate all required properties.
            var requiredProps = thisForm.find('.resource-values.required');
            requiredProps.each(function() {

                var thisProp = $(this);
                var propIsCompleted = false;

                // Iterate all values for this required property.
                var requiredValues = $(this).find('.value').not('.delete');
                requiredValues.each(function() {

                    var thisValue = $(this);
                    var valueIsCompleted = true;

                    // All inputs of this value with the "to-require" class must
                    // be completed when the property is required.
                    var toRequire = thisValue.find('.to-require');
                    toRequire.each(function() {
                        if ('' === $.trim($(this).val())) {
                            // Found an incomplete input.
                            valueIsCompleted = false;
                        }
                    });
                    if (valueIsCompleted) {
                        // There's at least one completed value of this required
                        // property. Consider the requirement satisfied.
                        propIsCompleted = true;
                        return false; // break out of each
                    }
                });
                if (!propIsCompleted) {
                    // No completed values found for this required property.
                    var propLabel = thisProp.find('.field-label').text();
                    errors.push('The following field is required: ' + propLabel);
                }
            });
            thisForm.data('has-error', errors.length > 0);
            if (errors.length) {
                e.preventDefault();
                alert(errors.join("\n"));
            }

            $('#values-json').val(JSON.stringify(collectValues()));
        });

        initPage();
    });

    var collectValues = function () {
        var values = {};
        $('#properties').children().each(function () {
            var propertyValues = [];
            var property = $(this);
            var propertyTerm = property.data('propertyTerm');
            var propertyId = property.data('propertyId');
            property.find('.values > .value').each(function () {
                var valueData = {}
                var value = $(this);
                if (value.hasClass('delete')) {
                    return;
                }
                valueData['property_id'] = propertyId;
                valueData['type'] = value.data('dataType');
                valueData['is_public'] = value.find('input.is_public').val();
                value.find(':input[data-value-key]').each(function () {
                    var input = $(this);
                    valueKey = input.data('valueKey');
                    if (!valueKey || input.prop('disabled')) {
                        return;
                    }
                    valueData[valueKey] = input.val();
                });
                propertyValues.push(valueData);
            });
            if (propertyValues.length) {
                values[propertyTerm] = propertyValues;
            }
        });
        return values;
    };

    /**
     * Make a new value.
     */
    var makeNewValue = function(term, dataType, valueObj) {
        var field = $('.resource-values.field[data-property-term="' + term + '"]');
        // Get the value node from the templates.
       if (!dataType || typeof dataType !== 'string') {
            dataType = valueObj ? valueObj['type'] : field.find('.add-value:visible:first').data('type');
        }
        var fieldForDataType = field.filter(function() { return $.inArray(dataType, $(this).data('data-types').split(',')) > -1; });
        field = fieldForDataType.length ? fieldForDataType.first() : field.first();
        var value = $('.value.template[data-data-type="' + dataType + '"]').clone(true);
        value.removeClass('template');
        value.data('data-term', term);

        // Get and display the value's visibility.
        var isPublic = true; // values are public by default
        if (field.hasClass('private') || (valueObj && false === valueObj['is_public'])) {
            isPublic = false;
        }
        var valueVisibilityButton = value.find('a.value-visibility');
        if (isPublic) {
            valueVisibilityButton.removeClass('o-icon-private').addClass('o-icon-public');
            valueVisibilityButton.attr('aria-label', Omeka.jsTranslate('Make private'));
            valueVisibilityButton.attr('title', Omeka.jsTranslate('Make private'));
        } else {
            valueVisibilityButton.removeClass('o-icon-public').addClass('o-icon-private');
            valueVisibilityButton.attr('aria-label', Omeka.jsTranslate('Make public'));
            valueVisibilityButton.attr('title', Omeka.jsTranslate('Make public'));
        }

        // Prepare the value node.
        var valueLabelID = 'property-' + field.data('property-id') + '-label';
        value.find('input.is_public')
            .val(isPublic ? 1 : 0);
        value.find('span.label')
            .attr('id', valueLabelID);
        value.find('textarea.input-value')
            .attr('aria-labelledby', valueLabelID);
        value.attr('aria-labelledby', valueLabelID);
        $(document).trigger('o:prepare-value', [dataType, value, valueObj]);

        return value;
    };

    /**
     * Prepare the markup for the default data types.
     */
    $(document).on('o:prepare-value', function(e, dataType, value, valueObj) {
        // Prepare simple single-value form inputs using data-value-key
        value.find(':input').each(function () {
            var valueKey = $(this).data('valueKey');
            if (!valueKey) {
                return;
            }
            $(this).removeAttr('name')
                .val(valueObj ? valueObj[valueKey] : null);
        });

        // Prepare the markup for the resource data types.
        var resourceDataTypes = [
            'resource',
            'resource:item',
            'resource:itemset',
            'resource:media',
        ];
        if (valueObj && -1 !== resourceDataTypes.indexOf(dataType)) {
            value.find('span.default').hide();
            var resource = value.find('.selected-resource');
            if (typeof valueObj['display_title'] === 'undefined') {
                valueObj['display_title'] = Omeka.jsTranslate('[Untitled]');
            }
            resource.find('.o-title')
                .removeClass() // remove all classes
                .addClass('o-title ' + valueObj['value_resource_name'])
                .html($('<a>', {href: valueObj['url'], text: valueObj['display_title']}));
            if (typeof valueObj['thumbnail_url'] !== 'undefined') {
                resource.find('.o-title')
                    .prepend($('<img>', {src: valueObj['thumbnail_url']}));
            }
        }
    });

    /**
     * Make a new property field.
     */
    var makeNewField = function(property, dataTypes) {
        // Prepare data type name of the field.
        if (!dataTypes || dataTypes.length < 1) {
            dataTypes = ['literal', 'resource', 'uri'];
        }

        // Sort out whether property is the LI that holds data, or the id.
        var propertyLi, propertyId;

        switch (typeof property) {
            case 'object':
                propertyLi = property;
                propertyId = propertyLi.data('property-id');
            break;

            case 'number':
                propertyId = property;
                propertyLi = $('#property-selector').find("li[data-property-id='" + propertyId + "']");
            break;

            case 'string':
                propertyLi = $('#property-selector').find("li[data-property-term='" + property + "']");
                propertyId = propertyLi.data('property-id');
            break;

            default:
                return null;
        }

        var term = propertyLi.data('property-term');
        var field = $('.resource-values.field.template').clone(true);
        field.removeClass('template');
        field.find('.field-label').text(propertyLi.data('child-search')).attr('id', 'property-' + propertyId + '-label');
        field.find('.field-term').text(term);
        field.find('.field-description').prepend(propertyLi.find('.field-comment').text());
        field.data('property-term', term);
        field.data('property-id', propertyId);
        field.data('data-types', dataTypes.join(','));
        // Adding the attr because selectors need them to find the correct field
        // and count when adding more.
        field.attr('data-property-term', term);
        field.attr('data-property-id', propertyId);
        field.attr('data-data-types', dataTypes.join(','));
        field.attr('aria-labelledby', 'property-' + propertyId + '-label');
        $('div#properties').append(field);

        new Sortable(field.find('.values')[0], {
            draggable: '.value',
            handle: '.sortable-handle'
        });

        field.trigger('o:property-added');
        return field;
    };

    /**
     * Rewrite a property field following the rules defined by the selected
     * resource template property or create a new one.
     */
    var rewritePropertyField = function(templateProperty) {
        var properties = $('div#properties');
        var propertyId = templateProperty['o:property']['o:id'];
        var dataTypes = templateProperty['o:data_type'] && templateProperty['o:data_type'].length
            ? templateProperty['o:data_type']
            : ['literal', 'resource', 'uri'];

        var field = properties.find('[data-property-id="' + propertyId + '"]');
        if (field.length == 0) {
            field = makeNewField(propertyId, dataTypes);
        }

        var originalLabel = field.find('.field-label');
        var originalDescription = field.find('.field-description');
        var defaultSelector = field.find('div.default-selector');
        var multipleSelector = field.find('div.multiple-selector');
        var singleSelector = field.find('div.single-selector');

        if (templateProperty['o:is_required']) {
            field.addClass('required');
        }
        if (templateProperty['o:is_private']) {
            field.addClass('private');
        }
        if (templateProperty['o:alternate_label']) {
            var altLabel = originalLabel.clone();
            var altLabelId = 'property-' + propertyId + '-' + dataTypes.join('-') + '-label';
            altLabel.addClass('alternate');
            altLabel.text(templateProperty['o:alternate_label']);
            altLabel.insertAfter(originalLabel);
            altLabel.attr('id', altLabelId);
            field.attr('aria-labelledby', altLabelId);
            originalLabel.hide();
        }
        if (templateProperty['o:alternate_comment']) {
            var altDescription = originalDescription.clone();
            altDescription.addClass('alternate');
            altDescription.text(templateProperty['o:alternate_comment']);
            altDescription.insertAfter(originalDescription);
            originalDescription.hide();
        }

        // Remove any unchanged default values for this property so we start fresh.
        field.find('.value.default-value').remove();

        // Change value selector (multiple, single, or default) and add empty value if needed.
        if (templateProperty['o:data_type'].length > 1) {
            defaultSelector.hide();
            singleSelector.hide();
            if (!multipleSelector.find('.add-value').length) {
                multipleSelector.append(prepareMultipleSelector(templateProperty['o:data_type']));
            }
            multipleSelector.show();
        } else if (templateProperty['o:data_type'].length === 1) {
            defaultSelector.hide();
            multipleSelector.hide();
            singleSelector.find('a.add-value.button').data('type', templateProperty['o:data_type'][0]);
            singleSelector.show();
        } else {
            multipleSelector.hide();
            singleSelector.hide();
            defaultSelector.show();
        }

        // Add an empty value if none already exist in the property.
        if (!field.find('.value').length) {
            field.find('.values').append(makeNewValue(field.data('property-term'), templateProperty['o:data_type'][0]));
        }

        properties.prepend(field);
    };

    /**
     * Prepare a selector (usually a html list of buttons) from a list of data types.
     *
     * @param array dataTypes
     * @return string
     */
    var prepareMultipleSelector = function(dataTypes) {
        var html = '';
        dataTypes.forEach(function(dataType) {
            var dataTypeTemplate = $('.template.value[data-data-type="' + dataType + '"]');
            var label = dataTypeTemplate.data('data-type-label') ? dataTypeTemplate.data('data-type-label') : Omeka.jsTranslate('Add value');
            var icon = dataTypeTemplate.data('data-type-icon') ? dataTypeTemplate.data('data-type-icon') : dataType.substring(0, (dataType + ':').indexOf(':'));
            html += dataTypeTemplate.data('data-type-button')
                ? dataTypeTemplate.data('data-type-button') + ' '
                : '<a href="#" class="add-value button o-icon-' + icon + '" data-type="' + dataType + '">' + label + '</a> ';
        });
        return html;
    };

    /**
     * Apply the selected resource template to the form.
     *
     * @param bool changeClass Whether to change the suggested class
     */
    var applyResourceTemplate = function(changeClass) {

        // Fieldsets may have been marked as required or private in a previous state.
        $('.field').removeClass('required');
        $('.field').removeClass('private');

        var templateSelect = $('#resource-template-select');
        var templateId = templateSelect.val();
        var fields = $('#properties .resource-values');
        if (!templateId) {
            // Using the default resource template, so all properties should use the default
            // selector.
            fields.find('div.multiple-selector').hide();
            fields.find('div.single-selector').hide();
            fields.find('div.default-selector').show();
            return;
        }

        var url = templateSelect.data('api-base-url') + '/' + templateId;
        return $.get(url)
            .done(function(data) {
                if (changeClass) {
                    // Change the resource class.
                    var classSelect = $('#resource-class-select');
                    if (data['o:resource_class'] && classSelect.val() === '') {
                        classSelect.val(data['o:resource_class']['o:id']);
                        classSelect.trigger('chosen:updated');
                    }
                }

                // Rewrite every property field defined by the template. We
                // reverse the order so property fields on page that are not
                // defined by the template are ultimately appended.
                var templatePropertyIds = data['o:resource_template_property']
                    .reverse().map(function(templateProperty) {
                        rewritePropertyField(templateProperty);
                        return templateProperty['o:property']['o:id'];
                    });
                // Property fields that are not defined by the template should
                // use the default selector.
                fields.each(function() {
                    var propertyId = $(this).data('property-id');
                    if (templatePropertyIds.indexOf(propertyId) === -1) {
                        var field = $(this);
                        field.find('div.multiple-selector').hide();
                        field.find('div.single-selector').hide();
                        field.find('div.default-selector').show();
                    }
                });
            })
            .fail(function() {
                console.log('Failed loading resource template from API');
            });
    }

    var makeDefaultValue = function (term, dataType) {
        return makeNewValue(term, dataType)
            .addClass('default-value')
            .one('change', '*', function (event) {
                $(event.delegateTarget).removeClass('default-value');
            });
    };

    /**
     * Initialize the page.
     */
    var initPage = function() {
        if (typeof valuesJson == 'undefined') {
            makeNewField('dcterms:title').find('.values')
                .append(makeDefaultValue('dcterms:title', 'literal'));
            makeNewField('dcterms:description').find('.values')
                .append(makeDefaultValue('dcterms:description', 'literal'));
        } else {
            $.each(valuesJson, function(term, valueObj) {
                var field = makeNewField(term);
                $.each(valueObj.values, function(index, value) {
                    field.find('.values').append(makeNewValue(term, null, value));
                });
            });
        }

        var applyTemplateClass = $('body').hasClass('add');
        $.when(applyResourceTemplate(applyTemplateClass)).done(function () {
            $('#properties').closest('form').trigger('o:form-loaded');
        });

        $('input.value-language').each(function() {
            var languageInput = $(this);
            if (languageInput.val() !== "") {
                languageInput.addClass('active');
                languageInput.prev('a.value-language').addClass('active');
            }
        });
    };
})(jQuery);
