function pretty_bytes( bytes ) {
	if ( bytes < 1024 ) {
		return bytes + ' bytes';
	}
	bytes = Math.round( bytes / 102.4 ) / 10;
	if ( bytes < 1024 ) {
		return bytes + 'kB';
	}
	bytes = Math.round( bytes / 102.4 ) / 10;
	if ( bytes < 1024 ) {
		return bytes + 'MB';
	}
	bytes = Math.round( bytes / 102.4 ) / 10;
	if ( bytes < 1024 ) {
		return bytes + 'GB';
	}
	bytes = Math.round( bytes / 102.4 ) / 10;
	if ( bytes < 1024 ) {
		return bytes + 'TB';
	}
	bytes = Math.round( bytes / 102.4 ) / 10;
	if ( bytes < 1024 ) {
		return bytes + 'PB';
	}
	bytes = Math.round( bytes / 102.4 ) / 10;
	if ( bytes < 1024 ) {
		return bytes + 'EB';
	}
	bytes = Math.round( bytes / 102.4 ) / 10;
	return bytes + 'YB';
}

function layout_files( path ) {
	path = path.filter( function ( p ) { return p; } );

	var layout = function( list ) {
		list.path = list.path.replace( /\/$/, '' );
		var $t = $( '<table>' ).addClass( 'table table-hover table-striped' ).appendTo( $( '#container' ).empty() );
		var $b = $( '<div>' ).addClass( 'btn-toolbar' ).prependTo( '#container' );
		var $p = $( '<ul>' ).addClass( 'breadcrumb' ).prependTo( '#container' ).html( '<li><a href="#files">root</a></li>' );

		var pathSoFar = '#files';
		path.forEach( function( component ) {
			$( '<li><span></span><a></a></li>' )
				.children( 'a' ).attr( 'href', pathSoFar += '/' + component ).text( component ).parent()
				.children( 'span' ).addClass( 'divider' ).text( '/' ).parent()
				.appendTo( $p );
		} );

		$( '<span>' ).addClass( 'btn' ).html( '<i class="icon-upload"></i> Upload' ).append( $( '<input type="file" multiple>' ).change( function() {
			$.each( this.files, function() {
				// can't use jQuery here
				var xhr = new XMLHttpRequest();
				xhr.open( 'PUT', location.protocol + '//' + location.host + list.path + '/' + this.name, true );
				xhr.onreadystatechange = function() {
					// give it time to update the index
					setTimeout(hash_changed, 1000);
				};
				xhr.send( this );
			} );

			// reset the field so the same file can be uploaded again
			this.value = '';
		} ).css( { 'display': 'none' } ) ).click( function() {
			this.firstElementChild.click();
		} ).appendTo( $b );

		if ( list.path != '' ) {
			$t.append( $( '<tr>' )
				.append( $( '<th>' )
					.append( $( '<i>' ).addClass( 'icon-folder-close' ) )
					.append( ' ' )
					.append( $( '<a>' ).attr( 'href', '#files' + list.path.replace( /\/[^\/]+$/, '' ) ).text( '..' ) ) )
				.append( $( '<td>' ).text( 'parent directory' ) )
				.append( $( '<td>' ) )
				.append( $( '<td>' ) )
			);
		}
		for ( var d in list.dirs ) {
			$t.append( $( '<tr>' )
				.append( $( '<th>' )
					.append( $( '<i>' ).addClass( 'icon-folder-open' ) )
					.append( ' ' )
					.append( $( '<a>' ).attr( 'href', '#files' + list.path + '/' + d ).text( d ) ) )
				.append( $( '<td>' ).text( list.dirs[d].descendants + ( list.dirs[d].descendants == 1 ? ' item' : ' items' ) ) )
				.append( $( '<td>' ).text( pretty_bytes( list.dirs[d].size ) ) )
				.append( $( '<td>' ) )
			);
			// console.log( d, list.dirs[d] );
		}
		for ( var f in list.files ) {
			var d = new Date( list.files[f].modified );
			$t.append( $( '<tr>' )
				.append( $( '<th>' )
					.append( $( '<i>' ).addClass( 'icon-file' ) )
					.append( ' ' )
					.append( $( '<a>' ).attr( 'href', list.path + '/' + f.replace( /^index\.html$/, '' ) ).text( f ) ) )
				.append( $( '<td>' ).text( list.files[f].ctype ) )
				.append( $( '<td>' ).text( pretty_bytes( list.files[f].length ) ) )
				.append( $( '<td>' ).text( d.toDateString() == new Date().toDateString() ? d.toLocaleTimeString() : d.toLocaleDateString() ) )
			);
			// console.log( f, list.files[f] );
		}
	};

	$.ajax( {
		'type':     'GET',
		'url':      '/.cbfs/list/' + path.join( '/' ),
		'data':     { 'includeMeta': 'true' },
		'success':  layout,
		'error':    function() {
			layout( {
				path:  '/' + path.join( '/' ),
				dirs:  {},
				files: {}
			} );
		},
		'dataType': 'json',
	} );
}

var hash_changed;

$(function() {
	var update_nodes = function() {
		$.getJSON( '/.cbfs/nodes/', function( nodes ) {
			var count = 0;
			for ( var id in nodes )
				count++;
			$( '#cbfs-nodes' ).text( count + ' nodes' );
			// TODO: do something more interesting
		} );
	};

	setInterval( update_nodes, 1000 );
	update_nodes();

	hash_changed = function() {
		var components = location.hash.replace(/^#/, '').split(/\//g);
		switch ( components[0] ) {
		case 'files':
			layout_files( components.slice( 1 ) );
			break;

		default:
			location.hash = '#files';
		}
	};
	$( window ).on( 'hashchange', hash_changed );
	hash_changed();
});
