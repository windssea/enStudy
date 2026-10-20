# 生图交付记录

模式：内置imagegen，透明背景；下列为最终选用版本的原始提示。先前写实/Pixar试稿未接入产品。本次只作WebP格式压缩，不裁剪、重绘或缩放，原尺寸与alpha通道逐字节核对保持。

## telescope-sports-v1.png

风格参考为任天堂NS运动官方页面的现场截图，仅用于视觉参考。

```text
Create a NEW ORIGINAL English-learning game teaching-scene illustration using the reference image ONLY as a rendering and character-design STYLE reference. The desired look is Nintendo Switch Sports / Sportsmates: clean stylised 3D console-game avatars, simplified graphic facial features and oval eyes, small understated nose and mouth, compact smooth face, clean sculpted geometric hair masses, slender simplified limbs, flat clean saturated sportswear, broad bright studio lighting, crisp soft ambient occlusion, subtle satin-plastic material. This is NOT Disney/Pixar, not photographic, no richly textured hair strands or detailed realistic fabric, no toddler chibi/clay look. Create our own distinct school-age girl with short dark bob hair, warm medium skin, aqua sports tee with a single white shoulder stripe, navy shorts and white trainers with mint trim. NEW SCENE: she carefully packs a recognisable small blue telescope into an open navy carrycase on a simple pale wood table. The action must be clear. Single scene, complete character and table framed with comfortable margins. Bright, clean, energetic, refined educational console-game art. Use our own original character and objects; do not copy any particular Nintendo character, clothing design, logos, stadium, scene composition or UI. No words, letters, numerals, arrows, timeline, watermark, brand symbols, floating decorations or background. True transparent alpha background. Colours: aqua, cyan, mint, navy and small coral accents. Make the simple high-quality stylised 3D console-game appearance unmistakable.
```

## stone-sports-v1.png

风格参考为同一官方截图以及上述项目原创基准图。

```text
Generate a NEW original teaching scene in our unified Nintendo Switch Sports-inspired clean stylised 3D console-game visual language. Image 1 is the official game STYLE reference only. Image 2 is our own original character/material/lighting ANCHOR; match its modelling, clean sculpted hair, simple graphic oval eyes, understated face, aqua sports shirt with white shoulder stripe, navy shorts, white/mint trainers, bright clean soft light and refined satin materials. NEW SCENE: two school-age cousins kneeling on a SMALL simple patch of smooth pebbles. The girl with dark ponytail holds up ONE smooth grey stone they have just found; a short dark-haired boy looks at that stone. Keep the held stone clearly recognisable and both children's attention on it. Slender simplified athletic avatar proportions, smooth simple expressive faces, clearly cartoon 3D game characters rather than Disney/Pixar, photography or clay dolls. Clean large colour areas, restrained cyan/aqua, mint, navy, one small coral accent. Minimal surface texture, no realistic stone clutter. Single coherent small educational scene, fully framed characters and pebble patch, generous clear margins. No character from the official game, no telescope/desk/case from Image 2, no Nintendo logos, words, letters, labels, arrows, timeline, border, watermark or decorative stars. Genuine transparent alpha background.
```


## v0.56 课程场景 · 内置 imagegen

四张图均以 `art-source/telescope-sports-v1.png` 为同一风格参考，真实透明背景。只压缩为 WebP，原尺寸与 alpha 逐字节保持。

### course-students-sports-v1.png

```text
Create one original educational course scene illustration. Use the attached image strictly as the established rendering/style reference: clean high quality stylized console sports game 3D, simplified graphic facial features, sculpted hair masses, matte and satin materials, soft broad upper-left lighting, aqua/cyan/mint/navy palette, no photorealism, no clay, no toddler proportions. Scene: two primary-school classmates, one girl and one boy aged about 9, standing together in a bright minimal classroom reading corner, each visibly holding one closed school book against their chest. Show a small pale oak bench and a low shelf of books behind them to establish school context; restrained props, no ornate scene. Friendly natural posture, clean sporty school clothing, balanced landscape composition with full bodies and ample breathing room. This depicts 'We are students' and 'We have books', not a mascot or game avatar. No animal, no island, no badge, no writing, letters, numerals, logo, watermark or UI. Transparent background with genuine alpha, retain only the people and small context props plus subtle contact shadows. Match reference material, light and visual proportions.
```

### course-bag-sports-v1.png

```text
Generate one original educational course still-life illustration, not a UI. Style reference is the attached image: the same clean high quality stylized console sports game 3D, carefully bevelled forms, matte and satin materials, soft broad upper-left lighting, aqua cyan mint navy colors with a restrained coral accent. Scene: a single clearly blue school backpack, one graphite pencil, two school rulers with simple unlabelled tick marks, and one closed mint notebook neatly arranged on a small pale oak school desk. The blue bag must be the most prominent object, the pencil and rulers clearly recognizable. No people or animals, no mascots, no island, no photorealism, no clay, no clutter. Full objects inside a balanced landscape composition. No text, numbers, logos or watermark. Transparent background genuine alpha, only objects, the desk and subtle contact shadows. Intended as the course scene for a lesson about school belongings and have/has; visually match the reference lighting and materials.
```

### course-classroom-sports-v1.png

```text
Generate one original educational classroom scene illustration. Use the attached image as strict visual style reference: clean high quality stylized console sports game 3D, simplified graphic eyes, sculpted hair, lightweight natural school-age/adult proportions, matte plus satin surfaces, broad soft light from upper left, pale oak and aqua cyan mint navy. This scene illustrates singular and plural in a classroom. Show EXACTLY TWO separate pale oak pupil desks, each with a mint chair tucked behind, and ONE friendly adult female teacher standing beside the desks, holding a closed book and giving a small welcoming gesture. The teacher must be visibly adult, not a mascot. Clearly separate the two desks so they are countable with no extra table, no joined desks. Minimal clean classroom context, full forms inside a landscape composition. No children or animals or island, no text, numbers, UI, badges, logos, watermark; no photorealism, clay or ornate scenery. Genuine transparent background, retain only teacher, desks, two chairs and light contact shadows. Match the rendering and materials of the reference.
```

### course-library-sports-v1.png

```text
Generate one original educational course scene illustration in exactly the established style of the attached reference: clean high quality stylized console sports game 3D, simplified graphic facial details, sculpted hair, primary school age proportions, matte/satin materials, broad upper-left soft lighting, aqua cyan mint navy with pale oak. A school library helper activity: two primary-school children aged nine, one girl with a short dark bob wearing aqua sports shirt and navy shorts, one boy with short sculpted brown hair wearing white/navy sports shirt and navy shorts. They are actively sorting a small stack of closed books on a low pale-oak library trolley beside one low bookshelf; one child hands a book to the other. Clearly a school library teamwork scene, no librarian desk, no sports equipment. Calm tidy landscape composition, full bodies and props visible, clean silhouettes. No animals, no island, no companion avatar, no badges or name tags; no text, letters, numbers, logos, watermark or UI. No photo skin, hair noise or clay. Genuine transparent alpha background, retain only children, trolley, low shelf and subtle contact shadows. Reference is style only, do not reproduce its telescope.
```


## v0.56 最终课程场景 · 内置 imagegen

首轮人物试稿被用户调整肤色、发型和服装；最终采用 students-v2、classroom-v2、library-v2 与 bag。初稿以 telescope 为风格参考，人物修订以上一稿为编辑目标，library-v2 同时以 students-v2 为人物参考。真实透明背景；只压缩为 WebP，原尺寸与 alpha 逐字节保持。

### course-students-v2-sports-v1.png

```text
Revise this original school course scene. Preserve the composition, EXACTLY two primary school classmates holding one closed book each, low bookshelf, bench, genuine transparent background, clean console sports game stylized 3D and upper-left soft lighting. Update the children to more fashionable original sports-game designs, clearly age 9 not toddler/adult: girl has fair light warm-beige East Asian skin, dark chestnut smooth sculpted hair tied in a sporty high ponytail with a mint band, mint cropped-length sport jacket over white tee, navy athletic shorts, white/mint trainers. Boy has fair light peach European skin, short sandy-blond sculpted side-swept hair, white/cyan/navy color-block sports tee, navy athletic shorts and white sneakers with a small coral accent. Modern clean athletic cuts, sculpted hair masses, simplified graphic face features, no realistic skin or hair noise, no clay. Skin must be visibly pale/fair warm natural beige, not tan, brown or golden-orange; avoid warm orange skin lighting. Books remain clearly held. No logos/text/labels, animals, island, mascot or UI. Keep full bodies fully framed and retain airy composition. Light cyan mint navy palette. Transparent alpha, no background haze or glow.
```

### course-classroom-v2-sports-v1.png

```text
Edit this original classroom illustration. Keep exactly ONE adult female teacher and EXACTLY TWO separate desks with two mint chairs, unchanged count and clear separation, the same layout and upper-left soft light, genuine transparent alpha. Change teacher to fair light neutral-warm beige East Asian skin, a stylish short sculpted chestnut bob, clean mint zip jacket over white tee, tailored navy trousers and white low-profile trainers. Clearly adult teacher age about 30, calm friendly face; use simplified graphic eyes, clean stylized console sports game 3D matching original materials, not realistic, not clay or toddler. Make skin visibly light/fair without orange or tan shading. Retain pale oak desks and mint chairs, book in teacher's arm, welcoming gesture, no extra people or furniture. No words, letters, numerals, logos, animals, island or UI. Transparent background, no glows.
```

### course-library-v2-sports-v1.png

```text
Update this original school-library scene to match our new student cast and fashionable sports clothing. Keep two nine-year-old children sorting books using a low book trolley and low shelf; preserve action, clearly held book, tidy minimal composition, genuine transparency and soft upper-left light. Girl: fair light warm-beige East Asian skin, chestnut sculpted high ponytail with mint band, mint athletic zip jacket with white sleeve stripe over white tee, navy sport shorts with white piping, white/mint sneakers. Boy: fair light peach European skin, sandy blond sculpted side-swept hair, white/cyan/navy color-block sport tee, navy sport shorts with white piping, white shoes with small coral accent. Both clearly primary-school age, not toddler, not adult; clean stylized console sports game 3D, matte and satin materials, simplified graphic faces, no photo texture, no clay. Skin pale/fair neutral-warm beige, not tan or brown or golden-orange. Full bodies and trolley fully inside frame with generous margin; shelf should not be cropped at left. No text, number, logo, island, animals or UI. Genuine transparent alpha, no background glow. Use second image as identity, clothing, skin and rendering reference for the same two students.
```

### course-bag-sports-v1.png

```text
Generate one original educational course still-life illustration, not a UI. Style reference is the attached image: the same clean high quality stylized console sports game 3D, carefully bevelled forms, matte and satin materials, soft broad upper-left lighting, aqua cyan mint navy colors with a restrained coral accent. Scene: a single clearly blue school backpack, one graphite pencil, two school rulers with simple unlabelled tick marks, and one closed mint notebook neatly arranged on a small pale oak school desk. The blue bag must be the most prominent object, the pencil and rulers clearly recognizable. No people or animals, no mascots, no island, no photorealism, no clay, no clutter. Full objects inside a balanced landscape composition. No text, numbers, logos or watermark. Transparent background genuine alpha, only objects, the desk and subtle contact shadows. Intended as the course scene for a lesson about school belongings and have/has; visually match the reference lighting and materials.
```
