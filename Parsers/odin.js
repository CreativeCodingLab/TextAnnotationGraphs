/**
 * Parser for Odin `mentions.json` output
 * https://gist.github.com/myedibleenso/87a3191c73938840b8ed768ec305db38
 */

import Token from "./components/Token";
import Link from "./components/Link";
import LongLabel from "./components/LongLabel";

class OdinParser {
  constructor() {
    // This will eventually hold the parsed data for returning to the caller
    this.data = {
      tokens: [],
      links: []
    };

    // Holds the data for individual documents
    this.parsedDocuments = {};

    // Previously-parsed mentions, by Id.
    // Old TextBoundMentions return their host Word/WordCluster
    // Old EventMentions/RelationMentions return their Link
    this.parsedMentions = {};

    // We record the index of the last Token from the previous sentence so
    // that we can generate each Word's global index (if not Token indices
    // will incorrectly restart from 0 for each new document/sentence)
    this.lastTokenIdx = -1;
  }

  /**
   * Parses the given data, filling out `this.data` accordingly.
   * @param {Array} dataObjects - Array of input data objects.  We expect
   *     there to be only one.
   */
  parse(dataObjects) {
    if (dataObjects.length > 1) {
      console.log(
        "Warning: Odin parser received multiple data objects. Only the first" +
          " data object will be parsed."
      );
    }

    const data = dataObjects[0];

    // Clear out any old parse data
    this.reset();

    // At the top level, the data has two parts: `documents` and `mentions`.
    // - `documents` includes the tokens and dependency parses for each
    //   document the data contains.
    // - `mentions` includes all the events/relations that *every* document
    //   contains, but each mention has a `document` property that specifies
    //   which document it applies to.

    // We will display the tokens from every document consecutively, and fill in
    // their mentions to match.
    const docIds = Object.keys(data.documents).sort();
    for (const docId of docIds) {
      this.parsedDocuments[docId] = this._parseDocument(
        data.documents[docId],
        docId
      );
    }

    // There are a number of different types of mentions types:
    // - TextBoundMention
    // - EventMention
    for (const mention of data.mentions) {
      this._parseMention(mention);
    }

    // Return the parsed data (rather than expecting other modules to access
    // it directly)
    return this.data;
  }

  /**
   * Clears out all previously cached parse data (in preparation for a new
   * parse)
   */
  reset() {
    this.data = {
      tokens: [],
      links: []
    };
    this.parsedDocuments = {};
    this.parsedMentions = {};
    this.lastTokenIdx = -1;
  }

  /**
   * Parses a given document (essentially an array of sentences), appending
   * the tokens and first set of dependency links to the final dataset.
   * TODO: Allow user to select between different dependency graphs
   *
   * @param document
   * @property {Object[]} sentences
   *
   * @param {String} docId - Unique identifier for this document
   * @private
   */
  _parseDocument(document, docId) {
    const thisDocument = {};
    /** @type Token[][] **/
    thisDocument.sentences = [];

    /**
     * Each sentence is an object with a number of pre-defined properties;
     * we are interested in the following.
     * @property {String[]} words
     * @property raw
     * @property tags
     * @property lemmas
     * @property entities
     * @property norms
     * @property chunks
     * @property graphs
     */
    for (const [sentenceId, sentence] of document.sentences.entries()) {
      // Hold on to the Words we generate even as we push them up to the
      // main data store, so that we can create their syntax Links too
      // (which rely on sentence-level indices, not global indices)
      const thisSentence = [];

      // Read any token-level annotations
      for (let thisIdx = 0; thisIdx < sentence.words.length; thisIdx++) {
        const thisToken = new Token(
          // Text
          sentence.words[thisIdx],
          // (Global) Token index
          thisIdx + this.lastTokenIdx + 1
        );

        // Various token-level tags, if they are available
        if (sentence.raw) {
          thisToken.registerLabel("raw", sentence.raw[thisIdx]);
        }
        if (sentence.tags) {
          thisToken.registerLabel("POS", sentence.tags[thisIdx]);
        }
        if (sentence.lemmas) {
          thisToken.registerLabel("lemma", sentence.lemmas[thisIdx]);
        }
        if (sentence.entities) {
          thisToken.registerLabel("entity", sentence.entities[thisIdx]);
        }
        if (sentence.norms) {
          thisToken.registerLabel("norm", sentence.norms[thisIdx]);
        }
        if (sentence.chunks) {
          thisToken.registerLabel("chunk", sentence.chunks[thisIdx]);
        }

        thisSentence.push(thisToken);
        this.data.tokens.push(thisToken);
      }

      // Update the global Word index offset for the next sentence
      this.lastTokenIdx += sentence.words.length;

      // Sentences may have multiple dependency graphs available
      const graphTypes = Object.keys(sentence.graphs);

      for (const graphType of graphTypes) {
        /**
         * @property {Object[]} edges
         * @property roots
         */
        const graph = sentence.graphs[graphType];

        /**
         * @property {Number} source
         * @property {Number} destination
         * @property {String} relation
         */
        for (const [edgeId, edge] of graph.edges.entries()) {
          this.data.links.push(
            new Link(
              // eventId
              `${docId}-${sentenceId}-${graphType}-${edgeId}`,
              // Trigger
              thisSentence[edge.source],
              // Arguments
              [
                {
                  anchor: thisSentence[edge.destination],
                  type: edge.relation
                }
              ],
              // Relation type
              edge.relation,
              // Category
              graphType
            )
          );
        }
      }

      thisDocument.sentences.push(thisSentence);
    }

    return thisDocument;
  }

  /**
   * Parses the given mention and enriches the data stores accordingly.
   *
   * - TextBoundMentions become Labels
   * - EventMentions become Links
   * - RelationMentions become Links
   *
   * @param mention
   * @private
   */
  _parseMention(mention) {
    /**
     * @property {String} mention.type
     * @property {String} mention.id
     * @property {String} mention.document - The ID of the mention's host
     *     document
     * @property {Number} mention.sentence - The index of the sentence in the
     *     document that this mention comes from
     * @property {Object} mention.tokenInterval - The start and end indices
     *     for this mention
     * @property {String[]} mention.labels - An Array of the labels that
     *     this mention should have.  By convention, the first element in the
     *     Array is the actual label, and the other elements simply reflect the
     *     higher-levels of the label's taxonomic hierarchy.
     * @property {Object} mention.arguments
     */

    // Have we seen this one before?
    if (this.parsedMentions[mention.id]) {
      return this.parsedMentions[mention.id];
    }

    // TextBoundMention
    // Will become either a tag for a Word, or a WordCluster.
    if (mention.type === "TextBoundMention") {
      const tokens = this.parsedDocuments[mention.document].sentences[
        mention.sentence
      ].slice(mention.tokenInterval.start, mention.tokenInterval.end);
      const label = mention.labels[0];

      if (tokens.length === 1) {
        // Set the annotation Label for this Token
        tokens[0].registerLabel("default", label);
        this.parsedMentions[mention.id] = tokens[0];
        return tokens[0];
      } else {
        // Set the LongLabel for these tokens
        const longLabel = LongLabel.registerLongLabel("default", label, tokens);
        this.parsedMentions[mention.id] = longLabel;
        return longLabel;
      }
    }

    // EventMention/RelationMention
    // Will become a Link
    if (mention.type === "EventMention" || mention.type === "RelationMention") {
      // If there is a trigger, it will be a nested Mention.  Ensure it is
      // parsed.
      let trigger = null;
      if (mention.trigger) {
        trigger = this._parseMention(mention.trigger);
      }

      // Read the relation label
      const relType = mention.labels[0];

      // Generate the arguments array
      // `mentions.arguments` is an Object keyed by argument type.
      // The value of each key is an array of nested Mentions as arguments
      const linkArgs = [];
      for (const [type, args] of Object.entries(mention["arguments"])) {
        for (const arg of args) {
          // Ensure that the argument mention has been parsed before
          const anchor = this._parseMention(arg);
          linkArgs.push({
            anchor,
            type
          });
        }
      }

      // Done; prepare the new Link
      const link = new Link(
        // eventId
        mention.id,
        // Trigger
        trigger,
        // Arguments
        linkArgs,
        // Relation type
        relType
      );
      this.data.links.push(link);
      this.parsedMentions[mention.id] = link;
      return link;
    }
  }
}

// ES6 and CommonJS compatibility
export default OdinParser;
module.exports = OdinParser;
