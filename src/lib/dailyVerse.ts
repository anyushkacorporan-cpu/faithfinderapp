export type Verse = { text: string; reference: string };

// English text is KJV/NIV-style wording (as originally built). Spanish text
// uses Reina-Valera 1909, which like the KJV is in the public domain.
const VERSES_EN: Verse[] = [
  { text: '"For I know the plans I have for you," declares the Lord.', reference: 'Jeremiah 29:11' },
  { text: 'The Lord is my shepherd; I shall not want.', reference: 'Psalm 23:1' },
  { text: 'I can do all things through Christ which strengtheneth me.', reference: 'Philippians 4:13' },
  { text: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding.', reference: 'Proverbs 3:5' },
  { text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God.', reference: 'Isaiah 41:10' },
  { text: 'Be strong and of a good courage; be not afraid, for the Lord thy God is with thee whithersoever thou goest.', reference: 'Joshua 1:9' },
  { text: 'And we know that all things work together for good to them that love God.', reference: 'Romans 8:28' },
  { text: 'God is our refuge and strength, a very present help in trouble.', reference: 'Psalm 46:1' },
  { text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', reference: 'Matthew 11:28' },
  { text: 'For we walk by faith, not by sight.', reference: '2 Corinthians 5:7' },
];

const VERSES_ES: Verse[] = [
  { text: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová.', reference: 'Jeremías 29:11' },
  { text: 'Jehová es mi pastor; nada me faltará.', reference: 'Salmo 23:1' },
  { text: 'Todo lo puedo en Cristo que me fortalece.', reference: 'Filipenses 4:13' },
  { text: 'Fíate de Jehová de todo tu corazón, y no estribes en tu prudencia.', reference: 'Proverbios 3:5' },
  { text: 'No temas, porque yo soy contigo; no desmayes, porque yo soy tu Dios.', reference: 'Isaías 41:10' },
  { text: 'Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios será contigo dondequiera que vayas.', reference: 'Josué 1:9' },
  { text: 'Y sabemos que a los que a Dios aman, todas las cosas les ayudan a bien.', reference: 'Romanos 8:28' },
  { text: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.', reference: 'Salmo 46:1' },
  { text: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.', reference: 'Mateo 11:28' },
  { text: 'Porque por fe andamos, no por vista.', reference: '2 Corintios 5:7' },
];

// Same verse all day, changes at midnight local time.
export function getDailyVerse(language: string = 'English'): Verse {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const list = language === 'Español' ? VERSES_ES : VERSES_EN;
  return list[dayOfYear % list.length];
}
