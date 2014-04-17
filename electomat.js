/**
 *  electomat - see who you should elect
 *
 *  @author Tobias Bengfort <tobias.bengfort@gmx.net>
 *  @copyright Tobias Bengfort <tobias.bengfort@gmx.net>, 2013
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

/*** helper ***/
window.onDOMReady = function(fn) {
	document.addEventListener("DOMContentLoaded", fn, false);
};

function foreach(o, fn, param) {
	for (key in o) {
		if (o.hasOwnProperty(key)) {
			fn(o[key], param);
		}
	}
}

function ajax(url, success, error) {
	request = new XMLHttpRequest();
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
		data = JSON.parse(request.responseText);
		success(data, request);
	}, error);
}

/*** l10n ***/
translations = {
	'de': {
		"(no opinion)": "(keine Meinung)",
		"I do not agree at all": "stimme \u00fcberhaupt nicht zu",
		"I disagree": "stimme nicht zu",
		"neither/nor": "weder/noch",
		"I agree": "stimme zu",
		"I fully agree": "stimme komplett zu",
		"your choice": "deine Meinung"
	}
}

function _(s, env) {
	while (!env.hasAttribute('lang')) {
		env = env.parentNode;
		if (env === document) {return s}
	}
	lang = env.getAttribute('lang');

	if (translations.hasOwnProperty(lang)) {
		if (translations[lang].hasOwnProperty(s)) {
			return translations[lang][s];
		}
	}
	// try again with tag only, e.g. 'en' instead of 'en-US'
	lang = lang.split('-')[0]
	if (translations.hasOwnProperty(lang)) {
		if (translations[lang].hasOwnProperty(s)) {
			return translations[lang][s];
		}
	}
	return s;
}

/*** create table ***/
function electomat_load(o) {
	getJSON(o.getAttribute('src'), function(data) {
		electomat_table(o, data);
	});
}

function electomat_table(o, data) {
	var table = document.createElement('table');
	o.parentNode.insertBefore(table, o);
	o.parentNode.removeChild(o);
		table.className = "electomat";
		if (o.hasAttribute('lang')) {
			table.setAttribute('lang', o.getAttribute('lang'))
		}

		var thead = document.createElement('thead');
		table.appendChild(thead);
			var tr = document.createElement('tr');
			thead.appendChild(tr);
				var th = document.createElement('th');
				tr.appendChild(th);

				var th = document.createElement('th')
				tr.appendChild(th);
					th.scope = "col";
					th.textContent = _("your choice", table);

				foreach(data.partys, electomat_th, {'parent': tr});

		var tbody = document.createElement('tbody');
		table.appendChild(tbody);
			foreach(data.questions, electomat_tr, {'parent': tbody, 'partys': data.partys});
}

function electomat_th(party, param) {
	var th = document.createElement('th');
	th.scope = "col";
	param.parent.appendChild(th);
		var name = document.createElement('span');
		th.appendChild(name);
		name.className = 'name';
		name.textContent = party.name;

		var similarity = document.createElement('span');
		th.appendChild(similarity);
		similarity.className = 'similarity';
}

function electomat_tr(question, param) {
	var tr = document.createElement('tr');
	param.parent.appendChild(tr);
		var th = document.createElement('th');
		tr.appendChild(th);
			th.className = "question";
			th.scope = "row";
			th.textContent = question;

		var td = document.createElement('td');
		tr.appendChild(td);
			var select = document.createElement('select');
			td.appendChild(select);
				var option = document.createElement('option');
				select.appendChild(option);
					option.setAttribute('value', -1);
					option.textContent = _("(no opinion)", param.parent);
					option.setAttribute('selected', true);

				var option = document.createElement('option');
				select.appendChild(option);
					option.setAttribute('value', 4);
					option.textContent = _("I fully agree", param.parent);

				var option = document.createElement('option', param.parent);
				select.appendChild(option);
					option.setAttribute('value', 3);
					option.textContent = _("I agree", param.parent);

				var option = document.createElement('option', param.parent);
				select.appendChild(option);
					option.setAttribute('value', 2);
					option.textContent = _("neither/nor", param.parent);

				var option = document.createElement('option', param.parent);
				select.appendChild(option);
					option.setAttribute('value', 1);
					option.textContent = _("I disagree", param.parent);

				var option = document.createElement('option');
				select.appendChild(option);
					option.setAttribute('value', 0);
					option.textContent = _("I do not agree at all", param.parent);

				select.setAttribute('onchange', 'electomat_onchange(this)');

		foreach(param.partys, electomat_td, {'parent': tr, 'question': question});
}

function electomat_td(party, param) {
	var td = document.createElement('td');
	param.parent.appendChild(td);
		if (party.answers.hasOwnProperty(param.question)) {
			var answer = party.answers[param.question]
			if (answer.hasOwnProperty('comment')) {
				td.textContent = answer.comment;
			}
			td.setAttribute('data-value', answer.value);
		}
}

/*** onchange ***/
function electomat_onchange(select) {
	var td = select.parentNode;
	value = select.children[select.selectedIndex].value;
	if (value in ["0", "1", "2", "3", "4"]) {
		td.setAttribute('data-value', value);
	}
	else {
		td.removeAttribute('data-value');
	}

	var table = td.parentNode.parentNode.parentNode;
	electomat_sort(table);
}

function electomat_similarity(table) {
	var rows = table.children[1].children;

	var similarity = [null, null]; // first two entries must be empty
	for (i_party=2; i_party<rows[0].children.length; i_party++) {
		var s = 0;
		var k = 0;
		for (i=0; i<rows.length; i++) {
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
		similarity[i_party] = 1 - s/k;
	}
	return similarity;
}

function electomat_sort(table) {
	var similarity = electomat_similarity(table);
	var head = table.children[0].children[0];
	var rows = table.children[1].children;

	for (i=2; i<head.children.length; i++) {
		var o = head.children[i].getElementsByClassName('similarity')
		if (o) {
			o[0].textContent = ' (' + Math.round(similarity[i] * 100) + '%)';
		}
	}

	function moveBefore(i, j) {
		if (i == j || i == j-1) {return}

		if (i<j) {
			similarity = [].concat(similarity.slice(0,i), similarity.slice(i+1,j), similarity[i], similarity.slice(j))
		}
		else {
			similarity = [].concat(similarity.slice(0,j), similarity[i], similarity.slice(j,i), similarity.slice(i+1))
		}

		head.insertBefore(head.children[i], head.children[j]);
		for (k=0; k<rows.length; k++) {
			rows[k].insertBefore(rows[k].children[i], rows[k].children[j]);
		}
	}

	function quicksort(left, right) {
		if (left < right) {
			pivot = left;

			for (i=pivot+1; i<=right; i++) {
				if (similarity[i] > similarity[pivot]) {
					moveBefore(i, pivot);
					pivot++;
				}
			}

			quicksort(left, pivot-1);
			quicksort(pivot+1, right);
		}
	}

	function insertionsort() {
		for (i=2; i<head.children.length; i++) {
			for (j=i-1; j>=2 && similarity[i] > similarity[j]; j--) {}
			moveBefore(i, j+1);
		}
	}

	quicksort(2, similarity.length-1);
}

/*** main ***/
window.onDOMReady(function() {
	l = document.getElementsByClassName('electomat')
	for (i=0; i<l.length; i++) {
		electomat_load(l[i]);
	}
});
