import { useSettings } from './settingsStore';

export type Lang = 'English' | 'Español';

// Centralized translation dictionary. Add new keys here as more screens
// get translated — every screen should read from this file rather than
// hardcoding strings, so English/Spanish stay consistent everywhere.
const translations: Record<string, Record<Lang, string>> = {
  // Bottom tab bar
  churches: { English: 'Churches', Español: 'Iglesias' },
  events: { English: 'Events', Español: 'Eventos' },
  community: { English: 'Community', Español: 'Comunidad' },
  profile: { English: 'Profile', Español: 'Perfil' },

  // Common actions
  save: { English: 'Save', Español: 'Guardar' },
  cancel: { English: 'Cancel', Español: 'Cancelar' },
  done: { English: 'Done', Español: 'Listo' },
  edit: { English: 'Edit', Español: 'Editar' },
  delete: { English: 'Delete', Español: 'Eliminar' },
  share: { English: 'Share', Español: 'Compartir' },
  like: { English: 'Like', Español: 'Me gusta' },
  comment: { English: 'Comment', Español: 'Comentar' },
  reply: { English: 'Reply', Español: 'Responder' },
  connect: { English: 'Connect', Español: 'Conectar' },
  post: { English: 'Post', Español: 'Publicar' },
  search: { English: 'Search', Español: 'Buscar' },
  filter: { English: 'Filter', Español: 'Filtrar' },
  nearby: { English: 'Nearby', Español: 'Cerca de ti' },
  saved: { English: 'Saved', Español: 'Guardados' },
  attending: { English: 'Attending', Español: 'Asistiendo' },
  directions: { English: 'Directions', Español: 'Direcciones' },
  register: { English: 'Register', Español: 'Registrarse' },
  getTicket: { English: 'Get Ticket', Español: 'Obtener Boleto' },

  // Events
  createEvent: { English: 'Create Event', Español: 'Crear Evento' },
  myEvents: { English: 'My Events', Español: 'Mis Eventos' },
  earnings: { English: 'Earnings', Español: 'Ganancias' },
  eventDetails: { English: 'Event Details', Español: 'Detalles del Evento' },
  allEvents: { English: 'All Events', Español: 'Todos los Eventos' },

  // Profile
  editProfile: { English: 'Edit Profile', Español: 'Editar Perfil' },

  // Settings
  settings: { English: 'Settings', Español: 'Configuración' },
  appearance: { English: 'Appearance', Español: 'Apariencia' },
  language: { English: 'Language', Español: 'Idioma' },
  notifications: { English: 'Notifications', Español: 'Notificaciones' },
  notificationPreferences: { English: 'Notification Preferences', Español: 'Preferencias de Notificaciones' },
  locationSettings: { English: 'Location Settings', Español: 'Configuración de Ubicación' },
  privacySecurity: { English: 'Privacy & Security', Español: 'Privacidad y Seguridad' },
  twoFactorAuth: { English: 'Two-Factor Authentication', Español: 'Autenticación de Dos Factores' },
  helpSupport: { English: 'Help & Support', Español: 'Ayuda y Soporte' },
  faq: { English: 'FAQ', Español: 'Preguntas Frecuentes' },
  contactSupport: { English: 'Contact Support', Español: 'Contactar Soporte' },
  reportBug: { English: 'Report a Bug', Español: 'Reportar un Error' },
  rateApp: { English: 'Rate the App', Español: 'Calificar la App' },
  shareApp: { English: 'Share FaithFinder', Español: 'Compartir FaithFinder' },
  termsOfService: { English: 'Terms of Service', Español: 'Términos de Servicio' },
  privacyPolicy: { English: 'Privacy Policy', Español: 'Política de Privacidad' },
};

export function useTranslation() {
  const appSettings = useSettings();
  const lang: Lang = appSettings.appearance.language === 'Español' ? 'Español' : 'English';

  function t(key: keyof typeof translations): string {
    return translations[key]?.[lang] || translations[key]?.English || String(key);
  }

  return { t, lang };
}
