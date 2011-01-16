# Horizonize

Horizonize is a jQuery plugin to lay out any HTML content in attractive, horizontally-scrolling columns.

## Requirements

Horizonize depends on:

* [jQuery](http://jquery.com/)
* [Blueprint CSS](http://www.blueprintcss.org/)

## Installation and Usage

Include `jquery.horizonize.js` and `horizonize.css` in your HTML doc.

Set up basic HTML elements:
  
    <!-- empty div for horizonize to write to -->
    <div id="piece_viewer" class="content_viewport span-24 last">
      <div class="content_container">
      </div>
    </div>
  
    <!-- where horizonize will read FROM. Fill with content! -->
    <div id="source_html" class="hide">
      Lorem ipsum...
    </div>

Then, in jQuery DOM ready event, call:

    $('#piece_viewer .content_container').horizonize('#source_html');

Horizonize will turn all your old-school vertical-scrolling content into columnar layouts!

## Examples

Please see included `demo.html` for a more thorough example.

## Layout cues

Horizonize has a number of custom layout cues that begin with the `hz_` prefix. Please see
USAGE for a detailed description.

## Copyright

Copyright (c) 2010-2011 Adam Florin. See LICENSE.txt for further details.
