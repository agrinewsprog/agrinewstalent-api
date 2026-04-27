// ============================================================
// i18n TRANSLATIONS FOR NOTIFICATIONS
// Supported languages: es, en, pt
// ============================================================

type Lang = 'es' | 'en' | 'pt';

interface NotificationText {
  title: string;
  message: (offerTitle: string) => string;
}

type NotificationI18nMap = Record<string, Record<Lang, NotificationText>>;

const translations: NotificationI18nMap = {
  APPLICATION_PENDING: {
    es: {
      title: 'Candidatura pendiente',
      message: (offer) => `Tu candidatura para "${offer}" está pendiente de revisión`,
    },
    en: {
      title: 'Application pending',
      message: (offer) => `Your application for "${offer}" is pending review`,
    },
    pt: {
      title: 'Candidatura pendente',
      message: (offer) => `A sua candidatura para "${offer}" está pendente de revisão`,
    },
  },
  APPLICATION_INTERVIEW: {
    es: {
      title: 'Seleccionado para entrevista',
      message: (offer) => `Has sido seleccionado para entrevista en "${offer}"`,
    },
    en: {
      title: 'Selected for interview',
      message: (offer) => `You have been selected for an interview for "${offer}"`,
    },
    pt: {
      title: 'Selecionado para entrevista',
      message: (offer) => `Você foi selecionado para entrevista em "${offer}"`,
    },
  },
  APPLICATION_HIRED: {
    es: {
      title: 'Contratado',
      message: (offer) => `Enhorabuena, has sido contratado para "${offer}"`,
    },
    en: {
      title: 'Hired',
      message: (offer) => `Congratulations, you have been hired for "${offer}"`,
    },
    pt: {
      title: 'Contratado',
      message: (offer) => `Parabéns, você foi contratado para "${offer}"`,
    },
  },
  APPLICATION_REJECTED: {
    es: {
      title: 'Candidatura rechazada',
      message: (offer) => `Tu candidatura para "${offer}" ha sido rechazada`,
    },
    en: {
      title: 'Application rejected',
      message: (offer) => `Your application for "${offer}" has been rejected`,
    },
    pt: {
      title: 'Candidatura rejeitada',
      message: (offer) => `A sua candidatura para "${offer}" foi rejeitada`,
    },
  },
};

const APPLICATION_TYPES = [
  'APPLICATION_PENDING',
  'APPLICATION_INTERVIEW',
  'APPLICATION_HIRED',
  'APPLICATION_REJECTED',
];

export function isApplicationNotificationType(type: string): boolean {
  return APPLICATION_TYPES.includes(type);
}

export function getNotificationI18n(
  type: string,
  lang: Lang,
  offerTitle: string,
): { title: string; message: string } | null {
  const entry = translations[type];
  if (!entry) return null;
  const t = entry[lang] ?? entry['es'];
  return { title: t.title, message: t.message(offerTitle) };
}

export function getDefaultLang(lang?: string): Lang {
  if (lang === 'en' || lang === 'pt' || lang === 'es') return lang;
  return 'es';
}
