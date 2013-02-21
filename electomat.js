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
					th.textContent = 'your choice';
				tr.appendChild(th);

				foreach(data.partys, electomat_th, {'parent': tr});
			thead.appendChild(tr);
		table.appendChild(thead);

		var tbody = document.createElement('tbody');
			foreach(data.questions, electomat_tr, {'parent': tbody, 'partys': data.partys});
		table.appendChild(tbody);
	o.parentNode.insertBefore(table, o);
}

function electomat_th(party, param) {
	var th = document.createElement('th');
		var name = document.createElement('span');
		name.className = 'name';
		name.textContent = party.name;
		th.appendChild(name);

		var similarity = document.createElement('span');
		similarity.className = 'similarity';
		th.appendChild(similarity);
	param.parent.appendChild(th);
}

function electomat_tr(question, param) {
	var tr = document.createElement('tr');
		var td = document.createElement('td');
			td.className = "question";
			td.textContent = question;
		tr.appendChild(td);

		var td = document.createElement('td');
			var select = document.createElement('select');
				var option = document.createElement('option');
					option.setAttribute('value', -1);
					option.textContent = _("(no opinion)");
					option.setAttribute('selected', true);
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 0);
					option.textContent = _("I do not agree at all");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 1);
					option.textContent = _("I disagree");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 2);
					option.textContent = _("neither/nor");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 3);
					option.textContent = _("I agree");
				select.appendChild(option);

				var option = document.createElement('option');
					option.setAttribute('value', 4);
					option.textContent = _("I fully agree");
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
				td.textContent = answer.comment;
			}
			td.setAttribute('data-value', answer.value);
		}
	param.parent.appendChild(td);
}

/*** onchange ***/
function electomat_onchange(select) {
	var td = select.parentElement;
	value = select.children[select.selectedIndex].value;
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
	var rows = table.children[1].children;

	var similarity = [];
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
