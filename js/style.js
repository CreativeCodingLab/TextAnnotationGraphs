
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
      this.stroke = stroke;
      this.strokeStr = "url(#" + stroke.id + ")";
    } else {
      this.stroke = stroke;
      this.strokeStr = ''+ stroke;
    }

    this.width = width;
    this.opacity = opacity;
    this.dasharray = dasharray;
    
    this.style = "fill:none;stroke:" + this.strokeStr + ";stroke-width:"+this.width+";stroke-opacity:"+this.opacity+";stroke-dasharray:"+ this.dasharray + ";";
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

  //this is how you create a linear gradient, which can be used for fills and strokes (and can also be applied to text fills and strokes)
  //var ng_f = new LinearGradient(draw, (stop) => { stop.at(0, '#f00'); stop.at(1.0, '#00f') } );
  //var ng_b = new LinearGradient(draw, (stop) => { stop.at(0, '#0ff'); stop.at(1.0, '#0f0') } );
  var ng_f = new LinearGradient(draw, '#ffff00', '#ff00ff');
  var ng_b = new LinearGradient(draw, '#00ff00', '#0000ff');

 
  //types of links (not necessarily related to direction
  styleArr.gradientLine1 = new LineStyle(ng_f, 6, 0.5); 
  styleArr.gradientLine2 = new LineStyle(ng_b, 6, 0.5);
  styleArr.bothLine = new LineStyle("#ff0000", 1, 1, "2,5,2");
  styleArr.noneLine = new LineStyle("#0000ff", 1, 1, "2,2");
  styleArr.simpleLine = new LineStyle("#000000", 1);
  
  styleArr.hiddenLine = new LineStyle("#ffff", 6, 0.0);



  styleArr.handleFill = new FillStyle('#ff0000', 0.5);
  styleArr.wordFill = new FillStyle('#ffffff', 1.0, new LineStyle('#000', 1) );

  styleArr.labelEvenFill = new FillStyle(evenRowsColor);
  styleArr.labelOddFill = new FillStyle(oddRowsColor);

  styleArr.arrowFill = new FillStyle('#000000', 1.0);

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


