import io
import json
import re
import sys
from urllib.request import urlopen
from zipfile import ZipFile

questions = []
partys = []


def parse_defs(fh):
    for line in fh:
        match = re.match(r"WOMT_aThesen\[([0-9]+)\]\[0\]\[1\] = '(.*)';", line)
        if match:
            question, text = match.groups()
            question = int(question)

            assert len(questions) == question
            questions.append(text)

        match = re.match(r"WOMT_aThesenParteien\[([0-9]+)\]\[([0-9]+)\] = '(.*)';", line)
        if match:
            question, party, value = match.groups()
            party = int(party, 10)
            question = int(question, 10)
            value = int(value, 10)

            while len(partys) <= party:
                partys.append({'answers': {}})
            answers = partys[party]['answers']
            q = questions[question]
            answers[q] = {'value': (value + 1) * 2}

        match = re.match(r"WOMT_aParteien\[([0-9]+)\]\[0\]\[1\]='(.*)'", line)
        if match:
            party, name = match.groups()
            party = int(party)

            while len(partys) <= party:
                partys.append({'answers': []})
            partys[party]['name'] = name


def parse_defs_stmts(fh):
    for line in fh:
        match = re.match(r"WOMT_aThesenParteienText\[([0-9]+)\]\[([0-9]+)\]\[0\] = '(.*)';", line)
        if match:
            question, party, comment = match.groups()
            party = int(party, 10)
            question = int(question, 10)

            answers = partys[party]['answers']
            q = questions[question]
            answers[q]['comment'] = comment


if __name__ == '__main__':
    election = sys.argv[1]
    url = f'https://www.wahl-o-mat.de/{election}/wahlomat.zip'
    r = urlopen(url)
    with ZipFile(io.BytesIO(r.read())) as zfh:
        for name in zfh.namelist():
            if name.endswith('module_definition.js'):
                with zfh.open(name) as fh:
                    parse_defs(io.TextIOWrapper(fh))
            elif name.endswith('module_definition_statements.js'):
                with zfh.open(name) as fh:
                    parse_defs_stmts(io.TextIOWrapper(fh))
    print(json.dumps({'partys': partys, 'questions': questions}, indent=2))
