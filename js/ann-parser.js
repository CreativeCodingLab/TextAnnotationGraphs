const parseAnn = (function() {
    class TextBoundMention {
        constructor(id, label, charStart, charEnd) {
            this.id = id;
            this.label = label;
            this.charStart = charStart;
            this.charEnd = charEnd;
        }
    }

    class EventMention {
        constructor(id, label, trigger, args) {
            this.id = id;
            this.label = label;
            this.trigger = trigger;
            this.arguments = args;
        }
    }

    class RelationMention {
        constructor(id, label, arg1, arg2) {
            this.id = id;
            this.label = label;
            this.arguments = [arg1, arg2];
        }
    }

    class Attribute {
        constructor(id, target, attribute, value) {
            this.id = id;
            this.target = target;
            this.attribute = attribute;
            this.value = value;
        }
    }

    const re = /:+(?=[TER]\d+$)/;

    function parseTextBoundMention(tokens, text) {
        const id = +tokens[0].slice(1),
            label = tokens[1],
            charStart = +tokens[2],
            charEnd = +tokens[3];

        if (id > 0 && charStart >= 0 && charStart < charEnd && charEnd < text.length) {
            return new TextBoundMention('T' + id, label, charStart, charEnd);
        }    
    }

    function parseEventMention(tokens, mentions) {
        const id = +tokens[0].slice(1),
            trigger = tokens[1],
            arguments = tokens.slice(2);

        if (id > 0 && trigger) {
            let split = trigger.split(re);
            if (split[0].length > 0 && mentions[split[1]]) {

                const em = new EventMention('E' + id, split[0], split[1], []);

                arguments.forEach(argument => {
                    let splitArgument = argument.split(re);
                    if (splitArgument[0].length > 0 && mentions[splitArgument[1]]) {
                        em.arguments.push({
                            type: splitArgument[0],
                            id: splitArgument[1]
                        });
                    }
                });

                return em;
            }
        }
    }

    function parseRelationMention(tokens, mentions) {
        const id = +tokens[0].slice(1),
            label = tokens[1],
            arg1 = tokens[2],
            arg2 = tokens[3];

        if (id > 0 && arg2) {
            const split1 = arg1.split(re),
                split2 = arg2.split(re);

            if (mentions[split1[1]] && mentions[split2[1]]) {
                return new RelationMention('R' + id, label, {
                    type: split1[0],
                    id: split1[1]
                }, {
                    type: split2[0],
                    id: split2[1]
                });
            }
        }
    }

    function parseAttributes(tokens, mentions) {
        const id = +tokens[0].slice(1),
            attr = tokens[1],
            target = tokens[2];

        if (id > 0 && mentions[target]) {
            return new Attribute(id, target, attr, tokens.slice(3).join(' '));
        }
    }

    function parse(input) {

        var output = {
            texts: [],
            events: [],
            relations: [],
            attributes: [],
            unparsedLines: [],
            mentions: {}
        }

        let lines = input.split('\n');

        let text = lines[0];
        if (!text) {
            output.unparsedLines = lines;
            return output;
        }

        let unparsedLines = [];
        let mentions = {};

        for (let i = 1; i < lines.length; ++i) {
            const line = lines[i].trim();
            if (!line) { continue; }

            let tokens = line.split(/\s+/);

            let parseIsSuccessful = false;

            /** The following IDs are currently supported:
            
            T: text-bound annotation
            E: event
            R: relation
            A: attribute

            Normalizations, notes, and equivalence relations are not currently supported
            */

            switch (tokens[0].charAt(0)) {
                case 'T':
                    let tbm = parseTextBoundMention(tokens, text);
                    if (tbm) {
                        output.texts.push(tbm);
                        mentions[tbm.id] = tbm;
                    }
                    break;
                case 'E':
                    let em = parseEventMention(tokens, mentions);
                    if (em) {
                        output.events.push(em);
                        mentions[em.id] = em;
                    }
                    break;
                case 'R':
                    let rm = parseRelationMention(tokens, mentions);
                    if (rm) {
                        output.relations.push(rm);
                        mentions[rm.id] = rm;
                    }
                    break;
                case 'A':
                    let a = parseAttribute(tokens, mentions);
                    if (a) {
                        output.attributes.push(a);
                        mentions[a.id] = a;
                    }
                    break;
            }

            if (!parseIsSuccessful) {
                unparsedLines.push(line);
            }
        }

        output.mentions = mentions;
        output.unparsedLines = unparsedLines;

        return output;
    }

    return parse;
})();