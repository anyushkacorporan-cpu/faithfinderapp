#!/usr/bin/env python3
"""
Rebuild FaithFinder-Creative-Brief.pdf — the brief for a content strategist.

Separate from build-features-pdf.py on purpose. That one answers "what does it
do", which is what an investor or a technical reviewer asks. This one answers
"what do we post, to whom, and what must we not claim yet", which is the only
thing a creative strategist needs. Handing over the feature list instead makes
them guess at the audience and the constraints, and guessing at the constraints
is how a campaign ends up promising ticketing that cannot pay out.

    pip install reportlab
    python3 scripts/build-creative-brief-pdf.py
"""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, KeepTogether)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER

NAVY = colors.HexColor('#1a1a2e'); PLUM = colors.HexColor('#2d2240')
GOLD = colors.HexColor('#c9a96e'); INK  = colors.HexColor('#2b2b33')
INK2 = colors.HexColor('#5f5f6b'); RED  = colors.HexColor('#a3322b')
WASH = colors.HexColor('#faf8f5'); WARN = colors.HexColor('#fdf4f2')

MAST = ParagraphStyle('MAST', fontName='Times-Bold', fontSize=25, leading=29,
                      textColor=colors.white)
MTAG = ParagraphStyle('MTAG', fontName='Times-Italic', fontSize=11, leading=15,
                      textColor=GOLD)
H2   = ParagraphStyle('H2', fontName='Times-Bold', fontSize=15.5, leading=19,
                      textColor=NAVY, spaceBefore=16, spaceAfter=6)
H3   = ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=10.2, leading=14,
                      textColor=NAVY, spaceBefore=9, spaceAfter=3)
BODY = ParagraphStyle('BODY', fontName='Helvetica', fontSize=9.7, leading=14.6,
                      textColor=INK, spaceAfter=7)
LEAD = ParagraphStyle('LEAD', fontName='Helvetica', fontSize=10.8, leading=16.5,
                      textColor=INK, spaceAfter=11)
BULL = ParagraphStyle('BULL', fontName='Helvetica', fontSize=9.7, leading=14.4,
                      textColor=INK, leftIndent=13, bulletIndent=2, spaceAfter=3.5)
HOOK = ParagraphStyle('HOOK', fontName='Times-Italic', fontSize=10.5, leading=15,
                      textColor=PLUM, leftIndent=13, spaceAfter=4)
NOTE = ParagraphStyle('NOTE', fontName='Helvetica-Oblique', fontSize=8.7,
                      leading=12.6, textColor=INK2)
FOOT = ParagraphStyle('FOOT', fontName='Helvetica', fontSize=8.2, leading=11.5,
                      textColor=INK2, alignment=TA_CENTER)

def bullets(items):
    return [Paragraph(f'<font color="#c9a96e">•</font>&nbsp;&nbsp;{i}', BULL)
            for i in items]

def panel(rows, bg, border):
    return Table([[r] for r in rows], colWidths=[6.9*inch],
        style=TableStyle([('BACKGROUND',(0,0),(-1,-1), bg),
                          ('BOX',(0,0),(-1,-1), 0.7, border),
                          ('LEFTPADDING',(0,0),(-1,-1), 15),
                          ('RIGHTPADDING',(0,0),(-1,-1), 15),
                          ('TOPPADDING',(0,0),(0,0), 12),
                          ('BOTTOMPADDING',(0,-1),(-1,-1), 12)]))

story = []
story.append(Table(
    [[Paragraph('<font color="#c9a96e">&#8224;</font>&nbsp;&nbsp;FaithFinder', MAST)],
     [Paragraph('Creative brief — pre-launch content', MTAG)]],
    colWidths=[6.9*inch],
    style=TableStyle([('BACKGROUND',(0,0),(-1,-1), NAVY),
        ('LEFTPADDING',(0,0),(-1,-1), 24), ('RIGHTPADDING',(0,0),(-1,-1), 24),
        ('TOPPADDING',(0,0),(0,0), 20), ('BOTTOMPADDING',(0,0),(0,0), 2),
        ('TOPPADDING',(0,1),(0,1), 0), ('BOTTOMPADDING',(0,1),(-1,-1), 20)])))
story.append(Spacer(1, 15))

story.append(Paragraph(
    'FaithFinder is a national church directory and a faith community in one iOS app. '
    '<b>235,147 churches across the United States are already in it.</b> Nobody has to add '
    'their church — it is already there, waiting to be claimed.', LEAD))

# ── The constraint, first, because it decides everything else ──────────────
story.append(KeepTogether(panel([
    Paragraph('<font color="#a3322b"><b>Read this first: the app is not on the App Store yet.</b></font>', BODY),
    Paragraph('There is nothing to install and no link to send anyone. Any campaign built around '
              'downloads is wasted work. <b>The goal of every post between now and launch is one '
              'email address on the waitlist.</b> At launch we mail that list, and they become day-one '
              'installs.', BODY),
], WARN, colors.HexColor('#e8cdc7'))))

story.append(Paragraph('Who we are talking to', H2))
story.append(Paragraph(
    'Not "Christians". People at a specific moment, looking for something specific:', BODY))
story += bullets([
    '<b>Just moved.</b> New city, knows nobody, wants somewhere to belong by Sunday.',
    '<b>Coming back.</b> Away for years. Wants to return without walking into the wrong room.',
    '<b>Church hurt.</b> Left somewhere painful. Looking carefully, quietly, on their own terms.',
    '<b>New to faith.</b> Curious, and has no idea how to pick.',
    '<b>Pastors and church leaders</b> — a separate audience with a separate pitch. See below.',
])

story.append(Paragraph('Five content angles', H2))

story.append(Paragraph('1. "Churches in ___"  — the workhorse', H3))
story.append(Paragraph(
    'A screen recording of a search in one city, three or four churches shown. Endlessly '
    'repeatable across 235,147 churches, demonstrates the product without being an ad, and gets '
    'shared locally because people tag friends in that city. Bronx, Houston, Miami, Atlanta, '
    'Chicago.', BODY))

story.append(Paragraph('2. The moment of need', H3))
story.append(Paragraph('Where the emotional reach lives. Open on the feeling, close on the app.', BODY))
story.append(Paragraph('"POV: you just moved and you don’t know where to worship on Sunday."', HOOK))
story.append(Paragraph('"You haven’t been to church in six years. You want to go back. Where do you even start?"', HOOK))

story.append(Paragraph('3. Building it in public', H3))
story.append(Paragraph(
    'A solo founder building a faith app, alone. Post the unglamorous parts — the bug that ate an '
    'afternoon, the feature that finally worked. People follow founders, not products, and these are '
    'the people who download on day one and tell others.', BODY))

story.append(Paragraph('4. "Your church is already listed"  — for pastors', H3))
story.append(Paragraph(
    'A different pitch to a different audience, and it compounds twice over: a pastor who shares it '
    'reaches an entire congregation at once, and every claimed church makes the directory better for '
    'everyone searching it.', BODY))

story.append(Paragraph('5. All of it in Spanish', H3))
story.append(Paragraph(
    '<b>The biggest opportunity here, and the cheapest.</b> The app is fully bilingual — 807 '
    'translated strings, every screen, including the privacy policy. Spanish-language faith content '
    'on Instagram is enormous and badly served, and almost nobody competing with us can follow us '
    'there. Same reels, Spanish caption and voiceover. It roughly doubles reach for the cost of a '
    'caption.', BODY))

story.append(Paragraph('What films well', H2))
story += bullets([
    'Searching a city and watching real churches appear — the directory is genuinely large.',
    'Switching the whole app to Spanish mid-recording.',
    'A church page: address, service times, one-tap directions.',
    'Saving a church and it appearing in Saved.',
    'The claim flow — finding your own church already listed.',
])

story.append(Spacer(1, 12))
story.append(KeepTogether(panel([
    Paragraph('<font color="#a3322b"><b>Do not promise these yet</b></font>', BODY),
    Paragraph('<b>Events and ticketing.</b> The screens exist, but organisers cannot be paid — the '
              'payout piece is unbuilt. A campaign hook built on this cannot be delivered.', BODY),
    Paragraph('<b>Church photography.</b> 645 of 235,147 churches have a photo. The rest show a '
              'generated cover. Do not make photos a selling point; the gap is visible immediately.', BODY),
    Paragraph('<b>Any download or install language</b>, until the App Store listing is live.', BODY),
], WARN, colors.HexColor('#e8cdc7'))))

story.append(Paragraph('Cadence and measurement', H2))
story += bullets([
    '<b>Three to four reels a week.</b> Sustainable for one person. Reels only — static posts reach nobody new.',
    '<b>Weeks 1–3:</b> audience and waitlist. Angles 1, 2 and 3.',
    '<b>Weeks 4–6:</b> add pastors. Roughly a third of posts on angle 4.',
    '<b>Weeks 7–8:</b> countdown, early access, convert the list.',
    '<b>The only number that matters before launch is waitlist signups.</b> Not followers, not views.',
])

story.append(Spacer(1, 10))
story.append(KeepTogether(panel([
    Paragraph('<b>Open item, and it blocks everything above</b>', BODY),
    Paragraph('There is no landing page and no domain yet — so there is nowhere for a reel to send '
              'anyone, and nothing collecting emails. This needs to exist before the first post, or '
              'the reach simply evaporates.', BODY),
], WASH, colors.HexColor('#e2e0e6'))))

story.append(Spacer(1, 18))
story.append(Paragraph('FaithFinder &nbsp;·&nbsp; Creative brief &nbsp;·&nbsp; '
                       'September 2026 &nbsp;·&nbsp; A full feature list is available separately', FOOT))

SimpleDocTemplate('/home/user/faithfinderapp/FaithFinder-Creative-Brief.pdf',
                  pagesize=LETTER, leftMargin=0.8*inch, rightMargin=0.8*inch,
                  topMargin=0.62*inch, bottomMargin=0.62*inch,
                  title='FaithFinder — Creative Brief',
                  author='FaithFinder').build(story)
print('built')
