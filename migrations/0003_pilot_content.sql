-- Original pilot items. Full curriculum remains a separate release milestone.
INSERT OR IGNORE INTO content_releases VALUES('dev-samples-v1','published','local-samples-v1',unixepoch()*1000);
INSERT OR IGNORE INTO lessons VALUES('dev.samples',1,'dev-samples-v1',1,'A',1,'探险启航练习','{}');
INSERT OR IGNORE INTO skills VALUES('grammar.be.present','grammar','野餐伙伴');
INSERT OR IGNORE INTO items VALUES('sample.be.1',1,'dev.samples',1,'grammar.be.present','recognition','choice','{"id":"sample.be.1","category":"grammar","title":"野餐伙伴","context":"看看主语，给它找到合适的be动词。","prompt":"They ___ ready.","type":"choice","choices":["am","is","are"],"gradeMin":1}','{"answers":["are"]}','published');
INSERT OR IGNORE INTO skills VALUES('grammar.there-be.present','grammar','树上的朋友');
INSERT OR IGNORE INTO items VALUES('sample.there.1',1,'dev.samples',1,'grammar.there-be.present','recognition','choice','{"id":"sample.there.1","category":"grammar","title":"树上的朋友","context":"树上有两只小鸟。","prompt":"There ___ two birds in the tree.","type":"choice","choices":["is","are","am"],"gradeMin":2}','{"answers":["are"]}','published');
INSERT OR IGNORE INTO skills VALUES('grammar.past-simple','grammar','昨天的公园');
INSERT OR IGNORE INTO items VALUES('sample.past.1',1,'dev.samples',1,'grammar.past-simple','recognition','choice','{"id":"sample.past.1","category":"tense","title":"昨天的公园","context":"描述昨天发生的一次完整事件。","prompt":"Mia ___ to the park yesterday.","type":"choice","choices":["go","goes","went"],"gradeMin":4}','{"answers":["went"]}','published');
INSERT OR IGNORE INTO skills VALUES('grammar.present-simple','grammar','每天的小习惯');
INSERT OR IGNORE INTO items VALUES('sample.habit.1',1,'dev.samples',1,'grammar.present-simple','recognition','choice','{"id":"sample.habit.1","category":"tense","title":"每天的小习惯","context":"描述Mia每天做的事情。","prompt":"Mia ___ to school every day.","type":"choice","choices":["go","goes","went"],"gradeMin":3}','{"answers":["goes"]}','published');
INSERT OR IGNORE INTO skills VALUES('morphology.verb.irregular-past','morphology','特殊词形伙伴');
INSERT OR IGNORE INTO items VALUES('sample.form.go',1,'dev.samples',1,'morphology.verb.irregular-past','spelling','input','{"id":"sample.form.go","category":"forms","title":"特殊词形伙伴","context":"有些过去式不能直接加-ed。","prompt":"写出go的过去式。","type":"input","gradeMin":4}','{"answers":["went"]}','published');
INSERT OR IGNORE INTO skills VALUES('morphology.verb.ing','morphology','变形工厂');
INSERT OR IGNORE INTO items VALUES('sample.form.ing',1,'dev.samples',1,'morphology.verb.ing','spelling','input','{"id":"sample.form.ing","category":"forms","title":"变形工厂","context":"这个动词变成-ing形式时，需要去掉末尾不发音的e。","prompt":"make → -ing形式","type":"input","gradeMin":3}','{"answers":["making"]}','published');
INSERT OR IGNORE INTO skills VALUES('grammar.patterns.suggestions','grammar','一起做风筝');
INSERT OR IGNORE INTO items VALUES('sample.pattern.about',1,'dev.samples',1,'grammar.patterns.suggestions','controlled-production','choice','{"id":"sample.pattern.about","category":"patterns","title":"一起做风筝","context":"你想建议朋友一起做风筝。","prompt":"How about ___ a kite?","type":"choice","choices":["make","making","to make"],"gradeMin":3}','{"answers":["making"]}','published');
INSERT OR IGNORE INTO skills VALUES('grammar.patterns.suggestions','grammar','把建议搭出来');
INSERT OR IGNORE INTO items VALUES('sample.pattern.order',1,'dev.samples',1,'grammar.patterns.suggestions','controlled-production','order','{"id":"sample.pattern.order","category":"patterns","title":"把建议搭出来","context":"用词块表达：我们一起踢足球吧。","prompt":"选词块，搭出一句话。","type":"order","tokens":["football.","play","Let''s","to"],"gradeMin":2}','{"answers":["Let''s play football."]}','published');
