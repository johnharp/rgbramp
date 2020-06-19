
/*
 * Create a color ramp made up of the given segments.
 * @param {...Segment} segments  - one or more segment objects
 */
function ramp(...segments) {
	let allRgbValues = [];

	segments.forEach(segment => {
		let segmentColors = segment.computeBands();
		allRgbValues = allRgbValues.concat(segmentColors);
	});

	return allRgbValues;
}

function getSelector(dataAttribute) {
	return '[' + dataAttribute + ']';
}

function applyColorsIndex(dataAttribute, colors) {
	let selector = getSelector(dataAttribute);

	var elements = document.querySelectorAll(selector);
	elements.forEach(element => {
		let index = Number(element.getAttribute(dataAttribute));

		let color = colors[index];
		let bgColor = color.htmlColor();
		let textColor = color.htmlColorContrasting();

		element.style.backgroundColor = bgColor;
		element.style.color = textColor;
	});
}

function applyColors(dataAttribute, colors){
	let selector = getSelector(dataAttribute);

	var elements = document.querySelectorAll(selector);
	let min=undefined;
	let max=undefined;

	var value;

	elements.forEach(element => {
		value = Number(element.getAttribute(dataAttribute));

		if (min === undefined || value < min) {
			min = value; 
		}
		if (max === undefined || value > max) {
			max = value;
		}
	});



	if (min == undefined || max == undefined) {
		console.log("Error: could not determine min and max data values to apply colors.");
	} else {

		let range = max - min;
		let num_steps = colors.length - 1;
		let step = range / num_steps;

		elements.forEach(element => {
			let value = element.getAttribute(dataAttribute);
			let index = Math.floor((value - min) / step);

			let color = colors[index];
			let bgColor = color.htmlColor();
			let textColor = color.htmlColorContrasting();

			element.style.backgroundColor = bgColor;
			element.style.color = textColor;
		});
	}
}

/*
 * Holds the Red, Green, Blue components of a color
 * Has methods to output the HTML color code (ex. "#112233") as
 * well as a contrasting HTML color (either black or white depending on)
 * how dark the color is.
 * If a single argument is supplied, it is assumed to be the
 * HTML hex color code similar to this: "#ff0000"
 */
class Rgb {
	constructor(r, g, b) {
		if (g==undefined) {
			// We were passed a color such as "#ff0000" as the only arguemnt
			let hexVal = r;

			this.r = parseInt(hexVal.charAt(1) + hexVal.charAt(2), 16);
			this.g = parseInt(hexVal.charAt(3) + hexVal.charAt(4), 16);
			this.b = parseInt(hexVal.charAt(5) + hexVal.charAt(6), 16);
		} else {
			// We were passed decimal values for r, g, and b separately
			// like this (255, 0, 0)
			this.r = r;
			this.g = g;
			this.b = b;
		}

	}


 	/*
 	 * The HTML color code for this color
 	 */
	htmlColor() {
		const v = 
			'#' + 
			decimalToHex(this.r) + 
			decimalToHex(this.g) +
			decimalToHex(this.b);

		return v;
	}

	/*
	 * A contrasting color (either black or white) depending on whether
	 * this Rgb color is dark or light.  Can be used to draw foreground text
	 * or icon on this Rgb background.
	 */
	htmlColorContrasting() {
		// This algorithm is from W3C notes here:
		// https://www.w3.org/TR/AERT/#color-contrast

		// It computes a brightness
		// by giving different weight to r, g, and b
		// components.
		// Computed brightness will be [0-255]
		const brightness = 
			((this.r * 299) + 
			(this.g * 587) +
			(this.b * 114)) / 1000;

		const color = (brightness > 125) ? 'black' : 'white';

		return color;
	}

}

/*
 * Returns an array of Rgb objects that blend from startRgb to
 * endRgb.
 *
 * @parm {Rgb} startRgb - beginning Rgb color
 * @parm {Rgb} endRgb - ending Rgb color
 * @parm {Number} numBands - total number of colors to return (including the
 *                           start and end color)
 */
class Segment {
	constructor(startRgb, endRgb, numBands) {
		this.startRgb = startRgb;
		this.endRgb = endRgb;
		this.numBands = numBands;
	}

	computeBands() {
		let rgbValues = [];

		// special case: if numBands == 1 then we want this segment to
		// specify a single color (the startRgb).
		//
		// Wouldn't normally use this, but maybe we wanted to inject
		// a single specific color between two other computed bands...
		if (this.numBands == 1) {
			rgbValues.push(startRgb);
		}
		else
		{
			let rValues = this.interpolateLinear(this.startRgb.r, this.endRgb.r, this.numBands);
			let gValues = this.interpolateLinear(this.startRgb.g, this.endRgb.g, this.numBands);
			let bValues = this.interpolateLinear(this.startRgb.b, this.endRgb.b, this.numBands);


			for (let i = 0; i < rValues.length; i++) {
				rgbValues[i] = new Rgb(rValues[i], gValues[i], bValues[i]);
			}
		}

		return rgbValues;
	}

	/*
	 * Return a list of integers evenly distributed between the start and end
	 * Total number returned (including the start and end number is num)
	 * @parm {Number} start - integer start number
	 * @parm {Number} end - integer end number
	 * @parm {Number} num - number of total integers to return
	 */
	interpolateLinear(start, end, num) {
		// increment will be a floating point value that
		// when added (num-1) times to start will result in the
		// end value
		let increment = (end - start)/(num - 1);

		// value will begin at (start)
		// will increment (num-1) times by (increment)
		// and will end at (end)
		let value = start;

		let values = [];

		for(let i = 0; i < num; i++) {
			// Round to the nearest integer when assigning to the
			// values array so we can compute a legal RGB value.
			//
			// Note: we can get a negative 0 when ramping from a positive number
			// down to zero, hence the use of Math.abs() here.
			values[i] = Math.abs(Math.round(value));
			value += increment;
		}

		return values;
	}
}

/**
 * @param {number} decimalValue  - [0-255] value
 */
function decimalToHex(decimalValue) {

	decimalValue = Math.max(0, decimalValue);
	decimalValue = Math.min(255, decimalValue);

	
	// Convert decimal value to base 16 representation
	// (as a string)
	var hexValue = Number(decimalValue).toString(16);

	// If the hex representation is a single digit, 0 pad
	// on the left.
	if (hexValue.length < 2) {
		hexValue = "0" + hexValue;
	}

	return hexValue;
}


export { Rgb, Segment, ramp, applyColors, applyColorsIndex };
