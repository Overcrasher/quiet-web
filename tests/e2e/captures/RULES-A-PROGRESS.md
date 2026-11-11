RULES-A: started
probe1: cookiebot.com=cookiebot visible; onetrust.com sdk but not visible; spiegel/bbc sourcepoint; zalando UC
probe2: onetrust visible: ikea.com/gb/en, vodafone.ro, lufthansa; didomi visible: 20minutes.fr, didomi.io; quantcast.com has qc-cmp not visible
cookiebot visible: dr.dk, berlingske.dk, cookiebot.com; onetrust also tv2.dk. quantcast: need visible site (mirror.co.uk has qc class)
quantcast visible (#qc-cmp2-ui): quantcast.com, bleepingcomputer.com, express.co.uk, mirror.co.uk. NEXT: capture_a.py (tests/e2e/capture_a.py) then rules
CAPTURES DONE (no ext): onetrust ikea/vodafone-ro/tv2-dk; cookiebot cookiebot-com/dr-dk(custom drcc UI no reject)/berlingske-dk; didomi 20minutes-fr/didomi-io; quantcast quantcast-com(no reject 1st layer)/bleepingcomputer/express-co-uk(Reject and Pay=paywall!). leboncoin: no banner. NEXT: explore 2nd layers, write rules
coordinator: write captures/<platform>/fixture.py FIXTURES=[{name,url,html,expect_rule,expect_outcome}]; extra leads cnn.com onetrust, elmundo.es didomi. quantcast 2nd layer: #reject-all-btn (express: 'REJECT ALL AND PAY' paywall -> avoid). exploring 2nd layers (/private/tmp/explore.py)
RULES WRITTEN (v1), need live verify w/ extension
verify_a.py works (uses harness.Env). ikea OK rejected groups=1:1,2:0,3:0,4:0. running rest -> captures/verify.log
verified OK: ikea,vodafone,cookiebot-com,dr-dk,berlingske,didomi-io,quantcast-com,bleeping. ISSUES: tv2-dk & 20minutes-fr banner gone but SW tabs empty (reload after consent?); express/mirror: my rule declines pay, generic.js clicks 'REJECT ALL AND PAY' (report to coordinator)
didomi: pay-or-consent now returns none (20minutes save leads to subscription page). tv2: page reloads after consent so SW tab record lost (stats counted)
ALL DONE: rules, fixtures, RESULT.md written; tests/run.js 490 pass; extcopy removed
