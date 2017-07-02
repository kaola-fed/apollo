'use babel';

import { CompositeDisposable } from 'atom';
import provider from './provider';

export default {

	activate( state ) {

		this.subscriptions = new CompositeDisposable();

		this.subscriptions.add(
			atom.workspace.observeTextEditors( editor => {
				this.subscriptions.add(
					editor.onDidChangeCursorPosition( function ( e ) {
						const cursors = editor.cursors;

						if ( editor.cursors.length === 1 ) {
							const cursor = cursors[ 0 ];

							const scopes = cursor.getScopeDescriptor().scopes;

							if (
								// inside attribute quoted string
								(
									scopes.includes( 'string.quoted.single.html' ) ||
									scopes.includes( 'string.quoted.double.html' )
								) &&
								(
									cursor.getCurrentWordPrefix() === `="` ||
									cursor.getCurrentWordPrefix() === `='`
								)
							) {
								setTimeout( () => {
									atom.commands.dispatch(
										atom.views.getView( editor ),
										'autocomplete-plus:activate',
										{ activatedManually: false }
									);
								}, 100 );
							}
						}
					} )
				);
			} )
		);

	},

	deactivate() {
		this.subscriptions.dispose();
	},

	provide: () => provider,

};
