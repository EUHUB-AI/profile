import { Finger } from '@/components/home/Finger';
import { GitLog } from '@/components/home/GitLog';
import { Motd } from '@/components/home/Motd';
import { Prompt } from '@/components/shell/Prompt';
import {
  getBooks,
  getCareer,
  getHobbies,
  getLanguages,
  getProfile,
  getSports,
  getTrips,
} from '@/lib/content/collections';
import { siteIsIndexable } from '@/lib/site';
import { summarize } from '@/lib/tui/motd';
import { now } from '@/lib/tui/time';

export default function Home() {
  const profile = getProfile();
  const summary = summarize({
    books: getBooks(),
    trips: getTrips(),
    languages: getLanguages(),
    sports: getSports(),
    hobbies: getHobbies(),
  });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    email: `mailto:${profile.contact.email}`,
    ...(profile.contact.phone ? { telephone: profile.contact.phone } : {}),
    ...(profile.siteUrl ? { url: profile.siteUrl } : {}),
    knowsAbout: profile.certifications,
  };

  return (
    <>
      {siteIsIndexable() && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <Prompt cmd={`ssh ${profile.handle}@${profile.host}`} label={`${profile.name}, ${profile.role}`} />

      <div className="2xl:grid 2xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] 2xl:items-start 2xl:gap-x-[6ch]">
        <div className="2xl:col-start-1 2xl:row-start-1">
          <Motd profile={profile} summary={summary} asOf={now().toISOString().slice(0, 10)} />
        </div>

        <section aria-labelledby="career" className="2xl:col-start-2 2xl:row-span-3 2xl:row-start-1">
          <Prompt level={2} id="career" cmd="git log --graph career" label="Career" className="2xl:mt-0" />
          <GitLog jobs={getCareer()} />
        </section>

        <section aria-labelledby="certs" className="2xl:col-start-1">
          <Prompt level={2} id="certs" cmd="ls ~/certs" label="Certifications" />
          <ul className="grid list-none gap-x-[4ch] gap-y-1 p-0 sm:grid-cols-2">
            {profile.certifications.map((cert) => (
              <li key={cert}>{cert}</li>
            ))}
          </ul>
        </section>

        <section id="contact" aria-labelledby="contact-heading" className="2xl:col-start-1">
          <Prompt level={2} id="contact-heading" cmd={`finger ${profile.handle}`} label="Contact" />
          <Finger profile={profile} />
        </section>
      </div>
    </>
  );
}
