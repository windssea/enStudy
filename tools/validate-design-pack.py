"""Read-only checks of document links, course coverage, JSON and core SQL design."""
from collections import Counter
from pathlib import Path
import csv
import json
import re
import sqlite3
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
checks = []

def checked(name, predicate):
    assert predicate, name
    checks.append(name)

missing = []
for path in ROOT.rglob('*.md'):
    if any(part in {'node_modules','dist','.git','.wrangler','artifacts','.cloudflare'} for part in path.relative_to(ROOT).parts):
        continue
    for target in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)', path.read_text(encoding='utf-8')):
        if re.match(r'[a-z]+:', target) or target.startswith('#'):
            continue
        destination = (path.parent / target.split('#')[0]).resolve()
        if not destination.exists():
            missing.append({'file':str(path.relative_to(ROOT)), 'target':target})
checked('all_relative_markdown_links_exist',not missing)
with (ROOT/'docs/curriculum/p1-p6-scope.csv').open(encoding='utf-8-sig',newline='') as f:
    rows = list(csv.DictReader(f))
checked('72_units',len(rows)==72)
checked('12_units_per_grade',Counter(row['grade'] for row in rows)=={str(i):12 for i in range(1,7)})
checked('6_units_per_term',all(sum(r['grade']==str(g) and r['term']==t for r in rows)==6 for g in range(1,7) for t in ('A','B')))
checked('unique_unit_ids',len({r['unit_id'] for r in rows})==72)
checked('288_planned_lessons',sum(int(r['lesson_count']) for r in rows)==288)
checked('2592_planned_unit_items',sum(int(r['minimum_unit_items']) for r in rows)==2592)
checked('planned_not_published',all(r['content_status']=='planned' for r in rows))
with (ROOT/'docs/curriculum/topic-training-scope.csv').open(encoding='utf-8-sig',newline='') as f:
    topics=list(csv.DictReader(f))
checked('60_training_topics',len(topics)==60)
checked('8_training_categories',set(t['category'] for t in topics)=={'grammar','tense','forms','sentence','vocabulary','phonics','reading','expression'})
checked('unique_training_topic_ids',len({t['topic_id'] for t in topics})==60)
checked('1440_planned_topic_references',sum(int(t['minimum_item_refs']) for t in topics)==1440)
checked('480_new_unique_training_items',sum(int(t['new_unique_items']) for t in topics)==480)
checked('valid_topic_grade_ranges',all(1<=int(t['grade_min'])<=int(t['grade_max'])<=6 for t in topics))
checked('training_topics_not_misrepresented_as_published',all(t['status']=='planned' for t in topics))
with (ROOT/'docs/curriculum/sentence-patterns.csv').open(encoding='utf-8-sig',newline='') as f:
    patterns=list(csv.DictReader(f))
checked('72_draft_sentence_patterns',len(patterns)==72)
checked('12_pattern_groups_with_6_each',len(Counter(p['cluster'] for p in patterns))==12 and all(v==6 for v in Counter(p['cluster'] for p in patterns).values()))
checked('unique_pattern_ids',len({p['pattern_id'] for p in patterns})==72)
checked('patterns_reference_registered_topics',{p['topic_id'] for p in patterns}=={t['topic_id'] for t in topics if t['topic_id'].startswith('sentence.patterns.')})
checked('pattern_grade_ranges',all(1<=int(p['grade_min'])<=int(p['grade_max'])<=6 for p in patterns))
checked('pattern_kinds_context_and_constraints',all(p['kind'] in ('chunk','frame','construction') and p['slot_rule'] and p['frame'] and p['example'] for p in patterns))
checked('patterns_not_misrepresented_as_reviewed',all(p['status']=='draft' for p in patterns))
lesson = json.loads((ROOT/'docs/examples/lesson.schema-example.json').read_text(encoding='utf-8'))
checked('lesson_is_draft',lesson['status']=='draft' and not lesson['editorial']['languageReviewed'])
checked('private_answers_identified','privateAnswer' in lesson['serverOnlyFields'])
for item in lesson['items']:
    if item['type']=='single-choice':
        checked('answer_is_valid_option_'+item['id'],item['privateAnswer']['optionId'] in {o['id'] for o in item['options']})
    if item['type']=='token-order':
        valid = {o['id'] for o in item['tokens']}
        checked('valid_token_sequence',all(t in valid for seq in item['privateAnswer']['acceptedSequences'] for t in seq))

db = sqlite3.connect(':memory:')
db.executescript((ROOT/'docs/specs/schema.sql').read_text(encoding='utf-8'))
checked('core_schema_executes_on_sqlite',True)
db.executemany('INSERT INTO households VALUES(?,?,?)',[('h1','A',0),('h2','B',0)])
db.execute("INSERT INTO adults VALUES('adult','subject_01',0)")
db.execute("INSERT INTO household_members VALUES('h2','adult','owner')")
db.execute("INSERT INTO children(id,household_id,nickname,grade,created_at) VALUES('c1','h1','A',3,0)")
db.commit()
try:
    db.execute("INSERT INTO child_grants VALUES('g2','h2','c1','hash','adult',100,NULL)")
except sqlite3.IntegrityError:
    checked('cross_family_child_reference_rejected',True)
else:
    raise AssertionError('cross family reference accepted')
db.rollback()
# Test the SQLite CAS assertion mechanics; D1 remote semantics remain a future spike.
with db:
    db.execute("UPDATE children SET stream_version=stream_version+1 WHERE id='c1' AND stream_version=0")
    db.execute("INSERT INTO commit_assertions VALUES('e1','h1','c1',changes())")
checked('cas_success_assertion',db.execute("SELECT stream_version FROM children WHERE id='c1'").fetchone()[0]==1)
try:
    with db:
        db.execute("UPDATE children SET stream_version=stream_version+1 WHERE id='c1' AND stream_version=1")
        db.execute("UPDATE children SET stream_version=stream_version+1 WHERE id='c1' AND stream_version=99")
        db.execute("INSERT INTO commit_assertions VALUES('e2','h1','c1',changes())")
except sqlite3.IntegrityError:
    checked('failed_cas_rolls_back_entire_sqlite_transaction',db.execute("SELECT stream_version FROM children WHERE id='c1'").fetchone()[0]==1)
else:
    raise AssertionError('failed CAS did not abort')
db.execute("INSERT INTO content_releases VALUES('release1','published','hash',0)")
db.execute("INSERT INTO learning_sessions VALUES('session1','h1','c1','release1','lease1','active',0)")
db.execute("INSERT INTO learning_sessions VALUES('session2','h1','c1','release1','lease2','paused',0)")
db.execute("INSERT INTO training_topics VALUES('tense.past',1,'tense','过去时',4,6,'{}','draft')")
db.execute("INSERT INTO training_runs VALUES('run1','h1','c1','session1','tense.past',1,'diagnostic','active','{}',0)")
db.execute("INSERT INTO skills VALUES('lexeme.go','lexeme','go')")
db.execute("INSERT INTO skills VALUES('morphology.past','morphology','过去式')")
db.executemany("INSERT INTO word_forms VALUES(?,?,?,?,?,?,?)",[
    ('wf1','lexeme.go','go','past','went','common','{}'),
    ('wf2','lexeme.go','go','participle','gone','common','{}'),
])
db.commit()
checked('training_run_uses_existing_child_session',db.execute('SELECT count(*) FROM training_runs').fetchone()[0]==1)
try:
    db.execute("INSERT INTO training_runs VALUES('run_bad','h2','c1','session2','tense.past',1,'practice','active','{}',0)")
except sqlite3.IntegrityError:
    checked('training_run_cross_household_rejected',True)
else:
    raise AssertionError('cross-family training run accepted')
db.rollback()
checked('word_form_and_grammar_dimensions_supported',db.execute("SELECT count(*) FROM word_forms WHERE lemma='go'").fetchone()[0]==2)
db.execute("INSERT INTO skills VALUES('grammar.patterns.suggestions','grammar','邀请与建议')")
db.execute("INSERT INTO training_topics VALUES('sentence.patterns.suggestions',1,'sentence','邀请与建议',2,6,'{}','draft')")
db.execute("INSERT INTO sentence_patterns VALUES('pattern.suggestions.01',1,'grammar.patterns.suggestions','construction','Lets [V-base]','{}','{}','[]','[]','[]','draft')")
db.execute("INSERT INTO topic_patterns VALUES('sentence.patterns.suggestions',1,'pattern.suggestions.01',1)")
db.commit()
checked('versioned_pattern_topic_link',db.execute('SELECT count(*) FROM topic_patterns').fetchone()[0]==1)
try:
    db.execute("INSERT INTO topic_patterns VALUES('sentence.patterns.suggestions',1,'pattern.missing',1)")
except sqlite3.IntegrityError:
    checked('missing_pattern_version_rejected',True)
else:
    raise AssertionError('missing pattern reference accepted')
db.rollback()
checked('foreign_key_check',db.execute('PRAGMA foreign_key_check').fetchall()==[])
checked('integrity_check',db.execute('PRAGMA integrity_check').fetchone()[0]=='ok')

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]
        self.references=[]
        self.controls=[]
        self.external=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if 'for' in a:self.references.append(a['for'])
        if a.get('href','').startswith('#'):self.references.append(a['href'][1:])
        if 'aria-labelledby' in a:self.references.extend(a['aria-labelledby'].split())
        if tag in ('input','button','select'):self.controls.append((tag,a))
        if tag in ('script','link','img','iframe') and ('src' in a or 'href' in a):self.external.append(a)
parser=Parser()
parser.feed((ROOT/'prototype/index.html').read_text(encoding='utf-8'))
checked('prototype_unique_dom_ids',len(parser.ids)==len(set(parser.ids)))
checked('prototype_fragment_label_targets_exist',all(t in parser.ids for t in parser.references))
checked('prototype_no_external_assets',not parser.external)
checked('prototype_real_key_input_disabled',any(a.get('id')=='key' and 'disabled' in a for tag,a in parser.controls))

def contrast(a,b):
    def lum(h):
        x=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        v=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in x]
        return sum(c*w for c,w in zip(v,(.2126,.7152,.0722)))
    x,y=sorted((lum(a),lum(b)))
    return round((y+.05)/(x+.05),2)
pairs={
    'ink_on_surface':('172B4D','FFFFFF'),
    'muted_on_background':('51627B','F4F8FF'),
    'white_on_primary':('FFFFFF','2557D6'),
    'ink_on_sun':('172B4D','FFD166'),
    'success_on_mint':('146A4B','D9F4E8'),
    'error_on_feedback':('B42336','FFF0EC'),
}
ratios={name:contrast(*pair) for name,pair in pairs.items()}
checked('core_normal_text_pairs_4_5',all(value>=4.5 for value in ratios.values()))
print(json.dumps({'status':'passed','checks':len(checks),'details':checks,'contrast_ratios':ratios,'sql_tables':len(db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()),'limits':['Static HTML inspection is not browser visual QA.','SQLite validation is not remote D1 validation.']},ensure_ascii=False,indent=2))
