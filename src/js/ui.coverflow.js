/*
 * jQuery UI CoverFlow II
 *
 * Updates for jQuery 1.8 / jQueryUI 1.9 Sebastian Sauer
 *
 * Re-written for jQueryUI 1.8.6/jQuery core 1.4.4+ by Addy Osmani with adjustments
 * Maintenance updates for 1.8.9/jQuery core 1.5, 1.6.2 made.
 *
 * Original Component: Paul Bakaus for jQueryUI 1.7
 *
 * Released under the MIT license.
 *
 * Depends:
 *  jquery.ui.core.js
 *  jquery.ui.widget.js
 *  jquery.ui.effect.js
 *
 * Events:
 *  beforeselect
 *  select
 */
(function ( $ ) {

	var _capitalize = function( str ) {
		return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
	};

	$.widget( "ui.coverflow", {

		options: {
			items: "> *",
			// scale left/right images - 0>x<1
			itemSize : .73,
			orientation: "horizontal",
			active: 0,
			duration : 200,
			easing: "easeOutQuint",
			// selection triggers
			trigger: [
				"focus",
				"click"
			]
		},

		_create: function () {

			var o = this.options,
				itemBindings = {},
				i, binding;

			this.items = this.element.find( o.items );

			this.duration = o.duration;
			this.currentIndex = o.active;

			if( $.isArray( o.trigger ) ) {
				// TODO: jshint doesn't like the assignment
				for( i = 0; binding = o.trigger[ i++ ]; ) {
					itemBindings[ binding ] = this._select;
				}

			} else if( ( typeof o.trigger === "string" ) && $.trim( o.trigger ) ) {

				itemBindings[ $.trim( o.trigger ).toLowerCase() ] = this._select;

			} else {

				itemBindings.click = this._select;

			}

			this.origElementDimensions = {
				width: this.element.width(),
				height: this.element.height()
			}
			this._on( this.items, itemBindings );

		},
		_init : function () {

			var o = this.options,
				css;

			if( o.orientation === "vertical" ) {
				this._topOrLeft = "top";
				this._widthOrHeight = "height";
			} else {
				this._topOrLeft = "left";
				this._widthOrHeight = "width";
			}

			o.itemSize = parseFloat( o.itemSize );
			o.itemSize = o.itemSize < 1 && o.itemSize > 0
				? o.itemSize
				: .73;

			this.itemSize = o.itemSize * this.items.innerWidth();

			// apply a negative margin so items stack
			this.items.css({
				margin : "" + -1 * Math.floor( o.itemSize / 2 * this.items.innerWidth() ) + "px"
			});

			this.itemWidth = this.items.width();
			this.itemHeight = this.items.height();

			this.outerWidthOrHeight = ( this._widthOrHeight === "width" )
				? this.element.parent().outerWidth( false )
				: this.element.parent().outerHeight( false );

			//Center the actual parent"s left side within it's parent
			css = this._getCenterPosition();
			// make sure there's enough space
			css[ this._widthOrHeight ] = this.itemWidth * this.items.length;

			this.element
				.addClass( "ui-coverflow" )
				.css( css )
				.parent()
				.addClass( "ui-coverflow-wrapper" );

			//Jump to the first item
			this._refresh( 1, 0, this.currentIndex );
		},
		_getCenterPosition : function () {
			var animation = {},
				o = this.options;

			animation[ this._topOrLeft ] = Math.floor(
				- this.currentIndex * this.itemSize / 2
				//Center the items container
				+ this.outerWidthOrHeight / 2 - this.itemSize / 2
				//Subtract the padding of the items container
				- parseInt( this.element.css( "padding" + _capitalize( this._topOrLeft ) ), 10 ) || 0
			);
			return animation;
		},
		_select: function ( ev ) {

			this.select( ev.currentTarget );

		},
		select : function( item ) {

			var o = this.options,
				index = ! isNaN( parseInt( item, 10 ) )
					? parseInt( item, 10 )
					: this.items.index( item );

			if( this.currentIndex === index ) {
				return false;
			}

			if( false === this._trigger(
					"beforeselect",
					null,
					this._ui(
						this.items.index( index ), index
					)
				)
			) {
				return false;
			}

			this.previousIndex = this.currentIndex;

			this.currentIndex = index;

			var self = this,
				to = Math.abs( self.previous - self.currentIndex ) <= 1
					? self.previousIndex
					: self.currentIndex + ( self.previousIndex < self.currentIndex ? -1 : 1 ),
				animation = {
					coverflow : 1
				};

			//Overwrite $.fx.step.coverflow everytime again with custom scoped values for this specific animation
			$.fx.step.coverflow = function( fx ) {
				self._refresh( fx.now, to, self.currentIndex );
			};

			// 1. Stop the previous animation
			// 2. Animate the parent"s left/top property so the current item is in the center
			// 3. Use our custom coverflow animation which animates the item

			$.extend( animation, this._getCenterPosition() );

			this.element
				// jump to end and release select trigger
				.stop( true, true )
				.animate(
					animation,
					{
						duration: this.options.duration,
						easing: o.easing
					},
					function () {
						// fire select after animation has finished
						self._trigger( "select", null, this._ui() );
					}
				);

			return true;
		},

		_refresh: function( state, from, to ) {

			var self = this,
				offset = null;

			this.items.each( function ( i ) {

				var side = ( ( i === to && from - to < 0 ) || i - to  > 0 )
						? "left"
						: "right",
					mod = ( i === to )
						? ( 1 - state )
						: ( i === from ? state : 1 ),
					before = ( i > from && i !== to ),
					css = {
						zIndex: self.items.length + ( side === "left" ? to - i : i - to )
					},
					scale = ( 1 + ( ( 1 - mod ) * 0.3 ) ),
					matrixT;

				css[ self._topOrLeft ] = (
					( -i * ( self.itemSize / 2 ) )
					+ ( side === "right"
						? -self.itemSize / 2
						: self.itemSize / 2
					) * mod
				);

				// transponed matrix
				matrixT = [
					scale, ( mod * ( side === "right" ? -0.2 : 0.2 ) ),
					0, scale,
					0, 0
				];

				css.transform = "matrix(" + matrixT.join( "," ) + ")";

				$( this ).css( css );

			});

			this.element
				.parent()
				.scrollTop( 0 );
		},

		_ui : function ( active, index ) {
			return {
				active: active || this.items.index( this.currentIndex ),
				index: index || this.currentIndex
			};
		},
		_destroy : function () {

			this.element
				.css( this.origElementDimensions )
				.removeClass( 'ui-coverflow' )
				.parent()
				.removeClass( 'ui-coverflow-wrapper' );

			this.items.each( function () {
				// TODO: needs testing
				// remove transform
				this.style = this.style.replace( /(-)?(webkit|moz|o|ms)?transform.*;/i, '' );
				// remove margin
				this.style = this.style.replace( /margin.*;/, '' );
			});

			this._superApply( "destroy", arguments );
		}

	});


})( jQuery );
