import type { Metadata } from 'next';
import { UnitList } from '@/components/hobbies/UnitList';
import { Prompt } from '@/components/shell/Prompt';
import { getHobbies } from '@/lib/content/collections';

export const metadata: Metadata = {
  title: 'Hobbies',
  description: 'Hobbies, listed like services: running or stopped.',
};

export default function HobbiesPage() {
  const hobbies = getHobbies();
  return (
    <>
      <Prompt cmd="systemctl --type=hobby" label="Hobbies" />
      {hobbies.length === 0 ? <p className="text-dim">No hobbies logged yet.</p> : <UnitList hobbies={hobbies} />}
    </>
  );
}
