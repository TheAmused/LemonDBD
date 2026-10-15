// frontend/src/locales/es/privacy.ts
export default {
  pageTitle: "LemonDBD - Política de privacidad",
  heading: "Política de privacidad",
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "15 de octubre de 2026",
  intro:
    "Esta página explica qué datos personales recoge <brand>LemonDBD</brand>, para qué, quién los ve y qué puedes hacer tú. La hemos escrito de forma breve y sencilla a propósito.",
  translationNotice: "Si las versiones traducidas de esta página difieren de la inglesa, prevalece la versión en inglés.",
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
    aiContent: {
      heading: "Contenido generado con IA",
      paragraphs: [
        "Parte del contenido de <brand>LemonDBD</brand>, como las imágenes y algunos textos, puede haberse generado, editado o escalado (upscaling) con herramientas de IA.",
        "Algunos textos sobre el lore de los personajes pueden incluir añadidos que van más allá del lore canon, escritos con fines humorísticos.",
        "El contenido creado con ayuda de IA puede tener errores o detalles extraños. Si ves algo incorrecto o quieres que revisemos o retiremos un contenido, contáctanos.",
      ],
      items: [],
    },
    dataWeCollect: {
      heading: "Qué recogemos",
      paragraphs: ["Puedes usar la mayor parte del sitio sin cuenta. Según lo que hagas, tratamos:"],
      items: [
        "<b>Datos de la cuenta:</b> nombre de usuario, correo electrónico, un hash de tu contraseña (nunca la contraseña en sí), avatar, idioma preferido y códigos temporales de verificación y de restablecimiento de contraseña.",
        "<b>Inicio de sesión en dos pasos (opcional):</b> solo si lo activas desde tu página de perfil. Guardamos la clave secreta de tu aplicación de autenticación (cifrada), códigos de recuperación de un solo uso con hash, el momento en que lo activaste, el último paso de código aceptado (para que un código no pueda reutilizarse) y un contador de códigos incorrectos recientes con la hora de un bloqueo temporal. Tu aplicación de autenticación genera los códigos en tu dispositivo; no hace falta número de teléfono.",
        "<b>Lo que guardas:</b> personajes y beneficios que posees, tu vitrina de perfil, rachas, logros de desafíos, estadísticas de minijuegos y votos de Smash or Pass. Tus tier lists, rosters de Smash or Pass y minijuegos personalizados se quedan en tu navegador y no se almacenan en nuestros servidores, salvo lo descrito en la sección «Reportar contenido». Los visitantes sin cuenta reciben un ID de sesión aleatorio para recordar sus votos de Smash or Pass.",
        "<b>Informes de errores y mensajes:</b> el texto, las capturas y el correo que nos envías. Los invitados deben indicar un correo para que podamos responder.",
        "<b>Datos técnicos:</b> tu dirección IP, tipo de navegador y detalles de las solicitudes, usados para limitar el uso, prevenir abusos y corregir errores.",
        "<b>Comandos de voz (mapas):</b> si los activas, el audio del micrófono se usa para reconocer nombres de mapas. Cómo funciona se explica abajo, en la sección sobre almacenamiento y terceros.",
        "<b>Verificación por captura:</b> si subes el marcador de una partida para verificar un reto, la imagen se analiza en la memoria del servidor y se descarta en cuanto el resultado está listo. No se guarda ni se registra; solo se te devuelve el resultado (por ejemplo, ganada o no).",
      ],
    },
    howWeUse: {
      heading: "Para qué los usamos",
      paragraphs: ["Usamos los datos personales solo para los fines siguientes y, donde se aplica el RGPD, nos basamos en estas bases jurídicas:"],
      items: [
        "Crear y gestionar tu cuenta, conservar tus datos guardados y enviar correos de verificación y de restablecimiento de contraseña y, si lo activas, comprobar tu código de dos pasos al iniciar sesión (ejecución de nuestro servicio hacia ti).",
        "Responder a informes de errores y solicitudes (nuestro interés legítimo en dar soporte o tu solicitud).",
        "Mantener seguros el sitio y las cuentas, incluido limitar los códigos de dos pasos incorrectos, frenar el spam y los abusos y corregir errores (nuestro interés legítimo).",
        "Revisar reportes de contenido y hacer cumplir nuestras Normas (nuestro interés legítimo en mantener el sitio seguro).",
        "Entender qué páginas se usan y mejorar el sitio mediante analítica respetuosa con la privacidad (nuestro interés legítimo).",
        "Si te pedimos tu consentimiento, puedes retirarlo en cualquier momento.",
      ],
    },
    moderation: {
      heading: "Reportar contenido",
      paragraphs: [
        "Las tier lists, los rosters y los minijuegos personalizados viven en tu navegador, no en nuestros servidores. Dos cosas nos involucran:",
        "Cuando eliminas tu cuenta, tu nombre de usuario en estos registros se sustituye por «Deleted user» y las notas que escribiste como persona que reporta se borran. Estos registros forman parte de los datos que puedes descargar.",
      ],
      items: [
        "<b>Compartir y exportar:</b> añadimos al enlace o archivo una marca de cuenta a prueba de manipulaciones (identifica tu cuenta), para que el contenido reportado pueda atribuirse a su autor. Para ello, nuestro servidor lee brevemente el contenido, pero no lo guarda.",
        "<b>Reportes:</b> si reportas un contenido, recibimos tu cuenta, el motivo, tu nota opcional y una copia del contenido. Un miembro de <brand>LemonTeam</brand> la revisa y la copia se elimina tras la decisión, como máximo a los 14 días.",
        "<b>Tras una decisión:</b> conservamos un registro breve (tipo de contenido, motivo, resultado, fechas, cuentas implicadas). Si se banea un contenido, un código unidireccional de él pasa a una lista de bloqueo para que no pueda volver a abrirse ni importarse; del código no se puede recuperar el contenido. Estos registros se conservan mientras los necesitemos para gestionar reclamaciones y evitar abusos repetidos. Al autor, si se conoce, le enviamos el motivo por correo; no indicamos quién reportó.",
      ],
    },
    analytics: {
      heading: "Analítica",
      paragraphs: [
        "Usamos <b>Umami</b>, una herramienta de analítica de código abierto que alojamos nosotros mismos. No usa cookies, no te sigue por otros sitios web y no guarda tu dirección IP.",
        "Registra datos de visita anónimos como la página vista, la referencia, el navegador, el sistema operativo, el tipo de dispositivo, el tamaño de pantalla, el país aproximado y los clics en elementos seleccionados de la página. Los datos de analítica son anónimos.",
      ],
      items: [],
    },
    storage: {
      heading: "Cookies, almacenamiento local y terceros",
      paragraphs: [
        "Al iniciar sesión, <brand>LemonDBD</brand> establece una cookie estrictamente necesaria: una cookie de sesión que te mantiene conectado durante {sessionWindow} o hasta que cierres sesión. Es HttpOnly, por lo que los scripts de la página no pueden leerla, y nunca se usa para rastrearte. Además, el almacenamiento local de tu navegador guarda pequeños elementos que hacen funcionar el sitio o recuerdan tus elecciones, por ejemplo una marca de que has iniciado sesión, el estado de la barra lateral y los paneles, los ajustes de sonido, borradores, rosters seleccionados y tu ID de sesión de Smash or Pass.",
        "Estos elementos son estrictamente necesarios o simples ajustes de comodidad, por lo que no hace falta un banner de consentimiento. El almacenamiento local permanece en tu dispositivo y puedes borrarlo en el navegador cuando quieras; al cerrar sesión se elimina la cookie de sesión.",
        "<b>Comandos de voz:</b> en Chrome, Edge y Safari, el reconocimiento de voz lo proporciona el fabricante del navegador (por ejemplo Google o Apple), por lo que el audio puede enviarse a ellos según su propia política de privacidad. En otros navegadores, <brand>LemonDBD</brand> descarga un pequeño modelo de voz y procesa el audio solo en tu dispositivo.",
      ],
      items: [],
    },
    sharing: {
      heading: "Quién ve tus datos",
      paragraphs: ["No vendemos tus datos personales ni los usamos para publicidad. Los compartimos solo cuando es necesario:"],
      items: [
        "<b>Enlaces que compartes:</b> cuando compartes una tier list, un roster o un minijuego personalizado, va empaquetado en el propio enlace (la parte después de «#», que tu navegador nunca nos envía). No lo guardamos; solo pueden abrirlo quienes reciban el enlace. Se añade tu marca de cuenta (consulta «Reportar contenido»).",
        "<b>Proveedores de servicios:</b> nuestro proveedor de alojamiento y {mailProvider} (que entrega nuestros correos de verificación y de restablecimiento de contraseña) tratan datos en nuestro nombre, solo para mantener el sitio y enviarte los correos que solicitas, incluidos los avisos cuando cambia un ajuste de seguridad de tu cuenta o cuando bloqueamos tu contenido. Los códigos de dos pasos los genera tu propia aplicación de autenticación y se comprueban en nuestro servidor; no usamos ningún servicio de terceros para ello y no se envía nada de ellos a Google, Microsoft, Apple ni a nadie más.",
        "<b>Discord:</b> cuando envías un informe de error, su contenido (incluidos tu correo y capturas) se reenvía a un canal privado de nuestro equipo.",
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
        "Los datos de la cuenta y lo que guardas se conservan mientras exista tu cuenta. Los códigos de verificación caducan a los {verificationWindow}, los enlaces de restablecimiento de contraseña a los {resetWindow} y las sesiones de inicio de sesión a los {sessionWindow}. Las rachas que permanecen inactivas durante {streakPrune} se terminan automáticamente. Los informes de errores se conservan el tiempo necesario para resolver el problema y para nuestros registros. Los registros del servidor se guardan solo brevemente. Un paso de inicio de sesión en dos pasos caduca a los 5 minutos y un bloqueo temporal tras varios códigos incorrectos dura 15 minutos.",
        "Puedes eliminar tu cuenta tú mismo desde tu página de perfil o pedirnos que lo hagamos. Se eliminan entonces los datos de la cuenta, los personajes y beneficios que posees, la vitrina, las rachas, las estadísticas de minijuegos, los logros de desafíos, el avatar subido y cualquier configuración de dos pasos y códigos de recuperación. Al desactivar el inicio de sesión en dos pasos también se eliminan. Los votos de Smash or Pass permanecen como entradas anónimas que ya no están vinculadas a ti. Tus informes de errores se conservan en nuestros registros, pero se les quita tu correo electrónico. Las copias ya enviadas a nuestro canal privado de Discord pueden permanecer.",
      ],
      items: [],
    },
    security: {
      heading: "Seguridad",
      paragraphs: [
        "Protegemos tus datos con medidas como conexiones cifradas (HTTPS), contraseñas con hash, limitación de solicitudes, protección contra spam y el inicio de sesión en dos pasos opcional (la clave secreta se guarda cifrada y los códigos de recuperación con hash). Al cambiar o restablecer tu contraseña se cierra la sesión en tus otros dispositivos. Ningún servicio en línea es perfectamente seguro, así que usa una contraseña fuerte y única.",
      ],
      items: [],
    },
    rights: {
      heading: "Tus derechos",
      paragraphs: [
        "Según dónde vivas (por ejemplo, en el EEE o el Reino Unido), tienes derecho a:",
        "En tu página de perfil puedes actualizar tus datos de perfil, activar o desactivar el inicio de sesión en dos pasos, descargar una copia de tus datos y eliminar tu cuenta tú mismo. Para ejercer cualquier otro derecho, escribe a [{contactEmail}](mailto:{contactEmail}); respondemos en el plazo de un mes.",
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
        "<brand>LemonDBD</brand> no está dirigido a menores de 13 años (o de 16 donde tu país fije una edad de consentimiento superior) y no recogemos sus datos a sabiendas. Si crees que un menor nos ha dado datos personales, contáctanos y los eliminaremos.",
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
        "Para ejercer tus derechos, hacer una pregunta de privacidad o pedir la eliminación de tu cuenta, escríbenos a [{contactEmail}](mailto:{contactEmail}). Los usuarios con sesión iniciada también pueden eliminar su cuenta desde su página de perfil. Escribe desde la dirección registrada en tu cuenta para que podamos verificar tu identidad. Si pierdes tanto tu aplicación de autenticación como tus códigos de recuperación, podemos desactivar los dos pasos de tu cuenta una vez verificada tu identidad.",
      ],
      items: [],
    },
  },
};
