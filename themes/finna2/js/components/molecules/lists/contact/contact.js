/*global finna */
finna.organisationContactList = (function organisationContactList(root) {
  var $holder, $list;
  var dynamicItems, service;

  var appendContactItems = function appendContactItems(data) {
    data.forEach(function forEachContactItem(item) {
      var $li = $list.find('li.' + item.class);

      $li.find('.contact-content').html(item.content);
    });

    $holder.find('.js-loader').addClass('hide');
    $list.removeClass('hide');
  };

  var getOrganisationData = function getOrganisationData(organisation) {
    var deferred = $.Deferred();

    service.getOrganisations('page', organisation, [], {}, function onOrganisationsLoaded(res) {
      if (res) {
        deferred.resolve(res);
      } else {
        deferred.reject();
      }
    });

    return deferred.promise();
  };

  var getSchedules = function getSchedules(organisation, id) {
    var deferred = $.Deferred();

    service.getSchedules('page', organisation, id, null, null, true, true, function onSchedulesLoaded(res) {
      if (res) {
        deferred.resolve(res);
      } else {
        deferred.reject();
      }
    });

    return deferred.promise();
  };

  var getContactItems = function getContactItems() {
    $holder.find('.js-loader').removeClass('hide');
    $list.addClass('hide');

    var organisation = $holder.data('organisation');
    var id = $holder.data('service-point-id');

    getOrganisationData(organisation)
      .then(function onOrganisationsResolve() {
        getSchedules(organisation, id)
          .then(function onSchedulesResolve() {
            var data = service.getDetails(id);

            var contactData = dynamicItems.filter(function filterItem(item) {
              if (data[item.dataKey] || data.details[item.dataKey]) {

                var contactDataObject

                if (data[item.dataKey]) {
                  contactDataObject = Object.assign(item, { content: data[item.dataKey] });
                } else {
                  contactDataObject = Object.assign(item, { content: data.details[item.dataKey] });
                }

                return contactDataObject;
              }
            });

            appendContactItems(contactData);
          });
      });
  };

  return {
    getContactItems: getContactItems,
    init: function init(_holder, _service, _items) {
      $holder = _holder;
      $list = $holder.find('.js-contact-list');

      service = _service;
      dynamicItems = _items;

      $(root).on('mapWidget:selectServicePoint', function onMapWidgetSelect(_, data) {
        $holder.data('service-point-id', data);

        getContactItems();
      });
    }
  }
});
