class Link {
    constructor(wordArr, directionArr, style, textStr, textStyle) {
      
        this.words = wordArr; //words (or links) that this link links to
        this.arrowDirections = directionArr;

        //this.direction = direction; //see enums.directions
        this.style = style;

        this.textStr = textStr;
        this.textStyle = textStyle;
        this.textWH = getTextWidthAndHeight(this.textStr, this.textStyle.style)

        this.parentsL = []; //who connects to me and is attached to my left side
        this.parentsR = []; //who connects to me and is attached to my right side
        this.parentsC = []; //who connects to me and is attached to the center (ie, for multilinks)

        this.h = 0; //which slot does this link occupy

        //this.lines = []; //don't think this is being used... double check then remove

        this.rootMinWord = null;
        this.rootMaxWord = null;
        this.nearestConnectedMinWord = null;
        this.nearestConnectedMaxWord = null;

        this.arrows = [];
        this.arrowStyles = [];
        this.arrowXPercents = [];

        for (var i = 0; i < this.arrowDirections.length; i++) {
          if (this.arrowDirections[i] == directions.FORWARD) {

            this.arrowStyles[i] = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#0000ff', 0.5));
          } else if (this.arrowDirections[i] == directions.BACKWARD) {
          
            this.arrowStyles[i] = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#00ff00', 0.5));
     
          } else {
            this.arrowStyles[i] = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#ff0000', 0.5));
          }
 
        }

        this.needsUpdate = true;

        this.numLineSegments = 0;
        this.polylines = [];
        this.polylineSVGs = [];
        this.labels = [];
        this.labelRectSVGs = [];
        this.labelTextSVGs = [];
       
        this.label = null;
        this.labelRectSVG = null;
        this.labelTextSVG = null;
    }

    get parents() {
      return [].concat(this.parentsL, this.parentsC, this.parentsR);
    }

    toString() {
        return this.id; 
    }
    
    toggleHighlight(select) {
      // default value
      if (select === undefined) {
        this.isSelected = !this.isSelected;
      }
      else {
        this.isSelected = select;
      }

      if (this.isSelected) {
        this.labelRectSVGs.forEach(rect => rect.addClass('selected'));
      }
      else {
        this.labelRectSVGs.forEach(rect => rect.removeClass('selected'));
      }
    }

    hover(label) {
      this.labelRectSVGs.forEach(rect => rect.addClass('hovered'));
    }
    unhover(label) {
      this.labelRectSVGs.forEach(rect => rect.removeClass('hovered'));
    }

    setStartAndEnd() {

        this.leftWord = this.words[0];
        this.rightWord = this.words[this.words.length - 1];
        this.id = `(${this.leftWord.id}, ${this.rightWord.id})`;

        // console.log("\n\n *** \n\n in setStartAndEnd");
        // console.log("leftWord: " + this.leftWord);
        // console.log("rightWord: " + this.rightWord);

        if (this.leftWord instanceof Word) {
          this.leftType = types.WORD;
        } else if (this.leftWord instanceof Link) {
          this.leftType = types.LINK;
        }

        if (this.rightWord instanceof Word) {
          this.rightType = types.WORD;
        } else if (this.rightWord instanceof Link) {
          this.rightType = types.LINK;
        }       

        //these get set based on the layout strategy (closet or farthest), in calcAttachPoints()
        this.leftAttach = null;
        this.rightAttach = null;

    }
}
