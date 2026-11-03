/**
 * The FourCircle Ticketing, Refund and Payout Terms.
 *
 * Kept here rather than in i18n.ts because it is a document, not a set of
 * labels: it is read top to bottom, its paragraphs only make sense in order,
 * and dropping two hundred legal sentences into the table every screen looks
 * things up in would bury the table.
 *
 * Both languages sit side by side on purpose. A clause whose translation
 * drifts from the English is worse than no translation, and the only way to
 * notice drift is to be able to read the two next to each other.
 *
 * TRANSLATION IS NOT LEGAL ADVICE
 *
 * The Spanish here is an honest rendering of the English and has not been
 * read by a lawyer or a native speaker. Legal wording changes meaning in
 * translation more easily than ordinary prose does. Both versions should be
 * reviewed before anybody is held to them.
 *
 * Keep the numbers in step with src/lib/ticketPricing.ts. If the fee changes
 * there and not here, the app is charging one thing and promising another.
 */

export type TermsSection = {
  heading: { en: string; es: string };
  paragraphs: Array<{ en: string; es: string }>;
};

export const TERMS_UPDATED = { en: 'Last updated 24 October 2026', es: 'Última actualización: 24 de octubre de 2026' };

export const TERMS_TITLE = {
  en: 'Ticketing, Refund and Payout Terms',
  es: 'Términos de Boletos, Reembolsos y Pagos',
};

export const TERMS_INTRO = {
  en: 'These terms apply to every paid event sold through FourCircle. They cover what the fees are, when a ticket can be refunded, and when an organiser is paid. Free events carry no fees and no payouts, so most of this does not apply to them.',
  es: 'Estos términos se aplican a todos los eventos de pago vendidos a través de FourCircle. Cubren cuáles son las tarifas, cuándo se puede reembolsar un boleto y cuándo se le paga al organizador. Los eventos gratuitos no tienen tarifas ni pagos, así que casi nada de esto les aplica.',
};

export const TERMS: TermsSection[] = [
  {
    heading: { en: 'Fees', es: 'Tarifas' },
    paragraphs: [
      {
        en: 'FourCircle charges a service fee of 2% of the ticket price plus $0.80 per ticket. There is no cap.',
        es: 'FourCircle cobra una tarifa de servicio del 2% del precio del boleto más $0.80 por boleto. No tiene límite máximo.',
      },
      {
        en: 'A card processing fee is also charged, currently 2.9% plus $0.30 per order. This is our payment provider’s fee and is passed on at cost, with nothing added.',
        es: 'También se cobra una tarifa de procesamiento de tarjeta, actualmente 2.9% más $0.30 por pedido. Es la tarifa de nuestro procesador de pagos y se traslada a su costo, sin ningún recargo.',
      },
      {
        en: 'Both fees are added to the buyer’s total. Organisers receive the full ticket price they set. Fees are never deducted from an organiser’s payout, and organisers cannot choose to absorb them.',
        es: 'Ambas tarifas se añaden al total del comprador. Los organizadores reciben el precio completo del boleto que fijaron. Las tarifas nunca se descuentan del pago al organizador, y los organizadores no pueden optar por asumirlas.',
      },
      {
        en: 'Both fees appear as separate lines at checkout, and the total is shown before any payment is taken. For example, a $20 ticket costs the buyer about $22.15: $20.00 for the ticket, $1.20 service fee, and about $0.95 processing. The organiser receives $20.00.',
        es: 'Ambas tarifas aparecen como líneas separadas al finalizar la compra, y el total se muestra antes de cobrar nada. Por ejemplo, un boleto de $20 le cuesta al comprador unos $22.15: $20.00 del boleto, $1.20 de tarifa de servicio y unos $0.95 de procesamiento. El organizador recibe $20.00.',
      },
      {
        en: 'Free events carry no fees of any kind. All ticket prices are in US dollars.',
        es: 'Los eventos gratuitos no tienen ninguna tarifa. Todos los precios de boletos están en dólares estadounidenses.',
      },
    ],
  },
  {
    heading: { en: 'Refund policies', es: 'Políticas de reembolso' },
    paragraphs: [
      {
        en: 'Every paid event has one refund policy, chosen by its organiser when the event is created and shown on the event page and at checkout before anybody buys.',
        es: 'Cada evento de pago tiene una política de reembolso, elegida por su organizador al crear el evento y mostrada en la página del evento y al finalizar la compra, antes de que alguien compre.',
      },
      {
        en: 'Flexible: the full ticket price is refunded if requested up to 7 days before the event.',
        es: 'Flexible: se reembolsa el precio completo del boleto si se solicita hasta 7 días antes del evento.',
      },
      {
        en: 'Standard: the full ticket price is refunded if requested up to 48 hours before the event.',
        es: 'Estándar: se reembolsa el precio completo del boleto si se solicita hasta 48 horas antes del evento.',
      },
      {
        en: 'No refunds: no refunds are given, except where the event is cancelled or significantly changed.',
        es: 'Sin reembolsos: no se otorgan reembolsos, salvo que el evento se cancele o cambie de forma significativa.',
      },
      {
        en: 'Once an event is published its policy can only be made more generous, never stricter. Tickets already sold keep the policy that applied when they were bought. An organiser may approve a refund outside their own policy at any time.',
        es: 'Una vez publicado un evento, su política solo puede volverse más generosa, nunca más estricta. Los boletos ya vendidos conservan la política vigente cuando se compraron. Un organizador puede aprobar un reembolso fuera de su propia política en cualquier momento.',
      },
    ],
  },
  {
    heading: {
      en: 'Cancelled, postponed and rescheduled events',
      es: 'Eventos cancelados, pospuestos y reprogramados',
    },
    paragraphs: [
      {
        en: 'Cancelled means the event will not happen on its scheduled date and will not be rescheduled within 90 days. Every attendee is refunded everything they paid, both fees included, automatically, and is notified.',
        es: 'Cancelado significa que el evento no ocurrirá en su fecha programada y no se reprogramará dentro de 90 días. Cada asistente recibe automáticamente el reembolso de todo lo que pagó, incluidas ambas tarifas, y se le notifica.',
      },
      {
        en: 'Postponed means the event will happen on a date not yet set. Tickets stay valid. If no new date is announced within 90 days, attendees may request a full refund for the following 45 days, and until a new date is announced.',
        es: 'Pospuesto significa que el evento ocurrirá en una fecha aún no definida. Los boletos siguen siendo válidos. Si no se anuncia una nueva fecha dentro de 90 días, los asistentes pueden solicitar un reembolso completo durante los siguientes 45 días, y hasta que se anuncie una nueva fecha.',
      },
      {
        en: 'Rescheduled means a new date is shown in the app. Tickets stay valid. An attendee who cannot attend the new date may request a refund within 14 days of the change.',
        es: 'Reprogramado significa que se muestra una nueva fecha en la aplicación. Los boletos siguen siendo válidos. Un asistente que no pueda asistir en la nueva fecha puede solicitar un reembolso dentro de los 14 días posteriores al cambio.',
      },
      {
        en: 'A significant change — to the location, or to the main speaker or performer — is treated as a cancellation.',
        es: 'Un cambio significativo — de ubicación, o del orador o artista principal — se trata como una cancelación.',
      },
      {
        en: 'If an organiser does not issue refunds this policy requires, FourCircle may issue them and recover the cost from that organiser.',
        es: 'Si un organizador no emite los reembolsos que esta política exige, FourCircle puede emitirlos y recuperar el costo de ese organizador.',
      },
    ],
  },
  {
    heading: { en: 'How to request a refund', es: 'Cómo solicitar un reembolso' },
    paragraphs: [
      {
        en: 'Attendees request a refund from their ticket in the app, under Settings, My Tickets — or by emailing support@fourcircle.app.',
        es: 'Los asistentes solicitan un reembolso desde su boleto en la aplicación, en Ajustes, Mis Boletos — o escribiendo a support@fourcircle.app.',
      },
      {
        en: 'The request goes to the event organiser, who must respond within 5 business days. If they decline, they must give a reason, and the attendee is shown it.',
        es: 'La solicitud va al organizador del evento, que debe responder en un plazo de 5 días hábiles. Si la rechaza, debe dar un motivo, y al asistente se le muestra.',
      },
      {
        en: 'If the organiser does not respond, or declines a refund this policy requires, the attendee can ask FourCircle to review it. FourCircle decides, and may recover the refund from the organiser.',
        es: 'Si el organizador no responde, o rechaza un reembolso que esta política exige, el asistente puede pedir a FourCircle que lo revise. FourCircle decide, y puede recuperar el reembolso del organizador.',
      },
      {
        en: 'Approved refunds go back to the original payment method and usually appear within 5 to 10 business days. The status of a request — requested, approved, declined or refunded — is shown to both the attendee and the organiser.',
        es: 'Los reembolsos aprobados vuelven al método de pago original y suelen aparecer en 5 a 10 días hábiles. El estado de una solicitud — solicitada, aprobada, rechazada o reembolsada — se muestra tanto al asistente como al organizador.',
      },
    ],
  },
  {
    heading: { en: 'Fees on refunds', es: 'Tarifas en los reembolsos' },
    paragraphs: [
      {
        en: 'Where an event is cancelled, the buyer is refunded everything they paid, both fees included. FourCircle bears the cost of the card processing fee, which our payment provider does not return to us.',
        es: 'Cuando un evento se cancela, al comprador se le reembolsa todo lo que pagó, incluidas ambas tarifas. FourCircle asume el costo de la tarifa de procesamiento de tarjeta, que nuestro procesador de pagos no nos devuelve.',
      },
      {
        en: 'For every other approved refund, the ticket price alone is refunded. The service fee and the processing fee are kept.',
        es: 'Para cualquier otro reembolso aprobado, se reembolsa únicamente el precio del boleto. La tarifa de servicio y la de procesamiento no se devuelven.',
      },
      {
        en: 'A refund reduces an organiser’s money by the ticket price only, never by the fees, because the fees were never theirs.',
        es: 'Un reembolso reduce el dinero del organizador solo por el precio del boleto, nunca por las tarifas, porque las tarifas nunca fueron suyas.',
      },
    ],
  },
  {
    heading: { en: 'Payouts', es: 'Pagos a organizadores' },
    paragraphs: [
      {
        en: 'Organisers must connect and verify a payout account before selling tickets. Until they have, their event cannot sell tickets and the app says so.',
        es: 'Los organizadores deben conectar y verificar una cuenta de pagos antes de vender boletos. Hasta que lo hagan, su evento no puede vender boletos y la aplicación lo indica.',
      },
      {
        en: 'An event’s money is paid out 3 business days after the event ends. Ticket sales do not pay out at the time of sale, and ticket funds cannot be withdrawn before then. An organiser’s own bank may take additional days to show the money.',
        es: 'El dinero de un evento se paga 3 días hábiles después de que el evento termina. Las ventas de boletos no se pagan en el momento de la venta, y los fondos de los boletos no se pueden retirar antes. El banco del organizador puede tardar días adicionales en mostrar el dinero.',
      },
      {
        en: 'Where an event is cancelled, its payout is held until refunds have been processed.',
        es: 'Cuando un evento se cancela, su pago se retiene hasta que se hayan procesado los reembolsos.',
      },
      {
        en: 'FourCircle may hold or delay a payout to review suspected fraud, a dispute, or a breach of these terms.',
        es: 'FourCircle puede retener o retrasar un pago para revisar una sospecha de fraude, una disputa o un incumplimiento de estos términos.',
      },
      {
        en: 'If a refund or chargeback is more than the organiser’s available balance, the organiser is responsible for the difference, and FourCircle may recover it from future payouts or from the connected payout account.',
        es: 'Si un reembolso o contracargo supera el saldo disponible del organizador, el organizador es responsable de la diferencia, y FourCircle puede recuperarla de pagos futuros o de la cuenta de pagos conectada.',
      },
    ],
  },
  {
    heading: { en: 'Disputes and chargebacks', es: 'Disputas y contracargos' },
    paragraphs: [
      {
        en: 'If an attendee disputes a charge with their bank, FourCircle may reverse the organiser’s payout for that ticket.',
        es: 'Si un asistente disputa un cargo con su banco, FourCircle puede revertir el pago al organizador por ese boleto.',
      },
    ],
  },
  {
    heading: { en: 'Attendees and tickets', es: 'Asistentes y boletos' },
    paragraphs: [
      {
        en: 'A ticket is a limited licence to attend one event. Admission may be refused for reasons of safety or conduct.',
        es: 'Un boleto es una licencia limitada para asistir a un evento. Se puede negar la entrada por motivos de seguridad o de conducta.',
      },
      {
        en: 'Tickets may not be resold or transferred for money. FourCircle offers no resale feature or marketplace.',
        es: 'Los boletos no se pueden revender ni transferir por dinero. FourCircle no ofrece ninguna función de reventa ni mercado secundario.',
      },
      {
        en: 'Refunds, cancellations and changes to an event are managed by its organiser — a church or an individual host — and not by FourCircle. FourCircle is not responsible for events hosted by third parties.',
        es: 'Los reembolsos, las cancelaciones y los cambios de un evento los gestiona su organizador — una iglesia o un anfitrión particular — y no FourCircle. FourCircle no es responsable de los eventos organizados por terceros.',
      },
    ],
  },
  {
    heading: { en: 'Contact', es: 'Contacto' },
    paragraphs: [
      {
        en: 'Questions about these terms, or about a refund an organiser has not answered: support@fourcircle.app',
        es: 'Preguntas sobre estos términos, o sobre un reembolso que un organizador no ha respondido: support@fourcircle.app',
      },
    ],
  },
];

/** One line per policy, for the summary shown before anybody buys. */
export const POLICY_ONE_LINER = {
  flexible: {
    en: 'Full ticket refund if you ask up to 7 days before.',
    es: 'Reembolso completo del boleto si lo pides hasta 7 días antes.',
  },
  standard: {
    en: 'Full ticket refund if you ask up to 48 hours before.',
    es: 'Reembolso completo del boleto si lo pides hasta 48 horas antes.',
  },
  none: {
    en: 'No refunds, unless the event is cancelled or changed.',
    es: 'Sin reembolsos, salvo que el evento se cancele o cambie.',
  },
} as const;

export const POLICY_NAME = {
  flexible: { en: 'Flexible', es: 'Flexible' },
  standard: { en: 'Standard', es: 'Estándar' },
  none: { en: 'No refunds', es: 'Sin reembolsos' },
} as const;

export type PolicyKey = keyof typeof POLICY_ONE_LINER;

export function policyKey(value?: string | null): PolicyKey {
  return value === 'flexible' || value === 'none' ? value : 'standard';
}
