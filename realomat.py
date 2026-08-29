import json
import re
import sys
from urllib.request import urlopen

import yaml

ANSWERS = ['zu weit', None, 'richtig', None, 'nicht weit genug']


def strip_tags(s):
    return re.sub('<[^<]*>', '', s)


if __name__ == '__main__':
    election = sys.argv[1]
    url = f'https://raw.githubusercontent.com/okfde/real-o-mat/refs/heads/main/src/data/elections/{election}.yaml'
    r = urlopen(url)
    data = yaml.safe_load(r)

    questions = []
    parties = {
        party['slug']: {'name': party['name'], 'answers': {}}
        for party in data['parties']
    }

    for question in data['questions']:
        questions.append(question['thesis'])

        for answer in question['answers']:
            parties[answer['party']]['answers'][question['thesis']] = {
                'value': ANSWERS.index(answer['answer']),
                'comment': strip_tags(answer['comment']),
            }

    print(json.dumps({
        'lang': 'de',
        'parties': list(parties.values()),
        'questions': questions,
        'labels': [
            'Geht mir viel zu weit',
            'Geht mir etwas zu weit',
            'Ja, finde ich auch',
            'Reicht mir nicht aus',
            'Reicht mir überhaupt nicht aus',
        ],
        'source': 'https://real-o-mat.de/',
    }, indent=2, ensure_ascii=False))
