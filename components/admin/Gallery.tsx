'use client';
import ListEditor from './ListEditor';

export default function Gallery() {
  return (
    <ListEditor
      table="gallery" title="Achievements & photos" order="sort" titleKey="caption"
      blank={{ caption: '', kind: 'At work', year: '', image_url: null, visible: true }}
      hint="Photos appear in the small slideshow box. Items with the type “Award” or “Achievement” are also listed beside it, with or without a photo."
      fields={[
        { key: 'caption', label: 'Caption or award name', placeholder: 'e.g. Best Clinical Nutritionist, Punjab Health Awards' },
        { key: 'kind', label: 'Type', placeholder: 'At work, Award, Achievement or Event' },
        { key: 'year', label: 'Year (optional)', placeholder: 'e.g. 2024' },
        { key: 'visible', label: 'On website', type: 'checkbox' },
        { key: 'image_url', label: 'Photo (optional for awards)', type: 'image' },
      ]}
    />
  );
}
