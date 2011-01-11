/**
* jquery.horizonize.js
* Adam Florin - 2010
* 
* Parse freeform HTML with markup cues and lay it out horizontally in columns.
*/
jQuery.fn.horizonize = function(source_html_sel) {
  return this.each(function() {
    // constants
    var HZ_FLOAT = '*[class^="hz_float_"]'; // for custom hz_ markup queues
    var HZ_NON_BREAKING = '.hz_inline_image, .hz_non_breaking'; // for custom hz_ markup queues
    var HZ_FOOTNOTE = 'a.hz_footnote';
    var HZ_FOOTNOTE_TEXT = '.hz_footnote_text';
    var FOOTNOTE_TEXT_OUTER_HEIGHT = 25; // OK to tweak.
    var FOOTNOTE_DEFAULT_Z_INDEX = 999; // make it high, we count down
    var COLUMN_WIDTH = 320; // hard-coding for speed
    var FULL_HEIGHT = 520; // hard-coding for speed
    var COLUMN_HEIGHT = FULL_HEIGHT - 15; // hard-coding for speed. minus .hz_column.margin-bottom
    var MIN_HEIGHT_FOR_COLUMN = 100;
    
    // handles
    var $piece_container = $(this).empty(); // clear out whatever's in there.
    var $source = $(source_html_sel);
    var $sandbox = $('<div id="hz_sandbox"></div>').appendTo('body');
    var $current_column;
    var floats = new Array();
    var $footnote_texts;
    
    // init.
    parse_source();
    
    
    /**
    * Main entrypoint
    */
    function parse_source() {
      // apply indents to paragraph text
      apply_indents();
      
      // first, pull all footnote text out of source; it's like a "super-float" that floats above floats
      $footnote_texts = $source.find(HZ_FOOTNOTE_TEXT).detach();
      
      // do parsing in recursive loop
      walk_read_nodes($source);
      
      // empty out float queue in case anything's kicking around in there
      process_float_queue();
      
      // dump contents into reader-visible pane
      $sandbox.contents().appendTo($piece_container);
      
      // calling all "onlayout" handlers
      $(document).trigger('layout');
    }
    
    /**
    * Main recursive loop through source node tree
    * We scan through $read_nodes, clone them to $write_nodes, and append them to $write_context.
    * 
    * returns $write_context (i.e., writing context) to itself
    */
    function walk_read_nodes($read_nodes, $write_context) {
      
      // sift through source node tree
      $read_nodes.contents().each(function() {
        
        // clone immediately
        $write_node = prepare_write_node(this);
        
        // if node has a float markup queue...
        if ($write_node.is(HZ_FLOAT)) {
          
          // ...put it the float queue for later processing.
          floats.push($write_node);
          
        // no markup queues, and it's not a marginal node
        } else if (!node_is_marginal(this)) {
          
          // write it out
          $write_context = write_node_to_column(this, $write_node, $write_context);
          
          // if we just wrote out a footnote,
          var $footnote_nodes = $write_node.find(HZ_FOOTNOTE);
          if ($footnote_nodes.length || $write_node.is(HZ_FOOTNOTE)) {
            
            // set up its text
            write_footnote_text($footnote_nodes.length ? $footnote_nodes : $write_node, $write_context);
          }
        }
        
        // do column break if author specified one. (section didn't overflow)
        if ($write_node.hasClass('hz_column_break_after')) $write_context = null;
      });
      
      // do column break if author specified one. (section overflowed)
      if ($read_nodes.hasClass('hz_column_break_after')) $write_context = null;
      
      // reset $write_context (checking depth from top against read tree)
      if ($write_context != null) {
        $write_context = calibrate_write_depth($read_nodes, $write_context);
      }
      
      return $write_context;
    }
    
    /**
    * write flowing elements across however many columns are necessary.
    */
    function write_node_to_column(read_node, $write_node, $write_context) {
      
      // loop in case we have to re-try same node in new column(s)
      while (true) {
        
        // create a column if one isn't already open
        if ($write_context == null) $write_context = create_column();

        // put node in column
        $write_node.appendTo($write_context);

        // if it doesn't fit...
        if (column_overflow()) {

          // pluck it off, then.
          $write_node.remove();

          // if node is non-breaking,
          if ($write_node.is(HZ_NON_BREAKING)) {
            
            // force a column break (and let the loop try again)
            $write_context = null;
            
            // WARNING. if this is an inline image that's just too tall,
            // (unfortunately we can't reliably check the height of arbitrary non-brekaing elements)
            if (parseInt($write_node.css('height')) > COLUMN_HEIGHT) {
              
              // cut our losses and render it where it stands; it's the best we can do.
              $write_node.appendTo($write_context);
              break;
            }
            
          // if node is breakable, break it up & don't loop
          } else {
            
            $write_context = break_up_node(read_node, $write_context);
            break;
          }
          
        // the node fits; don't loop
        } else break;
      }
      return $write_context;
    }
    
    /**
    * if node is not non-breaking, then break it up.
    */
    function break_up_node(read_node, $write_context) {
      
      // check type to determine how to break it
      if (read_node.nodeType == Node.TEXT_NODE) {
        
        // text nodes get chopped up by words
        $write_context = write_text_to_column($(read_node), $write_context);
        
      } else {
        
        // put an empty clone of it in the column (the same one the whole didn't fit into)
        // and trigger the recursion.
        var $write_sub_context = $(read_node).clone().empty().appendTo($write_context);
        $write_context = walk_read_nodes($(read_node), $write_sub_context);
      }
      return $write_context;
    }
    
    /**
    * Write text node out, one word at a time.
    * Very analogous to above walk_read_nodes.
    * 
    * $read_node must be a text node.
    */
    function write_text_to_column($read_node, $write_context) {
      
      // grab original contents now as we'll be overwriting them
      var original_contents = $write_context.html();
      
      // chop up text into individual words; we'll bisect them into two arrays spanning the column break
      // split by space only so that &nbsp;s are preserved
      var source_words = $read_node.text().split(/ /);
      var words_that_fit = new Array();
      
      // go through each word to see if it fits
      while (source_words.length) {
        
        // put word into column
        words_that_fit.push(source_words.shift());
        $write_context.html(original_contents + words_that_fit.join(" "));
        
        // one word too many!
        if (column_overflow()) {
          
          // pluck off the camelback-breaking-straw word and write to column
          source_words.unshift(words_that_fit.pop());
          $write_context.html(original_contents + words_that_fit.join(" "));

          // create a new column with a nice blank node tree in there to write to.
          $write_context = create_column_with_node_tree($read_node);
          words_that_fit = new Array();
          original_contents = "";
       }
      }
      
      return $write_context;
    }
    
    /**
    * Create new column, absolutely-positioned.
    */
    function create_column() {
      // first, check for anything that needs writing in float queue
      process_float_queue();
      
      // then get our available coords
      var new_column_coords = available_space();
      
      // write the column (& store in instance var)
      $current_column = $('<div class="hz_column"></div>')
        .css(new_column_coords) // don't need to prune out max_height?
        .attr('hz_max_height', new_column_coords.max_height)
        .appendTo($sandbox);
      
      return $current_column;
    }
    
    /**
    * Create empty (but possibly nested) node for content to go.
    * 
    * Walk DOWN the tree from SOURCE node to current node, making empty clones as we go.
    */
    function create_column_with_node_tree($read_node) {
      var $write_context = create_column();
      $($read_node.parentsUntil(source_html_sel).get().reverse()).each(function() {
        $write_context = $(this).clone().empty().appendTo($write_context);
      });
      return $write_context;
    }
    
    /**
    * Back out of the tree created by create_column_with_node_tree above
    * by just numerically comparing the depth of read node & write context from the top.
    */
    function calibrate_write_depth($read_node, $write_context) {
      var read_depth = $read_node.parentsUntil(source_html_sel).get().length;
      while (read_depth < (write_depth = $write_context.parentsUntil('#hz_sandbox').get().length)) {
        $write_context = $write_context.parent();
      }
      return $write_context;
    }
    
    /**
    * check for nodes in float queue, write them out
    */
    function process_float_queue() {
      while (floats.length > 0) {
        var $float = $(floats.shift());
        
        var new_float_coords = available_space($float);
        
        $float.css({left: new_float_coords.left}).appendTo($sandbox);
      }
    }
    
    /**
    * check height against previously-determined max height. (optimization)
    * 
    * Note: jQuery coordinate math can get expensive (position(), offset(), height()...)
    * and this is a real workhorse method. Try to keep calls to a minimum if possible.
    */
    function column_overflow() {
      return $current_column.height() > $current_column.attr('hz_max_height');
    }
    
    /**
    * Check last column to see where our pointer position is.
    * Then see if any floats are sharing vertical space where our new content should go,
    * and make sure we have a minimum meaningful amount of height
    * 
    * Used for columns and floats alike; only floats pass a $write_float in, though.
    * 
    * returns top/left coords plus max_height
    */
    function available_space($write_float) {
      var space_coords = {
        top: 0,
        left: 0,
        max_height: 0
      };
      var min_required_height =  MIN_HEIGHT_FOR_COLUMN;
      var required_width = COLUMN_WIDTH;
      var write_float_position = null;
      
      // get some information about $write_float if it exists.
      // since it's in a hidden div, need to attach it to visible element to query it, then remove it.
      if ($write_float) {
        $write_float.appendTo($sandbox);
        
        min_required_height = $write_float.height();
        required_width = $write_float.width();
        
        if (parseInt($write_float.css('top')) == 0) write_float_position = 'top';
        else if (parseInt($write_float.css('bottom')) == 0) write_float_position = 'bottom';
        
        $write_float.detach();
      }
      
      // set left 'pointer location' based on current column if one is open.
      if ($current_column) {
        space_coords.left = parseInt($current_column.css('left')) + COLUMN_WIDTH;
      }
      
      // loop to advance to next column in case this one is full
      while (true) {
        var column_occupied = false;
        
        // reset in case we looped
        space_coords.top = 0;
        space_coords.max_height = $write_float ? FULL_HEIGHT : COLUMN_HEIGHT;
        
        // WARNING. element is requesting more height than any column can provide.
        // cut our losses and render it where it stands; it's the best we can do.
        if (min_required_height > space_coords.max_height) break;
        
        // now sift through ALL floating boxes to see if ANY share vertical space with our new column.
        // note: there might be a top AND a bottom to avoid.
        $sandbox.find(HZ_FLOAT).each(function() {
          var $float = $(this);
          var float_left = parseInt($float.css('left'));
          var float_right = float_left + $float.outerWidth(true);
          
          // there's a float in the vertical space we're considering (checking left AND right bounds)
          if ((space_coords.left < float_right) && ((space_coords.left + required_width) > float_left)) {
            
            // float is top-aligned
            if (parseInt($float.css('top')) == 0) {
              
              // if $write_float is top-aligned, too, skip this column
              if (write_float_position == 'top') {
                column_occupied = true;
                
              // otherwise, set up top & max_height
              } else {
                var float_bottom = $float.outerHeight(true);
                space_coords.top = float_bottom;
                space_coords.max_height -= float_bottom;
              }
              
            // float is bottom-aligned (and write float, if it exists, _isn't_)
            } else if (parseInt($float.css('bottom')) == 0) {
              
              // if $write_float is bottom-aligned, too, skip this column
              if (write_float_position == 'bottom') {
                column_occupied = true;
              
              // otherwise, set up top & max_height
              } else {
                var float_top = space_coords.max_height - $float.outerHeight(true);
                space_coords.max_height = float_top;
              }
            }
          }
        });
        
        // if we don't have the vertical space we need or the space we want is occupied,
        if (space_coords.max_height < min_required_height || column_occupied) {
          // advance to next column and allow loop
          space_coords.left += COLUMN_WIDTH;
        
        // we're all good; break the loop!
        } else break;
      }
      
      return space_coords;
    }
    
    /**
    * we just wrote a footnote, now we need to set up its footnote_text
    * 
    * set up its left position, bump old footnotes up, and manage z-index
    * so popups look good. And shrink column, too.
    * 
    * not sure why this is getting called 2x for 1 footnote,
    * which is why already_written sanity check is in there.
    */
    function write_footnote_text($footnote_nodes, $write_context) {
      
      // for _each_ footnote in $write_node
      $footnote_nodes.each(function() {
        var footnote_text_selector = '#footnote_text_' + $(this).text();
        var already_written = ($sandbox.find(footnote_text_selector).length > 0);
        
        // sanity check
        if (!already_written) {
          // prepare footnote_text with default CSS attributes
          var $write_footnote = $footnote_texts.filter(footnote_text_selector).css({
            left: $current_column.css('left'),
            'z-index': FOOTNOTE_DEFAULT_Z_INDEX
          });

          // if there were already footnotes in this column, shift them up accordingly
          $sandbox.find(HZ_FOOTNOTE_TEXT).each(function() {
            if ($(this).css('left') == $write_footnote.css('left')) {
              $(this).css({
                bottom: parseInt($(this).css('bottom')) + FOOTNOTE_TEXT_OUTER_HEIGHT,
                'z-index': parseInt($(this).css('z-index')) - 1
              });
            }
          });

          // write out footnote_text
          $write_footnote.appendTo($sandbox);

          // subtract footnote height from column max_height
          $current_column.attr('hz_max_height', $current_column.attr('hz_max_height') - FOOTNOTE_TEXT_OUTER_HEIGHT);
        }
      });
    }
    
    /**
    * add some non-breaking spaces at the beginnings of most paragraphs.
    */
    function apply_indents() {
      // TODO:SOMEONE MAKE GLOBAL OPTION THAT THESE AREN'T THERE first, make sure indents are _never_ applied to the first paragraph of a section
      $source.find('.hz_column_break_after').each(function() {
        $(this).find('p:first').addClass('hz_no_indent');
      });
      
      // apply indents everywhere they're expected
      $source.find('p').not('.hz_no_indent, .opening').each(function() {
        $(this).html("" + $(this).html());
      });
    }
    
    /**
    * utility to sift out things that aren't worth our time:
    * - empty text nodes can trigger incorrect column creation
    * - comments are noops
    */
    function node_is_marginal(node) {
      return ((node.nodeType == Node.TEXT_NODE) && (node.nodeValue.match(/^\s*$/)))
        || (node.nodeType == Node.COMMENT_NODE);
    }
    
    /**
    * clone node & do basic sanitization (strip problematic child nodes)
    */
    function prepare_write_node(node) {
      var $write_node = $(node).clone();
      
      // remove all child scripts (so duplicate events are not bound)
      $write_node.find('script').remove();
      
      return $write_node;
    }
    
  });
};
