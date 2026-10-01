// frontend/src/locales/es/privacy.ts
export default {
  pageTitle: "LemonDBD - Política de privacidad",
  heading: "Política de privacidad",
  backToAbout: "Volver a Sobre nosotros",
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "1 de octubre de 2026",
  intro:
    "Esta página explica qué datos personales recoge <brand>LemonDBD</brand>, para qué, quién los ve y qué puedes hacer tú. La hemos escrito de forma breve y sencilla a propósito.",
  summaryHeading: "En resumen",
  summary: [
    "Solo recogemos lo que el sitio necesita para funcionar: una cuenta, lo que guardas en ella y datos técnicos básicos.",
    "Sin publicidad, sin venta de datos y sin seguimiento entre sitios.",
    "Nuestra analítica es de alojamiento propio y no usa cookies.",
    "Puedes pedirnos ver, corregir o eliminar tus datos en cualquier momento.",
  ],
  sections: {
    whoWeAre: {
      heading: "Quiénes somos",
      paragraphs: [
        "<brand>LemonDBD</brand> es un sitio gratuito hecho por fans como complemento de <i>Dead by Daylight</i>, gestionado por <brand>LemonTeam</brand>. Somos los responsables del tratamiento de los datos personales descritos en esta página.",
        "<brand>LemonDBD</brand> no es oficial y no está afiliado ni respaldado por Behaviour Interactive Inc. <i>Dead by Daylight</i> y sus nombres, imágenes y demás contenido del juego pertenecen a sus respectivos propietarios.",
      ],
      items: [],
    },
    dataWeCollect: {
      heading: "Qué recogemos",
      paragraphs: ["Puedes usar la mayor parte del sitio sin cuenta. Según lo que hagas, tratamos:"],
      items: [
        "<b>Datos de la cuenta:</b> nombre de usuario, correo electrónico, un hash de tu contraseña (nunca la contraseña en sí), avatar, idioma preferido y códigos temporales de verificación y de restablecimiento de contraseña.",
        "<b>Lo que guardas:</b> personajes y beneficios que posees, tu vitrina de perfil, tier lists, desafíos personalizados, rachas, logros y votos de Smash or Pass. Los visitantes sin cuenta reciben un ID de sesión aleatorio para recordar sus votos de Smash or Pass.",
        "<b>Informes de errores y mensajes:</b> el texto, las capturas, el nombre y el correo que nos envías. Los invitados deben indicar un correo para que podamos responder.",
        "<b>Datos técnicos:</b> tu dirección IP, tipo de navegador y detalles de las solicitudes, usados para limitar el uso, prevenir abusos y corregir errores.",
        "<b>Comandos de voz (mapas):</b> si los activas, el audio del micrófono se usa para reconocer nombres de mapas. Cómo funciona se explica abajo, en la sección sobre almacenamiento y terceros.",
      ],
    },
    howWeUse: {
      heading: "Para qué los usamos",
      paragraphs: ["Usamos los datos personales solo para los fines siguientes y, donde se aplica el RGPD, nos basamos en estas bases jurídicas:"],
      items: [
        "Crear y gestionar tu cuenta, conservar tus datos guardados y enviar correos de verificación y de restablecimiento de contraseña (ejecución de nuestro servicio hacia ti).",
        "Responder a informes de errores y solicitudes (nuestro interés legítimo en dar soporte o tu solicitud).",
        "Mantener el sitio seguro, frenar el spam y los abusos y corregir errores (nuestro interés legítimo).",
        "Entender qué páginas se usan y mejorar el sitio, con analítica respetuosa con la privacidad (nuestro interés legítimo).",
        "Cuando pedimos tu consentimiento, por ejemplo para activar una función que lo requiere, puedes retirarlo en cualquier momento.",
      ],
    },
    analytics: {
      heading: "Analítica",
      paragraphs: [
        "Usamos <b>Umami</b>, una herramienta de analítica de código abierto que alojamos nosotros mismos. No usa cookies, no te sigue por otros sitios web y no guarda tu dirección IP.",
        "Registra datos de visita anónimos como la página vista, la referencia, el navegador, el sistema operativo, el tipo de dispositivo, el tamaño de pantalla y el país aproximado.",
      ],
      items: [],
    },
    storage: {
      heading: "Cookies, almacenamiento local y terceros",
      paragraphs: [
        "Al iniciar sesión, LemonDBD establece una cookie estrictamente necesaria: una cookie de sesión que te mantiene conectado durante {sessionWindow} o hasta que cierres sesión. Es HttpOnly, por lo que los scripts de la página no pueden leerla, y nunca se usa para rastrearte. Además, el almacenamiento local de tu navegador guarda pequeños elementos que hacen funcionar el sitio o recuerdan tus elecciones, por ejemplo una marca de que has iniciado sesión, el estado de la barra lateral y los paneles, los ajustes de sonido, borradores, rosters seleccionados y tu ID de sesión de Smash or Pass.",
        "Estos elementos son estrictamente necesarios o simples ajustes de comodidad, por lo que no hace falta un banner de consentimiento. El almacenamiento local permanece en tu dispositivo y puedes borrarlo en el navegador cuando quieras; al cerrar sesión se elimina la cookie de sesión.",
        "<b>Comandos de voz:</b> en Chrome, Edge y Safari, el reconocimiento de voz lo proporciona el fabricante del navegador (por ejemplo Google o Apple), por lo que el audio puede enviarse a ellos según su propia política de privacidad. En otros navegadores, LemonDBD descarga un pequeño modelo de voz y procesa el audio solo en tu dispositivo.",
      ],
      items: [],
    },
    sharing: {
      heading: "Quién ve tus datos",
      paragraphs: ["No vendemos tus datos personales ni los usamos para publicidad. Los compartimos solo cuando es necesario:"],
      items: [
        "<b>Contenido público:</b> lo que decides publicar, como tier lists, rosters y clasificaciones públicos, es visible para otros visitantes junto con tu nombre de usuario y avatar.",
        "<b>Proveedores de servicios:</b> nuestro proveedor de alojamiento y {mailProvider} (que entrega nuestros correos de verificación y de restablecimiento de contraseña) tratan datos en nuestro nombre, solo para mantener el sitio y enviarte los correos que solicitas.",
        "<b>Discord:</b> cuando envías un informe de error, su contenido (incluidos tu nombre, correo y capturas) se reenvía a un canal privado de nuestro equipo.",
        "<b>Motivos legales:</b> si la ley lo exige o para proteger el sitio y a sus usuarios de abusos.",
      ],
    },
    transfers: {
      heading: "Transferencias internacionales",
      paragraphs: [
        "Algunos proveedores en los que confiamos pueden tratar datos fuera de tu país, incluso fuera del EEE o del Reino Unido. En ese caso nos apoyamos en garantías como las cláusulas contractuales tipo o una decisión de adecuación.",
      ],
      items: [],
    },
    retention: {
      heading: "Cuánto tiempo los conservamos",
      paragraphs: [
        "Los datos de la cuenta y lo que guardas se conservan mientras exista tu cuenta. Los códigos de verificación caducan a los {verificationWindow}, los enlaces de restablecimiento de contraseña a los {resetWindow} y las sesiones de inicio de sesión a los {sessionWindow}. Las rachas que permanecen inactivas durante {streakPrune} se terminan automáticamente. Los informes de errores se conservan el tiempo necesario para resolver el problema y para nuestros registros. Los registros del servidor se guardan solo brevemente. Los datos de analítica son anónimos.",
        "Puedes eliminar tu cuenta tú mismo desde tu página de perfil o pedírnoslo. Entonces borramos tus datos de cuenta, el contenido guardado y el avatar subido. Tus informes de errores se conservan en nuestros registros, pero les quitamos tu nombre y correo electrónico. Las copias ya enviadas a nuestro canal privado de Discord o guardadas en respaldos pueden permanecer un tiempo limitado, y lo que hayas publicado puede anonimizarse en lugar de eliminarse.",
      ],
      items: [],
    },
    security: {
      heading: "Seguridad",
      paragraphs: [
        "Protegemos tus datos con medidas como conexiones cifradas (HTTPS), contraseñas con hash, limitación de solicitudes y protección contra spam. Ningún servicio en línea es perfectamente seguro, así que usa una contraseña fuerte y única.",
      ],
      items: [],
    },
    rights: {
      heading: "Tus derechos",
      paragraphs: [
        "Según dónde vivas (por ejemplo, en el EEE o el Reino Unido), tienes derecho a:",
        "Puedes actualizar los datos de tu perfil y eliminar tu cuenta tú mismo en tu página de perfil. Para recibir una copia de tus datos o ejercer cualquier otro derecho, escribe a [{contactEmail}](mailto:{contactEmail}); respondemos en el plazo de un mes.",
      ],
      items: [
        "acceder a los datos personales que tenemos sobre ti y obtener una copia;",
        "corregir datos inexactos;",
        "pedirnos que eliminemos tus datos (el «derecho al olvido»);",
        "limitar u oponerte a determinados tratamientos;",
        "recibir tus datos en un formato portable;",
        "retirar tu consentimiento en cualquier momento, cuando el tratamiento se base en él;",
        "presentar una reclamación ante tu autoridad local de protección de datos.",
      ],
    },
    children: {
      heading: "Menores",
      paragraphs: [
        "LemonDBD no está dirigido a menores de 13 años (o de 16 donde tu país fije una edad de consentimiento superior) y no recogemos sus datos a sabiendas. Si crees que un menor nos ha dado datos personales, contáctanos y los eliminaremos.",
      ],
      items: [],
    },
    changes: {
      heading: "Cambios en esta política",
      paragraphs: [
        "Podemos actualizar esta página cuando cambien el sitio o la ley. La fecha de «Última actualización» de arriba indica la versión más reciente, y anunciaremos los cambios importantes en el sitio.",
      ],
      items: [],
    },
    contact: {
      heading: "Contacto",
      paragraphs: [
        "Para ejercer tus derechos, hacer una pregunta de privacidad o pedir la eliminación de tu cuenta, escríbenos a [{contactEmail}](mailto:{contactEmail}). Los usuarios con sesión iniciada también pueden eliminar su cuenta desde su página de perfil. Escribe desde la dirección registrada en tu cuenta para que podamos verificar tu identidad.",
        "Si las versiones traducidas de esta página difieren de la inglesa, prevalece la versión en inglés.",
      ],
      items: [],
    },
  },
};
