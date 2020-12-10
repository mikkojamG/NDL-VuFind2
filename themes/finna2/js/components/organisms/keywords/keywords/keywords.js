/* global finna */
finna.keywords = (function keywords() {
  var updateCounter = function updateCounter() {
    var $keywords = $('.js-keyword');

    $('.js-keywords-counter').text($keywords.length);
  };

  var getTags = function getTags() {
    $('.js-spinner').show();

    $.ajax({
      url: '/finna/tags',
      method: 'GET'
    }).done(function onRequestDone(response) {
      $('.js-keywords-list').empty();

      $.each(response.tags, function appendKeyword(index, tag) {
        var $newKeyword = $(
          '<button data-tag-id="' +
            tag.id +
            '" class="btn keyword js-keyword"><span class="keyword__button-text">' +
            tag.value +
            '</span><i class="fa fa-times keyword__button-icon" aria-hidden="true"></i></button>'
        );

        $('.js-keywords-list').append($newKeyword);
        $newKeyword.on('click', deleteKeyword);
      });

      updateCounter();

      $('.js-spinner').hide();
    });
  };

  var deleteKeyword = function deleteKeyword() {
    var editMode = $('.js-keywords-wrapper').hasClass('open');

    if (editMode) {
      $('.js-spinner').show();

      var data = {
        id: $(this).data('tag-id').toString()
      };

      $.ajax({
        url: '/finna/tags',
        method: 'DELETE',
        data: JSON.stringify(data)
      }).done(function onRequestDone() {
        getTags();
      });
    }
  };

  var initAddKeyword = function initAddKeyword() {
    var $input = $('.js-keywords-wrapper').find('input[id="keyword"]');
    var $form = $('.js-add-keyword');

    $input.one('blur keydown', function onInputTouched() {
      $(this).addClass('touched');
    });

    $form.on('submit', function onSubmit(event) {
      event.preventDefault();

      $form.removeClass('invalid');

      if ($form[0].checkValidity()) {
        $('.js-spinner').show();

        $.ajax({
          url: '/finna/tags',
          method: 'POST',
          data: JSON.stringify({tag: $input.val()})
        }).done(function onRequestDone() {
          getTags();
        });
      } else {
        $form.addClass('invalid');
      }
    });
  };

  var initToggle = function initToggle() {
    var $toggleModuleButton = $('.js-toggle-keywords');

    $toggleModuleButton.on('click', function onToggleModule() {
      $(this).toggleClass('open');
      $('.js-keywords-wrapper').toggleClass('open');
      $('.js-controls').toggleClass('open');
      $('.js-current').toggleClass('open');
    });
  };

  var initKeywords = function initKeywords() {
    getTags();
  };

  var init = function init() {
    initKeywords();
    initToggle();
    initAddKeyword();
  };

  return {
    init: init
  };
})();
