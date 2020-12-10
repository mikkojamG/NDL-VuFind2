/* global finna */
finna.servicePointSchedule = (function servicePointSchedule(root) {
  var $holder, $loader, $prevButton, $nextButton, $weekNumber, $scheduleHolder;
  var timeRowTemplate, timeTemplate;
  var service;
  var servicePointsList = {};

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

  var getSchedules = function getSchedules(organisation, id, periodStart, dir) {
    var deferred = $.Deferred();

    service.getSchedules('page', organisation, id, periodStart, dir, true, true, function onSchedulesLoaded(res) {
      if (res) {
        deferred.resolve(res);
      } else {
        deferred.reject();
      }
    });

    return deferred.promise();
  };

  var updateWeekNumber = function updateWeekNumber(week) {
    $weekNumber.text(week);
  };

  var updatePreviousButton = function updatePreviousButton(response) {
    var disable = response.openTimes.currentWeek || !response.openTimes.schedules.length;

    if (disable) {
      $prevButton
        .addClass('disabled')
        .attr('disabled', true);
    } else {
      $prevButton
        .removeClass('disabled')
        .attr('disabled', false);
    }
  };

  var updateNextButton = function updateNextButton(response) {
    var disable = response.openTimes.museum === true || !response.openTimes.schedules.length;

    if (disable) {
      $nextButton
        .addClass('disabled')
        .attr('disabled', true);
    } else {
      $nextButton
        .removeClass('disabled')
        .attr('disabled', false);
    }
  };

  var handleLinks = function handleLinks(links, $linkHolder) {
    links.forEach(function forEachLink(object) {
      var $link = $('<li><a></a></li>');

      $link.find('a')
        .attr('href', object.url)
        .text(object.name);

      $linkHolder.append($link);
    });
  };

  var handleOpenTimes = function handleOpenTimes($dayRow, object) {
    var dayCount = 0;

    var currentSelfService = null;
    var currentDate = null;
    var selfServiceAvailable = false;
    var $currentTimeRow = null;
    var addFullOpeningTimes = true;

    var firstItem = object.times[0];
    var lastItem = object.times[object.times.length - 1];

    object.times.forEach(function forEachOpenTime(time) {
      var selfService = !!time.selfservice;

      selfServiceAvailable = selfServiceAvailable || time.selfservice;

      var date = dayCount === 0 ? object.date : '';
      var day = dayCount === 0 ? object.day : '';
      var info = time.info ? time.info : null;

      if (currentDate !== object.date) {
        dayCount = 0;
      }

      var timeOpens = time.opens;
      var timeCloses = time.closes;

      if (!selfService || object.times.length === 1) {
        var $timePeriod = $(timeTemplate.html());

        if (currentSelfService === null || selfService !== currentSelfService) {
          var $timeRow = $(timeRowTemplate.html());

          $timeRow.find('.js-date').text(date);
          $timeRow.find('.js-name').text(day);

          if (addFullOpeningTimes && object.times.length > 1) {
            $timePeriod.find('.js-opens').text(firstItem.opens);
            $timePeriod.find('.js-closes').text(lastItem.closes);

            $timeRow.find('.js-time-container').append($timePeriod);

            $dayRow.append($timeRow);

            $timePeriod = $(timeTemplate.html());
            $timeRow = $(timeRowTemplate.html());

            addFullOpeningTimes = false;
          }

          if (info == null) {
            $timeRow.find('.js-info').addClass('hide');
          } else {
            $timeRow.find('.js-info').text(info);
          }

          $timePeriod.find('.js-opens').text(timeOpens);
          $timePeriod.find('.js-closes').text(timeCloses);

          $timeRow.find('.js-time-container').append($timePeriod);

          $timeRow.find('.js-opens').text(timeOpens);
          $timeRow.find('.js-closes').text(timeCloses);

          if (selfServiceAvailable && selfService !== currentSelfService) {
            $timeRow.toggleClass('staff', !selfService);
          }

          if (time.selfservice) {
            $timeRow.find('.js-staff').addClass('hide');
            $timeRow.find('.js-selfservice').removeClass('hide');
          }

          $dayRow.append($timeRow);
          $currentTimeRow = $timeRow;
        } else {
          $timePeriod.find('.js-opens').text(timeOpens);
          $timePeriod.find('.js-closes').text(timeCloses);

          $currentTimeRow.find('.js-time-container').append($timePeriod);
        }

        currentSelfService = selfService;
        currentDate = object.date;
        dayCount++;
      }
    });

    $loader.addClass('hide');
  };

  var handleSchedules = function handleSchedules(schedules) {
    schedules.forEach(function forEachSchedule(object) {
      var $dayRow = $('<div class="day-container"></div>');

      $dayRow.toggleClass('today', !!object.today);

      var closed = !!object.closed;

      if (!closed) {
        handleOpenTimes($dayRow, object);
      } else {
        var $timeRow = $(timeRowTemplate.html());
        var $timePeriod = $(timeTemplate.html());

        $timeRow.find('.js-date').text(object.date);
        $timeRow.find('.js-name').text(object.day);
        $timeRow.find('.js-info').text(object.info);

        $timeRow.find('.js-staff').addClass('hide');
        $timePeriod.find('.js-period').addClass('hide');

        $timePeriod.find('.js-closed').removeClass('hide');

        $timeRow.find('.js-time-container').append($timePeriod);

        $dayRow.append($timeRow);
        $dayRow.toggleClass('is-closed', true);

        $loader.addClass('hide');
      }

      $scheduleHolder.append($dayRow);
    });
  };

  var handleDetails = function handleDetails(data) {
    if ('openNow' in data && data.openTimes && data.openTimes.schedules.length
    ) {
      $holder.find('.js-is-open ' + (data.openNow ? '.js-open' : '.js-closed')).removeClass('hide');
    }

    $holder.find('.js-is-open').removeClass('hide');
  }

  var appendSchedulesData = function appendSchedulesData(data) {
    var id = $holder.data('service-point-id');

    var details = service.getDetails(id);

    handleDetails(details);

    if (data.periodStart) {
      $holder.data('period-start', data.periodStart);
    }

    if (data.weekNum) {
      updateWeekNumber(parseInt(data.weekNum));
    }

    updatePreviousButton(data);
    updateNextButton(data);

    var servicePoint = servicePointsList[id];

    var hasSchedules = data.openTimes && data.openTimes.schedules && data.openTimes.schedules.length;

    if (hasSchedules) {
      $holder.find('.js-week-navigation').removeClass('hide');
      handleSchedules(data.openTimes.schedules);
    } else {
      $holder.find('.js-week-navigation').addClass('hide');
      var $linkHolder = $holder.find('.js-mobile-schedules');

      $linkHolder.empty();

      if (servicePoint.mobile) {
        $linkHolder.removeClass('hide');

        if (servicePoint.details.links) {
          handleLinks(servicePoint.details.links, $linkHolder);
        }
      }

      if (!servicePoint.details.links) {
        $holder.find('.js-no-schedules').removeClass('hide');
      }

      $loader.addClass('hide');
    }
  };

  var initServicePointSelect = function initServicePointSelect($menu, data) {
    var organisation = $holder.data('organisation');
    var id = $holder.data('service-point-id');

    data.list.forEach(function forEachServicePoint(servicePoint) {
      var $li = $('<li />').attr('role', 'menuitem');
      var $button = $('<button />')
        .attr('data-id', servicePoint.id)
        .text(servicePoint.name);

      $li.append($button);
      $menu.append($li);
    });

    var $toggleText = $holder.find('.js-service-point-menu .dropdown-toggle span');
    var $menuItems = $menu.find('li button');

    $menuItems.on('click', function onClickMenuItem() {
      $loader.removeClass('hide');

      var menuText = $(this).text();

      $toggleText.text(menuText);

      $scheduleHolder.empty();

      var menuId = $(this).data('id');

      $(root).trigger('servicePointSchedule:selectServicePoint', id);

      var menuStatusText = $holder.find('.js-dropdown-status')
        .data('status-placeholder')
        .replace('{item}', menuText);

      $holder.find('.js-dropdown-status').text(menuStatusText);

      getSchedules(
        organisation,
        menuId,
        $holder.data('period-start')
      ).then(function onSchedulesResolve(res) {
        appendSchedulesData(res);
      });
    });

    var preselected = data.list.filter(function findPreselectedServicePoint(servicePoint) {
      return servicePoint.id.toString() === id.toString();
    });

    if (preselected.length) {
      var servicePoint = preselected[0];

      $menu.find('button[data-id="' + servicePoint.id + '"]').click();
    } else {
      id = finna.common.getField(data.consortium.finna, 'service_point');

      if (!id) {
        id = $menu.find('li button')
          .first()
          .data('service-point-id');
      }

      $menu.find('button[data-id="' + id + '"]').click();
    }
  };

  var attachWeekNaviListener = function attachWeekNaviListener() {
    $holder.find('.js-prev-week, .js-next-week')
      .unbind('click')
      .on('click', function onNaviClick() {
        if ($(this).hasClass('disabled')) {
          return;
        }

        $loader.removeClass('hide');

        $scheduleHolder.empty();

        var organisation = $holder.data('organisation');
        var id = $holder.data('service-point-id');

        var dir = parseInt($(this).data('dir'));

        var currentWeek = parseInt($weekNumber.text());

        $weekNumber.text(currentWeek + dir);

        var weekStatusText = $holder.find('.js-navigation-status')
          .data('status-placeholder')
          .replace('{0}', currentWeek + dir);

        $holder.find('.js-navigation-status').text(weekStatusText);

        getSchedules(organisation, id, $holder.data('period-start'), dir).then(function onSchedulesResolve(res) {
          appendSchedulesData(res);
        });
      });
  };

  var getServicePointSchedules = function getServicePointSchedules() {
    var organisation = $holder.data('organisation');
    var servicePointId = $holder.data('service-point-id');

    $holder.find('.js-hide-onload').addClass('hide');

    getOrganisationData(organisation).then(function onOrganisationsResolve(res) {
      var servicePoints = res.list;

      servicePoints.forEach(function forEachServicePoint(servicePoint) {
        servicePointsList[servicePoint.id] = servicePoint;
      });

      var $menu = $holder.find('.js-service-point-menu .dropdown-menu');

      if ($menu.length) {
        initServicePointSelect($menu, res);
      } else {
        getSchedules(organisation, servicePointId, $holder.data('period-start')).then(function onSchedulesResolve(data) {
          appendSchedulesData(data);
        });
      }

      var week = parseInt(res.weekNum);
      updateWeekNumber(week);
      attachWeekNaviListener();
    });
  };

  return {
    getServicePointSchedules: getServicePointSchedules,
    init: function init(_holder, _service) {
      $holder = _holder;
      service = _service;

      $loader = $holder.find('.js-loader');
      $scheduleHolder = $holder.find('.js-opening-times-week');
      $prevButton = $holder.find('.js-prev-week');
      $nextButton = $holder.find('.js-next-week');
      $weekNumber = $holder.find('.js-week-number');

      timeRowTemplate = $('.js-time-row-template');
      timeTemplate = $('.js-time-template');

      $(root).on('mapWidget:selectServicePoint', function onServicePointChange(_, data) {
        $holder.data('service-point-id', data);
        $loader.removeClass('hide');
        $scheduleHolder.empty();

        getServicePointSchedules();
      });
    }
  }
});
