/**
 *  electomat - see who you should elect
 *
 *  @author Tobias Bengfort <tobias.bengfort@gmx.net>
 *  @copyright Tobias Bengfort <tobias.bengfort@gmx.net>, 2013-2013
 *  @license LGPL <http://www.gnu.org/licenses/agpl-3.0.html>
 *
 *  # usage
 *
 *  Create a JSON file with your data. See `example.json`.
 *  Load it by attaching `?json=url-to-data.json` to the uRL.
 */

const TRANSLATIONS = {
    'de': {
        '(no opinion)': '(keine Meinung)',
        'full disapproval': 'Vollständige Ablehnung',
        'disapproval': 'Ablehung',
        'neither/nor': 'weder/noch',
        'approval': 'Zustimmung',
        'full approval': 'volle Zustimmung',
        'your choice': 'deine Meinung',
    },
};

const VALUE_LABELS = [
    _('full disapproval'),
    _('disapproval'),
    _('neither/nor'),
    _('approval'),
    _('full approval'),
];

function _(s) {
    return TRANSLATIONS[document.lang]?.[s] ?? s;
}

function h(tag, attrs, children) {
    var el = document.createElement(tag);
    for (const attr in attrs) {
        el[attr] = attrs[attr];
    }
    for (const child of children) {
        if (child) {
            el.append(child);
        }
    }
    return el;
}

var setValue = function(el, value) {
    if (value in ['0', '1', '2', '3', '4']) {
        el.dataset.value = value;
        el.title = VALUE_LABELS[parseInt(value, 10)];
    } else {
        delete el.dataset.value;
        el.title = _('(no opinion)');
    }
};

var getSimilarity = function(rows, partyI) {
    var s = 0;
    var k = 0;

    for (var i = 0; i < rows.length; i++) {
        var userV = rows[i].children[1].dataset.value;
        var partyV = rows[i].children[partyI].dataset.value;

        if (userV) {
            if (partyV) {
                s += Math.pow(parseInt(userV, 10) - parseInt(partyV, 10), 2) / 16;
            } else {
                s += 1/4;
            }
            k += 1;
        }
    }
    return 1 - s / k;
};

var getSimilarities = function(rows) {
    var n = rows[0].children.length;

    // skip question and user cols
    var similarities = [null, null];
    for (var i = 2; i < n; i++) {
        similarities.push(getSimilarity(rows, i));
    }
    return similarities;
};

var sortCols = function(table) {
    var head = table.querySelector('thead tr');
    var rows = table.querySelectorAll('tbody tr');
    var similarities = getSimilarities(rows);

    for (let i = 2; i < head.children.length; i++) {
        const el = head.children[i].querySelector('.similarity');
        el.textContent = ` (${Math.round(similarities[i] * 100)}%)`;
    }

    var moveBefore = function(i, j) {
        if (i === j || i === j - 1) {
            return;
        }

        if (i < j) {
            similarities = [].concat(similarities.slice(0, i), similarities.slice(i + 1, j), similarities[i], similarities.slice(j));
        } else {
            similarities = [].concat(similarities.slice(0, j), similarities[i], similarities.slice(j, i), similarities.slice(i + 1));
        }

        head.insertBefore(head.children[i], head.children[j]);
        for (var k = 0; k < rows.length; k++) {
            rows[k].insertBefore(rows[k].children[i], rows[k].children[j]);
        }
    };

    var quicksort = function(left, right) {
        if (left < right) {
            var pivot = left;

            for (var i = pivot + 1; i <= right; i++) {
                if (similarities[i] > similarities[pivot]) {
                    moveBefore(i, pivot);
                    pivot++;
                }
            }

            quicksort(left, pivot - 1);
            quicksort(pivot + 1, right);
        }
    };

    quicksort(2, similarities.length - 1);
};

var createTh = function(party) {
    return h('th', {scope: 'col'}, [
        h('span', {className: 'name'}, [party.name]),
        h('span', {className: 'similarity'}, []),
    ]);
};

var createTd = function(party, question) {
    var answer = party.answers[question];
    var td = h('td', {}, [answer?.comment]);
    setValue(td, answer.value);
    return td;
};

var createTr = function(question, parties) {
    return h('tr', {}, [
        h('th', {className: 'question', scope: 'row'}, [question]),
        h('td', {}, [
            h('select', {onchange: event => {
                setValue(event.target.closest('td'), event.target.value);
                sortCols(event.target.closest('table'));
            }}, [
                h('option', {value: '-1', selected: true}, [_('(no opinion)')]),
                h('option', {value: '4'}, [VALUE_LABELS[4]]),
                h('option', {value: '3'}, [VALUE_LABELS[3]]),
                h('option', {value: '2'}, [VALUE_LABELS[2]]),
                h('option', {value: '1'}, [VALUE_LABELS[1]]),
                h('option', {value: '0'}, [VALUE_LABELS[0]]),
            ]),
        ]),
        ...parties.map(party => createTd(party, question)),
    ]);
};

var createTable = function(data) {
    return h('table', {}, [
        h('thead', {}, [
            h('tr', {}, [
                h('th', {}, []),
                h('th', {scope: 'col'}, [_('your choice')]),
                ...data.partys.map(createTh),
            ]),
        ]),
        h('tbody', {}, data.questions.map(question => createTr(question, data.partys))),
    ]);
};

var element = document.querySelector('.electomat')
var query = new URLSearchParams(location.search)
fetch(query.get('json')).then(r => r.json()).then(data => {
    element.appendChild(createTable(data));
});
