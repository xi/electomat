/**
 *  electomat - see who you should elect
 *
 *  @author Tobias Bengfort <tobias.bengfort@gmx.net>
 *  @copyright Tobias Bengfort <tobias.bengfort@gmx.net>, 2013-2014
 *  @license LGPL <http://www.gnu.org/licenses/agpl-3.0.html>
 *
 *  # usage
 *
 *  Create a json file with your data. See example.json .
 *  In your html, include electomat.js and electomat.css
 *  and create a html element like this:
 *
 *      <div class="electomat" src="example.json" lang="de"/>
 *
 *  Currently only english and german language are available.
 *  Please note that only the controls are translated, not
 *  the json data. You may solve this server-side.
 */

var electomat = (function() {
	"use strict";

	function forEach(items, fn) {
		for (var i = 0; i < items.length; i++) {
			fn(items[i], i);
		}
	}

	function ajax(url, success, error) {
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
	}
	function getJSON(url, success, error) {
		ajax(url, function(request) {
			var data = JSON.parse(request.responseText);
			success(data, request);
		}, error);
	}

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
	}

	function getEnvLang(env) {
		while (!env.hasAttribute('lang')) {
			if (env === document) {
				return null;
			} else {
				env = env.parentNode;
			}
		}
		return env.getAttribute('lang');
	}

	function _(s, env) {
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
	}

	/*** create table ***/
	function electomat(el) {
		getJSON(el.getAttribute('src'), function(data) {
			create_table(el, data);
		});
	}

	function create_table(el, data) {
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
				create_th(party, {'parent': tr});
			});

			var tbody = document.createElement('tbody');
			table.appendChild(tbody);
				forEach(data.questions, function(question) {
					create_tr(question, {'parent': tbody, 'partys': data.partys});
				});
	}

	function create_th(party, param) {
		var th = document.createElement('th');
		th.scope = "col";
		param.parent.appendChild(th);
		th.innerHTML += '<span class="name">' + party.name + '</span>';
		th.innerHTML += '<span class="similarity"></span>';
	}

	function create_tr(question, param) {
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
				sort_cols(table);
			});

			forEach(param.partys, function(party) {
				create_td(party, {'parent': tr, 'question': question});
			});
	}

	function create_td(party, param) {
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

	function value2txt(value, ctx) {
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
	}

	function setValue(el, value) {
		if (value in ["0", "1", "2", "3", "4"]) {
			el.setAttribute('data-value', value);
		} else {
			el.removeAttribute('data-value');
		}
		el.setAttribute('title', value2txt(value, el));
	}

	function get_similarities(table) {
		var rows = table.children[1].children;

		var similarities = [null, null]; // first two entries must be empty
		for (var i_party = 2; i_party < rows[0].children.length; i_party++) {
			var s = 0;
			var k = 0;
			for (var i = 0; i < rows.length; i++) {
				var vs = [];
				var td_user = rows[i].children[1];
				var td_party = rows[i].children[i_party];

				if (td_user.hasAttribute('data-value')) {
					if (td_party.hasAttribute('data-value')) {
						var v_user = parseInt(td_user.getAttribute('data-value'), 10);
						var v_party = parseInt(td_party.getAttribute('data-value'), 10);
						s += (v_user - v_party) * (v_user - v_party) / 16;
					}
					else {
						s += 1/4;
					}
					k++;
				}
			}
			similarities[i_party] = 1 - s/k;
		}
		return similarities;
	}

	function sort_cols(table) {
		var similarities = get_similarities(table);
		var head = table.children[0].children[0];
		var rows = table.children[1].children;

		for (var i = 2; i < head.children.length; i++) {
			var el = head.children[i].getElementsByClassName('similarity');
			if (el) {
				el[0].textContent = ' (' + Math.round(similarities[i] * 100) + '%)';
			}
		}

		function moveBefore(i, j) {
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

		function quicksort(left, right) {
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
		function insertionsort() {
			for (var i = 2; i < head.children.length; i++) {
				for (var j = i-1; j >= 2 && similarities[i] > similarities[j]; j--) {}
				moveBefore(i, j + 1);
			}
		}

		quicksort(2, similarities.length - 1);
	}

	/*** main ***/
	document.addEventListener("DOMContentLoaded", function() {
		forEach(document.getElementsByClassName('electomat'), electomat);
	});

	return electomat;
})();
