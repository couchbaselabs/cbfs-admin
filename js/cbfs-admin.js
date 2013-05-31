var currentRequest = null;
var lastFileRequest = '';
var lastMode = '';
var uploadFiles = null;

function update( force ) {
	var hash = location.hash.replace( /^#/, '' ).split( /\/+/g );
	switch ( hash[0] ) {
	case 'files':
		updateFiles( force, hash.slice( 1 ) );
		break;

	case 'control':
		updateControl( force, hash.slice( 1 ) );
		break;

	default:
		location.hash = 'files';
	}
}
window.addEventListener( 'hashchange', function() {
	update( true );
}, false );
document.body.addEventListener( 'dragenter', function( e ) {
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
	return false;
}, false );
document.body.addEventListener( 'dragover', function( e ) {
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
	return false;
}, false );
document.body.addEventListener( 'drop', function( e ) {
	if ( lastMode == 'files' ) {
		e.preventDefault();
		uploadFiles( e.dataTransfer.files );
		return false;
	}
}, false );
setInterval( update, 1000, false );
update( true );

function upload( path, file, overwrite, original, tries ) {
	if ( !original && file.name == 'image.jpg' ) {
		// iOS Safari has problems with a prompt() during an event handler. Also, all files are named image.jpg, which sucks.
		original = file.name;
		tries = -1;
	}
	var bar = $( '<div class="bar">' ).appendTo( $( '<div class="progress">' ).appendTo( '#progress-bars' ) );
	var xhr = new XMLHttpRequest();
	xhr.open( 'PUT', path );
	if ( !overwrite ) {
		xhr.setRequestHeader( 'If-None-Match', '*' );
	}
	xhr.upload.onprogress = function( e ) {
		bar.css( 'width', ( e.position / e.total * 100 ) + '%' );
	};
	xhr.onload = function( e ) {
		switch ( xhr.status ) {
		case 201: // created
			update( false );
			bar.addClass( 'bar-success' ).parent().fadeOut( 'normal', function() {
				$( this ).remove();
			} );
			break;

		case 412: // precondition failed
			bar.addClass( 'bar-danger' );
			if ( original ) {
				tries++;
				upload( original + '_' + tries, file, overwrite, original, tries );
			} else if ( confirm( file.name + ' already exists. Overwrite?' ) ) {
				upload( path, file, true, path, 0 );
			} else {
				upload( path + '_0', file, false, path, 0 );
			}
			bar.parent().remove();
			break;

		default:
			console.log( 'load?', path, e );
		}
	};
	xhr.send( file );
}

function updateFiles( force, path ) {
	if ( lastMode != 'files' ) {
		lastMode = 'files';
		force = true;
		$( '[data-tab]' ).removeClass( 'active' ).filter( '[data-tab="files"]' ).addClass( 'active' );
	}

	if ( force ) {
		uploadFiles = function( files ) {
			$.each( files, function() {
				upload( '/' + path.join( '/' ) + '/' + this.name, this );
			} );
		};

		var breadcrumb = $( '<ul class="breadcrumb">' );
		var pathSoFar = '#files';
		breadcrumb.append( '<li><a href="#files" class="muted">root</a></li>' );
		$.each( path, function() {
			pathSoFar += '/' + this;
			$( '<li><span class="divider">/</span></li>' ).append( $( '<a>' ).text( this ).attr( 'href', pathSoFar ) ).appendTo( breadcrumb );
		} );

		var toolbar = $( '<div class="btn-toolbar">' );
		var btn_group_1 = $( '<div class="btn-group">' ).appendTo( toolbar );
		$( '<button class="btn btn-primary"><input type="file" multiple><i class="icon-upload"></i> Upload</button>' ).children( 'input[type="file"]' ).hide().change( function() {
			uploadFiles( this.files );
			this.value = ''; // clear so the next upload can be the same files
		} ).parent().click( function() {
			$( this ).children( 'input[type="file"]' )[0].click();
		} ).appendTo( btn_group_1 );
		$( '<button class="btn"><i class="icon-folder-open"></i> New Folder</button>' ).click( function() {
			var name = prompt( 'Folder name?', 'New Folder' );
			if ( name != null && name.length > 0 )
				location.hash = '#files/' + path.concat( [name] ).join( '/' );
		} ).appendTo( btn_group_1 );
		var btn_group_2 = $( '<div class="btn-group">' ).appendTo( toolbar );
		$( '<a class="btn"><i class="icon-download"></i> .zip</a>' ).attr( 'href', '/.cbfs/zip/' + path.join( '/' ) ).appendTo( btn_group_2 );
		$( '<a class="btn"><i class="icon-download-alt"></i> .tar.gz</a>' ).attr( 'href', '/.cbfs/tar/' + path.join( '/' ) ).appendTo( btn_group_2 );

		var filetable = $( '<table class="table table-striped table-hover">' );
		filetable.html( '<thead><tr><th>Name</th><th>Content</th><th>Size</th><th>Modified</th><th></th></tr></thead><tbody id="filetable"></tbody>' );

		$( '#container' ).empty().append( breadcrumb ).append( toolbar ).append( filetable );

		lastFileRequest = '';
	}

	var display = function( data ) {
		var filetable = $( '#filetable' ).empty();

		var addRow = function( filepath, icon, name, content, size, modified, actions ) {
			var row = $( '<tr>' );
			$( '<th>' ).append( $( '<i>' ).addClass( 'muted icon-' + icon ) ).append( ' ' ).append( $( '<a>' ).attr( 'href', filepath ).text( name ) ).appendTo( row );
			$( '<td>' ).text( content ).appendTo( row );
			$( '<td>' ).text( prettyBytes( size ) ).appendTo( row );
			$( '<td>' ).text( modified ).appendTo( row );
			if ( actions ) {
				actions.appendTo( row );
			} else {
				$( '<td>' ).appendTo( row );
			}
			row.appendTo( filetable );
		};

		for ( var dir in data.dirs ) {
			var d = data.dirs[dir];
			addRow( '#files' + data.path.replace( /\/+$/, '' ) + '/' + dir, 'folder-close', dir, d.descendants + ( d.descendants == 1 ? ' file' : ' files' ), d.size, '', null );
		}

		for ( var file in data.files ) {
			var f = data.files[file];
			addRow( data.path.replace( /\/+$/, '' ) + '/' + file, 'file', file, f.ctype || 'unknown', f.length, prettyDate( f.modified ), $( '<td>' ).append( $( '<button class="btn btn-mini btn-danger"><i class="icon-trash"></i></button>' ).click( ( function( file ) {
				return function() {
					if ( confirm( 'Permanently delete ' + file + '?' ) ) {
						var xhr = new XMLHttpRequest();
						xhr.open( 'DELETE', data.path.replace( /\/+$/, '' ) + '/' + file, false ); // synchronous request
						xhr.send( null );
						update( false );
					}
				};
			} )( file ) ) ) );
		}
	};

	if ( force && ( 'files/' + path.join( '/' ) ) in localStorage ) {
		lastFileRequest = localStorage['files/' + path.join( '/' )];
		display( JSON.parse( lastFileRequest ) );
	}

	if ( currentRequest ) {
		if ( force ) {
			currentRequest.abort();
		} else {
			return;
		}
	}

	currentRequest = $.ajax( {
		type: 'GET',
		url: '/.cbfs/list/' + path.join( '/' ),
		data: { includeMeta: true },
		dataType: 'json',

		success: function( data ) {
			currentRequest = null;

			var dataString = JSON.stringify( data );
			if ( dataString == lastFileRequest )
				return;
			lastFileRequest = dataString;
			localStorage['files' + data.path] = dataString;

			display( data );
		},
		error: function( _, status ) {
			currentRequest = null;

			// only clear on 404 (empty folder)
			if ( status != 'error' )
				return;

			if ( '' == lastFileRequest )
				return;
			lastFileRequest = '';
			delete localStorage['files' + data.path];

			$( '#filetable' ).empty();
		}
	} );
}

function updateControl( force, path ) {
	if ( lastMode != 'control' ) {
		lastMode = 'control';
		force = true;
		$( '[data-tab]' ).removeClass( 'active' ).filter( '[data-tab="control"]' ).addClass( 'active' );
	}

	if ( currentRequest ) {
		if ( force ) {
			currentRequest.abort();
		} else {
			return;
		}
	}

	if ( force ) {
		$( '#container' ).empty();
	}

	var display = function( data ) {
		var i = 0;
		var row;
		var container = $( '#container' ).empty();

		for ( var node in data ) {
			if ( i % 3 == 0 ) {
				row = $( '<div class="row">' ).appendTo( container );
			}
			i++;
			var n = data[node];

			var box = $( '<div class="span4">' )
				.append( $( '<h3>' ).text( node ) )
				.append( $( '<address>' ).text( n.addr ) );

			if ( n.free || n.used )
				box.append( $( '<div class="progress"><div class="bar"></div></div>' ).children().css( 'width', ( n.used / ( n.free + n.used ) * 100 ) + '%' ).parent().attr( 'title', 'Used: ' + prettyBytes( n.used ) + '\nFree: ' + prettyBytes( n.free ) ) );

			box.append( '<strong>heartbeat</strong> ' + prettyDate( n.hbtime ) + '<br>(' + prettyDuration( n.hbage_ms ) + ')<br><strong>started</strong> ' + prettyDate( n.starttime ) + '<br>(' + prettyDuration( n.uptime_ms ) + ')' )
				.appendTo( row );
		}
	};

	if ( force && 'control' in localStorage ) {
		display( JSON.parse( localStorage['control'] ) );
	}

	currentRequest = $.ajax( {
		type: 'GET',
		url: '/.cbfs/nodes/',
		data: {},
		dataType: 'json',

		success: function( data ) {
			currentRequest = null;

			localStorage['control'] = JSON.stringify( data );
			display( data );
		},
		error: function( _, status ) {
			currentRequest = null;
		}
	} );
}

function prettyBytes( bytes ) {
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

function prettyDuration( d ) {
	var p = function( d ) {
		if ( d < 1000 ) {
			return ['', 0];
		}
		d /= 1000;
		if ( d < 90 ) {
			return [Math.round( d ) + ' second' + ( Math.round( d ) == 1 ? '' : 's' ), 0];
		}
		d /= 60;
		if ( d < 90 ) {
			return [Math.round( d ) + ' minute' + ( Math.round( d ) == 1 ? '' : 's' ), ( d % 1 ) * 60];
		}
		d /= 60;
		if ( d < 36 ) {
			return [Math.round( d ) + ' hour' + ( Math.round( d ) == 1 ? '' : 's' ), ( d % 1 ) * 60 * 60];
		}
		d /= 24;
		return [Math.round( d ) + ' day' + ( Math.round( d ) == 1 ? '' : 's' ), ( d % 1 ) * 60 * 60 * 24];
	};

	var pretty = p( d );
	/*if ( pretty[1] ) {
		var pretty2 = p( pretty[1] );
		if ( pretty2[0] ) {
			pretty[0] += ', ' + pretty2[0];
		}
	}*/
	if ( !pretty[0] )
		return 'just now';
	return pretty[0] + ' ago';
}

function prettyDate( d ) {
	d = new Date( d );
	if ( d.toDateString() == new Date().toDateString() ) {
		return d.toLocaleTimeString();
	}
	return d.toLocaleDateString();
}
