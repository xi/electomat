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
 *      <div class="electomat" src="example.json"/>
 */

/*** helper ***/
window.onDOMReady	=	function(fn) {
	document.addEventListener("DOMContentLoaded",	fn,	false);
};

function foreach(o, fn, param) {
	for (key in o) {
		if (o.hasOwnProperty(key)) {
			fn(o[key], param);
		}
	}
}

// gettext placeholder
function _(s) {return s;}

/*** create table ***/
function electomat_load(o, param) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', o.getAttribute('src'), true);
	xmlhttp.onreadystatechange = function() {
		if(xmlhttp.readyState==4) {
			if(xmlhttp.status==200) {
				var data = JSON.parse(xmlhttp.responseText);
				electomat_table(o, data);
			}
		}
	};
	xmlhttp.send(null);
}

function electomat_table(o, data) {
	var table = document.createElement('table');
		table.className = "electomat";

		var thead = document.createElement('thead');
			var tr = document.createElement('tr');
				var th = document.createElement('th');
				tr.appendChild(th);

				var th = document.createElement('th')
					th.innerHTML = 'your choice';
				tr.appendChild(th);

				foreach(data.partys, electomat_th, {'parent': tr});
			thead.appendChild(tr);
		table.appendChild(thead);

		var tbody = document.createElement('tbody');
			foreach(data.questions, electomat_tr, {'parent': tbody, 'partys': data.partys});
		table.appendChild(tbody);
	o.outerHTML = table.outerHTML;
}

function electomat_th(party, param) {
	var th = document.createElement('th');
		th.innerHTML = party.name;
	param.parent.appendChild(th);
}

function electomat_tr(question, param) {
	var tr = document.createElement('tr');
		var td = document.createElement('td');
			td.className = "question";
			td.innerHTML = question;
		tr.appendChild(td);

		var td = document.createElement('td');
			var select = document.createElement('select');
				var option = document.createElement('option');
					option.setAttribute('value', -1);
					option.innerHTML = _("(no opinion)");
					option.setAttribute('selected', true);
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 0);
					option.innerHTML = _("I do not agree at all");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 1);
					option.innerHTML = _("I disagree");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 2);
					option.innerHTML = _("neither/nor");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 3);
					option.innerHTML = _("I agree");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 4);
					option.innerHTML = _("I fully agree");
				select.appendChild(option);

				select.setAttribute('onchange', 'electomat_onchange(this)');
			td.appendChild(select);
		tr.appendChild(td);

		foreach(param.partys, electomat_td, {'parent': tr, 'question': question});
	param.parent.appendChild(tr);
}

function electomat_td(party, param) {
	var td = document.createElement('td');
		if (party.answers.hasOwnProperty(param.question)) {
			var answer = party.answers[param.question]
			if (answer.hasOwnProperty('comment')) {
				td.innerHTML = answer.comment;
			}
			td.setAttribute('data-value', answer.value);
		}
	param.parent.appendChild(td);
}

/*** onchange ***/
function electomat_onchange(select) {
	var td = select.parentElement;
	value = select.selectedOptions[0].value;
	if (value in ["0", "1", "2", "3", "4"]) {
		td.setAttribute('data-value', value);
	}
	else {
		td.removeAttribute('data-value');
	}

	var table = td.parentElement.parentElement.parentElement;
	electomat_sort(table);
}

function electomat_similarity(table) {
	var thead = table.children[0].children[0];
	var tbody = table.children[1];

	var similarity = [];
	for (i_party=2; i_party<thead.children.length; i_party++) {
		var s = 0;
		var k = 0;
		for (i=0; i<tbody.children.length; i++) {
			var tr = tbody.children[i];
			var td_user = tr.children[1];
			var td_party = tr.children[i_party];
			if (td_user.hasAttribute('data-value') && td_party.hasAttribute('data-value')) {
				var v_user = parseInt(td_user.getAttribute('data-value'), 10);
				var v_party = parseInt(td_party.getAttribute('data-value'), 10);
				if (v_user >= 0 && v_party >= 0) {
					s += (v_user - v_party) * (v_user - v_party);
					k += 1;
				}
			}
		}
		thead.children[i_party].setAttribute('data-similarity', JSON.stringify([k,s]));
		s = k/(s+1);
		similarity[i_party] = s;
	}
	return similarity;
}

function electomat_sort(table) {
	var similarity = electomat_similarity(table);
	var head = table.children[0].children[0];
	var rows = table.children[1].children;

	// bubblesort
	for (i=2; i<rows[0].children.length; i++) {
		var j = i-1;
		var s = similarity[i];
		while (j>=2 && s > similarity[j]) {
			similarity[j+1] = similarity[j];
			j--;
		}
		similarity[j+1] = s;

		head.insertBefore(head.children[i], head.children[j+1]);
		for (k=0; k<rows.length; k++) {
			rows[k].insertBefore(rows[k].children[i], rows[k].children[j+1]);
		}
	}
}

/*** main ***/
window.onDOMReady(function() {
	l = document.getElementsByClassName('electomat')
	for (i=0; i<l.length; i++) {
		electomat_load(l[i]);
	}
});
