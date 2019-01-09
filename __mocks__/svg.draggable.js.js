/**
 * svg.draggable.js doesn't play nice with Jest, for some reason.  (Probably
 * because it expects `SVG` to be available as a bare global)
 * We don't need its functionality in testing, so we're replacing it
 * completely with this mock that does nothing.
 */