
//TextStyle can contain FillStyle, which can contain a LineStyle.
//Both the FillStyle and the LineStyle can make use of linear gradients (for fills and strokes, or both).


class LinearGradient {
  /*
  constructor(svg, stopFunction) {

    this.stopFunction = stopFunction;    
    //this.gradient = svg.gradient('linear', stopFunction).from(from).to(to);
    this.gradient = svg.gradient('linear', stopFunction).from(0,0).to(1,0);

//from(0, 0).to(0, 1)
    
    this.id = this.gradient.node.id;
  }
  */

  constructor(svg, c1, c2) {
    this.c1 = c1;
    this.c2 = c2;

    this.stopFunction = function(stop) { 
      stop.at(0.0, c1)
      stop.at(1.0, c2) 
    };
    
    this.gradient = svg.gradient('linear', this.stopFunction); //.from(0,0).to(1,0);
    this.id = this.gradient.node.id;
  }
}


class FillStyle {
  //example 1: new LineStyle('#ff0000', 0.5, myLineStyleObject);
  //example 2: new LineStyle(myGradientObject, 0.25, myLineStyleObject);
  //example 3: new LineStyle('#0000ff'); //blue line, opacity 1, no stroke
  // only arg that's necessary is the first (fill color or Gradient object)


  constructor(fill, opacity, lineStyle) {

    this.fill = fill;

    if (fill instanceof LinearGradient) {
      this.fillStr = "url(#" + fill.id + ")";
    } else {
      this.fillStr = fill;
    }

    this.opacity = opacity;

    if (lineStyle != null) { //add everything from the LineStyle except for the fill attribute
      this.lineStyle = lineStyle;
    }

    this.style = this.makeStyleString(this.fillStr, this.opacity, this.lineStyle);
    this.hover = '' + this.style;
    this.select = '' + this.style;
    this.hoverAndSelect = '' + this.style;

  }

  makeStyleString(f, o, ls) {
    
    var ss = "fill:" + f + ";opacity:" + o + ";";

    if (ls != null) {
      ss += "stroke:" + ls.strokeStr + ";stroke-width:"+ls.width+";stroke-opacity:"+ls.opacity+";stroke-dasharray:"+ ls.dasharray + ";";
    }

    return ss;
  }


  hovering(f, o, ls) {
    if (f instanceof LinearGradient) {
      this.hover = this.makeStyleString("url(#" + f.id + ")", o, ls);
    } else {
      this.hover = this.makeStyleString(f, o, ls);
    }
  }

  
  selecting(f, o, ls) {
    if (f instanceof LinearGradient) {
      this.select = this.makeStyleString("url(#" + f.id + ")", o, ls);
    } else {
      this.select = this.makeStyleString(f, o, ls);
    }
  }

  hoveringAndSelecting(f, o, ls) {
    if (f instanceof LinearGradient) {
      this.hoverAndSelect = this.makeStyleString("url(#" + f.id + ")", o, ls);
    } else {
      this.hoverAndSelect = this.makeStyleString(f, o, ls);
    }
  }


}


class ArrowStyle {
  constructor(xoff, yoff, shapeFunc, fillStyle) {
    console.log("in ArrowStyle constructor");
    this.xoff = xoff;
    this.yoff = yoff;

    this.fillStyle = fillStyle;
    this.shapeFunc = shapeFunc;

 }

  draw(svg, x, y){
      var path = this.shapeFunc(svg, x, y, this.xoff, this.yoff, this.fillStyle);  
        return path;
  }

  toString() {
    return "cx:" + (this.xoff) + ";cy:" +(this.yoff) + ";" + this.fillStyle.style;
  }
}
 // "cx:" + x + ";cy:" +(y-3) + ";" + styles.arrowFill.style


//TODO - I think the arrows / end-of-link glyphs should be defined in here as well - the LineStyle class should let the user compose strokes and arrow look+feel (right now just stroke css attrs) 
class LineStyle {
  //example 1: new LineStyle('#ff0000', 2, 0.7, "2,2");
  //example 2: new LineStyle(myGradientObject, 2, 0.7);
  //example 3: new LineStyle('#0000ff'); //blue line, width 1, opacity 1, no dash array
  // only arg that's necessary is the first (color or Gradient object)

  constructor(stroke, width, opacity, dasharray) {

    this.stroke = stroke;

    if (stroke instanceof LinearGradient) {
      this.strokeStr = "url(#" + stroke.id + ")";
    } else {
      this.strokeStr = ''+ stroke;
    }

    this.width = width;
    this.opacity = opacity;
    this.dasharray = dasharray;

    this.style = this.makeStyleString(this.strokeStr, this.width, this.opacity, this.dasharray);

    this.hover = '' + this.style;
    this.select = '' + this.style;

    this.upArrow = defaultUpArrow;
    this.downArrow = defaultDownArrow;

    //console.log("upArrow = " + this.upArrow.toString());
  }


  hovering(s, w, o, da) {
    if (s instanceof LinearGradient) {
      this.hover = this.makeStyleString("url(#" + s.id + ")", w, o, da);
    } else {
      this.hover = this.makeStyleString(s, w, o, da);
    }
  }

  
  selecting(s, w, o, da) {
    if (s instanceof LinearGradient) {
      this.select = this.makeStyleString("url(#" + s.id + ")", w, o, da);
    } else {
      this.select = this.makeStyleString(s, w, o, da);
    }
  }

  update() {
    this.style = this.makeStyleString(this.strokeStr, this.width, this.opacity, this.dasharray);
  }

  makeStyleString(ss, w, o, da) {
    return "fill:none;stroke:" + ss + ";stroke-width:" + w + ";stroke-opacity:" + o +";stroke-dasharray:"+ da + ";";
  }
  
  clone() {
    return new LineStyle(this.stroke, this.width, this.opacity, this.dasharray);
  }

  


  /* 
  //for updating a linear gradient with two stops
  update(a, b) {

    if (this.stroke instanceof LinearGradient) {
      var s = this.stroke.gradient.get(0);
      var e = this.stroke.gradient.get(1);

      var uc1 = chroma.mix(this.stroke.c1, this.stroke.c2, a).hex();
      var uc2 = chroma.mix(this.stroke.c1, this.stroke.c2, b).hex();

      console.log(a +"%: uc1 = " + uc1);
      console.log(b +"%: uc2 = " + uc2);

      this.stroke.stopFunction = function(stop) {
        stop.at(0.0, uc1, 1.0);
        stop.at(1.0, uc2, 1.0);
      };

      //this.stroke.gradient.update( this.stroke.stopFunction );
      this.stroke.gradient.update( function(stop) {
        stop.at(0.0, uc1, 1.0)
        stop.at(1.0, uc2, 1.0)
      });
      
      //s.update(0.0, uc1);
      //e.update(1.0, uc2);
    }

  }

  reset() {
     if (this.stroke instanceof LinearGradient) {
       var s = this.stroke.gradient.get(0);
       var e = this.stroke.gradient.get(1);


       this.stroke.stopFunction = function(stop) { stop.at(0, this.stroke.c1); stop.at(1.0, this.stroke.c2) };
   
        this.stroke.gradient.update(function(stop) {
          this.stroke.gradient.update(this.stroke.stopFunction);
        });

        
        //this.stroke.gradient.update(function(stop) {
        //stop.at(0.0, this.stroke.c1, 1.0);
        //stop.at(1.0, this.stroke.c2, 1.0);
        //});
        
     }

  }
  */

}

class TextStyle {
  constructor(fontfamily, fontsize, fillStyle) {
    this.family = fontfamily;
    this.size = fontsize;

    this.style = { 'family':this.family, 'size':this.size };
   
    this.maxHeight = getMaxTextHeightForFont("Xlj", this.style);
    this.descent = getDescentForFont("Xlj", this.style);
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


//arrow paths
var circleArrowPath = (svg, x, y, xoff, yoff, fillStyle) => {
  
  var path = svg.circle(5);
  path.style("cx:" + (x+xoff) + ";cy:" +(y+yoff) + ";" + fillStyle.style);

  return path;
}

var downArrowPath = (svg, x, y, xoff, yoff, fillStyle) => {

  var arrowH = 5; 
  var arrowMH = 5;
  var arrowW = 3; 
  
  var ux = x+xoff;
  var uy = y+yoff;

  var a1 = 'M' + ux + ',' + uy + ' ';
  var a2 = 'L' + (ux-arrowW) + ',' + (uy-arrowH) + ' ';
  var a3 = 'L' + (ux) + ',' + (uy-arrowMH) + ' ';
  var a4 = 'L' + (ux+arrowW) + ',' + (uy-arrowH);
  var a5 = 'z';

  var arrow = a1 + a2 + a3 + a4;

  var path = svg.path(arrow);
  path.style(fillStyle.style);

  return path;
}


//figure out best place to put this
var defaultUpArrow = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
var defaultDownArrow = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0));
  

//set up link styles and word styles
function setupStyles(svg) {

  var styleArr = {};

  var ng_f = new LinearGradient(svg, '#ffff00', '#ff00ff');
  var ng_b = new LinearGradient(svg, '#00ff00', '#0000ff');


  //this is how you create a linear gradient, which can be used for fills and strokes (and can also be applied to text fills and strokes)
  //var ng_f = new LinearGradient(draw, (stop) => { stop.at(0, '#f00'); stop.at(1.0, '#00f') } );
  //var ng_b = new LinearGradient(draw, (stop) => { stop.at(0, '#0ff'); stop.at(1.0, '#0f0') } );
  //var ng_f = new LinearGradient(draw, '#ffffff', '#000000');
   //default arrow style 
  styleArr.arrowFill = new FillStyle('#000000', 1.0);


  //types of links (not necessarily related to direction)
  styleArr.gradientLine1 = new LineStyle(ng_f, 4, 0.5); 
  styleArr.gradientLine1.hovering(ng_f, 8, 0.5); 

  styleArr.gradientLine2 = new LineStyle(ng_b, 4, 0.5);
  styleArr.gradientLine2.hovering(ng_b, 8, 0.5);

  styleArr.bothLine = new LineStyle("#ff0000", 1, 0.5, "2,5,2");
  styleArr.bothLine.hovering("#ff0000", 4, 0.5, "2,5,2");

  styleArr.noneLine = new LineStyle("#0000ff", 1, 0.5, "2,2");
  styleArr.noneLine.hovering("#0000ff", 4, 0.5, "2,2");

  styleArr.simpleLine = new LineStyle("#000000", 4, 0.5);
  styleArr.simpleLine.hovering("#000000", 8, 0.5);

  styleArr.hiddenLine = new LineStyle("#ffffff", 6, 0.0);



  styleArr.handleFill = new FillStyle('#000000', 0.0);
  styleArr.handleFill.hovering('#ffcccc', 0.7);

  styleArr.wordFill = new FillStyle('#ffffff', 1.0, new LineStyle('transparent', 1) );
  styleArr.wordFill.hovering('#ffffff', 1.0/*, new LineStyle('#000000', 1)*/);
  styleArr.wordFill.selecting('#fcc', 1.0, new LineStyle('#c99', 1));
  styleArr.wordFill.hoveringAndSelecting('#fcc', 1.0/*, new LineStyle('#000000', 1)*/);

  styleArr.labelEvenFill = new FillStyle(evenRowsColor);
  styleArr.labelOddFill = new FillStyle(oddRowsColor);

  styleArr.rowRectEvenFill = new FillStyle(evenRowsColor);
  styleArr.rowRectOddFill = new FillStyle(oddRowsColor);
  styleArr.rowLineStroke = new LineStyle("#555555", 0.5, 1.0);
  styleArr.rowDragRectFill = new FillStyle('#000');

    return styleArr;
}


function setupTexts(svg) {

  var textArr = {};

  //var ng_f = new LinearGradient(draw, (stop) => { stop.at(0, '#f00'); stop.at(1, '#00f') } );
  //textArr.wordText = new TextStyle('Brown', 20, new FillStyle(ng_f, 0.5, styles.backwardLine));

  textArr.wordText = new TextStyle('Brown, BrownPro, futura, helvetica', 12, new FillStyle('#444'));
  textArr.linkText = new TextStyle('Brown, BrownPro, futura, helvetica', 10, new FillStyle('#888'));

  return textArr; 
}


