/*global VuFind, finna */
finna.scheduleWidget = (function finnaWeekSchedule(root) {
  var $holder, $details, $detailsLoader;
  var service;

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

  var handleServicePointDetails = function handleServicePointDetails(data) {
    var servicePointId = $holder.data('service-point-id');

    if (data.phone) {
      $holder.find('.js-phone')
        .attr('data-original-title', data.phone)
        .removeClass('hide');
    }

    if (data.emails) {
      $holder.find('.js-email')
        .attr('data-original-title', data.emails)
        .removeClass('hide');
    }

    if (data.links) {
      var facebookLink = data.links.filter(function findFacebookLink(link) {
        return link.name.indexOf('Facebook') !== -1;
      });

      if (facebookLink.length) {
        $holder.find('.js-facebook')
          .attr('href', facebookLink[0].url)
          .removeClass('hide');
      }
    }

    var $img = $holder.find('.js-facility-image');

    if (data.pictures) {
      var $imgLink = $img.parent('a');

      $imgLink.attr('href', ($imgLink.data('href') + '#' + servicePointId));

      var src = data.pictures[0].url;

      if ($img.attr('src') !== src) {
        $img.fadeTo(0, 0);
        $img.on('load', function onLoadImage() {
          $(this)
            .stop(true, true)
            .fadeTo(300, 1);
        });
        $img.attr('src', src);
        $img.closest('.js-hide-onload').removeClass('hide');
      } else {
        $img.fadeTo(300, 1);
      }

      $img.parent('a').removeClass('hide');
    } else {
      $img.parent('a').addClass('hide');
    }

    if (data.services) {
      data.services.forEach(function forEachService(serviceName) {
        $holder.find('.js-services .js-service-' + serviceName).removeClass('hide');
      });
    }
  };

  var handleServicePointInfo = function handleServicePointInfo(data) {
    var servicePointId = $holder.data('service-point-id');

    if (data.email) {
      $holder.find('.js-email').removeClass('hide');
    }

    var $detailsLinkHolder = $holder.find('.js-details-link');
    $detailsLinkHolder.removeClass('hide');

    var $detailsLink = $detailsLinkHolder.find('a');

    $detailsLink.attr('href', $detailsLink.data('href') + ('#' + servicePointId));

    if (data.routeUrl) {
      $holder.find('.js-route')
        .attr('href', data.routeUrl)
        .removeClass('hide');
    }

    if (data.mapUrl && data.address) {
      var $map = $holder.find('.js-map');

      $map.find('> a')
        .attr('href', data.mapUrl)
        .attr('aria-label', data.address + ' (' + VuFind.translate('external_link') + ')');

      $map.find('.js-map-address').text(data.address);
      $map.removeClass('hide');
    }

    var details = data.details;
    handleServicePointDetails(details);
  };

  var getServicePointInfo = function getServicePointInfo() {
    var organisation = $holder.data('organisation');
    var servicePointId = $holder.data('service-point-id');

    getOrganisationData(organisation)
      .then(function onOrganisationsResolve() {
        getSchedules(organisation, servicePointId)
          .then(function onSchedulesResolve() {
            var data = service.getDetails(servicePointId);

            handleServicePointInfo(data);

            if (!$holder.find('.js-inital-loader').hasClass('hide')) {
              $holder.find('.js-inital-loader').addClass('hide');
            }

            if ($holder.find('.js-hidden-initally').hasClass('hide')) {
              $holder.find('.js-hidden-initally').removeClass('hide');
            }

            $details.removeClass('hide');
            $detailsLoader.addClass('hide');
          });
      });
  };

  return {
    getServicePointInfo: getServicePointInfo,
    init: function init(holder, _service) {
      $holder = holder;
      $details = $holder.find('.js-details-colum');
      $detailsLoader = $holder.find('.js-details-loader');

      service = _service;

      $(root).on('mapWidget:selectServicePoint servicePointSchedule:selectServicePoint', function onServicePointChange(_, data) {
        $holder.data('service-point-id', data);

        $details.addClass('hide');
        $detailsLoader.removeClass('hide');

        getServicePointInfo();
      });
    }
  };
});
