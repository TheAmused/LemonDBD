import { TOKEN_REGEX, KEYWORD_TOKEN_REGEX, DBD_KEYWORDS } from '../src/utils/textFormatter';
for (const w of ['aplicar','bandages','Bandagen','trials','activation','revelarás','extender','Generatoren','ujawniania']) {
  console.log(String(w).padEnd(14), 'kwRegex=', KEYWORD_TOKEN_REGEX.test(w), ' split=', JSON.stringify(`x ${w} y`.split(TOKEN_REGEX)));
}
console.log('has Aplica:', DBD_KEYWORDS.includes('Aplica'), '| has Bandage:', DBD_KEYWORDS.includes('Bandage'), '| has Trial:', DBD_KEYWORDS.includes('Trial'));
