#!/usr/bin/env python3
"""
Rebuild FaithFinder-Features.pdf, the two-page features overview.

Kept as a script for the same reason build-privacy-page.mjs is: a document
about what the app does goes stale the moment the app changes, and a stale one
handed to a strategist or an investor is worse than none. Every figure in it
was read out of the code rather than remembered —

    235,147  churches imported into the directory
         38  screens under app/
         10  notification types, from the constraint in 17_more_notifications.sql
        807  translated strings in src/lib/i18n.ts
    5%/$5    platform fee, from src/lib/ticketPricing.ts

— so when those change, change them here too and re-run.

    pip install reportlab
    python3 scripts/build-features-pdf.py
"""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, KeepTogether)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER

NAVY   = colors.HexColor('#1a1a2e')
PLUM   = colors.HexColor('#2d2240')
GOLD   = colors.HexColor('#c9a96e')
INK    = colors.HexColor('#2b2b33')
INK2   = colors.HexColor('#5f5f6b')
RULE   = colors.HexColor('#e2e0e6')
WASH   = colors.HexColor('#faf8f5')

H1   = ParagraphStyle('H1', fontName='Times-Bold', fontSize=30, leading=34,
                      textColor=NAVY, spaceAfter=4)
SUB  = ParagraphStyle('SUB', fontName='Times-Italic', fontSize=13.5, leading=19,
                      textColor=GOLD, spaceAfter=18)
H2   = ParagraphStyle('H2', fontName='Times-Bold', fontSize=15.5, leading=19,
                      textColor=NAVY, spaceBefore=17, spaceAfter=6)
BODY = ParagraphStyle('BODY', fontName='Helvetica', fontSize=9.7, leading=14.6,
                      textColor=INK, spaceAfter=7)
LEAD = ParagraphStyle('LEAD', fontName='Helvetica', fontSize=10.8, leading=16.5,
                      textColor=INK, spaceAfter=11)
BULL = ParagraphStyle('BULL', fontName='Helvetica', fontSize=9.7, leading=14.4,
                      textColor=INK, leftIndent=13, bulletIndent=2, spaceAfter=3.5)
NOTE = ParagraphStyle('NOTE', fontName='Helvetica-Oblique', fontSize=8.7,
                      leading=12.6, textColor=INK2)
FOOT = ParagraphStyle('FOOT', fontName='Helvetica', fontSize=8.2, leading=11.5,
                      textColor=INK2, alignment=TA_CENTER)
STATN= ParagraphStyle('STATN', fontName='Times-Bold', fontSize=21, leading=24,
                      textColor=GOLD, alignment=TA_CENTER, spaceAfter=1)
STATL= ParagraphStyle('STATL', fontName='Helvetica', fontSize=7.6, leading=10.5,
                      textColor=colors.white, alignment=TA_CENTER)
MAST = ParagraphStyle('MAST', fontName='Times-Bold', fontSize=25, leading=29,
                      textColor=colors.white, spaceAfter=0, spaceBefore=0)
MTAG = ParagraphStyle('MTAG', fontName='Times-Italic', fontSize=11, leading=15,
                      textColor=GOLD, spaceAfter=0, spaceBefore=0)

def rule(w=6.9*inch, c=RULE, t=0.75):
    return Table([['']], colWidths=[w], rowHeights=[t],
                 style=TableStyle([('BACKGROUND',(0,0),(-1,-1),c),
                                   ('LINEBELOW',(0,0),(-1,-1),0,colors.white)]))

def bullets(items):
    return [Paragraph(f'<font color="#c9a96e">•</font>&nbsp;&nbsp;{i}', BULL)
            for i in items]

def section(title, lead, items, note=None):
    out = [Paragraph(title, H2), Paragraph(lead, BODY)]
    out += bullets(items)
    if note:
        out += [Spacer(1, 3), Paragraph(note, NOTE)]
    # Kept whole: a heading stranded at the foot of a page, or two bullets
    # alone at the top of the next, is what a hand-placed page break produces
    # the moment any wording changes.
    return [KeepTogether(out)]

story = []

# ── Masthead ───────────────────────────────────────────────────────────────
story.append(Table(
    [[Paragraph('<font color="#c9a96e">&#8224;</font>&nbsp;&nbsp;FaithFinder', MAST)],
     [Paragraph('Find your church home.', MTAG)]],
    colWidths=[6.9*inch],
    style=TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), NAVY),
        ('LEFTPADDING',(0,0),(-1,-1), 24), ('RIGHTPADDING',(0,0),(-1,-1), 24),
        ('TOPPADDING',(0,0),(0,0), 20), ('BOTTOMPADDING',(0,0),(0,0), 2),
        ('TOPPADDING',(0,1),(0,1), 0), ('BOTTOMPADDING',(0,1),(-1,-1), 20),
    ])))
story.append(Spacer(1, 15))

story.append(Paragraph(
    'A national church directory and a faith community in one app. People use it to find '
    'a church when they move, when they come back after years away, or when they are '
    'looking for the first time — and churches use it to be found.', LEAD))

# ── Numbers ────────────────────────────────────────────────────────────────
stats = [[Paragraph('235,147', STATN), Paragraph('38', STATN),
          Paragraph('2', STATN), Paragraph('100%', STATN)],
         [Paragraph('CHURCHES LISTED', STATL),
          Paragraph('SCREENS IN THE APP', STATL),
          Paragraph('LANGUAGES, FULLY', STATL),
          Paragraph('OF DATA OWNED BY US', STATL)]]
story.append(Table(stats, colWidths=[1.725*inch]*4,
    style=TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), PLUM),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('TOPPADDING',(0,0),(-1,0), 15), ('BOTTOMPADDING',(0,0),(-1,0), 0),
        ('TOPPADDING',(0,1),(-1,1), 2), ('BOTTOMPADDING',(0,1),(-1,1), 15),
        ('LEFTPADDING',(0,0),(-1,-1), 6), ('RIGHTPADDING',(0,0),(-1,-1), 6),
    ])))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'The directory is built from open map data and is ours outright — no per-search fees, '
    'no third-party licence, nothing that can be switched off.', NOTE))

story += section(
    'Find a church',
    'One search box that understands what people actually type into it.',
    ['Search by <b>church name, city, ZIP code, state or denomination</b> — all in the same field.',
     '<b>Near you</b>, sorted by real distance, computed against a spatial index rather than guessed.',
     'Filter by <b>denomination</b> — Baptist, Catholic, Methodist, Lutheran, Pentecostal, AME and more.',
     'Every church has a page: address, phone, website, one-tap <b>directions</b>, service times and photos.',
     '<b>Save</b> the ones you want to come back to. Your saved list follows your account to any device.'])

story += section(
    'Your church, in your hands',
    'A church does not sign up — it is already listed. It claims what is there.',
    ['<b>Claim your listing</b> and, once approved, correct the name, address, phone, website and service times.',
     'Upload a <b>profile photo, a cover photo and a gallery</b>, and remove the placeholder we imported.',
     'A <b>verified badge</b> that has to be earned — nobody can approve their own claim.',
     'Post to your congregation, announce events, and reach people who saved you.'],
    'Claims are reviewed by a person. The approval is what grants control, which is what keeps '
    'one church’s listing out of another’s hands.')

story += section(
    'A community, not a listing site',
    'The part people come back for.',
    ['A shared <b>feed</b> with posts, photos, likes, comments, threaded replies and reposts.',
     '<b>Follow</b> churches and people, and see what they share.',
     '<b>Ten kinds of notification</b> — likes, comments, replies, follows, shares, announcements, '
     'new posts from your church, new events near you, invitations and claim decisions.',
     'A profile with your posts, your activity and a verse that means something to you.'])

story += section(
    'Events and tickets',
    'Conferences, services, youth nights — created, shared and ticketed in the app.',
    ['Create an event with a venue, schedule, speakers, capacity and ticket price.',
     'Browse what is happening near you, save it, and invite people directly.',
     '<b>A 5% platform fee, capped at $5.</b> A $100 ticket costs the organiser $5 here; on Eventbrite '
     'the same ticket runs closer to $9.',
     'Card payments handled by Stripe, so no card details ever touch our servers.'])

story += section(
    'Built in English and Spanish, properly',
    'Not a translated menu — the whole app.',
    ['<b>807 translated strings</b> covering every screen, every error message, every button.',
     'The privacy policy and terms of service are translated too, not just the easy parts.',
     'A US faith audience that is served in Spanish almost nowhere else.'])

story += section(
    'Safety and privacy, taken seriously',
    'The things that decide whether people stay.',
    ['<b>Block</b> a person, <b>hide</b> a single post, and <b>report</b> anything to be reviewed.',
     'Control whether your profile is public and whether your location is shown.',
     '<b>Delete your account</b> and have it actually deleted — server first, then the device.',
     'Every table protected by row-level security, so people can only ever read their own private data.'])

story.append(Spacer(1, 12))
story.append(rule())
story.append(Spacer(1, 10))
story.append(Paragraph('Coming next', H2))
story.append(Paragraph(
    'Two things are built but not finished, and they are the honest gaps: <b>payouts to event '
    'organisers</b>, which needs Stripe Connect before any event can pay out; and <b>photographs for '
    'more of the directory</b> — 645 churches have one today, and the rest show a generated cover '
    'until their church claims the listing and uploads its own.', BODY))

story.append(Spacer(1, 22))
story.append(rule())
story.append(Spacer(1, 7))
story.append(Paragraph('FaithFinder &nbsp;·&nbsp; iOS &nbsp;·&nbsp; '
                       'Prepared September 2026', FOOT))

doc = SimpleDocTemplate('/home/user/faithfinderapp/FaithFinder-Features.pdf',
                        pagesize=LETTER,
                        leftMargin=0.8*inch, rightMargin=0.8*inch,
                        topMargin=0.62*inch, bottomMargin=0.62*inch,
                        title='FaithFinder — Features',
                        author='FaithFinder')
doc.build(story)
print('built')
