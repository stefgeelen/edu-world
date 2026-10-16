import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import leapioLogo from '@/assets/brand/leapio-logo-donker.svg';

const CONTACT_EMAIL = 'info@leapio.be';
const LAST_UPDATED = '16 oktober 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold text-lp-night">{title}</h2>
      {children}
    </section>
  );
}

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-lp-night underline underline-offset-2">
    {CONTACT_EMAIL}
  </a>
);

/** Leapio's privacy statement. Keep it in step with what the app actually stores and sends. */
export default function Privacy() {
  return (
    <main className="min-h-screen bg-lp-cream font-lp-body text-lp-night/85 [&_h1]:font-lp-display [&_h2]:font-lp-display">
      <SEO
        title="Privacyverklaring — Leapio"
        description="Welke gegevens Leapio bewaart over jou en je kind, waarom, hoe lang en wat je rechten zijn."
        canonical="https://leapio.be/privacy"
      />

      <header className="bg-lp-night px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" aria-label="Leapio startpagina">
            <img src={leapioLogo} alt="" className="h-9 w-auto" />
          </Link>
          <Link to="/" className="text-sm font-semibold text-lp-cream/80 hover:text-lp-gold">
            Terug naar Leapio
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-10 px-5 py-12 leading-relaxed sm:px-8 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-lp-night">Privacyverklaring</h1>
          <p className="text-sm text-lp-night/60">Laatst bijgewerkt op {LAST_UPDATED}</p>
          <p>
            Leapio is een oefenapp voor kinderen van het 1ste en 2de leerjaar. Omdat het om kinderen gaat,
            bewaren we zo weinig mogelijk. Hier lees je welke gegevens dat zijn, waarom we ze nodig hebben,
            wie ze voor ons verwerkt en wat je rechten zijn.
          </p>
        </div>

        <Section title="Wie zijn wij?">
          <p>
            Leapio is een oefenapp uit Vlaanderen, gemaakt voor het Vlaamse 1ste en 2de leerjaar. Leapio
            is verantwoordelijk voor de verwerking van je gegevens. Dat betekent dat wij beslissen welke
            gegevens nodig zijn en dat wij ervoor instaan dat ze veilig zijn.
          </p>
          <p>
            Voor elke vraag over je gegevens of over privacy kan je ons bereiken via <Mail />. Je krijgt
            antwoord van een mens, niet van een automatisch systeem.
          </p>
        </Section>

        <Section title="Het account is van de ouder">
          <p>
            Een kind kan zelf geen account maken. Een ouder of voogd maakt het account aan, voegt de
            kinderen toe en beheert hun gegevens. Kinderen hebben geen eigen e-mailadres of wachtwoord
            in Leapio. Het ouderportaal is afgeschermd met een pincode.
          </p>
        </Section>

        <Section title="Welke gegevens bewaren we?">
          <p className="font-semibold text-lp-night">Over jou als ouder</p>
          <ul>
            <li>je naam en e-mailadres, en je wachtwoord (versleuteld, wij kunnen het niet lezen);</li>
            <li>als je inlogt met Google: je naam en e-mailadres zoals Google ze aan ons doorgeeft;</li>
            <li>je ouderpincode (versleuteld);</li>
            <li>je pakket (Gratis, Basis, Familie of School) en de beloningen die je voor je kind instelt;</li>
            <li>wanneer je de app voor het laatst opende en of je ze op je beginscherm zette.</li>
          </ul>
          <p className="font-semibold text-lp-night">Over je kind</p>
          <ul>
            <li>de voornaam (of een bijnaam), de leeftijd en het leerjaar;</li>
            <li>de gekozen Buddy, de Munten, wat in de winkel gekocht werd en hoe de Buddy groeit;</li>
            <li>
              de oefenresultaten: welke oefening, wanneer, hoeveel sterren, en of een oefening werd
              afgebroken. Daarmee tonen we jou in het ouderportaal waar je kind nog moeite mee heeft;
            </li>
            <li>de badges die je kind verdiende en wanneer het de app voor het laatst opende.</li>
          </ul>
          <p>
            We vragen geen geboortedatum, geen foto, geen school en geen adres. We gebruiken geen
            reclame, geen advertentiecookies en geen trackers van derden.
          </p>
          <p className="font-semibold text-lp-night">Als je je inschrijft voor de beta</p>
          <ul>
            <li>je e-mailadres, en als je die invult je voornaam en het leerjaar van je kind;</li>
            <li>via welke pagina je je inschreef en welk type toestel en browser je gebruikte.</li>
          </ul>
        </Section>

        <Section title="Waarom gebruiken we die gegevens?">
          <ul>
            <li>
              <strong>Om Leapio te laten werken</strong> (inloggen, oefeningen, Buddy, voortgang, het
              ouderportaal). Dat is nodig voor de overeenkomst die je met ons sluit als je een account
              maakt.
            </li>
            <li>
              <strong>Om Leapio te verbeteren:</strong> we kijken naar het gebruik in het geheel (hoeveel
              gezinnen terugkomen, welke oefeningen moeilijk zijn). Dat is ons gerechtvaardigd belang. We
              maken geen profielen voor reclame en verkopen nooit gegevens.
            </li>
            <li>
              <strong>Om je te mailen over je account</strong> (bevestiging, wachtwoord vergeten) en, als je
              je inschreef, over de beta. Voor de beta-mails is dat op basis van je toestemming. Die kan je
              altijd intrekken.
            </li>
          </ul>
        </Section>

        <Section title="Wie verwerkt gegevens voor ons?">
          <p>
            We delen je gegevens met niemand om ze te verkopen of voor reclame. We werken wel met een
            paar diensten die Leapio nodig heeft om te werken. Zij verwerken gegevens alleen in onze
            opdracht en volgens een verwerkersovereenkomst:
          </p>
          <ul>
            <li><strong>Supabase</strong>: onze database, de logins en de mails over je account. De database staat in Ierland, binnen de Europese Unie.</li>
            <li><strong>Vercel</strong>: de hosting van de website en de app.</li>
            <li><strong>Google</strong>: alleen als je kiest om met Google in te loggen, en voor een lettertype op de website.</li>
            <li>
              <strong>Anthropic</strong>: in de schrijfoefening voor cijfers sturen we de tekening van het
              cijfer, zonder naam of andere gegevens, om te herkennen welk cijfer je kind schreef. Leapio
              bewaart die tekening niet. Anthropic gebruikt ze niet om zijn modellen te trainen.
            </li>
            <li>
              <strong>ElevenLabs</strong>: maakt de voorleesstem. Het krijgt alleen de teksten van de
              oefeningen, geen gegevens over jou of je kind.
            </li>
          </ul>
          <p>
            De gegevens van jou en je kind staan dus in de Europese Unie. Sommige van deze diensten zijn wel
            Amerikaanse bedrijven. Gegevens die daardoor toch buiten de Europese Unie terechtkomen, zijn beschermd door de standaardcontractbepalingen van de Europese Commissie
            of het EU-VS-kader voor gegevensbescherming.
          </p>
        </Section>

        <Section title="Hoe lang bewaren we gegevens?">
          <ul>
            <li>Gegevens van je account en je kinderen: zolang je account bestaat.</li>
            <li>
              Opende niemand je account 24 maanden lang? Dan mailen we je, en als je niet reageert wissen
              we het account met alle gegevens.
            </li>
            <li>
              Beta-inschrijvingen: tot je je uitschrijft, en uiterlijk 6 maanden nadat Leapio voor iedereen
              beschikbaar is.
            </li>
          </ul>
          <p>
            Verwijder je je account, dan wissen we meteen alle gegevens van jou en je kinderen. Back-ups
            van de database verdwijnen vanzelf na korte tijd.
          </p>
        </Section>

        <Section title="Wat bewaart Leapio op je toestel?">
          <p>
            De app bewaart een paar dingen in je browser om te werken: dat je ingelogd bent, welk kind er
            speelt, of het ouderportaal ontgrendeld is en gesproken zinnen zodat ze niet opnieuw geladen
            moeten worden. Dat zijn geen advertentie- of volgcookies. Daarom vragen we er geen toestemming
            voor.
          </p>
        </Section>

        <Section title="Je rechten">
          <p>Als ouder kan je voor jezelf en je kinderen:</p>
          <ul>
            <li>je gegevens inkijken, en vragen om een kopie;</li>
            <li>gegevens laten verbeteren (het leerjaar van je kind pas je zelf aan in het ouderportaal);</li>
            <li>je account en alle gegevens verwijderen, zelf via Account in het ouderportaal of door ons te mailen;</li>
            <li>bezwaar maken tegen of een beperking vragen van een verwerking;</li>
            <li>je toestemming voor de beta-mails intrekken.</li>
          </ul>
          <p>
            Mail naar <Mail />. We antwoorden binnen een maand. Ben je niet tevreden over hoe we met je
            gegevens omgaan, dan kan je een klacht indienen bij de Gegevensbeschermingsautoriteit,
            Drukpersstraat 35, 1000 Brussel,{' '}
            <a
              href="https://www.gegevensbeschermingsautoriteit.be"
              className="font-semibold text-lp-night underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              gegevensbeschermingsautoriteit.be
            </a>
            .
          </p>
        </Section>

        <Section title="Beveiliging">
          <p>
            Alle verkeer met Leapio is versleuteld. Elk gezin ziet alleen de eigen gegevens: dat dwingt de
            database zelf af. Wachtwoorden en pincodes zijn versleuteld opgeslagen. Gebeurt er toch een
            datalek dat jou raakt, dan verwittigen we de Gegevensbeschermingsautoriteit binnen 72 uur en,
            als het risico groot is, ook jou.
          </p>
        </Section>

        <Section title="Wijzigingen">
          <p>
            Als we deze verklaring aanpassen, zie je dat aan de datum bovenaan. Bij belangrijke wijzigingen
            laten we het je weten via e-mail of in de app.
          </p>
        </Section>
      </article>
    </main>
  );
}
