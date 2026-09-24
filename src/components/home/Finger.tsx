import { Fragment, type ReactNode } from 'react';
import { Markdown } from '@/components/Markdown';
import type { Profile } from '@/lib/content/collections';

export function Finger({ profile }: { profile: Profile }) {
  const { contact } = profile;
  const rows: [string, ReactNode][] = [
    ['Login', profile.handle],
    ['Name', profile.name],
  ];
  if (contact.handler) rows.push(['Handler', contact.handler]);
  rows.push([
    'Mail',
    <a key="mail" href={`mailto:${contact.email}`} data-nav-item className="link">
      {contact.email}
    </a>,
  ]);
  if (contact.phone) {
    rows.push([
      'Phone',
      <a key="phone" href={`tel:${contact.phone.replace(/\s+/g, '')}`} data-nav-item className="link">
        {contact.phone}
      </a>,
    ]);
  }
  if (contact.whatsapp) {
    rows.push([
      'WhatsApp',
      <a key="wa" href={`https://wa.me/${contact.whatsapp}`} data-nav-item className="link">
        wa.me/{contact.whatsapp}
      </a>,
    ]);
  }

  return (
    <div>
      <dl className="grid grid-cols-[10ch_minmax(0,1fr)] gap-x-[1ch] gap-y-1">
        {rows.map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-dim">{key}:</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>
      {profile.body && (
        <>
          <p className="mt-6 mb-2 text-dim">Plan:</p>
          <Markdown source={profile.body} />
        </>
      )}
    </div>
  );
}
