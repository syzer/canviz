function Path(segments, options) {
		this.segments = segments || [];
		this.options = {};
		this.setOptions(Object.extend({
			x_fill: false,
			x_stroke: true,
			x_strokeType: 'solid',
			x_dashLength: 6,
			x_dotSpacing: 4
		}, options || {}));
};
Path.prototype = {
	constructor: Path,
	setOptions: function(options) {
		$H(options).each(function(option) {
			if (option.key.startsWith('x_')) {
				this[option.key] = option.value;
			} else {
				this.options[option.key] = option.value;
			}
		}.bind(this));
	},
	setupSegments: function() {},
	// Based on Oliver Steele's bezier.js library.
	addBezier: function(pointsOrBezier) {
		this.segments.push(pointsOrBezier instanceof Array ? new Bezier(pointsOrBezier) : pointsOrBezier);
	},
	offset: function(dx, dy) {
		if (0 == this.segments.length) this.setupSegments();
		for (var i = 0; i < this.segments.length; ++i) {
			this.segments[i].offset(dx, dy);
		}
	},
	getBB: function() {
		if (0 == this.segments.length) this.setupSegments();
		var l, t, r, b, p = this.segments[0].points[0];
		l = r = p.x;
		t = b = p.y;
		for (var i = 0; i < this.segments.length; ++i) {
			for (var j = 0; j < this.segments[i].points.length; ++j) {
				l = Math.min(l, this.segments[i].points[j].x);
				t = Math.min(t, this.segments[i].points[j].y);
				r = Math.max(r, this.segments[i].points[j].x);
				b = Math.max(b, this.segments[i].points[j].y);
			}
		}
		var rect = new Rect(l, t, r, b);
		return (this.getBB = function() {return rect;})();
	},
	isPointInBB: function(x, y, tolerance) {
		if ('undefined' === typeof tolerance) tolerance = 0;
		var bb = this.getBB();
		if (0 < tolerance) {
			bb = Object.clone(bb);
			bb.inset(-tolerance, -tolerance);
		}
		return !(x < bb.l || x > bb.r || y < bb.t || y > bb.b);
	},
	isPointOnPath: function(x, y, tolerance) {
		if ('undefined' === typeof tolerance) tolerance = 0;
		if (!this.isPointInBB(x, y, tolerance)) return false;
		for (var i = 0; i < this.segments.length; ++i) {
			if (this.segments[i].isPointOnBezier(x, y, tolerance)) {
				return true;
			}
		}
		return false;
	},
	isPointInPath: function(x, y) {
		return false;
	},
	// Based on Oliver Steele's bezier.js library.
	makePath: function(ctx) {
		if (0 == this.segments.length) this.setupSegments();
		for (var i = 0; i < this.segments.length; ++i) {
			this.segments[i].makePath(ctx, 0 == i);
		}
	},
	makeDashedPath: function(ctx, dashLength, firstDistance, drawFirst) {
		if (0 == this.segments.length) this.setupSegments();
		var info = {
			drawFirst: ('undefined' === typeof drawFirst) ? true : drawFirst,
			firstDistance: firstDistance || dashLength
		};
		for (var i = 0; i < this.segments.length; ++i) {
			info = this.segments[i].makeDashedPath(ctx, dashLength, info.firstDistance, info.drawFirst);
		}
	},
	makeDottedPath: function(ctx, dotSpacing, firstDistance) {
		if (0 == this.segments.length) this.setupSegments();
		if (!firstDistance) firstDistance = dotSpacing;
		for (var i = 0; i < this.segments.length; ++i ) {
			firstDistance = this.segments[i].makeDottedPath(ctx, dotSpacing, firstDistance);
		}
	},
	draw: function(ctx) {
		ctx.save();
		$H(this.options).each(function(option) {
			ctx[option.key] = option.value;
		});
		if (this.x_fill) {
			ctx.beginPath();
			this.makePath(ctx);
			ctx.fill();
		}
		if (this.x_stroke) {
			switch (this.x_strokeType) {
				case 'dashed':
					ctx.beginPath();
					this.makeDashedPath(ctx, this.x_dashLength);
					break;
				case 'dotted':
					if (ctx.lineWidth < 2) ctx.lineWidth = 2;
					ctx.beginPath();
					this.makeDottedPath(ctx, this.x_dotSpacing);
					break;
				case 'solid':
				default:
					if (!this.x_fill) {
						ctx.beginPath();
						this.makePath(ctx);
					}
			}
			ctx.stroke();
		}
		ctx.restore();
	}
};
