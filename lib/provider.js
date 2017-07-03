'use babel';

import ATTRS from './completions/attributes.json';
import TAGS from './completions/tags.json';

const attributePattern = /\s+([a-zA-Z][-a-zA-Z]*)\s*=\s*$/
const tagPattern = /<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/

function firstCharsEqual(str1, str2) {
	if (str2 && str1) {
		const regexp = new RegExp( '^' + escapeRegExp( str2 ), 'i' );
		return regexp.test( str1 );
	}

	return false;
}

function escapeRegExp(string){
	return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$&");
}

export default {
	selector: '.text.html',
	disableForSelector: '.text.html .comment',

	inclusionPriority: 1,
	excludeLowerPriority: true,
	suggestionPriority: 2,

	// called when a suggestion from your provider was inserted into the buffer
	onDidInsertSuggestion({editor, suggestion}) {
		(suggestion.type === 'property') && setTimeout(() => this.triggerAutocomplete(editor), 1);
	},

	triggerAutocomplete(editor) {
		atom.commands.dispatch(atom.views.getView(editor), 'autocomplete-plus:activate', {activatedManually: false});
	},

	getAttributeNameCompletions( {editor, bufferPosition, prefix} ) {
		const tag = this.getPreTag(editor, bufferPosition);
		const tagAttrs = this.getTagAttrs(tag);
		const preText = editor.getTextInBufferRange([[bufferPosition.row, 0], bufferPosition]);

		const suggestions = [];
		tagAttrs.forEach(attr => {
			// 属性存在 and 不为空 or 首字母相等
			const attrItem = this.getAttrItem(tag, attr);
			if (attrItem && (!prefix.trim() || firstCharsEqual(attr, prefix))) {
				const sug = this.buildAttrSuggestion({attr, tag}, attrItem);
				sug && suggestions.push(sug);
			}
		});

		return suggestions;
	},

	buildAttrSuggestion({attr, tag}, {description, type}) {
		const attrItem = this.getAttrItem(tag, attr);

		return {
			snippet: (type && (type === 'flag')) ? `${attr} ` : `${attr}=\"$1\"$0`,
			displayText: attr,
			type: (type && (type === 'method')) ? 'method' : 'property',
			description: description,
			rightLabel: tag ?  `<${tag}>` : ''
		};

		return;
	},

	getTagAttrs(tag) {
		return (TAGS[tag] && TAGS[tag].attributes) || [];
	},

	getAttrItem(tag, attr) {
		return ATTRS[`${tag}/${attr}`] || ATTRS[attr];
	},

	getAttrValues(tag, attr) {
		let attrItem = this.getAttrItem(tag, attr);
		let options = attrItem && attrItem.options;
		if (!options && attrItem) {
			if (attrItem.type === 'boolean') {
				options = ['true', 'false'];
			}
		}
		return options || [];
	},

	getTagNameCompletions( {editor, bufferPosition, prefix} ) {
		const preLetter = editor.getTextInBufferRange([[bufferPosition.row, bufferPosition.column - 1], bufferPosition]);
		const suggestions = [];
		for (let tag in TAGS) {
			if (preLetter === '<' || firstCharsEqual(tag, prefix)) {
				suggestions.push(this.buildTagSuggestion(tag, TAGS[tag]));
			}
		}
		return suggestions;
	},

	buildTagSuggestion(tag, tagVal) {
		const snippets = [];
		let index = 0;

		function build(tag, {subtags, defaults}, snippets) {
			let attrs = '';
			defaults && defaults.forEach((item,i) => {
				attrs +=` ${item}="$${index + i + 1}"`;
			});
			snippets.push(`${index > 0 ? '<':''}${tag}${attrs}>`);
			index++;
			subtags && subtags.forEach(item => {
				if ( TAGS[item] ) {
					build(item, TAGS[item], snippets);
				}
			});
			snippets.push(`</${tag}>`);
		}

		build(tag, tagVal, snippets);

		return {
			displayText: tag,
			snippet: ('<' + snippets.join('')).substr(1),
			type: 'tag',
			description: tagVal.description
		};
	},

	getAttributeValueCompletions({editor, bufferPosition, prefix}) {
		const suggestions = [];
		const tag = this.getPreTag(editor, bufferPosition);
		const attr = this.getPreAttr(editor, bufferPosition);
		const values = this.getAttrValues(tag, attr);
		values.forEach(value => {
			if (firstCharsEqual(value, prefix) || !prefix) {
				suggestions.push(this.buildAttrValueSuggestion(tag, attr, value));
			}
		});

		return suggestions;
	},

	buildAttrValueSuggestion(tag, attr, value) {
		const attrItem = this.getAttrItem(tag, attr)
		return {
			text: value,
			type: 'value',
			description: attrItem.description,
			rightLabel: attrItem.global ? '' : `<${tag}>`
		};
	},

	getSuggestions( request ) {
		if ( this.isAttrValueStart( request ) ) {
			return this.getAttributeValueCompletions(request);
		} else if ( this.isAttrStart(request) ) {
			return this.getAttributeNameCompletions(request);
		} else if ( this.isTagStart(request) ) {
			return this.getTagNameCompletions(request)
		} else {
			return [];
		}
	},

	isAttrStart({editor, scopeDescriptor, bufferPosition, prefix}) {
		const preTwoLetter = editor.getTextInBufferRange([[bufferPosition.row, bufferPosition.column - 2], bufferPosition]);
		const scopes = scopeDescriptor.getScopesArray();

		if (!this.getPreAttr(editor, bufferPosition) && prefix && !prefix.trim()) {
			return this.hasTagScope(scopes);
		}

		const preBufferPosition = [bufferPosition.row, Math.max(0, bufferPosition.column - 1)];
		const preScopeDescriptor = editor.scopeDescriptorForBufferPosition(preBufferPosition);
		const preScopes = preScopeDescriptor.getScopesArray();

		if (preScopes.includes('entity.other.attribute-name.html')) {
			return true;
		}

		if (!this.hasTagScope(scopes) || !prefix) {
			return false;
		}

		return (
			scopes.includes('punctuation.definition.tag.end.html') &&
			!preScopes.includes('punctuation.definition.tag.end.html')
		);
	},

	isAttrValueStart({scopeDescriptor, bufferPosition, editor}) {
		const scopes = scopeDescriptor.getScopesArray();

		const preBufferPosition = [bufferPosition.row, Math.max(0, bufferPosition.column - 1)];
		const preScopeDescriptor = editor.scopeDescriptorForBufferPosition(preBufferPosition);
		const preScopes = preScopeDescriptor.getScopesArray();

		return (
			this.hasStringScope(scopes) &&
			this.hasStringScope(preScopes) &&
			!preScopes.includes('punctuation.definition.string.end.html') &&
			this.hasTagScope(scopes) &&
			this.getPreAttr(editor, bufferPosition)
		);
	},

	// according to scope in cursor
	isTagStart({editor, bufferPosition, scopeDescriptor, prefix}) {
		if (prefix.trim() && !prefix.includes('<')) {
			return this.hasTagScope(scopeDescriptor.getScopesArray());
		}

		// autocomplete-plus's default prefix setting does not capture <. Manually check for it.
		prefix = editor.getTextInBufferRange([[bufferPosition.row, bufferPosition.column - 1], bufferPosition]);
		const scopes = scopeDescriptor.getScopesArray();

		return (
			prefix === '<' &&
			(
				(scopes.includes('text.html.basic') && scopes.length === 1) ||
				scopes.includes('invalid.illegal.bad-angle-bracket.html')
			)
		);
	},

	getPreAttr(editor, bufferPosition) {
		let quoteIndex = bufferPosition.column - 1;
		let preScopeDescriptor = null;
		let scopes = null;
		while (quoteIndex) {
			preScopeDescriptor = editor.scopeDescriptorForBufferPosition([bufferPosition.row, quoteIndex]);
			scopes = preScopeDescriptor.getScopesArray();
			if (!this.hasStringScope(scopes) || scopes.includes('punctuation.definition.string.begin.html')) {
				break;
			}
			quoteIndex--;
		}
		let attr = attributePattern.exec(editor.getTextInRange([[bufferPosition.row, 0], [bufferPosition.row, quoteIndex]]));
		return attr && attr[1];
	},

	getPreTag(editor, bufferPosition) {
		let row = bufferPosition.row;
		let tag = null;
		while (row >= 0) {
			tag = tagPattern.exec(editor.lineTextForBufferRow(row));
			if (tag && tag[1]) {
				return tag[1];
			}
			row--;
		}
		return;
	},

	//two types: double and single quote
	hasStringScope(scopes) {
		return (scopes.includes('string.quoted.double.html') ||
		scopes.includes('string.quoted.single.html'));
	},

	hasTagScope(scopes) {
		return (
			scopes.includes('meta.tag.any.html') ||
			scopes.includes('meta.tag.other.html') ||
			scopes.includes('meta.tag.block.any.html') ||
			scopes.includes('meta.tag.inline.any.html') ||
			scopes.includes('meta.tag.structure.any.html')
		);
	},
};
