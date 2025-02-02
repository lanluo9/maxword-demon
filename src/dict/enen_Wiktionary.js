// how to load User Defined Scripts .js: paste raw git link in scripts options. https://github.com/ninja33/ODH/issues/40
// TODO: add this to built-in scripts

/* global api */
class enen_Wiktionary {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        // let locale = await api.locale();
        // if (locale.indexOf('CN') != -1) return '柯林斯英英词典';
        // if (locale.indexOf('TW') != -1) return '柯林斯英英词典';
        return 'wiktionary.org';
    }


    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        // this.word = api.deinflect(word); // word; TODO: test if deinflect works
        // let deflection = api.deinflect(word); // repo/src/bg/js/deinflector.js#L11 -> \src\bg\data\wordforms.json
        let results = await Promise.all([this.findWiktionary(word)]);
        return [].concat(...results).filter(x => x);
    }

    async findWiktionary(word) {
        let notes = [];
        if (!word) return notes; // return empty notes

        function T(node) { // TODO: what is this?
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        let base = 'https://en.wiktionary.org/wiki/'; // https://en.wiktionary.org/wiki/test#English
        let url = base + encodeURIComponent(word) + '#English'; // TODO: add other languages
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html'); // return a html document
        } catch (err) {
            return [];
        }

        let dictionary = doc.querySelector('.mw-parser-output'); // from here on, inspect the html document to find elements under div class `mw-parser-output`
        if (!dictionary) return notes; // return empty notes
        console.log(dictionary);

        let expression = T(dictionary.querySelector('.h2_entry')); // usually extracted element is a class like `class="h2_entry"`. here it is the word itself
        let reading = T(dictionary.querySelector('.pron')); // pronunciation

        let band = dictionary.querySelector('.word-frequency-img'); // how frequent the word is
        let bandnum = band ? band.dataset.band : '';
        let extrainfo = bandnum ? `<span class="band">${'\u25CF'.repeat(Number(bandnum))}</span>` : '';

        let sound = dictionary.querySelector('a.hwd_sound'); // sound. different from pronunciation?
        let audios = sound ? [sound.dataset.srcMp3] : [];

        // make definition segment
        let definitions = [];
        let defblocks = dictionary.querySelectorAll('.hom') || [];
        for (const defblock of defblocks) {
            let pos = T(defblock.querySelector('.pos'));
            pos = pos ? `<span class="pos">${pos}</span>` : ''; // github copilot explains this line: if pos is not empty, then add pos to pos, otherwise add nothing
            let eng_tran = T(defblock.querySelector('.sense .def')); // `def` is a div class under `sense`, another div class
            if (!eng_tran) continue;
            let definition = '';
            eng_tran = eng_tran.replace(RegExp(expression, 'gi'), '<b>$&</b>');
            eng_tran = `<span class='eng_tran'>${eng_tran}</span>`;
            let tran = `<span class='tran'>${eng_tran}</span>`;
            definition += `${pos}${tran}`;

            // make example segment
            let examps = defblock.querySelectorAll('.sense .cit.type-example') || '';
            if (examps.length > 0 && this.maxexample > 0) {
                definition += '<ul class="sents">';
                for (const [index, examp] of examps.entries()) {
                    if (index > this.maxexample - 1) break; // to control only 2 example sentence.
                    let eng_examp = T(examp) ? T(examp).replace(RegExp(expression, 'gi'), '<b>$&</b>') : '';
                    definition += eng_examp ? `<li class='sent'><span class='eng_sent'>${eng_examp}</span></li>` : '';
                }
                definition += '</ul>';
            }
            definition && definitions.push(definition);
        }

        let css = this.renderCSS();
        notes.push({
            css,
            dictionary,
            expression,
            reading,
            extrainfo,
            definitions,
            audios,
        });
        return notes;
    }

    renderCSS() {
        let css = `
            <style>
                span.band {color:#e52920;}
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0;}
                span.chn_tran {color:#0d47a1;}
                ul.sents {font-size:0.8em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
                span.chn_sent {color:#0d47a1;}
            </style>`;
        return css;
    }
}