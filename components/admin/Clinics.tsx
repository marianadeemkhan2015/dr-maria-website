'use client';
import ListEditor from './ListEditor';

export default function Clinics() {
  return (
    <ListEditor
      table="clinics" title="Clinics" order="sort" titleKey="name"
      blank={{ name: 'New clinic', address: '', phone: '', map_link: '', visible: true }}
      hint="Add every clinic or hospital where you see patients, then set each one’s timings in Hours & days off. Use ↑ ↓ to change the order on the website."
      fields={[
        { key: 'name', label: 'Clinic or hospital name' },
        { key: 'address', label: 'Address, city' },
        { key: 'phone', label: 'Clinic phone (optional)' },
        { key: 'map_link', label: 'Google Maps link (optional)' },
        { key: 'visible', label: 'On website', type: 'checkbox' },
      ]}
    />
  );
}
