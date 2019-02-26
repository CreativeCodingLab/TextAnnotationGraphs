/**
 * Parser for Odinson `matches` json
 * https://gist.github.com/myedibleenso/87a3191c73938840b8ed768ec305db38
 */

import Word from "../components/word.js";
import Link from "../components/link.js";
import WordCluster from "../components/word-cluster.js";

class OdinsonParser {
  constructor() {
    // This will eventually hold the parsed data for returning to the caller
    this.data = {
      words: [],
      links: [],
      clusters: []
    };

    this.DEFAULT_LABEL = "MATCH";

    // Previously-parsed mentions by Id.
    this.parsedMentions = {};
  }

  /**
   * Parses the given data, filling out `this.data` accordingly.
   * @param {Object} data
   */
  parse(data) {
    // Clear out any old parse data
    this.reset();

    // Data structure:
    // - `odinsonDoc` the doc ID for this sentence
    // - `matches` includes all spans
    // - `sentence` abridged Sentence json (tokens, their attributes, and dependency parses)

    // store token attributes and parse
    this._parseSentence(data.sentence);

    for (const mention of data.matches) {
      this._parseOdinsonMatch(mention);
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
    this.parsedMentions = {};
    this.lastWordIdx = -1;
  }

  /**
   * Parses a given sentence, appending
   * the tokens and first set of dependency links to the final dataset.
   * TODO: Allow user to select between different dependency graphs
   *
   * @param {Object} sentence
   * @private
   */
  _parseSentence(sentence) {
    /**
     * A sentence is an object with a number of pre-defined properties;
     * we are interested in the following.
     * @property {String[]} words
     * @property tags
     * @property lemmas
     * @property entities
     * @property norms
     * @property chunks
     * @property graphs
     */
     // Hold on to the Words we generate even as we push them up to the
     // main data store, so that we can create their syntax Links too
     // (which rely on sentence-level indices, not global indices)
     const thisSentence = [];

     // Read any token-level annotations
     //let [index, value] of array.entries()
     for (let [idx, word] of sentence.words.entries()) {
     // for (let thisIdx = 0; thisIdx < sentence.words.length; thisIdx++) {
       const thisWord = new Word(word, idx);

       // Various token-level tags, if they are available
       if (sentence.raw) {
         thisWord.registerTag("raw", sentence.raw[idx]);
       }
       if (sentence.tags) {
         thisWord.registerTag("POS", sentence.tags[idx]);
       }
       if (sentence.lemmas) {
         thisWord.registerTag("lemma", sentence.lemmas[idx]);
       }
       if (sentence.entities) {
         thisWord.registerTag("entity", sentence.entities[idx]);
       }
       if (sentence.norms) {
         thisWord.registerTag("norm", sentence.norms[idx]);
       }
       if (sentence.chunks) {
         thisWord.registerTag("chunk", sentence.chunks[idx]);
       }

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
           `${graphType}-${edgeId}`,
           // Trigger
           thisSentence[edge.source],
           // Arguments
           [{
             anchor: thisSentence[edge.destination],
             type: edge.relation
           }],
           // Relation type
           edge.relation,
           // Draw Link above Words?
           false,
           // Category
           graphType
         ));
       }
     }
  }

  /**
   * Generates an ID for a mention span.
   *
   * @param {Number} start
   * @param {Number} end
   * @param {String} label - An optional label for the span
   * @private
   */
  _createId(start, end, label) {
    return `${start}-${end}-${label}`;
  }

  /**
   * Creates an Odinson mention and enriches the data stores accordingly.
   *
   * - a single token span becomes a WordTag
   * - a multitoken span becomes a WordCluster
   *
   * @param {Number} start - Token index marking beginning of mention
   * @param {Number} end - Token index marking end of mention
   * @param {String} label - The label for this mention.
   * @private
   */
  _createOdinsonMention(start, end, label) {
    const mentionTokens = this.data.words.slice(start, end);
    const mentionId     = this._createId(start, end, label);
    if (mentionTokens.length === 1) {
      // Set the annotation tag for this Word
      const tok = this.data.words.slice(start, end)[0];
      tok.registerTag("default", label);
      // tokens[0].setTag(label);
      // save to overwrite
      this.parsedMentions[mentionId] = tok;
    } else {
      const cluster = new WordCluster(mentionTokens, label);
      // check if cluster already exists
      if (!this.parsedMentions[mentionId]) {
        this.data.clusters.push(cluster);
        this.parsedMentions[mentionId] = cluster;
      }
    }
    return mentionId;
  }

  /**
   * Parses named captures to create a mention
   *
   * @param {Object[]} captures - An array of named captures
   * @private
   */
  _parseNamedCaptures(trigger, captures) {
    const linkArgs = [];
    console.log(`"num. captures: ${captures.length}"`);
    console.log(captures);
    // used to name the relation we're creating
    const argIds   = [];
    for (const namedCapture of captures) {
      for (let [argName, span] of Object.entries(namedCapture)) {
        // create and store mention
        const anchorId = this._createOdinsonMention(span.start, span.end, argName);
        argIds.push(anchorId);
        // retrieve the mention
        const anchor   = this.parsedMentions[anchorId];
        linkArgs.push({
          anchor,
          argName
        });
      }
    }

    if (linkArgs.length > 0) {
      // Done; prepare the new Link
      const relationLabel = `${this.DEFAULT_LABEL}-relation`;
      const relationId = [...new Set(argIds, relationLabel)].sort().join("-");
      const link = new Link(
        // relation ID
        relationId,
        trigger,
        // Arguments
        linkArgs,
        // Relation type
        this.DEFAULT_LABEL,
        // Draw Link above Words?
        true
      );
      // Check if the mention already exists
      // Given the design of Odinson matches, this should never already exist
      //this.data.links.push(link);
      if (!this.parsedMentions[relationId]) {
        this.data.links.push(link);
        this.parsedMentions[relationId] = link;
      }
    }
  }

  /**
   * Parses the given Odinson match and enriches the data stores accordingly.
   *
   * - a single token span without named captures becomes a WordTag
   * - a multi-token span without named captures becomes a WordCluster
   * - a span with named captures becomes a set of Links
   *
   * @param {Object} mention - An Odinson match which has span and optional named captures
   * @private
   */
  _parseOdinsonMatch(mention) {
    // determine the label based on the span
    const label    = mention.captures.length === 0 ? this.DEFAULT_LABEL : "";
    const parentId = this._createOdinsonMention(mention.span.start, mention.span.end, label);
    const parent   = this.parsedMentions[parentId];
    this._parseNamedCaptures(parent, mention.captures);
  }

}

export default OdinsonParser;
