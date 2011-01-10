# Horizonize User Guide

## Basic text formatting

By default, please put normal paragraph text in `<p>...</p>`. But you can use any formatting you like. You can nest tags as deep as you like as well.

Other basic styles are pending, but you can play with `<blockquote>...</blockquote>`, for example.

## Floats

By default, all text will flow cleanly from one column to the next.

However, you can specify that certain HTML elements "float" at specific positions so that the body text wraps around them, using one of the basic float classes.

A floating element can align to the top or the bottom, and it can be from 1-3 columns wide. Its height is always fluid based on what you put in it. The currently available float classes (and their widths) are:

    hz_float_col1_top       /* width: 310px */
    hz_float_col1_bottom    /* width: "     */ 
    hz_float_col2_top       /* width: 630px */
    hz_float_col2_bottom    /* width: "     */
    hz_float_col3_top       /* width: 950px */
    hz_float_col3_bottom    /* width: "     */

A simple example might be:

    <div class="hz_float_col2_top">
      <h2>Title</h2>
    </div>

If Horizonize notices one of these classes, it will make sure to float it at the next column break.

To make a float that fully bleeds to the top and bottom edges, use the hz_full_height class. For instance, here's an image that spans 3 columns, top-to-bottom:

    <div class="hz_float_col3_top hz_full_height" style="background-image: url('http://canopycanopycanopy.com/static/9/the_medium_and_the_tedium/MB-painting.jpg')"></div>

## Images

Contrary to standard HTML, please avoid `<img>` tags in a Horizonize document for any reason, as they will noticeably slow down the user experience.

Instead, always use `<div>`s with `background-image`s (as in the above & below examples). Later, special helpers will be available so that you don't have to manage all that inline CSS syntax by hand.

## Inline images

"Inline" images are images that do not float, and as such are part of the flowing body text. When inserting an inline image, use the `hz_inline_image` class and make sure the image is `320px` wide. This lets the image "bleed" out to the left & right of the column width. Example:

    <div class="hz_inline_image" style="background-image: url('http://canopycanopycanopy.com/static/8/r__adieu/rodgers-hart2.jpg'); height: 237px;"></div>

_Note_: inline images are not recommended for Triple Canopy pieces.

## Column breaks

To force a column break at a specific moment in the text, wrap the whole section of text before where you'd like the break in an element with the `hz_column_break_after` class. Example:

    <div class="hz_column_break_after">
      <p>
        This paragraph will sit alone in a column, followed by white space until the next one.
      </p>
    </div>

To make sure an element _never_ gets broken up, even if it lands at the bottom of a column, give it the `hz_non_breaking` class. (This is important for elements with IDs that may be referenced by JavaScript; if they are allowed to be broken, you'll end up with two elements with the same id.)

## General Notes

_All_ Horizonize classes begin with `hz_` so that it's immediately visible that they have special meta powers.
