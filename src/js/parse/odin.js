/**
 * Parser for Odin `mentions.json` output
 * https://gist.github.com/myedibleenso/87a3191c73938840b8ed768ec305db38
 */

import Word from "../components/word.js";
import Link from "../components/link.js";
import WordCluster from "../components/word-cluster.js";

class OdinParser {
  constructor() {
    // This will eventually hold the parsed data for returning to the caller
    this.data = {
      words: [],
      links: [],
      clusters: []
    };

    // Holds the data for individual documents
    this.parsedDocuments = {};

    // Previously-parsed mentions, by Id.
    // Old TextBoundMentions return their host Word/WordCluster
    // Old EventMentions/RelationMentions return their Link
    this.parsedMentions = {};
  }

  /**
   * Parses the given data, filling out `this.data` accordingly.
   * @param {Object} data
   */
  parse(data) {
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
      this.parsedDocuments[docId] =
        this._parseDocument(data.documents[docId], docId);
    }

    // There are a number of different types of mentions types:
    // - TextBoundMention
    // - EventMention
    for (const mention of data.mentions) {
      this._parseMention(mention);
    }
  }

  /**
   * Clears out all previously cached parse data (in preparation for a new
   * parse)
   */
  reset() {
    this.data = {
      words: [],
      links: [],
      clusters: []
    };
    this.parsedDocuments = {};
    this.parsedMentions = {};
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
    /** @type Word[][] **/
    thisDocument.sentences = [];

    /**
     * Each sentence is an object with a number of pre-defined properties;
     * we are interested in the following.
     * @property {String[]} words
     * @property tags
     * @property graphs
     */
    for (const [sentenceId, sentence] of document.sentences.entries()) {
      // Hold on to the Words we generate even as we push them up to the
      // main data store, so that we can create their syntax Links too
      const thisSentence = [];

      // The lengths of the `words` and `tags` arrays should be the same
      for (let idx = 0; idx < sentence.words.length; idx++) {
        const thisWord = new Word(sentence.words[idx], idx);
        thisWord.setSyntaxTag(sentence.tags[idx]);

        thisSentence.push(thisWord);
        this.data.words.push(thisWord);
      }

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
          this.data.links.push(new Link(
            // eventId
            `${docId}-${sentenceId}-${graphType}-${edgeId}`,
            // Trigger
            thisSentence[edge.source],
            // Arguments
            [{
              anchor: thisSentence[edge.destination],
              type: edge.relation
            }],
            // Relation type
            null,
            // Draw Link above Words?
            false,
            // Category
            graphType
          ));
        }
      }

      thisDocument.sentences.push(thisSentence);
    }

    return thisDocument;
  }

  /**
   * Parses the given mention and enriches the data stores accordingly.
   *
   * - TextBoundMentions become WordTags
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
      const tokens = this.parsedDocuments[mention.document]
        .sentences[mention.sentence]
        .slice(mention.tokenInterval.start, mention.tokenInterval.end);
      const label = mention.labels[0];

      if (tokens.length === 1) {
        tokens[0].setTag(label);
        this.parsedMentions[mention.id] = tokens[0];
        return tokens[0];
      } else {
        const cluster = new WordCluster(tokens, label);
        this.data.clusters.push(cluster);
        this.parsedMentions[mention.id] = cluster;
        return cluster;
      }
    }

    // EventMention
    // Will become a Link
    if (mention.type === "EventMention") {
      // If there is a trigger, it will be a nested Mention.  Ensure it is
      // parsed.
      let trigger = null;
      if (mention.trigger) {
        trigger = this._parseMention(mention.trigger);
      }

      const linkArgs = [];

      // `mentions.arguments` is an Object keyed by argument type.
      // The value of each key is an array of nested Mentions as arguments
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
        null,
        // Draw Link above Words?
        true
      );
      this.data.links.push(link);
      this.parsedMentions[mention.id] = link;
      return link;
    }

    // RelationMention
    // Will become a Link
    if (mention.type === "RelationMention") {
      // `mentions.arguments` is an Object keyed by argument type.
      // The value of each key is an array of nested Mentions as arguments

      // Sort the keys properly so that we can generate an accurate label;
      // the arguments with lower starting tokens should be on the left.
      let argTypes = Object.keys(mention["arguments"]);
      argTypes.sort((a, b) => {
        // Go through the array of mentions and pick out the lowest starting
        // token
        const mentionsA = mention["arguments"][a];
        const mentionsB = mention["arguments"][b];

        const firstTokenA = mentionsA
          .reduce((prev, next) => {
            if (next.tokenInterval.start < prev) {
              return next.tokenInterval.start;
            } else {
              return prev;
            }
          }, mentionsA[0].tokenInterval.start);
        const firstTokenB = mentionsB
          .reduce((prev, next) => {
            if (next.tokenInterval.start < prev) {
              return next.tokenInterval.start;
            } else {
              return prev;
            }
          }, mentionsB[0].tokenInterval.start);

        if (firstTokenA <= firstTokenB) {
          return -1;
        } else {
          return 1;
        }
      });
      // Generate the relation label
      const reltype = argTypes.join("-");

      // Generate the arguments array
      const linkArgs = [];
      for (const type of argTypes) {
        const args = mention["arguments"][type];
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
        null,
        // Arguments
        linkArgs,
        // Relation type
        reltype,
        // Draw Link above Words?
        true
      );
      this.data.links.push(link);
      this.parsedMentions[mention.id] = link;
      return link;
    }
  }
}

module.exports = OdinParser;