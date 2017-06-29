'use babel';

import ApolloView from './apollo-view';
import { CompositeDisposable } from 'atom';

export default {

  apolloView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.apolloView = new ApolloView(state.apolloViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.apolloView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'apollo:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.apolloView.destroy();
  },

  serialize() {
    return {
      apolloViewState: this.apolloView.serialize()
    };
  },

  toggle() {
    console.log('Apollo was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
