import type { ImageSourcePropType } from 'react-native';

/**
 * The introduction, as content rather than as markup.
 *
 * Separate from the screen so the words can be changed without touching how
 * they are drawn — which is the thing most likely to be changed, by someone who
 * should not have to read a component to do it.
 *
 * ADDING THE PHOTOGRAPHS
 *
 * Each slide has an optional `image`. Drop the file into
 * assets/images/onboarding/ and point at it:
 *
 *     image: require('../../assets/images/onboarding/welcome.jpg'),
 *
 * Until one is set the slide draws its gradient instead, which is a finished
 * look rather than a hole — so the order they arrive in does not matter and
 * nothing has to wait for all six.
 */

export type Slide = {
  /** Small gold capitals above the title. */
  eyebrow?: string;
  /** Empty on the first card, where the person's own name takes its place. */
  title: string;
  /** Bold, between the title and the paragraph. Smaller than the title. */
  lead?: string;
  /** The paragraph. A blank line splits it in two. */
  body?: string;
  /** Their name, addressed at the top like the opening of a letter. */
  salutation?: boolean;
  /** How the letter closes. The last card only. */
  signoff?: { blessing: string; role: string };
  /** Italic, with the reference under it in gold. */
  verse?: { text: string; ref: string };
  /** Photograph behind the card. Falls back to the gradient below. */
  image?: ImageSourcePropType;
  /** Used when there is no image, and under one to keep the text readable. */
  gradient: [string, string];
};

/**
 * Written to be read aloud. The English is what the screens were designed
 * around; the Spanish is written rather than translated word for word, because
 * these are the first sentences of the app in either language.
 */
export const SLIDES: Slide[] = [
  {
    eyebrow: 'WELCOME',
    // The title is the person's own name, filled in by the screen.
    title: '',
    body: "You've been invited into something special. An app rooted in faith.",
    image: require('../../assets/images/onboarding/01-welcome.jpg'),
    gradient: ['#3a2416', '#140c07'],
  },
  {
    title: 'Why we built this',
    body: 'No believer should be doing life alone. That\'s why FaithFinder was built. We have more than 235,000 churches across all fifty states for you to search, whether you\'re looking for a church to finally call home or you\'re in town for the weekend and want somewhere to worship. All of it is here to help you find a house of God and for you to be in community.',
    verse: {
      text: 'For where two or three gather in my name, there am I with them.',
      ref: 'Matthew 18:20',
    },
    image: require('../../assets/images/onboarding/02-why.jpg'),
    gradient: ['#241a12', '#0b0908'],
  },
  {
    title: 'Build friendships with other believers',
    body: 'FaithFinder is for everyone who wants to grow. Connect with one another. Encourage one another. Be kind and loving to one another. But most importantly, help one another. Elders and babes in Christ. However long we\'ve been walking with God, let\'s lift each other.',
    verse: {
      text: 'As iron sharpens iron, so one person sharpens another.',
      ref: 'Proverbs 27:17',
    },
    image: require('../../assets/images/onboarding/03-friendships.jpg'),
    gradient: ['#2b3340', '#10141a'],
  },
  {
    title: 'This is more than churches',
    lead: 'We have events too!',
    body: 'Join worship nights and fellowships happening near you. Meet new people. Stay connected with other believers. Have something to look forward to when the weekend comes. And if you want to create an event yourself, we are here to support you.',
    verse: {
      text: 'Not forsaking the assembling of ourselves together.',
      ref: 'Hebrews 10:25',
    },
    image: require('../../assets/images/onboarding/04-events.jpg'),
    gradient: ['#39414d', '#15181d'],
  },
  {
    title: 'Be bold and share your faith',
    lead: 'Someone needs to hear your story.',
    body: 'Post your testimony. Share the scripture that carried you through. Send encouragement to someone who needs it today. You never know who is reading.',
    verse: {
      text: 'Let your light shine before others, that they may see your good deeds.',
      ref: 'Matthew 5:16',
    },
    // Waiting on 05-share.jpg — the "King of Kings" flag.
    gradient: ['#4a5a6e', '#1a2230'],
  },
  {
    title: 'A holy and safe place',
    lead: 'Let your heart be in good standing here.',
    body: 'This app was built for good intentions only, and every post should reflect Christ. No bullying, no blasphemy, no foul language, nothing inappropriate, nothing that divides. Let this be a place that honours Him.',
    verse: {
      text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.',
      ref: '1 Corinthians 13:4',
    },
    image: require('../../assets/images/onboarding/06-holy.jpg'),
    gradient: ['#2e2821', '#0e0c0a'],
  },
  {
    // The letter. Addressed to them by name, signed by Annie.
    salutation: true,
    title: 'Stand firm, walk boldly, be the salt.',
    body: 'I pray this app blesses you. I pray you find a church. I pray you find your community. But most importantly, I pray that you come to know God, whether this app helped you or whether you found Him another way.\n\nPlease keep in mind that your relationship with God comes first. This app was never made to replace the time you need with Him. It is only here to be resourceful.',
    signoff: {
      blessing: 'Blessings to all from your sister of Christ, Annie.',
      role: 'Creator of FaithFinder',
    },
    verse: {
      text: 'You are the salt of the earth.',
      ref: 'Matthew 5:13',
    },
    // Waiting on 07-letter.jpg — the open bible against the sky.
    gradient: ['#1f2a36', '#0a0d11'],
  },
];
