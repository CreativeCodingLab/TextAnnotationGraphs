class LinearGradient {
  constructor(svg, stopFunction) {

    this.stopFunction = stopFunction;    
    this.gradient = svg.gradient('linear', stopFunction);
    this.id = this.gradient.node.id;
  }
}


class LineStyle {
    //example 1: new LineStyle('#ff0000', 2, 0.7, "2,2");
    //example 2: new LineStyle(myGradientObject, 2, 0.7);
    //example 3: new LineStyle('#0000ff'); //blue line, width 1, opacity 1, no dash array
    // only arg that's necessary is the first (color or Gradient object)

    constructor(stroke, width, opacity, dasharray) {

      if (stroke instanceof LinearGradient) {
        this.stroke = "stroke:url(#" + stroke.id + ");";
      } else {
        this.stroke = "stroke:" + stroke + ";";
      }
       
      this.width = "stroke-width:" + width + ";";

      this.opacity = "stroke-opacity:" + opacity + ";";

      this.dasharray = "stroke-dasharray:" + dasharray + ";";

      this.style = "fill:none;" + this.stroke + this.width + this.opacity + this.dasharray;
    }

}


function setupStyles(svg) {

var styleArr = {};

var ng_f = new LinearGradient(draw, (stop) => { stop.at(0, '#f00'); stop.at(1, '#00f') } );
var ng_b = new LinearGradient(draw, (stop) => { stop.at(0, '#0ff'); stop.at(1, '#0f0') } );

var line_forward = new LineStyle(ng_f, 2, 1);
var line_backward = new LineStyle(ng_b, 2, 1);
var line_both = new LineStyle("#000000", 2, 0.5);
var line_none = new LineStyle("#0000ff", 2, 1, "2,2");

styleArr.forwardLine = line_forward.style;
styleArr.backwardLine = line_backward.style;
styleArr.bothLine = line_both.style;
styleArr.noneLine = line_none.style;


return styleArr;

}
