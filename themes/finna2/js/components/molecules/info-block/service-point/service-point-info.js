/*global finna */
finna.servicePointInfo = (function finnaServicePointInfo(root) {
  var $wrapper, $holder;
  var service;

  var handleOpeningTimes = function handleOpeningTimes(schedules) {
    schedules.forEach(function forEachSchedule(schedule) {
      if (schedule.today && schedule.times && schedule.times.length) {
        var openToday = schedule.times[0];

        var lastSchedule = schedule.times[schedule.times.length - 1];
        var $openingTimes = $holder.find('.js-opening-times');

        $openingTimes.find('.js-opens').text(openToday.opens);
        $openingTimes.find('.js-closes').text(lastSchedule.closes);
        $openingTimes.removeClass('hide');

        var staffTimes = schedule.times.filter(function mapStaffTimes(time) {
          return !time.selfservice;
        });

        if (staffTimes.length) {
          var $staffTimes = $holder.find('.js-staff-times');

          staffTimes.forEach(function forEachStaffTime(staffTime) {
            $staffTimes.find('.js-staff-opens').text(staffTime.opens);
            $staffTimes.find('.js-staff-closes').text(staffTime.closes);
          });

          $staffTimes.removeClass('hide');
        }
      }
    });
  };

  var handleServicePointData = function handleServicePointData(data) {
    $holder.find('.js-service-point-title').text(data.name);

    if (data.address) {
      $holder.find('.js-service-point-address').html(data.address);
    }

    if (data.email) {
      $holder.find('.js-service-point-email').text(data.email.replace('@', '(at)'))
    }

    if (data.homepage) {
      $holder.find('.js-homepage').attr('href', data.homepage);
    }

    if (data.routeUrl) {
      $holder.find('.js-directions').attr('href', data.routeUrl);
    }

    if (data.details.slogan && data.details.slogan.length > 1) {
      $holder.find('.js-slogan').text(data.details.slogan).removeClass('hide');
    }

    if (data.details.links) {
      var facebookLink = data.details.links.filter(function findFacebooklink(link) {
        return link.name.indexOf('Facebook') !== -1;
      })[0];

      if (facebookLink) {
        $holder.find('.js-facebook')
          .attr('href', facebookLink.url)
          .removeClass('hide');
      }
    }
  }

  var getOrganisationsData = function getOrganisationsData(organisation) {
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

  var getServicePoint = function getServicePoint(id) {
    $wrapper.find('.js-loader').removeClass('hide');
    $holder.addClass('hide');
    $holder.find('.js-hide-on-load').addClass('hide');

    var organisation = $wrapper.data('organisation');

    getOrganisationsData(organisation)
      .then(function onOrganisationsResolve() {
        getSchedules(organisation, id)
          .then(function onSchedulesResolve() {
            var data = service.getDetails(id);

            handleServicePointData(data);

            var hasSchedules = data.openTimes.schedules && data.openTimes.schedules.length;

            if (hasSchedules) {
              handleOpeningTimes(data.openTimes.schedules);

              if (data.openNow) {
                $holder.find('.js-open-today .open').removeClass('hide');
              } else {
                $holder.find('.js-open-today .closed').removeClass('hide');
              }
            }

            $wrapper.find('.js-loader').addClass('hide');
            $holder.removeClass('hide');
          });
      });
  };

  return {
    getServicePoint: getServicePoint,
    init: function init(wrapper, _service) {
      $wrapper = wrapper;
      $holder = $wrapper.find('.js-service-point-info');

      service = _service;

      $(root).on('mapWidget:selectServicePoint', function onMapWidgetSelect(_, data) {
        getServicePoint(data);
      });
    }
  }
});
