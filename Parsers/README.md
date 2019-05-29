# Parser Classes

At the minimum, Parser classes should define a `.parse()` method that takes an array of input data objects (representing a single annotated document) and returns an object containing the parsed Tokens and Links:

```javascript
const parsed = {
  tokens: [...],
  links: [...]
}
```

## Tokens

Tokens represent raw entity/token strings within the document.

Tokens may be associated with one or more Label annotations.

Labels that span multiple Tokens are instantiated as LongLabels instead.

## Labels

Labels are added to a Token via the `.registerLabel()` method. Parsers should not instantiate Labels directly.

## LongLabels

Because LongLabels span multiple words, they cannot simply be added via Token methods; rather, use the static `LongLabel.registerLongLabel()` method to register a LongLabel to a group of Tokens.

The `.getLabelCategories()` method shows which Labels and LongLabels are associated with a Token under which categories.

## Links

Links represent events and other relationships between Tokens.