class ColorPicker {
  constructor(className, options = {}) {
    this.initialColor = options.initialColor || '#000000';
    this.llColor = options.lightLabelColor || '#dddddd';
    this.dlColor = options.darkLabelColor || '#333333';
    this.changeCallback = options.changeCallback || null;

    this.currentInput;
    this.picker = document.createElement('input');
    this.picker.type = 'color';
    this.picker.style = 'position:absolute; display: block; opacity: 0; z-index:-100;';
    this.picker.onchange = () => {
      if (this.currentInput) {
        this.setColor(this.currentInput, this.picker.value);
        if (this.changeCallback) {
          this.changeCallback(this.currentInput);
        }
      }
    }
    document.body.appendChild(this.picker);

    const nodes = document.querySelectorAll(`input.${className}`);
    this.registerInputs(nodes);
  }

  registerInputs(nodes) {
    nodes.forEach(input => {
      this.setColor(input, this.initialColor);

      input.setAttribute('readonly', true);

      input.onclick = () => {
        this.currentInput = input;
        this.picker.focus();
        this.picker.click();
        input.focus();
        this.picker.value = input.colorValue;
      }
    });
  }

  // make label color light on a dark background and dark on a light one
  getLabelColor(bgColor) {
    return (this.RGBLum(bgColor) > 128) ? this.dlColor : this.llColor;
  }

  // set the color of an input
  setColor(input, hex) {
    input.colorValue = hex;
    input.value = hex;
    input.style.backgroundColor = hex;
    input.style.color = this.getLabelColor(hex);
  }

  // return the perceptive luminescence from a hex value for color contrast
  RGBLum(hex) {
    let c = parseInt(hex.slice(1), 16);

    let r = (c >> 16) & 0xff;
    let g = (c >> 8) & 0xff;
    let b = (c >> 0) & 0xff;

    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
}

module.exports = ColorPicker;