# TextAnnotationGraphs (TAG)
A modular annotation system that supports complex, interactive annotation graphs embedded on top of sequences of text. An additional view displays a subgraph of selected connections between words/phrases using an interactive network layout.

![TAG](/figs/OneRow.png)

---

![TAG](/figs/taxonomyColors.png)

---

![TAG](/figs/TwoRows.png)

---

![TAG](/figs/trees.png)


## Development
TAG was developed by Angus Forbes (UC Santa Cruz) and Kristine Lee (University of Illinios at Chicago), in collaboration with Gus Hahn-Powell, Marco Antonio Valenzuela Escárcega, and Mihai Surdeanu (University of Arizona). Contact angus@ucsc.edu for more information.

# Citing TAG

If you use TAG in your work, please use the following citation:

```
@inproceedings{TAG-2018,
    author = {Angus Forbes and Kristine Lee and Gus Hahn-Powell and Marco A. Valenzuela-Escárcega and Mihai Surdeanu},
    title = {Text Annotation Graphs: Annotating Complex Natural Language Phenomena},
    booktitle = {Proceedings of the Eleventh International Conference on Language Resources and Evaluation (LREC'18)},
    year = {2018},
    month = {May},
    date = {7-12},
    address = {Miyazaki, Japan},
    editor = {Sara Goggi and Hélène Mazo},
    publisher = {European Language Resources Association (ELRA)},
    language = {english}
}
```

## Write-up
A paper describing TAG was accepted to [LREC'18](http://lrec2018.lrec-conf.org/en/conference-programme/accepted-papers/). A pre-print can be found at [https://arxiv.org/abs/1711.00529](https://arxiv.org/abs/1711.00529)

## Installation

TAG can be built and installed using [`npm`](https://docs.npmjs.com/getting-started/installing-node).

### Via `npm`

```
npm install git+https://github.com/CreativeCodingLab/TextAnnotationGraphs.git
```

## Development

Tasks are managed with [`npm` scripts](https://docs.npmjs.com/misc/scripts).

### Building the source
Assuming you've cloned the repository, simply run `npm run all` to install dependencies and transpile the source to ES2015.

### Live monitoring of changes

For convience, you can monitor changes to the library's source (css + js) with the following `npm` task:

```
npm run watch
```
