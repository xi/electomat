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

	/*** l10n ***/
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
			if (env === document) {
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

	/*** create table ***/
	var init = function(el) {
		getJSON(el.getAttribute('src'), function(data) {
			createTable(el, data);
		});
	};

	var createTable = function(el, data) {
		var table = document.createElement('table');
		el.parentNode.replaceChild(table, el);
			table.className = "electomat";
			if (el.hasAttribute('lang')) {
				table.setAttribute('lang', el.getAttribute('lang'));
			}

			var thead = document.createElement('thead');
			table.appendChild(thead);
			var tr = document.createElement('tr');
			thead.appendChild(tr);

			tr.innerHTML += '<th></th>';
			tr.innerHTML += '<th scope="col">' + _("your choice", table); + '</th>'
			forEach(data.partys, function(party) {
				createTh(party, {'parent': tr});
			});

			var tbody = document.createElement('tbody');
			table.appendChild(tbody);
				forEach(data.questions, function(question) {
					createTr(question, {'parent': tbody, 'partys': data.partys});
				});
	}

	var createTh = function(party, param) {
		var th = document.createElement('th');
		th.scope = "col";
		param.parent.appendChild(th);
		th.innerHTML += '<span class="name">' + party.name + '</span>';
		th.innerHTML += '<span class="similarity"></span>';
	}

	var createTr = function(question, param) {
		var tr = document.createElement('tr');
		param.parent.appendChild(tr);
			tr.innerHTML += '<th class="question" scope="row">' + question + '</th>';

			var td = document.createElement('td');
			tr.appendChild(td);

			var select = document.createElement('select');
			td.appendChild(select);
			select.innerHTML += '<option value="-1" selected>' + _("(no opinion)", param.parent) + '</option>';
			select.innerHTML += '<option value="4">' + value2txt(4, param.parent) + '</option>';
			select.innerHTML += '<option value="3">' + value2txt(3, param.parent) + '</option>';
			select.innerHTML += '<option value="2">' + value2txt(2, param.parent) + '</option>';
			select.innerHTML += '<option value="1">' + value2txt(1, param.parent) + '</option>';
			select.innerHTML += '<option value="0">' + value2txt(0, param.parent) + '</option>';
			select.addEventListener('change', function() {
				setValue(td, select.children[select.selectedIndex].value);

				var table = td.parentNode.parentNode.parentNode;
				sortCols(table);
			});

			forEach(param.partys, function(party) {
				createTd(party, {'parent': tr, 'question': question});
			});
	}

	var createTd = function(party, param) {
		var td = document.createElement('td');
		param.parent.appendChild(td);
		if (party.answers.hasOwnProperty(param.question)) {
			var answer = party.answers[param.question];
			if (answer.hasOwnProperty('comment')) {
				td.textContent = answer.comment;
			}
			setValue(td, answer.value);
		}
	}

	var value2txt = function(value, ctx) {
		if (value == 0) {
			return _('full disapproval', ctx);
		} else if (value == 1) {
			return _('disapproval', ctx);
		} else if (value == 2) {
			return _('neither/nor', ctx);
		} else if (value == 3) {
			return _('approval', ctx);
		} else if (value == 4) {
			return _('full approval', ctx);
		} else {
			return _('(no opinion)', ctx);
		}
	};

	var setValue = function(el, value) {
		if (value in ["0", "1", "2", "3", "4"]) {
			el.setAttribute('data-value', value);
		} else {
			el.removeAttribute('data-value');
		}
		el.setAttribute('title', value2txt(value, el));
	};

	var getValue = function(table, rowI, colI) {
		var row = table.children[1].children[rowI];
		var td = row.children[colI];
		if (td.hasAttribute('data-value')) {
			return parseInt(td.getAttribute('data-value'), 10);
		}
	};

	var getSimilarity = function(table, partyI) {
		var rows = table.children[1].children;

		var s = 0;
		var k = 0;

		for (var i = 0; i < rows.length; i++) {
			var userV = getValue(table, i, 1);
			var partyV = getValue(table, i, partyI);

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

	var getSimilarities = function(table) {
		var n = table.children[0].children[0].children.length;

		var similarities = [null, null]; // skip question and user cols
		for (var i = 2; i < n; i++) {
			similarities.push(getSimilarity(table, i));
		}
		return similarities;
	};

	var sortCols = function(table) {
		var similarities = getSimilarities(table);
		var head = table.children[0].children[0];
		var rows = table.children[1].children;

		for (var i = 2; i < head.children.length; i++) {
			var el = head.children[i].getElementsByClassName('similarity');
			if (el) {
				el[0].textContent = ' (' + Math.round(similarities[i] * 100) + '%)';
			}
		}

		var moveBefore = function(i, j) {
			if (i == j || i == j-1) {return}

			if (i < j) {
				similarities = [].concat(similarities.slice(0, i), similarities.slice(i + 1, j), similarities[i], similarities.slice(j));
			}
			else {
				similarities = [].concat(similarities.slice(0, j), similarities[i], similarities.slice(j, i), similarities.slice(i + 1));
			}

			head.insertBefore(head.children[i], head.children[j]);
			for (var k = 0; k < rows.length; k++) {
				rows[k].insertBefore(rows[k].children[i], rows[k].children[j]);
			}
		}

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
		}

		// alternative implementation
		var insertionsort = function() {
			for (var i = 2; i < head.children.length; i++) {
				for (var j = i-1; j >= 2 && similarities[i] > similarities[j]; j--) {}
				moveBefore(i, j + 1);
			}
		}

		quicksort(2, similarities.length - 1);
	};

	/*** main ***/
	document.addEventListener("DOMContentLoaded", function() {
		forEach(document.getElementsByClassName('electomat'), init);
	});

	return init;
})();
