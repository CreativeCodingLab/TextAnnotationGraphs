
//TextStyle can contain FillStyle, which can contain a LineStyle.
//Both the FillStyle and the LineStyle can make use of linear gradients (for fills and strokes, or both).


class LinearGradient {
  constructor(svg, stopFunction) {

    this.stopFunction = stopFunction;    
    this.gradient = svg.gradient('linear', stopFunction);
    this.id = this.gradient.node.id;
  }
}


class FillStyle {
  //example 1: new LineStyle('#ff0000', 0.5, myLineStyleObject);
  //example 2: new LineStyle(myGradientObject, 0.25, myLineStyleObject);
  //example 3: new LineStyle('#0000ff'); //blue line, opacity 1, no stroke
  // only arg that's necessary is the first (fill color or Gradient object)


  constructor(fill, opacity, lineStyle) {

    if (fill instanceof LinearGradient) {
      this.fill = "url(#" + fill.id + ")";
    } else {
      this.fill = fill;
    }

    this.opacity = opacity;
    
    this.style = "fill:" + this.fill + ";opacity:" + this.opacity + ";";

    if (lineStyle != null) { //add everything from the LineStyle except for the fill attribute
      this.lineStyle = lineStyle;
      this.style += "stroke:" + lineStyle.stroke + ";stroke-width:"+lineStyle.width+";stroke-opacity:"+lineStyle.opacity+";stroke-dasharray:"+ lineStyle.dasharray + ";";
    }
  }

}

class LineStyle {
  //example 1: new LineStyle('#ff0000', 2, 0.7, "2,2");
  //example 2: new LineStyle(myGradientObject, 2, 0.7);
  //example 3: new LineStyle('#0000ff'); //blue line, width 1, opacity 1, no dash array
  // only arg that's necessary is the first (color or Gradient object)

  constructor(stroke, width, opacity, dasharray) {

    if (stroke instanceof LinearGradient) {
      this.stroke = "url(#" + stroke.id + ")";
    } else {
      this.stroke = stroke;
    }

    this.width = width;
    this.opacity = opacity;
    this.dasharray = dasharray;
    
    this.style = "fill:none;stroke:" + this.stroke + ";stroke-width:"+this.width+";stroke-opacity:"+this.opacity+";stroke-dasharray:"+ this.dasharray + ";";
  }
}

//basic - will add stroke/fills (masks?) later
class TextStyle {
  constructor(fontfamily, fontsize, fillStyle) {
    this.family = fontfamily;
    this.size = fontsize;

    this.style = { 'family':this.family, 'size':this.size };
    //this.style = "family:" + this.family + ";size:" + this.size;


    this.maxHeight = getMaxTextHeightForFont("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV", this.style);
    this.descent = getDescentForFont("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV", this.style);
    if (fillStyle != null) {  
      this.fillStyle = fillStyle;

      this.style["fill"] = fillStyle.fill;
      this.style["opacity"] = fillStyle.opacity;

      if (fillStyle.lineStyle != null) {
        this.style["stroke"] = fillStyle.lineStyle.stroke;
      }
    }
  }

}

function setupStyles(svg) {

  var styleArr = {};
  var ng_f = new LinearGradient(draw, (stop) => { stop.at(0, '#f00'); stop.at(1, '#00f') } );
  var ng_b = new LinearGradient(draw, (stop) => { stop.at(0, '#0ff'); stop.at(1, '#0f0') } );

  styleArr.forwardLine = new LineStyle(ng_f, 2, 1); 
  styleArr.backwardLine = new LineStyle(ng_b, 2, 1);
  styleArr.bothLine = new LineStyle("#000000", 2, 1);
  styleArr.noneLine = new LineStyle("#0000ff", 2, 1, "2,2");

  styleArr.handleFill = new FillStyle('#ff0000', 0.5);
  styleArr.wordFill = new FillStyle('#ffffff', 1.0, new LineStyle('#000', 1) );

  return styleArr;
}


function setupTexts(svg) {

  var textArr = {};

  //var ng_f = new LinearGradient(draw, (stop) => { stop.at(0, '#f00'); stop.at(1, '#00f') } );
  //textArr.wordText = new TextStyle('Brown', 20, new FillStyle(ng_f, 0.5, styles.backwardLine));
 
  textArr.wordText = new TextStyle('Brown', 14, new FillStyle('#444'));
  textArr.linkText = new TextStyle('Brown', 8, new FillStyle('#888'));

  return textArr; 
}


