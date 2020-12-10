/* global VuFind, finna */
finna.organisationFeed = (function organisationFeed(root) {
  var $holder, $grid, $spinner, $alert;
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

  var getRssUrl = function getRssUrl() {
    var deferred = $.Deferred();

    var organisation = $grid.data('organisation');
    var id = $grid.data('service-point-id');

    getOrganisationData(organisation)
      .then(function onOrganisationsResolve() {
        getSchedules(organisation, id)
          .then(function onSchedulesResolve(res) {
            if (res.rss) {
              var rss = res.rss.filter(function findFeedRss(item) {
                return item.id === $grid.data('rss-id');
              })[0];

              if (rss && rss.url) {
                deferred.resolve(rss.url);
              }
            }

            deferred.reject();
          });
      });

    return deferred.promise();
  };

  var ajaxRequest = function ajaxRequest(params) {
    var url = VuFind.path + '/AJAX/JSON';

    $.ajax({
      url: url,
      method: 'GET',
      data: params,
      headers: {
        'Content-Type': 'application/json'
      }
    }).done(function onRequestDone(res) {
      var response = JSON.parse(res);

      if (response.data) {
        $spinner.addClass('hide');

        $grid.html(response.data.html);

        var hasItems = $grid.find('.feed-grid .grid-item').length;

        if (hasItems) {
          var settings = response.data.settings;

          if (!settings.height) {
            settings.height = 300;
          }

          if (settings.modal) {
            $grid.find('a').on('click', function onClickModal() {
              $('#modal').addClass('feed-content');
            });

            VuFind.lightbox.bind($grid);
          }

          if ($grid.find('.grid-item.truncate').length) {
            $grid.find('.show-more-feeds').removeClass('hidden');
          }

          $grid.find('.show-more-feeds').on('click', function showMoreFeeds() {
            $grid.find('.grid-item.truncate').removeClass('hidden');
            $grid.find('.show-less-feeds').removeClass('hidden');
            $(this).addClass('hidden');
          });

          $grid.find('.show-less-feeds').click(function showLessButton() {
            $grid.find('.grid-item.truncate').addClass('hidden');
            $grid.find('.show-more-feeds').removeClass('hidden');
            $(this).addClass('hidden');
          });
        } else {
          $alert.removeClass('hide');
        }
      }

    }).fail(function onRequestFail(err) {
      $spinner.addClass('hide');

      if (err.responseJSON) {
        $alert.html(err.responseJSON.data);
      }

      $alert.removeClass('hide');
    });
  };

  var getFeed = function getFeed(params) {
    $spinner.removeClass('hide');
    $alert.addClass('hide');

    params['touch-device'] = (finna.layout.isTouchDevice() ? 1 : 0);
    params.method = 'getOrganisationPageFeed';

    if (!params.url) {
      getRssUrl().then(function onResolve(res) {
        params.url = res;

        ajaxRequest(params);
      }).catch(function onRejected() {
        $spinner.addClass('hide');
        $alert.removeClass('hide');
      });
    } else {
      ajaxRequest(params);
    }
  };

  return {
    getFeed: getFeed,
    init: function init(holder, _service) {
      $holder = holder;
      $grid = $holder.find('.js-feed-grid');
      $spinner = $holder.find('.js-loader');
      $alert = $holder.find('.js-feed-alert');

      service = _service;

      $(root).on('mapWidget:selectServicePoint', function onMapWidgetSelect(_, data) {
        $grid.data('service-point-id', data);
        $grid.empty();

        var params = {
          id: $grid.data('rss-id')
        };

        getFeed(params);
      });
    }
  }
});
