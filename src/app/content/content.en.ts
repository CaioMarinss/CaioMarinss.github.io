import { SiteContent } from './content.types';

export const CONTENT_EN: SiteContent = {
  lang: 'en',
  meta: {
    title: 'Caio Marins — Junior Full Stack Developer',
    description:
      'Portfolio of Caio Marins, junior full stack developer (Java and Angular) at Núclea. End-to-end systems, from the Angular front end to IBM MQ queues and DB2.',
  },
  nav: {
    intro: 'Home',
    experience: 'Experience',
    projects: 'Projects',
    stage: 'Stage',
    contact: 'Contact',
  },
  ui: {
    resume: 'Résumé',
    resumeHref: '/cv/caio-marins-cv-en.pdf',
    scrollHint: 'Scroll',
    skipLink: 'Skip to content',
    switchLang: 'Switch language',
  },
  intro: {
    kicker: 'Junior Full Stack Developer',
    title: [{ words: [{ text: 'Caio' }] }, { words: [{ text: 'Marins', em: true }] }],
    paragraphs: [
      'I connect systems, from the Angular front end to IBM MQ queues and DB2.',
      'Junior Developer Analyst at Núclea, promoted from apprentice to junior in six months, and I deliver complete systems for real clients.',
    ],
  },
  experience: {
    kicker: 'Experience',
    title: [
      { words: [{ text: 'Systems' }] },
      { words: [{ text: 'in' }, { text: 'production', em: true }] },
    ],
    company: 'Núclea',
    companyNote: 'formerly CIP',
    ladder: [
      { period: '02/17/2025', role: 'Apprentice' },
      { period: '09/2025', role: 'Junior Developer Analyst', em: true },
    ],
    paragraph:
      'At Núclea, I maintain systems that run every day: XML/SOAP web services, file exchange, APIs and IBM MQ messaging on top of DB2 and AWS.',
    stackLabel: 'Daily stack',
    stack: ['Java', 'Wicket', 'WebSphere', 'IBM DB2', 'IBM MQ', 'AWS', 'XML / SOAP', 'GitHub Actions'],
  },
  projects: {
    kicker: 'Projects',
    title: [
      { words: [{ text: 'From' }, { text: 'front' }] },
      { words: [{ text: 'to' }, { text: 'database', em: true }] },
    ],
    items: [
      {
        id: 'almeida',
        name: 'Almeida JJ System',
        summary:
          'Internal management system for a gym, built for a real client: Angular, a Java/Spring Boot API, JWT login and Spring Security.',
        tags: ['Angular', 'Java', 'Spring Boot', 'Spring Security', 'JWT', 'MySQL', 'Docker'],
        status: 'Live · evolving',
        links: [
          { label: 'Open system', href: 'https://almeidatucuruvi.vercel.app/login' },
          { label: 'Front end', href: 'https://github.com/CaioMarinss/almeida-jj-frontend' },
          { label: 'API', href: 'https://github.com/CaioMarinss/almeida-jj-api' },
        ],
      },
      {
        id: 'climb',
        name: 'Climb',
        summary:
          'The Almeida JJ website and my capstone project at Instituto da Oportunidade Social, picked among the best final projects.',
        tags: ['HTML', 'CSS', 'JavaScript'],
        status: 'Live',
        award: 'Top Capstone · CriaTech / TOTVS',
        links: [
          { label: 'View site', href: 'https://caiomarinss.github.io/climb-TCC/' },
          { label: 'Repository', href: 'https://github.com/CaioMarinss/climb-TCC' },
        ],
        preview: {
          src: '/images/shots/climb.webp',
          alt: 'Screenshot of the Climb website',
          width: 960,
          height: 600,
        },
      },
      {
        id: 'continuar',
        name: 'Continuar Marcas e Patentes',
        summary:
          'Institutional website for a real client, prerendered, with automated deployment.',
        tags: ['Angular 22', 'Prerendering', 'GitHub Actions'],
        status: 'Live',
        links: [
          { label: 'View site', href: 'https://caiomarinss.github.io/continuar-marcas-e-patentes/' },
          {
            label: 'Repository',
            href: 'https://github.com/CaioMarinss/continuar-marcas-e-patentes',
          },
        ],
        preview: {
          src: '/images/shots/continuar.webp',
          alt: 'Screenshot of the Continuar Marcas e Patentes website',
          width: 960,
          height: 600,
        },
      },
    ],
  },
  stage: {
    kicker: 'Stage',
    title: [
      { words: [{ text: 'Beyond' }, { text: 'the' }] },
      { words: [{ text: 'code', em: true }] },
    ],
    events: [
      {
        meta: 'CriaTech · 4th edition · TOTVS · 2025',
        title: 'Among the best capstone projects',
        text: 'Climb was selected and presented on stage at the event.',
      },
      {
        meta: 'Trampos do Futuro · Fundação Itaú · 2026',
        title: 'Talk for Núclea Associação',
        text: 'I told the story of my path into technology.',
      },
    ],
  },
  contact: {
    kicker: 'Contact',
    title: [{ words: [{ text: "Let's" }] }, { words: [{ text: 'talk?', em: true }] }],
    facts: ['English B2', 'Systems Analysis and Development (ADS) · graduating 2027/1'],
    links: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/caio-marins-247633265/' },
      { label: 'caio.marins011@gmail.com', href: 'mailto:caio.marins011@gmail.com' },
      { label: 'GitHub', href: 'https://github.com/CaioMarinss' },
    ],
  },
  resume: {
    role: 'Junior Full Stack Developer',
    summary:
      'Junior Developer Analyst at Núclea (Java, IBM DB2, IBM MQ, AWS). I deliver complete systems for real clients, from the Angular front end to the API and the database.',
    timelineLabel: 'Timeline',
    timeline: [
      { period: '2024', title: 'Web Development', detail: 'Instituto da Oportunidade Social — grade average 10', kind: 'course' },
      { period: '2025', title: 'CriaTech 4th edition · TOTVS', detail: 'Climb among the best capstone projects' },
      { period: '02/2025', title: 'Apprentice', detail: 'Núclea' },
      { period: '05/2025', title: 'Java', detail: 'Núclea Academy — 19h', kind: 'course' },
      { period: '09/2025', title: 'Junior Developer Analyst', detail: 'Núclea' },
      { period: 'Course', title: 'Docker Fundamentals', detail: 'TreinaWeb / LinkedIn Learning', kind: 'course' },
      { period: '2026', title: 'Trampos do Futuro · Fundação Itaú', detail: 'Talk for Núclea Associação' },
      { period: '2027/1', title: 'ADS degree completion' },
    ],
    languagesLabel: 'Languages',
    languages: ['English — B2'],
    educationLabel: 'Education',
    education: ['Systems Analysis and Development (ADS) — expected 2027/1'],
  },
};
