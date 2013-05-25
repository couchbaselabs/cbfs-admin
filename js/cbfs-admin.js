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

var last_data = '';

function layout_files( path ) {
	$( '.nav li' ).removeClass( 'active' ).filter( '[data-tab="files"]' ).addClass( 'active' );

	path = path.filter( function ( p ) { return p; } );

	var layout = function( list ) {
		var data = JSON.stringify( list );
		if ( data == last_data )
			return;
		last_data = data;

		list.path = list.path.replace( /\/$/, '' );
		var $t = $( '<table class="table table-hover table-striped">' ).appendTo( $( '#container' ).empty() );
		var $b = $( '<span class="btn-group">' ).appendTo( $( '<div class="btn-toolbar">' ).prependTo( '#container' ) );
		var $p = $( '<ul class="breadcrumb">' ).html( '<li><a href="#files">root</a></li>' ).prependTo( '#container' );

		var pathSoFar = '#files';
		path.forEach( function( component ) {
			$( '<li><span></span><a></a></li>' )
				.children( 'a' ).attr( 'href', pathSoFar += '/' + component ).text( component ).parent()
				.children( 'span' ).addClass( 'divider' ).text( '/' ).parent()
				.appendTo( $p );
		} );

		$( '<span class="btn btn-primary" title="Upload">' ).html( '<i class="icon-upload icon-white"></i> <span class="btn-text">Upload</span>' ).append( $( '<input type="file" multiple>' ).change( function() {
			var usedNames = {};
			$.each( this.files, function() {
				// can't use jQuery here
				var xhr = new XMLHttpRequest();
				// Don't allow files uploaded in the same batch to override each other
				var name = this.name;
				var n = 0;

				if ( !( name in usedNames ) && ( name in list.files ) ) {
					if ( name == 'image.jpg' || !confirm( 'Overwrite file "' + name + '"?' ) ) {
						// Don't spam the question if the answer is no.
						for ( var f in list.files ) {
							usedNames[f] = true;
						}
					}
				}
				while ( name in usedNames ) {
					n++;
					name = this.name + '_' + n;
					if ( !( name in usedNames ) && ( name in list.files ) ) {
						if ( !confirm( 'Overwrite file "' + name + '"?' ) ) {
							// Don't spam the question if the answer is no.
							for ( var f in list.files ) {
								usedNames[f] = true;
							}
						}
					}
				}
				usedNames[name] = true;
				xhr.open( 'PUT', list.path + '/' + name, true );
				xhr.onreadystatechange = update;
				xhr.send( this );
			} );

			// reset the field so the same file can be uploaded again
			this.value = '';
		} ).hide() ).click( function() {
			this.lastElementChild.click();
		} ).appendTo( $b );

		$( '<span class="btn" title="New Folder">' ).html( '<i class="icon-folder-open"></i> <span class="btn-text">New Folder</span>' ).click( function() {
			var name = prompt( 'Folder name?', 'New Folder' );
			if ( name !== null )
				location.hash = '#files' + list.path + '/' + name;
		} ).appendTo( $b );

		$( '<a class="btn" title="Download .zip">' ).html( '<i class="icon-download"></i> <span class="btn-text">.zip</a>' ).attr( 'href', '/.cbfs/zip' + list.path ).appendTo( $b );

		$( '<a class="btn" title="Download .tar.gz">' ).html( '<span class="btn-text">.tar.gz</a>' ).attr( 'href', '/.cbfs/tar' + list.path ).appendTo( $b ); // no icon because it's right next to .zip

		if ( list.path != '' ) {
			$t.append( $( '<tr>' )
				.append( $( '<th>' )
					.append( $( '<i>' ).addClass( 'icon-folder-open' ) )
					.append( ' ' )
					.append( $( '<a>' ).attr( 'href', '#files' + list.path.replace( /\/[^\/]+$/, '' ) ).text( '..' ) ) )
				.append( $( '<td>' ).text( 'parent directory' ) )
				.append( $( '<td>' ) )
				.append( $( '<td>' ) )
				.append( $( '<td>' ) )
			);
		}
		for ( var d in list.dirs ) {
			var dir = list.dirs[d];
			$t.append( $( '<tr>' )
				.append( $( '<th>' )
					.append( $( '<i>' ).addClass( 'icon-folder-open' ) )
					.append( ' ' )
					.append( $( '<a>' ).attr( 'href', '#files' + list.path + '/' + d ).text( d ) ) )
				.append( $( '<td>' ).text( dir.descendants + ( dir.descendants == 1 ? ' item' : ' items' ) ) )
				.append( $( '<td>' ).text( pretty_bytes( dir.size ) ) )
				.append( $( '<td>' ) )
				.append( $( '<td>' ) )
			);
		}
		for ( var f in list.files ) {
			var file = list.files[f];
			var d = new Date( file.modified );
			$t.append( $( '<tr>' )
				.append( $( '<th>' )
					.append( $( '<i>' ).addClass( 'icon-file' ) )
					.append( ' ' )
					.append( $( '<a>' ).attr( 'href', list.path + '/' + f.replace( /^index\.html$/, '' ) ).text( f ) ) )
				.append( $( '<td>' ).text( file.ctype ) )
				.append( $( '<td>' ).text( pretty_bytes( file.length ) ) )
				.append( $( '<td>' ).text( d.toDateString() == new Date().toDateString() ? d.toLocaleTimeString() : d.toLocaleDateString() ) )
				.append( $( '<td>' )
					.append( $( '<button class="btn btn-danger btn-mini" title="Delete"><i class="icon-trash icon-white"></i></button>' ).click( ( function( f, file ) {
						return function() {
							if ( confirm( 'Permanently delete "' + list.path + '/' + f + '"?' ) ) {
								$.ajax( {
									'type': 'DELETE',
									'url':  list.path + '/' + f,
									'success': update,
									'error': update,
								} );
							}
						};
					} )( f, file ) ) ) )
			);
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

function layout_control() {
	$( '.nav li' ).removeClass( 'active' ).filter( '[data-tab="control"]' ).addClass( 'active' );

	var nodes, tasks, ready = 0;

	var maybe = function() {
		if ( ready == 2 ) { // must be the number of requests below
			var data = JSON.stringify( { nodes: nodes, tasks: tasks } );
			if ( data == last_data )
				return;
			last_data = data;

			$( '#container' ).empty();
			var $row, i = 0;
			for ( var n in nodes ) {
				var node = nodes[n];
				if ( i % 3 == 0 ) {
					$row = $( '<div class="row-fluid">' ).appendTo( '#container' );
				}
				i++;
				$( '<div class="span4">' )
					.append( $( '<h3>' ).text( n ) )
					.append( node.addr )
					.append( '<dl>' + (
						( node.hbage_ms < 60000 ) ?
						( '<dt>Up</dt><dd class="text-success">' + node.uptime_str + '</dd>' ) :
						( '<dt>Down</dt><dd class="text-error">' + node.hbage_str + '</dd>' ) ) +
						'<dt>Free</dt><dd>' + pretty_bytes( node.free ) + '</dd>' +
						'<dt>Used</dt><dd>' + pretty_bytes( node.used ) + '</dd>' +
						'</dl>' )
					.appendTo( $row );
			}
			console.log(nodes, tasks);
		}
	};

	$.getJSON( '/.cbfs/nodes/', function( data ) {
		nodes = data;
		ready++;
		maybe();
	} )
	$.getJSON( '/.cbfs/tasks/', function( data ) {
		tasks = data;
		ready++;
		maybe();
	} );
}

function hash_changed() {
	// I might put something in here in the future.
	update();
}

function update() {
	var components = location.hash.replace(/^#/, '').split(/\//g);
	switch ( components[0] ) {
	case 'files':
		layout_files( components.slice( 1 ) );
		break;

	case 'control':
		layout_control();
		break;

	default:
		location.hash = '#files';
	}
};

$( window ).on( 'hashchange', hash_changed );
$( '.nav a' ).click( hash_changed );
hash_changed();
setInterval( update, 1000 );
