/*global VuFind, finna, L */
finna.mapWidget = (function finnaMapWidget(root) {
  var zoomLevel = { initial: 27, far: 5, close: 14 };
  var mapTileUrl;

  var mapMarkers = {};
  var servicePointList = {};
  var markers = [];
  var $selectedMarker = null;
  var service;

  var $widget,
    $map,
    $mapControls,
    $searchInput,
    $holder,
    $mapHolder;

  var hideMarker = function hideMarker() {
    if ($selectedMarker) {
      $selectedMarker.closePopup();
    }
  };

  var selectMarker = function selectMarker(id) {
    var marker;

    if (id in mapMarkers) {
      marker = mapMarkers[id];

      if ($selectedMarker && $selectedMarker === marker) {
        return;
      }
    } else {
      hideMarker();
      return;
    }

    marker.openPopup();
    $selectedMarker = marker;
  };

  var resize = function resize() {
    $map.invalidateSize(true);
  };

  var initMapZooming = function initMapZooming() {
    L.control.zoom({
      position: 'topleft',
      zoomInTitle: VuFind.translate('map_zoom_in'),
      zoomOutTitle: VuFind.translate('map_zoom_out')
    }).addTo($map);

    $('.leaflet-control-zoom').children('a').attr('tabindex', -1);

    $map.once('focus', function onMapFocus() {
      $map.scrollWheelZoom.enable();
    });

    $map.scrollWheelZoom.disable();
  };

  var updateServicePointStatus = function updateMapStatus(newServicePoint) {
    var statusText = $holder.find('.js-search-status').data('status-placeholder').replace('{item}', newServicePoint);

    $holder.find('.js-search-status').text(statusText);
  };

  var setMarkerEventListeners = function setMarkerEventListeners($marker, $ref, servicePoint) {
    $marker.on('mouseover', function onMarkerMouseOver(event) {
      if ($marker === $selectedMarker) {
        return;
      }

      var holderOffset = $widget.offset();
      var offset = $(event.originalEvent.target).offset();

      var x = offset.left - holderOffset.left;
      var y = offset.top - holderOffset.top;

      $ref.trigger('marker-mouseover', { id: servicePoint.id, x: x, y: y });
    });

    $marker.on('mouseout', function onMarkerMouseOut() {
      $ref.trigger('marker-mouseout');
    });

    $marker.on('click', function onMarkerClick() {
      $ref.trigger('marker-click', servicePoint.id);

      $(root).trigger('mapWidget:selectServicePoint', servicePoint.id);

      updateServicePointStatus(servicePoint.name);
    });
  };

  var getMarkerBubbleHtml = function getMarkerBubbleHtml(data) {
    var bubbleTemplateString = $('.js-map-bubble').html().trim();

    var $bubble = $(bubbleTemplateString);

    $bubble.find('.js-name').text(data.name);

    if (data.address) {
      $bubble.find('.js-address').html(data.address);
    }

    $bubble = $bubble.wrap('<div />').addClass('map-bubble');

    return $bubble.parent().html();
  };

  var handleServicePoint = function handleServicePoint(servicePoint, $ref, icons) {
    if (servicePoint.address && servicePoint.address.coordinates) {
      var point = servicePoint.address.coordinates;
      var icon = icons['no-schedule'];
      var openTimes = finna.common.getField(servicePoint, 'openTimes');

      if (openTimes) {
        var schedules = finna.common.getField(openTimes, 'schedules');
        var openNow = finna.common.getField(openTimes, 'openNow');

        icon = schedules && schedules.length ? (openNow ? icons.open : icons.closed) : icon;
      }

      var $marker = L.marker([point.lat, point.lon], { icon: icon }).addTo($map);

      setMarkerEventListeners($marker, $ref, servicePoint);

      var bubble = getMarkerBubbleHtml(servicePoint);

      servicePoint.map = { info: bubble };

      $marker.bindPopup(servicePoint.map.info,
        { zoomAnimation: true, autoPan: false }
      ).addTo($map);

      mapMarkers[servicePoint.id] = $marker;
      markers.push($marker);
    } else {
      return;
    }
  };

  var reset = function reset() {
    var group = new L.featureGroup(markers);
    var bounds = group.getBounds().pad(0.2);

    $map.fitBounds(bounds, { zoom: { animate: true } });
    $map.closePopup();
    $selectedMarker = null;
  };

  var draw = function draw() {
    var $ref = $(this);
    var attribution = $('.js-attribution').html().trim();

    var layer = L.tileLayer(mapTileUrl, {
      attribution: attribution,
      tileSize: 256
    });

    $map = L.map($($widget).attr('id'), {
      zoomControl: false,
      layers: layer,
      minZoom: zoomLevel.far,
      maxZoom: 18,
      zoomDelta: 0.1,
      zoomSnap: 0.1,
      closePopupOnClick: false
    });

    initMapZooming();

    $map.on('popupopen', function onPopupOpen(element) {
      $map.setZoom(zoomLevel.close, { animate: false });

      var px = $map.project(element.popup._latlng);
      px.y -= element.popup._container.clientHeight / 2;

      $map.panTo($map.unproject(px), { animate: false });
    });

    $map.on('popupclose', function onPopupClose() {
      $selectedMarker = null;
    });

    L.control.locate({
      strings: { title: VuFind.translate('map_my_location') }
    }).addTo($map);

    $('.leaflet-control-locate a').attr('aria-label', VuFind.translate('map_my_location'));

    $map.attributionControl.setPrefix('');

    var icons = {};

    ['open', 'closed', 'no-schedule'].forEach(function forEachIcon(iconName) {
      icons[iconName] = L.divIcon({
        className: 'mapMarker',
        iconSize: null,
        html: '<div class="leaflet-marker-icon leaflet-zoom-animated leaflet-interactive"><i class="fa fa-map-marker ' + iconName + '" style="position: relative; font-size: 35px;"></i></div>',
        iconAnchor: [10, 35],
        popupAnchor: [0, -36],
        labelAnchor: [-5, -86]
      });
    });

    Object.keys(servicePointList).forEach(function forEachServicePoint(key) {
      handleServicePoint(servicePointList[key], $ref, icons);
    });
  };

  var getServicePoint = function getServicePoint(id) {
    return servicePointList.filter(function findServicePoint(item) {
      return item.id === id;
    })[0];
  };

  var setControllerEventListeners = function setControllerEventListeners() {
    $holder.find('.js-center').on('click', function onCenter() {
      var id = $holder.data('service-point-id');

      var servicePoint = getServicePoint(id);

      if (servicePoint) {
        if (servicePoint.address && servicePoint.address.coordinates) {
          reset();
          selectMarker(id);

          $holder.find('.js-location-not-available').addClass('hide');
        } else {
          $holder.find('.js-location-not-available').removeClass('hide');
        }
      }
    });

    if (Object.keys(servicePointList).length > 1) {
      $holder.find('.js-show-all').removeClass('hide');

      $holder.find('.js-show-all').on('click', function onShowAll() {
        resize();
        reset();
      });
    }

    $mapHolder.find('.js-expand-map').on('click', function onExpandMap() {
      $mapHolder.toggleClass('expand', true);
      resize();
      $(this).addClass('hide');
      $mapHolder.find('.js-contract-map').removeClass('hide');
    });

    $mapHolder.find('.js-contract-map').on('click', function onContractMap() {
      $mapHolder.toggleClass('expand', false);
      resize();
      $(this).addClass('hide');
      $mapHolder.find('.js-expand-map').removeClass('hide');
    });
  };

  var initMapControls = function initMapControls() {
    $holder.find('.js-show-map').on('click', function onShowMap() {
      var id = $holder.data('service-point-id');

      if ($mapHolder.hasClass('hide')) {
        $mapHolder.removeClass('hide');
        $mapControls.removeClass('hide');
        $(this).addClass('toggled');

        if (!$map) {
          draw();
        }

        resize();
        reset();

        var servicePoint = getServicePoint(id);

        if (servicePoint) {
          if (servicePoint.address && servicePoint.address.coordinates) {
            selectMarker(id);

            $holder.find('.js-location-not-available').addClass('hide');
          } else {
            $holder.find('.js-location-not-available').removeClass('hide');
          }
        }
      } else {
        $mapHolder.addClass('hide');
        $mapControls.addClass('hide');
        $(this).removeClass('toggled');
      }

      setControllerEventListeners();
    });
  };

  var initAutoComplete = function initAutoComplete() {
    var servicePointsAmount = Object.keys(servicePointList).length;
    var placeholderString = $searchInput.attr('placeholder').replace('{0}', servicePointsAmount);

    $searchInput
      .attr('placeholder', placeholderString)
      .attr('aria-placeholder', placeholderString);

    $searchInput.autocomplete({
      source: function autocompleteSource(request, response) {
        var term = request.term.toLowerCase();
        var result = Object.keys(servicePointList).filter(function filterServicePoint(key) {
          return servicePointList[key].name.toLowerCase().indexOf(term) !== -1;
        }).map(function mapServicePoint(key) {
          return {
            value: servicePointList[key].id,
            label: servicePointList[key].name
          };
        });

        result = result.sort(function sortCallback(a, b) {
          return a.label > b.label ? 1 : -1;
        });

        response(result);
      },
      select: function onSelect(_, ui) {
        $searchInput.val(ui.item.label);

        var servicePoint = getServicePoint(ui.item.value);

        if (servicePoint) {
          if (servicePoint.address && servicePoint.address.coordinates) {
            selectMarker(ui.item.value);
            $holder.data('service-point-id', ui.item.value);
            $holder.find('.js-location-not-available').addClass('hide');
          } else {
            $holder.find('.js-location-not-available').removeClass('hide');
          }
        }

        $(root).trigger('mapWidget:selectServicePoint', ui.item.value);

        updateServicePointStatus(ui.item.label);

        return false;
      },
      focus: function onAutocompleteFocus(event, ui) {
        event.preventDefault();

        $searchInput.val(ui.item.label);

        if ($(window).width() < 768) {
          $('html, body').animate({
            scrollTop: $searchInput.offset().top - 5
          }, 100);
        }

        updateServicePointStatus(ui.item.label);

        return false;
      },
      open: function onOpen() {
        if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {
          $holder.find('.ui-autocomplete').off('menufocus hover mouseover');
        }
      },
      minLength: 0,
      delay: 100,
      appendTo: '.js-autocomplete-container',
      autoFocus: false
    }).data('ui-autocomplete')._renderItem = function addLabels(ul, item) {
      var $button = $('<button />').html(item.label);
      var $li = $('<li/>').attr('aria-label', item.label);

      $li.append($button);

      return $li.appendTo(ul);
    };

    $searchInput.on('click', function onClickSearch() {
      $searchInput.autocomplete('search', $(this).val());
    });

    $searchInput.find('li').on('touchstart', function onTouchStartSearch() {
      $searchInput.autocomplete('search', $(this).val());
    });

    $holder.find('.js-service-points-form button').on('click', function onClickSearchButton(event) {
      $searchInput.autocomplete('search', '');
      $searchInput.focus();

      event.preventDefault();
      return false;
    });
  };

  var getOrganisationsData = function getOrganisationsData(settings) {
    var deferred = $.Deferred();

    service.getOrganisations('page', settings.organisation, settings.buildings, {}, function onOrganisationsLoaded(response) {
      deferred.resolve(response.list);
    });

    return deferred.promise();
  };

  var initMapWidget = function initMapWidget() {
    initMapControls();

    if (Object.keys(servicePointList).length > 1) {
      initAutoComplete();
    }

    if (servicePointList.consortium && servicePointList.consortium.finna.notification) {
      $holder.find('.js-consortium-notification').html(servicePointList.consortium.finna.notification).removeClass('hide');
    }
  };

  return {
    hideMarker: hideMarker,
    selectMarker: selectMarker,
    resize: resize,
    reset: reset,
    draw: draw,
    init: function init(holder, widget, url, settings, servicePoints) {
      $holder = holder;
      $widget = widget;
      mapTileUrl = url;

      $mapControls = $holder.find('.js-map-controls');
      $searchInput = $holder.find('.js-service-points-form input');
      $mapHolder = $holder.find('.js-map-holder');

      service = finna.organisationInfo;

      if (!servicePoints) {
        getOrganisationsData(settings).then(function onOrganisationsLoaded(res) {
          servicePointList = res;

          initMapWidget();
        });
      } else {
        servicePointList = servicePoints;
        initMapWidget();
      }
    }
  };
});
