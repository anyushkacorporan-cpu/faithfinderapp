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
  /** Small gold capitals above the title. Slide one only, in the design. */
  eyebrow?: string;
  title: string;
  /** A paragraph, for slides that make a statement rather than a list. */
  body?: string;
  /** Gold-marked lines. */
  points?: string[];
  /** Shown under the points, in italic, with the reference in gold. */
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
    title: 'Friend',
    body: "You've been invited into something special. A community rooted in faith.",
    gradient: ['#3a2416', '#140c07'],
  },
  {
    title: 'What FaithFinder stands for.',
    points: [
      'Faith — rooted in Jesus Christ above all',
      'Community — real believers, real connection',
      'Growth — encouraging one another every day',
    ],
    verse: {
      text: 'Not forsaking the assembling of ourselves together.',
      ref: 'Hebrews 10:25',
    },
    gradient: ['#241a12', '#0b0908'],
  },
  {
    title: 'Build friendships with believers',
    points: [
      'Meet Christians from around the world',
      'Find your people in your city',
      'Grow together in community and prayer',
    ],
    gradient: ['#2b3340', '#10141a'],
  },
  {
    title: 'Share your faith journey',
    points: [
      'Post testimonies and scriptures',
      'Send encouragement to others',
      'Pray together, grow together',
    ],
    verse: {
      text: 'Let your light shine before others, that they may see your good deeds.',
      ref: 'Matthew 5:16',
    },
    gradient: ['#39414d', '#15181d'],
  },
  {
    title: 'A holy and safe space.',
    body: 'This app is built for good intentions only. Every post should reflect Christ.',
    points: [
      'No bullying',
      'No blasphemy',
      'No foul language',
      'No inappropriate content',
      'No hate or division',
      'Connect for Christ only',
    ],
    verse: {
      text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.',
      ref: '1 Corinthians 13:4',
    },
    gradient: ['#2e2821', '#0e0c0a'],
  },
  {
    // The sixth card in the design was not among the screenshots, and the five
    // that were say nothing about the directory — which is the largest thing
    // the app does and the reason most people will open it. So this one is a
    // guess at what belongs in that slot, and is the first to replace if it is
    // the wrong guess.
    title: 'Find a church near you',
    points: [
      'More than 235,000 churches across all fifty states',
      'Search by city, denomination, or what is closest',
      'See services and events, and save the ones you love',
    ],
    verse: {
      text: 'For where two or three gather in my name, there am I with them.',
      ref: 'Matthew 18:20',
    },
    gradient: ['#1f2a36', '#0a0d11'],
  },
];
