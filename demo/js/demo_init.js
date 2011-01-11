/**
* horizonize.js
* Adam Florin - 2011
*/

// for IE8
if (Node === undefined) var Node = {ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8};

/**
* one call to trigger horizonize layout process
*/
$(document).ready(function() {
  $('#piece_viewer .content_container').horizonize('#source_html');
});

/**
* CALLBACK from horizonize once layout is complete!
*/
$(document).bind('layout', function() {
  
  // size the container down to the content
  snug_fit_piece_container($('#piece_viewer .content_container'));
  
  // bind footnote_text toggle events
  $('.hz_footnote_text .viewport').toggle(function() {
    // close all other footnotes
    $('.hz_footnote_text .viewport').not(this).animate({height: FOOTNOTE_CLOSED_HEIGHT}, 100);

    // open this one
    $(this).animate({height: $(this).find('.text').height()}, 100);
  }, function() {
    // close this footnote
    $(this).animate({height: FOOTNOTE_CLOSED_HEIGHT}, 100);
  });
});

/**
* Size the container down to the content
* 
* This method is pasted here from another triple_canopy library
* (jquery.discrete_scroll.js) which is not yet open-source.
*/
function snug_fit_piece_container($container) {
  if (!$container.is(':empty') && $container.is(':visible')) {
    var $last_child = $container.children().last();
    $last_child.addClass('last');
   
    var effective_container_width;
    if($last_child.position()){
      effective_container_width = ($last_child.position().left + $last_child.outerWidth());
    } else {
      effective_container_width = ($last_child.outerWidth());
    }
    $container.width(effective_container_width);
  }
}
