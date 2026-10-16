import React from 'react';
import {
  ContactMail as Mail,
  InlineLink,
  LegalPage,
  LegalSection as Section,
} from '@/components/legal/LegalPage';

/** Leapio's terms for the beta. Keep packages and payment in step with how the app really works. */
export default function Terms() {
  return (
    <LegalPage
      title="Voorwaarden"
      seoTitle="Voorwaarden — Leapio"
      description="De afspraken tussen jou en Leapio tijdens de beta: je account, pakketten, Munten, wat niet mag en wat je van ons mag verwachten."
      canonical="https://leapio.be/voorwaarden"
      updated="16 oktober 2026"
      intro={
        <>
          Dit zijn de afspraken tussen jou en Leapio. Ze gelden zodra je een account maakt. We hielden ze
          kort en in gewone taal. Heb je een vraag, mail dan naar <Mail />.
        </>
      }
    >
      <Section title="Leapio is in beta">
        <p>
          Leapio is nog volop in ontwikkeling. Oefeningen, de Buddy, de winkel en de pakketten kunnen
          veranderen, erbij komen of verdwijnen. Soms werkt iets even niet zoals het hoort. We doen ons
          best om dat snel op te lossen en horen graag van je wat beter kan.
        </p>
      </Section>

      <Section title="Je account">
        <ul>
          <li>Een account maak je als ouder of voogd, en je bent minstens 18 jaar.</li>
          <li>Je gebruikt een e-mailadres dat van jou is en dat je leest.</li>
          <li>Je houdt je wachtwoord en je ouderpincode voor jezelf.</li>
          <li>
            Je kinderen spelen via jouw account, onder jouw toezicht. Jij bent verantwoordelijk voor wat er
            met je account gebeurt.
          </li>
          <li>Een account is voor één gezin. Deel het niet met andere gezinnen.</li>
        </ul>
      </Section>

      <Section title="Pakketten">
        <ul>
          <li>Met het pakket Gratis speelt één kind.</li>
          <li>
            Met Basis, Familie of School spelen meer kinderen. Een ander pakket vraag je aan via <Mail />.
            We laten je vooraf weten wat het kost en vanaf wanneer het geldt. We rekenen nooit iets aan
            zonder dat jij dat eerst bevestigde.
          </li>
          <li>Opzeggen kan altijd, ook via mail. Je account gaat dan terug naar Gratis.</li>
          <li>
            Betaal je een pakket niet, dan gaat je account ook terug naar Gratis. Eén kind speelt verder, de
            andere kinderen worden gepauzeerd. Hun gegevens blijven bewaard tot je een pakket hebt dat bij
            je gezin past.
          </li>
        </ul>
      </Section>

      <Section title="Munten, Buddy en beloningen">
        <ul>
          <li>
            Munten verdient je kind met oefenen en gebruikt het om de Buddy te verzorgen. Ze zijn geen echt
            geld: je kan ze niet kopen, inwisselen of overdragen.
          </li>
          <li>
            Beloningen die je in het ouderportaal instelt, zijn een afspraak tussen jou en je kind. Leapio
            houdt alleen bij hoe ver je kind staat.
          </li>
        </ul>
      </Section>

      <Section title="Wat niet mag">
        <ul>
          <li>Leapio misbruiken, proberen binnen te dringen of de werking verstoren;</li>
          <li>Leapio automatisch laten gebruiken, bijvoorbeeld door een programma dat oefeningen oplost;</li>
          <li>
            de oefeningen, tekeningen, Buddy&apos;s of teksten van Leapio kopiëren of verspreiden. Ze zijn van
            Leapio en bedoeld voor gebruik thuis met je eigen kinderen.
          </li>
        </ul>
      </Section>

      <Section title="Wat je van ons mag verwachten">
        <p>
          We maken de oefeningen met zorg en volgens de Vlaamse leerdoelen. Leapio helpt je kind oefenen,
          maar vervangt de school of de leerkracht niet. We kunnen niet beloven dat er nooit een fout in een
          oefening zit of dat Leapio altijd zonder onderbreking werkt.
        </p>
        <p>
          Voor zover de wet het toelaat, zijn we niet aansprakelijk voor schade die onrechtstreeks volgt
          uit het gebruik van Leapio. Niets in deze voorwaarden beperkt de rechten die je als consument
          volgens de wet hebt.
        </p>
      </Section>

      <Section title="Stoppen">
        <ul>
          <li>
            Je kan je account op elk moment zelf verwijderen via Account in het ouderportaal. Alle gegevens
            van jou en je kinderen worden dan gewist.
          </li>
          <li>
            Houdt iemand zich niet aan deze voorwaarden, dan mogen we het account stopzetten. Behalve bij
            ernstig misbruik verwittigen we je eerst.
          </li>
          <li>Stopt de beta of stopt Leapio, dan laten we het je ruim op voorhand weten.</li>
        </ul>
      </Section>

      <Section title="Privacy">
        <p>
          Hoe we met de gegevens van jou en je kinderen omgaan, lees je in onze{' '}
          <InlineLink to="/privacy">privacyverklaring</InlineLink>.
        </p>
      </Section>

      <Section title="Wijzigingen">
        <p>
          We kunnen deze voorwaarden aanpassen, bijvoorbeeld als Leapio uit de beta komt. Belangrijke
          wijzigingen laten we je vooraf weten via e-mail of in de app. Ga je er niet mee akkoord, dan kan
          je je account verwijderen.
        </p>
      </Section>

      <Section title="Vragen of een probleem?">
        <p>
          Mail naar <Mail />. We zoeken samen met je naar een oplossing. Op deze voorwaarden is het
          Belgische recht van toepassing.
        </p>
      </Section>
    </LegalPage>
  );
}
