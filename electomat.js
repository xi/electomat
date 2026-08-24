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
 *  In your html, include `electomat.js` and `electomat.css`
 *  and create a HTML element like this:
 *
 *      <div class="electomat" src="example.json" lang="de"/>
 *
 *  Currently only english and german language are available.
 *  Please note that only the controls are translated, not
 *  the JSON data. You may solve this server-side.
 */

var electomat = (function() {
    "use strict";

    var forEach = function(items, fn) {
        for (var i = 0; i < items.length; i++) {
            fn(items[i], i);
        }
    };

    var ajax = function(url, success, error) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);

        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                success(request);
            } else if (error) {
                error(request);
            }
        };
        request.onerror = function() {
            if (error) {
                error(request);
            }
        };
        request.send();
    };

    var getJSON = function(url, success, error) {
        ajax(url, function(request) {
            var data = JSON.parse(request.responseText);
            success(data, request);
        }, error);
    };

    var renderTemplate = function (template, wrapperType) {
        var wrapper = document.createElement(wrapperType || 'div');
        wrapper.innerHTML = template;
        return wrapper.children[0];
    };

    var translations = {
        'de': {
            "(no opinion)": "(keine Meinung)",
            "full disapproval": "Vollständige Ablehnung",
            "disapproval": "Ablehung",
            "neither/nor": "weder/noch",
            "approval": "Zustimmung",
            "full approval": "volle Zustimmung",
            "your choice": "deine Meinung"
        }
    };

    var getEnvLang = function(env) {
        while (!env.hasAttribute('lang')) {
            if (!env.parentNode || !env.parentNode.hasAttribute) {
                return null;
            } else {
                env = env.parentNode;
            }
        }
        return env.getAttribute('lang');
    };

    var _ = function(s, env) {
        var lang = getEnvLang(env);

        if (!lang) {
            return s;
        }

        if (translations.hasOwnProperty(lang)) {
            if (translations[lang].hasOwnProperty(s)) {
                return translations[lang][s];
            }
        }

        // try again with tag only, e.g. 'en' instead of 'en-US'
        lang = lang.split('-')[0];
        if (translations.hasOwnProperty(lang)) {
            if (translations[lang].hasOwnProperty(s)) {
                return translations[lang][s];
            }
        }

        return s;
    };

    var createTable = function(element, data) {
        var table = renderTemplate('<table>' +
                '<thead>' +
                    '<tr>' +
                        '<th></th>' +
                        '<th scope="col"></th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' +
                '</tbody>' +
            '</table>');

        var value2txt = function(value) {
            if (value === 0) {
                return _('full disapproval', element);
            } else if (value == 1) {
                return _('disapproval', element);
            } else if (value == 2) {
                return _('neither/nor', element);
            } else if (value == 3) {
                return _('approval', element);
            } else if (value == 4) {
                return _('full approval', element);
            } else {
                return _('(no opinion)', element);
            }
        };

        var setValue = function(el, value) {
            if (value in ["0", "1", "2", "3", "4"]) {
                el.setAttribute('data-value', value);
            } else {
                el.removeAttribute('data-value');
            }
            el.setAttribute('title', value2txt(value));
        };

        var getValue = function(rows, rowI, colI) {
            var td = rows[rowI].children[colI];
            if (td.hasAttribute('data-value')) {
                return parseInt(td.getAttribute('data-value'), 10);
            }
        };

        var getSimilarity = function(rows, partyI) {
            var s = 0;
            var k = 0;

            for (var i = 0; i < rows.length; i++) {
                var userV = getValue(rows, i, 1);
                var partyV = getValue(rows, i, partyI);

                if (typeof userV !== "undefined") {
                    if (typeof partyV !== "undefined") {
                        s += Math.pow(userV - partyV, 2) / 16;
                    } else {
                        s += 1/4;
                    }
                    k++;
                }
            }
            return 1 - s/k;
        };

        var getSimilarities = function(rows) {
            var n = rows[0].children.length;

            var similarities = [null, null];  // skip question and user cols
            for (var i = 2; i < n; i++) {
                similarities.push(getSimilarity(rows, i));
            }
            return similarities;
        };

        var sortCols = function(table) {
            var head = table.querySelector('thead tr');
            var rows = table.querySelectorAll('tbody tr');
            var similarities = getSimilarities(rows);

            for (var i = 2; i < head.children.length; i++) {
                var el = head.children[i].getElementsByClassName('similarity');
                if (el) {
                    el[0].textContent = ' (' + Math.round(similarities[i] * 100) + '%)';
                }
            }

            var moveBefore = function(i, j) {
                if (i == j || i == j-1) {
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

                    for (var i = pivot+1; i <= right; i++) {
                        if (similarities[i] > similarities[pivot]) {
                            moveBefore(i, pivot);
                            pivot++;
                        }
                    }

                    quicksort(left, pivot - 1);
                    quicksort(pivot + 1, right);
                }
            };

            // alternative implementation
            var insertionsort = function() {
                for (var i = 2; i < head.children.length; i++) {
                    for (var j = i-1; j >= 2 && similarities[i] > similarities[j]; j--) {}
                    moveBefore(i, j + 1);
                }
            };

            quicksort(2, similarities.length - 1);
        };

        var createTh = function(party) {
            var th = renderTemplate('<th scope="col">' +
                    '<span class="name"></span>' +
                    '<span class="similarity"></span>' +
                '</th>', 'tr');
            var nameHeader = th.querySelector('.name');
            nameHeader.textContent = party.name;
            return th;
        };

        var createTd = function(party, question) {
            var td = renderTemplate('<td></td>', 'tr');
            if (party.answers.hasOwnProperty(question)) {
                var answer = party.answers[question];
                if (answer.hasOwnProperty('comment')) {
                    td.textContent = answer.comment;
                }
                setValue(td, answer.value);
            }
            return td;
        };

        var createTr = function(question, parties) {
            var tr = renderTemplate('<tr>' +
                    '<th class="question" scope="row"></th>' +
                    '<td>' +
                        '<select>' +
                            '<option value="-1" selected="selected"></option>' +
                            '<option value="4"></option>' +
                            '<option value="3"></option>' +
                            '<option value="2"></option>' +
                            '<option value="1"></option>' +
                            '<option value="0"></option>' +
                        '</select>' +
                    '</td>' +
                '</tr>', 'tbody');

            var td = tr.querySelector('td');
            var th = tr.querySelector('th');
            var select = tr.querySelector('select');

            th.textContent = question;

            select.children[0].textContent = _("(no opinion)", element);
            select.children[1].textContent = value2txt(4);
            select.children[2].textContent = value2txt(3);
            select.children[3].textContent = value2txt(2);
            select.children[4].textContent = value2txt(1);
            select.children[5].textContent = value2txt(0);

            select.addEventListener('change', function() {
                setValue(td, select.children[select.selectedIndex].value);
                sortCols(table);
            });

            forEach(parties, function(party) {
                tr.appendChild(createTd(party, question));
            });

            return tr;
        };

        var headRow = table.querySelector('tr');
        var userHead = table.querySelectorAll('th')[1];
        var tbody = table.querySelector('tbody');

        if (element.hasAttribute('lang')) {
            table.setAttribute('lang', element.getAttribute('lang'));
        }

        userHead.textContent = _("your choice", element);

        forEach(data.partys, function(party) {
            headRow.appendChild(createTh(party));
        });

        forEach(data.questions, function(question) {
            tbody.appendChild(createTr(question, data.partys));
        });

        element.addEventListener('scroll', function(event) {
            forEach(table.querySelectorAll('.question'), function(el) {
                el.style.left = event.target.scrollLeft + 'px';
            });
            forEach(table.querySelectorAll('thead th'), function(el) {
                el.style.top = event.target.scrollTop + 'px';
            });
        }, {
            passive: true,
        });

        return table;
    };

    var init = function(element) {
        getJSON(element.getAttribute('src'), function(data) {
            element.appendChild(createTable(element, data));
        });
    };

    document.addEventListener("DOMContentLoaded", function() {
        forEach(document.getElementsByClassName('electomat'), init);
    });

    return init;
})();
