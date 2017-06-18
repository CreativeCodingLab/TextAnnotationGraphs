class Link {
    constructor(eventId, trigger, args) {
      this.eventId = eventId;
      this.trigger = trigger;
      this.arguments = args;
      this.links = [];
      console.log('trigger\t\t', this.val);
      console.log.apply(null, args);

      this.mainSVG = null;
      this.svg = null;
      this.handles = [];
      this.lines = [];
      this.svgTexts = [];
    }

    init(svg) {
      // this.mainSVG = svg;
      // this.svg = svg.group().addClass('link');
      // if (this.trigger) {
      //   console.log(this.trigger.x, this.trigger.boxWidth, this.trigger.row);
      // }
    }

    /**
     * remove reference to a link
     * @return array containing the link, or undefined
     */
    detachLink(link) {
      let i = this.links.indexOf(link);
      if (i > -1) {
        return this.links.splice(i, 1);
      }
    }

    remove() {
      this.svg.remove();

      // remove references to link from all anchors
      if (this.trigger) { this.trigger.detachLink(this); }
      this.arguments.forEach(arg => arg.detachLink(this));
    }

    hasAnchor(a) {
      if (this.trigger && a === this.trigger) { return true; }
      return this.arguments.find(arg => arg.anchor === a);
    }

    get val() {
      return this.trigger && this.trigger.val;
    }
}
