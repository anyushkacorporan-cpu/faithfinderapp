import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Create a shared deep-link / share-text helper
helper = '''/**
 * Deep linking + share text helpers for FaithFinder.
 *
 * CURRENT STATE: links use the app's custom URL scheme (faithfinder://...).
 * This works TODAY when the app is already installed (tapping the link on a
 * device that has FaithFinder opens directly to that church/event).
 *
 * NOT YET AVAILABLE: "deferred deep linking" - opening the App Store first,
 * then automatically landing on the right church/event after install. That
 * requires the app to be published, a verified domain with Apple App Site
 * Association / Android Asset Links files, and a link-routing backend
 * (e.g. Branch.io, or a custom server). None of that exists yet, so we do
 * not claim to support it. Once the app is live and a domain is ready, swap
 * FAITHFINDER_SCHEME-based links below for https://faithfinderapp.com/... 
 * Universal Links and wire a redirect service.
 */

const FAITHFINDER_SCHEME = 'faithfinder';

export function getChurchDeepLink(churchId: string): string {
  return `${FAITHFINDER_SCHEME}://church/${encodeURIComponent(churchId)}`;
}

export function getEventDeepLink(eventId: string): string {
  return `${FAITHFINDER_SCHEME}://event/${encodeURIComponent(eventId)}`;
}

export function buildChurchShareText(opts: {
  name: string;
  description?: string;
  churchId: string;
}): string {
  const link = getChurchDeepLink(opts.churchId);
  const parts = [`Check out ${opts.name} on FaithFinder!`];
  if (opts.description) parts.push(opts.description);
  parts.push(link);
  return parts.join('\\n\\n');
}

export function buildEventShareText(opts: {
  title: string;
  date?: string;
  location?: string;
  description?: string;
  eventId: string;
}): string {
  const link = getEventDeepLink(opts.eventId);
  const whenWhere = [opts.date, opts.location].filter(Boolean).join(' at ');
  const parts = [`${opts.title}${whenWhere ? ' — ' + whenWhere : ''}`];
  if (opts.description) parts.push(opts.description);
  parts.push('Join me on FaithFinder!');
  parts.push(link);
  return parts.join('\\n\\n');
}
'''

with open('src/lib/shareLinks.ts', 'w', encoding='utf-8') as f:
    f.write(helper)
print('Created src/lib/shareLinks.ts')

# 2. Add the URL scheme to app.json so faithfinder:// actually opens this app
import json
with open('app.json', 'r', encoding='utf-8') as f:
    app_json = json.load(f)

expo_config = app_json.get('expo', {})
if expo_config.get('scheme') != 'faithfinder':
    expo_config['scheme'] = 'faithfinder'
    app_json['expo'] = expo_config
    with open('app.json', 'w', encoding='utf-8') as f:
        json.dump(app_json, f, indent=2)
    print('app.json updated with scheme: faithfinder')
else:
    print('app.json already has the faithfinder scheme')

print('ALL DONE - Part 1')
