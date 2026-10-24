-- Starter content for Dr. Maria Nadeem Khan. Run once after schema.sql.
-- Everything here can be changed later from the doctor panel (/admin).
-- Fees, hours and services below are examples: please correct them.

update settings set
  doctor_name    = 'Dr. Maria Nadeem Khan',
  specialty      = 'Clinical Nutritionist',
  degrees        = 'MSc Nutrition',
  years          = 15,
  bio_en         = 'With over 15 years in clinical nutrition, I help patients manage diabetes, weight, pregnancy and child growth through food they already love. My plans are practical, suited to Pakistani kitchens and backed by evidence. I also run free community health camps and teach preventive nutrition.',
  bio_ur         = 'میں 15 سال سے زائد عرصے سے ذیابیطس، وزن، حمل اور بچوں کی نشوونما میں غذائیت کے ذریعے مریضوں کی رہنمائی کر رہی ہوں۔ میرے ڈائٹ پلان آپ کے گھر کے کھانوں کے مطابق، آسان اور سائنسی بنیادوں پر ہوتے ہیں۔',
  whatsapp       = '+92 300 0000000'
where id = 1;

insert into services (title, description, fee_note, sort) values
  ('Weight management', 'Personal diet plan with fortnightly follow-ups.', 'Clinic or video', 1),
  ('Diabetes diet plan', 'Desi meal plans that keep blood sugar steady.', 'Clinic or video', 2),
  ('Pregnancy & postnatal nutrition', 'Safe nutrition for mother and baby.', 'Video', 3),
  ('Child nutrition', 'Growth, picky eating and school lunches.', 'Clinic', 4);
update settings set services_intro = 'Every plan is made for you, around the food your family already eats.' where id = 1;

-- Two example clinics with their own hours (0 = Sunday). Edit them in the
-- doctor panel under Clinics and Hours & days off.
insert into clinics (name, address, sort) values
  ('Nutrition Care Clinic', 'Johar Town, Lahore', 1),
  ('City Medical Centre', 'Gulberg III, Lahore', 2);
insert into availability (weekday, mode, start_time, end_time, clinic_id)
select d, 'clinic', '17:00', '21:00', (select id from clinics where sort = 1) from unnest(array[1,3,5]) d;
insert into availability (weekday, mode, start_time, end_time, clinic_id)
select d, 'clinic', '16:00', '19:00', (select id from clinics where sort = 2) from unnest(array[2,4,6]) d;
-- Video consults Mon–Sat 10:00–14:00.
insert into availability (weekday, mode, start_time, end_time)
select d, 'video', '10:00', '14:00' from generate_series(1,6) d;

-- Three starter articles, saved as DRAFTS. Dr. Maria should review and edit
-- them in the doctor panel (Articles) before pressing Publish.
insert into articles (slug, title, category, summary, body, published, published_on) values
('desi-plate-for-diabetes', 'A desi plate for diabetes: what to eat and how much', 'Diabetes',
 'You don''t have to give up roti and salan. Small changes to portions and order on your plate can keep blood sugar steadier.',
$$Most people with type 2 diabetes in Pakistan are told to "avoid sugar", and then left to guess the rest. The good news: you can keep eating familiar food. What matters most is how much, in what mix, and when.

## Build your plate in three parts

- **Half the plate: vegetables.** Sabzi, salad, raita with cucumber. They fill you up without raising sugar much.
- **A quarter: protein.** Daal, chana, chicken, fish or eggs.
- **A quarter: starch.** One medium roti, or a small cup of rice, not both.

## Small swaps that add up

- Choose chakki atta or mixed-grain roti over maida and naan.
- Eat the salad and salan first, and the roti last.
- Replace sweet tea with tea with less sugar, reducing a little each week.
- Have fruit whole, not as juice, and one portion at a time.

## Timing matters

Long gaps followed by a heavy late dinner make sugar harder to control. Try three regular meals, with dinner finished two to three hours before sleep, and a 10–20 minute walk after meals if you can.

## When to get advice

Everyone's medicines, kidney health and routine are different. If you take insulin or tablets that can cause low sugar, change your diet with your doctor's guidance.$$,
 false, current_date),
('healthy-school-lunch-ideas', 'Healthy school lunch ideas your child will actually eat', 'Children',
 'Simple, low-cost tiffin ideas that keep children full and focused, without the daily battle.',
$$A good tiffin keeps a child focused until home time. It doesn't need to be fancy, just balanced and familiar.

## The simple formula

- **Something filling:** a paratha made with less oil, a whole-wheat sandwich, or a small portion of pulao.
- **Some protein:** egg, chicken, chana, cheese or daal-filled roll.
- **A fruit or vegetable:** banana, apple slices, cucumber or carrot sticks.
- **Water** instead of packaged juice.

## Five easy tiffins for the week

- Egg and vegetable roll in whole-wheat roti
- Chicken sandwich with cucumber, plus an apple
- Chana chaat with a little lemon, plus a banana
- Vegetable pulao with a small cup of yogurt
- Aloo-anda paratha (less oil) with carrot sticks

## Tips for picky eaters

Let children choose between two healthy options, involve them in packing, and change one thing at a time. Keep chips, biscuits and fizzy drinks as occasional treats, not daily lunch.$$,
 false, current_date),
('eating-well-in-pregnancy', 'Eating well in pregnancy: the basics', 'Pregnancy',
 'What to focus on, what to limit, and why regular check-ups matter for you and your baby.',
$$Pregnancy doesn't mean "eating for two" in quantity. It means eating for two in quality.

## Focus on these

- **Protein** at every meal: daal, eggs, chicken, fish, milk and yogurt.
- **Iron-rich foods:** leafy greens, beans, meat, with vitamin C (lemon, guava, oranges) to help absorption.
- **Calcium:** milk, yogurt, lassi without much sugar.
- **Fibre and water** to ease constipation: fruit, vegetables, whole grains and plenty of fluids.

## Limit these

- Too much tea and coffee.
- Sugary drinks and fried snacks.
- Undercooked meat or eggs, and unpasteurised milk.

## Supplements

Most women need folic acid and often iron and calcium during pregnancy. Take only what your doctor or gynaecologist prescribes.

## Get help early

Severe vomiting, swelling, headaches or reduced baby movements need urgent medical attention. A nutrition plan works alongside your regular antenatal check-ups, never instead of them.$$,
 false, current_date);
