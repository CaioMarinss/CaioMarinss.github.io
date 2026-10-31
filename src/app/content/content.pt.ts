import { SiteContent } from './content.types';

export const CONTENT_PT: SiteContent = {
  lang: 'pt',
  meta: {
    title: 'Caio Marins — Desenvolvedor Full Stack Júnior',
    description:
      'Portfólio de Caio Marins, desenvolvedor full stack júnior (Java e Angular) na Núclea. Sistemas completos, do front em Angular às filas IBM MQ e ao DB2.',
  },
  nav: {
    intro: 'Início',
    experience: 'Núclea',
    projects: 'Projetos',
    stage: 'Palco',
    contact: 'Contato',
  },
  ui: {
    resume: 'Currículo',
    resumeHref: '/cv/caio-marins-cv-pt.pdf',
    scrollHint: 'Role',
    skipLink: 'Pular para o conteúdo',
    switchLang: 'Mudar idioma',
  },
  intro: {
    kicker: 'Desenvolvedor Full Stack Júnior',
    title: [{ words: [{ text: 'Caio' }] }, { words: [{ text: 'Marins', em: true }] }],
    paragraphs: [
      'Conecto sistemas: do front em Angular às filas IBM MQ e ao DB2.',
      'Analista Desenvolvedor Jr. na Núclea, promovido de jovem aprendiz a júnior em seis meses, e entrego sistemas completos para clientes reais.',
    ],
    photo: {
      src: '/images/caio-960.webp',
      srcset: '/images/caio-480.webp 480w, /images/caio-960.webp 960w',
      sizes: '(max-width: 860px) 60vw, 25vw',
      width: 960,
      height: 1280,
      alt: 'Retrato de Caio Marins',
    },
  },
  experience: {
    kicker: 'Experiência',
    title: [
      { words: [{ text: 'Sistemas' }] },
      { words: [{ text: 'em' }, { text: 'produção', em: true }] },
    ],
    company: 'Núclea',
    companyNote: 'antiga CIP',
    ladder: [
      { period: '17/02/2025', role: 'Jovem aprendiz' },
      { period: '09/2025', role: 'Analista Desenvolvedor Jr.', em: true },
    ],
    paragraph:
      'Na Núclea, sustento sistemas que rodam todo dia: webservices com XML/SOAP, troca de arquivos, APIs e mensageria com IBM MQ sobre DB2 e AWS.',
    stackLabel: 'Stack do dia a dia',
    stack: ['Java', 'Wicket', 'IBM DB2', 'IBM MQ', 'AWS', 'XML / SOAP', 'GitHub Actions'],
  },
  projects: {
    kicker: 'Projetos',
    title: [
      { words: [{ text: 'Do' }, { text: 'front' }] },
      { words: [{ text: 'ao' }, { text: 'banco', em: true }] },
    ],
    items: [
      {
        id: 'almeida',
        name: 'Sistema Almeida JJ',
        summary:
          'Gestão interna de uma academia, para um cliente real: Angular, API em Java/Spring Boot, login com JWT e Spring Security.',
        tags: ['Angular', 'Java', 'Spring Boot', 'Spring Security', 'JWT', 'MySQL', 'Docker'],
        status: 'No ar · em evolução',
        links: [
          { label: 'Abrir sistema', href: 'https://almeidatucuruvi.vercel.app/login' },
          { label: 'Front-end', href: 'https://github.com/CaioMarinss/almeida-jj-frontend' },
          { label: 'API', href: 'https://github.com/CaioMarinss/almeida-jj-api' },
        ],
      },
      {
        id: 'climb',
        name: 'Climb',
        summary:
          'Site da Almeida JJ e meu TCC no Instituto da Oportunidade Social, selecionado entre os melhores trabalhos de conclusão.',
        tags: ['HTML', 'CSS', 'JavaScript'],
        status: 'No ar',
        award: 'Top TCC · CriaTech / TOTVS',
        links: [
          { label: 'Ver site', href: 'https://caiomarinss.github.io/climb-TCC/' },
          { label: 'Repositório', href: 'https://github.com/CaioMarinss/climb-TCC' },
        ],
        preview: {
          src: '/images/shots/climb.webp',
          alt: 'Captura de tela do site Climb',
          width: 960,
          height: 600,
        },
      },
      {
        id: 'continuar',
        name: 'Continuar Marcas e Patentes',
        summary:
          'Site institucional para um cliente real, pré-renderizado, com deploy automático.',
        tags: ['Angular 22', 'Pré-renderização', 'GitHub Actions'],
        status: 'No ar',
        links: [
          { label: 'Ver site', href: 'https://caiomarinss.github.io/continuar-marcas-e-patentes/' },
          {
            label: 'Repositório',
            href: 'https://github.com/CaioMarinss/continuar-marcas-e-patentes',
          },
        ],
        preview: {
          src: '/images/shots/continuar.webp',
          alt: 'Captura de tela do site da Continuar Marcas e Patentes',
          width: 960,
          height: 600,
        },
      },
    ],
  },
  stage: {
    kicker: 'Palco',
    title: [
      { words: [{ text: 'Também' }] },
      { words: [{ text: 'sei' }, { text: 'contar', em: true }] },
    ],
    events: [
      {
        meta: 'CriaTech · 4ª edição · TOTVS · 2025',
        title: 'Entre os melhores TCCs',
        text: 'O Climb foi selecionado e apresentado no palco do evento.',
      },
      {
        meta: 'Trampos do Futuro · Fundação Itaú · 2026',
        title: 'Palestra pela Núclea Associação',
        text: 'Contei minha trajetória até a tecnologia.',
      },
    ],
  },
  contact: {
    kicker: 'Contato',
    title: [{ words: [{ text: 'Vamos' }] }, { words: [{ text: 'conversar?', em: true }] }],
    facts: ['Inglês B2', 'ADS · conclusão 2027/1'],
    links: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/caio-marins-247633265/' },
      { label: 'caio.marins011@gmail.com', href: 'mailto:caio.marins011@gmail.com' },
      { label: 'GitHub', href: 'https://github.com/CaioMarinss' },
    ],
  },
  resume: {
    role: 'Desenvolvedor Full Stack Júnior',
    summary:
      'Analista Desenvolvedor Jr. na Núclea (Java, IBM DB2, IBM MQ, AWS). Entrego sistemas completos, do front em Angular à API e ao banco, para clientes reais.',
    timelineLabel: 'Trajetória',
    timeline: [
      { period: '2024', title: 'Desenvolvimento Web', detail: 'Instituto da Oportunidade Social — média 10', kind: 'course' },
      { period: '2025', title: 'CriaTech 4ª edição · TOTVS', detail: 'Climb entre os melhores TCCs' },
      { period: '02/2025', title: 'Jovem aprendiz', detail: 'Núclea' },
      { period: '05/2025', title: 'Java', detail: 'Núclea Academy — 19h', kind: 'course' },
      { period: '09/2025', title: 'Analista Desenvolvedor Jr.', detail: 'Núclea' },
      { period: 'Curso', title: 'Fundamentos de Docker', detail: 'TreinaWeb / LinkedIn Learning', kind: 'course' },
      { period: '2026', title: 'Trampos do Futuro · Fundação Itaú', detail: 'Palestra pela Núclea Associação' },
      { period: '2027/1', title: 'Conclusão de ADS' },
    ],
    languagesLabel: 'Idiomas',
    languages: ['Inglês — B2'],
    educationLabel: 'Formação',
    education: ['ADS — conclusão prevista para 2027/1'],
  },
};
